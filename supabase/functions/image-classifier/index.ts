import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getTaskModel } from '../_shared/openai-config.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClassificationResult {
  category: 'exercise' | 'food' | 'supplement' | 'body_progress' | 'general';
  confidence: number;
  description: string;
  suggestedAction: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, userId } = await req.json();

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    console.log('🔍 Classifying image:', imageUrl);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getTaskModel('image-classifier'),
        messages: [
          {
            role: 'system',
            content: `Du bist ein Bildklassifizierungs-Experte für eine Fitness-App. Analysiere das Bild und klassifiziere es in eine der folgenden Kategorien:

KATEGORIEN:
- exercise: Bilder von Übungen, Training, Fitnessgeräten, Workout-Notizen
- food: Essen, Mahlzeiten, Getränke, Lebensmittel
- supplement: Nahrungsergänzungsmittel, Proteinpulver, Vitamintabletten, Supplements
- body_progress: Körperbilder, Fortschrittsfotos, Körpermaße, Transformation
- general: Alles andere

Antworte im JSON Format:
{
  "category": "kategorie",
  "confidence": 0.95,
  "description": "Kurze Beschreibung was zu sehen ist",
  "suggestedAction": "Was könnte der User damit machen wollen"
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Klassifiziere dieses Bild:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'low'
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No classification result from OpenAI');
    }

    let result: ClassificationResult;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      // Fallback result
      result = {
        category: 'general',
        confidence: 0.5,
        description: 'Bildinhalt konnte nicht klassifiziert werden',
        suggestedAction: 'Bild dem Coach zeigen'
      };
    }

    console.log('✅ Image classified:', result);

    return new Response(JSON.stringify({
      success: true,
      classification: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in image-classifier:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      classification: {
        category: 'general',
        confidence: 0.1,
        description: 'Fehler bei der Bildanalyse',
        suggestedAction: 'Bild erneut hochladen'
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});