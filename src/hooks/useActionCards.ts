/**
 * useActionCards - Dynamic action card prioritization
 * Decides which cards to show based on user data and context
 */

import { useMemo } from 'react';
import { usePlusData } from './usePlusData';
import { useUserProfile } from './useUserProfile';
import { useDailyFocus } from './useDailyFocus';
import { BrainCircuit, Moon, PenTool, Pill, User, Droplets, LucideIcon } from 'lucide-react';

export interface ActionCard {
  id: string;
  type: 'insight' | 'sleep_fix' | 'journal' | 'supplement' | 'profile' | 'hydration';
  title: string;
  subtitle: string;
  gradient: string;
  icon: LucideIcon;
  actionContext?: string;
  priority: number;
}

export const useActionCards = () => {
  const plusData = usePlusData();
  const { profileData } = useUserProfile();
  const { focusTask } = useDailyFocus();

  const cards = useMemo(() => {
    const result: ActionCard[] = [];
    const hour = new Date().getHours();

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
        priority: 1
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
        priority: 2
      });
    }

    // 3. Supplements not logged today
    if (!plusData.supplementsLoggedToday && hour >= 8 && hour < 22) {
      result.push({
        id: 'supplement',
        type: 'supplement',
        title: 'Supplements einnehmen',
        subtitle: 'Hast du heute schon deine Supplements genommen?',
        gradient: 'from-cyan-500 to-blue-600',
        icon: Pill,
        actionContext: 'log_supplements',
        priority: 3
      });
    }

    // 4. Hydration low - if under 1L by afternoon
    const hydrationLow = (plusData.hydrationMlToday || 0) < 1000 && hour >= 12;
    if (hydrationLow) {
      result.push({
        id: 'hydration',
        type: 'hydration',
        title: 'Mehr trinken',
        subtitle: `Erst ${((plusData.hydrationMlToday || 0) / 1000).toFixed(1)}L heute. Ziel: 3L`,
        gradient: 'from-blue-500 to-cyan-500',
        icon: Droplets,
        actionContext: 'hydration_reminder',
        priority: 4
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
        priority: 5
      });
    }

    // 6. ARES Insight - always available as fallback
    result.push({
      id: 'insight',
      type: 'insight',
      title: 'ARES Erkenntnis',
      subtitle: 'Ich habe ein Muster in deinen Daten entdeckt.',
      gradient: 'from-indigo-600 via-purple-600 to-violet-600',
      icon: BrainCircuit,
      actionContext: 'analyze_recovery_pattern',
      priority: 10
    });

    // Sort by priority and limit to 5
    return result.sort((a, b) => a.priority - b.priority).slice(0, 5);
  }, [plusData, profileData]);

  return { cards };
};
