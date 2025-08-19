import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TraceData {
  id?: string;
  trace_id: string;
  user_id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  persona?: any;
  rag_sources?: any;
  user_context?: any;
  assembled_prompt?: string;
  llm_input?: any;
  llm_output?: any;
  meta?: any;
  // Allow other fields from database
  [key: string]: any;
}

export function useTraceInspector(traceId?: string) {
  const [data, setData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!traceId) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    supabase
      .from('orchestrator_traces')
      .select('*')
      .eq('trace_id', traceId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!cancelled) {
          if (error) {
            console.warn('[trace] load error', error);
            setError(error.message);
            setData(null);
          } else {
            setData(data as unknown as TraceData || null);
          }
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [traceId]);

  const refetch = () => {
    if (traceId) {
      setLoading(true);
      setError(null);
      
      supabase
        .from('orchestrator_traces')
        .select('*')
        .eq('trace_id', traceId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.warn('[trace] refetch error', error);
            setError(error.message);
            setData(null);
          } else {
            setData(data as unknown as TraceData || null);
          }
          setLoading(false);
        });
    }
  };

  return { trace: data, loading, error, refetch };
}