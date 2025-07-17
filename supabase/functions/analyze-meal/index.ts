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
    const { text, images } = await req.json();
    
    console.log('Received request:', { text, hasImages: !!images && images.length > 0 });

    if (!text && (!images || images.length === 0)) {
      throw new Error('Weder Text noch Bild bereitgestellt');
    }

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

    // Build user content with text and images
    let userContent = [{ type: 'text', text: prompt }];
    
    if (images && images.length > 0) {
      // Add each image to the content array
      images.forEach((imageUrl: string) => {
        userContent.push({
          type: 'image_url',
          image_url: { url: imageUrl }
        });
      });
    }

    const messages = [
      {
        role: 'system',
        content: 'Du bist ein Ernährungsexperte, der präzise Nährwerte aus Mahlzeitenbeschreibungen extrahiert. Antworte nur mit dem angeforderten JSON-Format.'
      },
      {
        role: 'user',
        content: userContent
      }
    ];

    console.log('Sending request to OpenAI...');
    
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

    console.log('OpenAI response status:', response.status);

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API Fehler');
    }

    const content = data.choices[0].message.content;
    console.log('OpenAI raw response:', content);
    
    try {
      const parsed = JSON.parse(content);
      console.log('Parsed nutrition data:', parsed);
      
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Content:', content);
      
      // Fallback response if JSON parsing fails
      const fallbackResponse = {
        items: [{
          name: text || 'Unbekannte Mahlzeit',
          amount: '1 Portion',
          calories: 300,
          protein: 15,
          carbs: 30,
          fats: 10
        }],
        total: {
          calories: 300,
          protein: 15,
          carbs: 30,
          fats: 10
        }
      };
      
      return new Response(JSON.stringify(fallbackResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in analyze-meal function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});