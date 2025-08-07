import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ExerciseAnalytics {
  exercise_name: string;
  total_volume: number;
  avg_weight: number;
  max_weight: number;
  avg_rpe: number;
  total_sets: number;
  progression_trend: 'increasing' | 'stable' | 'decreasing';
  last_trained: string;
}

interface MuscleGroupAnalytics {
  muscle_group: string;
  total_volume: number;
  frequency_per_week: number;
  volume_per_session: number;
  recovery_quality: 'good' | 'moderate' | 'poor';
}

interface WorkoutAnalytics {
  timeRange: string;
  totalWorkouts: number;
  totalVolume: number;
  avgSessionDuration: number;
  exerciseAnalytics: ExerciseAnalytics[];
  muscleGroupAnalytics: MuscleGroupAnalytics[];
  strengthProfile: {
    squat: number;
    bench: number;
    deadlift: number;
    overhead_press: number;
  };
  performanceInsights: string[];
  recommendations: string[];
}

export const useWorkoutAnalytics = (timeRange: 'week' | 'month' | 'quarter' = 'month') => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<WorkoutAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const analyzeWorkoutHistory = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Calculate date range
      const daysToAnalyze = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToAnalyze);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Fetch detailed exercise data
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('exercise_sets')
        .select(`
          weight_kg,
          reps,
          rpe,
          created_at,
          exercises (
            name,
            category,
            muscle_groups
          )
        `)
        .eq('user_id', user.id)
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: true });

      if (exerciseError) throw exerciseError;

      // Fetch session data
      const { data: sessionData, error: sessionError } = await supabase
        .from('exercise_sessions')
        .select('id, session_name, start_time, end_time, date')
        .eq('user_id', user.id)
        .gte('date', startDateStr);

      if (sessionError) throw sessionError;

      // Analyze exercise performance
      const exerciseMap = new Map<string, {
        volumes: number[];
        weights: number[];
        rpes: number[];
        dates: Date[];
        sets: number;
      }>();

      exerciseData?.forEach(set => {
        if (!set.exercises?.name || !set.weight_kg || !set.reps) return;
        
        const name = set.exercises.name;
        const volume = set.weight_kg * set.reps;
        const date = new Date(set.created_at);

        if (!exerciseMap.has(name)) {
          exerciseMap.set(name, {
            volumes: [],
            weights: [],
            rpes: [],
            dates: [],
            sets: 0
          });
        }

        const exerciseData = exerciseMap.get(name)!;
        exerciseData.volumes.push(volume);
        exerciseData.weights.push(set.weight_kg);
        if (set.rpe) exerciseData.rpes.push(set.rpe);
        exerciseData.dates.push(date);
        exerciseData.sets++;
      });

      // Calculate exercise analytics
      const exerciseAnalytics: ExerciseAnalytics[] = Array.from(exerciseMap.entries()).map(([name, data]) => {
        const totalVolume = data.volumes.reduce((sum, v) => sum + v, 0);
        const avgWeight = data.weights.reduce((sum, w) => sum + w, 0) / data.weights.length;
        const maxWeight = Math.max(...data.weights);
        const avgRpe = data.rpes.length > 0 ? data.rpes.reduce((sum, r) => sum + r, 0) / data.rpes.length : 0;
        
        // Calculate progression trend
        const recentWeights = data.weights.slice(-5);
        const earlyWeights = data.weights.slice(0, 5);
        const recentAvg = recentWeights.reduce((sum, w) => sum + w, 0) / recentWeights.length;
        const earlyAvg = earlyWeights.reduce((sum, w) => sum + w, 0) / earlyWeights.length;
        
        let progression_trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
        if (recentAvg > earlyAvg * 1.05) progression_trend = 'increasing';
        else if (recentAvg < earlyAvg * 0.95) progression_trend = 'decreasing';

        return {
          exercise_name: name,
          total_volume: Math.round(totalVolume),
          avg_weight: Math.round(avgWeight * 10) / 10,
          max_weight: maxWeight,
          avg_rpe: Math.round(avgRpe * 10) / 10,
          total_sets: data.sets,
          progression_trend,
          last_trained: data.dates[data.dates.length - 1]?.toISOString().split('T')[0] || ''
        };
      }).sort((a, b) => b.total_volume - a.total_volume);

      // Analyze muscle groups
      const muscleGroupMap = new Map<string, {
        totalVolume: number;
        sessionCount: number;
        lastTrained: Date[];
      }>();

      exerciseData?.forEach(set => {
        if (!set.exercises?.muscle_groups || !set.weight_kg || !set.reps) return;
        
        const muscleGroups = set.exercises.muscle_groups || [];
        const volume = set.weight_kg * set.reps;
        const date = new Date(set.created_at);

        muscleGroups.forEach((muscleGroup: string) => {
          if (!muscleGroupMap.has(muscleGroup)) {
            muscleGroupMap.set(muscleGroup, {
              totalVolume: 0,
              sessionCount: 0,
              lastTrained: []
            });
          }

          const mgData = muscleGroupMap.get(muscleGroup)!;
          mgData.totalVolume += volume;
          mgData.lastTrained.push(date);
        });
      });

      const muscleGroupAnalytics: MuscleGroupAnalytics[] = Array.from(muscleGroupMap.entries()).map(([name, data]) => {
        const uniqueDates = [...new Set(data.lastTrained.map(d => d.toDateString()))];
        const frequency_per_week = (uniqueDates.length / daysToAnalyze) * 7;
        const volume_per_session = data.totalVolume / uniqueDates.length || 0;
        
        // Assess recovery quality based on frequency
        let recovery_quality: 'good' | 'moderate' | 'poor' = 'good';
        if (frequency_per_week > 4) recovery_quality = 'poor';
        else if (frequency_per_week > 2.5) recovery_quality = 'moderate';

        return {
          muscle_group: name,
          total_volume: Math.round(data.totalVolume),
          frequency_per_week: Math.round(frequency_per_week * 10) / 10,
          volume_per_session: Math.round(volume_per_session),
          recovery_quality
        };
      }).sort((a, b) => b.total_volume - a.total_volume);

      // Calculate strength profile
      const strengthProfile = {
        squat: exerciseAnalytics.find(e => e.exercise_name.toLowerCase().includes('kniebeuge') || e.exercise_name.toLowerCase().includes('squat'))?.max_weight || 0,
        bench: exerciseAnalytics.find(e => e.exercise_name.toLowerCase().includes('bankdrück') || e.exercise_name.toLowerCase().includes('bench'))?.max_weight || 0,
        deadlift: exerciseAnalytics.find(e => e.exercise_name.toLowerCase().includes('kreuzheb') || e.exercise_name.toLowerCase().includes('deadlift'))?.max_weight || 0,
        overhead_press: exerciseAnalytics.find(e => e.exercise_name.toLowerCase().includes('schulterdrück') || e.exercise_name.toLowerCase().includes('overhead'))?.max_weight || 0
      };

      // Generate insights and recommendations
      const performanceInsights: string[] = [];
      const recommendations: string[] = [];

      // Progression insights
      const increasingExercises = exerciseAnalytics.filter(e => e.progression_trend === 'increasing').length;
      const decreasingExercises = exerciseAnalytics.filter(e => e.progression_trend === 'decreasing').length;
      
      if (increasingExercises > decreasingExercises) {
        performanceInsights.push(`Positive Progression: ${increasingExercises} Übungen zeigen Fortschritte`);
      } else if (decreasingExercises > increasingExercises) {
        performanceInsights.push(`Warnung: ${decreasingExercises} Übungen zeigen rückläufige Leistung`);
        recommendations.push("Überprüfe Regeneration und Programmgestaltung");
      }

      // Volume insights
      const totalVolume = exerciseAnalytics.reduce((sum, e) => sum + e.total_volume, 0);
      const avgRpe = exerciseAnalytics.reduce((sum, e) => sum + e.avg_rpe, 0) / exerciseAnalytics.length;
      
      if (avgRpe > 8.5) {
        performanceInsights.push("Hohe Intensität: Durchschnittliche RPE über 8.5");
        recommendations.push("Deload-Woche oder Intensität reduzieren");
      }

      // Muscle group balance
      const topMuscleGroups = muscleGroupAnalytics.slice(0, 3);
      if (topMuscleGroups.length > 0) {
        const topVolume = topMuscleGroups[0].total_volume;
        const imbalanced = topMuscleGroups.filter(mg => mg.total_volume < topVolume * 0.6);
        if (imbalanced.length > 0) {
          recommendations.push(`Muskel-Balance verbessern: ${imbalanced.map(mg => mg.muscle_group).join(', ')} brauchen mehr Volumen`);
        }
      }

      // Frequency recommendations
      const lowFrequencyMuscles = muscleGroupAnalytics.filter(mg => mg.frequency_per_week < 1.5);
      if (lowFrequencyMuscles.length > 0) {
        recommendations.push(`Frequenz erhöhen für: ${lowFrequencyMuscles.map(mg => mg.muscle_group).join(', ')}`);
      }

      const result: WorkoutAnalytics = {
        timeRange,
        totalWorkouts: sessionData?.length || 0,
        totalVolume: Math.round(totalVolume),
        avgSessionDuration: 60, // TODO: Calculate from session data
        exerciseAnalytics,
        muscleGroupAnalytics,
        strengthProfile,
        performanceInsights,
        recommendations
      };

      setAnalytics(result);

    } catch (error) {
      console.error('Error analyzing workout history:', error);
    } finally {
      setLoading(false);
    }
  }, [user, timeRange]);

  useEffect(() => {
    analyzeWorkoutHistory();
  }, [analyzeWorkoutHistory]);

  return {
    analytics,
    loading,
    refetch: analyzeWorkoutHistory
  };
};