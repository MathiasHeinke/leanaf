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
import { triggerDataRefresh } from '@/hooks/useDataRefresh';
import { toast } from '@/components/ui/sonner';
import { DateNavigation } from '@/components/DateNavigation';
import OverviewRingsCard from '@/components/momentum/OverviewRingsCard';
import { WaterQuickSection } from '@/components/momentum/WaterQuickSection';
import { SmartSuggestionsHub } from '@/components/momentum/SmartSuggestionsHub';
import { openMeal, openWorkout } from '@/components/quick/quickAddBus';
import HotSwipeActionCard, { HotAction } from '@/components/momentum/HotSwipeActionCard';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { supabaseRequest } from '@/lib/supabaseRequest';
import BlurImage from '@/components/media/BlurImage';

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
          navigator.vibrate(50); // Light vibration
        }
      } catch (e) {
        // Vibration not supported/failed, silent fail
      }

      // Determine which stage completed (if any)
      const oldStage = Math.min(Math.floor(prev / perStage), stages - 1);
      const newStage = Math.min(Math.floor(xp / perStage), stages - 1);
      if (newStage > oldStage) {
        setGlowIndex(newStage);
        setTimeout(() => setGlowIndex(null), 2000); // glow for 2s
      }

      setTimeout(() => setRecentGain(0), 3000); // show gain for 3s
    }
    prevXpRef.current = xp;
  }, [xp, perStage, stages]);

  if (loading) {
    return (
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-4 h-4 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
          <Skeleton className="w-16 h-6 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <Flame className="w-4 h-4 text-orange-500 shrink-0" />
        <div className="flex-1 relative" role="progressbar" aria-valuenow={xp} aria-valuemax={goal} aria-label={`XP Progress: ${xp} von ${goal}`}>
          <div className="flex gap-1">
            {Array.from({ length: stages }).map((_, i) => {
              const stageStart = i * perStage;
              const stageEnd = (i + 1) * perStage;
              const stageProgress = Math.max(0, Math.min(perStage, xp - stageStart)) / perStage;
              const isGlowing = glowIndex === i;
              return (
                <div 
                  key={i} 
                  className={cn(
                    "flex-1 h-3 rounded-full bg-secondary relative overflow-hidden",
                    isGlowing && "animate-pulse shadow-lg shadow-primary/50"
                  )}
                >
                  <div 
                    className={cn(
                      "h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out rounded-full",
                      isGlowing && "shadow-md shadow-primary/30"
                    )}
                    style={{ width: `${stageProgress * 100}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1">
          {recentGain > 0 && (
            <span className="text-xs text-green-600 font-medium animate-in slide-in-from-right-2 duration-300">
              +{recentGain}
            </span>
          )}
          <span className="text-sm font-medium bg-secondary px-2 py-1 rounded-full tabular-nums">
            {Math.round(xp)}<span className="text-muted-foreground">/{goal}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

const MomentumPage: React.FC = () => {
  const { user } = useAuth();
  
  // Set page title for SEO
  useEffect(() => {
    document.title = 'Momentum – GetLeanAI';
    const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    if (!meta) {
      const newMeta = document.createElement('meta');
      newMeta.name = 'viewport';
      newMeta.content = 'width=device-width, initial-scale=1';
      document.head.appendChild(newMeta);
    }
  }, []);

  // Date state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meals, setMeals] = useState<TodayMeal[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [dailyGoals, setDailyGoals] = useState<any>(null);
  const [totalWaterMl, setTotalWaterMl] = useState<number>(0);

  // Edit state for meals
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [mealTitleDraft, setMealTitleDraft] = useState('');
  const [mealKcalDraft, setMealKcalDraft] = useState<string>('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Navigation functions
  const goToPreviousDay = () => {
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    setCurrentDate(yesterday);
  };

  const goToNextDay = () => {
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setCurrentDate(tomorrow);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format date for API
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const dateStr = formatDate(currentDate);
  const isToday = dateStr === formatDate(new Date());

  // Fetch meals
  const fetchMeals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Use v_today_meals view for current day only
      if (isToday) {
        const { data, error } = await supabase
          .from('v_today_meals_union')
          .select('*')
          .eq('user_id', user.id)
          .order('ts', { ascending: false });
        
        if (error) throw error;
        setMeals(data || []);
      } else {
        // For other dates, use created_at day range in UTC to avoid timezone issues
        const nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextStr = nextDate.toISOString().slice(0, 10);
        const { data, error } = await supabase
          .from('meals')
          .select('id,user_id,created_at,text,calories,protein,carbs,fats,quality_score,meal_type')
          .eq('user_id', user.id)
          .gte('created_at', `${dateStr}T00:00:00Z`)
          .lt('created_at', `${nextStr}T00:00:00Z`)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Map to TodayMeal shape for consistency
        const mapped: TodayMeal[] = (data || []).map((r: any) => ({
          id: r.id,
          user_id: r.user_id,
          ts: r.created_at,
          title: r.text,
          kcal: r.calories || 0,
          protein: r.protein || 0,
          carbs: r.carbs || 0,
          fat: r.fats || 0,
          quality_score: r.quality_score || null
        }));
        setMeals(mapped);
      }
    } catch (err) {
      console.error('Error fetching meals:', err);
      setError(err instanceof Error ? err.message : 'Failed to load meals');
    } finally {
      setLoading(false);
    }
  }, [user, dateStr, isToday]);

  // Fetch user data and goals
  const fetchUserData = useCallback(async () => {
    if (!user) return;
    try {
      const [userDataResult, goalsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('daily_goals')
          .select('*')
          .eq('user_id', user.id)
          .single()
      ]);
      
      if (userDataResult.error) throw userDataResult.error;
      if (goalsResult.error) throw goalsResult.error;
      
      setUserData(userDataResult.data);
      setDailyGoals(goalsResult.data);
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  }, [user]);
  const fetchWaterTotals = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('fast_fluid_totals', {
        p_user: user.id,
        p_d: dateStr
      });
      if (error) throw error;
      setTotalWaterMl(Number(data) || 0);
    } catch (err) {
      console.error('Error fetching water totals:', err);
    }
  }, [user, dateStr]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    fetchWaterTotals();
  }, [fetchWaterTotals]);

  // Note: Data refresh would be handled by useDataRefresh hook if needed

  // Meal editing functions
  const startEditMeal = (meal: TodayMeal) => {
    setEditingMealId(meal.id);
    setMealTitleDraft(meal.title || '');
    setMealKcalDraft(String(meal.kcal || 0));
  };

  const cancelEditMeal = () => {
    setEditingMealId(null);
    setMealTitleDraft('');
    setMealKcalDraft('');
  };

  const saveEditMeal = async () => {
    if (!editingMealId) return;
    
    try {
      const kcal = parseFloat(mealKcalDraft) || 0;
      
      const { error } = await supabase
        .from('meals')
        .update({
          text: mealTitleDraft.trim() || null,
          calories: kcal
        })
        .eq('id', editingMealId);
      
      if (error) throw error;

      // Update local state
      setMeals(prev => prev.map(m => 
        m.id === editingMealId 
          ? { ...m, title: mealTitleDraft.trim() || null, kcal: kcal }
          : m
      ));

      toast.success('Mahlzeit aktualisiert');
      cancelEditMeal();
      triggerDataRefresh();
    } catch (err) {
      console.error('Error updating meal:', err);
      toast.error('Fehler beim Speichern');
    }
  };

  // Calculate totals
  const totalKcal = meals.reduce((sum, m) => sum + (m.kcal || 0), 0);
  const totalProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs || 0), 0);
  const totalFat = meals.reduce((sum, m) => sum + (m.fat || 0), 0);

  // Goals
  const kcalGoal = dailyGoals?.calories || 2000;
  const proteinGoal = dailyGoals?.protein || 150;
  const carbsGoal = dailyGoals?.carbs || 200;
  const fatGoal = dailyGoals?.fats || 67;

  const remaining = kcalGoal - totalKcal;

  // Calculate XP (simplified)
  const xpFromMeals = Math.min(100, (totalKcal / kcalGoal) * 60);
  const totalXP = Math.round(xpFromMeals);

  // Generate hot actions
  const hotActions: HotAction[] = [];
  
  if (remaining > kcalGoal * 0.1) {
    hotActions.push({
      id: 'add-meal',
      title: 'Mahlzeit hinzufügen',
      subtitle: `Noch ${Math.round(remaining)} kcal heute`,
      onTap: () => openMeal()
    });
  }

  if (meals.length === 0) {
    hotActions.push({
      id: 'first-meal',
      title: 'Erste Mahlzeit tracken',
      subtitle: 'Starte deinen Tag!',
      onTap: () => openMeal()
    });
  }

  // Group meals by time
  const groupedMeals = useMemo(() => {
    const groups: { [key: string]: TodayMeal[] } = {};
    
    meals.forEach(meal => {
      const date = new Date(meal.ts);
      const timeLabel = (() => {
        const hour = date.getHours();
        if (hour < 10) return 'Frühstück';
        if (hour < 14) return 'Mittagessen';
        if (hour < 18) return 'Nachmittag';
        return 'Abendessen';
      })();
      
      if (!groups[timeLabel]) groups[timeLabel] = [];
      groups[timeLabel].push(meal);
    });

    return Object.entries(groups).map(([label, meals]) => ({
      label,
      meals,
      totalKcal: meals.reduce((sum, m) => sum + (m.kcal || 0), 0)
    }));
  }, [meals]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-muted-foreground">Nicht angemeldet</div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pt-0 pb-6 max-w-4xl">
          <h1 className="sr-only">Momentum Dashboard</h1>
          
          {/* XP Bar */}
          <MomentumXPBar xp={totalXP} goal={100} loading={loading} />

          {/* Date Navigation */}
          <DateNavigation 
            currentDate={currentDate}
            onDateChange={setCurrentDate}
          />

          {/* Smart Suggestions Hub */}
          <SmartSuggestionsHub 
            date={currentDate}
            calories={{ today: totalKcal, goal: kcalGoal }}
            totalWaterMl={totalWaterMl}
          />

          {/* Water Quick Section */}
          <div className="mb-6">
            <WaterQuickSection 
              date={currentDate}
              totalMl={totalWaterMl}
              onDataUpdate={() => { fetchWaterTotals(); }}
            />
          </div>


          {/* Overview Rings */}
          <div className="mb-6">
            <OverviewRingsCard 
              calories={{ remaining: remaining, goal: kcalGoal, today: totalKcal }}
              macros={{
                protein: { used: totalProtein, goal: proteinGoal },
                carbs: { used: totalCarbs, goal: carbsGoal },
                fats: { used: totalFat, goal: fatGoal }
              }}
            />
          </div>

          {/* Meals List */}
          <Card className="mb-6">
            <CardContent className="py-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Mahlzeiten ({meals.length})</h2>
                <div className="text-sm text-muted-foreground">
                  {Math.round(totalKcal)} / {Math.round(kcalGoal)} kcal
                </div>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border border-border/60 rounded-lg">
                      <Skeleton className="w-24 h-24 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-24 mb-2" />
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-6 w-16" />
                        </div>
                      </div>
                      <Skeleton className="w-20 h-10" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="text-destructive mb-2">Fehler beim Laden</div>
                  <div className="text-sm text-muted-foreground mb-4">{error}</div>
                  <button 
                    onClick={fetchMeals}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
                  >
                    Erneut versuchen
                  </button>
                </div>
              ) : meals.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-2">Noch keine Mahlzeiten heute</div>
                  <div className="text-sm text-muted-foreground mb-4">Tippe auf + um zu starten</div>
                  <button 
                    onClick={() => openMeal()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
                  >
                    Erste Mahlzeit hinzufügen
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedMeals.map(group => {
                    const expanded = !!expandedGroups[group.label];
                    return (
                      <div key={group.label}>
                        <button
                          onClick={() => setExpandedGroups(prev => ({ ...prev, [group.label]: !prev[group.label] }))}
                          className="w-full flex items-center justify-between mb-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <h3 className="text-base font-medium">{group.label} ({group.meals.length})</h3>
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-muted-foreground">
                              {Math.round(group.totalKcal)} kcal
                            </div>
                            <span className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
                          </div>
                        </button>
                        {expanded && (
                          <div className="space-y-3">
                            {group.meals.map(m => {
                              const isEditing = editingMealId === m.id;
                              return (
                                <div key={m.id} className="flex items-center gap-4 p-4 border border-border/60 rounded-lg bg-background hover:bg-accent/50 transition-colors">
                                  <div className="w-24 h-24 rounded-lg bg-muted overflow-hidden shrink-0">
                                    {m.image_url && (
                                      <BlurImage
                                        src={m.image_url}
                                        alt={m.title || 'Meal image'}
                                        w={96}
                                        h={96}
                                        className="w-full h-full object-cover"
                                        sizes="96px"
                                      />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {isEditing ? (
                                      <input
                                        value={mealTitleDraft}
                                        onChange={(e) => setMealTitleDraft(e.target.value)}
                                        className="w-full h-9 px-3 rounded-md border border-border/60 bg-background text-sm mb-2"
                                        placeholder="Mahlzeit-Titel"
                                        aria-label="Mahlzeit-Titel"
                                      />
                                    ) : (
                                      <div className="text-base font-medium mb-2 truncate">
                                        {m.title || 'Unbenannte Mahlzeit'}
                                      </div>
                                    )}
                                    <div className="flex flex-wrap gap-2 mb-2">
                                      <span className="inline-flex items-center rounded-full border border-border/60 px-2 py-0.5 text-[10px] leading-none">
                                        <span className="mr-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'hsl(var(--protein))' }} />
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
                                        <button 
                                          aria-label="Speichern" 
                                          className="w-11 h-11 rounded-md bg-primary text-primary-foreground flex items-center justify-center" 
                                          onClick={saveEditMeal}
                                        >
                                          <Check className="w-4 h-4" />
                                        </button>
                                        <button 
                                          aria-label="Abbrechen" 
                                          className="w-11 h-11 rounded-md border border-border/60 flex items-center justify-center" 
                                          onClick={cancelEditMeal}
                                        >
                                          <XIcon className="w-4 h-4" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <div className="shrink-0 text-sm font-medium tabular-nums">{Math.round(m.kcal || 0)} kcal</div>
                                        <button 
                                          aria-label="Bearbeiten" 
                                          className="w-11 h-11 rounded-md border border-border/60 flex items-center justify-center" 
                                          onClick={() => startEditMeal(m)}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                 </div>
               )}
             </CardContent>
          </Card>

          {/* Movement */}
          <MomentumMovement date={currentDate} />
        </main>

        <QuickAddFAB 
          statuses={{ 
            meal: remaining > kcalGoal * 0.05 ? (meals.length > 0 ? 'partial' : 'due') : 'ok', 
            workout: 'partial' 
          }} 
        />
      </div>
    </ErrorBoundary>
  );
};

export default MomentumPage;