import React from 'react';

export type DebugEvent = {
  ts: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
};

type Props = {
  events: DebugEvent[];
  onClear?: () => void;
};

export function DebugConsole({ events, onClear }: Props) {
  return (
    <section className="rounded-2xl border bg-muted/30 p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Debug Console</h2>
        <button
          type="button"
          onClick={onClear}
          className="text-sm underline-offset-2 hover:underline"
        >
          Leeren
        </button>
      </header>
      <div className="max-h-72 overflow-auto space-y-2">
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground">Noch keine Debug-Ereignisse.</p>
        )}
        {events.map((e, i) => (
          <div key={i} className="rounded-md border p-2">
            <div className="mb-1 flex items-center gap-2 text-xs">
              <span className="font-mono opacity-70">
                {new Date(e.ts).toLocaleTimeString('de-DE')}
              </span>
              <span className="uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-foreground/80">
                {e.level}
              </span>
              <span className="font-medium">{e.message}</span>
            </div>
            {e.data !== undefined && (
              <pre className="text-xs overflow-auto leading-5">
                {(() => {
                  try { return JSON.stringify(e.data, null, 2); } catch { return String(e.data); }
                })()}
              </pre>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
