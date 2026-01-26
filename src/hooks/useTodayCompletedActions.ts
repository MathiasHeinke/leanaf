/**
 * useTodayCompletedActions - Checks which quick actions have been completed today
 * Used by the carousel to smart-start at the first uncompleted item
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDateInTimezone, getUserTimezone } from '@/utils/dateHelpers';

export type ActionId = 'sleep' | 'weight' | 'supplements' | 'workout' | 'hydration' | 'nutrition' | 'journal';

interface UseTodayCompletedActionsReturn {
  completedActions: Set<ActionId>;
  loading: boolean;
  refetch: () => Promise<void>;
}

export const useTodayCompletedActions = (): UseTodayCompletedActionsReturn => {
  const { user } = useAuth();
  const [completedActions, setCompletedActions] = useState<Set<ActionId>>(new Set());
  const [loading, setLoading] = useState(true);

  const checkCompletions = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const timezone = getUserTimezone();
      const today = getCurrentDateInTimezone(timezone);
      const completed = new Set<ActionId>();

      // Helper to check table existence
      const checkTable = async (
        table: string, 
        dateColumn: string, 
        dateValue: string,
        isTimestamp = false
      ): Promise<boolean> => {
        let query = supabase
          .from(table as any)
          .select('id')
          .eq('user_id', user.id);
        
        if (isTimestamp) {
          query = query
            .gte(dateColumn, `${dateValue}T00:00:00`)
            .lt(dateColumn, `${dateValue}T23:59:59`);
        } else {
          query = query.eq(dateColumn, dateValue);
        }
        
        const { data } = await query.limit(1);
        return (data?.length ?? 0) > 0;
      };

      // Parallel queries for performance
      const [sleep, weight, supps, workout, fluids, meals, journal] = await Promise.all([
        checkTable('sleep_logs', 'date', today),
        checkTable('weight_entries', 'date', today),
        checkTable('supplement_intake_log', 'date', today),
        checkTable('training_sessions', 'session_date', today),
        checkTable('user_fluids', 'date', today),
        checkTable('meals', 'created_at', today, true),
        checkTable('journal_entries', 'entry_date', today),
      ]);

      if (sleep) completed.add('sleep');
      if (weight) completed.add('weight');
      if (supps) completed.add('supplements');
      if (workout) completed.add('workout');
      if (fluids) completed.add('hydration');
      if (meals) completed.add('nutrition');
      if (journal) completed.add('journal');

      setCompletedActions(completed);
    } catch (error) {
      console.error('[useTodayCompletedActions] Error checking completions:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkCompletions();
  }, [checkCompletions]);

  return { 
    completedActions, 
    loading,
    refetch: checkCompletions 
  };
};
