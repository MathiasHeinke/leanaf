import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

import { toast } from 'sonner';

interface UserPoints {
  total_points: number;
  current_level: number;
  level_name: string;
  points_to_next_level: number;
}

interface PointActivity {
  activity_type: string;
  points_earned: number;
  multiplier: number;
  description?: string;
}

interface DepartmentProgress {
  department: string;
  level: number;
  points: number;
}

interface UserStreak {
  streak_type: string;
  current_streak: number;
  longest_streak: number;
}

export const usePointsSystem = () => {
  const { user } = useAuth();
  const trialMultiplier = 1.0; // No special multipliers in credit system
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [departmentProgress, setDepartmentProgress] = useState<DepartmentProgress[]>([]);
  const [streaks, setStreaks] = useState<UserStreak[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user points data
  const loadUserPoints = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user points:', error);
        return;
      }

      if (data) {
        setUserPoints(data);
      } else {
        // Initialize user points
        setUserPoints({
          total_points: 0,
          current_level: 1,
          level_name: 'Rookie',
          points_to_next_level: 100
        });
      }
    } catch (error) {
      console.error('Error in loadUserPoints:', error);
    }
  };

  // Load department progress
  const loadDepartmentProgress = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('department_progress')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading department progress:', error);
        return;
      }

      setDepartmentProgress(data || []);
    } catch (error) {
      console.error('Error in loadDepartmentProgress:', error);
    }
  };

  // Load streaks
  const loadStreaks = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading streaks:', error);
        return;
      }

      setStreaks(data || []);
    } catch (error) {
      console.error('Error in loadStreaks:', error);
    }
  };

  // Award points for activity with automatic trial boost and badge checking
  const awardPoints = async (
    activityType: string,
    basePoints: number,
    description?: string,
    multiplier: number = 1.0,
    bonusReason?: string,
    streakLength?: number,
    clientEventId?: string
  ) => {
    if (!user?.id) {
      console.warn('❌ Cannot award points: No user ID');
      return;
    }

    const currentTrialMultiplier = trialMultiplier;
    console.log(`🎯 Awarding points - Type: ${activityType}, Points: ${basePoints}, Multiplier: ${multiplier}, Trial: ${currentTrialMultiplier}`);

    try {
      const { data, error } = await supabase.rpc('update_user_points_and_level', {
        p_user_id: user.id,
        p_points: basePoints,
        p_activity_type: activityType,
        p_description: description,
        p_multiplier: multiplier,
        p_trial_multiplier: trialMultiplier,
        p_client_event_id: clientEventId
      });

      if (error) {
        console.error('❌ Error awarding points:', error);
        toast.error('Fehler beim Vergeben der Punkte', {
          duration: 3000,
          position: "top-center",
        });
        return;
      }

      const result = data as any;
      console.log('✅ Points awarded successfully:', result);
      
      // Update local state
      setUserPoints({
        total_points: result.total_points,
        current_level: result.current_level,
        level_name: result.level_name,
        points_to_next_level: result.points_to_next_level
      });

      // Show level up notification
      if (result.level_up) {
        toast.success(`🎉 Level Up! Du bist jetzt ${result.level_name}!`, {
          duration: 5000,
          position: "top-center",
        });
        
        // Trigger badge check for level achievements
        setTimeout(async () => {
          try {
            const { ExtendedBadgeManager } = await import('@/utils/extendedBadgeManager');
            const badgeManager = new ExtendedBadgeManager(user.id);
            await badgeManager.checkAndAwardAllBadges();
          } catch (error) {
            console.error('Error checking badges after level up:', error);
          }
        }, 1000);
      } else if (result.points_earned > 0) {
        console.log(`🎉 Points earned: ${result.points_earned}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error in awardPoints:', error);
      toast.error('Fehler beim Vergeben der Punkte', {
        duration: 3000,
        position: "top-center",
      });
    }
  };

  // Update streak
  const updateStreak = async (streakType: string, activityDate?: Date) => {
    if (!user?.id) {
      console.warn('❌ Cannot update streak: No user ID');
      return;
    }

    console.log(`🔥 Updating streak - Type: ${streakType}`);

    try {
      const { data, error } = await supabase.rpc('update_user_streak', {
        p_user_id: user.id,
        p_streak_type: streakType,
        p_activity_date: activityDate ? activityDate.toISOString().split('T')[0] : undefined
      });

      if (error) {
        console.error('❌ Error updating streak:', error);
        return;
      }

      console.log('✅ Streak updated successfully:', data);

      // Reload streaks to get updated data
      await loadStreaks();
      
      return data;
    } catch (error) {
      console.error('❌ Error in updateStreak:', error);
    }
  };

  // Evaluate meal quality and award points
  const evaluateMeal = async (mealId: string, mealData: any) => {
    if (!user?.id) {
      console.warn('❌ Cannot evaluate meal: No user ID');
      return;
    }

    try {
      console.log('🧠 Evaluating meal quality:', mealData);
      
      // Get user profile and daily goals
      const [profileResult, goalsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('goal, activity_level, target_weight, weight, height, age, gender, macro_strategy, muscle_maintenance_priority, coach_personality')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('daily_goals')
          .select('calories, protein, carbs, fats, calorie_deficit')
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      if (profileResult.error || goalsResult.error) {
        console.error('Error loading profile/goals for meal evaluation:', profileResult.error || goalsResult.error);
        return;
      }

      const profile = {
        ...profileResult.data,
        coach_personality: profileResult.data.coach_personality || 'moderat',
        preferred_timezone: localStorage.getItem('user-timezone') || 'Europe/Berlin'
      };

      // Call evaluate-meal edge function
      const { data: evaluationData, error: evaluationError } = await supabase.functions.invoke('evaluate-meal', {
        body: {
          meal: mealData,
          profile: profile,
          dailyGoals: goalsResult.data
        }
      });

      if (evaluationError) {
        console.error('Error calling evaluate-meal function:', evaluationError);
        return;
      }

      console.log('✅ Meal evaluation completed:', evaluationData);

      // Update meal with evaluation data
      const { error: updateError } = await supabase
        .from('meals')
        .update({
          quality_score: evaluationData.quality_score,
          bonus_points: evaluationData.bonus_points,
          ai_feedback: evaluationData.ai_feedback,
          evaluation_criteria: evaluationData.evaluation_criteria
        })
        .eq('id', mealId);

      if (updateError) {
        console.error('Error updating meal with evaluation:', updateError);
        return;
      }

      // Award bonus points if applicable
      if (evaluationData.bonus_points > 0) {
        const bonusResult = await awardPoints(
          'meal_quality_bonus',
          evaluationData.bonus_points,
          `Qualitätsbonus für Mahlzeit (${evaluationData.quality_score}/10)`,
          1.0,
          'quality_bonus'
        );

        if (bonusResult) {
          const hasPhoto = mealData.images && mealData.images.length > 0;
          const basePoints = hasPhoto ? 5 : 3;
          const totalPoints = basePoints + evaluationData.bonus_points;
          
          // Enhanced toast with quality score
          const qualityEmoji = evaluationData.quality_score >= 8 ? '🏆' : 
                              evaluationData.quality_score >= 6 ? '🥈' : '🥉';
          
          toast.success(`${qualityEmoji} ${totalPoints} Punkte! (${basePoints}P Tracking + ${evaluationData.bonus_points}BP Qualität ${evaluationData.quality_score}/10)`, {
            duration: 6000,
            position: "top-center",
          });
        }
      } else {
        // Show basic points when no bonus
        const hasPhoto = mealData.images && mealData.images.length > 0;
        const basePoints = hasPhoto ? 5 : 3;
        
        toast.success(`📊 ${basePoints} Punkte fürs Tracking! ${evaluationData.ai_feedback ? '🤖 ' + evaluationData.ai_feedback.slice(0, 50) + '...' : ''}`, {
          duration: 4000,
          position: "top-center",
        });
      }

      return evaluationData;

    } catch (error) {
      console.error('❌ Error in evaluateMeal:', error);
    }
  };

  // Evaluate workout quality and award bonus points
  const evaluateWorkout = async (workoutId: string, workoutData: any) => {
    if (!user?.id || !workoutData.intensity || !workoutData.duration_minutes) {
      return;
    }

    try {
      // Calculate intensity/duration ratio (optimal: high intensity, shorter duration)
      const intensityDurationRatio = workoutData.intensity / Math.max(1, workoutData.duration_minutes / 30); // Normalize to 30min blocks
      let qualityScore = 0;
      let bonusPoints = 0;

      // Optimal workout: High intensity (7-10) with reasonable duration (20-60min)
      if (workoutData.intensity >= 7 && workoutData.duration_minutes >= 20 && workoutData.duration_minutes <= 60) {
        qualityScore = Math.min(10, Math.round(8 + (workoutData.intensity - 7) * 0.5));
        bonusPoints = Math.floor(qualityScore / 2); // 3-5 bonus points for excellent workouts
      } else if (workoutData.intensity >= 5 && workoutData.duration_minutes >= 15) {
        qualityScore = Math.min(7, Math.round(5 + (workoutData.intensity - 5) * 0.5));
        bonusPoints = Math.floor(qualityScore / 3); // 1-2 bonus points for good workouts
      } else {
        qualityScore = Math.max(1, Math.min(5, workoutData.intensity));
        bonusPoints = 0;
      }

      // Check workout frequency (award bonus for consistency)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: recentWorkouts } = await supabase
        .from('workouts')
        .select('date')
        .eq('user_id', user.id)
        .eq('did_workout', true)
        .gte('date', weekAgo.toISOString().split('T')[0]);

      const workoutFrequency = (recentWorkouts || []).length;
      let consistencyBonus = 0;
      let bonusReason = '';

      if (workoutFrequency >= 3) {
        consistencyBonus = 2;
        bonusReason = 'consistency_bonus';
        bonusPoints += consistencyBonus;
      }

      // Update workout with quality data
      await supabase
        .from('workouts')
        .update({
          quality_score: qualityScore,
          bonus_points: bonusPoints
        })
        .eq('id', workoutId);

      // Award bonus points if earned
      if (bonusPoints > 0) {
        await awardPoints(
          'workout_quality_bonus',
          bonusPoints,
          `Workout-Qualitätsbonus (${qualityScore}/10)`,
          1.0,
          bonusReason,
          workoutFrequency
        );
      }

      return { qualityScore, bonusPoints, consistencyBonus };
    } catch (error) {
      console.error('❌ Error evaluating workout:', error);
    }
  };

  // Evaluate sleep quality and award bonus points
  const evaluateSleep = async (sleepId: string, sleepData: any) => {
    if (!user?.id || !sleepData.sleep_hours) {
      return;
    }

    try {
      const hours = sleepData.sleep_hours;
      let qualityScore = 0;
      let bonusPoints = 0;

      // Optimal sleep: 7-9 hours
      if (hours >= 7 && hours <= 9) {
        qualityScore = 8 + Math.random() * 2; // 8-10 for optimal sleep
        bonusPoints = 3;
      } else if (hours >= 6 && hours <= 10) {
        qualityScore = 5 + Math.random() * 2; // 5-7 for acceptable sleep  
        bonusPoints = 1;
      } else {
        qualityScore = Math.max(1, 5 - Math.abs(hours - 7.5)); // Penalty for too little/much sleep
        bonusPoints = 0;
      }

      qualityScore = Math.round(qualityScore);

      // Check sleep consistency (streak bonus)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: recentSleep } = await supabase
        .from('sleep_tracking')
        .select('sleep_hours')
        .eq('user_id', user.id)
        .gte('date', weekAgo.toISOString().split('T')[0])
        .not('sleep_hours', 'is', null);

      const consistentSleepDays = (recentSleep || []).filter(s => s.sleep_hours >= 6 && s.sleep_hours <= 10).length;
      let consistencyBonus = 0;
      let bonusReason = '';

      if (consistentSleepDays >= 5) {
        consistencyBonus = 2;
        bonusReason = 'sleep_consistency_bonus';
        bonusPoints += consistencyBonus;
      }

      // Update sleep with quality data
      await supabase
        .from('sleep_tracking')
        .update({
          quality_score: qualityScore,
          bonus_points: bonusPoints
        })
        .eq('id', sleepId);

      // Award bonus points if earned
      if (bonusPoints > 0) {
        await awardPoints(
          'sleep_quality_bonus',
          bonusPoints,
          `Schlaf-Qualitätsbonus (${qualityScore}/10)`,
          1.0,
          bonusReason,
          consistentSleepDays
        );
      }

      return { qualityScore, bonusPoints, consistencyBonus };
    } catch (error) {
      console.error('❌ Error evaluating sleep:', error);
    }
  };

  // Calculate points for different activities
  const getPointsForActivity = (activityType: string, data?: any): number => {
    switch (activityType) {
      case 'meal_tracked_with_photo': return 5;
      case 'meal_tracked': return 3;
      case 'meal_quality_bonus': return data?.bonus_points || 0; // Variable bonus points
      case 'workout_completed': return data?.intensity ? data.intensity * 2 : 8;
      case 'weight_measured': return 3;
      case 'body_measurements': return 4;
      case 'sleep_tracked': return 4;
      case 'calorie_deficit_met': return 10;
      case 'protein_goal_met': return 8;
      case 'daily_login': return 1;
      case 'goal_updated': return 2;
      default: return 1;
    }
  };

  // Calculate streak multiplier
  const getStreakMultiplier = (streakCount: number): number => {
    if (streakCount >= 7) return 2.0;
    if (streakCount >= 3) return 1.5;
    return 1.0;
  };

  // Get level color based on level name
  const getLevelColor = (levelName: string): string => {
    switch (levelName) {
      case 'Rookie': return 'hsl(210, 70%, 55%)';
      case 'Bronze': return 'hsl(30, 50%, 45%)';
      case 'Silver': return 'hsl(210, 20%, 70%)';
      case 'Gold': return 'hsl(45, 100%, 50%)';
      case 'Platinum': return 'hsl(200, 30%, 80%)';
      case 'Diamond': return 'hsl(220, 100%, 70%)';
      case 'Master': return 'hsl(280, 100%, 60%)';
      case 'Grandmaster': return 'hsl(315, 100%, 45%)';
      default: return 'hsl(var(--primary))';
    }
  };

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      Promise.all([
        loadUserPoints(),
        loadDepartmentProgress(),
        loadStreaks()
      ]).finally(() => setLoading(false));
    }
  }, [user?.id]);

    return {
    userPoints,
    departmentProgress,
    streaks,
    loading,
    awardPoints,
    updateStreak,
    evaluateMeal,
    evaluateWorkout,
    evaluateSleep,
    getPointsForActivity: (activityType: string, data?: any): number => {
      switch (activityType) {
        case 'meal_tracked_with_photo': return 5;
        case 'meal_tracked': return 3;
        case 'meal_quality_bonus': return data?.bonus_points || 0;
        case 'workout_completed': return data?.intensity ? data.intensity * 2 : 8;
        case 'weight_measured': return 3;
        case 'body_measurements': return 4;
        case 'sleep_tracked': return 4;
        case 'calorie_deficit_met': return 10;
        case 'protein_goal_met': return 8;
        case 'daily_login': return 1;
        case 'goal_updated': return 2;
        default: return 1;
      }
    },
    getStreakMultiplier: (streakCount: number): number => {
      if (streakCount >= 7) return 2.0;
      if (streakCount >= 3) return 1.5;
      return 1.0;
    },
    getLevelColor: (levelName: string): string => {
      switch (levelName) {
        case 'Rookie': return 'hsl(210, 70%, 55%)';
        case 'Bronze': return 'hsl(30, 50%, 45%)';
        case 'Silver': return 'hsl(210, 20%, 70%)';
        case 'Gold': return 'hsl(45, 100%, 50%)';
        case 'Platinum': return 'hsl(200, 30%, 80%)';
        case 'Diamond': return 'hsl(220, 100%, 70%)';
        case 'Master': return 'hsl(280, 100%, 60%)';
        case 'Grandmaster': return 'hsl(315, 100%, 45%)';
        default: return 'hsl(var(--primary))';
      }
    },
    refreshData: () => {
      loadUserPoints();
      loadDepartmentProgress();
      loadStreaks();
    }
  };
};
