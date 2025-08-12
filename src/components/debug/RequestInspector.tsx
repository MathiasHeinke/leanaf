import React from 'react';
import { JsonPanel } from '@/components/gehirn/JsonPanel';

export function RequestInspector({ request, response }: { request: any | null; response: any | null }) {
  return (
    <section className="rounded-2xl border bg-muted/30 p-4 space-y-4">
      <header>
        <h2 className="text-base font-semibold">Request Inspector</h2>
        <p className="text-sm text-muted-foreground">Zeigt den letzten Payload und die Roh-Antwort der Funktion.</p>
      </header>

      <div>
        <h3 className="mb-2 text-sm font-medium">Letzter Request</h3>
        {request ? (
          <JsonPanel data={request} maxHeight={180} />
        ) : (
          <p className="text-sm text-muted-foreground">Noch kein Request ausgeführt.</p>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Letzte Response</h3>
        {response ? (
          <JsonPanel data={response} maxHeight={240} />
        ) : (
          <p className="text-sm text-muted-foreground">Noch keine Response verfügbar.</p>
        )}
      </div>
    </section>
  );
}
