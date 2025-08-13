// src/hooks/useOrchestrator.ts
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { intentFromText } from '@/intake/intent';

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

export type SupplementItem = {
  name: string;
  canonical: string | null;
  dose: string | null;
  confidence: number;
  notes?: string | null;
  image_url?: string | null;
};

export type SupplementProposal = {
  items: SupplementItem[];
  topPickIdx: number;
  imageUrl?: string | null;
};

export type LastProposal =
  | { kind: 'supplement'; data: any }
  | { kind: 'meal'; data: any }
  | { kind: 'training'; data: any };

export type CoachEventContext = {
  source?: 'chat' | 'quick-card' | 'gehirn';
  coachMode?: string;
  coachId?: string;
  followup?: boolean;
  last_proposal?: LastProposal;
  image_type?: 'exercise' | 'food' | 'supplement' | 'body';
};

export type OrchestratorReply =
  | { kind: 'message'; text: string; end?: boolean; traceId?: string; meta?: any }
  | { kind: 'reflect'; text: string; traceId?: string; meta?: any }
  | { kind: 'choice_suggest'; prompt: string; options: string[]; traceId?: string; meta?: any }
  | { kind: 'clarify'; prompt: string; options: string[]; traceId?: string }
  | { kind: 'confirm_save_meal'; prompt: string; proposal: MealProposal; traceId?: string }
  | { kind: 'confirm_save_supplement'; prompt: string; proposal: SupplementProposal; traceId?: string };

export type CoachEvent =
  | { type: 'TEXT'; text: string; clientEventId?: string; context?: CoachEventContext }
  | { type: 'IMAGE'; url: string; clientEventId?: string; context?: CoachEventContext }
  | { type: 'END'; clientEventId?: string; context?: CoachEventContext };

function normalizeReply(raw: any): OrchestratorReply {
  if (!raw) return { kind: 'message', text: 'Kurz hake ich – versuch’s bitte nochmal. (Netzwerk/Timeout)' };
  const k = typeof raw?.kind === 'string' ? raw.kind.toLowerCase() : '';
  if (k === 'message' || k === 'reflect' || k === 'choice_suggest' || k === 'clarify' || k === 'confirm_save_meal' || k === 'confirm_save_supplement') return raw as OrchestratorReply;
  const text = raw.reply ?? raw.content ?? (typeof raw === 'string' ? raw : 'OK');
  return { kind: 'message', text, end: raw.end, traceId: raw.traceId };
}

export function useOrchestrator() {
  const { isEnabled } = useFeatureFlags();
  const legacyEnabled = false;
  
  // Client event ID management
  const currentClientEventId = useRef<string | null>(null);
  
  function beginUserAction(): string {
    const clientEventId = crypto.randomUUID();
    currentClientEventId.current = clientEventId;
    return clientEventId;
  }
  
  function endUserAction() {
    currentClientEventId.current = null;
  }
  
  async function sendEvent(userId: string, ev: CoachEvent, traceId?: string): Promise<OrchestratorReply> {
    // Ensure we have a clientEventId for proper idempotency
    if (!ev.clientEventId) {
      ev.clientEventId = currentClientEventId.current || beginUserAction();
    }
    
    const headers: Record<string, string> = {
      'x-trace-id': traceId ?? crypto.randomUUID(),
      'x-chat-mode': ev.context?.coachMode ?? '',
      'x-source': ev.context?.source ?? 'chat',
    };

    const payload = { userId, event: ev };

    // Local intent detection (feature-flagged)
    let localIntent: any = null;
    if (ev.type === 'TEXT' && isEnabled('local_intent_enabled')) {
      localIntent = intentFromText(ev.text);
      headers['x-intent-domain'] = (localIntent.domain ?? '') as string;
      headers['x-intent-action'] = (localIntent.action ?? '') as string;
      headers['x-intent-conf'] = String(localIntent.conf ?? '');
      try {
        await supabase.rpc('log_trace_event', {
          p_trace_id: headers['x-trace-id'],
          p_stage: 'intent_from_text',
          p_data: { intent: localIntent }
        });
      } catch (_) { /* non-fatal */ }
    }

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
      // Emit early client ack so UI feels responsive
      try {
        await supabase.rpc('log_trace_event', {
          p_trace_id: headers['x-trace-id'],
          p_stage: 'client_ack',
          p_data: { source: headers['x-source'] }
        });
      } catch (_) { /* non-fatal */ }
      // Try enhanced with timeout, retry once on error/timeout
      try {
        const response = await supabase.functions.invoke('coach-orchestrator-enhanced', {
          body: payload,
          headers,
        });
        
        // Handle potential 409 in_progress status through response data
        if (response.data?.reason === 'in_progress') {
          // Still processing - show typing or do nothing
          return { kind: 'message', text: '...' };
        }
        
        if (response.error) throw response.error;
        endUserAction();
        return normalizeReply(response.data);
      } catch (e1) {
        if (e1 instanceof Error && e1.message === 'timeout') {
          console.warn('orchestrator TIMEOUT', { cutoffMs: 30000 });
          try {
            await supabase.rpc('log_trace_event', {
              p_trace_id: headers['x-trace-id'],
              p_stage: 'client_timeout',
              p_data: { cutoffMs: 30000 }
            });
          } catch (_) { /* non-fatal */ }
        }
        // mark retry so the server can log it in traces
        headers['x-retry'] = '1';
        const { data, error } = await supabase.functions.invoke('coach-orchestrator-enhanced', {
          body: payload,
          headers,
        });
        if (error) throw error;
        endUserAction();
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

  return { sendEvent, beginUserAction, endUserAction };
}
