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
  confidence?: number;
  meal_type?: string;
  analysis_notes?: string;
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
  source?: 'chat' | 'momentum' | 'quick-card' | 'gehirn';
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
  | { type: 'IMAGE'; url: string; text?: string; clientEventId?: string; context?: CoachEventContext }
  | { type: 'END'; clientEventId?: string; context?: CoachEventContext };

function normalizeReply(raw: any): OrchestratorReply {
  if (!raw) return { kind: 'message', text: 'Kurz hake ich – versuch\'s bitte nochmal. (Netzwerk/Timeout)' };
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
  
  async function sendEvent(userId: string, ev: CoachEvent, traceId?: string, context?: CoachEventContext): Promise<OrchestratorReply> {
    // Ensure we have a clientEventId for proper idempotency
    if (!ev.clientEventId) {
      ev.clientEventId = currentClientEventId.current || beginUserAction();
    }
    
    // Merge context from parameter and event context
    const finalContext = { ...ev.context, ...context };
    const coachId = finalContext?.coachId || 'lucy';
    const headers: Record<string, string> = {
      'x-trace-id': traceId ?? crypto.randomUUID(),
      'x-chat-mode': finalContext?.coachMode ?? '',
      'x-source': finalContext?.source ?? 'chat',
      'x-ares-v2': '1', // Enable ARES v2 by default
    };

    const payload = { userId, event: ev, context: finalContext };

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

    const withTimeout = <T,>(p: Promise<T>, ms = 15000) =>
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
          return { kind: 'message', text: '...' };
        }
        
        // Enhanced error handling with trace ID extraction
        if (response.error) {
          const errorText = response.error?.message || String(response.error);
          const isServerError = errorText.includes('500') || errorText.includes('Internal');
          const traceFromHeader = response.headers?.['x-trace-id'];
          
          console.warn('Enhanced orchestrator error:', {
            error: errorText,
            traceId: traceFromHeader,
            statusCode: response.status
          });
          
          // Extract structured error info if available
          if (response.data?.code) {
            const error = new Error(response.data.error || errorText);
            (error as any).code = response.data.code;
            (error as any).traceId = response.data.traceId || traceFromHeader;
            throw error;
          }
          
          throw response.error;
        }
        
        endUserAction();
        return normalizeReply(response.data);
        
      } catch (e1) {
        console.warn('Enhanced orchestrator attempt 1 failed:', e1);
        
        if (e1 instanceof Error && e1.message === 'timeout') {
          try {
            await supabase.rpc('log_trace_event', {
              p_trace_id: headers['x-trace-id'],
              p_stage: 'client_timeout',
              p_data: { cutoffMs: 15000 }
            });
          } catch (_) { /* non-fatal */ }
        }
        
        // Retry with enhanced error handling
        headers['x-retry'] = '1';
        try {
          const { data, error } = await supabase.functions.invoke('coach-orchestrator-enhanced', {
            body: payload,
            headers,
          });
          
          if (error) {
            // Check if this is a server error that should trigger fallback
            const errorText = error?.message || String(error);
            const isServerError = errorText.includes('500') || errorText.includes('502') || errorText.includes('503');
            
            if (isServerError && legacyEnabled) {
              console.info('Enhanced orchestrator server error, trying legacy fallback...');
              throw error; // This will trigger the legacy fallback below
            }
            
            throw error;
          }
          
          endUserAction();
          return normalizeReply(data);
        } catch (e2) {
          // If retry also fails, try legacy if enabled
          if (legacyEnabled) {
            console.info('Enhanced orchestrator retry failed, trying legacy fallback...');
            throw e2; // This will trigger the legacy fallback below
          }
          throw e2;
        }
      }
    } catch (e) {
      if (legacyEnabled) {
        try {
          console.info('Attempting legacy fallback for:', coachId);
          const data = await withTimeout(invokeLegacy(), 7000);
          return normalizeReply(data);
        } catch (e2) {
          console.warn('Legacy fallback also failed:', e2);
        }
      }
      
      // Enhanced error message based on error type
      const errorMsg = (e as any)?.message || String(e);
      const traceId = (e as any)?.traceId || headers['x-trace-id'];
      
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        return { kind: 'message', text: 'Bitte erneut anmelden und dann nochmal versuchen.' };
      }
      if (errorMsg.includes('422') || errorMsg.includes('NO_INPUT')) {
        return { kind: 'message', text: 'Bitte Text oder Bild senden.' };
      }
      if (errorMsg.includes('CONFIG_MISSING')) {
        return { kind: 'message', text: 'Server-Konfigurationsfehler. Bitte Admin kontaktieren.' };
      }
      
      return { 
        kind: 'message', 
        text: `Hey! Ich bin kurz beschäftigt – versuch's bitte nochmal. (${coachId === 'ares' ? 'ARES System wird geladen...' : 'Netzwerk/Timeout'})`,
        traceId
      };
    }
  }

  return { sendEvent, beginUserAction, endUserAction };
}