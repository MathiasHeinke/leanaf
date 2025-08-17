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

interface FoodItem {
  name: string;
  estimated_weight_g: number; // estimated edible weight in grams
  calories: number; // kcal
  protein: number; // g
  carbs: number;   // g
  fats: number;    // g
  confidence: number; // 0-1
  reference?: string; // e.g., "Vergleich mit Gabel/Teller"
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
  items?: FoodItem[]; // per-item breakdown (optional)
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

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log(`🔍 [vision-meal-analyzer] Analyzing ${images.length} images with GPT-4.1 Vision`);
    // Prepare messages for GPT-4o Vision
    const imageMessages = images.map(imageUrl => ({
      type: "image_url",
      image_url: { url: imageUrl }
    }));

const systemPrompt = `You are a precise nutritional analysis AI specialized in multi-item food segmentation and portion size estimation from images.

Return ONLY a JSON object with this exact structure:
{
  "title": "Meal name (German preferred)",
  "items": [
    {
      "name": "Food item name (German if possible)",
      "estimated_weight_g": 0,
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fats": 0,
      "confidence": 0.0,
      "reference": "Which reference object(s) used (e.g., Teller 26cm, Gabel, Löffel)"
    }
  ],
  "calories": 0,  // total
  "protein": 0,   // total in g
  "carbs": 0,     // total in g
  "fats": 0,      // total in g
  "confidence": 0.0, // overall confidence 0-1
  "meal_type": "breakfast|lunch|dinner|snack|other",
  "analysis_notes": "Short rationale incl. portion references and assumptions"
}

CRITICAL RULES:
- Segment EACH distinct food item in the image(s) and list separately in items.
- Estimate edible weight in grams for each item using visual scale cues.
- Use surrounding/reference objects to calibrate scale: plate diameter (small ~20cm, medium ~26cm, large ~30cm), cutlery sizes, hands, cups, packaging, table textures.
- If multiple images exist, use the clearest as primary and cross-check with others.
- Cross-reference any provided user text for ingredients/quantities to refine estimates.
- Derive kcal and macros (g) per item using typical nutritional databases and portion size.
- Sum item macros into totals; totals must equal the sum of items.
- Be conservative with confidence if visibility is poor or packaging hides contents.
- Use German food names where possible.
- Keep the response strictly valid JSON (no comments, no code fences).`;

const userPrompt = text.trim()
  ? `Bitte identifiziere ALLE einzelnen Speisen/Bestandteile auf den Bildern, schätze für jede den essbaren Anteil in Gramm über Referenzobjekte (Teller-Durchmesser, Besteck, Hände, Verpackungen) und gib pro Zutat kcal/Makros an. Nutze zusätzlich diesen Kontext: "${text}"`
  : "Bitte alle Speisen im Bild einzeln segmentieren, Gewichte in g über Referenzobjekte schätzen und pro Item kcal/Makros liefern. Summiere zu Gesamttotalen.";

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
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
        max_completion_tokens: 1000
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

    // Validate and sanitize the result with per-item support
    const rawItems = (analysisResult as any).items;
    let items: FoodItem[] | undefined;
    if (Array.isArray(rawItems)) {
      items = rawItems.map((it: any) => ({
        name: String(it.name || 'Unbekannt').trim(),
        estimated_weight_g: Math.max(0, Math.round(Number(it.estimated_weight_g) || 0)),
        calories: Math.max(0, Math.round(Number(it.calories) || 0)),
        protein: Math.max(0, Math.round(Number(it.protein) || 0)),
        carbs: Math.max(0, Math.round(Number(it.carbs) || 0)),
        fats: Math.max(0, Math.round(Number(it.fats) || 0)),
        confidence: Math.min(1, Math.max(0, Number(it.confidence) || 0.5)),
        reference: it.reference ? String(it.reference) : undefined,
      })).filter(i => i.calories + i.protein + i.carbs + i.fats > 0 || i.estimated_weight_g > 0);
    }

    // Derive totals from items when provided
    let totals = {
      calories: Math.max(0, Math.round(Number((analysisResult as any).calories) || 0)),
      protein: Math.max(0, Math.round(Number((analysisResult as any).protein) || 0)),
      carbs: Math.max(0, Math.round(Number((analysisResult as any).carbs) || 0)),
      fats: Math.max(0, Math.round(Number((analysisResult as any).fats) || 0)),
    };

    if (items && items.length > 0) {
      totals = {
        calories: Math.round(items.reduce((s, i) => s + (i.calories || 0), 0)),
        protein: Math.round(items.reduce((s, i) => s + (i.protein || 0), 0)),
        carbs: Math.round(items.reduce((s, i) => s + (i.carbs || 0), 0)),
        fats: Math.round(items.reduce((s, i) => s + (i.fats || 0), 0)),
      };
    }

    const overallConfidence = Math.min(1, Math.max(0, Number((analysisResult as any).confidence) || (items && items.length > 0
      ? items.reduce((s, i) => s + i.confidence, 0) / items.length
      : 0.6)));

    const result: MealAnalysisResult = {
      title: (analysisResult as any).title || text || 'Analysierte Mahlzeit',
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fats: totals.fats,
      confidence: overallConfidence,
      meal_type: (analysisResult as any).meal_type || 'other',
      analysis_notes: (analysisResult as any).analysis_notes || '',
      items,
    };

    console.log('✅ [vision-meal-analyzer] Analysis completed', {
      title: result.title,
      totals: { kcal: result.calories, p: result.protein, c: result.carbs, f: result.fats },
      items_count: items?.length ?? 0,
      confidence: result.confidence,
    });

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