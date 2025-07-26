import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Exercise data extraction request received at:', new Date().toISOString());

    const { userId, mediaUrls, userMessage } = await req.json();

    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error('No media URLs provided');
    }

    console.log(`Processing ${mediaUrls.length} media items for exercise data extraction`);

    // Prepare messages for OpenAI Vision API
    const messages = [
      {
        role: "system",
        content: `You are an expert exercise data extraction system. Your ONLY job is to analyze workout images/videos and extract structured exercise data in JSON format.

CRITICAL: Respond ONLY with valid JSON in this exact format:
{
  "exercise_name": "string",
  "sets": [
    {
      "reps": number,
      "weight": number
    }
  ],
  "rpe": number,
  "confidence": number
}

RULES:
- exercise_name: German exercise name (e.g., "Kurzhantel Bizeps Curls")
- sets: Array of sets with reps and weight in kg
- rpe: Estimated RPE 1-10 based on form/effort visible
- confidence: 0-1 how confident you are in extraction
- If bodyweight exercise, use weight: 0
- If weight unclear, estimate based on visible equipment
- NO additional text, explanations, or markdown - ONLY JSON`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: userMessage || "Extract exercise data from this workout image/video"
          },
          ...mediaUrls.map((url: string) => ({
            type: "image_url",
            image_url: {
              url: url,
              detail: "high"
            }
          }))
        ]
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages,
        max_tokens: 500,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const rawResponse = data.choices[0].message.content;

    console.log('Raw OpenAI response:', rawResponse);

    // Parse JSON response
    let extractedData;
    try {
      extractedData = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      // Fallback: extract JSON from mixed response
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    }

    // Validate extracted data structure
    if (!extractedData.exercise_name || !extractedData.sets || !Array.isArray(extractedData.sets)) {
      throw new Error('Invalid exercise data structure');
    }

    console.log('Successfully extracted exercise data:', extractedData);

    return new Response(JSON.stringify({
      success: true,
      exerciseData: extractedData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in extract-exercise-data function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      exerciseData: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});