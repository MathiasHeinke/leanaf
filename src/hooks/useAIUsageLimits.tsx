import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';

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
  const { isPremium } = useSubscription();
  const [loading, setLoading] = useState(false);

  const checkUsageLimit = async (
    featureType: 'meal_analysis' | 'coach_chat' | 'coach_recipes' | 'daily_analysis'
  ): Promise<AIUsageStatus | null> => {
    if (!user) return null;
    
    // Pro users have unlimited access
    if (isPremium) {
      return {
        can_use: true,
        daily_count: 0,
        monthly_count: 0,
        daily_limit: -1, // Unlimited
        monthly_limit: -1, // Unlimited
        daily_remaining: -1,
        monthly_remaining: -1
      };
    }

    // All AI features are now available for free users with limits

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
    if (!user || isPremium) return null;

    try {
      const { data, error } = await supabase
        .from('ai_usage_limits')
        .select('daily_count, monthly_count, last_reset_date, last_reset_month')
        .eq('user_id', user.id)
        .eq('feature_type', featureType)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting current usage:', error);
        return null;
      }

      if (!data) {
        return { daily_count: 0, monthly_count: 0 };
      }

      // Reset counts if needed
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7);
      
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