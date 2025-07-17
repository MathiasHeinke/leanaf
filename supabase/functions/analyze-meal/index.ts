import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, image } = await req.json();

    let prompt = `Analysiere diese Mahlzeit und gib die Nährwerte zurück. Antworte AUSSCHLIESSLICH im folgenden JSON-Format:

{
  "items": [
    {
      "name": "Lebensmittel Name",
      "amount": "Menge mit Einheit",
      "calories": Kalorien pro Portion,
      "protein": Protein in Gramm,
      "carbs": Kohlenhydrate in Gramm,
      "fats": Fette in Gramm
    }
  ],
  "total": {
    "calories": Gesamtkalorien,
    "protein": Gesamt-Protein,
    "carbs": Gesamt-Kohlenhydrate,
    "fats": Gesamt-Fette
  }
}

Mahlzeit: ${text}`;

    const messages = [
      {
        role: 'system',
        content: 'Du bist ein Ernährungsexperte, der präzise Nährwerte aus Mahlzeitenbeschreibungen extrahiert. Antworte nur mit dem angeforderten JSON-Format.'
      },
      {
        role: 'user',
        content: image ? [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: image } }
        ] : prompt
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API Fehler');
    }

    const content = data.choices[0].message.content;
    
    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Content:', content);
      throw new Error('Ungültige Antwort von OpenAI');
    }

  } catch (error) {
    console.error('Error in analyze-meal function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});