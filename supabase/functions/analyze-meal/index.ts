
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
    
    console.log('📥 Received request:', { 
      hasText: !!text, 
      textLength: text?.length || 0,
      hasImages: !!images && images.length > 0,
      imageCount: images?.length || 0
    });

    // Validate input - allow either text OR images OR both
    if (!text && (!images || images.length === 0)) {
      console.error('❌ No input provided');
      throw new Error('Bitte geben Sie Text ein oder laden Sie ein Bild hoch');
    }

    let prompt = `Du bist ein Ernährungsexperte mit Zugang zu präzisen Nährwertdatenbanken (USDA, BLS). 

WICHTIGE ANWEISUNGEN:
- Schätze realistische Portionsgrößen basierend auf typischen Mahlzeiten
- Verwende Standard-Nährwertdatenbanken als Referenz
- Bei Unsicherheiten: wähle konservative, realistische Werte
- Berücksichtige Zubereitungsarten (gebraten/gekocht beeinflusst Kalorien)
- Runde auf realistische Werte (keine Kommastellen bei Kalorien)

PORTION SIZE GUIDELINES:
- Pasta/Reis: 80-100g trocken = 250-300g gekocht
- Fleisch: 120-150g pro Portion
- Gemüse: 150-200g pro Portion
- Brot: 1 Scheibe = 30-40g
- Öl/Butter: 1 TL = 5ml, 1 EL = 15ml

${text ? `Analysiere diese Mahlzeit: "${text}"` : "Analysiere die hochgeladenen Bilder und schätze die Portionsgrößen"}

${!text && images?.length > 0 ? "HINWEIS: Analysiere NUR die Bilder, da kein Text bereitgestellt wurde." : ""}

Antworte AUSSCHLIESSLICH im folgenden JSON-Format:

{
  "title": "Prägnante Mahlzeit-Beschreibung",
  "items": [
    {
      "name": "Lebensmittel Name",
      "amount": "Realistische Menge mit Einheit",
      "calories": Kalorien_als_Zahl,
      "protein": Protein_in_Gramm,
      "carbs": Kohlenhydrate_in_Gramm,
      "fats": Fette_in_Gramm
    }
  ],
  "total": {
    "calories": Gesamtkalorien,
    "protein": Gesamt_Protein,
    "carbs": Gesamt_Kohlenhydrate,
    "fats": Gesamt_Fette
  },
  "confidence": "high|medium|low",
  "notes": "Erklärung der Schätzung und Unsicherheiten"
}`;

    // Build user content with text and images
    let userContent = [{ type: 'text', text: prompt }];
    
    if (images && images.length > 0) {
      console.log('🖼️ Adding images to analysis');
      // Add each image to the content array
      images.forEach((imageUrl: string, index: number) => {
        console.log(`📸 Adding image ${index + 1}: ${imageUrl.substring(0, 50)}...`);
        userContent.push({
          type: 'image_url',
          image_url: { url: imageUrl }
        });
      });
    }

    const messages = [
      {
        role: 'system',
        content: 'Du bist ein präziser Ernährungsexperte. Nutze Referenz-Nährwertdatenbanken für genaue Angaben. Antworte nur mit dem angeforderten JSON-Format.'
      },
      {
        role: 'user',
        content: userContent
      }
    ];

    console.log('🤖 Sending request to OpenAI GPT-4.1...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages,
        max_tokens: 1500,
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    console.log('📡 OpenAI response status:', response.status);

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ OpenAI API error:', data);
      throw new Error(data.error?.message || 'OpenAI API Fehler');
    }

    const content = data.choices[0].message.content;
    console.log('📄 OpenAI raw response:', content);
    
    try {
      const parsed = JSON.parse(content);
      console.log('✅ Parsed nutrition data:', JSON.stringify(parsed, null, 2));
      
      // Validate and ensure reasonable values
      if (parsed.total && parsed.total.calories) {
        // Basic sanity checks
        if (parsed.total.calories < 10 || parsed.total.calories > 5000) {
          console.warn('⚠️ Unusual calorie value detected:', parsed.total.calories);
        }
        if (parsed.total.protein < 0 || parsed.total.protein > 200) {
          console.warn('⚠️ Unusual protein value detected:', parsed.total.protein);
        }
      }
      
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      console.error('📄 Content:', content);
      
      // Fallback response if JSON parsing fails
      const fallbackResponse = {
        title: text || 'Analysierte Mahlzeit',
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
        },
        confidence: 'low',
        notes: 'Automatische Schätzung - bitte Werte überprüfen. Analyse-Fehler bei der KI-Antwort.'
      };
      
      console.log('🔄 Using fallback response:', fallbackResponse);
      
      return new Response(JSON.stringify(fallbackResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('❌ Error in analyze-meal function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Ein unerwarteter Fehler ist aufgetreten',
      details: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
