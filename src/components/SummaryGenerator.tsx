import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Calendar, TrendingUp, Target } from 'lucide-react';

type SummaryGeneratorProps = {
  onDebug?: (event: { ts: number; level: 'info' | 'warn' | 'error' | 'debug'; message: string; data?: any }) => void;
  onRequest?: (payload: any) => void;
  onResponse?: (resp: { data: any; error: any }) => void;
  onSelectDate?: (date: string) => void;
};

const SummaryGenerator = ({ onDebug, onRequest, onResponse, onSelectDate }: SummaryGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [report, setReport] = useState<any | null>(null);
  const [currentRange, setCurrentRange] = useState<number>(14);
  const { toast } = useToast();

  const loadReport = async (days: number, userId: string) => {
    setIsLoadingReport(true);
    onDebug?.({ ts: Date.now(), level: 'debug', message: 'report:load:start', data: { days } });
    const payload = { userId, days };
    onRequest?.(payload);
    try {
      const { data, error } = await supabase.functions.invoke('daily-summary-report', { body: payload });
      onResponse?.({ data, error });
      if (error) throw error;
      setReport(data);
      onDebug?.({ ts: Date.now(), level: 'info', message: 'report:load:done', data: { count: data?.report?.length || 0 } });
    } catch (err: any) {
      onDebug?.({ ts: Date.now(), level: 'error', message: 'report:load:error', data: { message: err?.message || String(err) } });
      toast({ title: 'Report-Fehler', description: 'Report konnte nicht geladen werden', variant: 'destructive' });
    } finally {
      setIsLoadingReport(false);
    }
  };

  const regenerateSingleDay = async (date: string, userId: string) => {
    onDebug?.({ ts: Date.now(), level: 'debug', message: 'single:generate:start', data: { date } });
    const payload = { userId, date, force: true, text: false };
    onRequest?.(payload);
    const { data, error } = await supabase.functions.invoke('generate-day-summary-v2', { body: payload });
    onResponse?.({ data, error });
    if (error) {
      onDebug?.({ ts: Date.now(), level: 'error', message: 'single:generate:error', data: { error } });
      toast({ title: 'Fehler', description: `Tag ${date} konnte nicht neu berechnet werden`, variant: 'destructive' });
      return false;
    }
    onDebug?.({ ts: Date.now(), level: 'info', message: 'single:generate:done', data: { date } });
    return true;
  };

  const viewReportOnly = async (days: number = 14) => {
    setCurrentRange(days);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      onDebug?.({ ts: Date.now(), level: 'warn', message: 'auth:missing' });
      toast({ title: 'Fehler', description: 'Du musst angemeldet sein', variant: 'destructive' });
      return;
    }
    await loadReport(days, user.id);
  };

  const generateSummaries = async (daysBack: number = 14, forceUpdate: boolean = false) => {
    try {
      setIsGenerating(true);
      setCurrentRange(daysBack);
      onDebug?.({ ts: Date.now(), level: 'info', message: 'backfill:start', data: { days: daysBack, forceUpdate } });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        onDebug?.({ ts: Date.now(), level: 'warn', message: 'auth:missing' });
        toast({ title: 'Fehler', description: 'Du musst angemeldet sein', variant: 'destructive' });
        return;
      }

      toast({ title: 'Backfill wird ausgelöst…', description: `Letzte ${daysBack} Tage`, });

      const payload = { userId: user.id, days: daysBack };
      onRequest?.(payload);
      onDebug?.({ ts: Date.now(), level: 'debug', message: 'invoke:trigger-backfill', data: payload });
      const { data, error } = await supabase.functions.invoke('trigger-backfill', { body: payload });
      onResponse?.({ data, error });
      if (error) throw error;
      onDebug?.({ ts: Date.now(), level: 'info', message: 'backfill:requested', data });

      // Load report right after triggering backfill
      await loadReport(daysBack, user.id);
    } catch (error: any) {
      console.error('Backfill error:', error);
      onDebug?.({ ts: Date.now(), level: 'error', message: 'backfill:error', data: { error: error?.message || String(error) } });
      toast({ title: 'Fehler', description: 'Backfill fehlgeschlagen', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
      onDebug?.({ ts: Date.now(), level: 'debug', message: 'backfill:finally', data: { isGenerating: false } });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            XL-Memory Summary Generator
          </CardTitle>
          <CardDescription>
            Erstellt detaillierte tägliche Zusammenfassungen (240 Wörter) aller deiner Fitness- und Ernährungsdaten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button 
              onClick={() => generateSummaries(7)}
              disabled={isGenerating}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Letzte 7 Tage
            </Button>
            
            <Button 
              onClick={() => generateSummaries(14)}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              <Target className="h-4 w-4" />
              {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
              Letzte 2 Wochen
            </Button>
            
            <Button 
              onClick={() => generateSummaries(30)}
              disabled={isGenerating}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Letzter Monat
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              onClick={() => viewReportOnly(currentRange)}
              disabled={isGenerating || isLoadingReport}
              variant="secondary"
              className="w-full"
            >
              📊 Nur Report laden ({currentRange} Tage)
            </Button>
            <Button 
              onClick={() => generateSummaries(currentRange, true)}
              disabled={isGenerating}
              variant="secondary"
              className="w-full"
            >
              🔄 Force Backfill ({currentRange} Tage)
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle>Report</CardTitle>
            <CardDescription>
              Zeitraum: {report?.range?.startDate} – {report?.range?.endDate} ({currentRange} Tage)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingReport && (
              <div className="mb-3 text-sm text-muted-foreground">Report wird geladen…</div>
            )}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {report.report?.map((r: any) => (
                <div
                  key={r.date}
                  onClick={async (e) => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (e.ctrlKey && user) {
                      const ok = await regenerateSingleDay(r.date, user.id);
                      if (ok) await loadReport(currentRange, user.id);
                      return;
                    }
                    onSelectDate?.(r.date);
                  }}
                  className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted/50"
                  title="Klick: Details öffnen · Ctrl-Klick: Tag neu berechnen"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{r.date}</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(r.nutrition.calories)} kcal · {Math.round(r.training.volume_kg)} kg · {Math.round(r.hydration.total_ml)} ml · {r.sleep.sleep_score ?? '-'} sleep
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {!r.summary_present && <Badge variant="secondary">no summary</Badge>}
                    {r.nutrition.calories <= 0 && <Badge variant="outline">nutrition</Badge>}
                    {(r.training.sets_count <= 0 && r.training.volume_kg <= 0) && <Badge variant="outline">training</Badge>}
                    {r.hydration.total_ml <= 0 && <Badge variant="outline">hydration</Badge>}
                    {!r.sleep.has_entry && <Badge variant="outline">sleep</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default SummaryGenerator;