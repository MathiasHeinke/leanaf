import React, { useMemo, useState } from 'react';
import type { TraceBundle } from '@/lib/traceTypes';
import { JsonPanel } from './JsonPanel';

const statusToDot = (status: 'OK' | 'RUNNING' | 'ERROR', latency?: number | null) => {
  if (status === 'ERROR') return 'bg-red-500';
  if (status === 'RUNNING') return 'bg-yellow-500';
  if ((latency ?? 0) >= 2000) return 'bg-yellow-500';
  return 'bg-green-500';
};

export function TraceFlow({ bundle }: { bundle: TraceBundle }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const stages = useMemo(() => bundle.stages, [bundle.stages]);

  return (
    <div className="w-full">
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stages.map((s, idx) => (
          <button
            key={`${s.stage}-${idx}`}
            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
            className="relative rounded-xl border bg-background p-3 text-left shadow-sm transition hover:shadow"
            title={`${s.stage} • ${s.status}${s.latency_ms != null ? ` • ${s.latency_ms}ms` : ''}`}
          >
            <div className="absolute right-2 top-2 h-2 w-2 rounded-full shadow" aria-hidden>
              <span className={`block h-2 w-2 rounded-full ${statusToDot(s.status, s.latency_ms)}`} />
            </div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.stage}</div>
            <div className="text-sm font-medium">{s.handler ?? '—'}</div>
            {s.latency_ms != null && (
              <div className="mt-1 text-xs text-muted-foreground">{s.latency_ms} ms</div>
            )}
            <div className="mt-1 text-[10px] text-muted-foreground">{new Date(s.at).toLocaleTimeString()}</div>
          </button>
        ))}
      </div>

      {openIdx != null && (
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Details: {stages[openIdx].stage}</div>
            <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setOpenIdx(null)}>
              schließen
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <JsonPanel data={stages[openIdx].row.payload_json ?? {}} />
            <JsonPanel data={stages[openIdx].row.error_message ?? '—'} />
            <JsonPanel data={stages[openIdx].row} />
          </div>
        </div>
      )}
    </div>
  );
}
