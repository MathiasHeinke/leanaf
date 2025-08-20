import { useEffect, useState, useRef, useCallback } from "react";
import { loadTodaysFluids } from "@/data/queries";
import { todayRangeISO, withWatchdog } from "@/utils/timeRange";
import { useAuth } from "@/hooks/useAuth";
import { runThrottled } from "@/lib/request-queue";
import { useDataRefresh } from "@/hooks/useDataRefresh";
import { toModernFluid, type FluidModern } from "@/ares/adapters/fluids";

const FLUIDS_TTL = 5000; // 5s cache TTL

type FluidsCacheEntry = { data: any[]; error: string | null; ts: number; hash: string };
const fluidsCache = new Map<string, FluidsCacheEntry>();
const fluidsInflight = new Map<string, Promise<void>>();

export function useTodaysFluids() {
  const [data, setData] = useState<FluidModern[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const acRef = useRef<AbortController | null>(null);
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    // Cancel any previous in-flight work for this hook instance
    if (acRef.current) acRef.current.abort();
    const ac = new AbortController();
    acRef.current = ac;

    const { start } = todayRangeISO();
    const key = `${user.id}:${start}`;
    const now = Date.now();

    // 1) Serve fresh cache immediately
    const cached = fluidsCache.get(key);
    if (cached && now - cached.ts < FLUIDS_TTL) {
      if (ac.signal.aborted) return;
      setError(cached.error);
      setData(cached.data);
      setLoading(false);
      return;
    }

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

        const legacyList = res.data ?? [];
        // Convert to modern shape using adapter
        const modernList = legacyList.map((fluid: any) => toModernFluid(fluid));
        const hash = JSON.stringify(legacyList.map((f: any) => [f.id ?? f.created_at ?? f.date, f.amount_ml, f.created_at ?? f.date]));
        const prevHash = cached?.hash;

        fluidsCache.set(key, { data: modernList, error: null, ts: Date.now(), hash });

        // Only update state if changed to prevent unnecessary re-renders
        if (hash !== prevHash) {
          setData(modernList);
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
  }, [user?.id, todayRangeISO().start]);

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