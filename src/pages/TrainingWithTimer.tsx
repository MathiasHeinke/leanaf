import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkoutTimer } from '@/components/WorkoutTimer';
import { ExerciseQuickAdd } from '@/components/ExerciseQuickAdd';
import { TrainingQuickAdd } from '@/components/TrainingQuickAdd';
import { TrainingFloatingCoach } from '@/components/TrainingFloatingCoach';
import { UnifiedWorkoutCard } from '@/components/UnifiedWorkoutCard';
import { EnhancedUnifiedWorkoutCard } from '@/components/EnhancedUnifiedWorkoutCard';
import { useUnifiedWorkoutData } from '@/hooks/useUnifiedWorkoutData';
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer';
import { Dumbbell, Plus, MessageSquare, Timer, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export const TrainingWithTimer: React.FC = () => {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showAdvancedAdd, setShowAdvancedAdd] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const { workoutData, loading, refetch } = useUnifiedWorkoutData('week');
  const { isRunning, hasActiveTimer, formattedTime, startTimer } = useWorkoutTimer();

  const handleSessionSaved = () => {
    refetch();
    setShowQuickAdd(false);
    setShowAdvancedAdd(false);
    toast.success('Training erfolgreich gespeichert!');
  };

  const handleStartWorkout = () => {
    startTimer();
    toast.success('Workout Timer gestartet!');
  };

  const todaysWorkout = workoutData?.find(day => 
    format(new Date(day.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  );

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header with Timer */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Training</h1>
          <p className="text-muted-foreground">Tracke deine Workouts mit dem integrierten Timer</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <WorkoutTimer 
            variant="compact" 
            onStartWorkout={handleStartWorkout}
            className="self-start"
          />
          <Button onClick={() => setShowCoach(true)} variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Coach
          </Button>
        </div>
      </div>

      {/* Timer Status Card */}
      {hasActiveTimer && (
        <Card className="border-gradient-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Timer className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Aktives Workout</p>
                  <p className="text-sm text-muted-foreground">
                    Timer: {formattedTime}
                  </p>
                </div>
              </div>
              <Badge variant={isRunning ? "default" : "secondary"}>
                {isRunning ? 'Läuft' : 'Pausiert'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Workout Summary */}
      {todaysWorkout && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Heutiges Training
          </h2>
          <EnhancedUnifiedWorkoutCard
            date={todaysWorkout.date}
            quickWorkouts={todaysWorkout.quickWorkouts}
            advancedSessions={todaysWorkout.advancedSessions}
            onWorkoutUpdated={refetch}
            showGrouped={true}
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowQuickAdd(true)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Übung hinzufügen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Schnell eine einzelne Übung tracken</p>
            <Button className="mt-3 w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Übung hinzufügen
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowAdvancedAdd(true)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Trainingseinheit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Detaillierte Trainingsplanung mit mehreren Übungen</p>
            <Button className="mt-3 w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Session erstellen
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Full Timer Widget */}
      <div className="grid gap-4 md:grid-cols-2">
        <WorkoutTimer onStartWorkout={handleStartWorkout} />
        
        <Card>
          <CardHeader>
            <CardTitle>Workout Tipps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <Timer className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Timer nutzen</p>
                <p className="text-xs text-muted-foreground">Starte den Timer zu Beginn deines Workouts</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Coach fragen</p>
                <p className="text-xs text-muted-foreground">Lass dir Übungen vorschlagen und speichere sie direkt</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Progress tracken</p>
                <p className="text-xs text-muted-foreground">Alle Zeiten werden automatisch erfasst</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Workouts */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Letzte Workouts</h2>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Lade Workout-Daten...</p>
          </div>
        ) : workoutData && workoutData.length > 0 ? (
          <div className="space-y-4">
            {workoutData.slice(0, 7).map((day) => (
              <EnhancedUnifiedWorkoutCard
                key={day.date}
                date={day.date}
                quickWorkouts={day.quickWorkouts}
                advancedSessions={day.advancedSessions}
                onWorkoutUpdated={refetch}
                showGrouped={true}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">Noch keine Workouts</h3>
              <p className="text-muted-foreground mb-4">Starte dein erstes Training mit dem Timer!</p>
              <Button onClick={() => setShowQuickAdd(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Erstes Workout hinzufügen
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <ExerciseQuickAdd onSessionSaved={handleSessionSaved} />
            <div className="p-4 border-t">
              <Button variant="outline" onClick={() => setShowQuickAdd(false)} className="w-full">
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAdvancedAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <TrainingQuickAdd
              onClose={() => setShowAdvancedAdd(false)}
              onSessionSaved={handleSessionSaved}
            />
          </div>
        </div>
      )}

      {/* Floating Coach */}
      <TrainingFloatingCoach
        isOpen={showCoach}
        onToggle={() => setShowCoach(!showCoach)}
        onExerciseLogged={refetch}
      />
    </div>
  );
};