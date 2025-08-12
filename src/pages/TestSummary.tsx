
import React, { useState } from 'react';
import SummaryGenerator from '@/components/SummaryGenerator';
import { DebugConsole, DebugEvent } from '@/components/debug/DebugConsole';
import { RequestInspector } from '@/components/debug/RequestInspector';
import { DayDetailsPanel } from '@/components/summary/DayDetailsPanel';
import { WeeklySummarySection } from '@/components/summary/WeeklySummarySection';
import { MonthlySummarySection } from '@/components/summary/MonthlySummarySection';
import SEO from '@/components/SEO';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
        title="Summary Test & Debug Dashboard"
        description="Comprehensive testing environment for daily, weekly, and monthly summary generation with debug capabilities."
        canonical="/test-summary"
      />
      <div className="container mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Summary Test & Debug Dashboard</h1>
          <p className="text-muted-foreground">Test and debug daily, weekly, and monthly summary generation systems.</p>
        </header>

        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="daily">Daily Summaries</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Summaries</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Summaries</TabsTrigger>
            <TabsTrigger value="debug">Debug Console</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-6">
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
            
            <RequestInspector request={lastRequest} response={lastResponse} />
            <DayDetailsPanel date={selectedDate} />
          </TabsContent>

          <TabsContent value="weekly" className="space-y-6">
            <WeeklySummarySection />
          </TabsContent>

          <TabsContent value="monthly" className="space-y-6">
            <MonthlySummarySection />
          </TabsContent>

          <TabsContent value="debug" className="space-y-6">
            <DebugConsole events={events} onClear={clearEvents} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default TestSummaryPage;
