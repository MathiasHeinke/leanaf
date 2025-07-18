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

let prompt = `Analysiere diese Mahlzeit und gib die Nährwerte zurück. 
Wenn Bilder vorhanden sind, beschreibe die erkannten Lebensmittel und schätze deren Mengen.
Wenn Text vorhanden ist, berücksichtige diese zusätzlichen Informationen.
Sei möglichst präzise bei den Nährwertangaben.

Zusätzlich erstelle automatisch einen passenden Titel/Name für diese Mahlzeit.

Antworte AUSSCHLIESSLICH im folgenden JSON-Format:

{
  "title": "Passender Mahlzeittitel",
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

${text ? `Beschreibung: ${text}` : "Analysiere die Bilder"}`;

    // Build user content with text and images
    let userContent = [{ type: 'text', text: prompt }];
    
    if (images && images.length > 0) {
      console.log('Adding images to request:', images.length);
      // Add each image to the content array
      images.forEach((imageUrl: string) => {
        userContent.push({
          type: 'image_url',
          image_url: { 
            url: imageUrl,
            detail: 'high'
          }
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
        model: 'gpt-4o',
        messages,
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: 'json' },
      }),
    });

    console.log('OpenAI response status:', response.status);

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API Fehler');
    }

    // Remove any possible markdown formatting
    const content = data.choices[0].message.content.replace(/```json\n?|\n?```/g, '').trim();
    console.log('Cleaned OpenAI response:', content);
    
    try {
      const parsed = JSON.parse(content);
      
      // Validate if we got actual nutrition data and not just fallback values
      if (parsed.total.calories === 300 && parsed.total.protein === 15) {
        throw new Error('Ungültige Analyse erhalten');
      }
      
      console.log('Parsed nutrition data:', parsed);
      
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Error parsing OpenAI response. Content:', content);
      throw new Error('Fehler beim Analysieren der Mahlzeit. Bitte versuchen Sie es erneut.');
    }

  } catch (error) {
    console.error('Error in analyze-meal function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});