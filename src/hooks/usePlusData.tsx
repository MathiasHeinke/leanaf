import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDataRefresh } from '@/hooks/useDataRefresh';

export interface PlusGoals {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fats?: number | null;
  calorie_deficit?: number | null;
  fluid_goal_ml?: number | null;
}

export interface PlusDaySummary {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
}

export interface UsePlusDataResult {
  loading: boolean;
  error?: string;
  goals?: PlusGoals | null;
  today?: PlusDaySummary | null;
  last7?: PlusDaySummary[];
  remainingKcal?: number | null;
  proteinDelta?: number | null;
  carbBudget?: number | null;
  hydrationMlToday?: number;
  sleepLoggedToday?: boolean;
  sleepDurationToday?: number;
  stepsToday?: number;
  stepsTarget?: number;
  workoutLoggedToday?: boolean;
  supplementsLoggedToday?: boolean;
}

export const usePlusData = (): UsePlusDataResult => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [goals, setGoals] = useState<PlusGoals | null>(null);
  const [last7, setLast7] = useState<PlusDaySummary[]>([]);
  const [hydrationMlToday, setHydrationMlToday] = useState<number>(0);
  const [sleepDurationToday, setSleepDurationToday] = useState<number>(0);
  const [sleepLoggedToday, setSleepLoggedToday] = useState<boolean>(false);
  const [stepsToday, setStepsToday] = useState<number>(0);
  const [workoutLoggedToday, setWorkoutLoggedToday] = useState<boolean>(false);
  const [supplementsLoggedToday, setSupplementsLoggedToday] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        console.warn('⚠️ PlusData: No user authentication');
        setError('Nicht angemeldet');
        // FAIL-SAFE: Set defaults instead of blocking
        setGoals({ calories: 2000, protein: 150, carbs: 250, fats: 65 });
        setLast7([]);
        setLoading(false);
        return;
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const fromStr = sevenDaysAgo.toISOString().slice(0, 10);

      const [goalsRes, summariesRes, fluidsRes, sleepRes, workoutsRes, suppsRes] = await Promise.all([
        supabase
          .from('daily_goals')
          .select('calories, protein, carbs, fats, calorie_deficit, fluid_goal_ml')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('daily_summaries')
          .select('date, total_calories, total_protein, total_carbs, total_fats')
          .eq('user_id', userId)
          .gte('date', fromStr)
          .lte('date', todayStr)
          .order('date', { ascending: true }),
        supabase.rpc('fast_fluid_totals', { p_user: userId, p_d: todayStr }),
        supabase.from('sleep_tracking').select('sleep_hours').eq('user_id', userId).eq('date', todayStr).maybeSingle(),
        supabase.from('workouts').select('steps, duration_minutes, did_workout').eq('user_id', userId).eq('date', todayStr),
        supabase.from('supplement_intake_log').select('id').eq('user_id', userId).eq('date', todayStr).eq('taken', true).limit(1)
      ]);

      if (goalsRes.error) throw goalsRes.error;
      if (summariesRes.error) throw summariesRes.error;
      if (fluidsRes.error) throw fluidsRes.error;
      if ((workoutsRes as any).error) throw (workoutsRes as any).error;
      if ((suppsRes as any).error) throw (suppsRes as any).error;

      setGoals(goalsRes.data || null);
      
      // Map summaries data
      const mappedSummaries = (summariesRes.data || []).map((r) => ({
        date: r.date as string,
        total_calories: Number(r.total_calories || 0),
        total_protein: Number(r.total_protein || 0),
        total_carbs: Number(r.total_carbs || 0),
        total_fats: Number(r.total_fats || 0),
      }));

      // Check if today's data exists in summaries
      const todayExists = mappedSummaries.some(s => s.date === todayStr);
      
      // If no today summary, try to aggregate directly from meals table
      if (!todayExists) {
        const mealsRes = await supabase
          .from('meals')
          .select('calories, protein, carbs, fats')
          .eq('user_id', userId)
          .gte('created_at', `${todayStr}T00:00:00`)
          .lte('created_at', `${todayStr}T23:59:59`);
        
        if (mealsRes.data && mealsRes.data.length > 0) {
          const aggregated = mealsRes.data.reduce((acc, m) => ({
            total_calories: acc.total_calories + Number(m.calories || 0),
            total_protein: acc.total_protein + Number(m.protein || 0),
            total_carbs: acc.total_carbs + Number(m.carbs || 0),
            total_fats: acc.total_fats + Number(m.fats || 0),
          }), { total_calories: 0, total_protein: 0, total_carbs: 0, total_fats: 0 });
          
          // Add today's aggregated data
          mappedSummaries.push({
            date: todayStr,
            ...aggregated
          });
        }
      }
      
      setLast7(mappedSummaries);

      setHydrationMlToday(Number(fluidsRes.data || 0));
      const sleepHours = Number((sleepRes.data as any)?.sleep_hours || 0);
      setSleepDurationToday(sleepHours);
      setSleepLoggedToday(sleepHours > 0);

      const workouts = (workoutsRes.data as any[]) || [];
      const totalSteps = workouts.reduce((sum, w) => sum + Number(w.steps || 0), 0);
      setStepsToday(totalSteps);
      setWorkoutLoggedToday(workouts.some((w) => w.did_workout === true));

      setSupplementsLoggedToday(!!(suppsRes.data && (suppsRes.data as any[]).length > 0));
    } catch (e: any) {
      console.error('❌ PlusData fetch failed:', e);
      setError(e?.message ?? 'Fehler beim Laden');
      
      // FAIL-SAFE: Set safe defaults to prevent render blocking
      console.log('🛡️ PlusData: Setting safe defaults due to error');
      setGoals({ calories: 2000, protein: 150, carbs: 250, fats: 65 });
      setLast7([{
        date: new Date().toISOString().slice(0, 10),
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fats: 0
      }]);
      setHydrationMlToday(0);
      setSleepDurationToday(0);
      setSleepLoggedToday(false);
      setStepsToday(0);
      setWorkoutLoggedToday(false);
      setSupplementsLoggedToday(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useDataRefresh(fetchData);

  const today = useMemo(() => {
    if (!last7.length) return null;
    return last7[last7.length - 1];
  }, [last7]);

  const remainingKcal = useMemo(() => {
    if (!goals?.calories && !goals?.calorie_deficit) return null;
    const goalCalories = goals?.calories ?? null;
    if (goalCalories == null) return null;
    const consumed = today?.total_calories ?? 0;
    return Math.round(goalCalories - consumed);
  }, [goals, today]);

  const proteinDelta = useMemo(() => {
    if (!goals?.protein) return null;
    const consumed = today?.total_protein ?? 0;
    return Math.max(0, Math.round((goals.protein || 0) - consumed));
  }, [goals, today]);

  const carbBudget = useMemo(() => {
    if (!goals?.carbs) return null;
    const consumed = today?.total_carbs ?? 0;
    return Math.max(0, Math.round((goals.carbs || 0) - consumed));
  }, [goals, today]);

  return { loading, error, goals, today, last7, remainingKcal, proteinDelta, carbBudget, hydrationMlToday, sleepLoggedToday, sleepDurationToday, stepsToday, stepsTarget: 7000, workoutLoggedToday, supplementsLoggedToday };
};
