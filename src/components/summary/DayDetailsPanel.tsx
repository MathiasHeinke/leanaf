import React, { useEffect, useMemo, useState } from 'react';
import { format, startOfWeek, startOfMonth, differenceInCalendarDays, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { JsonPanel } from '@/components/gehirn/JsonPanel';
import { useIndexSnapshot } from '@/hooks/useIndexSnapshot';

function toDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  // Treat as UTC naive date to avoid TZ shifts
  return new Date(Date.UTC(y, m - 1, day));
}

function toISODate(dt: Date) {
  return format(dt, 'yyyy-MM-dd');
}

export function DayDetailsPanel({ date }: { date: string | null }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  
  // Extra context for coaches
  const [abstinence, setAbstinence] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [body, setBody] = useState<any | null>(null);
  const [wtd, setWtd] = useState<any | null>(null); // week-to-date
  const [mtd, setMtd] = useState<any | null>(null); // month-to-date
  const [trends14, setTrends14] = useState<any | null>(null);
  const [trends28, setTrends28] = useState<any | null>(null);

  const dateObj = useMemo(() => (date ? toDate(date) : new Date()), [date]);
  const { meals, todayMl, loading: inputsLoading } = useIndexSnapshot(dateObj);

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

  useEffect(() => {
    let cancelled = false;

    function aggregate(rows: any[]) {
      const days = rows.length;
      const totalCalories = rows.reduce((a, r) => a + (Number(r.total_calories) || 0), 0);
      const totalProtein = rows.reduce((a, r) => a + (Number(r.total_protein) || 0), 0);
      const totalVolume = rows.reduce((a, r) => a + (Number(r.workout_volume) || 0), 0);
      const workoutDays = rows.filter(r => (Number(r.workout_volume) || 0) > 0).length;
      return {
        days,
        totalCalories,
        totalProtein,
        totalVolume,
        workoutDays,
        avgCalories: days ? totalCalories / days : 0,
        avgProtein: days ? totalProtein / days : 0,
        avgVolume: days ? totalVolume / days : 0,
      };
    }

    async function loadExtras() {
      if (!user?.id || !dateObj) return;
      try {
        const dateStr = toISODate(dateObj);
        const weekStart = toISODate(startOfWeek(dateObj, { weekStartsOn: 1 }));
        const monthStart = toISODate(startOfMonth(dateObj));
        const start14 = toISODate(subDays(dateObj, 13));
        const start28 = toISODate(subDays(dateObj, 27));

        const [
          { data: abst, error: errA },
          { data: prof, error: errP },
          { data: bm, error: errB },
          { data: wtdRows, error: errW },
          { data: mtdRows, error: errM },
          { data: rows14, error: err14 },
          { data: rows28, error: err28 },
        ] = await Promise.all([
          supabase
            .from('user_alcohol_abstinence')
            .select('is_abstinent, abstinence_start_date')
            .eq('user_id', user.id)
            .order('abstinence_start_date', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('goal, weight, target_weight, height, age, target_body_fat_percentage')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('body_measurements')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('daily_summaries')
            .select('date,total_calories,total_protein,workout_volume')
            .eq('user_id', user.id)
            .gte('date', weekStart)
            .lte('date', dateStr),
          supabase
            .from('daily_summaries')
            .select('date,total_calories,total_protein,workout_volume')
            .eq('user_id', user.id)
            .gte('date', monthStart)
            .lte('date', dateStr),
          supabase
            .from('daily_summaries')
            .select('date,workout_volume')
            .eq('user_id', user.id)
            .gte('date', start14)
            .lte('date', dateStr),
          supabase
            .from('daily_summaries')
            .select('date,workout_volume')
            .eq('user_id', user.id)
            .gte('date', start28)
            .lte('date', dateStr),
        ]);

        if (!cancelled) {
          if (!errA) setAbstinence(abst || null);
          if (!errP) setProfile(prof || null);
          if (!errB) setBody(bm || null);
          if (!errW && Array.isArray(wtdRows)) setWtd(aggregate(wtdRows));
          if (!errM && Array.isArray(mtdRows)) setMtd(aggregate(mtdRows));
          if (!err14 && Array.isArray(rows14)) setTrends14(aggregate(rows14));
          if (!err28 && Array.isArray(rows28)) setTrends28(aggregate(rows28));
        }
      } catch (_e) {
        // ignore extras errors in debug view
      }
    }

    loadExtras();
    return () => { cancelled = true; };
  }, [user?.id, dateObj]);

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
            {(() => {
              const text =
                summary.summary_xl_md ||
                summary.summary_xxl_md ||
                summary.summary_md ||
                summary.summary_text;
              return text ? (
                <article className="rounded-xl border p-3">
                  <h3 className="text-sm font-medium mb-2">Zusammenfassung (Text)</h3>
                  <p className="text-sm whitespace-pre-wrap">{text}</p>
                </article>
              ) : null;
            })()}
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

      {/* Coach-Kontext: Ziele, Abstinenz, Körperdaten, Vergleiche, Trends */}
      <div className="rounded-2xl border bg-muted/30 p-4 space-y-4">
        <h3 className="text-base font-semibold mb-2">Coach-Kontext</h3>

        {/* Ziele */}
        <div className="rounded-xl border p-3">
          <h4 className="text-sm font-medium mb-1">Ziel</h4>
          <p className="text-sm text-muted-foreground">
            {(() => {
              const g = (profile?.goal || '').toLowerCase();
              if (g === 'both') return 'Fettabbau (KFA reduzieren) + Muskelaufbau';
              if (g === 'fat_loss' || g === 'cut' || g === 'abnehmen') return 'Fettabbau / KFA reduzieren';
              if (g === 'muscle_gain' || g === 'bulk' || g === 'aufbauen') return 'Muskelaufbau';
              return g ? g : 'Kein Ziel hinterlegt';
            })()}
          </p>
        </div>

        {/* Alkohol-Abstinenz */}
        <div className="rounded-xl border p-3">
          <h4 className="text-sm font-medium mb-1">Alkohol</h4>
          {abstinence?.is_abstinent && abstinence?.abstinence_start_date ? (
            <p className="text-sm">
              Kein Alkohol seit {new Date(abstinence.abstinence_start_date).toLocaleDateString('de-DE')} (
              {dateObj ? differenceInCalendarDays(dateObj, toDate(abstinence.abstinence_start_date)) : '—'} Tage)
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Kein Verzicht eingetragen.</p>
          )}
        </div>

        {/* Körperdaten */}
        <div className="rounded-xl border p-3">
          <h4 className="text-sm font-medium mb-1">Körperdaten</h4>
          {body ? (
            <div className="text-sm space-y-1">
              <div className="text-muted-foreground">
                Letzte Eintragung: {body.date ? new Date(body.date).toLocaleDateString('de-DE') : '—'}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {['weight','weight_kg','neck_cm','waist_cm','hip_cm','chest_cm','bicep_cm','thigh_cm'].map((k) => (
                  body[k] !== undefined ? (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-muted-foreground capitalize">{k.replace('_cm',' (cm)').replace('weight_kg','Gewicht (kg)').replace('weight','Gewicht')}</span>
                      <span className="font-medium">{body[k]}</span>
                    </div>
                  ) : null
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm">
              <p className="text-muted-foreground mb-1">
                Keine Körpermaße vorhanden.
              </p>
              <p className="font-medium">Daten müssen hinterlegt werden!</p>
            </div>
          )}
        </div>

        {/* Wochen-/Monatsvergleich */}
        <div className="rounded-xl border p-3">
          <h4 className="text-sm font-medium mb-2">Tag im Kontext</h4>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Heute</div>
              <div className="font-medium">{Math.round(summary?.total_calories || 0)} kcal</div>
              <div className="text-xs">Protein {Math.round(summary?.total_protein || 0)} g</div>
              <div className="text-xs">Volumen {Math.round(summary?.workout_volume || 0)} kg</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Woche ⌀</div>
              <div className="font-medium">{wtd ? Math.round(wtd.avgCalories) : '—'} kcal</div>
              <div className="text-xs">Protein {wtd ? Math.round(wtd.avgProtein) : '—'} g</div>
              <div className="text-xs">Volumen {wtd ? Math.round(wtd.avgVolume) : '—'} kg</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Monat ⌀</div>
              <div className="font-medium">{mtd ? Math.round(mtd.avgCalories) : '—'} kcal</div>
              <div className="text-xs">Protein {mtd ? Math.round(mtd.avgProtein) : '—'} g</div>
              <div className="text-xs">Volumen {mtd ? Math.round(mtd.avgVolume) : '—'} kg</div>
            </div>
          </div>
        </div>

        {/* Trainings-Trends */}
        <div className="rounded-xl border p-3">
          <h4 className="text-sm font-medium mb-2">Trainingstrends</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Letzte 14 Tage</div>
              <div className="font-medium">{trends14 ? trends14.workoutDays : '—'} Trainingstage</div>
              <div className="text-xs">Volumen {trends14 ? Math.round(trends14.totalVolume) : '—'} kg</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Letzte 28 Tage</div>
              <div className="font-medium">{trends28 ? trends28.workoutDays : '—'} Trainingstage</div>
              <div className="text-xs">Volumen {trends28 ? Math.round(trends28.totalVolume) : '—'} kg</div>
            </div>
          </div>
        </div>

        {/* Supplements (Namen falls vorhanden) */}
        {(() => {
          const supps = summary?.summary_struct_json?.supplements || summary?.kpi_xxl_json?.supplements;
          if (!supps || !Array.isArray(supps) || supps.length === 0) return null;
          const items = supps.map((s: any, i: number) => s.name || s.title || s.id || `Supplement ${i+1}`);
          return (
            <div className="rounded-xl border p-3">
              <h4 className="text-sm font-medium mb-1">Supplements</h4>
              <p className="text-sm text-muted-foreground">{items.join(', ')}</p>
            </div>
          );
        })()}
      </div>
    </aside>
  );
}
