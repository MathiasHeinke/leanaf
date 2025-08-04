import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
    const { supplements, userProfile } = await req.json();

    if (!supplements || supplements.length === 0) {
      return new Response(JSON.stringify({ 
        analysis: "Keine Supplements konfiguriert. Füge deine Supplements hinzu, um eine fundierte Analyse zu erhalten." 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supplementList = supplements.map((s: any) => s.name).join(', ');
    
    const prompt = `Analysiere diese Supplement-Stack als erfahrener Coach:

Supplements: ${supplementList}
Benutzer: ${userProfile ? `${userProfile.age} Jahre, ${userProfile.gender}, Ziel: ${userProfile.fitness_goal}` : 'Keine Profildaten verfügbar'}

Erstelle eine kurze Coach-Analyse (maximal 3-4 Sätze):
1. Worauf zahlt dieser Stack hauptsächlich ein? (Performance, Recovery, Gesundheit, etc.)
2. Ist das eine sinnvolle Kombination?
3. Kurzes Fazit zur Qualität/Vollständigkeit

Schreibe auf Deutsch, professionell aber freundlich. Keine Listen, fließtext.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Du bist ein erfahrener Fitness- und Ernährungscoach. Analysiere Supplement-Stacks fundiert und objektiv. Antworte immer auf Deutsch.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.7
      }),
    });

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in supplement-analysis function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});