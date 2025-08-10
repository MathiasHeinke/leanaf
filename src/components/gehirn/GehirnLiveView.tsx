import React, { useMemo, useState } from 'react';
import { useTraceFeed, type TraceFilters } from '@/hooks/useTraceFeed';
import type { TraceBundle } from '@/lib/traceTypes';
import { TraceFlow } from '@/components/gehirn/TraceFlow';

export function GehirnLiveView() {
  const [coachId, setCoachId] = useState('');
  const [userId, setUserId] = useState('');
  const [range, setRange] = useState<'5m' | '1h' | '12h' | '24h'>('1h');

  const now = new Date();
  const since = useMemo(() => {
    const d = new Date(now);
    const map: Record<typeof range, number> = { '5m': 5, '1h': 60, '12h': 720, '24h': 1440 } as const;
    d.setMinutes(d.getMinutes() - map[range]);
    return d.toISOString();
  }, [now, range]);

  const filters: TraceFilters = useMemo(() => ({
    coachId: coachId || undefined,
    userId: userId || undefined,
    since,
    limit: 500,
  }), [coachId, userId, since]);

  const { bundles, isLoading, error, refresh } = useTraceFeed(filters);

  const coachOptions = useMemo(() => Array.from(new Set(bundles.map(b => b.coachId).filter(Boolean))) as string[], [bundles]);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <header className="mb-6 flex flex-wrap items-end gap-3">
        <h1 className="mr-auto text-2xl font-bold">🧠 Gehirn – Live Orchestrator</h1>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Coach</label>
          <select value={coachId} onChange={(e) => setCoachId(e.target.value)} className="rounded-lg border bg-background px-2 py-1 text-sm">
            <option value="">Alle</option>
            {coachOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">User ID</label>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="uuid…" className="w-56 rounded-lg border bg-background px-2 py-1 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Zeitraum</label>
          <select value={range} onChange={(e) => setRange(e.target.value as any)} className="rounded-lg border bg-background px-2 py-1 text-sm">
            <option value="5m">5 Min</option>
            <option value="1h">1 Std</option>
            <option value="12h">12 Std</option>
            <option value="24h">24 Std</option>
          </select>
        </div>
        <button onClick={refresh} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent">Reload</button>
      </header>

      {isLoading && <div className="text-sm text-muted-foreground">Lade…</div>}
      {error && <div className="text-sm text-destructive">{error}</div>}

      <section className="space-y-4">
        {bundles.map((b: TraceBundle) => (
          <article key={b.traceId} className="rounded-2xl border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${b.agg.status === 'green' ? 'bg-green-500' : b.agg.status === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <div className="text-sm font-semibold">Trace {b.traceId.slice(0, 8)}…</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(b.startedAt).toLocaleTimeString()} → {new Date(b.lastEventAt).toLocaleTimeString()} • max {b.agg.maxLatencyMs} ms
                </div>
              </div>
              <div className="text-xs text-muted-foreground">User: {b.userId ?? '—'} · Coach: {b.coachId ?? '—'}</div>
            </div>
            <TraceFlow bundle={b} />
          </article>
        ))}
        {bundles.length === 0 && !isLoading && (
          <div className="rounded-2xl border p-10 text-center text-sm text-muted-foreground">
            Keine Traces im Zeitfenster. Starte eine Unterhaltung oder erweitere den Zeitraum.
          </div>
        )}
      </section>
    </div>
  );
}
