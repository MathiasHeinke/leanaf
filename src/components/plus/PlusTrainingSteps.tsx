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
      <CardContent className="grid grid-cols-1 gap-6">
        {/* Training Progress */}
        <div className="rounded-xl glass-card p-4">
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" />
                <div className="text-sm text-muted-foreground">Training Woche</div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-semibold">{weeklyWorkouts.completed}/{weeklyWorkouts.target} Sessions</div>
                  <div className="text-sm text-muted-foreground">Nächster Plan: {nextPlanDay}</div>
                </div>
                <Badge variant={weeklyWorkouts.completed >= weeklyWorkouts.target ? 'default' : 'secondary'}>
                  {weeklyWorkouts.completed >= weeklyWorkouts.target ? 'Ziel erreicht' : 'In Progress'}
                </Badge>
              </div>
              <Button size="sm" className="w-full" onClick={() => openWorkout({ recommendedType: 'kraft' })}>
                Training starten
              </Button>
            </div>
          )}
        </div>

        {/* Steps Progress */}
        <div className="rounded-xl glass-card p-4">
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Footprints className="h-4 w-4 text-primary" />
                <div className="text-sm text-muted-foreground">Schritte heute</div>
              </div>
              <div>
                <div className="text-xl font-semibold">{stepsCurrent.toLocaleString()}/{stepsTarget.toLocaleString()}</div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stepsPercentage}%` }}
                  />
                </div>
                <div className="text-sm text-muted-foreground mt-1">{Math.round(stepsPercentage)}% des Ziels</div>
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={() => openWorkout({ recommendedType: 'walking' })}>
                10-Min Walk starten
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </PlusCard>
  );
};