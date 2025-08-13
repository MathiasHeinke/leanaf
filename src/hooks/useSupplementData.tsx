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
  { value: 'morning', label: 'Morgens', icon: '☀️' },
  { value: 'noon', label: 'Mittags', icon: '🌅' },
  { value: 'evening', label: 'Abends', icon: '🌙' },
  { value: 'pre_workout', label: 'Vor dem Training', icon: '💪' },
  { value: 'post_workout', label: 'Nach dem Training', icon: '🏃' },
  { value: 'before_bed', label: 'Vor dem Schlafengehen', icon: '🛏️' },
  { value: 'with_meals', label: 'Zu den Mahlzeiten', icon: '🍽️' }
];

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

      // Format supplements data
      const formattedSupplements: UserSupplement[] = (supplements || []).map(s => ({
        ...s,
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

  // Group supplements by timing
  const groupedSupplements: TimeGroupedSupplements = userSupplements.reduce((acc, supplement) => {
    supplement.timing.forEach(timing => {
      if (!acc[timing]) {
        acc[timing] = {
          supplements: [],
          intakes: [],
          taken: 0,
          total: 0
        };
      }
      
      acc[timing].supplements.push(supplement);
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
          onConflict: 'user_id,user_supplement_id,timing,date'
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
          onConflict: 'user_id,user_supplement_id,timing,date'
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