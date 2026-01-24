import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, differenceInWeeks } from "date-fns";

export interface PhaseProgress {
  currentPhase: number;
  currentWeek: number;
  totalWeeks: number;
  phaseStartDate: Date | null;
  daysInPhase: number;
  startKFA: number | null;
  currentKFA: number | null;
  targetKFA: number;
  kfaProgress: number; // 0-100%
  kfaTrend: 'up' | 'down' | 'stable';
}

const PHASE_DURATIONS: Record<number, number> = {
  1: 24, // Phase 1: 24 weeks
  2: 12, // Phase 2: 12 weeks
  3: 52, // Phase 3: ongoing/maintenance
};

const PHASE_KFA_TARGETS: Record<number, number> = {
  1: 12, // Phase 1 target: 12% body fat
  2: 10, // Phase 2 target: 10% body fat
  3: 10, // Phase 3: maintain
};

export function usePhaseProgress() {
  const [progress, setProgress] = useState<PhaseProgress>({
    currentPhase: 1,
    currentWeek: 1,
    totalWeeks: 24,
    phaseStartDate: null,
    daysInPhase: 0,
    startKFA: null,
    currentKFA: null,
    targetKFA: 12,
    kfaProgress: 0,
    kfaTrend: 'stable',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch protocol status
      const { data: statusData, error: statusError } = await supabase
        .from('user_protocol_status')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (statusError) throw statusError;

      // Determine current phase and start date
      let currentPhase = 0;
      let phaseStartDate: Date | null = null;

      if (statusData?.phase_3_started_at) {
        currentPhase = 3;
        phaseStartDate = new Date(statusData.phase_3_started_at);
      } else if (statusData?.phase_2_started_at) {
        currentPhase = 2;
        phaseStartDate = new Date(statusData.phase_2_started_at);
      } else if (statusData?.phase_1_started_at) {
        currentPhase = 1;
        phaseStartDate = new Date(statusData.phase_1_started_at);
      }

      const totalWeeks = PHASE_DURATIONS[currentPhase] || 24;
      const targetKFA = PHASE_KFA_TARGETS[currentPhase] || 12;

      // Calculate weeks in phase
      let currentWeek = 1;
      let daysInPhase = 0;
      
      if (phaseStartDate) {
        daysInPhase = differenceInDays(new Date(), phaseStartDate);
        currentWeek = Math.max(1, differenceInWeeks(new Date(), phaseStartDate) + 1);
      }

      // Fetch body measurements for KFA tracking
      const { data: measurements, error: measurementsError } = await supabase
        .from('body_measurements')
        .select('date, belly, waist')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(10);

      if (measurementsError) {
        console.warn('Could not fetch body measurements:', measurementsError);
      }

      // Calculate KFA progress (simplified - using waist as proxy)
      let startKFA: number | null = null;
      let currentKFA: number | null = null;
      let kfaTrend: 'up' | 'down' | 'stable' = 'stable';

      if (measurements && measurements.length > 0) {
        // Current is most recent
        currentKFA = measurements[0]?.waist || null;
        
        // Start is oldest in the set
        startKFA = measurements[measurements.length - 1]?.waist || null;

        // Determine trend
        if (measurements.length >= 2 && currentKFA && measurements[1]?.waist) {
          const previousKFA = measurements[1].waist;
          if (currentKFA < previousKFA) kfaTrend = 'down';
          else if (currentKFA > previousKFA) kfaTrend = 'up';
        }
      }

      // Calculate progress percentage
      let kfaProgress = 0;
      if (startKFA && currentKFA && startKFA > targetKFA) {
        const totalReduction = startKFA - targetKFA;
        const currentReduction = startKFA - currentKFA;
        kfaProgress = Math.min(100, Math.max(0, Math.round((currentReduction / totalReduction) * 100)));
      }

      setProgress({
        currentPhase,
        currentWeek: Math.min(currentWeek, totalWeeks),
        totalWeeks,
        phaseStartDate,
        daysInPhase,
        startKFA,
        currentKFA,
        targetKFA,
        kfaProgress,
        kfaTrend,
      });
    } catch (err) {
      console.error('Error fetching phase progress:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { progress, loading, error, refetch: fetchProgress };
}
