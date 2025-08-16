import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VisionAnalysisRequest {
  images: string[];
  text?: string;
}

interface MealAnalysisResult {
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: number;
  meal_type: string;
  analysis_notes?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images, text = '' }: VisionAnalysisRequest = await req.json();

    if (!images || images.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No images provided',
          fallback: {
            title: text || 'Mahlzeit',
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
            confidence: 0,
            meal_type: 'other'
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 [vision-meal-analyzer] Analyzing ${images.length} images with GPT-4o`);

    // Prepare messages for GPT-4o Vision
    const imageMessages = images.map(imageUrl => ({
      type: "image_url",
      image_url: { url: imageUrl }
    }));

    const systemPrompt = `You are a precise nutritional analysis AI. Analyze the food in the image(s) and return ONLY a JSON object with this exact structure:

{
  "title": "Descriptive name of the meal/food",
  "calories": number,
  "protein": number (grams),
  "carbs": number (grams), 
  "fats": number (grams),
  "confidence": number (0-1, where 1 is very confident),
  "meal_type": "breakfast|lunch|dinner|snack|other",
  "analysis_notes": "Brief explanation of analysis"
}

Rules:
- Be precise with nutritional values
- If multiple foods, sum up the totals
- Estimate portion sizes carefully
- Use standard nutritional databases as reference
- If unsure, be conservative with confidence score
- German food names are preferred for title`;

    const userPrompt = text.trim() 
      ? `Analyze the food in these images. Additional context: "${text}"`
      : "Analyze the food in these images and provide nutritional information.";

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: "text", text: userPrompt },
              ...imageMessages
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('🤖 GPT-4o raw response:', aiResponse);

    // Parse JSON response
    let analysisResult: MealAnalysisResult;
    try {
      // Clean up response in case it has markdown formatting
      const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      analysisResult = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('❌ Failed to parse GPT-4o response:', parseError);
      throw new Error('Invalid response format from AI');
    }

    // Validate and sanitize the result
    const result: MealAnalysisResult = {
      title: analysisResult.title || text || 'Analysierte Mahlzeit',
      calories: Math.max(0, Math.round(Number(analysisResult.calories) || 0)),
      protein: Math.max(0, Math.round(Number(analysisResult.protein) || 0)),
      carbs: Math.max(0, Math.round(Number(analysisResult.carbs) || 0)),
      fats: Math.max(0, Math.round(Number(analysisResult.fats) || 0)),
      confidence: Math.min(1, Math.max(0, Number(analysisResult.confidence) || 0.5)),
      meal_type: analysisResult.meal_type || 'other',
      analysis_notes: analysisResult.analysis_notes || ''
    };

    console.log('✅ [vision-meal-analyzer] Analysis completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 [vision-meal-analyzer] Error:', error);
    
    // Always provide fallback for ConfirmMealModal
    const fallback: MealAnalysisResult = {
      title: 'Mahlzeit (Analyse fehlgeschlagen)',
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      confidence: 0,
      meal_type: 'other',
      analysis_notes: 'Analyse nicht verfügbar - bitte Werte manuell eingeben'
    };

    return new Response(JSON.stringify(fallback), {
      status: 200, // Return 200 with fallback data so ConfirmMealModal can handle it
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});