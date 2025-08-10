import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TraceBundle, TraceRow } from '@/lib/traceTypes';
import { aggregateTrace } from '@/lib/traceTypes';

export type TraceFilters = {
  coachId?: string;
  userId?: string;
  since?: string; // ISO start
  until?: string; // ISO end
  limit?: number; // default 500 rows
};

type State = {
  rows: TraceRow[];
  bundles: TraceBundle[];
  isLoading: boolean;
  error: string | null;
};

const MAX_BUNDLES = 200;
const REALTIME_CHANNEL = 'traces';

export function useTraceFeed(initialFilters: TraceFilters) {
  const [filters, setFilters] = useState<TraceFilters>(initialFilters);
  const [state, setState] = useState<State>({ rows: [], bundles: [], isLoading: true, error: null });
  const seenIdsRef = useRef<Set<number>>(new Set());
  const debounceTimer = useRef<number | null>(null);
  const rtConnected = useRef<boolean>(false);
  const lastReloadAt = useRef<number>(0);

  const buildQuery = useCallback(() => {
    let query = supabase.from('orchestrator_traces').select('*');
    if (filters.since) query = query.gte('timestamp', filters.since);
    if (filters.until) query = query.lte('timestamp', filters.until);
    if (filters.coachId) query = query.eq('coach_id', filters.coachId);
    if (filters.userId) query = query.eq('user_id', filters.userId);
    query = query.order('timestamp', { ascending: false }).limit(filters.limit ?? 500);
    return query;
  }, [filters.coachId, filters.userId, filters.since, filters.until, filters.limit]);

  const recomputeBundles = useCallback((rows: TraceRow[]) => {
    const grouped = new Map<string, TraceRow[]>();
    for (const r of rows) {
      const key = String(r.trace_id);
      const arr = grouped.get(key) ?? [];
      arr.push(r);
      grouped.set(key, arr);
    }
    const bundles: TraceBundle[] = [];
    for (const [_, arr] of grouped) {
      bundles.push(aggregateTrace(arr));
    }
    bundles.sort((a, b) => new Date(b.lastEventAt).getTime() - new Date(a.lastEventAt).getTime());
    return bundles.slice(0, MAX_BUNDLES);
  }, []);

  const setRowsDebounced = useCallback((updater: (prev: TraceRow[]) => TraceRow[]) => {
    setState((prev) => ({ ...prev, isLoading: false }));
    setState((prev) => ({ ...prev, rows: updater(prev.rows) }));
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      setState((prev) => ({ ...prev, bundles: recomputeBundles(prev.rows) }));
    }, 100);
  }, [recomputeBundles]);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const { data, error } = await buildQuery();
    lastReloadAt.current = Date.now();
    if (error) {
      setState((prev) => ({ ...prev, isLoading: false, error: error.message }));
      return;
    }
    const rows = (data as any as TraceRow[]) ?? [];
    const ids = new Set<number>();
    for (const r of rows) ids.add(r.id);
    seenIdsRef.current = ids;
    setState({ rows, bundles: recomputeBundles(rows), isLoading: false, error: null });
  }, [buildQuery, recomputeBundles]);

  // Initial load + when filters change
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel(REALTIME_CHANNEL);
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orchestrator_traces' }, (payload) => {
      const row = payload.new as TraceRow;
      // client-side filter guard
      if (filters.coachId && row.coach_id !== filters.coachId) return;
      if (filters.userId && row.user_id !== filters.userId) return;
      if (filters.since && new Date(row.timestamp).getTime() < new Date(filters.since).getTime()) return;
      if (filters.until && new Date(row.timestamp).getTime() > new Date(filters.until).getTime()) return;

      if (seenIdsRef.current.has(row.id)) return; // dedupe
      seenIdsRef.current.add(row.id);

      setRowsDebounced((prev) => [row, ...prev].slice(0, (filters.limit ?? 500)));
    });

    channel.subscribe((status) => {
      rtConnected.current = status === 'SUBSCRIBED';
      // If just subscribed after long time, consider refreshing
      if (rtConnected.current && Date.now() - lastReloadAt.current > 15_000) {
        refresh();
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters.coachId, filters.userId, filters.since, filters.until, filters.limit, setRowsDebounced, refresh]);

  // Fallback polling every 5s when not connected
  useEffect(() => {
    const interval = window.setInterval(async () => {
      if (rtConnected.current) return;
      // fetch last minute as lightweight fallback
      const since = new Date(Date.now() - 60_000).toISOString();
      let query = supabase.from('orchestrator_traces').select('*').gte('timestamp', since).order('timestamp', { ascending: false }).limit(200);
      if (filters.coachId) query = query.eq('coach_id', filters.coachId);
      if (filters.userId) query = query.eq('user_id', filters.userId);
      const { data, error } = await query;
      if (error) return;
      const fresh = (data as any as TraceRow[]) ?? [];
      if (!fresh.length) return;
      const toAdd = fresh.filter((r) => !seenIdsRef.current.has(r.id));
      if (!toAdd.length) return;
      for (const r of toAdd) seenIdsRef.current.add(r.id);
      setRowsDebounced((prev) => [...toAdd, ...prev].slice(0, (filters.limit ?? 500)));
    }, 5000);
    return () => window.clearInterval(interval);
  }, [filters.coachId, filters.userId, filters.limit, setRowsDebounced]);

  const value = useMemo(() => ({
    bundles: state.bundles,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
    setFilters,
  }), [state.bundles, state.isLoading, state.error, refresh]);

  return value;
}
