import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { calcVolume } from '@/tools/analysis';

interface TrainingSession {
  id: string;
  exercise_name: string;
  sets: Array<{
    reps: number;
    weight_kg: number;
    rpe?: number;
  }>;
  created_at: string;
}

interface MuscleGroupVolume {
  [muscle: string]: number;
}

interface CoachingInsight {
  type: 'balance' | 'volume' | 'next_exercise' | 'rest_suggestion';
  message: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
}

interface TrainingCoachingData {
  currentSession: TrainingSession[];
  todayVolume: MuscleGroupVolume;
  pushPullBalance: {
    push: number;
    pull: number;
    ratio: number;
  };
  insights: CoachingInsight[];
  nextExerciseSuggestion?: string;
}

export const useTrainingCoaching = () => {
  const { user } = useAuth();
  const [coachingData, setCoachingData] = useState<TrainingCoachingData | null>(null);
  const [loading, setLoading] = useState(false);

  const analyzeCurrentSession = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Fetch today's exercise sets
      const { data: sets, error } = await supabase
        .from('exercise_sets')
        .select(`
          id,
          exercise_id,
          weight_kg,
          reps,
          rpe,
          created_at,
          exercises!inner(name)
        `)
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group sets by exercise
      const exerciseGroups = sets?.reduce((acc: Record<string, any>, set: any) => {
        const exerciseName = set.exercises?.name || 'Unknown';
        if (!acc[exerciseName]) {
          acc[exerciseName] = {
            id: set.exercise_id,
            exercise_name: exerciseName,
            sets: [],
            created_at: set.created_at
          };
        }
        acc[exerciseName].sets.push({
          reps: set.reps || 0,
          weight_kg: set.weight_kg || 0,
          rpe: set.rpe
        });
        return acc;
      }, {});

      const currentSession = Object.values(exerciseGroups || {}) as TrainingSession[];

      // Analyze volume and balance using existing analysis tools
      const exerciseEntries = currentSession.map(exercise => ({
        name: exercise.exercise_name,
        sets: exercise.sets.map(set => ({
          reps: set.reps,
          weight: set.weight_kg,
          rpe: set.rpe
        }))
      }));

      const volumeAnalysis = calcVolume(exerciseEntries);
      
      // Generate coaching insights
      const insights: CoachingInsight[] = [];
      
      // Push/Pull Balance Analysis
      if (volumeAnalysis.pushPull.ratioPullToPush < 0.8) {
        insights.push({
          type: 'balance',
          message: 'Mehr Zugübungen einbauen für bessere Push/Pull-Balance (z.B. Rudern, Latzug)',
          priority: 'medium',
          actionable: true
        });
      } else if (volumeAnalysis.pushPull.ratioPullToPush > 1.25) {
        insights.push({
          type: 'balance',
          message: 'Mehr Druckübungen für ausgewogene Balance (z.B. Bankdrücken, Schulterdrücken)',
          priority: 'medium',
          actionable: true
        });
      } else {
        insights.push({
          type: 'balance',
          message: 'Gute Push/Pull-Balance heute! 👍',
          priority: 'low',
          actionable: false
        });
      }

      // Volume Analysis
      if (volumeAnalysis.total > 8000) {
        insights.push({
          type: 'volume',
          message: 'Hohe Trainingsintensität heute. Achte auf ausreichende Regeneration.',
          priority: 'medium',
          actionable: true
        });
      } else if (volumeAnalysis.total < 3000 && currentSession.length > 2) {
        insights.push({
          type: 'volume',
          message: 'Noch Raum für ein paar zusätzliche Sätze, falls du dich gut fühlst.',
          priority: 'low',
          actionable: true
        });
      }

      // Next Exercise Suggestion
      let nextExerciseSuggestion;
      if (volumeAnalysis.pushPull.ratioPullToPush < 0.8) {
        nextExerciseSuggestion = 'Rudern oder Latzug für bessere Balance';
      } else if (volumeAnalysis.pushPull.ratioPullToPush > 1.25) {
        nextExerciseSuggestion = 'Bankdrücken oder Schulterdrücken';
      } else {
        // Suggest based on missing muscle groups
        const trainedMuscles = Object.keys(volumeAnalysis.byMuscle);
        if (!trainedMuscles.includes('chest') && !trainedMuscles.includes('upper_chest')) {
          nextExerciseSuggestion = 'Brustübung (z.B. Bankdrücken, Fliegende)';
        } else if (!trainedMuscles.includes('lats') && !trainedMuscles.includes('mid_back')) {
          nextExerciseSuggestion = 'Rückenübung (z.B. Rudern, Latzug)';
        } else if (!trainedMuscles.includes('side_delts')) {
          nextExerciseSuggestion = 'Schulterübung (z.B. Seitheben)';
        }
      }

      if (nextExerciseSuggestion) {
        insights.push({
          type: 'next_exercise',
          message: `Nächste Übung: ${nextExerciseSuggestion}`,
          priority: 'medium',
          actionable: true
        });
      }

      // Rest suggestion based on last set timing
      if (currentSession.length > 0) {
        const lastSet = sets?.[sets.length - 1];
        if (lastSet) {
          const lastSetTime = new Date(lastSet.created_at);
          const timeSinceLastSet = (Date.now() - lastSetTime.getTime()) / 1000; // seconds
          
          if (timeSinceLastSet < 60) {
            insights.push({
              type: 'rest_suggestion',
              message: 'Kurze Pause - noch etwas mehr Erholung kann helfen',
              priority: 'low',
              actionable: false
            });
          } else if (timeSinceLastSet > 300) {
            insights.push({
              type: 'rest_suggestion',
              message: 'Längere Pause - bereit für den nächsten Satz! 💪',
              priority: 'low',
              actionable: false
            });
          }
        }
      }

      setCoachingData({
        currentSession,
        todayVolume: volumeAnalysis.byMuscle,
        pushPullBalance: {
          push: volumeAnalysis.pushPull.push,
          pull: volumeAnalysis.pushPull.pull,
          ratio: volumeAnalysis.pushPull.ratioPullToPush
        },
        insights,
        nextExerciseSuggestion
      });

    } catch (error) {
      console.error('Error analyzing training session:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getNextExerciseSuggestion = useCallback(() => {
    return coachingData?.nextExerciseSuggestion;
  }, [coachingData]);

  const getCoachingTip = useCallback((type?: CoachingInsight['type']) => {
    if (!coachingData?.insights) return null;
    
    const insights = type 
      ? coachingData.insights.filter(insight => insight.type === type)
      : coachingData.insights;
    
    // Return highest priority actionable insight
    const actionableInsights = insights.filter(i => i.actionable);
    if (actionableInsights.length > 0) {
      return actionableInsights.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })[0];
    }
    
    return insights[0] || null;
  }, [coachingData]);

  useEffect(() => {
    if (user) {
      analyzeCurrentSession();
    }
  }, [user, analyzeCurrentSession]);

  return {
    coachingData,
    loading,
    refreshAnalysis: analyzeCurrentSession,
    getNextExerciseSuggestion,
    getCoachingTip
  };
};