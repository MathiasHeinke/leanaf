import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dumbbell, Footprints } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { UsePlusDataResult } from '@/hooks/usePlusData';

interface CompactTrainingProps {
  data: UsePlusDataResult;
}

export const CompactTraining: React.FC<CompactTrainingProps> = ({ data }) => {
  if (data.loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        <Card><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
      </div>
    );
  }

  // Mock data for now
  const workoutProgress = 2; // completed sessions
  const workoutTarget = 3;   // weekly target
  const stepsProgress = 8430;
  const stepsTarget = 10000;

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Workouts */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Workouts</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {workoutProgress}/{workoutTarget}
            </Badge>
          </div>
          <div className="text-lg font-bold">
            Nächster: Push A
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Footprints className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Schritte</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {Math.round((stepsProgress / stepsTarget) * 100)}%
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold">
              {stepsProgress.toLocaleString()} / {stepsTarget.toLocaleString()}
            </div>
            <Progress value={(stepsProgress / stepsTarget) * 100} className="h-1" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};