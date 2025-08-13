import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { UsePlusDataResult } from '@/hooks/usePlusData';
import { 
  Zap, 
  ArrowRight, 
  Clock, 
  Target,
  Droplets, 
  Moon, 
  Dumbbell, 
  Pill, 
  Utensils,
  TrendingUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { openMeal, openSleep, openSupplements, openWorkout, openFluidInput } from '@/components/quick/quickAddBus';

interface MomentumNextActionProps {
  data: UsePlusDataResult;
  missionCompletedCount: number;
}

interface SmartAction {
  id: string;
  title: string;
  description: string;
  cta: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  type: 'mission' | 'optimization' | 'streak';
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  progress?: number;
  timeContext?: string;
}

export const MomentumNextAction: React.FC<MomentumNextActionProps> = ({ 
  data, 
  missionCompletedCount 
}) => {
  const { loading } = data;
  
  // Mission states
  const macrosDone = typeof (data as any)?.proteinDelta === 'number' ? ((data as any).proteinDelta <= 0) : false;
  const sleepLogged = Boolean((data as any)?.sleepLoggedToday || (((data as any)?.sleepDurationToday ?? 0) > 0));
  const supplementsLogged = Boolean((data as any)?.supplementsLoggedToday);
  const stepsToday = (data as any)?.stepsToday ?? 0;
  const stepsTarget = (data as any)?.stepsTarget ?? 7000;
  const workoutLogged = Boolean((data as any)?.workoutLoggedToday || stepsToday >= stepsTarget);
  const hydrationMl = (data as any)?.hydrationMlToday ?? 0;
  const hydrationLogged = hydrationMl >= 2500;

  // Time-aware intelligence
  const currentHour = new Date().getHours();
  const isEarlyMorning = currentHour >= 6 && currentHour < 9;
  const isMorning = currentHour >= 9 && currentHour < 12;
  const isAfternoon = currentHour >= 12 && currentHour < 17;
  const isEvening = currentHour >= 17 && currentHour < 21;
  const isNight = currentHour >= 21 || currentHour < 6;

  // Smart action generation with contextual intelligence
  const smartActions = useMemo((): SmartAction[] => {
    const actions: SmartAction[] = [];

    // Critical missions first (time-sensitive)
    if (!sleepLogged && isEarlyMorning) {
      actions.push({
        id: 'sleep-morning',
        title: 'Schlaf von gestern nachtragen',
        description: 'Perfekter Zeitpunkt um den Schlaf zu erfassen',
        cta: 'Schlaf eintragen',
        urgency: 'high',
        type: 'mission',
        icon: Moon,
        action: openSleep,
        timeContext: 'Morgens'
      });
    }

    // Hydration urgency based on time and current intake
    if (!hydrationLogged) {
      const hydrationProgress = Math.min(100, (hydrationMl / 2500) * 100);
      const expectedByNow = currentHour >= 12 ? 1200 : currentHour >= 9 ? 600 : 300;
      const isBehind = hydrationMl < expectedByNow;
      
      actions.push({
        id: 'hydration',
        title: isBehind ? 'Flüssigkeit aufholen' : 'Weiter trinken',
        description: `${hydrationMl}ml getrunken, ${2500 - hydrationMl}ml noch offen`,
        cta: '+500ml hinzufügen',
        urgency: isBehind ? 'critical' : 'medium',
        type: 'mission',
        icon: Droplets,
        action: openFluidInput,
        progress: hydrationProgress,
        timeContext: isBehind ? 'Aufholen' : 'Im Plan'
      });
    }

    // Protein/Macros based on time of day
    if (!macrosDone) {
      const proteinNeed = (data as any)?.proteinDelta ?? 0;
      if (isAfternoon || isEvening) {
        actions.push({
          id: 'protein',
          title: 'Protein-Ziel erreichen',
          description: `Noch ${proteinNeed}g Protein für heute`,
          cta: 'Mahlzeit planen',
          urgency: isEvening ? 'high' : 'medium',
          type: 'mission',
          icon: Utensils,
          action: openMeal,
          timeContext: isEvening ? 'Letzter Call' : 'Optimal'
        });
      }
    }

    // Training recommendations
    if (!workoutLogged) {
      if (isMorning) {
        actions.push({
          id: 'training-morning',
          title: 'Morgendliches Training',
          description: 'Beste Zeit für intensive Einheiten',
          cta: 'Training starten',
          urgency: 'medium',
          type: 'mission',
          icon: Dumbbell,
          action: () => openWorkout({ recommendedType: 'kraft' }),
          timeContext: 'Prime Time'
        });
      } else if (isEvening) {
        actions.push({
          id: 'training-evening',
          title: 'Entspanntes Abendtraining',
          description: 'Leichte Aktivität oder Spaziergang',
          cta: 'Aktivität erfassen',
          urgency: 'low',
          type: 'mission',
          icon: Dumbbell,
          action: () => openWorkout({ recommendedType: 'cardio' }),
          timeContext: 'Entspannt'
        });
      }
    }

    // Supplements timing
    if (!supplementsLogged && (isMorning || isEvening)) {
      actions.push({
        id: 'supplements',
        title: isMorning ? 'Morgen-Supplemente' : 'Abend-Supplemente',
        description: 'Optimaler Zeitpunkt für die Einnahme',
        cta: 'Supplemente abhaken',
        urgency: 'medium',
        type: 'mission',
        icon: Pill,
        action: openSupplements,
        timeContext: isMorning ? 'Morgens' : 'Abends'
      });
    }

    // Optimization suggestions when missions are complete
    if (missionCompletedCount >= 4) {
      actions.push({
        id: 'streak-continue',
        title: 'Streak aufrechterhalten',
        description: 'Du bist auf einem großartigen Weg!',
        cta: 'Statistiken ansehen',
        urgency: 'low',
        type: 'streak',
        icon: TrendingUp,
        action: () => console.log('Show stats'),
        timeContext: 'Erfolg'
      });
    }

    // Sort by urgency and time relevance
    return actions.sort((a, b) => {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    }).slice(0, 2); // Show max 2 actions
  }, [
    data, 
    missionCompletedCount, 
    currentHour, 
    hydrationMl, 
    macrosDone, 
    sleepLogged, 
    workoutLogged, 
    supplementsLogged, 
    hydrationLogged
  ]);

  const getUrgencyStyles = (urgency: SmartAction['urgency']) => {
    switch (urgency) {
      case 'critical':
        return {
          badge: 'bg-red-500/10 text-red-600 border-red-500/20',
          card: 'border-red-500/30 bg-red-50/50 dark:bg-red-950/20',
          button: 'bg-red-500 hover:bg-red-600 text-white'
        };
      case 'high':
        return {
          badge: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
          card: 'border-orange-500/30 bg-orange-50/50 dark:bg-orange-950/20',
          button: 'bg-orange-500 hover:bg-orange-600 text-white'
        };
      case 'medium':
        return {
          badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
          card: 'border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20',
          button: 'bg-blue-500 hover:bg-blue-600 text-white'
        };
      default:
        return {
          badge: 'bg-muted text-muted-foreground border-border',
          card: 'border-border bg-background',
          button: 'bg-primary hover:bg-primary/90 text-primary-foreground'
        };
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </Card>
    );
  }

  if (smartActions.length === 0) {
    return (
      <Card className="p-6 text-center border-primary/30 bg-primary/5">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Target className="h-6 w-6 text-primary" />
          <h3 className="font-semibold text-primary">Alle Missionen erledigt!</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Fantastisch! Du hast heute alle wichtigen Aufgaben gemeistert.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {smartActions.map((action) => {
        const styles = getUrgencyStyles(action.urgency);
        
        return (
          <Card key={action.id} className={cn("p-4 transition-all duration-300 hover:shadow-md", styles.card)}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 rounded-xl bg-white/60 dark:bg-neutral-800/60">
                  <action.icon className="h-5 w-5 text-foreground" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{action.title}</h3>
                    {action.timeContext && (
                      <Badge variant="outline" className={cn("text-xs", styles.badge)}>
                        <Clock className="h-3 w-3 mr-1" />
                        {action.timeContext}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-3">
                    {action.description}
                  </p>
                  
                  {action.progress !== undefined && (
                    <div className="mb-3">
                      <Progress value={action.progress} className="h-1" />
                      <span className="text-xs text-muted-foreground mt-1">
                        {Math.round(action.progress)}% erreicht
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <Button
                size="sm"
                onClick={action.action}
                className={cn("shrink-0", styles.button)}
              >
                {action.cta}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};