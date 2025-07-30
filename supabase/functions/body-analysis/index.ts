import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BodyAnalysisResult {
  bodyFatEstimate?: number;
  muscleDefinition: 'low' | 'medium' | 'high';
  overallPhysique: string;
  progressAssessment?: string;
  measurements?: {
    waist?: number;
    chest?: number;
    arms?: number;
  };
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, userId, userMessage } = await req.json();

    if (!imageUrl || !userId) {
      throw new Error('Image URL and User ID are required');
    }

    console.log('🏋️ Analyzing body progress image for user:', userId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user profile for context
    const { data: profile } = await supabase
      .from('profiles')
      .select('gender, age, height, goal_weight')
      .eq('id', userId)
      .single();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `Du bist ein erfahrener Fitness-Coach und Body-Composition-Experte. Analysiere das Körperbild und gib eine professionelle Bewertung ab.

USER CONTEXT:
- Geschlecht: ${profile?.gender || 'nicht angegeben'}
- Alter: ${profile?.age || 'nicht angegeben'}
- Größe: ${profile?.height || 'nicht angegeben'}cm
- Zielgewicht: ${profile?.goal_weight || 'nicht angegeben'}kg

ANALYSE-AUFGABEN:
1. Schätze Körperfettanteil (nur wenn gut sichtbar)
2. Bewerte Muskeldefinition (low/medium/high)
3. Gib allgemeine Physique-Bewertung
4. Erkenne Fortschritt (falls Vergleichskontext vorhanden)
5. Gib konstruktive Empfehlungen

Antworte im JSON Format:
{
  "bodyFatEstimate": 15.5,
  "muscleDefinition": "medium",
  "overallPhysique": "Athletische Statur mit guter Proportion",
  "progressAssessment": "Sichtbare Verbesserung der Muskeldefinition",
  "recommendations": [
    "Weiter mit aktuellem Trainingsplan",
    "Protein-Zufuhr beibehalten"
  ]
}

Sei professionell, motivierend aber ehrlich. Vermeide Körperkommentare die verletzend sein könnten.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userMessage || 'Analysiere meinen aktuellen Körperzustand und Fortschritt'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.4
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No analysis result from OpenAI');
    }

    let analysis: BodyAnalysisResult;
    try {
      analysis = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse analysis:', content);
      throw new Error('Could not parse body analysis result');
    }

    // Save analysis to database
    const { error: saveError } = await supabase
      .from('body_analysis_log')
      .insert({
        user_id: userId,
        image_url: imageUrl,
        analysis_result: analysis,
        created_at: new Date().toISOString()
      });

    if (saveError) {
      console.error('Error saving body analysis:', saveError);
      // Continue anyway - analysis is more important than logging
    }

    console.log('✅ Body analysis completed:', analysis);

    return new Response(JSON.stringify({
      success: true,
      analysis,
      suggestedAction: 'progress_tracking'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in body-analysis:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});