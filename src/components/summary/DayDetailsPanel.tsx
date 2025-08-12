import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { JsonPanel } from '@/components/gehirn/JsonPanel';
import { useIndexSnapshot } from '@/hooks/useIndexSnapshot';

function toDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  // Treat as UTC naive date to avoid TZ shifts
  return new Date(Date.UTC(y, m - 1, day));
}

export function DayDetailsPanel({ date }: { date: string | null }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any | null>(null);

  const dateObj = useMemo(() => (date ? toDate(date) : null), [date]);
  const { meals, todayMl, loading: inputsLoading } = useIndexSnapshot(dateObj || new Date());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id || !date) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('daily_summaries')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', date)
          .maybeSingle();
        if (error) throw error;
        if (!cancelled) setSummary(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Fehler beim Laden');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id, date]);

  if (!date) {
    return (
      <aside className="rounded-2xl border bg-muted/30 p-6">
        <h2 className="text-base font-semibold mb-1">Tagesdetails</h2>
        <p className="text-sm text-muted-foreground">Klicke links auf einen Tag, um Details anzuzeigen.</p>
      </aside>
    );
  }

  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border bg-muted/30 p-4">
        <header className="mb-2">
          <h2 className="text-base font-semibold">Tagesdetails: {date}</h2>
          {loading && <p className="text-sm text-muted-foreground">Lade Zusammenfassung…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </header>
        {summary && (
          <div className="space-y-4">
            {summary.summary_text && (
              <article className="rounded-xl border p-3">
                <h3 className="text-sm font-medium mb-2">Zusammenfassung (Text)</h3>
                <p className="text-sm whitespace-pre-wrap">{summary.summary_text}</p>
              </article>
            )}
            <article className="rounded-xl border p-3">
              <h3 className="text-sm font-medium mb-2">Strukturierte Daten (JSON)</h3>
              <JsonPanel data={summary.summary_struct_json || summary} maxHeight={240} />
            </article>
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-muted/30 p-4">
        <h3 className="text-base font-semibold mb-2">Eingangsdaten</h3>
        {inputsLoading ? (
          <p className="text-sm text-muted-foreground">Lade Eingaben…</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Getränke</span>
              <span className="text-sm font-medium">{todayMl} ml</span>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1">Mahlzeiten ({meals.length})</h4>
              <div className="space-y-2 max-h-48 overflow-auto">
                {meals.length === 0 && (
                  <p className="text-sm text-muted-foreground">Keine Einträge.</p>
                )}
                {meals.map((m) => (
                  <div key={m.id} className="rounded border p-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{m.title}</span>
                      <span className="font-mono">{Math.round(m.kcal)} kcal</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      P {Math.round(m.protein)}g · C {Math.round(m.carbs)}g · F {Math.round(m.fat)}g
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
