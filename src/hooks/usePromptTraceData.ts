import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PromptData } from '@/components/gehirn/PromptViewer';

interface TraceEvent {
  id: string;
  trace_id: string;
  step: string;
  status: string;
  data: any;
  duration_ms?: number;
  created_at: string;
  full_prompt?: string;
}

export function usePromptTraceData(traceId?: string) {
  const [promptData, setPromptData] = useState<PromptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsePromptFromEvents = useCallback((events: TraceEvent[]): PromptData | null => {
    if (!events.length) return null;

    const result: PromptData = {
      traceId: traceId || events[0]?.trace_id || 'unknown'
    };

    console.log('[usePromptTraceData] Parsing events', {
      count: events.length,
      steps: events.map(e => e.step)
    });

    const ensureTelemetry = (partial: any = {}) => {
      result.telemetryData = {
        firstToken_ms: partial.firstToken_ms ?? result.telemetryData?.firstToken_ms,
        fullStream_ms: partial.fullStream_ms ?? partial.duration_ms ?? result.telemetryData?.fullStream_ms,
        prompt_tokens: partial.prompt_tokens ?? partial.promptTokens ?? partial.usage?.prompt_tokens ?? partial.usage?.promptTokens ?? result.telemetryData?.prompt_tokens,
        completion_tokens: partial.completion_tokens ?? partial.completionTokens ?? partial.usage?.completion_tokens ?? partial.usage?.completionTokens ?? result.telemetryData?.completion_tokens,
        cost_usd: partial.cost_usd ?? partial.costUsd ?? result.telemetryData?.cost_usd,
        model: partial.openai_model ?? partial.model ?? result.telemetryData?.model
      };
    };

    const setFinalPromptIfAny = (full?: string, system?: string, user?: string) => {
      const exists = result.finalPrompt?.full || result.finalPrompt?.system || result.finalPrompt?.user;
      const fullStr = full || (system || user ? `${system || ''}\n\n${user || ''}` : undefined);
      if (!exists && (fullStr || system || user)) {
        result.finalPrompt = {
          system: system || '',
          user: user || '',
          full: fullStr || ''
        };
      }
    };

    for (const event of events) {
      const d = event.data || {};
      switch (event.step) {
        case 'prompt_building':
        case 'llm_request':
        case 'final_prompt':
          setFinalPromptIfAny(event.full_prompt || d.full_prompt || d.finalPrompt || d.prompt, d.system_prompt || d.systemPrompt, d.user_prompt || d.userPrompt || d.prompt);
          ensureTelemetry(d);
          break;

        case 'openai_call':
          // Normalize OpenAI usage/model and possible prompts
          ensureTelemetry({
            ...d,
            model: d.model || d.openai_model,
            prompt_tokens: d.usage?.prompt_tokens ?? d.prompt_tokens ?? d.promptTokens,
            completion_tokens: d.usage?.completion_tokens ?? d.completion_tokens ?? d.completionTokens,
          });
          setFinalPromptIfAny(d.full_prompt || d.finalPrompt || d.combinedPrompt || event.full_prompt);
          break;

        case 'prompt_analysis':
          // may include the assembled prompt or insights
          setFinalPromptIfAny(d.full_prompt || d.finalPrompt || d.prompt);
          if (d.model || d.openai_model) ensureTelemetry(d);
          break;

        case 'persona_loading':
        case 'coach_context':
          if (d.coach_id || d.persona) {
            result.persona = {
              coach_id: d.coach_id || d.persona?.id || 'unknown',
              name: d.name || d.persona?.name || '',
              voice: d.voice || d.persona?.voice || 'neutral',
              style_rules: d.style_rules || d.persona?.style_rules || [],
              specializations: d.specializations || d.persona?.specializations || []
            };
          }
          break;

        case 'context_building':
        case 'memory_loading':
          if (d.user_profile || d.daily_context || d.conversation_memory || d.rolling_summary) {
            result.injectedContext = {
              user_profile: d.user_profile,
              daily_context: d.daily_context,
              conversation_memory: d.conversation_memory || d.rolling_summary,
              recent_summaries: d.recent_summaries || []
            };
          }
          break;

        case 'rag_search':
        case 'knowledge_retrieval':
          if (d.results || d.rag_results || d.documents) {
            const sources = d.results || d.rag_results || d.documents;
            if (Array.isArray(sources)) {
              result.ragSources = sources.map((source: any, idx: number) => ({
                content: source.content || source.text || source.chunk || '',
                score: source.score || source.similarity || source.relevance || 0,
                title: source.title || source.source || `Document ${idx + 1}`,
                source: source.expertise_area || source.coach_id || source.source || 'knowledge_base',
                chunk_index: source.chunk_index || idx
              }));
            }
          }
          break;

        case 'intent_detection':
        case 'tool_selection':
          if (d.intent || d.tool_candidates) {
            result.intentDetection = {
              intent: d.intent?.name || d.intent || 'unknown',
              confidence: d.intent?.score || d.confidence || 0,
              slots: d.slots || d.intent?.slots || {},
              tool_candidates: d.tool_candidates || d.suggested_tools || []
            };
          }
          break;

        case 'tool_execution':
        case 'function_call':
          if (d.tool_name || d.function_name) {
            if (!result.toolResults) result.toolResults = [];
            result.toolResults.push({
              tool_name: d.tool_name || d.function_name,
              input: d.input || d.arguments,
              output: d.output || d.result,
              success: d.success !== false && !d.error
            });
          }
          break;

        default:
          // noop, but still try to harvest prompt/telemetry if present
          setFinalPromptIfAny(event.full_prompt || d.full_prompt || d.finalPrompt || d.prompt, d.system_prompt || d.systemPrompt, d.user_prompt || d.userPrompt || d.prompt);
          if (d.usage || d.prompt_tokens || d.promptTokens) ensureTelemetry(d);
      }
    }

    // If still no prompt, set a helpful placeholder when we have any telemetry/events
    if (!result.finalPrompt && events.length > 0) {
      result.finalPrompt = {
        system: '',
        user: '',
        full: '[No explicit prompt logged in events]'
      };
    }

    return result;
  }, [traceId]);

  const fetchPromptData = useCallback(async (targetTraceId: string) => {
    if (!targetTraceId) return;
    
    setLoading(true);
    setError(null);

    try {
      // Fetch trace events from both tables
      const [traceEventsResponse, coachTracesResponse] = await Promise.all([
        supabase
          .from('coach_trace_events')
          .select('*')
          .eq('trace_id', targetTraceId)
          .order('created_at', { ascending: true }),
        
        supabase
          .from('coach_traces')
          .select('*')
          .eq('trace_id', targetTraceId)
          .order('ts', { ascending: true })
      ]);

      if (traceEventsResponse.error) {
        throw new Error(`Failed to fetch trace events: ${traceEventsResponse.error.message}`);
      }

      if (coachTracesResponse.error) {
        console.warn('Failed to fetch coach traces:', coachTracesResponse.error.message);
      }

      // Combine and normalize events
      const events: TraceEvent[] = [
        ...(traceEventsResponse.data || []).map(event => ({
          id: event.id,
          trace_id: event.trace_id,
          step: event.step,
          status: event.status,
          data: event.data,
          duration_ms: event.duration_ms,
          created_at: event.created_at,
          full_prompt: event.full_prompt
        })),
        ...(coachTracesResponse.data || []).map(trace => ({
          id: trace.id.toString(),
          trace_id: trace.trace_id,
          step: trace.stage,
          status: 'OK',
          data: trace.data,
          duration_ms: undefined,
          created_at: trace.ts,
          full_prompt: undefined
        }))
      ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      const parsedData = parsePromptFromEvents(events);
      setPromptData(parsedData);

    } catch (err) {
      console.error('Error fetching prompt trace data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prompt data');
    } finally {
      setLoading(false);
    }
  }, [parsePromptFromEvents]);


  const resolveLatestTraceId = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('coach_traces')
        .select('trace_id, ts')
        .order('ts', { ascending: false })
        .limit(1);
      if (error) {
        console.warn('[usePromptTraceData] Failed to resolve latest trace id:', error.message);
        return null;
      }
      const id = data?.[0]?.trace_id || null;
      console.log('[usePromptTraceData] Resolved latest trace id:', id);
      return id;
    } catch (e) {
      console.warn('[usePromptTraceData] Error resolving latest trace id', e);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const id = traceId || await resolveLatestTraceId();
      console.log('[usePromptTraceData] useEffect run', { provided: traceId, resolved: id });
      if (!cancelled && id) {
        await fetchPromptData(id);
      } else if (!cancelled && !id) {
        setPromptData(null);
        setError(prev => prev || 'No trace data available');
      }
    };
    run();
    return () => { cancelled = true; };
  }, [traceId, fetchPromptData, resolveLatestTraceId]);


  return {
    promptData,
    loading,
    error,
    refetch: () => traceId && fetchPromptData(traceId)
  };
}