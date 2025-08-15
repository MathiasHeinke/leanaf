import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCredits } from './useCredits';
import { getCurrentDateString } from '@/utils/dateHelpers';

interface AIUsageStatus {
  can_use: boolean;
  daily_count: number;
  monthly_count: number;
  weekly_count?: number;
  daily_limit: number;
  monthly_limit: number;
  weekly_limit?: number;
  daily_remaining: number;
  monthly_remaining: number;
  weekly_remaining?: number;
}

export const useAIUsageLimits = () => {
  const { user } = useAuth();
  const { status: creditsStatus } = useCredits();
  const [loading, setLoading] = useState(false);

  const checkUsageLimit = async (
    featureType: 'meal_analysis' | 'coach_chat' | 'coach_recipes' | 'daily_analysis'
  ): Promise<AIUsageStatus | null> => {
    if (!user) return null;
    
    // ✅ UNLIMITED MODE: All users get unlimited access
    return {
      can_use: true,
      daily_count: 0,
      monthly_count: 0,
      daily_limit: -1, // Unlimited
      monthly_limit: -1, // Unlimited
      daily_remaining: -1,
      monthly_remaining: -1
    };

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_ai_usage_limit', {
        p_user_id: user.id,
        p_feature_type: featureType
      });

      if (error) {
        console.error('Error checking AI usage limit:', error);
        return null;
      }

      return data as unknown as AIUsageStatus;
    } catch (error) {
      console.error('Error checking AI usage limit:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUsage = async (featureType: string) => {
    if (!user || creditsStatus.credits_remaining <= 0) return null;

    try {
      const { data, error } = await supabase
        .from('ai_usage_limits')
        .select('daily_count, monthly_count, last_reset_date, last_reset_month')
        .eq('user_id', user.id)
        .eq('feature_type', featureType)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting current usage:', error);
        return null;
      }

      if (!data) {
        return { daily_count: 0, monthly_count: 0 };
      }

      // Reset counts if needed
      const today = getCurrentDateString();
      const currentMonth = getCurrentDateString().substring(0, 7);
      
      return {
        daily_count: data.last_reset_date === today ? data.daily_count : 0,
        monthly_count: data.last_reset_month?.substring(0, 7) === currentMonth ? data.monthly_count : 0
      };
    } catch (error) {
      console.error('Error getting current usage:', error);
      return null;
    }
  };

  return {
    checkUsageLimit,
    getCurrentUsage,
    loading
  };
};