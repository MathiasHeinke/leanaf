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

serve(async (req) => {
  console.log('Supplement recognition request received at:', new Date().toISOString());
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body = await req.json();
    
    const {
      userId,
      imageUrl,
      userQuestion = ''
    } = body;

    // Validate inputs
    if (!userId || !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'User ID and image URL are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔍 Analyzing supplement image for user: ${userId}`);

    // Get all supplements from database for context
    const { data: supplements, error: supplementsError } = await supabase
      .from('supplement_database')
      .select('id, name, category, description, common_brands');

    if (supplementsError) {
      console.error('Error fetching supplements:', supplementsError);
      throw new Error('Failed to fetch supplement database');
    }

    // Create a comprehensive list of supplement names for recognition
    const supplementList = supplements?.map(s => 
      `${s.name} (${s.category}${s.common_brands ? `, Marken: ${s.common_brands.join(', ')}` : ''})`
    ).join('\n') || '';

    // Create analysis prompt
    const analysisPrompt = `Du bist ein Experte für Nahrungsergänzungsmittel und sollst Supplements auf Bildern erkennen.

AUFGABE: Erkenne alle sichtbaren Supplements auf dem Bild und ordne sie den Einträgen in unserer Datenbank zu.

SUPPLEMENT-DATENBANK:
${supplementList}

ANALYSE-SCHRITTE:
1. Erkenne alle sichtbaren Supplement-Produkte (Pulver, Kapseln, Tabletten, Flüssigkeiten)
2. Identifiziere Produktnamen, Marken und Wirkstoffbezeichnungen
3. Schätze die Anzahl/Menge der Supplements ab
4. Ordne erkannte Supplements den Einträgen in unserer Datenbank zu

ANTWORT-FORMAT (JSON):
{
  "recognized_supplements": [
    {
      "product_name": "Erkannter Produktname",
      "supplement_match": "Name aus der Datenbank",
      "supplement_id": "ID aus der Datenbank falls erkannt",
      "confidence": 0.9,
      "quantity_estimate": "1 Dose",
      "notes": "Weitere Details"
    }
  ],
  "analysis": "Detaillierte Beschreibung der erkannten Supplements",
  "confidence_score": 0.85,
  "recommendations": "Empfehlungen für die Supplementation"
}

WICHTIG: 
- Gib NUR valides JSON zurück
- Nutze nur supplement_id wenn du dir sehr sicher bist (>90% Übereinstimmung)
- Bei Unsicherheit supplement_id auf null setzen
- Schätze realistische confidence-Werte ein`;

    // Prepare messages for OpenAI Vision API
    const messages = [
      {
        role: 'system',
        content: analysisPrompt
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userQuestion || 'Erkenne bitte alle Supplements auf diesem Bild und ordne sie unserer Datenbank zu.'
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
    ];

    console.log('🤖 Sending image to OpenAI Vision API for supplement recognition');

    // Call OpenAI Vision API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: messages,
        max_tokens: 1200,
        temperature: 0.3, // Lower temperature for more consistent recognition
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI Vision API error:', errorText);
      throw new Error(`OpenAI Vision API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    let analysisText = openAIData.choices[0]?.message?.content;

    if (!analysisText) {
      throw new Error('No response from OpenAI Vision API');
    }

    console.log('📝 Raw OpenAI response:', analysisText);

    // Parse JSON response
    let parsedResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      // Fallback: create structured response from text
      parsedResult = {
        recognized_supplements: [],
        analysis: analysisText,
        confidence_score: 0.5,
        recommendations: 'Bitte versuche es mit einem klareren Bild.'
      };
    }

    // Validate and clean up supplement IDs
    if (parsedResult.recognized_supplements) {
      for (const supplement of parsedResult.recognized_supplements) {
        if (supplement.supplement_id) {
          // Verify the supplement_id exists in our database
          const dbSupplement = supplements?.find(s => s.id === supplement.supplement_id);
          if (!dbSupplement) {
            console.warn(`Invalid supplement_id: ${supplement.supplement_id}, setting to null`);
            supplement.supplement_id = null;
          }
        }
      }
    }

    // Log recognition result
    try {
      await supabase
        .from('supplement_recognition_log')
        .insert({
          user_id: userId,
          image_url: imageUrl,
          recognized_supplements: parsedResult.recognized_supplements || [],
          analysis_result: parsedResult.analysis || analysisText,
          confidence_score: parsedResult.confidence_score || 0.5
        });
    } catch (logError) {
      console.error('Failed to log recognition result:', logError);
    }

    console.log(`✅ Supplement recognition completed. Found ${parsedResult.recognized_supplements?.length || 0} supplements`);

    return new Response(JSON.stringify({
      success: true,
      ...parsedResult,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error in supplement-recognition function:', error);
    
    const errorResponse = {
      success: false,
      error: error.message || 'Internal server error',
      recognized_supplements: [],
      analysis: 'Entschuldigung, ich kann die Supplements auf dem Bild gerade nicht erkennen. Versuche es bitte später noch einmal.',
      confidence_score: 0,
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});