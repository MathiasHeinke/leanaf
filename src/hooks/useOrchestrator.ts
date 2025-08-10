// src/hooks/useOrchestrator.ts
import { supabase } from '@/integrations/supabase/client';

export type CoachEvent =
  | { type: 'TEXT'; text: string; clientEventId: string; context?: { source: 'chat'|'momentum'|'quick-card'; coachMode?: 'training'|'nutrition'|'general' } }
  | { type: 'IMAGE'; url: string; clientEventId: string; context?: { source: 'chat'|'momentum'|'quick-card'; coachMode?: 'training'|'nutrition'|'general' } }
  | { type: 'END'; clientEventId: string; context?: { source: 'chat'|'momentum'|'quick-card'; coachMode?: 'training'|'nutrition'|'general' } };

export function useOrchestrator() {
  async function sendEvent(userId: string, ev: CoachEvent, traceId?: string) {
    const headers: Record<string, string> = {
      'x-trace-id': traceId ?? crypto.randomUUID(),
      'x-chat-mode': ev.context?.coachMode ?? '',
      'x-source': ev.context?.source ?? 'chat',
    };

    try {
      const { data, error } = await supabase.functions.invoke('coach-orchestrator-enhanced', {
        body: { userId, event: ev },
        headers,
      });
      if (error) throw error;
      return data as { reply?: string; content?: string; state?: any; end?: boolean; flags?: Record<string, any>; traceId?: string };
    } catch (e) {
      // Legacy fallback
      try {
        const { data } = await supabase.functions.invoke('coach-orchestrator', {
          body: { userId, event: ev },
          headers,
        });
        return data;
      } catch (e2) {
        return { reply: 'Kurz hake ich – versuch’s bitte nochmal. (Netzwerk/Timeout)' };
      }
    }
  }

  return { sendEvent };
}
