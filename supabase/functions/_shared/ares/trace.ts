
import { admin } from './supabase.ts';

export type TracePatch = Partial<{
  status: string;
  persona: any;
  context: any;
  rag_sources: any;
  system_prompt: string;
  complete_prompt: string;
  llm_input: any;
  llm_output: any;
  error: any;
  input_text: string | null;
  images: any;
  duration_ms: number | null;
}>;

export async function traceStart(trace_id: string, user_id: string, coach_id: string, init?: Partial<{ input_text: string | null; images: any }>) {
  await admin.from('ares_traces').insert({
    trace_id, user_id, coach_id, status: 'received',
    input_text: init?.input_text ?? null,
    images: init?.images ?? null
  });
}

export async function traceUpdate(trace_id: string, patch: TracePatch) {
  await admin.from('ares_traces')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('trace_id', trace_id);
}

export async function traceFail(trace_id: string, error: any, duration_ms?: number) {
  await traceUpdate(trace_id, { status: 'failed', error, duration_ms: duration_ms ?? null });
}

export async function traceDone(trace_id: string, duration_ms?: number) {
  await traceUpdate(trace_id, { status: 'completed', duration_ms: duration_ms ?? null });
}
