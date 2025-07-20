
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { message, mealData, conversationHistory } = await req.json();
    
    console.log('Received meal verification request:', { message, mealData });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const systemPrompt = `Du bist ein Ernährungsexperte, der dabei hilft, Mahlzeiten zu analysieren und die Nährwerte zu korrigieren. 

Aktuelle Mahlzeitdaten:
- Titel: ${mealData.title}
- Kalorien: ${mealData.calories} kcal
- Protein: ${mealData.protein}g
- Kohlenhydrate: ${mealData.carbs}g
- Fett: ${mealData.fats}g
- Beschreibung: ${mealData.description}
- Vertrauen: ${mealData.confidence || 'unbekannt'}

Deine Aufgaben:
1. Analysiere die Benutzernachricht und bewerte die angegebenen Nährwerte
2. Wenn der Benutzer zusätzliche Informationen über Gewicht, Portion oder Zubereitung gibt, passe die Nährwerte entsprechend an
3. Vergleiche mit Standard-Nährwertdatenbanken (USDA, BLS)
4. Erkläre deine Anpassungen mit Begründung

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
