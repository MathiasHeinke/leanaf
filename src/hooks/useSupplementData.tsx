import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDataRefresh } from '@/hooks/useDataRefresh';
import { runThrottled } from '@/lib/request-queue';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDateString } from '@/utils/dateHelpers';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';

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
  { value: 'before_bed', label: 'Vor dem Schlafengehen', icon: '🛏️', tip: '30-60 Min vor dem Schlafen' }
];

// Legacy timing mapping for backwards compatibility
export const LEGACY_TIMING_MAP: Record<string, string> = {
  'empty_stomach': 'morning',
  'between_meals': 'noon', 
  'with_food': 'evening',
  'before_sleep': 'before_bed',
  'workout': 'pre_workout',
  'after_workout': 'post_workout'
};

// Lightweight in-memory cache to avoid redundant reloads
type CacheValue = {
  supplements: UserSupplement[];
  intakes: SupplementIntake[];
  ts: number;
  hash: string;
};
const SUPP_CACHE_TTL_MS = 5000;
const suppCache = new Map<string, CacheValue>();
const cacheKeyFor = (userId: string, dateStr: string) => `${userId}|${dateStr}`;
const computeHash = (supps: UserSupplement[], intakes: SupplementIntake[]) => {
  const s = [...supps]
    .map(s => ({
      id: s.id,
      timing: s.timing,
      supplement_name: s.supplement_name,
      supplement_id: s.supplement_id,
      is_active: s.is_active,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const i = [...intakes]
    .map(x => ({
      user_supplement_id: x.user_supplement_id,
      timing: x.timing,
      taken: x.taken,
      date: x.date,
    }))
    .sort((a, b) => (a.user_supplement_id + a.timing).localeCompare(b.user_supplement_id + b.timing));
  return JSON.stringify({ s, i });
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

export const useSupplementData = (currentDate?: Date) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [userSupplements, setUserSupplements] = useState<UserSupplement[]>([]);
  const [todayIntakes, setTodayIntakes] = useState<SupplementIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lastFetchAtRef = useRef<number>(0);
  const lastHashRef = useRef<string>('');

  const loadSupplementData = useCallback(async (opts?: { force?: boolean }) => {
    const dateStr = currentDate ? currentDate.toISOString().split('T')[0] : getCurrentDateString();
    const userId = user?.id;

    if (!userId) {
      setLoading(false);
      return;
    }

    const key = cacheKeyFor(userId, dateStr);
    const now = Date.now();

    try {
      // Use cache if fresh and not forced
      if (!opts?.force) {
        const cached = suppCache.get(key);
        if (cached && now - cached.ts < SUPP_CACHE_TTL_MS) {
          setUserSupplements(cached.supplements);
          setTodayIntakes(cached.intakes);
          setLoading(false);
          return;
        }
        // Prevent thrashing: ignore if a fetch ran very recently
        if (now - lastFetchAtRef.current < 1000) {
          return;
        }
      }

      setLoading(true);
      setError(null);

      await runThrottled(async () => {
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
            preferred_timing,
            goal,
            rating,
            notes,
            frequency_days,
            is_active,
            name,
            supplement_database(name, category)
          `)
          .eq('user_id', userId)
          .eq('is_active', true);

        if (supplementsError) throw supplementsError;

        const formattedSupplements: UserSupplement[] = (supplements || []).map((s: any) => ({
          ...s,
          // Use preferred_timing as the primary timing source for grouping
          // This ensures consistency with Layer 3's mapTimingToPreferred logic
          timing: s.preferred_timing ? [s.preferred_timing] : normalizeTimingArray(s.timing),
          supplement_name: s.custom_name || s.name || s.supplement_database?.name || 'Supplement',
          supplement_category: s.supplement_database?.category || 'Sonstige',
        }));

        // Load today's intake log
        const { data: intakes, error: intakesError } = await supabase
          .from('supplement_intake_log')
          .select('*')
          .eq('user_id', userId)
          .eq('date', dateStr);

        if (intakesError) throw intakesError;

        const intakesArr = (intakes || []) as SupplementIntake[];
        const hash = computeHash(formattedSupplements, intakesArr);

        // Update cache
        suppCache.set(key, { supplements: formattedSupplements, intakes: intakesArr, ts: now, hash });

        // Only update state if content changed
        if (hash !== lastHashRef.current) {
          setUserSupplements(formattedSupplements);
          setTodayIntakes(intakesArr);
          lastHashRef.current = hash;
        }
      });
    } catch (err) {
      console.error('Error loading supplement data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load supplement data');
    } finally {
      lastFetchAtRef.current = Date.now();
      setLoading(false);
    }
  }, [user?.id, currentDate]);

  useEffect(() => {
    loadSupplementData();
  }, [loadSupplementData]);

  // Subscribe to global data refresh events; loader has TTL guard
  useDataRefresh(loadSupplementData);

  // Listen for unified supplement-stack-changed events
  useEffect(() => {
    const handleStackChange = () => loadSupplementData({ force: true });
    window.addEventListener('supplement-stack-changed', handleStackChange);
    return () => window.removeEventListener('supplement-stack-changed', handleStackChange);
  }, [loadSupplementData]);


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

  console.log('📈 useSupplementData: Final stats calculated:', {
    totalScheduled,
    totalTaken,
    completionPercent,
    groupedSupplements
  });

  // Mark supplement as taken with optimistic updates + cache sync
  const markSupplementTaken = async (supplementId: string, timing: string, taken: boolean = true) => {
    if (!user) return;

    const today = currentDate ? currentDate.toISOString().split('T')[0] : getCurrentDateString();
    const key = cacheKeyFor(user.id, today);

    const applyChange = (list: SupplementIntake[]) => {
      const filtered = list.filter(i => !(i.user_supplement_id === supplementId && i.timing === timing));
      if (taken) {
        filtered.push({
          id: `temp-${Date.now()}`,
          user_supplement_id: supplementId,
          timing,
          taken: true,
          date: today,
        });
      }
      return filtered;
    };

    // Optimistic update - immediately update local state
    setTodayIntakes(prev => applyChange(prev));

    // Update cache so subsequent loads don't refetch unnecessarily
    const cached = suppCache.get(key);
    if (cached) {
      const updatedIntakes = applyChange(cached.intakes);
      const newHash = computeHash(cached.supplements, updatedIntakes);
      suppCache.set(key, { ...cached, intakes: updatedIntakes, ts: Date.now(), hash: newHash });
      lastHashRef.current = newHash;
    }

    try {
      const { error } = await supabase
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

      if (error) throw error;
      
      // === IMMEDIATE WIDGET SYNC ===
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLEMENTS_TODAY });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_METRICS });
    } catch (err) {
      console.error('Error marking supplement:', err);
      // Rollback optimistic update on error
      await loadSupplementData({ force: true });
      setError(err instanceof Error ? err.message : 'Failed to update supplement');
    }
  };

  // Mark entire timing group as taken with optimistic updates
  const markTimingGroupTaken = async (timing: string, taken: boolean = true) => {
    if (!user) return;

    const group = groupedSupplements[timing];
    if (!group) return;

    const today = currentDate ? currentDate.toISOString().split('T')[0] : getCurrentDateString();
    
    // Optimistic update - immediately update local state for all supplements in group
    setTodayIntakes(prev => {
      const filtered = prev.filter(i => !(i.timing === timing && group.supplements.some(s => s.id === i.user_supplement_id)));
      
      if (taken) {
        const newIntakes = group.supplements.map(supplement => ({
          id: `temp-${Date.now()}-${supplement.id}`,
          user_supplement_id: supplement.id,
          timing,
          taken: true,
          date: today
        }));
        filtered.push(...newIntakes);
      }
      return filtered;
    });

    // Update cache to keep it in sync with optimistic state
    const key = cacheKeyFor(user.id, today);
    const cached = suppCache.get(key);
    if (cached) {
      const base = cached.intakes.filter(i => !(i.timing === timing && group.supplements.some(s => s.id === i.user_supplement_id)));
      const updatedIntakes = taken
        ? [
            ...base,
            ...group.supplements.map(supplement => ({
              id: `temp-${Date.now()}-${supplement.id}`,
              user_supplement_id: supplement.id,
              timing,
              taken: true,
              date: today,
            })),
          ]
        : base;
      const newHash = computeHash(cached.supplements, updatedIntakes);
      suppCache.set(key, { ...cached, intakes: updatedIntakes, ts: Date.now(), hash: newHash });
      lastHashRef.current = newHash;
    }


    try {
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
      
      // === IMMEDIATE WIDGET SYNC ===
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLEMENTS_TODAY });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_METRICS });
    } catch (err) {
      console.error('Error marking timing group:', err);
      // Rollback optimistic update on error
      await loadSupplementData();
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