import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getTaskModel } from '../_shared/openai-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { originalImages, leftoverImages, mealDescription } = await req.json();
    
    if (!originalImages?.length || !leftoverImages?.length) {
      return new Response(
        JSON.stringify({ error: 'Both original and leftover images are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Prepare the analysis prompt
    const systemPrompt = `Du bist ein Ernährungsexperte, der dabei hilft, die tatsächlich verzehrte Menge von Lebensmitteln zu berechnen, indem du Original- und Reste-Fotos vergleichst.

Analysiere die bereitgestellten Bilder:
1. Das erste Bild zeigt das ursprüngliche Essen
2. Das zweite Bild zeigt die Reste

Berechne den Prozentsatz der tatsächlich verzehrten Menge basierend auf dem visuellen Vergleich.

Antworte im folgenden JSON-Format:
{
  "consumption_percentage": 85,
  "analysis": {
    "original_description": "Detaillierte Beschreibung des ursprünglichen Essens",
    "leftover_description": "Beschreibung der Reste",
    "comparison_notes": "Vergleichsnotizen zur Mengeneinschätzung"
  },
  "confidence": "hoch/mittel/niedrig",
  "recommendations": "Empfehlungen für bessere Portionsgrößen"
}`;

    const userPrompt = `Mahlzeit: ${mealDescription || 'Nicht spezifiziert'}

Bitte analysiere die Bilder und berechne den Prozentsatz der verzehrten Menge. Berücksichtige dabei:
- Sichtbare Mengenunterschiede zwischen Original und Resten
- Art der Lebensmittel und deren Portionierung
- Realistische Schätzungen basierend auf visuellen Hinweisen`;

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: originalImages[0] } },
          { type: 'image_url', image_url: { url: leftoverImages[0] } }
        ]
      }
    ];

    // Call OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getTaskModel('enhanced-meal-analysis'),
        messages: messages,
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (e) {
      // Fallback parsing if JSON is malformed
      const percentageMatch = content.match(/consumption_percentage["\s]*:\s*(\d+)/);
      analysis = {
        consumption_percentage: percentageMatch ? parseInt(percentageMatch[1]) : 75,
        analysis: {
          original_description: "Analyse nicht vollständig verfügbar",
          leftover_description: "Analyse nicht vollständig verfügbar", 
          comparison_notes: content
        },
        confidence: "mittel",
        recommendations: "Bitte überprüfen Sie die Ergebnisse manuell"
      };
    }

    // Validate and sanitize the percentage
    let consumptionPercentage = analysis.consumption_percentage || 75;
    consumptionPercentage = Math.max(0, Math.min(100, consumptionPercentage));

    console.log('Leftover analysis completed:', {
      consumptionPercentage,
      confidence: analysis.confidence
    });

    return new Response(
      JSON.stringify({
        consumption_percentage: consumptionPercentage,
        analysis: analysis.analysis,
        confidence: analysis.confidence,
        recommendations: analysis.recommendations,
        metadata: {
          processed_at: new Date().toISOString(),
          model_used: getTaskModel('enhanced-meal-analysis'),
          original_image_count: originalImages.length,
          leftover_image_count: leftoverImages.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-meal-leftovers:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to analyze leftovers',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});