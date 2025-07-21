import { supabase } from "@/integrations/supabase/client";

export interface BadgeCheck {
  badge_type: string;
  badge_name: string;
  badge_description: string;
  metadata?: any;
}

export class BadgeManager {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async checkAndAwardBadges(): Promise<BadgeCheck[]> {
    const newBadges: BadgeCheck[] = [];

    try {
      // Check all badge types
      const measurementBadge = await this.checkMeasurementConsistency();
      if (measurementBadge) newBadges.push(measurementBadge);

      const workoutBadge = await this.checkWorkoutStreak();
      if (workoutBadge) newBadges.push(workoutBadge);

      const deficitBadge = await this.checkDeficitConsistency();
      if (deficitBadge) newBadges.push(deficitBadge);

      const firstMeasurementBadge = await this.checkFirstMeasurement();
      if (firstMeasurementBadge) newBadges.push(firstMeasurementBadge);

      const weeklyGoalBadge = await this.checkWeeklyGoal();
      if (weeklyGoalBadge) newBadges.push(weeklyGoalBadge);

      // Award new badges
      for (const badge of newBadges) {
        await this.awardBadge(badge);
      }

      return newBadges;
    } catch (error) {
      console.error('Error checking badges:', error);
      return [];
    }
  }

  private async checkMeasurementConsistency(): Promise<BadgeCheck | null> {
    // Check if user has measured for 4 consecutive weeks
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const { data: measurements } = await supabase
      .from('body_measurements')
      .select('date')
      .eq('user_id', this.userId)
      .gte('date', fourWeeksAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (!measurements || measurements.length < 4) return null;

    // Check if already awarded
    const { data: existingBadge } = await supabase
      .from('badges')
      .select('id')
      .eq('user_id', this.userId)
      .eq('badge_type', 'measurement_consistency')
      .maybeSingle();

    if (existingBadge) return null;

    // Check for weekly consistency (at least one measurement per week)
    const weeks = new Set();
    measurements.forEach(m => {
      const week = this.getWeekOfYear(new Date(m.date));
      weeks.add(week);
    });

    if (weeks.size >= 4) {
      return {
        badge_type: 'measurement_consistency',
        badge_name: 'Mess-Meister 📏',
        badge_description: '4 Wochen lang konsequent gemessen!',
        metadata: { weeks_count: weeks.size }
      };
    }

    return null;
  }

  private async checkWorkoutStreak(): Promise<BadgeCheck | null> {
    // Check for 7-day workout streak
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: workouts } = await supabase
      .from('workouts')
      .select('date, did_workout')
      .eq('user_id', this.userId)
      .eq('did_workout', true)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (!workouts || workouts.length < 5) return null; // At least 5 workouts in 7 days

    // Check if already awarded this week
    const thisWeek = this.getWeekOfYear(new Date());
    const { data: existingBadge } = await supabase
      .from('badges')
      .select('id, metadata')
      .eq('user_id', this.userId)
      .eq('badge_type', 'workout_streak')
      .order('earned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

      if (existingBadge?.metadata && typeof existingBadge.metadata === 'object' && 'week' in existingBadge.metadata && existingBadge.metadata.week === thisWeek) return null;

    return {
      badge_type: 'workout_streak',
      badge_name: 'Workout-Warrior 💪',
      badge_description: '5+ Trainings in 7 Tagen!',
      metadata: { 
        workout_count: workouts.length,
        week: thisWeek
      }
    };
  }

  private async checkDeficitConsistency(): Promise<BadgeCheck | null> {
    // Check if user maintained calorie deficit for 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get user's daily goals
    const { data: goals } = await supabase
      .from('daily_goals')
      .select('calories')
      .eq('user_id', this.userId)
      .maybeSingle();

    if (!goals) return null;

    // Check meals for the last 7 days
    const { data: meals } = await supabase
      .from('meals')
      .select('created_at, calories')
      .eq('user_id', this.userId)
      .gte('created_at', sevenDaysAgo.toISOString());

    if (!meals) return null;

    // Group by date and calculate daily totals
    const dailyTotals = new Map<string, number>();
    meals.forEach(meal => {
      const date = meal.created_at.split('T')[0];
      const current = dailyTotals.get(date) || 0;
      dailyTotals.set(date, current + (meal.calories || 0));
    });

    // Count days with deficit (assuming deficit goal)
    const deficitDays = Array.from(dailyTotals.values()).filter(
      total => total < goals.calories
    ).length;

    if (deficitDays >= 5) {
      // Check if already awarded this week
      const thisWeek = this.getWeekOfYear(new Date());
      const { data: existingBadge } = await supabase
        .from('badges')
        .select('id, metadata')
        .eq('user_id', this.userId)
        .eq('badge_type', 'deficit_consistency')
        .order('earned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingBadge?.metadata && typeof existingBadge.metadata === 'object' && 'week' in existingBadge.metadata && existingBadge.metadata.week === thisWeek) return null;

      return {
        badge_type: 'deficit_consistency',
        badge_name: 'Defizit-Champion 🎯',
        badge_description: '5+ Tage im Kaloriendefizit!',
        metadata: { 
          deficit_days: deficitDays,
          week: thisWeek
        }
      };
    }

    return null;
  }

  private async checkFirstMeasurement(): Promise<BadgeCheck | null> {
    // Check if user has made their first measurement
    const { data: measurements } = await supabase
      .from('body_measurements')
      .select('id')
      .eq('user_id', this.userId)
      .limit(1);

    const { data: existingBadge } = await supabase
      .from('badges')
      .select('id')
      .eq('user_id', this.userId)
      .eq('badge_type', 'first_measurement')
      .maybeSingle();

    if (measurements && measurements.length > 0 && !existingBadge) {
      return {
        badge_type: 'first_measurement',
        badge_name: 'Erste Messung 🎉',
        badge_description: 'Deine Transformation hat begonnen!',
        metadata: { milestone: 'first_step' }
      };
    }

    return null;
  }

  private async checkWeeklyGoal(): Promise<BadgeCheck | null> {
    // Check if user hit their weekly training goal (2x per week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: workouts } = await supabase
      .from('workouts')
      .select('date')
      .eq('user_id', this.userId)
      .eq('did_workout', true)
      .gte('date', oneWeekAgo.toISOString().split('T')[0]);

    if (workouts && workouts.length >= 2) {
      const thisWeek = this.getWeekOfYear(new Date());
      const { data: existingBadge } = await supabase
        .from('badges')
        .select('id, metadata')
        .eq('user_id', this.userId)
        .eq('badge_type', 'weekly_goal')
        .order('earned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingBadge?.metadata && typeof existingBadge.metadata === 'object' && 'week' in existingBadge.metadata && existingBadge.metadata.week === thisWeek) return null;

      return {
        badge_type: 'weekly_goal',
        badge_name: 'Wochenziel 🏆',
        badge_description: '2+ Trainings diese Woche!',
        metadata: { 
          workout_count: workouts.length,
          week: thisWeek
        }
      };
    }

    return null;
  }

  private async awardBadge(badge: BadgeCheck): Promise<void> {
    try {
      await supabase
        .from('badges')
        .insert({
          user_id: this.userId,
          badge_type: badge.badge_type,
          badge_name: badge.badge_name,
          badge_description: badge.badge_description,
          metadata: badge.metadata || {}
        });
    } catch (error) {
      console.error('Error awarding badge:', error);
    }
  }

  private getWeekOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }
}