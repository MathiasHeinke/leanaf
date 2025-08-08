import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { usePlusData } from '@/hooks/usePlusData';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Flame, Utensils, Pencil, Check, X as XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MomentumMacros } from '@/components/momentum/MomentumMacros';
import { MomentumMovement } from '@/components/momentum/MomentumMovement';
import { QuickAddFAB } from '@/components/quick/QuickAddFAB';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useDataRefresh, triggerDataRefresh } from '@/hooks/useDataRefresh';
import { toast } from '@/components/ui/sonner';
import { DateNavigation } from '@/components/DateNavigation';
import OverviewRingsCard from '@/components/momentum/OverviewRingsCard';
import { openMeal, openWorkout } from '@/components/quick/quickAddBus';
import HotSwipeActionCard, { HotAction } from '@/components/momentum/HotSwipeActionCard';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';

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
  meal_type?: string | null;
  image_url?: string | null; // optional Vorschaubild aus meal_images
}

// Sticky XP bar with 5 stages + stage glow + XP chip
const MomentumXPBar: React.FC<{ xp: number; goal?: number; loading?: boolean }>= ({ xp, goal = 100, loading = false }) => {
  const stages = 5;
  const perStage = goal / stages;
  const prevXpRef = useRef<number>(xp);
  const [recentGain, setRecentGain] = useState<number>(0);
  const [glowIndex, setGlowIndex] = useState<number | null>(null);

  useEffect(() => {
    const prev = prevXpRef.current;
    const delta = Math.max(0, Math.round(xp - prev));
    if (delta > 0) {
      setRecentGain(delta);
      // Light haptic feedback if motion isn't reduced
      try {
        const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReduced && 'vibrate' in navigator) {
          // 10ms micro-vibration
          // @ts-ignore - vibrate may not exist in some environments
          navigator.vibrate && navigator.vibrate(10);
        }
      } catch {}
      const prevStage = Math.floor(prev / perStage);
      const currStage = Math.floor(xp / perStage);
      if (currStage > prevStage) {
        setGlowIndex(currStage - 1);
        const t = setTimeout(() => setGlowIndex(null), 700);
        return () => clearTimeout(t);
      }
      const t2 = setTimeout(() => setRecentGain(0), 1200);
      return () => clearTimeout(t2);
    }
    prevXpRef.current = xp;
  }, [xp, perStage]);

  useEffect(() => { prevXpRef.current = xp; }, [xp]);

  const currentSegment = Math.min(stages - 1, Math.max(0, Math.floor(xp / perStage)));
  const segmentFill = (seg: number) => {
    const start = seg * perStage;
    return Math.max(0, Math.min(1, (xp - start) / perStage));
  };

  if (loading) {
    return (
      <div className="sticky top-0 z-20 py-3 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60" role="progressbar" aria-label="XP lädt">
        <div className="container mx-auto px-4">
          <div className="h-2 md:h-3 w-full rounded-full bg-secondary motion-safe:animate-pulse" />
        </div>
      </div>
    );
  }
  return (
    <div className="sticky top-0 z-20 py-3 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.round(xp)} aria-label={`XP-Fortschritt: ${Math.round(xp)} von ${goal} XP`}>
      <div className="container mx-auto px-4">
        <div className="relative h-2 md:h-3 w-full overflow-hidden rounded-full bg-secondary">
          {Array.from({ length: stages }).map((_, i) => {
            const fill = segmentFill(i);
            const leftPct = (i * 100) / stages;
            const widthPct = 100 / stages;
            const flameLeft = `calc(${leftPct}% + ${Math.max(0, Math.min(1, fill)) * widthPct}% - 8px)`;
            return (
              <div key={i} className="absolute inset-y-0" style={{ left: `${leftPct}%`, width: `${widthPct}%` }}>
                <div className="h-full w-full bg-secondary" />
                <div
                  className={cn(
                    'absolute inset-y-0 left-0',
                    fill > 0 ? 'bg-gradient-to-r from-primary via-primary/80 to-primary/60' : 'bg-transparent'
                  )}
                  style={{ width: `${fill * 100}%` }}
                />
                {glowIndex === i && (
                  <div className="absolute inset-0 rounded-sm" style={{ boxShadow: '0 0 12px hsl(var(--primary) / 0.7) inset, 0 0 14px hsl(var(--primary) / 0.6)' }} />
                )}
                {i === currentSegment && fill > 0 && (
                  <Flame className="absolute -top-3 h-4 w-4 text-primary motion-safe:transition-[left] duration-200 motion-reduce:transition-none" style={{ left: flameLeft }} />
                )}
                {/* stage tick (separator) */}
                {i > 0 && (
                  <div className="absolute right-0 top-0 h-full w-px bg-border/60" />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="opacity-80">▸ {Math.max(0, goal - Math.round(xp))} XP bis Ziel</div>
          {recentGain > 0 && (
            <div className="ml-2 inline-flex items-center rounded-full border border-border/50 bg-background px-2 py-0.5 text-[11px] text-foreground shadow-sm motion-safe:animate-fade-in">
              +{recentGain} XP
            </div>
          )}
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
              <div className="h-12 w-full rounded-md bg-secondary motion-safe:animate-pulse" />
              <div className="h-12 w-full rounded-md bg-secondary motion-safe:animate-pulse" />
              <div className="h-12 w-full rounded-md bg-secondary motion-safe:animate-pulse" />
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
                          <button aria-label="Speichern" className="p-3 rounded-md bg-primary text-primary-foreground" onClick={saveEdit}>
                            <Check className="w-4 h-4" />
                          </button>
                          <button aria-label="Abbrechen" className="p-3 rounded-md border border-border/60" onClick={cancelEdit}>
                            <XIcon className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="shrink-0 text-sm font-medium tabular-nums">{Math.round(m.kcal || 0)} kcal</div>
                          <button aria-label="Bearbeiten" className="p-3 rounded-md border border-border/60" onClick={() => startEdit(m)}>
                            <Pencil className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <button className="w-full py-3 text-sm text-primary hover:underline" onClick={() => openMeal()}>+ Mahlzeit hinzufügen</button>
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
  const [error, setError] = useState<string | null>(null);
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
  const xpProgress = Math.min(100, Math.round(((todayKcal > 0 ? todayKcal : 0) / Math.max(1, kcalGoal)) * 100));

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
  setError(null);
  try {
    // Load meals for selected date
    const { data, error } = await supabase
      .from('meals')
      .select('id,user_id,created_at,text,calories,protein,carbs,fats,quality_score,meal_type')
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
      meal_type: r.meal_type || null,
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
    setError('Live-Daten nicht verfügbar');
  } finally {
    setLoading(false);
  }
}, [user?.id, dateStr]);

useEffect(() => {
  fetchMeals();
}, [fetchMeals]);

useDataRefresh(fetchMeals);

// Build Hot Actions
const hotActions: HotAction[] = (() => {
  const actions: HotAction[] = [];
  const perStage = 20;
  const currStage = Math.floor(xpProgress / perStage) + 1;
  const toNext = perStage - (xpProgress % perStage || 0);
  // Protein suggestion
  const pGoal = plus.goals?.protein || 0; const pUsed = totals.protein;
  if (pGoal > 0 && pUsed < pGoal) {
    actions.push({
      id: 'protein',
      title: '+30 g Protein (+10 XP) →',
      subtitle: `dir fehlen ${Math.max(1, Math.round((toNext / perStage) * 100))}% bis Stage ${Math.min(5, currStage + 1)}`,
      onTap: () => openMeal(),
    });
  }
  // Walk suggestion
  actions.push({ id: 'walk', title: '10‑Min Walk (+5 XP) →', subtitle: `Stage‑Boost in ${toNext} XP`, onTap: () => openWorkout({ recommendedType: 'walking' }) });
  // Hydration suggestion
  actions.push({ id: 'water', title: '+300 ml Wasser (+5 XP) →', subtitle: `Stage‑Boost in ${toNext} XP` });
  return actions;
})();
  const [mealsOpen, setMealsOpen] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [mealTitleDraft, setMealTitleDraft] = useState('');
  const [mealKcalDraft, setMealKcalDraft] = useState<string>('');

  const startEditMeal = (m: TodayMeal) => {
    setEditingMealId(m.id);
    setMealTitleDraft(m.title || '');
    setMealKcalDraft(String(Math.round(m.kcal || 0)));
  };

  const cancelEditMeal = () => {
    setEditingMealId(null);
    setMealTitleDraft('');
    setMealKcalDraft('');
  };

  const saveEditMeal = async () => {
    if (!editingMealId) return;
    const calories = Number(mealKcalDraft);
    if (Number.isNaN(calories)) {
      toast.error('Bitte gültige Kalorienzahl eingeben');
      return;
    }
    const { error } = await supabase
      .from('meals')
      .update({ text: mealTitleDraft, calories })
      .eq('id', editingMealId);
    if (error) {
      console.error('Update meal failed', error);
      toast.error('Speichern fehlgeschlagen');
      return;
    }
    toast.success('Gespeichert');
    triggerDataRefresh();
    cancelEditMeal();
  };

  return (
    <ErrorBoundary>
      <main>
{/* Sticky XP bar */}
<MomentumXPBar xp={xpProgress} loading={loading} />

<div className="container mx-auto px-4 py-4 max-w-md space-y-4">
  {/* Date navigation */}
  <DateNavigation currentDate={currentDate} onDateChange={(d) => { setCurrentDate(d); }} />

  {/* Hot Actions */}
  <HotSwipeActionCard actions={hotActions} />

  {/* Übersicht: Kalorien + Makros in einer Karte */}
  <OverviewRingsCard
    calories={{ remaining, goal: kcalGoal || 1, today: todayKcal }}
    macros={{
      protein: { used: totals.protein, goal: plus.goals?.protein || 0 },
      carbs: { used: totals.carbs, goal: plus.goals?.carbs || 0 },
      fats: { used: totals.fat, goal: plus.goals?.fats || 0 },
    }}
  />

  {/* Mahlzeitenliste (eingeklappt, unter der Übersicht) */}
  <Card>
    <CardContent className="pt-4">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setMealsOpen(v => !v)}
          className="inline-flex items-center text-sm text-primary hover:underline min-h-11 px-4 py-2"
          aria-expanded={mealsOpen}
          aria-controls="mini-meal-list"
        >
          {mealsOpen ? (<><ChevronUp className="mr-1 h-4 w-4" /> Mahlzeiten</>) : (<><ChevronDown className="mr-1 h-4 w-4" /> Mahlzeiten</>)}
        </button>
      </div>

      <div id="mini-meal-list" className={cn('transition-all', mealsOpen ? 'mt-4' : 'h-0 overflow-hidden')} style={{ maxHeight: mealsOpen ? 400 : 0 }}>
        {error ? (
          <div className="py-6 text-center space-y-2">
            <div className="text-sm text-muted-foreground">Live‑Daten nicht verfügbar.</div>
            <button className="inline-flex items-center rounded-md border border-border/60 px-3 py-2 text-sm" onClick={fetchMeals} aria-label="Erneut versuchen">Retry</button>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            <div className="h-12 w-full rounded-md bg-secondary motion-safe:animate-pulse" />
            <div className="h-12 w-full rounded-md bg-secondary motion-safe:animate-pulse" />
            <div className="h-12 w-full rounded-md bg-secondary motion-safe:animate-pulse" />
          </div>
        ) : (
          <div className="max-h-64 overflow-auto pr-1">
            {(() => {
              if (meals.length === 0) {
                return (
                  <div className="py-6 text-center space-y-3">
                    <div className="text-sm text-muted-foreground">Noch nix geloggt.</div>
                    <div className="flex justify-center gap-2">
                      <button className="rounded-md border border-border/60 px-3 py-2 text-sm" onClick={() => toast.info('Foto-Upload kommt bald')} aria-label="Foto hochladen">Foto</button>
                      <button className="rounded-md border border-border/60 px-3 py-2 text-sm" onClick={() => toast.info('Lebensmittelsuche kommt bald')} aria-label="Lebensmittelsuche öffnen">Suche</button>
                      <button className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm" onClick={() => openMeal()} aria-label="Schnell Mahlzeit hinzufügen">Quick‑Add</button>
                    </div>
                  </div>
                );
              }
              const normalize = (t?: string | null) => {
                const v = (t || '').toLowerCase();
                if (v.includes('breakfast') || v.includes('früh')) return 'breakfast';
                if (v.includes('lunch') || v.includes('mittag')) return 'lunch';
                if (v.includes('dinner') || v.includes('abend')) return 'dinner';
                return 'snack';
              };
              const sections = [
                { key: 'breakfast', label: 'Frühstück' },
                { key: 'lunch', label: 'Mittagessen' },
                { key: 'dinner', label: 'Abendessen' },
                { key: 'snack', label: 'Snacks & Andere' },
              ] as const;
              const items = [...meals].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
              const byType = new Map<string, TodayMeal[]>();
              items.forEach((m) => {
                const k = normalize(m.meal_type);
                if (!byType.has(k)) byType.set(k, []);
                byType.get(k)!.push(m);
              });
              return (
                <>
                  {sections.map((s) => {
                    const list = byType.get(s.key) || [];
                    if (list.length === 0) return null;
                    return (
                      <div key={s.key} className="py-2 first:pt-0">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{s.label}</div>
                        <div className="divide-y divide-border/60">
                          {list.map((m) => {
                            const isEditing = editingMealId === m.id;
                            return (
                              <div key={m.id} className="flex items-center gap-3 py-3">
                                <div className="h-12 w-12 rounded-md bg-secondary overflow-hidden flex items-center justify-center">
                                  {m.image_url ? (
                                    <img src={m.image_url} alt={`Mahlzeit Foto – ${m.title || 'Mahlzeit'}`} className="h-full w-full object-cover" loading="lazy" />
                                  ) : (
                                    <Utensils className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {isEditing ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        value={mealTitleDraft}
                                        onChange={(e) => setMealTitleDraft(e.target.value)}
                                        className="w-full h-9 px-2 rounded-md border border-border/60 bg-background text-sm"
                                        placeholder="Titel"
                                      />
                                    </div>
                                  ) : (
                                    <div className="text-sm truncate">{m.title || 'Mahlzeit'}</div>
                                  )}
                                  {/* Makro-Badges */}
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    <span className="inline-flex items-center rounded-full border border-border/60 px-2 py-0.5 text-[10px] leading-none">
                                      <span className="mr-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'hsl(var(--fats))' }} />
                                      P {Math.round(m.protein || 0)}g
                                    </span>
                                    <span className="inline-flex items-center rounded-full border border-border/60 px-2 py-0.5 text-[10px] leading-none">
                                      <span className="mr-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'hsl(var(--muted-foreground))' }} />
                                      C {Math.round(m.carbs || 0)}g
                                    </span>
                                    <span className="inline-flex items-center rounded-full border border-border/60 px-2 py-0.5 text-[10px] leading-none">
                                      <span className="mr-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'hsl(var(--carbs))' }} />
                                      F {Math.round(m.fat || 0)}g
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                  {isEditing ? (
                                    <>
                                      <input
                                        inputMode="numeric"
                                        value={mealKcalDraft}
                                        onChange={(e) => setMealKcalDraft(e.target.value)}
                                        className="w-20 h-9 px-2 rounded-md border border-border/60 bg-background text-sm tabular-nums text-right"
                                        aria-label="Kalorien"
                                      />
                                      <span className="text-sm">kcal</span>
                                      <button aria-label="Speichern" className="p-3 rounded-md bg-primary text-primary-foreground" onClick={saveEditMeal}>
                                        <Check className="w-4 h-4" />
                                      </button>
                                      <button aria-label="Abbrechen" className="p-3 rounded-md border border-border/60" onClick={cancelEditMeal}>
                                        <XIcon className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <div className="shrink-0 text-sm font-medium tabular-nums">{Math.round(m.kcal || 0)} kcal</div>
                                      <button aria-label="Bearbeiten" className="p-3 rounded-md border border-border/60" onClick={() => startEditMeal(m)}>
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <button className="w-full py-3 text-sm text-primary hover:underline" onClick={() => openMeal()}>+ Mahlzeit hinzufügen</button>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </CardContent>
  </Card>

  {/* Stufe 3: Bewegung (Schritte + Workouts) */}
  <MomentumMovement date={currentDate} />
</div>

<QuickAddFAB statuses={{ meal: remaining > kcalGoal * 0.05 ? (meals.length > 0 ? 'partial' : 'due') : 'ok', workout: 'partial' }} />
      </main>
    </ErrorBoundary>
  );
};

export default MomentumPage;
