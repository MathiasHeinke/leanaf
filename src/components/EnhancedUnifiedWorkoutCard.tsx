import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Dumbbell, Calendar, Save, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { DayBasedWorkoutGrouper } from './DayBasedWorkoutGrouper';

interface EnhancedUnifiedWorkoutCardProps {
  date: string;
  quickWorkouts: any[];
  advancedSessions: any[];
  onWorkoutUpdated: () => void;
  showGrouped?: boolean;
  variant?: 'default' | 'compact';
}

export const EnhancedUnifiedWorkoutCard: React.FC<EnhancedUnifiedWorkoutCardProps> = ({
  date,
  quickWorkouts,
  advancedSessions,
  onWorkoutUpdated,
  showGrouped = true,
  variant = 'default'
}) => {
  // If grouped view is enabled and there are workouts, show the grouper
  if (showGrouped && (quickWorkouts.some(w => w.did_workout) || advancedSessions.length > 0)) {
    return (
      <DayBasedWorkoutGrouper
        date={date}
        quickWorkouts={quickWorkouts}
        advancedSessions={advancedSessions}
        onWorkoutUpdated={onWorkoutUpdated}
      />
    );
  }

  // Fallback to original unified workout card for individual display
  const hasWorkouts = quickWorkouts.some(w => w.did_workout) || advancedSessions.length > 0;
  
  if (!hasWorkouts) {
    return (
      <Card className="opacity-50">
        <CardContent className="p-4 text-center">
          <p className="text-muted-foreground text-sm">Kein Training</p>
        </CardContent>
      </Card>
    );
  }

  const totalDuration = quickWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0) +
    advancedSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {format(new Date(date), 'EEE, dd.MM', { locale: de })}
          </CardTitle>
          {totalDuration > 0 && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {totalDuration} Min
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Quick Workouts */}
        {quickWorkouts.filter(w => w.did_workout).map((workout, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{workout.workout_type}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {workout.duration_minutes && <span>{workout.duration_minutes} Min</span>}
              {workout.intensity && <span>Intensität: {workout.intensity}/10</span>}
            </div>
          </div>
        ))}

        {/* Advanced Sessions */}
        {advancedSessions.map((session, index) => (
          <div key={index} className="space-y-2 p-2 bg-muted/30 rounded">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{session.session_name}</h4>
              <Badge variant="secondary" className="text-xs">
                {session.exercise_sets?.length || 0} Sätze
              </Badge>
            </div>
            {session.exercise_sets?.slice(0, 3).map((set: any, setIndex: number) => (
              <div key={setIndex} className="text-xs text-muted-foreground ml-2">
                {set.exercises?.name} - {set.reps} x {set.weight_kg}kg
              </div>
            ))}
            {(session.exercise_sets?.length || 0) > 3 && (
              <p className="text-xs text-muted-foreground ml-2">
                +{(session.exercise_sets?.length || 0) - 3} weitere Sätze
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};