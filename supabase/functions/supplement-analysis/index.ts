import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getTaskModel } from '../_shared/openai-config.ts';
import { logTraceEvent } from "../telemetry.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trace-id, x-source, x-chat-mode',
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
    const t0 = Date.now();
    const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    await logTraceEvent(supabase, {
      traceId,
      stage: 'received',
      handler: 'supplement-analysis',
      status: 'RUNNING',
      payload: { source: 'edge' }
    });

    const { supplements, userProfile } = await req.json();
    
    console.log('🔄 Supplement analysis request:', {
      supplementsCount: supplements?.length || 0,
      userProfile: userProfile ? 'present' : 'missing',
      supplements: supplements?.map((s: any) => s.name) || []
    });

    if (!openAIApiKey) {
      console.error('❌ OpenAI API key not configured');
      return new Response(JSON.stringify({ 
        analysis: "Hey du 👋 Ich bin gerade nicht ganz verfügbar, aber dein Supplement-Stack sieht gut aus! Balance statt Perfektion ✨"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!supplements || supplements.length === 0) {
      console.log('ℹ️ No supplements provided, returning default message');
      return new Response(JSON.stringify({ 
        analysis: "Hey du 👋 Noch keine Supplements konfiguriert? Kein Problem! Füge deine Supplements hinzu und ich analysiere deinen Stack mit meiner Chrononutrition-Expertise ✨" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supplementList = supplements.map((s: any) => s.name).join(', ');
    const safetyLevel = checkSupplementSafety(supplementList.split(', '));
    
    console.log('📋 Processing supplements:', { supplementList, safetyLevel });
    
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

    console.log('🤖 Calling OpenAI with model:', getTaskModel('supplement-recognition'));

    await logTraceEvent(supabase, {
      traceId,
      stage: 'tool_exec',
      handler: 'supplement-analysis',
      status: 'RUNNING',
      payload: { prompt_len: (prompt || '').length }
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getTaskModel('supplement-recognition'),
        messages: [
          { 
            role: 'system', 
            content: 'Du bist Dr. Lucy Martinez - PhD Chrononutrition, vegane Coach in Berlin. Analysiere Supplements wissenschaftlich aber warmherzig. Fokus auf Balance, Timing und vegane Optimierung. Antworte auf Deutsch.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 250,
        temperature: 0.7
      }),
    });

    console.log('📡 OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      
      return new Response(JSON.stringify({ 
        analysis: `Hey du 👋 Ich bin kurz in der Analyse-Pause! Aber super, dass du ${supplementList} nimmst. Balance statt Perfektion ✨`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('✅ OpenAI response received:', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length || 0,
      messageLength: data.choices?.[0]?.message?.content?.length || 0
    });

    const analysis = data.choices?.[0]?.message?.content;

    if (!analysis) {
      console.warn('⚠️ No analysis content in OpenAI response');
      return new Response(JSON.stringify({ 
        analysis: `Hey du 👋 Prima Stack mit ${supplementList}! Timing ist key - Balance statt Perfektion ✨`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🎉 Analysis generated successfully');
    await logTraceEvent(supabase, {
      traceId,
      stage: 'tool_result',
      handler: 'supplement-analysis',
      status: 'OK',
      latencyMs: Date.now() - t0,
      payload: { length: (analysis || '').length }
    });

    await logTraceEvent(supabase, {
      traceId,
      stage: 'reply_send',
      handler: 'supplement-analysis',
      status: 'OK',
      latencyMs: Date.now() - t0
    });
    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Error in supplement-analysis function:', error);
    try {
      const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
      const authHeader = req.headers.get('Authorization') ?? '';
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      await logTraceEvent(supabase, {
        traceId,
        stage: 'error',
        handler: 'supplement-analysis',
        status: 'ERROR',
        errorMessage: String(error)
      });
    } catch (_) { /* ignore */ }
    return new Response(JSON.stringify({ 
      analysis: "Hey du 👋 Kleine Pause bei der Analyse! Supplements sind trotzdem ein guter Schritt. Balance statt Perfektion ✨",
      error: (error as any).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});