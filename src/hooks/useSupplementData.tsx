import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDateString } from '@/utils/dateHelpers';

export interface UserSupplement {
  id: string;
  supplement_id: string | null;
  custom_name: string | null;
  dosage: string;
  unit: string;
  timing: string[];
  goal: string | null;
  rating: number | null;
  notes: string | null;
  frequency_days: number | null;
  is_active?: boolean;
  supplement_name?: string;
  supplement_category?: string;
}

export interface SupplementIntake {
  id: string;
  user_supplement_id: string;
  timing: string;
  taken: boolean;
  date: string;
  notes?: string;
}

export interface TimeGroupedSupplements {
  [timing: string]: {
    supplements: UserSupplement[];
    intakes: SupplementIntake[];
    taken: number;
    total: number;
  };
}

export const TIMING_OPTIONS = [
  { value: 'morning', label: 'Morgens', icon: '☀️', tip: 'Auf leeren Magen für bessere Aufnahme' },
  { value: 'noon', label: 'Mittags', icon: '🌅', tip: 'Zwischen den Mahlzeiten' },
  { value: 'evening', label: 'Abends', icon: '🌙', tip: 'Mit dem Abendessen' },
  { value: 'pre_workout', label: 'Vor dem Training', icon: '💪', tip: '30-60 Min vor dem Training' },
  { value: 'post_workout', label: 'Nach dem Training', icon: '🏃', tip: 'Innerhalb 30 Min nach dem Training' },
  { value: 'before_bed', label: 'Vor dem Schlafengehen', icon: '🛏️', tip: '30-60 Min vor dem Schlafen' },
  { value: 'with_meals', label: 'Zu den Mahlzeiten', icon: '🍽️', tip: 'Mit oder direkt nach den Mahlzeiten' }
];

// Legacy timing mapping for backwards compatibility
export const LEGACY_TIMING_MAP: Record<string, string> = {
  'empty_stomach': 'morning',
  'between_meals': 'noon', 
  'with_food': 'with_meals',
  'before_sleep': 'before_bed',
  'workout': 'pre_workout',
  'after_workout': 'post_workout'
};

// Helper function to normalize and validate timing arrays
const normalizeTimingArray = (timing: string[] | string | null | undefined): string[] => {
  if (!timing) return ['morning'];
  
  // Handle string input (convert to array)
  if (typeof timing === 'string') {
    timing = [timing];
  }
  
  // Flatten nested arrays and clean data
  const flattened = timing.flat(Infinity) as string[];
  
  // Clean and map legacy timings
  const cleaned = flattened
    .map(t => {
      if (!t || typeof t !== 'string') return null;
      
      // Clean string (remove brackets, quotes, whitespace)
      let cleanTiming = t.replace(/[\[\]"]/g, '').trim();
      
      // Map legacy timing to standard timing
      if (LEGACY_TIMING_MAP[cleanTiming]) {
        cleanTiming = LEGACY_TIMING_MAP[cleanTiming];
      }
      
      // Validate against known timing options
      const isValid = TIMING_OPTIONS.some(option => option.value === cleanTiming);
      return isValid ? cleanTiming : null;
    })
    .filter((t): t is string => t !== null);
  
  // Remove duplicates and ensure we have at least one timing
  const unique = [...new Set(cleaned)];
  return unique.length > 0 ? unique : ['morning'];
};

// Helper function to get timing option with fallback
export const getTimingOption = (timing: string) => {
  return TIMING_OPTIONS.find(option => option.value === timing) || {
    value: timing,
    label: timing.charAt(0).toUpperCase() + timing.slice(1),
    icon: '⏰',
    tip: 'Einnahme nach Bedarf'
  };
};

export const useSupplementData = () => {
  const { user } = useAuth();
  const [userSupplements, setUserSupplements] = useState<UserSupplement[]>([]);
  const [todayIntakes, setTodayIntakes] = useState<SupplementIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSupplementData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Load user supplements
      const { data: supplements, error: supplementsError } = await supabase
        .from('user_supplements')
        .select(`
          id,
          supplement_id,
          custom_name,
          dosage,
          unit,
          timing,
          goal,
          rating,
          notes,
          frequency_days,
          is_active,
          name,
          supplement_database(name, category)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (supplementsError) throw supplementsError;

      // Format supplements data with normalized timing
      const formattedSupplements: UserSupplement[] = (supplements || []).map(s => ({
        ...s,
        timing: normalizeTimingArray(s.timing),
        supplement_name: s.custom_name || s.name || s.supplement_database?.name || 'Supplement',
        supplement_category: s.supplement_database?.category || 'Sonstige'
      }));

      // Load today's intake log
      const today = getCurrentDateString();
      const { data: intakes, error: intakesError } = await supabase
        .from('supplement_intake_log')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today);

      if (intakesError) throw intakesError;

      setUserSupplements(formattedSupplements);
      setTodayIntakes(intakes || []);
    } catch (err) {
      console.error('Error loading supplement data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load supplement data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupplementData();
  }, [user]);

  // Group supplements by timing with robust error handling
  const groupedSupplements: TimeGroupedSupplements = userSupplements.reduce((acc, supplement) => {
    // Ensure timing is always an array and normalized
    const normalizedTiming = normalizeTimingArray(supplement.timing);
    
    normalizedTiming.forEach(timing => {
      if (!acc[timing]) {
        acc[timing] = {
          supplements: [],
          intakes: [],
          taken: 0,
          total: 0
        };
      }
      
      acc[timing].supplements.push({
        ...supplement,
        timing: normalizedTiming // Use normalized timing
      });
      acc[timing].total += 1;
      
      // Find intake for this supplement and timing
      const intake = todayIntakes.find(i => 
        i.user_supplement_id === supplement.id && 
        i.timing === timing
      );
      
      if (intake) {
        acc[timing].intakes.push(intake);
        if (intake.taken) {
          acc[timing].taken += 1;
        }
      }
    });
    return acc;
  }, {} as TimeGroupedSupplements);

  // Calculate total stats
  const totalScheduled = Object.values(groupedSupplements).reduce((sum, group) => sum + group.total, 0);
  const totalTaken = Object.values(groupedSupplements).reduce((sum, group) => sum + group.taken, 0);
  const completionPercent = totalScheduled > 0 ? (totalTaken / totalScheduled) * 100 : 0;

  // Mark supplement as taken
  const markSupplementTaken = async (supplementId: string, timing: string, taken: boolean = true) => {
    if (!user) return;

    try {
      const today = getCurrentDateString();
      
      const { error } = await supabase
        .from('supplement_intake_log')
        .upsert({
          user_id: user.id,
          user_supplement_id: supplementId,
          timing: timing,
          taken: taken,
          date: today
        }, {
          onConflict: 'user_supplement_id,date,timing'
        });

      if (error) throw error;

      // Reload data to reflect changes
      await loadSupplementData();
    } catch (err) {
      console.error('Error marking supplement:', err);
      setError(err instanceof Error ? err.message : 'Failed to update supplement');
    }
  };

  // Mark entire timing group as taken
  const markTimingGroupTaken = async (timing: string, taken: boolean = true) => {
    if (!user) return;

    try {
      const group = groupedSupplements[timing];
      if (!group) return;

      const today = getCurrentDateString();
      
      const upsertData = group.supplements.map(supplement => ({
        user_id: user.id,
        user_supplement_id: supplement.id,
        timing: timing,
        taken: taken,
        date: today
      }));

      const { error } = await supabase
        .from('supplement_intake_log')
        .upsert(upsertData, {
          onConflict: 'user_supplement_id,date,timing'
        });

      if (error) throw error;

      // Reload data to reflect changes
      await loadSupplementData();
    } catch (err) {
      console.error('Error marking timing group:', err);
      setError(err instanceof Error ? err.message : 'Failed to update timing group');
    }
  };

  return {
    userSupplements,
    todayIntakes,
    groupedSupplements,
    totalScheduled,
    totalTaken,
    completionPercent,
    loading,
    error,
    markSupplementTaken,
    markTimingGroupTaken,
    refetch: loadSupplementData
  };
};