import { nanoid } from 'nanoid';
import { mark } from '@/lib/metrics';

export function newTraceId(): string {
  return `t_${nanoid(10)}`;
}

export async function trace(
  traceId: string,
  stage: string,
  payload: Record<string, any> = {}
): Promise<void> {
  // Log locally first
  await mark('trace', { traceId, stage, ...payload });
  
  // Fire-and-forget to Supabase - use full URL since this runs in edge functions
  try {
    await fetch('https://gzczjscctgyxjyodhnhk.supabase.co/rest/v1/coach_traces', {
      method: 'POST',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc0Nzk4MiwiZXhwIjoyMDY4MzIzOTgyfQ.c1pPZNMFb9TK8x8sfzcnCMgpJaKcVYRBsrBYGHqfvMU',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc0Nzk4MiwiZXhwIjoyMDY4MzIzOTgyfQ.c1pPZNMFb9TK8x8sfzcnCMgpJaKcVYRBsrBYGHqfvMU',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trace_id: traceId,
        ts: new Date().toISOString(),
        stage,
        data: payload
      })
    });
  } catch (error) {
    // Silent fail - tracing should never break the main flow
    console.warn('Trace logging failed:', error);
  }
}