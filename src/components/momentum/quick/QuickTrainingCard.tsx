import React, { useState, useEffect, useCallback } from 'react';
import { QuickCardShell } from './QuickCardShell';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { QuickWorkoutInput } from '@/components/QuickWorkoutInput';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Footprints, Play } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { getCurrentDateString } from '@/utils/dateHelpers';

interface TodaysWorkout {
  id: string;
  workout_type: string;
  duration_minutes?: number;
  did_workout: boolean;
}

export const QuickTrainingCard: React.FC = () => {
  const { user } = useAuth();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [todaysWorkouts, setTodaysWorkouts] = useState<TodaysWorkout[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTodaysWorkouts = useCallback(async () => {
    if (!user) return;

    try {
      const today = getCurrentDateString();
      const { data, error } = await supabase
        .from('workouts')
        .select('id, workout_type, duration_minutes, did_workout')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTodaysWorkouts(data || []);
    } catch (error) {
      console.error('Error loading today workouts:', error);
    }
  }, [user]);

  useEffect(() => {
    loadTodaysWorkouts();
  }, [loadTodaysWorkouts]);

  const addQuickWalk = async (minutes: number) => {
    if (!user) return;

    setLoading(true);
    try {
      const today = getCurrentDateString();
      const workoutData = {
        user_id: user.id,
        workout_type: 'cardio',
        duration_minutes: minutes,
        intensity: 3,
        did_workout: true,
        date: today,
        walking_notes: `${minutes} Minuten Spaziergang`
      };

      const { error } = await supabase
        .from('workouts')
        .insert([workoutData]);

      if (error) throw error;

      toast.success(`${minutes}-Min Spaziergang hinzugefügt`);
      loadTodaysWorkouts();
    } catch (error) {
      console.error('Error adding quick walk:', error);
      toast.error('Fehler beim Hinzufügen');
    } finally {
      setLoading(false);
    }
  };

  const hasWorkoutToday = todaysWorkouts.length > 0;
  const hasActiveWorkout = todaysWorkouts.some(w => w.did_workout);

  const getWorkoutTypeLabel = (type: string) => {
    switch (type) {
      case 'kraft': return 'Krafttraining';
      case 'cardio': return 'Cardio';
      case 'pause': return 'Ruhetag';
      default: return type;
    }
  };

  const getWorkoutTypeIcon = (type: string) => {
    switch (type) {
      case 'kraft': return <Dumbbell className="h-3 w-3" />;
      case 'cardio': return <Footprints className="h-3 w-3" />;
      default: return <Play className="h-3 w-3" />;
    }
  };

  // Calculate state and progress
  const dataState = hasWorkoutToday ? 'done' : 
                   todaysWorkouts.length > 0 ? 'partial' : 'empty';
  const progressPercent = hasWorkoutToday ? 100 : 
                         todaysWorkouts.length > 0 ? 60 : 0;

  return (
    <>
      <QuickCardShell
        title="Training"
        icon={<Dumbbell className="h-4 w-4" />}
        dataState={dataState}
        progressPercent={progressPercent}
        status={hasWorkoutToday ? 
          (hasActiveWorkout ? `${todaysWorkouts.length} Einheit(en)` : 'Ruhetag') : 
          'Noch nicht erfasst'
        }
        quickActions={[
          {
            label: '10-Min Walk',
            onClick: () => addQuickWalk(10),
            disabled: loading,
            variant: 'secondary'
          },
          {
            label: '20-Min Walk',
            onClick: () => addQuickWalk(20),
            disabled: loading,
            variant: 'secondary'
          }
        ]}
        detailsAction={{
          label: hasWorkoutToday ? 'Details' : 'Starten',
          onClick: () => setDetailsOpen(true)
        }}
      >
        {hasWorkoutToday && (
          <div className="space-y-2">
            {todaysWorkouts.slice(0, 3).map(workout => (
              <div key={workout.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <div className="flex items-center gap-2">
                  {getWorkoutTypeIcon(workout.workout_type)}
                  <span className="text-sm">{getWorkoutTypeLabel(workout.workout_type)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {workout.duration_minutes && (
                    <span className="text-xs text-muted-foreground">
                      {workout.duration_minutes}min
                    </span>
                  )}
                  <Badge variant={workout.did_workout ? 'default' : 'secondary'} className="text-xs">
                    {workout.did_workout ? 'Aktiv' : 'Ruhe'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </QuickCardShell>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="w-full sm:max-w-md p-0">
          <div className="p-4">
            <QuickWorkoutInput 
              asCard
              onWorkoutAdded={loadTodaysWorkouts} 
              todaysWorkouts={todaysWorkouts} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};