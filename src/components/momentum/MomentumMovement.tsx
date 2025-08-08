import React, { useEffect, useMemo, useState, Suspense, lazy } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Footprints, Dumbbell, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDataRefresh } from "@/hooks/useDataRefresh";
import { toast } from "@/components/ui/sonner";

interface MovementStats {
  steps: number;
  distanceKm: number;
  workoutsCount: number;
  workoutMinutes: number;
}

export const MomentumMovement: React.FC<{ date: Date }> = ({ date }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<MovementStats>({ steps: 0, distanceKm: 0, workoutsCount: 0, workoutMinutes: 0 });
  const [openQuick, setOpenQuick] = useState(false);
  const [weekly, setWeekly] = useState<{ date: string; steps: number }[]>([]);
  const [timerSec, setTimerSec] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const dayStr = useMemo(() => date.toISOString().slice(0, 10), [date]);
  const weekDates = useMemo(() => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const arr: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const di = new Date(d);
      di.setDate(d.getDate() - i);
      arr.push(di.toISOString().slice(0, 10));
    }
    return arr;
  }, [date]);
  const maxWeekly = useMemo(() => Math.max(1, ...weekly.map((w) => w.steps)), [weekly]);
  const mm = String(Math.floor(timerSec / 60)).padStart(2, '0');
  const ss = String(timerSec % 60).padStart(2, '0');

  useEffect(() => {
    if (!timerActive) return;
    const id = setInterval(() => {
      setTimerSec((s) => {
        if (s <= 1) {
          clearInterval(id);
          setTimerActive(false);
          toast.success('10‑Min Walk abgeschlossen!');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerActive]);

const fetchStats = async () => {
  if (!user) return;
  setLoading(true);
  try {
    const { data, error } = await supabase
      .from("workouts")
      .select("duration_minutes, steps, distance_km, did_workout")
      .eq("user_id", user.id)
      .eq("date", dayStr)
      .order("created_at", { ascending: false });

    if (error) throw error;
    const rows = data || [];
    const totalSteps = rows.reduce((s, r: any) => s + Number(r.steps || 0), 0);
    const totalKm = rows.reduce((s, r: any) => s + Number(r.distance_km || 0), 0);
    const workouts = rows.filter((r: any) => !!r.did_workout);
    const workoutMinutes = workouts.reduce((s, r: any) => s + Number(r.duration_minutes || 0), 0);

    setStats({ steps: totalSteps, distanceKm: totalKm, workoutsCount: workouts.length, workoutMinutes });

    // Weekly aggregation for heatmap (last 7 days including today)
    const start = new Date(date);
    start.setDate(start.getDate() - 6);
    const startStr = start.toISOString().slice(0, 10);
    const { data: weekRows, error: weekErr } = await supabase
      .from('workouts')
      .select('date, steps')
      .eq('user_id', user.id)
      .gte('date', startStr)
      .lte('date', dayStr);
    if (!weekErr && weekRows) {
      const map = new Map<string, number>();
      weekDates.forEach((d) => map.set(d, 0));
      (weekRows as any[]).forEach((r) => {
        const ds = String((r as any).date);
        const st = Number((r as any).steps || 0);
        map.set(ds, (map.get(ds) || 0) + st);
      });
      setWeekly(weekDates.map((d) => ({ date: d, steps: map.get(d) || 0 })));
    }
  } catch (e: any) {
    console.error("Failed to load movement stats", e);
    toast.error("Fehler beim Laden der Bewegungsdaten");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, dayStr]);

  useDataRefresh(fetchStats);

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-medium">Bewegung</div>
            <div className="text-xs text-muted-foreground">Schritte · Distanz · Workouts</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setOpenQuick(true)}>Eintragen</Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 rounded-md bg-secondary animate-pulse" />
            <div className="h-16 rounded-md bg-secondary animate-pulse" />
          </div>
        ) : (
            <> 
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Footprints className="h-4 w-4" /> Schritte</div>
                  <div className="text-lg font-semibold tabular-nums">{stats.steps.toLocaleString()}<span className="text-xs font-normal text-muted-foreground"> steps</span></div>
                  <div className="text-xs text-muted-foreground">{stats.distanceKm.toFixed(1)} km</div>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Dumbbell className="h-4 w-4" /> Workouts</div>
                  <div className="text-lg font-semibold tabular-nums">{stats.workoutsCount}<span className="text-xs font-normal text-muted-foreground"> Sessions</span></div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><Timer className="h-3 w-3" /> {stats.workoutMinutes} Min</div>
                </div>
              </div>

              {/* Weekly heatmap */}
              <div className="mt-4">
                <div className="text-xs text-muted-foreground mb-2">Letzte 7 Tage</div>
                <div className="grid grid-cols-7 gap-1">
                  {weekly.map((w) => {
                    const ratio = w.steps / maxWeekly;
                    const level = ratio === 0 ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : 4;
                    const cls = level === 0 ? 'bg-secondary' : level === 1 ? 'bg-primary/10' : level === 2 ? 'bg-primary/20' : level === 3 ? 'bg-primary/30' : 'bg-primary/50';
                    return (
                      <div
                        key={w.date}
                        className={`h-6 md:h-7 rounded-md ${cls}`}
                        title={`${w.steps.toLocaleString()} Schritte\n${new Date(w.date).toLocaleDateString()}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* 10-min countdown */}
              <div className="mt-4 rounded-lg border border-border/60 p-3">
                {timerActive ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Timer className="h-4 w-4" /> Rest: {mm}:{ss}
                      </div>
                      <button className="text-sm text-primary hover:underline" onClick={() => { setTimerActive(false); setTimerSec(0); }}>Stop</button>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-primary transition-[width] duration-1000" style={{ width: `${(1 - timerSec / 600) * 100}%` }} />
                    </div>
                  </>
                ) : (
                  <Button size="sm" className="w-full" onClick={() => { setTimerSec(600); setTimerActive(true); }}>10‑Min Walk Timer starten</Button>
                )}
              </div>
            </>
        )}
      </CardContent>

      {/* Quick add via existing modal */}
      <Suspense fallback={null}>
        {openQuick && (
          <QuickWorkoutModal isOpen={openQuick} onClose={() => setOpenQuick(false)} contextData={{ recommendedType: 'walking' }} />
        )}
      </Suspense>
    </Card>
  );
};

// Lazy import to avoid initial bundle increase
const QuickWorkoutModal = lazy(() =>
  import("@/components/QuickWorkoutModal").then((m) => ({ default: m.QuickWorkoutModal }))
);
