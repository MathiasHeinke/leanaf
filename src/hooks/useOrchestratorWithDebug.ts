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

  function beginUserAction(): string {
    const id = Date.now().toString();
    currentClientEventId.current = id;
    return id;
  }

  function endUserAction() {
    currentClientEventId.current = null;
  }

  const sendEvent = async (userId: string, ev: CoachEvent, traceId?: string, context?: CoachEventContext): Promise<OrchestratorReply> => {
    const requestTraceId = traceId || newTraceId();
    setLoading(true);
    const orchestratorFunction = 'coach-orchestrator-enhanced';
    let currentStepId: string | undefined;

    try {
      currentStepId = debugCallbacks?.addStep("Auth Check", "Verifying authentication...");
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        debugCallbacks?.errorStep(currentStepId!, "No active session");
        throw new Error("No active session");
      }
      
      debugCallbacks?.completeStep(currentStepId!, `Session valid (expires: ${new Date(session.expires_at! * 1000).toLocaleTimeString()})`);

      // Echo test for header debugging
      currentStepId = debugCallbacks?.addStep("Reachability Test", "Testing edge function headers...");
      try {
        const echoResult = await supabase.functions.invoke('edge-echo', {
          body: { test: 'headers', traceId: currentTraceId }
        });
        if (echoResult.data?.echo === 'success') {
          debugCallbacks?.completeStep(currentStepId!, `Headers OK - Auth: ${echoResult.data.headers.authorization ? 'present' : 'missing'}`);
        } else {
          debugCallbacks?.errorStep(currentStepId!, `Echo failed: ${echoResult.error?.message || 'unknown'}`);
        }
      } catch (echoError: any) {
        debugCallbacks?.errorStep(currentStepId!, `Echo error: ${echoError.message}`);
      }

      // Health check
      currentStepId = debugCallbacks?.addStep("Route Test", "Testing orchestrator route...");
      try {
        const healthResult = await withTimeout(
          supabase.functions.invoke(orchestratorFunction, {
            body: { userId, action: 'health', traceId: currentTraceId }
          }),
          5000
        );
        if (healthResult.data?.ok) {
          debugCallbacks?.completeStep(currentStepId!, `Route OK - ${healthResult.data.status}`);
        } else {
          debugCallbacks?.errorStep(currentStepId!, `Health check failed: ${healthResult.error?.message || 'unknown'}`);
        }
      } catch (healthError: any) {
        debugCallbacks?.errorStep(currentStepId!, `Route error: ${healthError.message}`);
      }

      currentStepId = debugCallbacks?.addStep("Send Request", `Calling ${orchestratorFunction}...`);

      // Send with both event structure and direct fields for compatibility
      const payload = {
        userId,
        event: ev,
        traceId: requestTraceId,
        context,
        // Also send as direct fields for fallback compatibility
        text: ev.type === 'TEXT' ? ev.text : undefined,
        clientEventId: ev.clientEventId,
        // Enable deep debugging if requested
        debug: deepDebug
      };
      
      console.log("🔧 Sending payload:", JSON.stringify(payload, null, 2));
      
      // Store request for debugging
      debugCallbacks?.setLastRequest?.(payload);
      
      const result = await withTimeout(
        supabase.functions.invoke(orchestratorFunction, {
          body: payload,
          headers: {
            ...(deepDebug ? { 'x-debug': '1' } : {}),
            'x-trace-id': requestTraceId
          }
        }),
        25000
      );

      if (result.error) {
        throw new Error(result.error.message || 'Unknown orchestrator error');
      }

      // Store response for debugging
      debugCallbacks?.setLastResponse?.(result.data);

      debugCallbacks?.completeStep(currentStepId!, "Request completed successfully");

      // Enhanced response with debug metadata
      const normalizedResult = normalizeReply(result.data);
      
      // Force the client-visible traceId to the one we generated/sent so DB lookups align
      (normalizedResult as any).traceId = requestTraceId;
      setCurrentTraceId(requestTraceId);
      
      // Add enhanced metadata for debugging via meta property (only for types that support it)
      if (normalizedResult.kind === 'message' || normalizedResult.kind === 'reflect' || normalizedResult.kind === 'choice_suggest') {
        (normalizedResult as any).meta = {
          ...(normalizedResult as any).meta,
          // Keep both IDs for diagnostics
          traceId: requestTraceId, // DB-aligned traceId (client-generated)
          serverTraceId: (result.data as any)?.traceId, // what the server returned (may be UUID)
          source: 'orchestrator',
          processingTime: (result.data as any)?.processingTime,
          rawResponse: result.data,
          apiErrors: (result.data as any)?.apiErrors || [],
          fallback: (result.data as any)?.fallback || false,
          retryCount: (result.data as any)?.retryCount || 0,
          downgraded: (result.data as any)?.downgraded || false,
          error: (result.data as any)?.error || undefined,
        };
      }
      
      // Debug log for trace ID tracking  
      console.log(`🔧 TraceID flow: client=${requestTraceId} server=${(result.data as any)?.traceId} → used=${(normalizedResult as any).traceId}`);

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