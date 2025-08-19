import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MealEntryUI, mapFromIndex } from '@/utils/mealMappers';

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function useIndexSnapshot(date: Date = new Date()) {
  const { user } = useAuth();
  const [meals, setMeals] = useState<MealEntryUI[]>([]);
  const [todayMl, setTodayMl] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const dateStr = useMemo(() => toDateStr(date), [date]);
  const todayStr = useMemo(() => toDateStr(new Date()), []);
  const isToday = dateStr === todayStr;

  useEffect(() => {
    let isCancelled = false;
    async function load() {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        // Meals
        if (isToday) {
          const { data, error } = await supabase
            .from('meals')
            .select('*')
            .eq('user_id', user.id)
            .order('ts', { ascending: false });
          if (error) throw error;
          if (!isCancelled) setMeals((data || []).map(mapFromIndex));
        } else {
          const next = new Date(date);
          next.setDate(next.getDate() + 1);
          const nextStr = toDateStr(next);
          const { data, error } = await supabase
            .from('meals')
            .select('id, user_id, created_at, text, calories, protein, carbs, fats')
            .eq('user_id', user.id)
            .gte('created_at', `${dateStr}T00:00:00Z`)
            .lt('created_at', `${nextStr}T00:00:00Z`)
            .order('created_at', { ascending: false });
          if (error) throw error;
          const mapped: MealEntryUI[] = (data || []).map((r: any) => ({
            id: r.id,
            ts: r.created_at,
            title: r.text ?? 'Meal',
            kcal: Number(r.calories ?? 0),
            protein: Number(r.protein ?? 0),
            carbs: Number(r.carbs ?? 0),
            fat: Number(r.fats ?? 0),
            imageUrl: null,
            source: 'index',
          }));
          if (!isCancelled) setMeals(mapped);
        }
        // Fluids
        if (isToday) {
          const { data, error } = await supabase
            .from('v_today_fluids')
            .select('today_ml')
            .eq('user_id', user.id)
            .maybeSingle();
          if (error) throw error;
          if (!isCancelled) setTodayMl(Number(data?.today_ml ?? 0));
        } else {
          const { data, error } = await supabase.rpc('fast_fluid_totals', { p_user: user.id, p_d: dateStr });
          if (error) throw error;
          if (!isCancelled) setTodayMl(Number(data ?? 0));
        }
      } catch (e: any) {
        if (!isCancelled) setError(e?.message || 'Fehler beim Laden');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }
    load();
    return () => { isCancelled = true; };
  }, [user?.id, dateStr, isToday]);

  return { meals, todayMl, loading, error };
}
