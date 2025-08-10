// supabase/functions/telemetry.ts
// Shared telemetry helper for edge functions (no secrets; safe payload logging)

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trace-id, x-source, x-chat-mode',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export type TraceStage =
  | 'received'
  | 'route_decision'
  | 'clarify_reply'
  | 'tool_exec'
  | 'tool_result'
  | 'fallback_llm_only'
  | 'reply_send'
  | 'error';

export type TraceStatus = 'OK' | 'RUNNING' | 'ERROR';

export type TraceEntry = {
  traceId: string;
  userId?: string | null;
  coachId?: string | null;
  stage: TraceStage;
  handler: string;
  status: TraceStatus;
  latencyMs?: number | null;
  payload?: unknown; // make sure this is already redacted from callers
  errorMessage?: string | null;
};

export async function logTraceEvent(supabase: any, e: TraceEntry) {
  try {
    const payload_json = sanitizePayload(e.payload);
    const { error } = await supabase.from('orchestrator_traces').insert({
      trace_id: e.traceId,
      user_id: e.userId ?? null,
      coach_id: e.coachId ?? null,
      stage: e.stage,
      handler_name: e.handler,
      status: e.status,
      latency_ms: e.latencyMs ?? null,
      payload_json,
      error_message: e.errorMessage ?? null,
    });
    if (error) console.error('logTraceEvent insert error:', error);
  } catch (err) {
    console.error('logTraceEvent failed:', err);
  }
}

function sanitizePayload(payload: unknown): any {
  try {
    // Deep copy to avoid proxies / circulars
    const p = JSON.parse(JSON.stringify(payload ?? null));
    if (p && typeof p === 'object') {
      redact(p, ['authorization', 'apikey', 'openai_api_key', 'cookies', 'password', 'token', 'secret']);
      truncateApprox(p, 3000); // ~3KB cap
    }
    return p;
  } catch {
    return null;
  }
}

function redact(obj: any, keys: string[]) {
  if (!obj || typeof obj !== 'object') return;
  for (const k of Object.keys(obj)) {
    const lower = k.toLowerCase();
    if (keys.includes(lower)) {
      obj[k] = '***REDACTED***';
    } else if (obj[k] && typeof obj[k] === 'object') {
      redact(obj[k], keys);
    }
  }
}

function truncateApprox(obj: any, maxLen: number) {
  try {
    const s = JSON.stringify(obj);
    if (s.length > maxLen) {
      obj.__truncated__ = true;
      // lightweight truncation marker without mutating structure too much
    }
  } catch {
    // ignore
  }
}

export function softTruncate(obj: any, maxLen: number = 8000) {
  try {
    const s = JSON.stringify(obj ?? null);
    if (!s) return null;
    if (s.length > maxLen) {
      return { __truncated__: true };
    }
    return obj;
  } catch {
    return { __truncated__: true };
  }
}
