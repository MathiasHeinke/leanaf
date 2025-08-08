import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlusGoals {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fats?: number | null;
  calorie_deficit?: number | null;
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
}

export const usePlusData = (): UsePlusDataResult => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [goals, setGoals] = useState<PlusGoals | null>(null);
  const [last7, setLast7] = useState<PlusDaySummary[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(undefined);

        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) {
          setError('Nicht angemeldet');
          setLoading(false);
          return;
        }

        const todayStr = new Date().toISOString().slice(0, 10);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const fromStr = sevenDaysAgo.toISOString().slice(0, 10);

        const [goalsRes, summariesRes] = await Promise.all([
          supabase
            .from('daily_goals')
            .select('calories, protein, carbs, fats, calorie_deficit')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('daily_summaries')
            .select('date, total_calories, total_protein, total_carbs, total_fats')
            .eq('user_id', userId)
            .gte('date', fromStr)
            .lte('date', todayStr)
            .order('date', { ascending: true }),
        ]);

        if (goalsRes.error) throw goalsRes.error;
        if (summariesRes.error) throw summariesRes.error;

        setGoals(goalsRes.data || null);
        setLast7(
          (summariesRes.data || []).map((r) => ({
            date: r.date as string,
            total_calories: Number(r.total_calories || 0),
            total_protein: Number(r.total_protein || 0),
            total_carbs: Number(r.total_carbs || 0),
            total_fats: Number(r.total_fats || 0),
          }))
        );
      } catch (e: any) {
        setError(e?.message ?? 'Fehler beim Laden');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

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

  return { loading, error, goals, today, last7, remainingKcal, proteinDelta, carbBudget };
};
