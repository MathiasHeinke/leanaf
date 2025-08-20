import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sendToAres, AresCallOptions, AresResponse } from '@/lib/orchestratorClient';
import type { CoachEvent, OrchestratorReply, CoachEventContext } from '@/hooks/useOrchestrator';

type DebugCallbacks = {
  addStep: (title: string, details?: string) => string;
  completeStep: (id: string, details?: string) => void;
  errorStep: (id: string, error: string) => void;
  setLastRequest?: (request: any) => void;
  setLastResponse?: (response: any) => void;
};

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

      // Use the standardized orchestratorClient
      const aresOptions: AresCallOptions = {
        text: ev.type === 'TEXT' ? ev.text : undefined,
        attachments: ev.type === 'IMAGE' ? (ev as any).images : undefined,
        coachId: 'ares'
      };

      const result: AresResponse = await sendToAres(aresOptions);
      
      // Store request/response for debugging
      debugCallbacks?.setLastRequest?.(aresOptions);
      debugCallbacks?.setLastResponse?.(result);

      debugCallbacks?.completeStep(currentStepId!, "Request completed successfully");

      // Extract trace ID from response (server-generated)
      const serverTraceId = result.traceId;
      if (serverTraceId) {
        setCurrentTraceId(serverTraceId);
        console.log(`🔧 Server trace ID: ${serverTraceId}`);
      }

      // Enhanced response - handle different response formats
      let responseText = '';
      if (result.data?.kind === 'message') {
        responseText = result.data.text;
      } else if (result.data?.kind === 'choice_suggest') {
        responseText = `${result.data.prompt}\n\nOptionen:\n${result.data.options.join('\n• ')}`;
      } else if (result.data?.role === 'assistant' && result.data?.content) {
        responseText = result.data.content;
      } else if (result.data?.reply) {
        responseText = result.data.reply;
      } else {
        responseText = 'No response from ARES';
      }

      const normalizedResult: OrchestratorReply = {
        kind: 'message',
        text: responseText,
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
        debugCallbacks?.errorStep(currentStepId, `Error: ${error?.message || 'Unbekannter Fehler'}`);
      }

      // Map common server errors to user-friendly messages
      let msg = error?.message || 'Coach-Verbindung fehlgeschlagen. Bitte kurz erneut senden.';
      const raw = String(error?.message || '').toUpperCase();
      if (raw.includes('NO_INPUT') || raw.includes('422')) {
        msg = 'Bitte Text oder Bild senden.';
      } else if (raw.includes('UNAUTHORIZED') || raw.includes('401')) {
        msg = 'Bitte erneut anmelden.';
      } else if (raw.includes('CONFIG_MISSING')) {
        msg = 'Server-Konfigurationsfehler. Bitte Admin benachrichtigen.';
      }
      const friendly = new Error(msg);
      (friendly as any).code = /NO_INPUT/.test(raw) ? 'NO_INPUT' : error?.code;
      setLoading(false);
      throw friendly;
    }
  };

  return { sendEvent, beginUserAction, endUserAction, currentTraceId, loading };
}