import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TrackingPreference {
  id: string;
  tracking_type: string;
  is_enabled: boolean;
  display_order: number;
}

export const useTrackingPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<TrackingPreference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_tracking_preferences')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order');

      if (error) throw error;

      setPreferences(data || []);
    } catch (error) {
      console.error('Error loading tracking preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const isTrackingEnabled = (trackingType: string): boolean => {
    const preference = preferences.find(p => p.tracking_type === trackingType);
    return preference?.is_enabled || false;
  };

  const getEnabledTrackingTypes = (): string[] => {
    return preferences
      .filter(p => p.is_enabled)
      .sort((a, b) => a.display_order - b.display_order)
      .map(p => p.tracking_type);
  };

  return {
    preferences,
    loading,
    isTrackingEnabled,
    getEnabledTrackingTypes,
    refreshPreferences: loadPreferences
  };
};