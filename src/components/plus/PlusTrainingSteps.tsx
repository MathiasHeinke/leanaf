import React from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PlusCard from '@/components/plus/PlusCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UsePlusDataResult } from '@/hooks/usePlusData';
import { Dumbbell, Footprints } from 'lucide-react';
import { openWorkout } from '@/components/quick/quickAddBus';

interface PlusTrainingStepsProps {
  data: UsePlusDataResult;
}

export const PlusTrainingSteps: React.FC<PlusTrainingStepsProps> = ({ data }) => {
  const { loading } = data;

  // Workouts (weekly target placeholder)
  const weeklyWorkouts = { completed: (data as any)?.workoutLoggedToday ? 1 : 0, target: 3 };
  const stepsCurrent = (data as any)?.stepsToday ?? 0;
  const stepsTarget = (data as any)?.stepsTarget ?? 7000;
  const nextPlanDay = "Unterkörper";

  const stepsPercentage = Math.min(100, (stepsCurrent / stepsTarget) * 100);

  return (
    <PlusCard>
      <CardHeader>
        <CardTitle>Training & Schritte</CardTitle>
        <CardDescription>Wöchentliches Training und tägliche Bewegung</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Training Progress */}
              <div className="bg-card rounded-lg p-3 border">
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Training Woche</span>
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-semibold">{weeklyWorkouts.completed}/{weeklyWorkouts.target}</div>
                  <div className="text-xs text-muted-foreground">Sessions</div>
                  <Badge 
                    variant={weeklyWorkouts.completed >= weeklyWorkouts.target ? 'default' : 'secondary'}
                    className="text-xs px-2 py-0.5"
                  >
                    {weeklyWorkouts.completed >= weeklyWorkouts.target ? 'Ziel erreicht' : 'In Progress'}
                  </Badge>
                </div>
              </div>

              {/* Steps Progress */}
              <div className="bg-card rounded-lg p-3 border">
                <div className="flex items-center gap-2 mb-2">
                  <Footprints className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Schritte heute</span>
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-semibold">{(stepsCurrent / 1000).toFixed(1)}k</div>
                  <div className="text-xs text-muted-foreground">von {(stepsTarget / 1000).toFixed(1)}k</div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${stepsPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                size="sm" 
                className="w-full" 
                onClick={() => openWorkout({ recommendedType: 'kraft' })}
              >
                Training starten
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full" 
                onClick={() => openWorkout({ recommendedType: 'walking' })}
              >
                10-Min Walk
              </Button>
            </div>

            {/* Next Plan Info */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Nächster Plan</div>
              <div className="font-medium">{nextPlanDay}</div>
            </div>
          </>
        )}
      </CardContent>
    </PlusCard>
  );
};