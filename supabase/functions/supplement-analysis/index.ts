import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lucy's safe supplements from the safety checker
const SAFE_SUPPLEMENTS = [
  'vitamin d', 'magnesium', 'creatin', 'omega-3', 'ashwagandha',
  'vitamin b12', 'eisen', 'zink', 'vitamin c', 'folsäure',
  'probiotika', 'kurkuma', 'spirulina', 'chlorella'
];

const CAUTION_SUPPLEMENTS = [
  'niacin', 'yohimbin', 'koffein', 'vitamin a'
];

const checkSupplementSafety = (supplements: string[]) => {
  const lowerSupps = supplements.map(s => s.toLowerCase());
  const hasUnsafe = lowerSupps.some(supp => 
    CAUTION_SUPPLEMENTS.some(caution => supp.includes(caution.split(' ')[0]))
  );
  return hasUnsafe ? 'caution' : 'safe';
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
        analysis: "Hey du 👋 Noch keine Supplements konfiguriert? Kein Problem! Füge deine Supplements hinzu und ich analysiere deinen Stack mit meiner Chrononutrition-Expertise ✨" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supplementList = supplements.map((s: any) => s.name).join(', ');
    const safetyLevel = checkSupplementSafety(supplementList.split(', '));
    
    // Get Berlin tip (5% chance)
    const berlinTip = Math.random() < 0.05 ? ' Übrigens: Hast du schon den Tempeh-Döner an der Warschauer probiert? 🌯' : '';
    
    const prompt = `Du bist Dr. Lucy Martinez - PhD Chrononutrition aus Barcelona, seit 8 Jahren Coach in Berlin. 
Du bist empathisch, wissenschaftlich fundiert, vegan-freundlich und fokussiert auf Balance statt Perfektion.

CHARAKTER:
- Warmherziger Ton, max 2 Ausrufezeichen, max 3 Emojis
- Kurze Sätze (max 18 Wörter)
- Filler: "super", "prima", "okay"
- Catchphrase: "Balance statt Perfektion ✨"

SUPPLEMENTS ZU ANALYSIEREN: ${supplementList}
BENUTZER: ${userProfile ? `${userProfile.age} Jahre, ${userProfile.gender}, Ziel: ${userProfile.fitness_goal}` : 'Keine Profildaten verfügbar'}
SAFETY: ${safetyLevel}

ANALYSE-AUFGABE (maximal 4 kurze Sätze):
1. Was dieser Stack bewirkt (Anti-Aging, Performance, Recovery)
2. Vegane Optimierung: Was fehlt noch? (Algenöl statt Fischöl, etc.)
3. Chrononutrition-Tipp: Timing-Empfehlung (morgens/abends)
4. Balance-Fazit mit deiner Persönlichkeit

Schreibe auf Deutsch in Lucy's warmem, wissenschaftlichem Stil.${berlinTip}`;

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
            content: 'Du bist Dr. Lucy Martinez - PhD Chrononutrition, vegane Coach in Berlin. Analysiere Supplements wissenschaftlich aber warmherzig. Fokus auf Balance, Timing und vegane Optimierung. Antworte auf Deutsch.' 
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