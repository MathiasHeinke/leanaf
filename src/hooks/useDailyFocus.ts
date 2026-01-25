/**
 * useDailyFocus - Intelligent focus task selection
 * Determines the most important action based on missing data
 */

import { useMemo } from 'react';
import { useDailyGoals } from './useDailyGoals';
import { useTodaysWorkout } from './useTodaysWorkout';
import { useProtocolStatus } from './useProtocolStatus';
import { usePlusData } from './usePlusData';
import type { FocusTask } from '@/components/home/DynamicFocusCard';

interface UseDailyFocusReturn {
  focusTask: FocusTask | null;
  loading: boolean;
}

export function useDailyFocus(): UseDailyFocusReturn {
  const { data: goals, loading: goalsLoading } = useDailyGoals();
  const { data: workout, loading: workoutLoading } = useTodaysWorkout();
  const { status: protocol, loading: protocolLoading } = useProtocolStatus();
  const plusData = usePlusData();

  const loading = goalsLoading || workoutLoading || protocolLoading || plusData.loading;

  const focusTask = useMemo<FocusTask | null>(() => {
    if (loading) return null;

    const todaySummary = plusData.today;
    const hasMealsToday = (todaySummary?.total_calories || 0) > 0;
    const hasWorkoutToday = !!workout || plusData.workoutLoggedToday;
    
    // Calculate protein progress
    const proteinCurrent = todaySummary?.total_protein || 0;
    const proteinTarget = goals?.protein || 150;
    const proteinProgress = proteinTarget > 0 ? (proteinCurrent / proteinTarget) * 100 : 0;

    // Priority 1: No meals today
    if (!hasMealsToday) {
      return {
        type: 'food',
        title: 'Mahlzeit loggen',
        subtitle: 'Starte deinen Tag mit einem gesunden Frühstück. Foto hochladen oder beschreiben.',
        xp: 50,
      };
    }

    // Priority 2: No workout today (if training day)
    const weekday = new Date().getDay();
    const isTrainingDay = [1, 2, 4, 5].includes(weekday);
    if (isTrainingDay && !hasWorkoutToday) {
      return {
        type: 'training',
        title: 'Training planen',
        subtitle: 'Heute ist Trainingstag! Welches Workout steht an?',
        xp: 60,
      };
    }

    // Priority 3: Protein goal not reached
    if (proteinProgress < 80 && hasMealsToday) {
      const remaining = Math.round(proteinTarget - proteinCurrent);
      return {
        type: 'protein',
        title: 'Protein-Ziel offen',
        subtitle: `Dir fehlen noch ${remaining}g Protein. Ein Shake oder Fleisch wäre ideal.`,
        xp: 40,
        progress: Math.round(proteinProgress),
      };
    }

    // Priority 4: Protocol item missing
    if (protocol?.phase_0_checklist) {
      const checklist = protocol.phase_0_checklist;
      const missingItem = Object.entries(checklist).find(([_, item]) => !item.completed);
      if (missingItem) {
        return {
          type: 'checkin',
          title: 'Protocol fortsetzen',
          subtitle: `Nächster Schritt: ${missingItem[1].label || missingItem[0]}`,
          xp: 35,
        };
      }
    }

    // Default: Check-in with ARES
    return {
      type: 'checkin',
      title: 'Check-in mit ARES',
      subtitle: 'Alles erledigt! Erzähl mir, wie es dir geht oder stelle Fragen.',
      xp: 20,
    };
  }, [loading, goals, workout, protocol, plusData.today, plusData.workoutLoggedToday]);

  return { focusTask, loading };
}
