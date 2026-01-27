/**
 * useDailyMetrics - Single Source of Truth for all daily tracking data
 * Uses React Query for caching and optimistic updates
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DailyMetrics {
  water: { current: number; target: number };
  supplements: { takenIds: string[]; total: number };
  nutrition: { 
    calories: number; 
    protein: number; 
    carbs: number; 
    fats: number;
  };
  goals: { 
    calories: number; 
    protein: number; 
    carbs: number; 
    fats: number; 
    fluid_goal_ml: number;
  };
  // NEW: Weight, Training, Sleep
  weight: { latest: number | null; date: string | null };
  training: { todayType: string | null; todayMinutes: number | null };
  sleep: { lastHours: number | null; lastQuality: number | null };
}

export const DAILY_METRICS_KEY = ['daily-metrics'];

// Default values for fallback
const DEFAULT_GOALS = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fats: 65,
  fluid_goal_ml: 2500
};

export const useDailyMetrics = () => {
  return useQuery({
    queryKey: DAILY_METRICS_KEY,
    queryFn: async (): Promise<DailyMetrics> => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      
      if (!userId) {
        console.warn('[useDailyMetrics] No user authenticated');
        return {
          water: { current: 0, target: DEFAULT_GOALS.fluid_goal_ml },
          supplements: { takenIds: [], total: 0 },
          nutrition: { calories: 0, protein: 0, carbs: 0, fats: 0 },
          goals: DEFAULT_GOALS,
          weight: { latest: null, date: null },
          training: { todayType: null, todayMinutes: null },
          sleep: { lastHours: null, lastQuality: null }
        };
      }

      const todayStr = new Date().toISOString().slice(0, 10);

      // Fetch all data in parallel
      const [goalsRes, fluidsRes, suppsRes, mealsRes, weightRes, trainingRes, sleepRes] = await Promise.all([
        // Goals
        supabase
          .from('daily_goals')
          .select('calories, protein, carbs, fats, fluid_goal_ml')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        
        // Fluids via RPC for speed
        supabase.rpc('fast_fluid_totals', { p_user: userId, p_d: todayStr }),
        
        // Supplements taken today
        supabase
          .from('supplement_intake_log')
          .select('id, user_supplement_id')
          .eq('user_id', userId)
          .eq('date', todayStr)
          .eq('taken', true),
        
        // Today's meals for nutrition
        supabase
          .from('meals')
          .select('calories, protein, carbs, fats')
          .eq('user_id', userId)
          .gte('created_at', `${todayStr}T00:00:00`)
          .lte('created_at', `${todayStr}T23:59:59`),
        
        // Latest Weight
        supabase
          .from('weight_history')
          .select('weight, date')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        
        // Today's Training
        supabase
          .from('training_sessions')
          .select('training_type, total_duration_minutes')
          .eq('user_id', userId)
          .eq('session_date', todayStr)
          .limit(1)
          .maybeSingle(),
        
        // Last Sleep Entry
        supabase
          .from('sleep_tracking')
          .select('sleep_hours, sleep_quality, date')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      // Parse goals with fallbacks
      const goals = {
        calories: Number(goalsRes.data?.calories) || DEFAULT_GOALS.calories,
        protein: Number(goalsRes.data?.protein) || DEFAULT_GOALS.protein,
        carbs: Number(goalsRes.data?.carbs) || DEFAULT_GOALS.carbs,
        fats: Number(goalsRes.data?.fats) || DEFAULT_GOALS.fats,
        fluid_goal_ml: Number(goalsRes.data?.fluid_goal_ml) || DEFAULT_GOALS.fluid_goal_ml
      };

      // Water intake
      const waterCurrent = Number(fluidsRes.data || 0);

      // Supplements taken
      const supplementsTaken = (suppsRes.data || []).map(s => s.user_supplement_id);

      // Nutrition aggregation
      const nutrition = (mealsRes.data || []).reduce((acc, m) => ({
        calories: acc.calories + Number(m.calories || 0),
        protein: acc.protein + Number(m.protein || 0),
        carbs: acc.carbs + Number(m.carbs || 0),
        fats: acc.fats + Number(m.fats || 0)
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

      // Weight data
      const weight = {
        latest: weightRes.data?.weight ? Number(weightRes.data.weight) : null,
        date: weightRes.data?.date || null
      };

      // Training data
      const training = {
        todayType: trainingRes.data?.training_type || null,
        todayMinutes: trainingRes.data?.total_duration_minutes ? Number(trainingRes.data.total_duration_minutes) : null
      };

      // Sleep data
      const sleep = {
        lastHours: sleepRes.data?.sleep_hours ? Number(sleepRes.data.sleep_hours) : null,
        lastQuality: sleepRes.data?.sleep_quality ? Number(sleepRes.data.sleep_quality) : null
      };

      return {
        water: { current: waterCurrent, target: goals.fluid_goal_ml },
        supplements: { takenIds: supplementsTaken, total: supplementsTaken.length },
        nutrition,
        goals,
        weight,
        training,
        sleep
      };
    },
    staleTime: 1000 * 60 * 5,  // 5 min fresh
    gcTime: 1000 * 60 * 30,    // 30 min cache
    refetchOnMount: 'always', // Immer refetchen wenn gemountet (nach Profile-Save)
    retry: 1
  });
};

// Hook for optimistic cache manipulation
export const useOptimisticMetrics = () => {
  const queryClient = useQueryClient();
  
  const addWater = (amountMl: number) => {
    queryClient.setQueryData<DailyMetrics>(DAILY_METRICS_KEY, (old) => {
      if (!old) return old;
      return {
        ...old,
        water: { 
          ...old.water, 
          current: old.water.current + amountMl 
        }
      };
    });
  };

  const addSupplement = (supplementId: string) => {
    queryClient.setQueryData<DailyMetrics>(DAILY_METRICS_KEY, (old) => {
      if (!old) return old;
      return {
        ...old,
        supplements: {
          ...old.supplements,
          takenIds: [...old.supplements.takenIds, supplementId],
          total: old.supplements.total + 1
        }
      };
    });
  };
  
  const rollback = () => {
    queryClient.invalidateQueries({ queryKey: DAILY_METRICS_KEY });
  };
  
  return { addWater, addSupplement, rollback };
};
