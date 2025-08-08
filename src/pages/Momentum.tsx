import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { usePlusData } from '@/hooks/usePlusData';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Flame, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MomentumMacros } from '@/components/momentum/MomentumMacros';
import { MomentumMovement } from '@/components/momentum/MomentumMovement';
import { QuickAddFAB } from '@/components/quick/QuickAddFAB';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useDataRefresh } from '@/hooks/useDataRefresh';

interface TodayMeal {
  id: string;
  user_id: string;
  ts: string;
  title: string | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  quality_score: number | null;
}

// Sticky XP bar with 5 stages
const MomentumXPBar: React.FC<{ xp: number; goal?: number }>= ({ xp, goal = 100 }) => {
  const stages = 5;
  const perStage = goal / stages;
  return (
    <div className="sticky top-0 z-20 py-3 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="relative h-2 md:h-3 w-full overflow-hidden rounded-full bg-secondary">
          {Array.from({ length: stages }).map((_, i) => {
            const start = i * perStage;
            const end = (i + 1) * perStage;
            const fill = Math.max(0, Math.min(1, (xp - start) / perStage));
            return (
              <div key={i} className="absolute inset-y-0" style={{ left: `${(i*100)/stages}%`, width: `${100/stages}%` }}>
                <div className="h-full w-full rounded-none bg-secondary" />
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-none',
                    fill > 0 ? 'bg-gradient-to-r from-primary via-primary/80 to-primary/60' : 'bg-transparent'
                  )}
                  style={{ width: `${fill*100}%` }}
                />
                {fill >= 1 && (
                  <Flame className="absolute -right-3 -top-2 h-4 w-4 text-primary" />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-right text-xs text-muted-foreground">
          ▸ {Math.max(0, goal - xp)} XP bis Ziel
        </div>
      </div>
    </div>
  );
};

// North Star calorie ring + collapsible meal list
const CalorieNorthStar: React.FC<{ remaining: number; goal: number; todayKcal: number; meals: TodayMeal[]; loading: boolean; }>= ({ remaining, goal, todayKcal, meals, loading }) => {
  const [open, setOpen] = useState(false);
  const pct = Math.max(0, Math.min(1, (goal - remaining) / goal));
  const angle = pct * 360;
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-col items-center">
          <div className="relative h-40 w-40">
            <div
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(hsl(var(--primary)) ${angle}deg, hsl(var(--secondary)) ${angle}deg)`
              }}
            />
            <div className="absolute inset-[10%] rounded-full bg-background border border-border/60 flex items-center justify-center text-center">
              <div>
                <div className="text-2xl font-semibold tabular-nums">{Math.round(remaining)} kcal</div>
                <div className="text-xs text-muted-foreground">von {Math.round(goal)} kcal</div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="mt-3 inline-flex items-center text-sm text-primary hover:underline"
            aria-expanded={open}
            aria-controls="meal-list"
          >
            {open ? <><ChevronUp className="mr-1 h-4 w-4" /> Mahlzeiten</> : <><ChevronDown className="mr-1 h-4 w-4" /> Mahlzeiten</>}
          </button>
        </div>

        <div id="meal-list" className={cn('transition-all', open ? 'mt-4' : 'h-0 overflow-hidden')}
          style={{ maxHeight: open ? 400 : 0 }}
        >
          {loading ? (
            <div className="space-y-3">
              <div className="h-12 w-full rounded-md bg-secondary animate-pulse" />
              <div className="h-12 w-full rounded-md bg-secondary animate-pulse" />
              <div className="h-12 w-full rounded-md bg-secondary animate-pulse" />
            </div>
          ) : (
            <div className="divide-y divide-border/60 max-h-64 overflow-auto pr-1">
              {meals.length === 0 && (
                <div className="text-sm text-muted-foreground py-6 text-center">Keine Einträge für heute.</div>
              )}
              {meals.slice(0, 20).map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-3">
                  <div className="h-12 w-12 rounded-md bg-secondary flex items-center justify-center">
                    <Utensils className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{m.title || 'Mahlzeit'}</div>
                    <div className="text-xs text-muted-foreground">{new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div className="shrink-0 text-sm font-medium tabular-nums">{Math.round(m.kcal || 0)} kcal</div>
                </div>
              ))}
              <button className="w-full py-3 text-sm text-primary hover:underline">+ Mahlzeit hinzufügen</button>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Heute</div>
            <div className="text-sm font-medium tabular-nums">{Math.round(todayKcal)} kcal</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Rest</div>
            <div className="text-sm font-medium tabular-nums">{Math.round(remaining)} kcal</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Ziel</div>
            <div className="text-sm font-medium tabular-nums">{Math.round(goal)} kcal</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MomentumPage: React.FC = () => {
  const { user } = useAuth();
  const plus = usePlusData();
  const [meals, setMeals] = useState<TodayMeal[]>([]);
  const [loading, setLoading] = useState(false);

  const kcalGoal = useMemo(() => plus.goals?.calories ?? 0, [plus.goals]);
  const todayKcal = useMemo(() => plus.today?.total_calories ?? 0, [plus.today]);
  const remaining = Math.max(0, kcalGoal - todayKcal);

  useEffect(() => {
    document.title = 'Momentum 2.0 – XP, Kalorien, Makros | GetLeanAI+';
    const desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (desc) desc.content = 'Mobile‑First Momentum Board mit XP‑Leiste, Kalorien‑Nordstern und schneller Mahlzeiten‑Übersicht.';
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) canonical.href = `${window.location.origin}/momentum`;
  }, []);

  const fetchMeals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('v_today_meals')
      .select('*')
      .eq('user_id', user.id)
      .order('ts', { ascending: false });
    if (error) {
      console.error('Failed to load today meals', error);
    }
    setMeals(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  useDataRefresh(fetchMeals);

  return (
    <ErrorBoundary>
      <main>
        {/* Sticky XP bar */}
        <MomentumXPBar xp={Math.min(100, Math.round(((todayKcal>0? todayKcal : 0) / Math.max(1, kcalGoal)) * 100))} />

        <div className="container mx-auto px-4 py-4 max-w-md space-y-4">
          {/* Hot‑Swipe placeholder */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Flame className="h-5 w-5 text-primary" />
                <div className="text-sm">Hot‑Swipe‑Card – Vorschläge folgen</div>
              </div>
            </CardContent>
          </Card>

          {/* Stufe 1: Kalorien Nordstern */}
          <CalorieNorthStar
            remaining={remaining}
            goal={kcalGoal || 1}
            todayKcal={todayKcal}
            meals={meals}
            loading={loading}
          />

          {/* Stufe 2: Makros Cluster (Ring default, Bars via macroBars) */}
          <MomentumMacros data={plus} />

          {/* Stufe 3: Bewegung (Schritte + Workouts) */}
          <MomentumMovement />
        </div>

        <QuickAddFAB />
      </main>
    </ErrorBoundary>
  );
};

export default MomentumPage;
