
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
  user_context: any;
  tool_calls: any;
}>;

// Helper to safely truncate large strings for DB storage
function truncateForDb(value: any, maxLength: number = 50000): any {
  if (typeof value === 'string' && value.length > maxLength) {
    return value.slice(0, maxLength) + '...[truncated]';
  }
  if (typeof value === 'object' && value !== null) {
    const str = JSON.stringify(value);
    if (str.length > maxLength) {
      return JSON.parse(str.slice(0, maxLength - 100) + '"}');
    }
  }
  return value;
}

export async function traceStart(trace_id: string, user_id: string, coach_id: string, init?: Partial<{ input_text: string | null; images: any }>) {
  try {
    const { error } = await admin.from('ares_traces').insert({
      trace_id, 
      user_id, 
      coach_id, 
      status: 'received',
      input_text: init?.input_text ?? null,
      images: init?.images ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    if (error) {
      console.error(`[TRACE] traceStart failed for ${trace_id}:`, error.message, error.details);
    } else {
      console.log(`[TRACE] Started trace ${trace_id} for user ${user_id}`);
    }
  } catch (err) {
    console.error(`[TRACE] traceStart exception for ${trace_id}:`, err);
  }
}

export async function traceUpdate(trace_id: string, patch: TracePatch) {
  try {
    // Truncate potentially large fields to prevent DB errors
    const safePatch: any = { ...patch, updated_at: new Date().toISOString() };
    
    if (safePatch.system_prompt) {
      safePatch.system_prompt = truncateForDb(safePatch.system_prompt, 30000);
    }
    if (safePatch.complete_prompt) {
      safePatch.complete_prompt = truncateForDb(safePatch.complete_prompt, 50000);
    }
    if (safePatch.llm_output) {
      safePatch.llm_output = truncateForDb(safePatch.llm_output, 30000);
    }
    if (safePatch.context) {
      safePatch.user_context = truncateForDb(safePatch.context, 20000);
      delete safePatch.context; // Store as user_context column
    }

    const { error } = await admin.from('ares_traces')
      .update(safePatch)
      .eq('trace_id', trace_id);
      
    if (error) {
      console.error(`[TRACE] traceUpdate failed for ${trace_id}:`, error.message, error.details);
    } else {
      console.log(`[TRACE] Updated trace ${trace_id}: status=${patch.status || 'unchanged'}`);
    }
  } catch (err) {
    console.error(`[TRACE] traceUpdate exception for ${trace_id}:`, err);
  }
}

export async function traceFail(trace_id: string, error: any, duration_ms?: number) {
  console.log(`[TRACE] Marking trace ${trace_id} as failed (${duration_ms}ms):`, error?.message || error);
  await traceUpdate(trace_id, { status: 'failed', error, duration_ms: duration_ms ?? null });
}

export async function traceDone(trace_id: string, duration_ms?: number) {
  console.log(`[TRACE] Marking trace ${trace_id} as completed (${duration_ms}ms)`);
  await traceUpdate(trace_id, { status: 'completed', duration_ms: duration_ms ?? null });
}
