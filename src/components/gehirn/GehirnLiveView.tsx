import React, { useMemo, useState } from 'react';
import { useTraceFeed, type TraceFilters } from '@/hooks/useTraceFeed';
import type { TraceBundle } from '@/lib/traceTypes';
import { TraceFlow } from '@/components/gehirn/TraceFlow';
import { AresFlowChart } from '@/components/gehirn/AresFlowChart';
import { PromptViewer } from '@/components/gehirn/PromptViewer';
import { usePromptTraceData } from '@/hooks/usePromptTraceData';
import { Eye, BarChart3, Brain } from 'lucide-react';

export function GehirnLiveView() {
  const [coachId, setCoachId] = useState('');
  const [userId, setUserId] = useState('');
  const [range, setRange] = useState<'5m' | '1h' | '12h' | '24h'>('1h');
  const [selectedBundle, setSelectedBundle] = useState<TraceBundle | null>(null);
  const [viewMode, setViewMode] = useState<'classic' | 'flowchart' | 'prompt'>('classic');
  const [promptTraceId, setPromptTraceId] = useState<string | null>(null);

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
  const { promptData, loading: promptLoading } = usePromptTraceData(promptTraceId);

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
        <div className="flex items-center gap-1 border rounded-lg">
          <button 
            onClick={() => setViewMode('classic')}
            className={`px-3 py-1.5 text-sm transition ${viewMode === 'classic' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
          >
            <BarChart3 className="h-3 w-3" />
          </button>
          <button 
            onClick={() => setViewMode('flowchart')}
            className={`px-3 py-1.5 text-sm transition ${viewMode === 'flowchart' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
          >
            <Eye className="h-3 w-3" />
          </button>
          <button 
            onClick={() => setViewMode('prompt')}
            className={`px-3 py-1.5 text-sm rounded-r-lg transition ${viewMode === 'prompt' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
          >
            <Brain className="h-3 w-3" />
          </button>
        </div>
      </header>

      {isLoading && <div className="text-sm text-muted-foreground">Lade…</div>}
      {error && <div className="text-sm text-destructive">{error}</div>}

      {/* ARES Flowchart View */}
      {viewMode === 'flowchart' && (
        <section className="space-y-4">
          <div className="rounded-2xl border p-4">
            <h2 className="text-lg font-semibold mb-4">🧠 ARES Gehirn - Flowchart View</h2>
            <AresFlowChart 
              bundle={selectedBundle} 
              isLive={selectedBundle?.agg.running || false}
              onShowPrompt={(traceId) => {
                setPromptTraceId(traceId);
                setViewMode('prompt');
              }}
            />
          </div>
          
          <div className="rounded-2xl border p-4">
            <h3 className="text-md font-semibold mb-3">Traces auswählen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {bundles.slice(0, 12).map((b: TraceBundle) => (
                <button
                  key={b.traceId}
                  onClick={() => setSelectedBundle(b)}
                  className={`p-3 rounded-lg border text-left transition ${
                    selectedBundle?.traceId === b.traceId 
                      ? 'border-primary bg-primary/10' 
                      : 'hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block h-2 w-2 rounded-full ${b.agg.status === 'green' ? 'bg-green-500' : b.agg.status === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                    <div className="text-sm font-medium">Trace {b.traceId.slice(0, 8)}…</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(b.startedAt).toLocaleTimeString()} • {b.stages.length} Schritte
                    {b.hasPromptData && <span className="ml-2 text-blue-500">🧠</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    User: {b.userId?.slice(0, 8) ?? '—'} · Coach: {b.coachId ?? '—'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Prompt Analysis View */}
      {viewMode === 'prompt' && (
        <section className="space-y-4">
          {promptData && promptTraceId ? (
            <PromptViewer 
              data={promptData} 
              onClose={() => {
                setPromptTraceId(null);
                setViewMode('classic');
              }}
            />
          ) : (
            <div className="rounded-2xl border p-4">
              <h3 className="text-md font-semibold mb-3">Prompt-Analyse: Trace auswählen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {bundles.filter(bundle => bundle.hasPromptData).map((b: TraceBundle) => (
                  <button
                    key={b.traceId}
                    onClick={() => setPromptTraceId(b.traceId)}
                    className="p-3 rounded-lg border text-left hover:bg-accent transition"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block h-2 w-2 rounded-full ${b.agg.status === 'green' ? 'bg-green-500' : b.agg.status === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                      <div className="text-sm font-medium">Trace {b.traceId.slice(0, 8)}…</div>
                      <span className="text-blue-500">🧠</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(b.startedAt).toLocaleTimeString()} • Prompt verfügbar
                    </div>
                    <div className="text-xs text-muted-foreground">
                      User: {b.userId?.slice(0, 8) ?? '—'} · Coach: {b.coachId ?? '—'}
                    </div>
                  </button>
                ))}
                {bundles.filter(bundle => bundle.hasPromptData).length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    Keine Traces mit Prompt-Daten im gewählten Zeitraum gefunden.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Classic View */}
      {viewMode === 'classic' && (
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
      )}
    </div>
  );
}
