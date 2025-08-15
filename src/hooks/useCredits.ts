import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type FeatureType =
  | 'meal_analysis'
  | 'meal_correction'
  | 'meal_leftovers'
  | 'coach_chat_msg'
  | 'coach_recipes'
  | 'daily_analysis'
  | 'supplement_recognition'
  | 'body_transform_image'
  | 'voice_transcription';

export interface CreditsStatus {
  user_id: string;
  credits_remaining: number;
  monthly_quota: number;
  tester: boolean;
  last_reset_month: string;
  current_month: string;
}

export interface ConsumeResult {
  success: boolean;
  reason?: 'insufficient_credits' | string;
  feature_type: FeatureType | string;
  cost: number;
  deducted: boolean;
  credits_before?: number;
  credits_remaining: number;
}

export const useCredits = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<CreditsStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const isAuthenticated = !!user?.id;

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setStatus(null);
      return null;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_credits_status');
      if (error) throw error;
      setStatus(data as unknown as CreditsStatus);
      return data as unknown as CreditsStatus;
    } catch (e) {
      console.error('Failed to fetch credits status', e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const check = useCallback(
    async (feature: FeatureType) => {
      // ✅ UNLIMITED MODE: Always return success without consuming credits
      if (!isAuthenticated) return null;
      return {
        success: true,
        feature_type: feature,
        cost: 0,
        deducted: false,
        credits_remaining: 999999, // Show unlimited
      } as ConsumeResult;
    },
    [isAuthenticated]
  );

  const consume = useCallback(
    async (feature: FeatureType) => {
      // ✅ UNLIMITED MODE: Always return success without consuming credits
      if (!isAuthenticated) return null;
      return {
        success: true,
        feature_type: feature,
        cost: 0,
        deducted: false,
        credits_remaining: 999999, // Show unlimited
      } as ConsumeResult;
    },
    [isAuthenticated]
  );

  // Auto-refresh on login
  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    } else {
      setStatus(null);
    }
  }, [isAuthenticated, refresh]);

  const creditsInfo = useMemo(() => {
    return {
      remaining: status?.credits_remaining ?? 0,
      quota: status?.monthly_quota ?? 0,
      tester: status?.tester ?? false,
      loading,
    };
  }, [status, loading]);

  return {
    status,
    loading,
    refresh,
    check,
    consume,
    creditsInfo,
    isAuthenticated,
  };
};
