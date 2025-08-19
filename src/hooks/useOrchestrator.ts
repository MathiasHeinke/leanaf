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

    try {
      // Use the improved orchestrator client with enhanced error handling
      const response = await supabase.functions.invoke('coach-orchestrator-enhanced', {
        body: payload,
        headers,
      });
      
      // Handle structured response errors with detailed status extraction
      if (response.error) {
        const errorText = response.error?.message || String(response.error);
        // @ts-ignore - accessing internal error structure for better debugging
        const status = response.error?.context?.response?.status;
        
        console.warn('ARES Orchestrator error:', {
          status,
          error: errorText,
          traceId: headers['x-trace-id'],
          coachId,
          response: response
        });
        
        // Extract structured error info if available from server
        if (response.data?.code) {
          const error = new Error(response.data.message || errorText);
          (error as any).code = response.data.code;
          (error as any).traceId = response.data.traceId;
          (error as any).status = status;
          throw error;
        }
        
        // Enhance error with status for better categorization
        const enhancedError = new Error(errorText);
        (enhancedError as any).status = status;
        (enhancedError as any).traceId = headers['x-trace-id'];
        throw enhancedError;
      }
      
      // Handle potential 409 in_progress status through response data
      if (response.data?.reason === 'in_progress') {
        return { kind: 'message', text: '...' };
      }
      
      endUserAction();
      return normalizeReply(response.data);
      
    } catch (e) {
      if (legacyEnabled) {
        try {
          console.info('Attempting legacy fallback for:', coachId);
          const { data } = await supabase.functions.invoke('coach-orchestrator', {
            body: payload,
            headers,
          });
          return normalizeReply(data);
        } catch (e2) {
          console.warn('Legacy fallback also failed:', e2);
        }
      }
      
      // Enhanced error message based on error type and HTTP status
      const errorMsg = (e as any)?.message || String(e);
      const traceId = (e as any)?.traceId || headers['x-trace-id'];
      const status = (e as any)?.status;
      const code = (e as any)?.code;
      
      console.error('Final orchestrator error:', { 
        status, 
        code, 
        errorMsg, 
        traceId,
        coachId 
      });
      
      // Categorize errors by HTTP status for precise user messaging
      if (status === 401 || errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        return { kind: 'message', text: 'Bitte erneut anmelden und dann nochmal versuchen.', traceId };
      }
      if (status === 403 || errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
        return { kind: 'message', text: 'Zugriff verweigert. Bitte Admin kontaktieren.', traceId };
      }
      if (status === 404 || errorMsg.includes('404') || errorMsg.includes('Not Found')) {
        return { kind: 'message', text: 'ARES Service nicht verfügbar. Bitte später versuchen.', traceId };
      }
      if (status === 422 || errorMsg.includes('422') || code === 'NO_INPUT') {
        return { kind: 'message', text: 'Bitte Text oder Bild senden.', traceId };
      }
      if (code === 'CONFIG_MISSING' || errorMsg.includes('CONFIG_MISSING')) {
        return { kind: 'message', text: 'Server-Konfigurationsfehler. Bitte Admin kontaktieren.', traceId };
      }
      if (code === 'MISSING_EVENT' || errorMsg.includes('MISSING_EVENT')) {
        return { kind: 'message', text: 'Ungültiges Nachrichtenformat. Bitte nochmal versuchen.', traceId };
      }
      if (status >= 500 || errorMsg.includes('500') || errorMsg.includes('Internal')) {
        return { kind: 'message', text: 'ARES Server-Fehler. Bitte später versuchen.', traceId };
      }
      
      return { 
        kind: 'message', 
        text: `Hey! Ich bin kurz beschäftigt – versuch's bitte nochmal. ${status ? `(HTTP ${status})` : '(Netzwerk-Timeout)'}`,
        traceId
      };
    }
  }

  return { sendEvent, beginUserAction, endUserAction };
}