import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AresTraceData {
  trace_id: string;
  user_id: string;
  coach_id: string;
  created_at: string;
  status: 'started' | 'context_loaded' | 'prompt_built' | 'llm_called' | 'completed' | 'failed';
  client_event_id?: string;
  input_text?: string;
  images?: any;
  context?: any;
  persona?: any;
  rag_sources?: any;
  system_prompt?: string;
  complete_prompt?: string;
  llm_input?: any;
  llm_output?: any;
  duration_ms?: number;
  error?: any;
}

export function useTraceDebug(traceId?: string | null) {
  const [data, setData] = useState<AresTraceData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!traceId) {
      setData(null);
      return;
    }

    let stopped = false;
    setLoading(true);

    const fetchOnce = async () => {
      try {
        const { data, error } = await supabase
          .from('ares_traces')
          .select('*')
          .eq('trace_id', traceId)
          .maybeSingle();

        if (!stopped) {
          if (error) {
            console.warn('[trace-debug] fetch error:', error);
          } else {
            setData(data as AresTraceData);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!stopped) {
          console.error('[trace-debug] fetch exception:', err);
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchOnce();

    // Realtime updates
    const channel = supabase
      .channel(`trace-${traceId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'ares_traces', 
          filter: `trace_id=eq.${traceId}` 
        },
        (payload) => {
          console.log('[trace-debug] realtime update:', payload);
          if (payload.new) {
            setData(prev => ({ ...(prev || {}), ...(payload.new as AresTraceData) }));
          }
        }
      )
      .subscribe();

    // Fallback polling every 1.5s for reliability
    const interval = setInterval(fetchOnce, 1500);

    return () => {
      stopped = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [traceId]);

  return { data, loading };
}