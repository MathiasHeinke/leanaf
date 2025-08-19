import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CoachEvent, OrchestratorReply, CoachEventContext } from '@/hooks/useOrchestrator';

type DebugCallbacks = {
  addStep: (title: string, details?: string) => string;
  completeStep: (id: string, details?: string) => void;
  errorStep: (id: string, error: string) => void;
  setLastRequest?: (request: any) => void;
  setLastResponse?: (response: any) => void;
};

export async function sendAresEvent({ text, images, clientEventId }: {
  text?: string; 
  images?: any[]; 
  clientEventId?: string;
}) {
  const payload = { coachId: 'ares', text, images, clientEventId };

  const attempt = async () => {
    const { data, error } = await supabase.functions.invoke('coach-orchestrator-enhanced', {
      body: payload
    });
    if (error) throw error;
    return data;
  };

  let lastErr: any;
  for (let i = 0; i < 2; i++) {           // up to 2 retries
    try { return await attempt(); } 
    catch (e: any) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 300 * (i + 1))); // 300ms, 600ms
    }
  }
  throw lastErr;
}

function normalizeReply(raw: any): OrchestratorReply {
  if (!raw) return { kind: 'message', text: 'Kurz hake ich – versuch\'s bitte nochmal. (Netzwerk/Timeout)' };
  const k = typeof raw?.kind === 'string' ? raw.kind.toLowerCase() : '';
  if (k === 'message' || k === 'reflect' || k === 'choice_suggest' || k === 'clarify' || k === 'confirm_save_meal' || k === 'confirm_save_supplement') return raw as OrchestratorReply;
  const text = raw.reply ?? raw.content ?? (typeof raw === 'string' ? raw : 'OK');
  return { kind: 'message', text, traceId: raw?.traceId, meta: raw };
}

export function useOrchestratorWithDebug(debugCallbacks?: DebugCallbacks, deepDebug?: boolean) {
  const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function beginUserAction(): string | null {
    // No longer generate client-side trace IDs
    return null;
  }

  function endUserAction() {
    setCurrentTraceId(null);
  }

  const sendEvent = async (userId: string, ev: CoachEvent, traceId?: string, context?: CoachEventContext): Promise<OrchestratorReply> => {
    setLoading(true);
    let currentStepId: string | undefined;

    try {
      currentStepId = debugCallbacks?.addStep("Auth Check", "Verifying authentication...");
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        debugCallbacks?.errorStep(currentStepId!, "No active session");
        throw new Error("No active session");
      }
      
      debugCallbacks?.completeStep(currentStepId!, `Session valid`);

      currentStepId = debugCallbacks?.addStep("Send Request", "Calling ARES enhanced orchestrator...");

      // Use the new simplified approach
      const result = await sendAresEvent({
        text: ev.type === 'TEXT' ? ev.text : undefined,
        images: ev.type === 'IMAGE' ? (ev as any).images : undefined,
        clientEventId: ev.clientEventId
      });
      
      // Store request/response for debugging
      debugCallbacks?.setLastRequest?.({
        coachId: 'ares',
        text: ev.type === 'TEXT' ? ev.text : undefined,
        images: ev.type === 'IMAGE' ? (ev as any).images : undefined,
        clientEventId: ev.clientEventId
      });
      debugCallbacks?.setLastResponse?.(result);

      if (!result?.ok) {
        const status = result?.status || 500;
        const code = result?.code;
        
        // Map specific error codes to user-friendly messages
        let errorMsg = 'Coach-Verbindung fehlgeschlagen. Bitte kurz erneut senden.';
        if (status === 401) {
          errorMsg = 'Bitte erneut anmelden.';
        } else if (status === 422 || code === 'NO_INPUT') {
          errorMsg = 'Bitte Text oder Bild senden.';
        } else if (code === 'CONFIG_MISSING') {
          errorMsg = 'Server-Konfigurationsfehler. Bitte Admin benachrichtigen.';
        }
        
        const error = new Error(errorMsg);
        (error as any).status = status;
        (error as any).code = code;
        throw error;
      }

      debugCallbacks?.completeStep(currentStepId!, "Request completed successfully");

      // Extract trace ID from response (server-generated)
      const serverTraceId = result.traceId;
      if (serverTraceId) {
        setCurrentTraceId(serverTraceId);
        console.log(`🔧 Server trace ID: ${serverTraceId}`);
      }

      // Enhanced response
      const normalizedResult: OrchestratorReply = {
        kind: 'message',
        text: result.reply || 'No response from ARES',
        meta: {
          traceId: serverTraceId,
          source: 'ares-enhanced',
          rawResponse: result
        }
      };

      setLoading(false);
      return normalizedResult;

    } catch (error: any) {
      console.error("🔧 Orchestrator error:", error);
      
      if (currentStepId) {
        debugCallbacks?.errorStep(currentStepId, `Error: ${error.message}`);
      }

      setLoading(false);
      throw error;
    }
  };

  return { sendEvent, beginUserAction, endUserAction, currentTraceId, loading };
}