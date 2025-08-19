import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useTrace(traceId?: string) {
  const [trace, setTrace] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(!!traceId);
  const [error, setError] = useState<string | null>(null);
  const tries = useRef(0);

  useEffect(() => {
    if (!traceId) { 
      setLoading(false); 
      setTrace(null);
      setError(null);
      return; 
    }
    
    let cancelled = false;
    tries.current = 0;

    const fetchOnce = async () => {
      try {
        const { data, error } = await supabase
          .from('orchestrator_traces')
          .select('*')
          .eq('id', traceId)
          .maybeSingle();

        if (cancelled) return;

        if (error) { 
          setError(error.message); 
          setLoading(false); 
          return; 
        }

        setTrace(data);

        if (!data || data.status === 'complete' || data.status === 'error') {
          setLoading(false);
        } else if (tries.current < 10) {
          tries.current += 1;
          setTimeout(fetchOnce, 200 + tries.current * 200); // Progressive delay up to ~2.2s
        } else {
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    };

    fetchOnce();
    return () => { cancelled = true; };
  }, [traceId]);

  const refetch = () => {
    if (traceId) {
      setLoading(true);
      setError(null);
      tries.current = 0;
      
      const fetchOnce = async () => {
        try {
          const { data, error } = await supabase
            .from('orchestrator_traces')
            .select('*')
            .eq('id', traceId)
            .maybeSingle();

          if (error) {
            setError(error.message);
            setTrace(null);
          } else {
            setTrace(data);
          }
          setLoading(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      };

      fetchOnce();
    }
  };

  return { trace, loading, error, refetch };
}