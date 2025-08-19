import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { nanoid } from 'https://esm.sh/nanoid@5';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 
    'authorization, apikey, content-type, x-client-info, x-supabase-api-version, prefer, x-trace-id, x-source, x-chat-mode',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { 
      global: { 
        headers: { 
          Authorization: req.headers.get('Authorization') ?? '' 
        } 
      } 
    }
  );

  // 1) Auth sicherstellen
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'not_authenticated' }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }, status: 401
    });
  }

  // 2) Body lesen, Client-Event-ID übernehmen
  const body = await req.json().catch(() => ({}));
  const clientEventId = body?.clientEventId ?? null;

  // 3) Server-seitige Trace-ID (einzige Quelle der Wahrheit)
  const traceId = `t_${nanoid(10)}`;

  console.log(`[ARES-PHASE1-${traceId}] Request received`);

  // 4) Sofort sichtbarer Start-Datensatz
  await supabase.from('orchestrator_traces').insert({
    id: traceId,
    user_id: user.id,
    client_event_id: clientEventId,
    status: 'assembling',
    request_payload: body,
    meta: { source: 'coach-orchestrator-enhanced', ua: req.headers.get('user-agent') }
  }).catch(err => console.log(`[TRACE] Insert failed:`, err));

  // Extract text from various body formats
  const text = body?.text || body?.message || body?.event?.text || '';
  
  if (!text) {
    console.log(`[ARES-PHASE1-${traceId}] Missing event`);
    return new Response(JSON.stringify({ 
      kind: 'message', 
      text: 'Ich habe keine Nachricht erhalten. Bitte versuche es nochmal.', 
      trace_id: traceId 
    }), {
      status: 400, 
      headers: { ...CORS, "Content-Type": "application/json", "X-Trace-Id": traceId } 
    });
  }

  console.log(`[ARES-PHASE1-${traceId}] Processing: user=${user.id}, coach=ares, text="${text}"`);

  try {
    // 5) Build context and prompt
    const persona = { id: 'ares', version: 'v1' };
    console.log(`[ARES-PROMPT] Persona loaded: ARES`);
    
    // Load user profile for context
    let userProfile = {};
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      userProfile = data || {};
    } catch (err) {
      console.log(`[ARES-PROMPT] Profile load failed:`, err);
    }
    
    console.log(`[ARES-PROMPT] Memory loaded: profile=true, summaries=0`);

    const systemPrompt = `Du bist ARES - ein direkter, masculiner Mentor-Coach.
Dein Stil: klar, strukturiert, leicht fordernd aber unterstützend.
Sprich wie ein Bruder, der fordert aber auch beschützt.
Nutze kurze, prägnante Sätze. Sei authentisch, nie künstlich.

USER SAGT: "${text}"

Antworte als ARES - direkt, präzise, motivierend.`;

    console.log(`[ARES-PHASE1-${traceId}] Prompt built, length: ${systemPrompt.length}`);

    // 6) Generate response
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: systemPrompt }],
        max_tokens: 200,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "ARES antwortet nicht. Versuche es nochmal.";

    console.log(`[ARES-RESPONSE] Generated response length: ${responseText.length}`);
    console.log(`[ARES-PHASE1-${traceId}] Response generated successfully`);

    // 7) Update trace with final debug data
    const ragChunks: any[] = [];
    const userContext = { uid: user.id };
    const model = 'gpt-4o-mini';

    const llmInput = { messages: [{ role: 'user', content: systemPrompt }] };
    const llmOutput = { response: responseText, usage: data.usage };

    await supabase.from('orchestrator_traces')
      .update({
        status: 'complete',
        persona,
        rag_chunks: ragChunks,
        user_context: userContext,
        system_prompt: systemPrompt,
        model,
        llm_input: llmInput,
        llm_output: llmOutput
      })
      .eq('id', traceId)
      .catch(err => console.log(`[TRACE] Update failed:`, err));

    // 8) Return response with trace_id
    return new Response(JSON.stringify({
      kind: "message",
      text: responseText,
      trace_id: traceId,
      meta: {
        version: "v1",
        model: 'gpt-4o-mini'
      }
    }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json", "X-Trace-Id": traceId }
    });

  } catch (error) {
    console.error(`[ARES-PHASE1-${traceId}] Error:`, error);

    // Update trace with error status
    await supabase.from('orchestrator_traces')
      .update({
        status: 'error',
        meta: { 
          source: 'coach-orchestrator-enhanced', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      })
      .eq('id', traceId)
      .catch(() => {});

    const fallbackReply = {
      kind: "message",
      text: "ARES System: Unerwarteter Fehler aufgetreten. Versuche es nochmal.",
      trace_id: traceId
    };
    
    return new Response(JSON.stringify(fallbackReply), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json", "X-Trace-Id": traceId }
    });
  }
});