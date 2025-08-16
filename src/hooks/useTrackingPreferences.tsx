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
      console.log('Loading preferences for user:', user.id);
      
      const { data, error } = await supabase
        .from('user_tracking_preferences')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order');

      if (error) {
        console.error('Error loading preferences:', error);
        // Don't throw error, just continue with empty array
        setPreferences([]);
        return;
      }

      console.log('Loaded preferences data:', data);
      setPreferences(data || []);
      
      // If no preferences exist, create defaults silently
      if (!data || data.length === 0) {
        console.log('No preferences found, creating defaults');
        await createDefaultPreferences();
      }
    } catch (error) {
      console.error('Error loading tracking preferences:', error);
      // Fallback to empty preferences
      setPreferences([]);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPreferences = async () => {
    if (!user?.id) return;

    const defaultPrefs = [
      { tracking_type: 'meal_input', is_enabled: true, display_order: 1 },
      { tracking_type: 'weight_tracking', is_enabled: true, display_order: 2 },
      { tracking_type: 'workout_tracking', is_enabled: true, display_order: 3 },
      { tracking_type: 'sleep_tracking', is_enabled: true, display_order: 4 },
      { tracking_type: 'fluid_tracking', is_enabled: true, display_order: 5 },
      { tracking_type: 'supplement_tracking', is_enabled: true, display_order: 6 }
    ];

    const createdPrefs: TrackingPreference[] = [];

    for (const pref of defaultPrefs) {
      try {
        const { data, error } = await supabase
          .from('user_tracking_preferences')
          .insert({
            user_id: user.id,
            ...pref
          })
          .select()
          .single();

        if (!error && data) {
          createdPrefs.push(data);
        }
      } catch (error) {
        console.warn(`Error creating preference for ${pref.tracking_type}:`, error);
        // Continue with other preferences even if one fails
      }
    }

    if (createdPrefs.length > 0) {
      setPreferences(createdPrefs);
    }
  };

  const isTrackingEnabled = (trackingType: string): boolean => {
    // If still loading, default to true to prevent blocking UI
    if (loading) return true;
    
    const preference = preferences.find(p => p.tracking_type === trackingType);
    // Default to true if no preference is found
    return preference?.is_enabled ?? true;
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