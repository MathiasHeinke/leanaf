import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { loadTodaysFluids } from "@/data/queries";
import { todayRangeISO, withWatchdog } from "@/utils/timeRange";
import { useAuth } from "@/hooks/useAuth";
import { runThrottled } from "@/lib/request-queue";
import { useDataRefresh } from "@/hooks/useDataRefresh";

const FLUIDS_TTL = 5000; // 5s cache TTL

type FluidsCacheEntry = { data: any[]; error: string | null; ts: number; hash: string };
const fluidsCache = new Map<string, FluidsCacheEntry>();
const fluidsInflight = new Map<string, Promise<void>>();

// Export cache clearing function for external use
export const clearFluidsCache = () => {
  console.log('[FLUIDS] Clearing cache, entries:', fluidsCache.size);
  fluidsCache.clear();
  fluidsInflight.clear();
};

export function useTodaysFluids() {
  const [data, setData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const acRef = useRef<AbortController | null>(null);
  const { user } = useAuth();

  // Stable today start to prevent unnecessary re-renders
  const todayStart = useMemo(() => todayRangeISO().start, []);
  
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    // Cancel any previous in-flight work for this hook instance
    if (acRef.current) acRef.current.abort();
    const ac = new AbortController();
    acRef.current = ac;

    const key = `${user.id}:${todayStart}`;
    const now = Date.now();

    // 1) Serve fresh cache immediately
    const cached = fluidsCache.get(key);
    if (cached && now - cached.ts < FLUIDS_TTL) {
      if (ac.signal.aborted) return;
      console.log('[FLUIDS] Cache hit:', { key, dataLength: cached.data.length, hash: cached.hash });
      setError(cached.error);
      setData(cached.data);
      setLoading(false);
      return;
    }

    console.log('[FLUIDS] Cache miss, loading fresh data:', { key, cached: !!cached });

    setLoading(true);
    setError(null);

    const loadTask = async () => {
      try {
        const query = loadTodaysFluids(user.id);
        const res = await withWatchdog(query, 6000);
        if (ac.signal.aborted) return;

        if (res.error) {
          const entry: FluidsCacheEntry = { data: [], error: res.error.message, ts: Date.now(), hash: 'err' };
          fluidsCache.set(key, entry);
          setError(res.error.message);
          setData([]);
          return;
        }

        const list = res.data ?? [];
        
        // Improved hash calculation with all relevant fields, sorted for consistency
        const sortedList = [...list].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
        const hash = JSON.stringify(sortedList.map((f: any) => [
          f.id,
          f.amount_ml,
          f.consumed_at || f.created_at,
          f.fluid_id,
          f.custom_name,
          f.notes
        ]));
        const prevHash = cached?.hash;

        fluidsCache.set(key, { data: list, error: null, ts: Date.now(), hash });
        console.log('[FLUIDS] Cache updated:', { 
          key, 
          dataLength: list.length, 
          newHash: hash.substring(0, 50) + '...', 
          prevHash: prevHash?.substring(0, 50) + '...',
          hashChanged: hash !== prevHash 
        });

        // Only update state if changed to prevent unnecessary re-renders
        if (hash !== prevHash) {
          console.log('[FLUIDS] State updated due to hash change');
          setData(list);
        } else {
          console.log('[FLUIDS] State NOT updated - hash unchanged');
        }
        setError(null);
      } catch (e: any) {
        if (!ac.signal.aborted) {
          setError(e.message || String(e));
          setData([]);
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    };

    // 2) De-duplicate concurrent fetches for the same key
    if (fluidsInflight.has(key)) {
      await fluidsInflight.get(key);
      return;
    }

    const p = runThrottled(loadTask);
    fluidsInflight.set(key, p);
    await p.finally(() => {
      fluidsInflight.delete(key);
    });
  }, [user?.id, todayStart]);

  // Initial and dependency-based load
  useEffect(() => {
    fetchData();
    return () => {
      acRef.current?.abort();
    };
  }, [fetchData]);

  // Respond to global data refresh events (e.g., after adding a drink)
  useDataRefresh(fetchData);


  return { data, error, loading };
}