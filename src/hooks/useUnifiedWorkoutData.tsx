import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ExerciseSet {
  id: string;
  weight_kg: number;
  reps: number;
  rpe: number;
  exercises: {
    name: string;
    category: string;
  };
}

interface AdvancedSession {
  id: string;
  session_name: string;
  date: string;
  start_time: string;
  end_time: string;
  exercise_sets: ExerciseSet[];
}

interface QuickWorkout {
  id: string;
  date: string;
  workout_type: string;
  duration_minutes: number;
  intensity: number;
  did_workout: boolean;
  distance_km?: number;
  steps?: number;
}

interface UnifiedWorkoutData {
  date: string;
  quickWorkouts: QuickWorkout[];
  advancedSessions: AdvancedSession[];
}

export const useUnifiedWorkoutData = (timeRange: 'week' | 'month' | 'year' = 'week') => {
  const { user } = useAuth();
  const [workoutData, setWorkoutData] = useState<UnifiedWorkoutData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkoutData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Calculate date range
      const daysToLoad = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToLoad);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Load quick workouts
      const { data: quickWorkouts, error: quickError } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .order('date', { ascending: false });

      if (quickError) throw quickError;

      // Load advanced training sessions
      const { data: advancedSessions, error: advancedError } = await supabase
        .from('exercise_sessions')
        .select(`
          id,
          session_name,
          date,
          start_time,
          end_time,
          exercise_sets (
            id,
            weight_kg,
            reps,
            rpe,
            exercises (
              name,
              category
            )
          )
        `)
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .order('date', { ascending: false });

      if (advancedError) throw advancedError;

      // Group by date
      const workoutMap = new Map<string, UnifiedWorkoutData>();
      
      // Initialize with all dates in range
      for (let i = 0; i < daysToLoad; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        workoutMap.set(dateStr, {
          date: dateStr,
          quickWorkouts: [],
          advancedSessions: []
        });
      }

      // Add quick workouts
      quickWorkouts?.forEach(workout => {
        const existing = workoutMap.get(workout.date);
        if (existing) {
          existing.quickWorkouts.push(workout);
        }
      });

      // Add advanced sessions
      advancedSessions?.forEach(session => {
        const existing = workoutMap.get(session.date);
        if (existing) {
          existing.advancedSessions.push(session);
        }
      });

      // Convert to array and sort by date (newest first)
      const sortedData = Array.from(workoutMap.values())
        .filter(day => day.quickWorkouts.length > 0 || day.advancedSessions.length > 0)
        .sort((a, b) => b.date.localeCompare(a.date));

      setWorkoutData(sortedData);
    } catch (error) {
      console.error('Error loading unified workout data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, timeRange]);

  useEffect(() => {
    loadWorkoutData();
  }, [loadWorkoutData]);

  return {
    workoutData,
    loading,
    refetch: loadWorkoutData
  };
};