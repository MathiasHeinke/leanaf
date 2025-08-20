import { ARESClientTrace } from '../trace/ARESClientTrace';
import type { ARESEvent, ARESContext, ARESReply } from './ARESPayload';

export class ARESOrchestratorClient {
  private trace = new ARESClientTrace();

  async send(event: ARESEvent, context: ARESContext): Promise<ARESReply> {
    const response = await fetch(`https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/coach-orchestrator-enhanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ event, context, coachId: 'ares' })
    });

    // Extract trace ID from response headers
    this.trace.setFromResponse(response);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const traceId = this.trace.id ?? errorData?.traceId ?? null;
      throw Object.assign(new Error(errorData?.message || 'ARES edge error'), { 
        traceId, 
        status: response.status,
        code: errorData?.code 
      });
    }

    const data = await response.json();
    return { ...data, traceId: this.trace.id ?? data?.traceId ?? null };
  }
}