
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Input validation and sanitization
    const sanitizeText = (text: string): string => {
      if (!text || typeof text !== 'string') return '';
      return text.trim().slice(0, 2000);
    };
    
    const validateMealData = (mealData: any): any => {
      if (!mealData || typeof mealData !== 'object') {
        throw new Error('Valid meal data is required');
      }
      
      return {
        title: sanitizeText(mealData.title || ''),
        calories: typeof mealData.calories === 'number' ? Math.max(0, Math.min(5000, mealData.calories)) : 0,
        protein: typeof mealData.protein === 'number' ? Math.max(0, Math.min(500, mealData.protein)) : 0,
        carbs: typeof mealData.carbs === 'number' ? Math.max(0, Math.min(1000, mealData.carbs)) : 0,
        fats: typeof mealData.fats === 'number' ? Math.max(0, Math.min(500, mealData.fats)) : 0,
        description: sanitizeText(mealData.description || '')
      };
    };
    
    const message = sanitizeText(body.message);
    const mealData = validateMealData(body.mealData);
    
    if (!message) {
      return new Response(
        JSON.stringify({ 
          error: 'Message is required',
          message: 'Bitte geben Sie eine Nachricht ein.',
          adjustments: {},
          needsAdjustment: false,
          confidence: 'low',
          reasoning: 'Keine Nachricht erhalten'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Validate conversation history
    let conversationHistory = [];
    if (Array.isArray(body.conversationHistory)) {
      conversationHistory = body.conversationHistory.slice(-20).map((msg: any) => ({
        role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
        content: sanitizeText(msg.content || '')
      })).filter(msg => msg.content);
    }
    
    console.log('Received meal verification request:', { message, mealData });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    // Get user profile for coach personality
    let coachPersonality = 'moderat';
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          {
            global: {
              headers: { Authorization: authHeader },
            },
          }
        );
        
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          const { data: profileData } = await supabaseClient
            .from('profiles')
            .select('coach_personality')
            .eq('user_id', user.id)
            .single();
          
          if (profileData?.coach_personality) {
            coachPersonality = profileData.coach_personality;
          }
        }
      }
    } catch (error) {
      console.warn('Could not fetch coach personality, using default');
    }

    const getPersonalityPrompt = (personality: string): string => {
      switch (personality) {
        case 'streng':
          return 'Du bist Sascha - direkt und ehrlich, aber sprich natürlich wie ein echter Mensch. Stell gerne Rückfragen wenn du mehr verstehen willst.';
        case 'liebevoll':
          return 'Du bist Lucy - warmherzig und unterstützend. Sprich freundlich und natürlich, zeig echtes Interesse an der Person.';
        default: // 'motivierend'
          return 'Du bist Kai - energisch und motivierend. Sprich wie ein Kumpel, der sich wirklich interessiert und gerne nachfragt um zu helfen.';
      }
    };

    // Check if user wants detailed analysis
    const needsDetailedMode = /\b(analyse|daten|statistik|zahlen|übersicht|genau|detailliert)\b/i.test(message);

    const systemPrompt = `${getPersonalityPrompt(coachPersonality)}

${needsDetailedMode ? `
Der User möchte eine detaillierte Analyse - zeig dein Fachwissen! Nutze Nährwertdatenbanken und gib präzise Erklärungen.
` : `
Sprich ganz natürlich und menschlich. Du hilfst bei Mahlzeiten, aber bleib locker und stell gerne Rückfragen wenn du mehr wissen willst.
`}

Aktuelle Mahlzeitdaten:
- Titel: ${mealData.title}
- Kalorien: ${mealData.calories} kcal
- Protein: ${mealData.protein}g
- Kohlenhydrate: ${mealData.carbs}g
- Fett: ${mealData.fats}g
- Beschreibung: ${mealData.description}

${needsDetailedMode ? `
DETAILLIERTE ANALYSE GEWÜNSCHT:
1. Analysiere die Benutzernachricht und bewerte die angegebenen Nährwerte präzise
2. Vergleiche mit Standard-Nährwertdatenbanken (USDA, BLS)
3. Gib detaillierte Begründungen und Anpassungen
4. Zeig dein volles Fachwissen
` : `
Einfach natürlich antworten:
- Hilf bei der Mahlzeit wie ein echter Mensch
- Stell Rückfragen wenn du mehr wissen willst  
- Sei nicht roboterhaft, sondern authentisch
- Passe Nährwerte an wenn nötig, aber erklär es normal
`}

Gib eine JSON-Antwort zurück mit folgendem Format:
{
  "message": "Deine Antwort an den Benutzer mit Erklärung",
  "adjustments": {
    "calories": neue_kalorien_oder_null,
    "protein": neues_protein_oder_null,
    "carbs": neue_kohlenhydrate_oder_null,
    "fats": neues_fett_oder_null
  },
  "needsAdjustment": boolean,
  "confidence": "high|medium|low",
  "reasoning": "Begründung für die Anpassungen"
}

Beispiel:
- Benutzer: "Das waren nur 100g Pasta, nicht 200g"
- Antwort: Halbiere alle Nährwerte
- needsAdjustment: true

Sei hilfreich und erkläre deine Anpassungen. Wenn keine Anpassungen nötig sind, setze needsAdjustment auf false.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []),
      { role: 'user', content: message }
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
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('OpenAI response:', aiResponse);

    // Try to parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch (e) {
      // If not JSON, create a simple response
      parsedResponse = {
        message: aiResponse,
        adjustments: {},
        needsAdjustment: false,
        confidence: 'low',
        reasoning: 'Konnte nicht als JSON verarbeitet werden'
      };
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in verify-meal function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      message: 'Entschuldigung, es gab einen Fehler bei der Verarbeitung.',
      adjustments: {},
      needsAdjustment: false,
      confidence: 'low',
      reasoning: 'Fehler bei der Verarbeitung'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
