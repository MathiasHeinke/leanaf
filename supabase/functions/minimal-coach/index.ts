import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, logTraceEvent, softTruncate } from "../telemetry.ts";

const HANDLER = 'minimal-coach';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const traceId = req.headers.get('x-trace-id') || crypto.randomUUID();
  const authorization = req.headers.get('Authorization') ?? '';
  const source = req.headers.get('x-source') ?? 'function';
  const chatMode = req.headers.get('x-chat-mode') ?? '';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } } }
  );

  const ok = (body: any, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const t0 = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    await logTraceEvent(supabase, {
      traceId, userId, coachId: null,
      stage: 'received', handler: HANDLER, status: 'RUNNING',
      payload: softTruncate({ input: { hasMessage: Boolean(body?.message), length: (body?.message||'').length } }, 8000)
    });

    // ---- tool_exec ----
    const execStart = Date.now();
    await logTraceEvent(supabase, {
      traceId, userId, coachId: null,
      stage: 'tool_exec', handler: HANDLER, status: 'RUNNING'
    });

    // Business logic (simple echo)
    const response = {
      response: `Hallo! Ich habe deine Nachricht "${body.message || 'test'}" erhalten. Ich bin derzeit im Test-Modus und kann noch keine echten AI-Antworten generieren, aber die Verbindung funktioniert! 🤖`,
      timestamp: new Date().toISOString(),
      success: true
    };

    const latencyMs = Date.now() - execStart;

    // ---- tool_result ----
    await logTraceEvent(supabase, {
      traceId, userId, coachId: null,
      stage: 'tool_result', handler: HANDLER, status: 'OK',
      latencyMs, payload: softTruncate({ output: { success: true } }, 8000)
    });

    // ---- reply_send ----
    await logTraceEvent(supabase, {
      traceId, userId, coachId: null,
      stage: 'reply_send', handler: HANDLER, status: 'OK',
      latencyMs: Date.now() - t0
    });

    return ok(response);
  } catch (error: any) {
    await logTraceEvent(supabase, {
      traceId, userId: null, coachId: null,
      stage: 'error', handler: HANDLER, status: 'ERROR',
      latencyMs: Date.now() - t0, errorMessage: String(error)
    });

    return ok({ error: `Fehler: ${error?.message ?? 'Unexpected error'}`, success: false });
  }
});