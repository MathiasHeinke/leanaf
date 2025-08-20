
import { ARESClientTrace } from '../trace/ARESClientTrace';
import type { ARESEvent, ARESContext, ARESReply } from './ARESPayload';
import { supabase } from '@/integrations/supabase/client';
import { withTrace } from '../trace/withTrace';

export class ARESOrchestratorClient {
  private trace = new ARESClientTrace();

  async send(event: ARESEvent, context: ARESContext): Promise<ARESReply> {
    return withTrace(null, 'orchestrator_send', async () => {
      const { data, error } = await supabase.functions.invoke('coach-orchestrator-enhanced', {
        body: { event, context, coachId: 'ares' }
      } as any);

      if (error) {
        // Try to propagate traceId if present in data payload
        const traceId = (data as any)?.traceId ?? null;
        throw Object.assign(new Error(error?.message || 'ARES edge error'), { traceId, code: (error as any)?.code, status: (error as any)?.status });
      }

      const payload = data as any;
      // Prefer JSON body traceId (headers not available via invoke)
      const traceId = payload?.traceId ?? null;
      if (traceId && (this.trace as any)?.setId) {
        try { (this.trace as any).setId(traceId); } catch {}
      }

      return { ...payload, traceId };
    }, { event: event.type, context_keys: Object.keys(context) });
  }
}
