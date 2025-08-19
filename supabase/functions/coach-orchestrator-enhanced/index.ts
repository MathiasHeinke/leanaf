import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // <- must exist
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info, x-supabase-api-version, prefer, x-trace-id, x-source, x-chat-mode',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true'
};

function respond(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers || {});
  Object.entries(cors).forEach(([k, v]) => headers.set(k, String(v)));
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
  try { return await req.json(); } catch { return {}; }
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

function buildPrompts({ persona, context, ragSources, text, images }: {
  persona: any;
  context: any;
  ragSources: any;
  text: string;
  images: any;
}) {
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
    max_tokens: 1000,
    temperature: 0.7
  };

  return { systemPrompt, completePrompt, llmInput };
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors as any });

  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    return respond({ ok: true, env: { svc: !!SVC, openai: !!OPENAI_API_KEY } });
  }

  const started = performance.now();
  const traceId = makeTraceId();

  // Check secrets early → return 500 with traceId
  if (!SVC) {
    console.error('[ARES-ERROR] Missing SUPABASE_SERVICE_ROLE_KEY');
    return respond({ ok: false, code: 'CONFIG_MISSING', message: 'Server misconfigured', traceId }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  if (!OPENAI_API_KEY) {
    console.error('[ARES-ERROR] Missing OPENAI_API_KEY');
    return respond({ ok: false, code: 'CONFIG_MISSING', message: 'OpenAI API key not configured', traceId }, { status: 500, headers: { 'X-Trace-Id': traceId } });
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
      return respond({ ok: false, code: 'UNAUTHORIZED', message: 'No user session', traceId }, { status: 401, headers: { 'X-Trace-Id': traceId } });
    }

    // Parse payload (tolerant)
    const b = await safeJson(req);
    const event = b?.event ?? null;
    const text =
      event?.text ??
      b?.text ??
      b?.message ??
      (typeof b === 'string' ? b : '') ?? '';
    const images = event?.images ?? b?.images ?? null;
    const coachId = b?.coachId || 'ares';
    const clientEventId = b?.clientEventId ?? null;

    if (!text && (!images || (Array.isArray(images) && images.length === 0))) {
      // Use 422 to indicate client input problem (not 400 ambiguous)
      return respond({ ok: false, code: 'NO_INPUT', message: 'Provide text or images', traceId }, { status: 422, headers: { 'X-Trace-Id': traceId } });
    }

    // Create trace row immediately
    await supaSvc.from('ares_traces').insert({
      trace_id: traceId,
      user_id: user.id,
      coach_id: coachId,
      status: 'started',
      client_event_id: clientEventId,
      input_text: text || null,
      images: images || null
    });

    // === BUSINESS LOGIC ===
    const context = await buildUserContext({ userId: user.id }).catch((e) => {
      console.error('[ARES-ERROR] buildUserContext', traceId, e);
      throw e;
    });
    const persona = await loadPersona({ coachId }).catch((e) => {
      console.error('[ARES-ERROR] loadPersona', traceId, e);
      throw e;
    });
    const ragSources = await fetchRagSources({ text, context }).catch((e) => {
      console.error('[ARES-ERROR] fetchRagSources', traceId, e);
      throw e;
    });

    await supaSvc.from('ares_traces')
      .update({ status: 'context_loaded', context, persona, rag_sources: ragSources })
      .eq('trace_id', traceId);

    const { systemPrompt, completePrompt, llmInput } = buildPrompts({ persona, context, ragSources, text, images });

    await supaSvc.from('ares_traces')
      .update({ status: 'prompt_built', system_prompt: systemPrompt, complete_prompt: completePrompt, llm_input: llmInput })
      .eq('trace_id', traceId);

    const llmOutput = await callLLM(llmInput);

    const duration_ms = Math.round(performance.now() - started);
    await supaSvc.from('ares_traces')
      .update({ status: 'completed', llm_output: llmOutput, duration_ms })
      .eq('trace_id', traceId);

    return respond({ ok: true, traceId, reply: llmOutput }, { headers: { 'X-Trace-Id': traceId } });

  } catch (e) {
    const err = serializeErr(e);
    try {
      await createClient(SUPABASE_URL, SVC!, { auth: { persistSession: false } })
        .from('ares_traces')
        .upsert({ trace_id: traceId, status: 'failed', error: err });
    } catch {
      // swallow
    }
    console.error('[ARES-ERROR]', traceId, err);
    return respond({ ok: false, code: 'INTERNAL_ERROR', traceId, error: err }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }
});