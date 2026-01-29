import { useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDateString } from '@/utils/dateHelpers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, invalidateCategory } from '@/constants/queryKeys';

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
  { value: 'evening', label: 'Abends', icon: '🌙', tip: 'Mit dem Abendessen oder vor dem Schlaf' },
  { value: 'pre_workout', label: 'Vor dem Training', icon: '💪', tip: '30-60 Min vor dem Training' },
  { value: 'post_workout', label: 'Nach dem Training', icon: '🏃', tip: 'Innerhalb 30 Min nach dem Training' },
];

// Legacy timing mapping for backwards compatibility - all bedtime variants map to evening
export const LEGACY_TIMING_MAP: Record<string, string> = {
  'empty_stomach': 'morning',
  'between_meals': 'noon', 
  'with_food': 'evening',
  'before_bed': 'evening',
  'before_sleep': 'evening',
  'bedtime': 'evening',
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

interface SupplementQueryData {
  supplements: UserSupplement[];
  intakes: SupplementIntake[];
}

export const useSupplementData = (currentDate?: Date) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dateStr = currentDate ? currentDate.toISOString().split('T')[0] : getCurrentDateString();

  // React Query for automatic cache synchronization with Layer 1
  const { data, isLoading, error, refetch } = useQuery<SupplementQueryData>({
    queryKey: [...QUERY_KEYS.SUPPLEMENTS_DATA, dateStr],
    queryFn: async () => {
      if (!user?.id) return { supplements: [], intakes: [] };

      // Parallel fetch supplements + intakes
      const [supplementsRes, intakesRes] = await Promise.all([
        supabase
          .from('user_supplements')
          .select(`
            id,
            supplement_id,
            custom_name,
            dosage,
            unit,
            timing,
            preferred_timing,
            goal,
            rating,
            notes,
            frequency_days,
            is_active,
            name,
            supplement_database(name, category)
          `)
          .eq('user_id', user.id)
          .eq('is_active', true),
        supabase
          .from('supplement_intake_log')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', dateStr)
      ]);

      if (supplementsRes.error) throw supplementsRes.error;
      if (intakesRes.error) throw intakesRes.error;

      const formattedSupplements: UserSupplement[] = (supplementsRes.data || []).map((s: any) => ({
        ...s,
        // Use preferred_timing as the primary timing source for grouping
        timing: s.preferred_timing ? [s.preferred_timing] : normalizeTimingArray(s.timing),
        supplement_name: s.custom_name || s.name || s.supplement_database?.name || 'Supplement',
        supplement_category: s.supplement_database?.category || 'Sonstige',
      }));

      return {
        supplements: formattedSupplements,
        intakes: (intakesRes.data || []) as SupplementIntake[]
      };
    },
    enabled: !!user?.id,
    staleTime: 10000, // 10 seconds
    gcTime: 60000, // 1 minute
  });

  const userSupplements = data?.supplements || [];
  const todayIntakes = data?.intakes || [];

  // Group supplements by timing with robust error handling
  const groupedSupplements: TimeGroupedSupplements = useMemo(() => {
    return userSupplements.reduce((acc, supplement) => {
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
          timing: normalizedTiming
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
  }, [userSupplements, todayIntakes]);

  // Calculate total stats
  const totalScheduled = useMemo(() => 
    Object.values(groupedSupplements).reduce((sum, group) => sum + group.total, 0),
    [groupedSupplements]
  );
  
  const totalTaken = useMemo(() => 
    Object.values(groupedSupplements).reduce((sum, group) => sum + group.taken, 0),
    [groupedSupplements]
  );
  
  const completionPercent = totalScheduled > 0 ? (totalTaken / totalScheduled) * 100 : 0;

  // Invalidate all supplement-related queries
  const invalidateSupplementQueries = useCallback(() => {
    invalidateCategory(queryClient, 'supplements');
  }, [queryClient]);

  // Mark supplement as taken with optimistic updates
  const markSupplementTaken = useCallback(async (supplementId: string, timing: string, taken: boolean = true) => {
    if (!user) return;

    const today = dateStr;
    const queryKey = [...QUERY_KEYS.SUPPLEMENTS_DATA, today];

    // Optimistic update
    queryClient.setQueryData<SupplementQueryData>(queryKey, (old) => {
      if (!old) return old;
      const newIntakes = old.intakes.filter(
        i => !(i.user_supplement_id === supplementId && i.timing === timing)
      );
      if (taken) {
        newIntakes.push({
          id: `temp-${Date.now()}`,
          user_supplement_id: supplementId,
          timing,
          taken: true,
          date: today,
        });
      }
      return { ...old, intakes: newIntakes };
    });

    try {
      const { error: upsertError } = await supabase
        .from('supplement_intake_log')
        .upsert(
          {
            user_id: user.id,
            user_supplement_id: supplementId,
            timing: timing,
            taken: taken,
            date: today,
          },
          {
            onConflict: 'user_supplement_id,date,timing',
          }
        );

      if (upsertError) throw upsertError;
      
      // Invalidate all supplement-related queries for cross-layer sync
      invalidateSupplementQueries();
    } catch (err) {
      console.error('Error marking supplement:', err);
      // Rollback: refetch to restore correct state
      refetch();
    }
  }, [user, dateStr, queryClient, invalidateSupplementQueries, refetch]);

  // Mark entire timing group as taken with optimistic updates
  const markTimingGroupTaken = useCallback(async (timing: string, taken: boolean = true) => {
    if (!user) return;

    const group = groupedSupplements[timing];
    if (!group) return;

    const today = dateStr;
    const queryKey = [...QUERY_KEYS.SUPPLEMENTS_DATA, today];

    // Optimistic update
    queryClient.setQueryData<SupplementQueryData>(queryKey, (old) => {
      if (!old) return old;
      const filtered = old.intakes.filter(
        i => !(i.timing === timing && group.supplements.some(s => s.id === i.user_supplement_id))
      );
      
      if (taken) {
        const newIntakes = group.supplements.map(supplement => ({
          id: `temp-${Date.now()}-${supplement.id}`,
          user_supplement_id: supplement.id,
          timing,
          taken: true,
          date: today,
        }));
        filtered.push(...newIntakes);
      }
      return { ...old, intakes: filtered };
    });

    try {
      const upsertData = group.supplements.map(supplement => ({
        user_id: user.id,
        user_supplement_id: supplement.id,
        timing: timing,
        taken: taken,
        date: today
      }));

      const { error: upsertError } = await supabase
        .from('supplement_intake_log')
        .upsert(upsertData, {
          onConflict: 'user_supplement_id,date,timing'
        });

      if (upsertError) throw upsertError;
      
      // Invalidate all supplement-related queries for cross-layer sync
      invalidateSupplementQueries();
    } catch (err) {
      console.error('Error marking timing group:', err);
      // Rollback: refetch to restore correct state
      refetch();
    }
  }, [user, dateStr, groupedSupplements, queryClient, invalidateSupplementQueries, refetch]);

  return {
    userSupplements,
    todayIntakes,
    groupedSupplements,
    totalScheduled,
    totalTaken,
    completionPercent,
    loading: isLoading,
    error: error?.message || null,
    markSupplementTaken,
    markTimingGroupTaken,
    refetch
  };
};
