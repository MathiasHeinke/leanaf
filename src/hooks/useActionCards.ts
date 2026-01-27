/**
 * useActionCards - Dynamic action card prioritization
 * Decides which cards to show based on user data and context
 * Now with Smart Actions for frictionless logging
 * 
 * Uses useDailyMetrics for optimistic UI sync with widgets
 */

import { useMemo } from 'react';
import { usePlusData } from './usePlusData';
import { useDailyMetrics } from './useDailyMetrics';
import { useUserProfile } from './useUserProfile';
import { useSupplementData } from './useSupplementData';
import { useProtocols } from './useProtocols';
import { useIntakeLog } from './useIntakeLog';
import { Moon, PenTool, Pill, User, Droplets, Coffee, Check, LucideIcon, Sunrise, Clock, Dumbbell, Sparkles, Syringe, Scale, Utensils } from 'lucide-react';
import { useTodaysMeals } from './useTodaysMeals';

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
}

export interface ActionCard {
  id: string;
  type: 'insight' | 'epiphany' | 'sleep_fix' | 'journal' | 'supplement' | 'profile' | 'hydration' | 'protein' | 'peptide' | 'training' | 'weight' | 'sleep_log' | 'nutrition';
  title: string;
  subtitle: string;
  gradient: string;
  icon: LucideIcon;
  actionContext?: string;
  actionPrompt?: string;
  priority: number;
  xp: number;
  canSwipeComplete: boolean;
  quickActions?: QuickAction[];
}

export const useActionCards = () => {
  const plusData = usePlusData();
  const { data: dailyMetrics } = useDailyMetrics(); // Live optimistic data
  const { profileData, isLoading: profileLoading } = useUserProfile();
  const { groupedSupplements, totalScheduled, totalTaken } = useSupplementData();
  const { protocols } = useProtocols();
  const { isPeptideTakenToday } = useIntakeLog();
  const { meals } = useTodaysMeals();

  // Smart loading: only show initial loading state if no cached profile
  const isInitialLoading = profileLoading && !profileData;

  const cards = useMemo(() => {
    // Guard: During initial load without cache, only show epiphany card
    if (isInitialLoading) {
      return [{
        id: 'epiphany',
        type: 'epiphany' as const,
        title: 'ARES hat etwas entdeckt',
        subtitle: 'Tippe um die Erkenntnis aufzudecken',
        gradient: 'from-indigo-900 via-violet-800 to-purple-900',
        icon: Sparkles,
        priority: 10,
        xp: 25,
        canSwipeComplete: false
      }];
    }

    const result: ActionCard[] = [];
    const hour = new Date().getHours();
    
    // Use dailyMetrics for hydration (optimistic), plusData for others
    const hydrationMl = dailyMetrics?.water.current ?? plusData.hydrationMlToday ?? 0;
    const hydrationTarget = dailyMetrics?.water.target ?? 3000;

    // 1. Sleep card - if sleep was bad (< 6 hours)
    if (plusData.sleepLoggedToday && plusData.sleepDurationToday && plusData.sleepDurationToday < 6) {
      result.push({
        id: 'sleep_fix',
        type: 'sleep_fix',
        title: 'Schlaf optimieren',
        subtitle: `Nur ${plusData.sleepDurationToday.toFixed(1)}h Schlaf. Strategie besprechen?`,
        gradient: 'from-slate-800 to-slate-900',
        icon: Moon,
        actionContext: 'sleep_optimization_advice',
        priority: 1,
        xp: 25,
        canSwipeComplete: false // Opens chat instead
      });
    }

    // 2. Profile incomplete - encourage completion
    const profileComplete = profileData?.height && profileData?.weight && profileData?.age;
    if (!profileComplete) {
      result.push({
        id: 'profile',
        type: 'profile',
        title: 'Profil vervollständigen',
        subtitle: 'Für präzisere Empfehlungen brauche ich mehr Daten.',
        gradient: 'from-emerald-500 to-teal-600',
        icon: User,
        actionContext: 'complete_profile',
        priority: 2,
        xp: 50,
        canSwipeComplete: false // Navigates to profile
      });
    }

    // 3. Supplements - Show card if any supplements are not yet taken today
    const hasSupplements = totalScheduled > 0;
    const allSupplementsTaken = totalTaken >= totalScheduled;
    
    if (hasSupplements && !allSupplementsTaken && hour >= 6 && hour < 23) {
      // Get active timings for subtitle
      const activeTimings = Object.keys(groupedSupplements).filter(
        t => groupedSupplements[t]?.total > 0
      );
      const incompleteTimings = activeTimings.filter(
        t => groupedSupplements[t]?.taken < groupedSupplements[t]?.total
      );
      
      const timingLabels: Record<string, string> = {
        morning: 'Morgens',
        noon: 'Mittags',
        evening: 'Abends',
        pre_workout: 'Pre-WO',
        post_workout: 'Post-WO',
        before_bed: 'Vor Schlaf'
      };
      
      const pendingText = incompleteTimings.length <= 2
        ? incompleteTimings.map(t => timingLabels[t] || t).join(', ')
        : `${incompleteTimings.length} Phasen`;
      
      result.push({
        id: 'supplement',
        type: 'supplement',
        title: 'Supplements einnehmen',
        subtitle: `Noch offen: ${pendingText}`,
        gradient: 'from-cyan-500 to-blue-600',
        icon: Pill,
        actionContext: 'log_supplements',
        priority: 3,
        xp: 30,
        canSwipeComplete: false, // Uses timing circles instead
      });
    }

    // 3b. Peptide Card - Show if active protocols exist and not all taken today
    const activeProtocols = protocols.filter(p => p.is_active);
    const allPeptidesTaken = activeProtocols.every(protocol => {
      const peptide = protocol.peptides[0];
      return peptide && isPeptideTakenToday(protocol.id, peptide.name);
    });
    
    if (activeProtocols.length > 0 && !allPeptidesTaken) {
      const peptideNames = activeProtocols
        .map(p => p.peptides[0]?.name)
        .filter(Boolean)
        .slice(0, 2)
        .join(', ');
      
      result.push({
        id: 'peptide',
        type: 'peptide',
        title: 'Peptide injizieren',
        subtitle: peptideNames || 'Heute fällige Injektionen',
        gradient: 'from-purple-500 to-pink-600',
        icon: Syringe,
        actionContext: 'log_peptide',
        priority: 3,
        xp: 40,
        canSwipeComplete: false, // Uses peptide circles instead
      });
    }

    // 4. Hydration low - if under 1L by afternoon (uses optimistic data)
    const hydrationLow = hydrationMl < 1000 && hour >= 12;
    if (hydrationLow) {
      result.push({
        id: 'hydration',
        type: 'hydration',
        title: 'Mehr trinken',
        subtitle: `Erst ${(hydrationMl / 1000).toFixed(1)}L heute. Ziel: ${(hydrationTarget / 1000).toFixed(1)}L`,
        gradient: 'from-blue-500 to-cyan-500',
        icon: Droplets,
        actionContext: 'hydration_reminder',
        priority: 4,
        xp: 20,
        canSwipeComplete: true,
        quickActions: [
          { id: '250ml_water', label: '+250ml', icon: Droplets },
          { id: '500ml_water', label: '+500ml', icon: Droplets },
          { id: 'coffee', label: '+Kaffee', icon: Coffee }
        ]
      });
    }

    // 5. Evening Journal - after 18:00
    if (hour >= 18 && hour < 23) {
      result.push({
        id: 'journal',
        type: 'journal',
        title: 'Abend-Journal',
        subtitle: '3 Fragen um den Tag abzuschließen.',
        gradient: 'from-orange-500 to-amber-600',
        icon: PenTool,
        actionContext: 'start_evening_journal',
        priority: 5,
        xp: 40,
        canSwipeComplete: false // Opens journal flow
      });
    }

    // NEW: Sleep Log Card - Morning routine if no sleep logged
    const sleepLogged = dailyMetrics?.sleep?.lastHours != null || plusData.sleepLoggedToday;
    const isMorning = hour >= 6 && hour < 11;

    if (isMorning && !sleepLogged) {
      result.push({
        id: 'sleep_log',
        type: 'sleep_log',
        title: 'Wie hast du geschlafen?',
        subtitle: 'Logge deine Schlafqualität für bessere Insights.',
        gradient: 'from-indigo-500 to-blue-600',
        icon: Moon,
        actionContext: 'log_sleep',
        priority: 4,
        xp: 30,
        canSwipeComplete: false
      });
    }

    // NEW: Training Card - Training day without workout
    const dayOfWeek = new Date().getDay();
    const isTrainingDay = [1, 2, 4, 5].includes(dayOfWeek); // Mo, Di, Do, Fr
    const workoutLogged = dailyMetrics?.training?.todayType != null || plusData.workoutLoggedToday;

    if (isTrainingDay && !workoutLogged && hour >= 8 && hour < 22) {
      const dayNames: Record<number, string> = { 1: 'Montag', 2: 'Dienstag', 4: 'Donnerstag', 5: 'Freitag' };
      result.push({
        id: 'training',
        type: 'training',
        title: 'Training anstehend',
        subtitle: `${dayNames[dayOfWeek]} ist Trainingstag. Bereit?`,
        gradient: 'from-emerald-500 to-teal-600',
        icon: Dumbbell,
        actionContext: 'log_training',
        priority: 5,
        xp: 60,
        canSwipeComplete: false
      });
    }

    // NEW: Weight Card - Weekly weigh-in reminder
    const lastWeightDate = dailyMetrics?.weight?.date;
    const daysSinceLastWeight = lastWeightDate 
      ? Math.floor((Date.now() - new Date(lastWeightDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceLastWeight >= 7 && hour >= 6 && hour < 12) {
      result.push({
        id: 'weight',
        type: 'weight',
        title: 'Weekly Weigh-In',
        subtitle: lastWeightDate 
          ? `Letzte Messung vor ${daysSinceLastWeight} Tagen.`
          : 'Tracke dein Gewicht für den Wochentrend.',
        gradient: 'from-violet-500 to-purple-600',
        icon: Scale,
        actionContext: 'log_weight',
        priority: 6,
        xp: 20,
        canSwipeComplete: false
      });
    }

    // NEW: Nutrition Card - Meal reminder after 4+ hours
    const lastMealTime = meals.length > 0 
      ? new Date(meals[meals.length - 1].ts).getTime() 
      : null;
    const hoursSinceLastMeal = lastMealTime 
      ? (Date.now() - lastMealTime) / (1000 * 60 * 60) 
      : null;
    const needsMealReminder = (hoursSinceLastMeal !== null && hoursSinceLastMeal > 4) || 
                              (lastMealTime === null && hour >= 12);

    if (needsMealReminder && hour >= 8 && hour < 22) {
      result.push({
        id: 'nutrition',
        type: 'nutrition',
        title: 'Essens-Pause?',
        subtitle: hoursSinceLastMeal 
          ? `${Math.floor(hoursSinceLastMeal)}h seit der letzten Mahlzeit.`
          : 'Zeit für den ersten Fuel-Up.',
        gradient: 'from-orange-500 to-red-500',
        icon: Utensils,
        actionContext: 'log_nutrition',
        priority: 8,
        xp: 50,
        canSwipeComplete: false
      });
    }

    // 6. ARES Epiphany Card - AI-generated insight with reveal mechanic
    result.push({
      id: 'epiphany',
      type: 'epiphany',
      title: 'ARES hat etwas entdeckt',
      subtitle: 'Tippe um die Erkenntnis aufzudecken',
      gradient: 'from-indigo-900 via-violet-800 to-purple-900',
      icon: Sparkles,
      priority: 10,
      xp: 25,
      canSwipeComplete: false // Uses EpiphanyCard component
    });

    // Sort by priority and limit to 5
    return result.sort((a, b) => a.priority - b.priority).slice(0, 5);
  }, [isInitialLoading, plusData, dailyMetrics, profileData, groupedSupplements, totalScheduled, totalTaken, protocols, isPeptideTakenToday, meals]);

  return { cards, isLoading: isInitialLoading };
};
