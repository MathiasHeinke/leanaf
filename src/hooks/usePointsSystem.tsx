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
        .single();

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

  // Award points for activity
  const awardPoints = async (
    activityType: string,
    basePoints: number,
    description?: string,
    multiplier: number = 1.0
  ) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc('update_user_points_and_level', {
        p_user_id: user.id,
        p_points: basePoints,
        p_activity_type: activityType,
        p_description: description,
        p_multiplier: multiplier
      });

      if (error) {
        console.error('Error awarding points:', error);
        return;
      }

      const result = data as any;
      
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
          duration: 4000,
        });
      } else if (result.points_earned > 0) {
        toast.success(`+${result.points_earned} Punkte`, {
          duration: 2000,
        });
      }

      return result;
    } catch (error) {
      console.error('Error in awardPoints:', error);
    }
  };

  // Update streak
  const updateStreak = async (streakType: string, activityDate?: Date) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc('update_user_streak', {
        p_user_id: user.id,
        p_streak_type: streakType,
        p_activity_date: activityDate ? activityDate.toISOString().split('T')[0] : undefined
      });

      if (error) {
        console.error('Error updating streak:', error);
        return;
      }

      // Reload streaks to get updated data
      await loadStreaks();
      
      return data;
    } catch (error) {
      console.error('Error in updateStreak:', error);
    }
  };

  // Calculate points for different activities
  const getPointsForActivity = (activityType: string, data?: any): number => {
    switch (activityType) {
      case 'meal_tracked_with_photo': return 5;
      case 'meal_tracked': return 3;
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
      case 'Rookie': return 'hsl(var(--muted))';
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
    getPointsForActivity,
    getStreakMultiplier,
    getLevelColor,
    refreshData: () => {
      loadUserPoints();
      loadDepartmentProgress();
      loadStreaks();
    }
  };
};