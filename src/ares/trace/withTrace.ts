import { ARES_EMIT } from './traceEmitter';
import { supabase } from '@/integrations/supabase/client';

// Enhanced trace wrapper with mandatory tracing for all ARES operations
export async function withTrace<T>(
  traceId: string | null,
  stage: string, 
  fn: () => Promise<T>, 
  detail?: any
): Promise<T> {
  const finalTraceId = traceId || `tmp_${Date.now()}`;
  
  try {
    // Emit trace start
    ARES_EMIT.push({ 
      component: 'ARES:withTrace', 
      event: `${stage}_start`, 
      traceId: finalTraceId,
      meta: { stage, detail }
    });

    // Log to ares_trace_steps via edge function
    await logTraceStep(finalTraceId, `${stage}_start`, detail ?? null);
    
    const result = await fn();
    
    // Emit trace success
    ARES_EMIT.push({ 
      component: 'ARES:withTrace', 
      event: `${stage}_ok`, 
      traceId: finalTraceId,
      meta: { stage }
    });

    await logTraceStep(finalTraceId, `${stage}_ok`, null);
    
    return result;
  } catch (error) {
    // Emit trace failure
    ARES_EMIT.push({ 
      component: 'ARES:withTrace', 
      event: `${stage}_fail`, 
      traceId: finalTraceId,
      meta: { stage, error: (error as Error)?.message }
    });

    await logTraceStep(finalTraceId, `${stage}_fail`, { 
      message: (error as Error)?.message,
      stack: (error as Error)?.stack?.substring(0, 500)
    });
    
    throw error;
  }
}

// Helper to log trace steps to database
async function logTraceStep(traceId: string, stage: string, data: any) {
  try {
    await supabase.functions.invoke('ares-log-trace-step', {
      body: { traceId, stage, data }
    });
  } catch (err) {
    // Trace logging should never break main flow
    console.debug('[ARES-Trace] Failed to log step:', err);
  }
}

// Re-export existing hooks with enhanced tracing
export { useComponentTrace, useActionTrace } from './withTrace';