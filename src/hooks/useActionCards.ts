/**
 * useActionCards - Dynamic action card prioritization
 * Decides which cards to show based on user data and context
 * Now with Smart Actions for frictionless logging
 */

import { useMemo } from 'react';
import { usePlusData } from './usePlusData';
import { useUserProfile } from './useUserProfile';
import { useDailyFocus } from './useDailyFocus';
import { BrainCircuit, Moon, PenTool, Pill, User, Droplets, Coffee, Check, LucideIcon, Sun, Clock, Dumbbell } from 'lucide-react';

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
}

export interface ActionCard {
  id: string;
  type: 'insight' | 'sleep_fix' | 'journal' | 'supplement' | 'profile' | 'hydration' | 'protein';
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

    // 3. Supplements not logged today - Zeit-intelligent
    if (!plusData.supplementsLoggedToday && hour >= 6 && hour < 22) {
      // Zeitbasierte Primary Action bestimmen
      const getRelevantTimingAction = (): QuickAction => {
        if (hour >= 6 && hour < 11) {
          return { id: 'morning', label: 'Morgens', icon: Sun, primary: true };
        } else if (hour >= 11 && hour < 14) {
          return { id: 'noon', label: 'Mittags', icon: Clock, primary: true };
        } else {
          return { id: 'evening', label: 'Abends', icon: Moon, primary: true };
        }
      };
      
      const timingAction = getRelevantTimingAction();
      const timingLabel = hour < 11 ? 'Morgen' : hour < 14 ? 'Mittag' : 'Abend';
      
      result.push({
        id: 'supplement',
        type: 'supplement',
        title: 'Supplements einnehmen',
        subtitle: `Zeit für deine ${timingLabel}-Supplements!`,
        gradient: 'from-cyan-500 to-blue-600',
        icon: Pill,
        actionContext: 'log_supplements',
        priority: 3,
        xp: 30,
        canSwipeComplete: true,
        quickActions: [
          timingAction,
          { id: 'pre_workout', label: 'Pre-WO', icon: Dumbbell },
          { id: 'snooze', label: 'Später', icon: Clock }
        ]
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

    // 6. ARES Insight - Dynamic based on current metrics
    const insightData = buildInsightData();
    
    result.push({
      id: 'insight',
      type: 'insight',
      title: 'ARES Erkenntnis',
      subtitle: insightData.subtitle,
      gradient: 'from-indigo-600 via-purple-600 to-violet-600',
      icon: BrainCircuit,
      actionContext: 'analyze_recovery_pattern',
      actionPrompt: insightData.prompt,
      priority: 10,
      xp: 15,
      canSwipeComplete: false // Opens chat
    });

    // Sort by priority and limit to 5
    return result.sort((a, b) => a.priority - b.priority).slice(0, 5);
    
    // Helper function to build dynamic insight
    function buildInsightData(): { subtitle: string; prompt: string } {
      const issues: string[] = [];
      const metrics: string[] = [];
      
      // Analyze calories
      if (plusData.remainingKcal !== null) {
        const consumed = plusData.today?.total_calories || 0;
        const goal = plusData.goals?.calories || 2000;
        metrics.push(`Kalorien: ${consumed}/${goal} kcal`);
        
        if (plusData.remainingKcal > 800) {
          issues.push(`${plusData.remainingKcal} kcal unter Tagesziel`);
        } else if (plusData.remainingKcal < -200) {
          issues.push(`${Math.abs(plusData.remainingKcal)} kcal über Tagesziel`);
        }
      }
      
      // Analyze protein
      if (plusData.proteinDelta && plusData.proteinDelta > 30) {
        const consumed = plusData.today?.total_protein || 0;
        const goal = plusData.goals?.protein || 150;
        metrics.push(`Protein: ${consumed}g/${goal}g`);
        issues.push(`${plusData.proteinDelta}g Protein fehlen noch`);
      } else if (plusData.goals?.protein) {
        metrics.push(`Protein: ${plusData.today?.total_protein || 0}g/${plusData.goals.protein}g`);
      }
      
      // Analyze hydration
      const hydrationGoal = plusData.goals?.fluid_goal_ml || 3000;
      const hydrationCurrent = plusData.hydrationMlToday || 0;
      const hydrationPercent = Math.round((hydrationCurrent / hydrationGoal) * 100);
      metrics.push(`Hydration: ${(hydrationCurrent / 1000).toFixed(1)}L/${(hydrationGoal / 1000).toFixed(1)}L`);
      
      if (hydrationPercent < 50 && new Date().getHours() >= 12) {
        issues.push(`Nur ${hydrationPercent}% Flüssigkeit`);
      }
      
      // Analyze sleep
      if (plusData.sleepLoggedToday && plusData.sleepDurationToday) {
        metrics.push(`Schlaf: ${plusData.sleepDurationToday.toFixed(1)}h`);
        if (plusData.sleepDurationToday < 7) {
          issues.push(`Nur ${plusData.sleepDurationToday.toFixed(1)}h Schlaf`);
        }
      }
      
      // Analyze steps
      if (plusData.stepsToday !== undefined) {
        const stepsGoal = plusData.stepsTarget || 7000;
        metrics.push(`Schritte: ${plusData.stepsToday.toLocaleString('de-DE')}/${stepsGoal.toLocaleString('de-DE')}`);
        if (plusData.stepsToday < stepsGoal * 0.5 && new Date().getHours() >= 14) {
          issues.push(`Erst ${Math.round((plusData.stepsToday / stepsGoal) * 100)}% Schritte`);
        }
      }
      
      // Build dynamic subtitle
      const subtitle = issues.length > 0 
        ? `Pattern: ${issues[0]}`
        : 'Ich analysiere deine aktuellen Daten...';
      
      // Build comprehensive prompt with real metrics
      const prompt = `Analysiere meine heutigen Live-Daten und gib mir eine prägnante, priorisierte Handlungsempfehlung:

📊 MEINE AKTUELLEN METRIKEN:
${metrics.join('\n')}

${issues.length > 0 ? `⚠️ ERKANNTE AUFFÄLLIGKEITEN:
${issues.map(i => `• ${i}`).join('\n')}` : '✅ Keine kritischen Auffälligkeiten erkannt.'}

Fokussiere dich auf die wichtigste Optimierung und gib mir eine konkrete Next Action für die nächsten 2-3 Stunden.`;
      
      return { subtitle, prompt };
    }
  }, [plusData, profileData]);

  return { cards };
};
