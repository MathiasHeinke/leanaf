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
      
      // Get enabled feature flags
      const { data: enabledFlags, error } = await supabase
        .from('feature_flags')
        .select('flag_name, is_enabled, rollout_percentage');

      if (error) {
        console.error('Error fetching feature flags:', error);
        return;
      }

      // Convert to flag name -> boolean mapping
      const flagMap: Record<string, boolean> = {};
      enabledFlags?.forEach((flag: any) => {
        // Enable when rollout > 0 or explicitly enabled
        flagMap[flag.flag_name] = Boolean(flag.is_enabled) || Number(flag.rollout_percentage || 0) > 0;
      });

      setFlags(flagMap);
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