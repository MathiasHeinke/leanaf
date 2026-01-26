import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const LOCAL_STORAGE_KEY = 'ares_confetti_enabled';

/**
 * Hook to manage confetti/fireworks preference
 * Stores preference in localStorage for instant access and syncs with DB
 */
export const useConfettiPreference = () => {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    // Default: enabled, but check localStorage first
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [loading, setLoading] = useState(false);

  // Load preference from DB on mount
  useEffect(() => {
    if (user?.id) {
      loadFromDB();
    }
  }, [user?.id]);

  const loadFromDB = async () => {
    if (!user?.id) return;

    try {
      // Use raw query to avoid TypeScript issues until types regenerate
      const { data, error } = await supabase
        .from('profiles')
        .select('confetti_enabled')
        .eq('user_id', user.id)
        .maybeSingle() as { data: { confetti_enabled: boolean | null } | null, error: any };

      if (error) {
        console.error('Error loading confetti preference:', error);
        return;
      }

      // If DB has a value, use it. Otherwise keep the default (true)
      if (data && typeof data.confetti_enabled === 'boolean') {
        setIsEnabled(data.confetti_enabled);
        localStorage.setItem(LOCAL_STORAGE_KEY, String(data.confetti_enabled));
      }
    } catch (error) {
      console.error('Error loading confetti preference:', error);
    }
  };

  const setConfettiEnabled = async (enabled: boolean) => {
    // Optimistic update
    setIsEnabled(enabled);
    localStorage.setItem(LOCAL_STORAGE_KEY, String(enabled));

    if (!user?.id) return;

    setLoading(true);
    try {
      // Use raw query to avoid TypeScript issues until types regenerate
      const { error } = await supabase
        .from('profiles')
        .update({ confetti_enabled: enabled } as any)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving confetti preference:', error);
        // Revert on error
        setIsEnabled(!enabled);
        localStorage.setItem(LOCAL_STORAGE_KEY, String(!enabled));
      }
    } catch (error) {
      console.error('Error saving confetti preference:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    isConfettiEnabled: isEnabled,
    setConfettiEnabled,
    loading
  };
};

/**
 * Simple check function for use in components that just need to read the preference
 * Returns true if confetti is enabled (default behavior)
 */
export const isConfettiEnabled = (): boolean => {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  return stored === null ? true : stored === 'true';
};
