import { UnifiedWorkoutCard } from "./UnifiedWorkoutCard";
import { useUnifiedWorkoutData } from "@/hooks/useUnifiedWorkoutData";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, TrendingUp, Target, Activity } from "lucide-react";

interface WorkoutHistoryTabProps {
  timeRange: 'week' | 'month' | 'year';
}

export const WorkoutHistoryTab = ({ timeRange }: WorkoutHistoryTabProps) => {
  const { workoutData, loading } = useUnifiedWorkoutData(timeRange);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">
          <Dumbbell className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Lade Trainingsdaten...</p>
        </div>
      </div>
    );
  }

  if (workoutData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Noch keine Trainings aufgezeichnet</h3>
          <p className="text-muted-foreground mb-4">
            Starte mit dem Tracking deiner Workouts, um hier deine Fortschritte zu sehen!
          </p>
          <div className="text-sm text-muted-foreground">
            <p>💪 Nutze die Quick-Eingabe für einfaches Tracking</p>
            <p>🎯 Oder das Advanced Training für detaillierte RPE-Analyse</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary stats
  const totalQuickWorkouts = workoutData.reduce((sum, day) => 
    sum + day.quickWorkouts.filter(w => w.did_workout).length, 0
  );
  const totalAdvancedSessions = workoutData.reduce((sum, day) => 
    sum + day.advancedSessions.length, 0
  );
  const totalRestDays = workoutData.reduce((sum, day) => 
    sum + day.quickWorkouts.filter(w => !w.did_workout).length, 0
  );

  // Calculate average intensity and RPE
  const allQuickWorkouts = workoutData.flatMap(day => day.quickWorkouts.filter(w => w.did_workout));
  const avgQuickIntensity = allQuickWorkouts.length > 0 
    ? allQuickWorkouts.reduce((sum, w) => sum + w.intensity, 0) / allQuickWorkouts.length 
    : 0;

  const allAdvancedSets = workoutData.flatMap(day => 
    day.advancedSessions.flatMap(session => session.exercise_sets)
  );
  const avgRPE = allAdvancedSets.length > 0 
    ? allAdvancedSets.reduce((sum, set) => sum + set.rpe, 0) / allAdvancedSets.length 
    : 0;

  const totalVolume = allAdvancedSets.reduce((sum, set) => 
    sum + (set.weight_kg * set.reps), 0
  );

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4 text-center">
            <Activity className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{totalQuickWorkouts}</div>
            <div className="text-xs text-muted-foreground">Quick Workouts</div>
            {avgQuickIntensity > 0 && (
              <div className="text-xs text-primary font-medium">
                ø {Math.round(avgQuickIntensity * 10) / 10}/10
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5">
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 mx-auto mb-2 text-secondary" />
            <div className="text-2xl font-bold">{totalAdvancedSessions}</div>
            <div className="text-xs text-muted-foreground">Advanced Sessions</div>
            {avgRPE > 0 && (
              <div className="text-xs text-secondary font-medium">
                ø RPE {Math.round(avgRPE * 10) / 10}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-accent" />
            <div className="text-2xl font-bold">{Math.round(totalVolume).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">kg Volumen</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-100/50 to-purple-100/50 dark:from-blue-900/20 dark:to-purple-900/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl mb-2">🏝️</div>
            <div className="text-2xl font-bold">{totalRestDays}</div>
            <div className="text-xs text-muted-foreground">Ruhetage</div>
          </CardContent>
        </Card>
      </div>

      {/* Workout Timeline */}
      <div className="space-y-3">
        {workoutData.map((dayData) => (
          <UnifiedWorkoutCard
            key={dayData.date}
            date={dayData.date}
            quickWorkouts={dayData.quickWorkouts}
            advancedSessions={dayData.advancedSessions}
            onWorkoutUpdated={() => window.location.reload()} // Simple refresh for now
          />
        ))}
      </div>
    </div>
  );
};