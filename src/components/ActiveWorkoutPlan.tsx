import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, ChevronUp, ChevronDown, Timer, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getCurrentDateString } from '@/utils/dateHelpers';
import { mirrorWorkoutToDailyOverview } from '@/utils/workoutSync';


interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight_kg?: number;
  rpe?: number;
  rest_seconds?: number;
  notes?: string;
}

interface WorkoutPlan {
  id: string;
  name: string;
  category: string;
  exercises: Exercise[];
}

interface ActiveWorkoutPlanProps {
  workoutPlan: WorkoutPlan;
  onComplete: () => void;
  onCancel: () => void;
  isTimerRunning?: boolean;
  timerDuration?: number;
}

export const ActiveWorkoutPlan: React.FC<ActiveWorkoutPlanProps> = ({
  workoutPlan,
  onComplete,
  onCancel,
  isTimerRunning,
  timerDuration
}) => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>(workoutPlan.exercises || []);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExerciseChange = (exerciseIndex: number, field: keyof Exercise, value: any) => {
    setExercises(prev => prev.map((exercise, index) => 
      index === exerciseIndex 
        ? { ...exercise, [field]: value }
        : exercise
    ));
  };

  const handleExerciseComplete = (exerciseIndex: number, completed: boolean) => {
    const exerciseId = `${exerciseIndex}`;
    setCompletedExercises(prev => {
      const newSet = new Set(prev);
      if (completed) {
        newSet.add(exerciseId);
      } else {
        newSet.delete(exerciseId);
      }
      return newSet;
    });
  };

  const moveExercise = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= exercises.length) return;
    
    setExercises(prev => {
      const newExercises = [...prev];
      const [movedExercise] = newExercises.splice(fromIndex, 1);
      newExercises.splice(toIndex, 0, movedExercise);
      return newExercises;
    });
  };

  const handleSaveWorkout = async (retryCount = 0) => {
    // Validation: Check required data before attempting save
    if (!user?.id) {
      toast.error('Benutzer nicht authentifiziert');
      return;
    }
    
    if (completedExercises.size === 0) {
      toast.error('Mindestens eine Übung muss abgeschlossen sein');
      return;
    }

    setSaving(true);
    const maxRetries = 3;

    try {
      console.log('🏋️ Saving workout session...', { 
        userId: user.id,
        planId: workoutPlan.id,
        exercisesCount: exercises.length,
        completedCount: completedExercises.size 
      });

      // Create exercise session
      const sessionData = {
        user_id: user.id, // Ensure user_id is properly set
        session_name: workoutPlan.name,
        workout_plan_id: workoutPlan.id,
        date: getCurrentDateString(),
        start_time: isTimerRunning ? new Date(Date.now() - (timerDuration || 0) * 1000).toISOString() : new Date().toISOString(),
        end_time: new Date().toISOString(),
        duration_minutes: timerDuration ? Math.floor(timerDuration / 60) : null,
        workout_type: 'strength'
      };

      const { data: session, error: sessionError } = await supabase
        .from('exercise_sessions')
        .insert(sessionData)
        .select()
        .maybeSingle();

      if (sessionError) {
        console.error('❌ Session creation error:', sessionError);
        throw new Error(`Session speichern fehlgeschlagen: ${sessionError.message}`);
      }

      if (!session) {
        throw new Error('Keine Session-Daten erhalten');
      }

      console.log('✅ Session created:', session.id);

      // Create exercise sets for completed exercises
      const completedSets = exercises
        .filter((_, index) => completedExercises.has(`${index}`))
        .map((exercise, exerciseIndex) => ({
          user_id: user.id, // Ensure user_id is set here too
          session_id: session.id,
          exercise_id: exercise.id,
          set_number: 1,
          weight_kg: exercise.weight_kg || null,
          reps: exercise.reps || null,
          rpe: exercise.rpe || null,
          rest_seconds: exercise.rest_seconds || null,
          notes: exercise.notes || null,
          date: getCurrentDateString()
        }));

      if (completedSets.length > 0) {
        console.log('💪 Inserting exercise sets:', completedSets.length);
        
        const { error: setsError } = await supabase
          .from('exercise_sets')
          .insert(completedSets);

        if (setsError) {
          console.error('❌ Exercise sets error:', setsError);
          throw new Error(`Übungen speichern fehlgeschlagen: ${setsError.message}`);
        }
        
        console.log('✅ Exercise sets created successfully');
      }

      // Mirror to workouts table
      const endTime = new Date();
      const startTime = isTimerRunning
        ? new Date(Date.now() - (timerDuration || 0) * 1000)
        : new Date(endTime.getTime() - 10 * 60 * 1000); // fallback 10min
      
      console.log('🔄 Mirroring to daily overview...');
      await mirrorWorkoutToDailyOverview({
        userId: user.id,
        workoutType: 'strength',
        startTime,
        endTime,
        rpeValues: exercises.map(e => e.rpe ?? null),
      });

      toast.success('Training erfolgreich gespeichert!');
      onComplete();

    } catch (error: any) {
      console.error('💥 Workout save error:', error);
      
      // Retry logic for transient errors
      if (retryCount < maxRetries && (
        error?.message?.includes('network') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('connection')
      )) {
        console.log(`🔄 Retrying save attempt ${retryCount + 1}/${maxRetries}`);
        setTimeout(() => handleSaveWorkout(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }

      // User-friendly error messages
      let friendlyMessage = 'Fehler beim Speichern des Trainings';
      
      if (error?.message?.includes('row-level security')) {
        friendlyMessage = 'Zugriffsberechtigung fehlt. Bitte erneut anmelden.';
      } else if (error?.message?.includes('foreign key')) {
        friendlyMessage = 'Trainingsplan-Referenz ungültig. Bitte Plan neu laden.';
      } else if (error?.message?.includes('not authenticated')) {
        friendlyMessage = 'Anmeldung erforderlich. Bitte erneut anmelden.';
      } else if (error?.message) {
        friendlyMessage = `Speichern fehlgeschlagen: ${error.message}`;
      }

      // Local storage backup for recovery
      try {
        const backupData = {
          workoutPlan: workoutPlan,
          exercises: exercises,
          completedExercises: Array.from(completedExercises),
          timestamp: Date.now()
        };
        localStorage.setItem('workout_backup', JSON.stringify(backupData));
        console.log('💾 Workout data backed up locally');
      } catch (backupError) {
        console.warn('⚠️ Could not backup workout data:', backupError);
      }

      toast.error(friendlyMessage);
    } finally {
      setSaving(false);
    }
  };

  const allCompleted = exercises.length > 0 && completedExercises.size === exercises.length;
  const completionPercentage = exercises.length > 0 ? Math.round((completedExercises.size / exercises.length) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {workoutPlan.name}
                {isTimerRunning && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {formatTime(timerDuration || 0)}
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {completedExercises.size} von {exercises.length} Übungen abgeschlossen ({completionPercentage}%)
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* Exercises */}
      <div className="space-y-3">
        {exercises.map((exercise, index) => {
          const isCompleted = completedExercises.has(`${index}`);
          
          return (
            <Card key={index} className={`transition-all ${isCompleted ? 'ring-2 ring-green-500 bg-green-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={(checked) => handleExerciseComplete(index, checked as boolean)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{exercise.name}</h4>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveExercise(index, index - 1)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveExercise(index, index + 1)}
                          disabled={index === exercises.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Sätze</label>
                        <Input
                          type="number"
                          value={exercise.sets || ''}
                          onChange={(e) => handleExerciseChange(index, 'sets', parseInt(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs text-muted-foreground">Wiederholungen</label>
                        <Input
                          type="number"
                          value={exercise.reps || ''}
                          onChange={(e) => handleExerciseChange(index, 'reps', parseInt(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs text-muted-foreground">Gewicht (kg)</label>
                        <Input
                          type="number"
                          step="0.5"
                          value={exercise.weight_kg || ''}
                          onChange={(e) => handleExerciseChange(index, 'weight_kg', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs text-muted-foreground">RPE</label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={exercise.rpe || ''}
                          onChange={(e) => handleExerciseChange(index, 'rpe', parseInt(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                    </div>

                    {exercise.notes && (
                      <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        {exercise.notes}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Abbrechen
        </Button>
        
        <Button
          onClick={() => handleSaveWorkout()}
          disabled={saving || completedExercises.size === 0}
          className="flex-1"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Speichert...' : 'Training speichern'}
        </Button>
      </div>
    </div>
  );
};