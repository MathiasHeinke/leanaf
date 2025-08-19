import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { newTraceId } from '@/utils/trace';
import { pingAuth } from '@/utils/authDiagnostics';
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
  setLastRequest?: (request: any) => void;
  setLastResponse?: (response: any) => void;
};

export function useOrchestratorWithDebug(debugCallbacks?: DebugCallbacks, deepDebug?: boolean) {
  const currentClientEventId = useRef<string | null>(null);
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

      // Build payload for new ARES system
      const payload = {
        coachId: 'ares',
        text: ev.type === 'TEXT' ? ev.text : undefined,
        images: ev.type === 'IMAGE' ? (ev as any).images : undefined,
        clientEventId: ev.clientEventId
      };
      
      console.log("🔧 Sending to ARES:", payload);
      
      // Store request for debugging
      debugCallbacks?.setLastRequest?.(payload);
      
      const result = await withTimeout(
        supabase.functions.invoke('coach-orchestrator-enhanced', {
          body: payload
        }),
        25000
      );

      if (result.error) {
        throw new Error(result.error.message || 'Unknown orchestrator error');
      }

      if (!result.data?.ok) {
        const errorMsg = result.data?.error?.message || 'Unknown orchestrator error';
        throw new Error(errorMsg);
      }

      // Store response for debugging
      debugCallbacks?.setLastResponse?.(result.data);

      debugCallbacks?.completeStep(currentStepId!, "Request completed successfully");

      // Extract trace ID from response (server-generated)
      const serverTraceId = result.data.traceId;
      if (serverTraceId) {
        setCurrentTraceId(serverTraceId);
        console.log(`🔧 Server trace ID: ${serverTraceId}`);
      }

      // Enhanced response
      const normalizedResult: OrchestratorReply = {
        kind: 'message',
        text: result.data.reply || 'No response from ARES',
        meta: {
          traceId: serverTraceId,
          source: 'ares-enhanced',
          rawResponse: result.data
        }
      };

      setLoading(false);
      return normalizedResult;

    } catch (error: any) {
      console.error("🔧 Orchestrator error:", error);
      
      // Classify error type for better debugging
      let errorType = "Unknown";
      let fallbackResponse: OrchestratorReply | null = null;
      
      if (error.message.includes("Failed to send a request")) {
        if (error.message.includes("400") || error.message.includes("700")) {
          errorType = "CORS/Gateway Block";
        } else {
          errorType = "Network/Gateway";
        }
      } else if (error.message.includes("timeout") || error.message.includes("timed out")) {
        errorType = "Timeout";
      } else if (error.message.includes("401") || error.message.includes("403")) {
        errorType = "Auth Error";
      }
      
      if (currentStepId) {
        debugCallbacks?.errorStep(currentStepId, `${errorType}: ${error.message}`);
      }
      
      // Try fallback to greeting function for demo
      if (ev.type === 'TEXT' && ev.text && (errorType.includes("CORS") || errorType.includes("Gateway"))) {
        try {
          const fallbackStepId = debugCallbacks?.addStep("Fallback", "Using greeting function...");
          const greetingResult = await supabase.functions.invoke('generate-intelligent-greeting', {
            body: { 
              userId, 
              coachId: 'ares', 
              firstName: 'User',
              isFirstConversation: false,
              alreadyGreeted: true,
              contextData: {}
            }
          });
          
          if (greetingResult.data?.greeting) {
            fallbackResponse = {
              kind: 'message',
              text: greetingResult.data.greeting,
              meta: { fallback: true, originalError: error.message }
            };
            debugCallbacks?.completeStep(fallbackStepId!, "Fallback successful");
          } else {
            debugCallbacks?.errorStep(fallbackStepId!, "Fallback failed");
          }
        } catch (fallbackError: any) {
          console.error("🔧 Fallback error:", fallbackError);
        }
      }
      
      // Auto-run auth diagnostics on errors
      try {
        const diagResult = await pingAuth();
        console.log("🔧 Auto-diag result:", diagResult);
        
        if (diagResult.data) {
          const diagStepId = debugCallbacks?.addStep("Auth Diagnostics", "Running diagnostics...");
          if (diagResult.data.ok) {
            debugCallbacks?.completeStep(diagStepId!, `Auth OK - UID: ${diagResult.data.uid}`);
          } else {
            debugCallbacks?.errorStep(diagStepId!, `Auth issue: ${diagResult.data.why}`);
          }
        }
      } catch (diagError) {
        console.error("🔧 Diag error:", diagError);
      }

      if (fallbackResponse) {
        setLoading(false);
        return fallbackResponse;
      }

      setLoading(false);
      throw error;
    }
  };

  return { sendEvent, beginUserAction, endUserAction, currentTraceId, loading };
}