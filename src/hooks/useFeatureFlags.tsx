import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeatureFlagHook {
  isEnabled: (flagName: string) => boolean;
  loading: boolean;
  flags: Record<string, boolean>;
  refreshFlags: () => void;
}

export const useFeatureFlags = (): FeatureFlagHook => {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchFeatureFlags = async () => {
    try {
      setLoading(true);

      // Current user
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      // 1) Global flags (feature_flags)
      const { data: enabledFlags, error: globalErr } = await supabase
        .from('feature_flags')
        .select('flag_name, is_enabled, rollout_percentage');
      if (globalErr) {
        console.error('Error fetching global feature flags:', globalErr);
      }
      const globalMap: Record<string, boolean> = {};
      enabledFlags?.forEach((flag: any) => {
        globalMap[flag.flag_name] = Boolean(flag.is_enabled) || Number(flag.rollout_percentage || 0) > 0;
      });

      // 2) Per-user JSON flags (user_feature_flags.metadata)
      let userMap: Record<string, boolean> = {};
      if (userId) {
        const { data: userRows, error: userErr } = await supabase
          .from('user_feature_flags')
          .select('metadata, assigned_at')
          .eq('user_id', userId)
          .order('assigned_at', { ascending: true });
        if (userErr) {
          console.warn('Error fetching user feature flags:', userErr);
        }
        const meta: Record<string, any> = (userRows || []).reduce((acc: any, r: any) => ({ ...acc, ...(r?.metadata || {}) }), {});
        userMap = Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, Boolean(v)]));
      }

      // Merge: user overrides globals
      const merged = { ...globalMap, ...userMap };
      setFlags(merged);
    } catch (error) {
      console.error('Failed to fetch feature flags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatureFlags();
  }, []);

  const isEnabled = (flagName: string): boolean => {
    return flags[flagName] ?? false;
  };

  return {
    isEnabled,
    loading,
    flags,
    refreshFlags: fetchFeatureFlags
  };
};

// Helper to check a flag from the merged boolean map.
export const isFeatureEnabled = (flagsMap: Record<string, boolean> | undefined, key: string): boolean => {
  return Boolean(flagsMap?.[key]);
};
