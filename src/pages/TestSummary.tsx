import React, { useState } from 'react';
import SummaryGenerator from '@/components/SummaryGenerator';
import { DebugConsole, DebugEvent } from '@/components/debug/DebugConsole';
import { RequestInspector } from '@/components/debug/RequestInspector';
import { DayDetailsPanel } from '@/components/summary/DayDetailsPanel';
import SEO from '@/components/SEO';

const TestSummaryPage = () => {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [lastRequest, setLastRequest] = useState<any | null>(null);
  const [lastResponse, setLastResponse] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handleDebug = (e: DebugEvent) => setEvents((prev) => [e, ...prev].slice(0, 200));
  const clearEvents = () => setEvents([]);

  return (
    <>
      <SEO
        title="XL-Summary Test & Debug"
        description="Interaktive XL-Summary Generierung mit Debug-Konsole und Request-Inspector."
        canonical="/test-summary"
      />
      <div className="container mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">XL-Summary Test & Debug</h1>
          <p className="text-muted-foreground">Teste die neue XL-Summary Generation und sieh dir Details & Logs an.</p>
        </header>
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <SummaryGenerator
              onDebug={handleDebug}
              onRequest={(p) => {
                setLastRequest(p);
                handleDebug({ ts: Date.now(), level: 'debug', message: 'ui:request:set', data: p });
              }}
              onResponse={(r) => {
                setLastResponse(r);
                handleDebug({ ts: Date.now(), level: r.error ? 'error' : 'info', message: 'ui:response:set', data: r });
              }}
              onSelectDate={(d) => {
                setSelectedDate(d);
                handleDebug({ ts: Date.now(), level: 'info', message: 'ui:select:date', data: { date: d } });
              }}
            />
            <div className="mt-6">
              <RequestInspector request={lastRequest} response={lastResponse} />
            </div>
          </section>

          <DayDetailsPanel date={selectedDate} />
        </main>

        <div className="mt-6">
          <DebugConsole events={events} onClear={clearEvents} />
        </div>
      </div>
    </>
  );
};

export default TestSummaryPage;