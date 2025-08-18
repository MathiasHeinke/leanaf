import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dayRangeISO } from '@/lib/dateRange';
import { safeSingle } from '@/lib/sb-helpers';

function autoRecommendedMl(weightKg?: number) {
  if (!weightKg || weightKg <= 0) return 2000;
  return Math.round(weightKg * 35); // 35 ml * kg
}

export function useFluidTargets(userId?: string, weightKg?: number, date = new Date()) {
  const [state, set] = useState({
    loading: true, error: null as any,
    goalMl: 2000, recommendedMl: autoRecommendedMl(weightKg), source: 'fallback' as 'db' | 'fallback'
  });

  const goalDate = useMemo(() => dayRangeISO(date).startISO.slice(0,10), [date]); // YYYY-MM-DD

  useEffect(() => {
    if (!userId) { set(s => ({ ...s, loading:false })); return; }
    let cancelled = false;

    (async () => {
      set(s => ({ ...s, loading:true, error:null }));

      const q = supabase
        .from('daily_goals')
        .select('id, fluid_goal_ml, calories, protein, carbs, fats, goal_date')
        .eq('user_id', userId)
        .eq('goal_date', goalDate)
        .order('goal_date', { ascending:false })
        .limit(1);

      const { data, error } = await safeSingle(q);

      if (cancelled) return;

      if (error) { 
        set({ loading:false, error, goalMl: autoRecommendedMl(weightKg), recommendedMl: autoRecommendedMl(weightKg), source:'fallback' });
        return; 
      }

      const dbGoal = (data as any)?.fluid_goal_ml ?? null;
      const rec = autoRecommendedMl(weightKg);

      set({
        loading:false, error:null,
        goalMl: dbGoal ?? rec,
        recommendedMl: rec,
        source: dbGoal ? 'db' : 'fallback'
      });
    })();

    return () => { cancelled = true; };
  }, [userId, goalDate, weightKg]);

  const setGoalMl = async (ml: number) => {
    if (!userId) return;
    // Upsert pro Tag/Benutzer
    const { error } = await supabase.from('daily_goals').upsert({
      user_id: userId, goal_date: goalDate, fluid_goal_ml: ml
    }, { onConflict: 'user_id,goal_date' });
    if (!error) set(s => ({ ...s, goalMl: ml, source: 'db' }));
  };

  return { ...state, setGoalMl };
}