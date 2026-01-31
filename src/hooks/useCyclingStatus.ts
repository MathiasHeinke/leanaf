/**
 * useCyclingStatus - Hook for cycling supplement status
 * Provides real-time cycle status for individual supplements and batch queries
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getCycleStatus, isCycleActiveToday, type CycleStatus, type CycleScheduleExtended } from '@/lib/schedule-utils';
import type { UserStackItem } from '@/types/supplementLibrary';

interface CyclingSupplementInfo {
  id: string;
  name: string;
  schedule: CycleScheduleExtended | null;
  status: CycleStatus | null;
  isActive: boolean;
  cyclingReason?: string;
}

/**
 * Get cycle status for a single supplement
 */
export function useCyclingStatus(userSupplementId: string | undefined) {
  const { user } = useAuth();
  
  // Fetch the supplement schedule
  const { data: supplement, isLoading } = useQuery({
    queryKey: ['user-supplement-cycle', userSupplementId],
    queryFn: async () => {
      if (!userSupplementId) return null;
      
      const { data, error } = await supabase
        .from('user_supplements')
        .select(`
          id,
          schedule,
          supplement:supplement_database(
            name,
            cycling_required,
            cycling_protocol,
            default_cycle_on_days,
            default_cycle_off_days,
            cycling_reason
          )
        `)
        .eq('id', userSupplementId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!userSupplementId,
  });
  
  // Fetch intake count for compliance calculation
  const { data: intakeCount = 0 } = useQuery({
    queryKey: ['supplement-intake-count', userSupplementId],
    queryFn: async () => {
      if (!userSupplementId || !supplement?.schedule) return 0;
      
      const schedule = supplement.schedule as unknown as CycleScheduleExtended;
      if (!schedule || schedule.type !== 'cycle') return 0;
      
      // Get start date for current phase
      const phaseStart = schedule.current_cycle_start || schedule.start_date;
      if (!phaseStart) return 0;
      
      const { count, error } = await supabase
        .from('supplement_intake_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_supplement_id', userSupplementId)
        .gte('taken_at', phaseStart);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!supplement?.schedule && (supplement.schedule as any).type === 'cycle',
  });
  
  const status = useMemo(() => {
    if (!supplement?.schedule) return null;
    const schedule = supplement.schedule as unknown as CycleScheduleExtended;
    if (!schedule || schedule.type !== 'cycle') return null;
    return getCycleStatus(schedule, intakeCount);
  }, [supplement?.schedule, intakeCount]);
  
  return {
    status,
    isLoading,
    supplement: supplement?.supplement,
    cyclingReason: (supplement?.supplement as any)?.cycling_reason,
  };
}

/**
 * Get all cycling supplements for the current user
 * Grouped by on/off status for timeline display
 */
export function useAllCyclingSupplements() {
  const { user } = useAuth();
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['all-cycling-supplements', user?.id],
    queryFn: async () => {
      if (!user) return { onCycle: [], offCycle: [], all: [] };
      
      const { data: supplements, error } = await supabase
        .from('user_supplements')
        .select(`
          id,
          name,
          schedule,
          is_active,
          supplement:supplement_database(
            name,
            cycling_required,
            cycling_protocol,
            default_cycle_on_days,
            default_cycle_off_days,
            cycling_reason
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (error) throw error;
      
      const onCycle: CyclingSupplementInfo[] = [];
      const offCycle: CyclingSupplementInfo[] = [];
      const all: CyclingSupplementInfo[] = [];
      
      for (const supp of supplements || []) {
        const schedule = supp.schedule as unknown as CycleScheduleExtended | null;
        
        // Skip non-cycling supplements
        if (!schedule || schedule.type !== 'cycle') continue;
        
        const status = getCycleStatus(schedule);
        const isActive = isCycleActiveToday(schedule);
        
        const info: CyclingSupplementInfo = {
          id: supp.id,
          name: supp.name || (supp.supplement as any)?.name || 'Unknown',
          schedule,
          status,
          isActive,
          cyclingReason: (supp.supplement as any)?.cycling_reason,
        };
        
        all.push(info);
        
        if (isActive) {
          onCycle.push(info);
        } else {
          offCycle.push(info);
        }
      }
      
      return { onCycle, offCycle, all };
    },
    enabled: !!user,
  });
  
  return {
    onCycle: data?.onCycle || [],
    offCycle: data?.offCycle || [],
    all: data?.all || [],
    isLoading,
    refetch,
  };
}

/**
 * Calculate cycle status for a UserStackItem (for inline display)
 */
export function getCycleStatusForStackItem(item: UserStackItem): CycleStatus | null {
  const schedule = item.schedule as unknown as CycleScheduleExtended | null;
  if (!schedule || schedule.type !== 'cycle') return null;
  return getCycleStatus(schedule);
}

/**
 * Check if a stack item is currently in off-cycle
 */
export function isItemOffCycle(item: UserStackItem): boolean {
  const status = getCycleStatusForStackItem(item);
  return status ? !status.isOnCycle : false;
}
