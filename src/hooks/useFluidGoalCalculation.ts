import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDataRefresh } from '@/hooks/useDataRefresh';

interface FluidGoal {
  goalMl: number;
  isAutoCalculated: boolean;
  recommendedMl: number;
  userWeight?: number;
}

export function useFluidGoalCalculation() {
  const [data, setData] = useState<FluidGoal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const acRef = useRef<AbortController | null>(null);

  const calculateRecommendedIntake = (weightKg: number): number => {
    // Formula: 35ml per kg body weight
    return Math.round(weightKg * 35);
  };

  const fetchFluidGoal = async () => {
    if (!user?.id) return;
    if (acRef.current) acRef.current.abort();
    
    const ac = new AbortController();
    acRef.current = ac;
    
    setLoading(true);
    setError(null);

    try {
      // First try to get from profiles table (preferred source)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('fluid_goal_ml, weight')
        .eq('user_id', user.id)
        .maybeSingle();

      if (ac.signal.aborted) return;

      let goalMl = 2500; // fallback
      let recommendedMl = 2500; // fallback
      let userWeight: number | undefined;
      let isAutoCalculated = true;

      if (profileData) {
        userWeight = profileData.weight;
        
        if (userWeight) {
          recommendedMl = calculateRecommendedIntake(userWeight);
        }

        // Use profile fluid goal if set, otherwise use recommended
        goalMl = profileData.fluid_goal_ml || recommendedMl;
        
        // If user has explicitly set a goal different from recommended, it's manual
        if (profileData.fluid_goal_ml && userWeight) {
          isAutoCalculated = Math.abs(profileData.fluid_goal_ml - recommendedMl) < 50;
        }
      }

      // Fallback: try daily_goals table
      if (!profileData?.fluid_goal_ml) {
        const { data: dailyGoalsData } = await supabase
          .from('daily_goals')
          .select('fluid_goal_ml')
          .eq('user_id', user.id)
          .maybeSingle();

        if (dailyGoalsData?.fluid_goal_ml) {
          goalMl = dailyGoalsData.fluid_goal_ml;
          isAutoCalculated = false; // daily goals are typically manual
        }
      }

      if (!ac.signal.aborted) {
        setData({
          goalMl,
          recommendedMl,
          isAutoCalculated,
          userWeight
        });
      }
    } catch (err: any) {
      if (!ac.signal.aborted) {
        console.error('[useFluidGoalCalculation] Error:', err);
        setError(err.message);
        // Set fallback data
        setData({
          goalMl: 2500,
          recommendedMl: 2500,
          isAutoCalculated: true
        });
      }
    } finally {
      if (!ac.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const updateFluidGoal = async (newGoalMl: number, useAutoCalculation = false) => {
    if (!user?.id) return false;

    try {
      let finalGoalMl = newGoalMl;
      
      if (useAutoCalculation && data?.userWeight) {
        finalGoalMl = calculateRecommendedIntake(data.userWeight);
      }

      // Update profiles table (preferred)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          fluid_goal_ml: finalGoalMl
        });

      if (profileError) {
        console.error('Failed to update profile fluid goal:', profileError);
        
        // Fallback: update daily_goals
        const { error: dailyGoalsError } = await supabase
          .from('daily_goals')
          .upsert({
            user_id: user.id,
            fluid_goal_ml: finalGoalMl
          });

        if (dailyGoalsError) {
          throw dailyGoalsError;
        }
      }

      // Refresh local data
      await fetchFluidGoal();
      return true;
    } catch (err: any) {
      console.error('[useFluidGoalCalculation] Update error:', err);
      setError(err.message);
      return false;
    }
  };

  useEffect(() => {
    fetchFluidGoal();
    return () => {
      if (acRef.current) acRef.current.abort();
    };
  }, [user?.id]);

  // Refresh when data changes globally
  useDataRefresh(() => {
    fetchFluidGoal();
  });

  return {
    data,
    loading,
    error,
    updateFluidGoal,
    refresh: fetchFluidGoal
  };
}