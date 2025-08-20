import { createClient } from '@supabase/supabase-js';
import { ARESClientTrace } from '../trace/ARESClientTrace';
import type { ARESEvent, ARESContext, ARESReply } from './ARESPayload';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export class ARESOrchestratorClient {
  private trace = new ARESClientTrace();

  async send(event: ARESEvent, context: ARESContext): Promise<ARESReply> {
    const { data, error } = await supabase.functions.invoke('coach-orchestrator-enhanced', {
      body: { event, context, coachId: 'ares' }
    } as any);

    // Supabase Functions Adapter hat kein echtes Response-Objekt → Headers separat:
    try {
      // @ts-ignore – Supabase packt response headers unter "data?.__headers" wenn konfiguriert
      this.trace.setFromResponse({ headers: data?.__headers });
    } catch {}

    if (error) {
      const traceId = this.trace.id ?? data?.traceId ?? null;
      throw Object.assign(new Error(error?.message || 'ARES edge error'), { traceId, code: error?.code });
    }
    return { ...(data as any), traceId: this.trace.id ?? data?.traceId ?? null };
  }
}