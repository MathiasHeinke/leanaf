import { useEffect, useState, useRef } from "react";
import { loadTodaysFluids } from "@/data/queries";
import { todayRangeISO, withWatchdog } from "@/utils/timeRange";

export function useTodaysFluids(userId?: string) {
  const [data, setData] = useState<any[] | null>(null);
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
        const query = loadTodaysFluids(userId);
        const res = await withWatchdog(query, 6000);
        if (ac.signal.aborted) return;
        if (res.error) { 
          setError(res.error.message); 
          setData([]); 
        } else { 
          setData(res.data ?? []); 
        }
      } catch (e: any) {
        if (!ac.signal.aborted) { 
          setError(e.message || String(e)); 
          setData([]); 
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [userId, todayRangeISO().start]);

  return { data, error, loading };
}