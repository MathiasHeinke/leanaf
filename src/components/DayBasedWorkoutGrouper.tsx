import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UnifiedWorkoutCard } from './UnifiedWorkoutCard';
import { Save, Calendar, Clock, Dumbbell } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DayBasedWorkoutGrouperProps {
  date: string;
  quickWorkouts: any[];
  advancedSessions: any[];
  onWorkoutUpdated: () => void;
}

export const DayBasedWorkoutGrouper: React.FC<DayBasedWorkoutGrouperProps> = ({
  date,
  quickWorkouts,
  advancedSessions,
  onWorkoutUpdated
}) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const hasWorkouts = quickWorkouts.some(w => w.did_workout) || advancedSessions.length > 0;
  
  if (!hasWorkouts) return null;

  const totalDuration = quickWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0) +
    advancedSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  const allExercises = [
    ...quickWorkouts.flatMap(w => w.workout_type ? [{ name: w.workout_type, type: 'quick' }] : []),
    ...advancedSessions.flatMap(s => 
      s.exercise_sets?.map((set: any) => ({ 
        name: set.exercises?.name || 'Unknown Exercise', 
        type: 'advanced' 
      })) || []
    )
  ];

  const uniqueExercises = Array.from(
    new Map(allExercises.map(ex => [ex.name, ex])).values()
  );

  const saveAsWorkoutPlan = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const exercisesData = uniqueExercises.map((ex, index) => ({
        name: ex.name,
        category: ex.type === 'quick' ? 'Cardio' : 'Strength',
        muscle_groups: [],
        sets: 3,
        reps: 10,
        weight: 0,
        rpe: 7,
        rest_seconds: 90,
        order: index + 1
      }));

      const planName = `${format(new Date(date), 'dd.MM.yyyy', { locale: de })} Training`;
      
      const { error } = await supabase
        .from('workout_plans')
        .insert({
          name: planName,
          category: 'Full Body',
          description: `Automatisch erstellt aus Training vom ${format(new Date(date), 'dd.MM.yyyy', { locale: de })}`,
          exercises: exercisesData,
          estimated_duration_minutes: totalDuration || 60,
          created_by: user.id,
          is_public: false
        });

      if (error) throw error;

      toast.success('Trainingsplan erfolgreich erstellt!');
    } catch (error) {
      console.error('Error creating workout plan:', error);
      toast.error('Fehler beim Erstellen des Trainingsplans');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">
                {format(new Date(date), 'EEEE, dd.MM.yyyy', { locale: de })}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <Dumbbell className="h-4 w-4" />
                  <span>{uniqueExercises.length} Übungen</span>
                </div>
                {totalDuration > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{totalDuration} Min</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <Button 
            onClick={saveAsWorkoutPlan} 
            disabled={saving}
            size="sm"
            variant="outline"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Speichere...' : 'Als Plan speichern'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Exercise Overview */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Übungen:</h4>
          <div className="flex flex-wrap gap-2">
            {uniqueExercises.map((exercise, index) => (
              <Badge 
                key={index} 
                variant={exercise.type === 'quick' ? 'secondary' : 'default'}
                className="text-xs"
              >
                {exercise.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Workout Details */}
        <UnifiedWorkoutCard
          date={date}
          quickWorkouts={quickWorkouts}
          advancedSessions={advancedSessions}
          onWorkoutUpdated={onWorkoutUpdated}
        />
      </CardContent>
    </Card>
  );
};