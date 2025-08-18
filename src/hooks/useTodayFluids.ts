import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dayRangeISO } from '@/lib/dateRange';

type Totals = { 
  hydrationMl: number; 
  totalMl: number; 
  goalMl: number; 
  percent: number; 
  loading: boolean; 
  error?: string 
};

export function useTodayFluids(userId?: string, date = new Date()): Totals {
  const [state, setState] = useState<Totals>({ 
    hydrationMl: 0, 
    totalMl: 0, 
    goalMl: 0, 
    percent: 0, 
    loading: true 
  });

  const { startISO, endISO } = useMemo(() => dayRangeISO(date), [date]);

  useEffect(() => {
    if (!userId) { 
      setState(s => ({ ...s, loading: false })); 
      return; 
    }
    
    let cancel = false;

    const fetchData = async () => {
      setState(s => ({ ...s, loading: true, error: undefined }));

      try {
        // Get goal from daily_goals table first, then profile fallback
        let goalMl = 0;
        
        const { data: dailyGoal } = await supabase
          .from('daily_goals')
          .select('water_goal_ml, goal_date')
          .eq('user_id', userId)
          .gte('goal_date', startISO)
          .lt('goal_date', endISO)
          .order('goal_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dailyGoal?.water_goal_ml) {
          goalMl = dailyGoal.water_goal_ml;
        } else {
          // Fallback to profile with correct column names
          const { data: profile } = await supabase
            .from('profiles')
            .select('weight')
            .eq('user_id', userId)
            .maybeSingle();
          
          goalMl = profile?.weight ? Math.round(profile.weight * 35) : 2000;
        }

        // Get fluids data
        const { data: rows, error } = await supabase
          .from('user_fluids')
          .select('amount_ml, consumed_at, has_alcohol, fluid_database(has_alcohol)')
          .eq('user_id', userId)
          .gte('consumed_at', startISO)
          .lt('consumed_at', endISO);

        if (cancel) return;
        if (error) {
          setState({ 
            hydrationMl: 0, 
            totalMl: 0, 
            goalMl, 
            percent: 0, 
            loading: false, 
            error: error.message 
          });
          return;
        }

        const totalMl = (rows ?? []).reduce((s, r: any) => s + (Number(r.amount_ml) || 0), 0);
        const hydrationMl = (rows ?? []).reduce((s, r: any) => {
          const hasAlcohol = r.has_alcohol ?? r.fluid_database?.has_alcohol ?? false;
          return s + (hasAlcohol ? 0 : (Number(r.amount_ml) || 0));
        }, 0);

        const percent = goalMl ? Math.min(100, Math.round((hydrationMl / goalMl) * 100)) : 0;
        setState({ hydrationMl, totalMl, goalMl, percent, loading: false });
      } catch (error: any) {
        if (!cancel) {
          setState({ 
            hydrationMl: 0, 
            totalMl: 0, 
            goalMl: 0, 
            percent: 0, 
            loading: false, 
            error: error.message 
          });
        }
      }
    };

    fetchData();
    return () => { cancel = true; };
  }, [userId, startISO, endISO]);

  return state;
}