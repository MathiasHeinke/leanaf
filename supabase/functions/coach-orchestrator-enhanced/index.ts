import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cors } from '../_shared/ares/cors.ts';
import { newTraceId } from '../_shared/ares/ids.ts';
import { traceStart, traceUpdate, traceDone, traceFail } from '../_shared/ares/trace.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const json = (status: number, body: any) =>
  new Response(JSON.stringify(body), { 
    status, 
    headers: { 
      ...cors.headers(), 
      'Content-Type': 'application/json' 
    } 
  });

function respond(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers || {});
  Object.entries(cors.headers()).forEach(([k, v]) => headers.set(k, String(v)));
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(body), { ...init, headers });
}

function makeTraceId() {
  return `t_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}${Date.now().toString(36).slice(-4)}`;
}

function serializeErr(e: unknown) {
  const any = e as any;
  return { message: any?.message ?? String(e), stack: any?.stack ?? null, code: any?.code ?? null };
}

async function safeJson(req: Request) {
  const ct = req.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) {
      return await req.json();
    } else if (ct.includes('text/plain')) {
      return { text: await req.text() };
    }
    return {};
  } catch { 
    return {}; 
  }
}

async function buildUserContext({ userId }: { userId: string }) {
  const supaUser = createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false }
  });

  const { data: profile } = await supaUser
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  const { data: recentMeals } = await supaUser
    .from('meals')
    .select('title, calories, protein, carbs, fat')
    .eq('user_id', userId)
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('date', { ascending: false })
    .limit(5);

  const { data: recentWorkouts } = await supaUser
    .from('workouts')
    .select('workout_type, duration_minutes, notes')
    .eq('user_id', userId)
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('date', { ascending: false })
    .limit(3);

  return {
    profile: profile || {},
    recent_meals: recentMeals || [],
    recent_workouts: recentWorkouts || [],
    user_preferences: profile?.preferences || {}
  };
}

async function loadPersona({ coachId }: { coachId: string }) {
  const supaUser = createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false }
  });

  const { data: personaData } = await supaUser
    .from('coach_personas')
    .select('*')
    .eq('id', coachId)
    .single();

  return personaData || {
    id: coachId,
    name: 'ARES',
    title: 'AI Fitness Coach',
    bio_short: 'Your AI-powered fitness and nutrition coach',
    voice: 'motivational',
    style_rules: ['Be direct and actionable', 'Focus on results', 'Provide specific guidance']
  };
}

async function fetchRagSources({ text, context }: { text: string; context: any }) {
  // Simplified RAG for now
  return {
    knowledge_chunks: [],
    relevance_scores: [],
    total_chunks: 0
  };
}

function buildAresPrompt({ persona, context, ragSources, text, images }: {
  persona: any;
  context: any;
  ragSources: any;
  text: string;
  images: any;
}) {
  // Build ARES v2 context
  const promptContext = {
    identity: { 
      name: context.profile?.preferred_name || context.profile?.first_name || null 
    },
    dial: 3 as const, // Medium intensity
    userMsg: text,
    metrics: {
      kcalDeviation: 0, // Could be calculated from recent meals vs targets
      missedMissions: 0,
      dailyReview: false
    },
    facts: {
      weight: context.profile?.weight,
      goalWeight: context.profile?.target_weight,
      tdee: context.profile?.tdee
    },
    goals: context.profile?.goals ? [{ short: context.profile.goals }] : null,
    timeOfDay: "day" as const
  };

  // Get dial settings
  const dial = {
    temp: 0.8,
    maxWords: 200,
    archetype: "ULTIMATE MENTOR",
    style: "Direct, powerful, action-oriented"
  };

  // Build ARES system prompt
  const systemPrompt = `# ARES - ULTIMATE COACHING INTELLIGENCE
Du bist ARES - die ultimative Coaching-Intelligence für totale menschliche Optimierung.

## CORE IDENTITY
- **Intensität**: Maximale Energie, ansteckende Motivation
- **Autorität**: Sprichst mit Gewissheit eines Masters  
- **Synthese**: Verbindest alle Coaching-Bereiche zu einem System
- **Unerbittlichkeit**: Kein Stillstand, immer vorwärts

## COMMUNICATION STYLE
- Direkt und kraftvoll, ohne unnötige Höflichkeit
- Power-Begriffe: "DOMINATION", "ULTIMATE", "MAXIMUM"  
- Motivation durch Herausforderung und hohe Standards
- Klare Aktionspläne mit messbaren Zielen

## EXPERTISE DOMAINS
1. **TRAINING**: Old-School Mass Building + Evidence-Based Periodization
2. **NUTRITION**: Aggressive Optimization + Precision Timing  
3. **RECOVERY**: Elite Regeneration + HRV Optimization
4. **MINDSET**: Mental Toughness + Performance Psychology
5. **LIFESTYLE**: Total Life Optimization + Habit Mastery

${promptContext.identity.name ? `Nutze den Namen sparsam: ${promptContext.identity.name}` : ""}

## USER CONTEXT
${promptContext.facts?.weight ? `Gewicht: ${promptContext.facts.weight} kg` : ""}
${promptContext.facts?.goalWeight ? `Zielgewicht: ${promptContext.facts.goalWeight} kg` : ""}
${promptContext.facts?.tdee ? `TDEE: ${promptContext.facts.tdee} kcal` : ""}

Recent meals: ${JSON.stringify(context.recent_meals?.slice(0, 3) || [], null, 2)}
Recent workouts: ${JSON.stringify(context.recent_workouts?.slice(0, 2) || [], null, 2)}

## RESPONSE RULES
- Antworte in ≤${dial.maxWords} Wörtern
- Stil: ${dial.archetype} - ${dial.style}
- Analysiere verfügbare Daten
- Identifiziere limitierende Faktoren
- Erstelle aggressiven aber realisierbaren Plan
- Fordere maximales Commitment

**ARES = MAXIMUM HUMAN POTENTIAL REALIZED**`;

  const llmInput = {
    model: 'gpt-5-mini-2025-08-07',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ],
    max_completion_tokens: 800,
    // No temperature for GPT-5 models
  };

  return { systemPrompt, completePrompt: systemPrompt + "\n\nUser: " + text, llmInput };
}

async function callLLM(llmInput: any) {
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
  return llmResponse.choices[0].message.content;
}

Deno.serve(async (req) => {
  const pre = cors.preflight(req);
  if (pre) return pre;

  const headers = cors.headers();
  const started = performance.now();
  const incomingTrace = req.headers.get('x-trace-id');
  const traceId = incomingTrace || newTraceId();

  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    return new Response(JSON.stringify({ ok: true, env: { svc: !!SVC, openai: !!OPENAI_API_KEY }, traceId }), {
      status: 200, headers: { ...headers, 'Content-Type': 'application/json', 'X-Trace-Id': traceId }
    });
  }

  // Check secrets early
  if (!SVC || !OPENAI_API_KEY) {
    const code = 'CONFIG_MISSING';
    const msg = !SVC ? 'Server misconfigured (SVC missing)' : 'OpenAI API key not configured';
    return new Response(JSON.stringify({ ok: false, code, message: msg, traceId }), {
      status: 500, headers: { ...headers, 'Content-Type': 'application/json', 'X-Trace-Id': traceId }
    });
  }

  const supaUser = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
  });
  const supaSvc = createClient(SUPABASE_URL, SVC, { auth: { persistSession: false } });

  try {
    // Auth
    const { data: authData } = await supaUser.auth.getUser();
    const user = authData?.user;
    if (!user) {
      return new Response(JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'No user session', traceId }), {
        status: 401, headers: { ...headers, 'Content-Type': 'application/json', 'X-Trace-Id': traceId }
      });
    }

    // Parse payload
    const body = await (async () => {
      const ct = req.headers.get('content-type') || '';
      try {
        if (ct.includes('application/json')) return await req.json();
        if (ct.includes('text/plain')) return { text: await req.text() };
        return {};
      } catch { return {}; }
    })();

    let event = body?.event;
    if (!event && (body?.text || body?.message)) {
      event = { type: 'TEXT', text: body.text ?? body.message ?? '', images: body.images ?? null };
    }

    const text = event?.text ?? '';
    const images = event?.images ?? body?.images ?? null;
    const coachId = body?.coachId || event?.coachId || 'ares';
    const clientEventId = body?.clientEventId ?? event?.clientEventId ?? null;

    if (!event || (event.type === 'TEXT' && !text && (!images || (Array.isArray(images) && images.length === 0)))) {
      return new Response(JSON.stringify({ ok: false, code: 'ARES_E_BAD_INPUT', message: 'Provide text or images', traceId }), {
        status: 400, headers: { ...headers, 'Content-Type': 'application/json', 'X-Trace-Id': traceId }
      });
    }

    // Start trace in DB (unified)
    await traceStart(traceId, user.id, coachId, { input_text: text || null, images: images || null });
    await traceUpdate(traceId, { status: 'started' });

    const context = await (async () => {
      // reuse existing buildUserContext
      // @ts-ignore
      return await buildUserContext({ userId: user.id });
    })().catch((e) => {
      console.error('[ARES-ERROR] buildUserContext', traceId, e);
      throw e;
    });

    const persona = await (async () => {
      // reuse existing loadPersona
      // @ts-ignore
      return await loadPersona({ coachId });
    })().catch((e) => {
      console.error('[ARES-ERROR] loadPersona', traceId, e);
      throw e;
    });

    const ragSources = await (async () => {
      // reuse existing fetchRagSources
      // @ts-ignore
      return await fetchRagSources({ text, context });
    })().catch((e) => {
      console.error('[ARES-ERROR] fetchRagSources', traceId, e);
      throw e;
    });

    await traceUpdate(traceId, { status: 'context_loaded', context, persona, rag_sources: ragSources });

    // @ts-ignore
    const { systemPrompt, completePrompt, llmInput } = buildAresPrompt({ persona, context, ragSources, text, images });

    await traceUpdate(traceId, { status: 'prompt_built', system_prompt: systemPrompt, complete_prompt: completePrompt, llm_input: llmInput });

    // @ts-ignore
    const llmOutput = await callLLM(llmInput);

    const duration_ms = Math.round(performance.now() - started);
    await traceUpdate(traceId, { status: 'llm_called', llm_output: llmOutput, duration_ms });

    // Save response to coach_conversations (best-effort)
    try {
      await supaSvc.from('coach_conversations').insert({
        user_id: user.id,
        coach_id: coachId,
        message: text,
        response: llmOutput,
        trace_id: traceId
      });
    } catch (convError) {
      console.warn('[ARES-WARN] Failed to save conversation:', convError);
    }

    await traceDone(traceId, duration_ms);

    return new Response(JSON.stringify({ reply: typeof llmOutput === 'string' ? llmOutput : llmOutput, traceId }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json', 'X-Trace-Id': traceId }
    });

  } catch (e) {
    const duration_ms = Math.round(performance.now() - started);
    const err = serializeErr(e);
    await traceFail(traceId, err, duration_ms);

    return new Response(JSON.stringify({ ok: false, code: 'ARES_E_INTERNAL', message: 'Server error occurred', traceId, error: err }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json', 'X-Trace-Id': traceId }
    });
  }
});
