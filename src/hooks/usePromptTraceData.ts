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
}

export function usePromptTraceData(traceId?: string) {
  const [promptData, setPromptData] = useState<PromptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsePromptFromEvents = useCallback((events: TraceEvent[]): PromptData | null => {
    if (!events.length) return null;

    const data: PromptData = {
      traceId: traceId || events[0]?.trace_id || 'unknown'
    };

    // Parse different event types
    events.forEach(event => {
      const eventData = event.data || {};
      
      switch (event.step) {
        case 'prompt_building':
        case 'llm_request':
          // Extract final prompt
          if (eventData.system_prompt || eventData.user_prompt || eventData.full_prompt) {
            data.finalPrompt = {
              system: eventData.system_prompt || '',
              user: eventData.user_prompt || eventData.prompt || '',
              full: eventData.full_prompt || `${eventData.system_prompt || ''}\n\n${eventData.user_prompt || eventData.prompt || ''}`
            };
          }
          
          // Extract telemetry
          if (eventData.prompt_tokens || eventData.completion_tokens) {
            data.telemetryData = {
              firstToken_ms: eventData.firstToken_ms,
              fullStream_ms: eventData.fullStream_ms || event.duration_ms,
              prompt_tokens: eventData.prompt_tokens,
              completion_tokens: eventData.completion_tokens,
              cost_usd: eventData.cost_usd,
              model: eventData.openai_model || eventData.model
            };
          }
          break;

        case 'persona_loading':
        case 'coach_context':
          // Extract persona information
          if (eventData.coach_id || eventData.persona) {
            data.persona = {
              coach_id: eventData.coach_id || eventData.persona?.id || 'unknown',
              name: eventData.name || eventData.persona?.name || '',
              voice: eventData.voice || eventData.persona?.voice || 'neutral',
              style_rules: eventData.style_rules || eventData.persona?.style_rules || [],
              specializations: eventData.specializations || eventData.persona?.specializations || []
            };
          }
          break;

        case 'context_building':
        case 'memory_loading':
          // Extract injected context
          if (eventData.user_profile || eventData.daily_context || eventData.conversation_memory) {
            data.injectedContext = {
              user_profile: eventData.user_profile,
              daily_context: eventData.daily_context,
              conversation_memory: eventData.conversation_memory || eventData.rolling_summary,
              recent_summaries: eventData.recent_summaries || []
            };
          }
          break;

        case 'rag_search':
        case 'knowledge_retrieval':
          // Extract RAG sources
          if (eventData.results || eventData.rag_results || eventData.documents) {
            const sources = eventData.results || eventData.rag_results || eventData.documents;
            if (Array.isArray(sources)) {
              data.ragSources = sources.map((source: any, idx: number) => ({
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
          // Extract intent and tool information
          if (eventData.intent || eventData.tool_candidates) {
            data.intentDetection = {
              intent: eventData.intent?.name || eventData.intent || 'unknown',
              confidence: eventData.intent?.score || eventData.confidence || 0,
              slots: eventData.slots || eventData.intent?.slots || {},
              tool_candidates: eventData.tool_candidates || eventData.suggested_tools || []
            };
          }
          break;

        case 'tool_execution':
        case 'function_call':
          // Extract tool results
          if (eventData.tool_name || eventData.function_name) {
            if (!data.toolResults) data.toolResults = [];
            data.toolResults.push({
              tool_name: eventData.tool_name || eventData.function_name,
              input: eventData.input || eventData.arguments,
              output: eventData.output || eventData.result,
              success: eventData.success !== false && !eventData.error
            });
          }
          break;
      }
    });

    return data;
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
          created_at: event.created_at
        })),
        ...(coachTracesResponse.data || []).map(trace => ({
          id: trace.id.toString(),
          trace_id: trace.trace_id,
          step: trace.stage,
          status: 'OK',
          data: trace.data,
          duration_ms: undefined,
          created_at: trace.ts
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

  useEffect(() => {
    if (traceId) {
      fetchPromptData(traceId);
    } else {
      setPromptData(null);
    }
  }, [traceId, fetchPromptData]);

  return {
    promptData,
    loading,
    error,
    refetch: () => traceId && fetchPromptData(traceId)
  };
}