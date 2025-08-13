import React, { useState, useEffect, useCallback } from 'react';
import { QuickCardShell } from './QuickCardShell';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QuickWorkoutInput } from '@/components/QuickWorkoutInput';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Footprints, Play } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { getCurrentDateString } from '@/utils/dateHelpers';
import { useNavigate } from 'react-router-dom';

interface TodaysWorkout {
  id: string;
  workout_type: string;
  duration_minutes?: number;
  did_workout: boolean;
}

export const QuickTrainingCard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [todaysWorkouts, setTodaysWorkouts] = useState<TodaysWorkout[]>([]);
  const [loading, setLoading] = useState(false);
  const [favoriteTypes, setFavoriteTypes] = useState<string[]>([]);

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

  // Realtime refresh on workouts changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('workouts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workouts' },
        (payload) => {
          const today = getCurrentDateString();
          const row = (payload as any).new || (payload as any).old;
          if (row?.user_id === user.id && row?.date === today) {
            loadTodaysWorkouts();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadTodaysWorkouts]);

  const addQuickWalk = async (minutes: number) => {
    if (!user) return;

    setLoading(true);
    try {
      // Require authenticated session for RLS-protected insert
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        toast.error('Bitte melde dich erneut an, um Workouts zu speichern.');
        return;
      }
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

  const addRestDay = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        toast.error('Bitte melde dich erneut an, um Ruhetage zu speichern.');
        return;
      }
      const today = getCurrentDateString();
      const { error } = await supabase
        .from('workouts')
        .insert([{ user_id: user.id, date: today, workout_type: 'pause', did_workout: false }]);
      if (error) throw error;
      toast.success('Ruhetag erfasst');
      loadTodaysWorkouts();
    } catch (e) {
      console.error(e);
      toast.error('Fehler beim Speichern des Ruhetags');
    } finally {
      setLoading(false);
    }
  };

  // Load favorites based on last 30 days usage
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const sinceStr = since.toISOString().slice(0, 10);
        const { data, error } = await supabase
          .from('workouts')
          .select('workout_type')
          .eq('user_id', user.id)
          .gte('date', sinceStr);
        if (error) throw error;
        const counts: Record<string, number> = {};
        (data || []).forEach((w: any) => {
          const t = w.workout_type || 'kraft';
          counts[t] = (counts[t] || 0) + 1;
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t]) => t);
        const top = sorted.slice(0, 2);
        // sensible defaults if no history
        setFavoriteTypes(top.length ? top : ['pause', 'kraft']);
      } catch (e) {
        console.error('load favorites failed', e);
        setFavoriteTypes(['pause', 'kraft']);
      }
    })();
  }, [user]);

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

  // Build dynamic quick actions based on favorites
  const quickActionsHeader = (() => {
    const actions: { label: string; onClick: () => void; disabled?: boolean; variant?: any }[] = [];
    const labelsAdded = new Set<string>();
    favoriteTypes.forEach((t) => {
      if (t === 'pause' && !labelsAdded.has('Ruhetag')) {
        actions.push({ label: 'Ruhetag', onClick: addRestDay, disabled: loading, variant: 'secondary' });
        labelsAdded.add('Ruhetag');
      } else if (t !== 'pause') {
        const label = getWorkoutTypeLabel(t);
        if (!labelsAdded.has(label)) {
          actions.push({ label, onClick: () => setDetailsOpen(true), disabled: false, variant: 'secondary' });
          labelsAdded.add(label);
        }
      }
    });
    // Fallbacks to ensure we always have two actions
    if (actions.length < 2) {
      if (!labelsAdded.has('Workout')) {
        actions.push({ label: 'Workout', onClick: () => setDetailsOpen(true), variant: 'secondary' });
      }
      if (!labelsAdded.has('Ruhetag')) {
        actions.push({ label: 'Ruhetag', onClick: addRestDay, disabled: loading, variant: 'secondary' });
      }
    }
    return actions.slice(0, 2);
  })();

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
        quickActions={quickActionsHeader}
        dropdownActions={[
          { label: 'Quick-Eintrag', onClick: () => setDetailsOpen(true) }
        ]}
        detailsAction={{
          label: 'Workout starten',
          onClick: () => navigate('/training')
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
        <DialogContent className="w-full sm:max-w-md p-0 bg-transparent border-none shadow-none sm:rounded-2xl">
          <DialogTitle className="sr-only">Workout eintragen</DialogTitle>
          <DialogDescription className="sr-only">Details erfassen oder bearbeiten</DialogDescription>
          <div className="rounded-2xl border border-border/50 bg-background/95 backdrop-blur-md shadow-xl p-4 sm:p-6">
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