/**
 * useTodaysMeals - Hook for fetching and managing today's meals
 * Part of the "Three-Layer-Design" for Nutrition tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DAILY_METRICS_KEY } from '@/hooks/useDailyMetrics';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { toast } from 'sonner';

export interface TodayMeal {
  id: string;
  text: string | null;
  title: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ts: string;
  mealType: string | null;
}

export const TODAYS_MEALS_KEY = QUERY_KEYS.TODAYS_MEALS;

export const useTodaysMeals = () => {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().slice(0, 10);

  const query = useQuery({
    queryKey: TODAYS_MEALS_KEY,
    queryFn: async (): Promise<TodayMeal[]> => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      
      if (!userId) return [];

      const { data, error } = await supabase
        .from('meals')
        .select('id, text, title, calories, protein, carbs, fats, created_at, meal_type')
        .eq('user_id', userId)
        .gte('created_at', `${todayStr}T00:00:00`)
        .lte('created_at', `${todayStr}T23:59:59`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[useTodaysMeals] Error fetching meals:', error);
        throw error;
      }

      return (data || []).map(meal => ({
        id: meal.id,
        text: meal.text,
        title: meal.title,
        calories: Number(meal.calories) || 0,
        protein: Number(meal.protein) || 0,
        carbs: Number(meal.carbs) || 0,
        fats: Number(meal.fats) || 0,
        ts: meal.created_at,
        mealType: meal.meal_type
      }));
    },
    staleTime: 1000 * 60 * 2, // 2 min fresh
    gcTime: 1000 * 60 * 15,   // 15 min cache
  });

  const deleteMutation = useMutation({
    mutationFn: async (mealId: string) => {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealId);

      if (error) throw error;
      return mealId;
    },
    onMutate: async (mealId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: TODAYS_MEALS_KEY });

      // Snapshot previous value
      const previousMeals = queryClient.getQueryData<TodayMeal[]>(TODAYS_MEALS_KEY);

      // Optimistically remove the meal
      queryClient.setQueryData<TodayMeal[]>(TODAYS_MEALS_KEY, (old) => 
        old?.filter(meal => meal.id !== mealId) || []
      );

      return { previousMeals };
    },
    onError: (err, mealId, context) => {
      // Rollback on error
      if (context?.previousMeals) {
        queryClient.setQueryData(TODAYS_MEALS_KEY, context.previousMeals);
      }
      toast.error('Löschen fehlgeschlagen');
      console.error('[useTodaysMeals] Delete error:', err);
    },
    onSuccess: () => {
      // Invalidate daily metrics to update totals
      queryClient.invalidateQueries({ queryKey: DAILY_METRICS_KEY });
      toast.success('Mahlzeit gelöscht');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: TODAYS_MEALS_KEY });
    }
  });

  return {
    meals: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    deleteMeal: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    refetch: query.refetch
  };
};
