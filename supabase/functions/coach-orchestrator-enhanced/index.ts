import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

// CORS headers (bulletproof)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info, x-supabase-api-version, prefer, x-trace-id, x-source, x-chat-mode',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true'
};

function json(body: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers || {});
  Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, String(v)));
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(body), { ...init, headers });
}

// Helper: Server-side Trace ID
function makeTraceId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `t_${rand}${Date.now().toString(36).slice(-4)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders as any });
  }

  let traceId: string;
  let user: any;

  try {
    // Supabase clients
    const supaUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
    });

    // Service Role for Inserts/Updates in ares_traces
    const supaSvc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    // Request handling
    const body = await req.json().catch(() => ({}));
    const userResponse = await supaUser.auth.getUser();
    user = userResponse.data.user;
    
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const coachId = body?.coachId || 'ares';
    const clientEventId = body?.clientEventId || null;
    const text = body?.text ?? '';
    const images = body?.images ?? null;

    // Generate server-side trace ID
    traceId = makeTraceId();
    const startedAt = performance.now();

    console.log(`[ARES-PHASE1-${traceId}] Request received`);
    console.log(`[ARES-PHASE1-${traceId}] Processing: user=${user.id}, coach=${coachId}, text="${text}"`);

    // Trace initial write
    await supaSvc.from('ares_traces').insert({
      trace_id: traceId,
      user_id: user.id,
      coach_id: coachId,
      status: 'started',
      client_event_id: clientEventId,
      input_text: text,
      images
    });

    // Phase: Load context
    console.log(`[ARES-PROMPT] Loading context for user ${user.id}`);
    
    // Get user profile and recent data
    const { data: profile } = await supaUser
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: recentMeals } = await supaUser
      .from('meals')
      .select('title, calories, protein, carbs, fat')
      .eq('user_id', user.id)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(5);

    const { data: recentWorkouts } = await supaUser
      .from('workouts')
      .select('workout_type, duration_minutes, notes')
      .eq('user_id', user.id)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(3);

    const context = {
      profile: profile || {},
      recent_meals: recentMeals || [],
      recent_workouts: recentWorkouts || [],
      user_preferences: profile?.preferences || {}
    };

    console.log(`[ARES-PROMPT] Memory loaded: profile=${!!profile}, meals=${recentMeals?.length || 0}, workouts=${recentWorkouts?.length || 0}`);

    // Phase: Load persona
    const { data: personaData } = await supaUser
      .from('coach_personas')
      .select('*')
      .eq('id', 'ares')
      .single();

    const persona = personaData || {
      id: 'ares',
      name: 'ARES',
      title: 'AI Fitness Coach',
      bio_short: 'Your AI-powered fitness and nutrition coach',
      voice: 'motivational',
      style_rules: ['Be direct and actionable', 'Focus on results', 'Provide specific guidance']
    };

    console.log(`[ARES-PROMPT] Persona loaded: ${persona.name}`);

    // Phase: RAG sources (simplified for this implementation)
    const ragSources = {
      knowledge_chunks: [],
      relevance_scores: [],
      total_chunks: 0
    };

    await supaSvc.from('ares_traces')
      .update({ 
        status: 'context_loaded', 
        context, 
        persona, 
        rag_sources: ragSources 
      })
      .eq('trace_id', traceId);

    // Phase: Build prompts
    const systemPrompt = `You are ${persona.name}, ${persona.title}.

${persona.bio_short}

Voice: ${persona.voice}
Style rules: ${persona.style_rules?.join(', ') || 'Be helpful and supportive'}

User Context:
- Profile: ${JSON.stringify(context.profile, null, 2)}
- Recent meals: ${JSON.stringify(context.recent_meals, null, 2)}
- Recent workouts: ${JSON.stringify(context.recent_workouts, null, 2)}

Guidelines:
- Be direct and actionable
- Focus on fitness and nutrition advice
- Provide specific, personalized recommendations
- Keep responses concise but helpful`;

    const completePrompt = `${systemPrompt}

User message: ${text}`;

    const llmInput = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      max_tokens: 500,
      temperature: 0.7
    };

    console.log(`[ARES-PHASE1-${traceId}] Prompt built, length: ${systemPrompt.length}`);

    await supaSvc.from('ares_traces')
      .update({ 
        status: 'prompt_built', 
        system_prompt: systemPrompt, 
        complete_prompt: completePrompt, 
        llm_input: llmInput 
      })
      .eq('trace_id', traceId);

    // Phase: LLM call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(llmInput),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const llmResponse = await response.json();
    const reply = llmResponse.choices[0].message.content;

    console.log(`[ARES-RESPONSE] Generated response length: ${reply.length}`);

    const duration_ms = Math.round(performance.now() - startedAt);

    await supaSvc.from('ares_traces')
      .update({ 
        status: 'completed', 
        llm_output: llmResponse, 
        duration_ms 
      })
      .eq('trace_id', traceId);

    console.log(`[ARES-PHASE1-${traceId}] Response generated successfully`);

    // Response with Trace-ID (also in header)
    return json(
      { ok: true, traceId, reply },
      { headers: { 'X-Trace-Id': traceId } }
    );

  } catch (error) {
    console.error(`[ARES-ERROR-${traceId || 'unknown'}]`, error);
    
    const err = { 
      message: (error as any)?.message || String(error), 
      stack: (error as any)?.stack 
    };
    
    if (traceId && user) {
      try {
        const supaSvc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false }
        });
        
        await supaSvc.from('ares_traces')
          .upsert({ 
            trace_id: traceId, 
            user_id: user.id, 
            status: 'failed', 
            error: err 
          })
          .eq('trace_id', traceId);
      } catch (dbError) {
        console.error('Failed to update trace with error:', dbError);
      }
    }

    return json(
      { ok: false, traceId: traceId || null, error: err }, 
      { status: 500, headers: { 'X-Trace-Id': traceId || 'unknown' } }
    );
  }
});