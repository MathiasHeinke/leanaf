// src/hooks/useOrchestrator.ts
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

export type MealProposal = {
  title?: string;
  items?: Array<{ name: string; qty?: number; unit?: string; calories?: number; protein?: number; carbs?: number; fats?: number }>;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  imageUrl?: string;
  notes?: string;
};

export type OrchestratorReply =
  | { kind: 'message'; text: string; end?: boolean; traceId?: string }
  | { kind: 'clarify'; prompt: string; options: [string, string]; traceId?: string }
  | { kind: 'confirm_save_meal'; prompt: string; proposal: MealProposal; traceId?: string };

export type CoachEvent =
  | { type: 'TEXT'; text: string; clientEventId: string; context?: { source: 'chat'|'momentum'|'quick-card'; coachMode?: 'training'|'nutrition'|'general' } }
  | { type: 'IMAGE'; url: string; clientEventId: string; context?: { source: 'chat'|'momentum'|'quick-card'; coachMode?: 'training'|'nutrition'|'general'; image_type?: 'exercise'|'food'|'supplement'|'body' } }
  | { type: 'END'; clientEventId: string; context?: { source: 'chat'|'momentum'|'quick-card'; coachMode?: 'training'|'nutrition'|'general' } };

function normalizeReply(raw: any): OrchestratorReply {
  if (!raw) return { kind: 'message', text: 'Kurz hake ich – versuch’s bitte nochmal. (Netzwerk/Timeout)' };
  const k = typeof raw?.kind === 'string' ? raw.kind.toLowerCase() : '';
  if (k === 'message' || k === 'clarify' || k === 'confirm_save_meal') return raw as OrchestratorReply;
  const text = raw.reply ?? raw.content ?? (typeof raw === 'string' ? raw : 'OK');
  return { kind: 'message', text, end: raw.end, traceId: raw.traceId };
}

export function useOrchestrator() {
  const { isEnabled } = useFeatureFlags();
  const legacyEnabled = isEnabled('legacy_fallback_enabled');
  async function sendEvent(userId: string, ev: CoachEvent, traceId?: string): Promise<OrchestratorReply> {
    const headers: Record<string, string> = {
      'x-trace-id': traceId ?? crypto.randomUUID(),
      'x-chat-mode': ev.context?.coachMode ?? '',
      'x-source': ev.context?.source ?? 'chat',
    };

    const payload = { userId, event: ev };

    const invokeEnhanced = async () => {
      const { data, error } = await supabase.functions.invoke('coach-orchestrator-enhanced', {
        body: payload,
        headers,
      });
      if (error) throw error;
      return data;
    };

    const invokeLegacy = async () => {
      const { data } = await supabase.functions.invoke('coach-orchestrator', {
        body: payload,
        headers,
      });
      return data;
    };

    const withTimeout = <T,>(p: Promise<T>, ms = 7000) =>
      Promise.race<T>([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)) as Promise<T>,
      ]);

    try {
      // Try enhanced with timeout, retry once on error/timeout
      try {
        const data = await withTimeout(invokeEnhanced(), 25000);
        return normalizeReply(data);
      } catch (e1) {
        if (e1 instanceof Error && e1.message === 'timeout') {
          console.warn('orchestrator TIMEOUT', { cutoffMs: 25000 });
          try {
            await supabase.rpc('log_trace_event', {
              p_trace_id: headers['x-trace-id'],
              p_stage: 'client_timeout',
              p_data: { cutoffMs: 25000 }
            });
          } catch (_) { /* non-fatal */ }
        }
        // mark retry so the server can log it in traces
        headers['x-retry'] = '1';
        const data = await withTimeout(invokeEnhanced(), 10000);
        return normalizeReply(data);
      }
    } catch (e) {
      if (legacyEnabled) {
        try {
          const data = await withTimeout(invokeLegacy(), 7000);
          return normalizeReply(data);
        } catch (e2) { /* fall through */ }
      } else {
        console.info('Legacy fallback disabled via flag; returning friendly error.');
      }
      return { kind: 'message', text: 'Kurz hake ich – versuch’s bitte nochmal. (Netzwerk/Timeout)' };
    }
  }

  return { sendEvent };
}
