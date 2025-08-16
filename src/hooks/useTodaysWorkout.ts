import { useEffect, useState, useRef } from "react";
import { loadTodaysWorkout } from "@/data/queries";
import { withWatchdog } from "@/utils/timeRange";

export function useTodaysWorkout(userId?: string) {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const acRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!userId) return;
    if (acRef.current) acRef.current.abort();
    const ac = new AbortController(); 
    acRef.current = ac;

    (async () => {
      setLoading(true); 
      setError(null);
      try {
        const query = loadTodaysWorkout(userId);
        const res = await withWatchdog(query, 6000);
        if (ac.signal.aborted) return;
        if (res.error) { 
          setError(res.error.message); 
          setData(null); 
        } else { 
          setData(res.data ?? null); 
        }
      } catch (e: any) {
        if (!ac.signal.aborted) { 
          setError(e.message || String(e)); 
          setData(null); 
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [userId]);

  return { data, error, loading };
}