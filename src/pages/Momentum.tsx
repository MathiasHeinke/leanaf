import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { usePlusData } from '@/hooks/usePlusData';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Flame, Utensils, Pencil, Check, X as XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MomentumMacros } from '@/components/momentum/MomentumMacros';
import { MomentumMovement } from '@/components/momentum/MomentumMovement';
import { QuickAddFAB } from '@/components/quick/QuickAddFAB';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useDataRefresh, triggerDataRefresh } from '@/hooks/useDataRefresh';
import { toast } from '@/components/ui/sonner';
import { DateNavigation } from '@/components/DateNavigation';

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
  image_url?: string | null; // optional Vorschaubild aus meal_images
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
const CalorieNorthStar: React.FC<{ remaining: number; goal: number; todayKcal: number; meals: TodayMeal[]; loading: boolean; onChanged?: () => void; }>= ({ remaining, goal, todayKcal, meals, loading, onChanged }) => {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [kcalDraft, setKcalDraft] = useState<string>('');
  const pct = Math.max(0, Math.min(1, (goal - remaining) / goal));
  const angle = pct * 360;

  const startEdit = (m: TodayMeal) => {
    setEditingId(m.id);
    setTitleDraft(m.title || '');
    setKcalDraft(String(Math.round(m.kcal || 0)));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitleDraft('');
    setKcalDraft('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const calories = Number(kcalDraft);
    if (Number.isNaN(calories)) {
      toast.error('Bitte gültige Kalorienzahl eingeben');
      return;
    }
    const { error } = await supabase
      .from('meals')
      .update({ text: titleDraft, calories })
      .eq('id', editingId);
    if (error) {
      console.error('Update meal failed', error);
      toast.error('Speichern fehlgeschlagen');
      return;
    }
    toast.success('Gespeichert');
    triggerDataRefresh();
    onChanged?.();
    cancelEdit();
  };

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
              {meals.slice(0, 20).map((m) => {
                const isEditing = editingId === m.id;
                return (
                  <div key={m.id} className="flex items-center gap-3 py-3">
                    <div className="h-12 w-12 rounded-md bg-secondary overflow-hidden flex items-center justify-center">
                      {m.image_url ? (
                        <img
                          src={m.image_url}
                          alt={`Mahlzeit Foto – ${m.title || 'Mahlzeit'}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Utensils className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={titleDraft}
                            onChange={(e) => setTitleDraft(e.target.value)}
                            className="w-full h-9 px-2 rounded-md border border-border/60 bg-background text-sm"
                            placeholder="Titel"
                          />
                        </div>
                      ) : (
                        <div className="text-sm truncate">{m.title || 'Mahlzeit'}</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <input
                            inputMode="numeric"
                            value={kcalDraft}
                            onChange={(e) => setKcalDraft(e.target.value)}
                            className="w-20 h-9 px-2 rounded-md border border-border/60 bg-background text-sm tabular-nums text-right"
                            aria-label="Kalorien"
                          />
                          <span className="text-sm">kcal</span>
                          <button aria-label="Speichern" className="p-2 rounded-md bg-primary text-primary-foreground" onClick={saveEdit}>
                            <Check className="w-4 h-4" />
                          </button>
                          <button aria-label="Abbrechen" className="p-2 rounded-md border border-border/60" onClick={cancelEdit}>
                            <XIcon className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="shrink-0 text-sm font-medium tabular-nums">{Math.round(m.kcal || 0)} kcal</div>
                          <button aria-label="Bearbeiten" className="p-2 rounded-md border border-border/60" onClick={() => startEdit(m)}>
                            <Pencil className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
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
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const dateStr = useMemo(() => currentDate.toISOString().slice(0, 10), [currentDate]);

  const kcalGoal = useMemo(() => plus.goals?.calories ?? 0, [plus.goals]);
  const totals = useMemo(() => {
    const sum = (key: keyof TodayMeal) => meals.reduce((s, m) => s + Number(m[key] || 0), 0);
    return {
      kcal: sum('kcal'),
      protein: sum('protein'),
      carbs: sum('carbs'),
      fat: sum('fat'),
    };
  }, [meals]);
  const todayKcal = totals.kcal;
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
  try {
    // Load meals for selected date
    const { data, error } = await supabase
      .from('meals')
      .select('id,user_id,created_at,text,calories,protein,carbs,fats,quality_score')
      .eq('user_id', user.id)
      .eq('date', dateStr)
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Map to TodayMeal shape
    const mapped: TodayMeal[] = (data || []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      ts: r.created_at,
      title: r.text,
      kcal: r.calories,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fats,
      quality_score: r.quality_score,
    }));

    // Attach first image if available
    let mealsWithImages: TodayMeal[] = mapped;
    const ids = mapped.map((d) => d.id).filter(Boolean);
    if (ids.length > 0) {
      const { data: imgRows, error: imgErr } = await supabase
        .from('meal_images')
        .select('meal_id, image_url')
        .in('meal_id', ids);
      if (!imgErr && imgRows) {
        const firstImageMap = new Map<string, string>();
        for (const row of imgRows) {
          if (!firstImageMap.has(row.meal_id)) {
            firstImageMap.set(row.meal_id, row.image_url);
          }
        }
        mealsWithImages = mapped.map((m) => ({ ...m, image_url: firstImageMap.get(m.id) || null }));
      }
    }

    setMeals(mealsWithImages);
  } catch (e) {
    console.error('Failed to load meals', e);
  } finally {
    setLoading(false);
  }
}, [user?.id, dateStr]);

useEffect(() => {
  fetchMeals();
}, [fetchMeals]);

useDataRefresh(fetchMeals);

  return (
    <ErrorBoundary>
      <main>
{/* Sticky XP bar */}
<MomentumXPBar xp={Math.min(100, Math.round(((todayKcal > 0 ? todayKcal : 0) / Math.max(1, kcalGoal)) * 100))} />

<div className="container mx-auto px-4 py-4 max-w-md space-y-4">
  {/* Date navigation */}
  <DateNavigation currentDate={currentDate} onDateChange={(d) => { setCurrentDate(d); }} />

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
  <MomentumMacros data={plus} usedOverride={{ protein: totals.protein, carbs: totals.carbs, fats: totals.fat }} />

  {/* Stufe 3: Bewegung (Schritte + Workouts) */}
  <MomentumMovement date={currentDate} />
</div>

<QuickAddFAB />
      </main>
    </ErrorBoundary>
  );
};

export default MomentumPage;
