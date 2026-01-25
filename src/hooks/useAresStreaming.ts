/**
 * ARES Streaming Hook
 * True SSE streaming for ARES chat with automatic fallback to blocking
 * 
 * @version 1.0.0
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface StreamEvent {
  type: 'thinking' | 'context_ready' | 'content' | 'error' | 'done';
  content?: string;
  delta?: string;
  traceId?: string;
  error?: string;
  redirect?: 'blocking';
  reason?: string;
  step?: string;
  message?: string;
  done?: boolean;
  metrics?: {
    firstTokenMs?: number;
    totalTokens?: number;
    durationMs?: number;
  };
  loadedModules?: string[];
}

interface StreamMetrics {
  firstTokenMs: number | null;
  totalTokens: number;
  durationMs: number | null;
  loadedModules: string[];
}

export interface ThinkingStep {
  step: string;
  message: string;
  complete: boolean;
}

type StreamState = 'idle' | 'connecting' | 'thinking' | 'context_loading' | 'streaming' | 'complete' | 'error';

export interface UseAresStreamingOptions {
  onStreamStart?: () => void;
  onStreamEnd?: (fullContent: string, traceId: string | null) => void;
  onError?: (error: string) => void;
  onContextReady?: (modules: string[]) => void;
  fallbackToBlocking?: boolean;
}

export interface UseAresStreamingReturn {
  sendMessage: (message: string, coachId?: string) => Promise<void>;
  streamingContent: string;
  isStreaming: boolean;
  streamState: StreamState;
  error: string | null;
  traceId: string | null;
  metrics: StreamMetrics;
  thinkingSteps: ThinkingStep[];
  stopStream: () => void;
  clearState: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THINKING STEPS MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get thinking steps based on the tool execution reason
 * This provides visual feedback during blocking redirects
 */
function getThinkingStepsForReason(reason: string): ThinkingStep[] {
  switch (reason) {
    case 'research_scientific_evidence':
      return [
        { step: 'search', message: 'Durchsuche PubMed & wissenschaftliche Datenbanken...', complete: false },
        { step: 'analyze', message: 'Analysiere Studienergebnisse...', complete: false },
        { step: 'cite', message: 'Extrahiere Zitate & Quellen...', complete: false },
      ];
    case 'create_workout_plan':
      return [
        { step: 'analyze', message: 'Analysiere dein Trainingsprofil...', complete: false },
        { step: 'create', message: 'Erstelle personalisierten Trainingsplan...', complete: false },
      ];
    case 'create_nutrition_plan':
      return [
        { step: 'analyze', message: 'Berechne Makros & Kalorien...', complete: false },
        { step: 'create', message: 'Erstelle Ernährungsplan...', complete: false },
      ];
    case 'create_peptide_protocol':
      return [
        { step: 'analyze', message: 'Prüfe Peptid-Protokoll...', complete: false },
        { step: 'create', message: 'Erstelle Titrations-Schema...', complete: false },
      ];
    case 'meta_analysis':
      return [
        { step: 'load', message: 'Lade Ernährungs- & Trainingsdaten...', complete: false },
        { step: 'analyze', message: 'Führe Meta-Analyse durch...', complete: false },
      ];
    default:
      return [
        { step: 'process', message: 'Verarbeite Anfrage...', complete: false },
      ];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATED STREAMING (for blocking responses)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simulates streaming output for blocking responses
 * Splits text into chunks and outputs with delay (typewriter effect)
 */
async function simulateStreaming(
  fullText: string,
  onChunk: (partial: string) => void,
  options?: { chunkSize?: number; delayMs?: number }
): Promise<void> {
  const { delayMs = 12 } = options || {};
  
  let current = '';
  const words = fullText.split(/(\s+)/); // Split by whitespace, keep separators
  
  for (let i = 0; i < words.length; i++) {
    current += words[i];
    onChunk(current);
    
    // Short pause between chunks
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    // Slightly longer pause after sentences
    if (words[i].match(/[.!?]\s*$/)) {
      await new Promise(resolve => setTimeout(resolve, delayMs * 2));
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useAresStreaming(options: UseAresStreamingOptions = {}): UseAresStreamingReturn {
  const {
    onStreamStart,
    onStreamEnd,
    onError,
    onContextReady,
    fallbackToBlocking = true
  } = options;

  // State
  const [streamingContent, setStreamingContent] = useState('');
  const [streamState, setStreamState] = useState<StreamState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [metrics, setMetrics] = useState<StreamMetrics>({
    firstTokenMs: null,
    totalTokens: 0,
    durationMs: null,
    loadedModules: []
  });

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const isStreamingRef = useRef(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // STOP STREAM
  // ═══════════════════════════════════════════════════════════════════════════
  const stopStream = useCallback(() => {
    console.log('[useAresStreaming] Stopping stream');
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (readerRef.current) {
      readerRef.current.cancel().catch(() => {});
      readerRef.current = null;
    }
    
    isStreamingRef.current = false;
    setStreamState('idle');
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const clearState = useCallback(() => {
    stopStream();
    setStreamingContent('');
    setError(null);
    setTraceId(null);
    setThinkingSteps([]);
    setMetrics({
      firstTokenMs: null,
      totalTokens: 0,
      durationMs: null,
      loadedModules: []
    });
  }, [stopStream]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FALLBACK TO BLOCKING ORCHESTRATOR
  // ═══════════════════════════════════════════════════════════════════════════
  const fallbackToBlockingRequest = useCallback(async (message: string, coachId: string): Promise<string> => {
    console.log('[useAresStreaming] Falling back to blocking request');
    
    const { data, error: invokeError } = await supabase.functions.invoke('coach-orchestrator-enhanced', {
      body: {
        event: { type: 'TEXT', text: message },
        coachId
      }
    });

    if (invokeError) {
      throw new Error(invokeError.message);
    }

    return data?.reply || data?.content || '';
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // SEND MESSAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const sendMessage = useCallback(async (message: string, coachId: string = 'ares') => {
    // Prevent concurrent streams
    if (isStreamingRef.current) {
      console.warn('[useAresStreaming] Already streaming, ignoring request');
      return;
    }

    // Reset state
    setStreamingContent('');
    setError(null);
    setTraceId(null);
    setThinkingSteps([]);
    setMetrics({
      firstTokenMs: null,
      totalTokens: 0,
      durationMs: null,
      loadedModules: []
    });
    setStreamState('connecting');
    isStreamingRef.current = true;

    // Create abort controller
    abortControllerRef.current = new AbortController();
    const startTime = performance.now();

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      onStreamStart?.();

      // Make streaming request
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ares-streaming`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify({ message, coachId }),
          signal: abortControllerRef.current.signal
        }
      );

      // Check for redirect to blocking
      if (response.headers.get('Content-Type')?.includes('application/json')) {
        const jsonData = await response.json();
        
        if (jsonData.redirect === 'blocking' && fallbackToBlocking) {
          const reason = jsonData.reason || 'tool_execution';
          console.log('[useAresStreaming] Server requested fallback:', reason);
          
          // Show specific thinking steps based on the reason
          const steps = getThinkingStepsForReason(reason);
          setThinkingSteps(steps);
          setStreamState('thinking');
          
          // Simulate step progression for visual feedback
          const stepInterval = setInterval(() => {
            setThinkingSteps(prev => {
              const incomplete = prev.findIndex(s => !s.complete);
              if (incomplete === -1) return prev;
              return prev.map((s, i) => i === incomplete ? { ...s, complete: true } : s);
            });
          }, 1500);
          
          try {
            const blockingResponse = await fallbackToBlockingRequest(message, coachId);
            
            // Mark all steps complete
            clearInterval(stepInterval);
            setThinkingSteps(prev => prev.map(s => ({ ...s, complete: true })));
            
            // IMPORTANT: Switch to 'streaming' state BEFORE showing content
            setStreamState('streaming');
            
            // Simulate streaming with typewriter effect
            await simulateStreaming(blockingResponse, (partial) => {
              setStreamingContent(partial);
            });
            
            setStreamState('complete');
            setTraceId(jsonData.traceId || null);
            
            const duration = Math.round(performance.now() - startTime);
            setMetrics(m => ({ ...m, durationMs: duration }));
            
            onStreamEnd?.(blockingResponse, jsonData.traceId || null);
          } catch (blockingError) {
            clearInterval(stepInterval);
            throw blockingError;
          }
          
          isStreamingRef.current = false;
          return;
        }

        if (jsonData.error) {
          throw new Error(jsonData.error);
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Read SSE stream
      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let currentTraceId: string | null = null;
      let tokenCount = 0;

      setStreamState('context_loading');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          try {
            const event: StreamEvent = JSON.parse(trimmed.slice(6));

            switch (event.type) {
              case 'thinking':
                // Handle thinking step events
                setStreamState('thinking');
                if (event.step && event.message) {
                  setThinkingSteps(prev => {
                    const existing = prev.find(s => s.step === event.step);
                    if (existing) {
                      return prev.map(s => 
                        s.step === event.step ? { ...s, complete: event.done ?? true } : s
                      );
                    }
                    return [...prev, { step: event.step!, message: event.message!, complete: event.done ?? false }];
                  });
                }
                break;

              case 'context_ready':
                setStreamState('streaming');
                if (event.loadedModules) {
                  setMetrics(m => ({ ...m, loadedModules: event.loadedModules! }));
                  onContextReady?.(event.loadedModules);
                }
                if (event.traceId) {
                  currentTraceId = event.traceId;
                  setTraceId(event.traceId);
                }
                break;

              case 'content':
                if (event.delta) {
                  fullContent += event.delta;
                  tokenCount++;
                  setStreamingContent(fullContent);
                  
                  // Track first token
                  if (tokenCount === 1) {
                    const firstTokenTime = Math.round(performance.now() - startTime);
                    setMetrics(m => ({ ...m, firstTokenMs: firstTokenTime }));
                  }
                  setMetrics(m => ({ ...m, totalTokens: tokenCount }));
                }
                break;

              case 'done':
                setStreamState('complete');
                if (event.traceId) {
                  currentTraceId = event.traceId;
                  setTraceId(event.traceId);
                }
                if (event.metrics) {
                  setMetrics(m => ({
                    ...m,
                    firstTokenMs: event.metrics?.firstTokenMs ?? m.firstTokenMs,
                    totalTokens: event.metrics?.totalTokens ?? m.totalTokens,
                    durationMs: event.metrics?.durationMs ?? m.durationMs
                  }));
                }
                onStreamEnd?.(fullContent, currentTraceId);
                break;

              case 'error':
                throw new Error(event.error || 'Stream error');
            }
          } catch (parseError) {
            // Ignore JSON parse errors for incomplete chunks
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }
      }

      // Finalize if not already done
      if (streamState !== 'complete') {
        setStreamState('complete');
        const duration = Math.round(performance.now() - startTime);
        setMetrics(m => ({ ...m, durationMs: duration }));
        onStreamEnd?.(fullContent, currentTraceId);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Don't report abort as error
      if (errorMessage === 'The operation was aborted.' || errorMessage === 'AbortError') {
        console.log('[useAresStreaming] Stream aborted');
        setStreamState('idle');
      } else {
        console.error('[useAresStreaming] Error:', errorMessage);
        setError(errorMessage);
        setStreamState('error');
        onError?.(errorMessage);
      }
    } finally {
      isStreamingRef.current = false;
      readerRef.current = null;
      abortControllerRef.current = null;
    }
  }, [fallbackToBlocking, fallbackToBlockingRequest, onStreamStart, onStreamEnd, onError, onContextReady, streamState]);

  return {
    sendMessage,
    streamingContent,
    isStreaming: streamState === 'connecting' || streamState === 'thinking' || streamState === 'context_loading' || streamState === 'streaming',
    streamState,
    error,
    traceId,
    metrics,
    thinkingSteps,
    stopStream,
    clearState
  };
}
