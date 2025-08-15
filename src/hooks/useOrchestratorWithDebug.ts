import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { newTraceId } from '@/utils/trace';
import type { CoachEvent, OrchestratorReply, CoachEventContext } from '@/hooks/useOrchestrator';
import type { DebugStep } from '@/components/debug/UserChatDebugger';

function normalizeReply(raw: any): OrchestratorReply {
  if (!raw) return { kind: 'message', text: 'Kurz hake ich – versuch\'s bitte nochmal. (Netzwerk/Timeout)' };
  const k = typeof raw?.kind === 'string' ? raw.kind.toLowerCase() : '';
  if (k === 'message' || k === 'reflect' || k === 'choice_suggest' || k === 'clarify' || k === 'confirm_save_meal' || k === 'confirm_save_supplement') return raw as OrchestratorReply;
  const text = raw.reply ?? raw.content ?? (typeof raw === 'string' ? raw : 'OK');
  return { kind: 'message', text, traceId: raw?.traceId, meta: raw };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      val => { clearTimeout(timer); resolve(val); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}

type DebugCallbacks = {
  addStep: (title: string, details?: string) => string;
  completeStep: (id: string, details?: string) => void;
  errorStep: (id: string, error: string) => void;
};

export function useOrchestratorWithDebug(debugCallbacks?: DebugCallbacks) {
  const currentClientEventId = useRef<string | null>(null);

  function beginUserAction(): string {
    const id = Date.now().toString();
    currentClientEventId.current = id;
    return id;
  }

  function endUserAction() {
    currentClientEventId.current = null;
  }

  async function sendEvent(
    userId: string,
    ev: CoachEvent,
    traceId?: string,
    context?: CoachEventContext
  ): Promise<OrchestratorReply> {
    const trace = traceId || newTraceId();
    const clientEventId = currentClientEventId.current || beginUserAction();
    
    // Ensure clientEventId is in the event
    if (!ev.clientEventId) {
      ev.clientEventId = clientEventId;
    }
    
    // Debug steps
    let messageStep: string | undefined;
    let routeStep: string | undefined;
    let toolStep: string | undefined;
    let replyStep: string | undefined;

    try {
      // Step 1: Message received
      if (debugCallbacks) {
        messageStep = debugCallbacks.addStep(
          '📨 Nachricht empfangen',
          `Nachricht: "${ev.type === 'TEXT' ? ev.text?.slice(0, 50) : ev.type}..."`
        );
      }

      // Merge context from event and parameter
      const finalContext = { ...ev.context, ...context };

      const payload = {
        userId,
        event: ev,
        traceId: trace,
        clientEventId,
        context: finalContext || {},
      };

      const headers: Record<string, string> = {
        'x-trace-id': trace,
        'x-source': ev.context?.source || 'chat',
        'x-client-event-id': clientEventId,
      };

      if (ev.context?.coachMode) {
        headers['x-chat-mode'] = ev.context.coachMode;
      }

      if (messageStep && debugCallbacks) {
        debugCallbacks.completeStep(messageStep, 'Payload erstellt und bereit für Verarbeitung');
      }

      // Step 2: Route decision
      if (debugCallbacks) {
        routeStep = debugCallbacks.addStep(
          '🧠 Intent & Route',
          'ARES analysiert die Nachricht und wählt den besten Verarbeitungsweg'
        );
      }

      // Emit early client ack
      try {
        await supabase.rpc('log_trace_event', {
          p_trace_id: headers['x-trace-id'],
          p_stage: 'client_ack',
          p_data: { source: headers['x-source'] }
        });
      } catch (_) { /* non-fatal */ }

      // Step 3: Tool execution (if needed)
      if (debugCallbacks) {
        toolStep = debugCallbacks.addStep(
          '🛠️ Tool Verarbeitung',
          'ARES führt die notwendigen Tools und Datenabfragen aus'
        );
      }

      try {
        const response = await withTimeout(
          supabase.functions.invoke('coach-orchestrator-enhanced', {
            body: payload,
            headers,
          }),
          15000
        );
        
        if (response.data?.reason === 'in_progress') {
          if (toolStep && debugCallbacks) {
            debugCallbacks.completeStep(toolStep, 'Verarbeitung läuft noch...');
          }
          return { kind: 'message', text: '...' };
        }
        
        if (response.error) throw response.error;

        if (routeStep && debugCallbacks) {
          debugCallbacks.completeStep(routeStep, 'Intent erkannt und Route gewählt');
        }
        if (toolStep && debugCallbacks) {
          debugCallbacks.completeStep(toolStep, 'Tools erfolgreich ausgeführt');
        }

        // Step 4: Reply generation
        if (debugCallbacks) {
          replyStep = debugCallbacks.addStep(
            '🚀 Antwort generieren',
            'ARES formuliert die finale Antwort basierend auf den Ergebnissen'
          );
        }

        const result = normalizeReply(response.data);
        
        if (replyStep && debugCallbacks) {
          const responseText = result.kind === 'message' ? result.text : 'Antwort generiert';
          debugCallbacks.completeStep(
            replyStep, 
            `${responseText.slice(0, 100)}${responseText.length > 100 ? '...' : ''}`
          );
        }

        endUserAction();
        return result;

      } catch (e1) {
        if (e1 instanceof Error && e1.message === 'timeout') {
          console.warn('orchestrator TIMEOUT', { cutoffMs: 15000 });
          
          if (toolStep && debugCallbacks) {
            debugCallbacks.errorStep(toolStep, 'Timeout nach 15 Sekunden');
          }
          
          try {
            await supabase.rpc('log_trace_event', {
              p_trace_id: headers['x-trace-id'],
              p_stage: 'client_timeout',
              p_data: { cutoffMs: 15000 }
            });
          } catch (_) { /* non-fatal */ }
        }
        
        // Retry once
        headers['x-retry'] = '1';
        
        if (debugCallbacks) {
          const retryStep = debugCallbacks.addStep(
            '🔄 Wiederholung',
            'Erster Versuch fehlgeschlagen, versuche erneut...'
          );
          
          try {
            const { data, error } = await supabase.functions.invoke('coach-orchestrator-enhanced', {
              body: payload,
              headers,
            });
            
            if (error) throw error;
            
            debugCallbacks.completeStep(retryStep, 'Wiederholung erfolgreich');
            
            if (replyStep) {
              debugCallbacks.completeStep(replyStep, 'Antwort nach Wiederholung generiert');
            }
            
            endUserAction();
            return normalizeReply(data);
            
          } catch (retryError) {
            debugCallbacks.errorStep(retryStep, `Wiederholung fehlgeschlagen: ${retryError}`);
            throw retryError;
          }
        } else {
          const { data, error } = await supabase.functions.invoke('coach-orchestrator-enhanced', {
            body: payload,
            headers,
          });
          if (error) throw error;
          endUserAction();
          return normalizeReply(data);
        }
      }
    } catch (e) {
      // Error all pending steps
      if (debugCallbacks) {
        const errorMsg = `Fehler: ${e instanceof Error ? e.message : 'Unbekannter Fehler'}`;
        
        if (messageStep) debugCallbacks.errorStep(messageStep, errorMsg);
        if (routeStep) debugCallbacks.errorStep(routeStep, errorMsg);
        if (toolStep) debugCallbacks.errorStep(toolStep, errorMsg);
        if (replyStep) debugCallbacks.errorStep(replyStep, errorMsg);
      }

      const coachId = ev.context?.coachId || 'unknown';
      return { 
        kind: 'message', 
        text: `Hey! Ich bin kurz beschäftigt – versuch\'s bitte nochmal. (${coachId === 'ares' ? 'ARES System wird geladen...' : 'Netzwerk/Timeout'})` 
      };
    }
  }

  return { sendEvent, beginUserAction, endUserAction };
}