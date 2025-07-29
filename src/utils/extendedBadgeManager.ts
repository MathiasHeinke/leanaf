import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck, BadgeManager } from "./badgeManager";

export class ExtendedBadgeManager extends BadgeManager {
  
  async checkAndAwardAllBadges(): Promise<BadgeCheck[]> {
    const actuallyNewBadges: BadgeCheck[] = [];

    try {
      console.log('🔄 Starting extended badge check for user:', this.userId);
      
      // First, check base badges from parent class
      const baseBadges = await super.checkAndAwardBadges();
      actuallyNewBadges.push(...baseBadges);

      // Extended badge checks - collect all potential badges first
      const potentialBadges: BadgeCheck[] = [];
      
      const levelBadge = await this.checkLevelAchievementBadges();
      if (levelBadge) potentialBadges.push(levelBadge);

      const streakBadges = await this.checkExtendedStreakBadges();
      potentialBadges.push(...streakBadges);

      const commitmentBadges = await this.checkCommitmentBadges();
      potentialBadges.push(...commitmentBadges);

      const specialBadges = await this.checkSpecialAchievementBadges();
      potentialBadges.push(...specialBadges);

      // Award extended badges atomically and track which ones are actually new
      for (const badge of potentialBadges) {
        const awardedBadge = await this.awardBadge(badge);
        if (awardedBadge) {
          actuallyNewBadges.push(awardedBadge);
          console.log('✅ Awarded new extended badge:', badge.badge_name);
        }
      }

      console.log('🎯 Total new badges awarded (including base):', actuallyNewBadges.length);
      return actuallyNewBadges;
    } catch (error) {
      console.error('❌ Error in extended badge checking:', error);
      return [];
    }
  }

  private async checkLevelAchievementBadges(): Promise<BadgeCheck | null> {
    // Check current level and award level-specific badges
    const { data: userPoints } = await supabase
      .from('user_points')
      .select('current_level, level_name')
      .eq('user_id', this.userId)
      .single();

    if (!userPoints) return null;

    // Check if level badge already awarded
    const { data: existingBadge } = await supabase
      .from('badges')
      .select('id')
      .eq('user_id', this.userId)
      .eq('badge_type', 'level_achievement')
      .eq('metadata->>level', userPoints.current_level.toString())
      .maybeSingle();

    if (existingBadge) return null;

    const levelBadges: Record<number, { emoji: string; name: string; description: string }> = {
      2: { emoji: '🥉', name: 'Bronze-Level 🥉', description: 'Du kommst in Schwung!' },
      3: { emoji: '🥈', name: 'Silber-Level 🥈', description: 'Starke Fortschritte!' },
      4: { emoji: '🥇', name: 'Gold-Level 🥇', description: 'Du bist on fire!' },
      5: { emoji: '💎', name: 'Platin-Level 💎', description: 'Elite-Performance!' },
      6: { emoji: '💍', name: 'Diamond-Level 💍', description: 'Absoluter Champion!' },
      7: { emoji: '🎖️', name: 'Master-Level 🎖️', description: 'Fitness-Master erreicht!' },
      8: { emoji: '👑', name: 'Grandmaster 👑', description: 'Legende geboren!' }
    };

    const levelInfo = levelBadges[userPoints.current_level];
    if (levelInfo) {
      return {
        badge_type: 'level_achievement',
        badge_name: levelInfo.name,
        badge_description: levelInfo.description,
        metadata: { level: userPoints.current_level, level_name: userPoints.level_name }
      };
    }

    return null;
  }

  private async checkExtendedStreakBadges(): Promise<BadgeCheck[]> {
    const badges: BadgeCheck[] = [];
    
    // Check various streak types
    const streakTypes = ['workout', 'meal_tracking', 'measurement'];
    
    for (const streakType of streakTypes) {
      const { data: streak } = await supabase
        .from('user_streaks')
        .select('current_streak, longest_streak')
        .eq('user_id', this.userId)
        .eq('streak_type', streakType)
        .maybeSingle();

      if (!streak) continue;

      const streakMilestones = [
        { days: 3, name: 'Erste Flamme 🔥', description: '3-Tage-Streak gestartet!' },
        { days: 7, name: 'Woche stark 🌟', description: '7-Tage-Streak erreicht!' },
        { days: 14, name: 'Halbmonats-Champion ⚡', description: '14-Tage-Streak gemeistert!' },
        { days: 30, name: 'Monats-Legende 🚀', description: '30-Tage-Streak - unglaublich!' },
        { days: 100, name: 'Jahrhundert-Streak 👑', description: '100 Tage - absolute Legende!' }
      ];

      for (const milestone of streakMilestones) {
        if (streak.current_streak >= milestone.days || streak.longest_streak >= milestone.days) {
          // Check if badge already exists
          const { data: existingBadge } = await supabase
            .from('badges')
            .select('id')
            .eq('user_id', this.userId)
            .eq('badge_type', 'streak_badge')
            .eq('metadata->>streak_type', streakType)
            .eq('metadata->>milestone', milestone.days.toString())
            .maybeSingle();

          if (!existingBadge) {
            badges.push({
              badge_type: 'streak_badge',
              badge_name: milestone.name,
              badge_description: `${milestone.description} (${streakType})`,
              metadata: { 
                streak_type: streakType, 
                milestone: milestone.days,
                current_streak: streak.current_streak,
                longest_streak: streak.longest_streak
              }
            });
          }
        }
      }
    }

    return badges;
  }

  private async checkCommitmentBadges(): Promise<BadgeCheck[]> {
    const badges: BadgeCheck[] = [];
    
    // Get user registration date from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('user_id', this.userId)
      .single();

    if (!profile) return badges;

    const registrationDate = new Date(profile.created_at);
    const now = new Date();
    const daysActive = Math.floor((now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));

    const commitmentMilestones = [
      { days: 30, name: 'Erster Monat 📅', description: 'Ersten Monat geschafft!' },
      { days: 90, name: 'Quartal-Veteran 🗓️', description: '3 Monate dabei - stark!' },
      { days: 180, name: 'Halbjahres-Held 📊', description: '6 Monate durchgehalten!' },
      { days: 365, name: 'Jahres-Champion 🎂', description: '1 Jahr dabei - Respekt!' }
    ];

    for (const milestone of commitmentMilestones) {
      if (daysActive >= milestone.days) {
        // Check if badge already exists
        const { data: existingBadge } = await supabase
          .from('badges')
          .select('id')
          .eq('user_id', this.userId)
          .eq('badge_type', 'commitment_badge')
          .eq('metadata->>milestone', milestone.days.toString())
          .maybeSingle();

        if (!existingBadge) {
          badges.push({
            badge_type: 'commitment_badge',
            badge_name: milestone.name,
            badge_description: milestone.description,
            metadata: { 
              milestone: milestone.days,
              days_active: daysActive,
              registration_date: profile.created_at
            }
          });
        }
      }
    }

    return badges;
  }

  private async checkSpecialAchievementBadges(): Promise<BadgeCheck[]> {
    const badges: BadgeCheck[] = [];

    // Perfect Week Badge (all goals met for 7 days)
    const perfectWeekBadge = await this.checkPerfectWeekBadge();
    if (perfectWeekBadge) badges.push(perfectWeekBadge);

    // Photo Documentar Badge (10+ meals with photos)
    const photoBadge = await this.checkPhotoDocumentarBadge();
    if (photoBadge) badges.push(photoBadge);

    // Weight Goal Achievement Badge
    const weightGoalBadge = await this.checkWeightGoalBadge();
    if (weightGoalBadge) badges.push(weightGoalBadge);

    // BMI Improvement Badge
    const bmiBadge = await this.checkBMIImprovementBadge();
    if (bmiBadge) badges.push(bmiBadge);

    return badges;
  }

  private async checkPerfectWeekBadge(): Promise<BadgeCheck | null> {
    // Check last 7 days for perfect adherence (workouts, meals, measurements)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [workoutData, mealData] = await Promise.all([
      supabase
        .from('workouts')
        .select('date, did_workout')
        .eq('user_id', this.userId)
        .eq('did_workout', true)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0]),
      
      supabase
        .from('meals')
        .select('created_at')
        .eq('user_id', this.userId)
        .gte('created_at', sevenDaysAgo.toISOString())
    ]);

    const workoutDays = new Set(workoutData.data?.map(w => w.date) || []);
    const mealDays = new Set(mealData.data?.map(m => m.created_at.split('T')[0]) || []);

    // Perfect week: at least 4 workout days and 6 meal tracking days
    if (workoutDays.size >= 4 && mealDays.size >= 6) {
      const { data: existingBadge } = await supabase
        .from('badges')
        .select('id, earned_at')
        .eq('user_id', this.userId)
        .eq('badge_type', 'special_achievement')
        .eq('badge_name', 'Perfekte Woche ✨')
        .order('earned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Award only once per week to avoid spam
      if (!existingBadge) {
        return {
          badge_type: 'special_achievement',
          badge_name: 'Perfekte Woche ✨',
          badge_description: 'Alle Ziele 7 Tage erfüllt!',
          metadata: { 
            workout_days: workoutDays.size, 
            meal_days: mealDays.size,
            week: this.getWeekOfYear(new Date())
          }
        };
      }
    }

    return null;
  }

  private async checkPhotoDocumentarBadge(): Promise<BadgeCheck | null> {
    // Count meals with images
    const { data: mealsWithImages } = await supabase
      .from('meals')
      .select('id')
      .eq('user_id', this.userId);

    if (!mealsWithImages) return null;

    const { data: mealImages, count } = await supabase
      .from('meal_images')
      .select('meal_id', { count: 'exact' })
      .eq('user_id', this.userId)
      .in('meal_id', mealsWithImages.map(m => m.id));

    if ((count || 0) >= 10) {
      const { data: existingBadge } = await supabase
        .from('badges')
        .select('id')
        .eq('user_id', this.userId)
        .eq('badge_type', 'special_achievement')
        .eq('badge_name', 'Foto-Dokumentar 📸')
        .maybeSingle();

      if (!existingBadge) {
        return {
          badge_type: 'special_achievement',
          badge_name: 'Foto-Dokumentar 📸',
          badge_description: '10+ Mahlzeiten fotografiert!',
          metadata: { photo_count: count }
        };
      }
    }

    return null;
  }

  private async checkWeightGoalBadge(): Promise<BadgeCheck | null> {
    // Check if user reached their target weight
    const [profileData, latestWeight] = await Promise.all([
      supabase
        .from('profiles')
        .select('target_weight, start_weight, goal')
        .eq('user_id', this.userId)
        .single(),
      
      supabase
        .from('weight_history')
        .select('weight')
        .eq('user_id', this.userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    if (!profileData.data?.target_weight || !latestWeight?.data?.weight) return null;

    const { target_weight, start_weight, goal } = profileData.data;
    const currentWeight = latestWeight.data.weight;

    let goalReached = false;
    if (goal === 'lose_weight' && currentWeight <= target_weight) {
      goalReached = true;
    } else if (goal === 'gain_weight' && currentWeight >= target_weight) {
      goalReached = true;
    }

    if (goalReached) {
      const { data: existingBadge } = await supabase
        .from('badges')
        .select('id')
        .eq('user_id', this.userId)
        .eq('badge_type', 'special_achievement')
        .eq('badge_name', 'Gewichtsziel erreicht 🎯')
        .maybeSingle();

      if (!existingBadge) {
        const weightChange = Math.abs((start_weight || currentWeight) - currentWeight);
        return {
          badge_type: 'special_achievement',
          badge_name: 'Gewichtsziel erreicht 🎯',
          badge_description: 'Ziel im Visier und getroffen!',
          metadata: { 
            target_weight, 
            current_weight: currentWeight,
            weight_change: weightChange,
            goal
          }
        };
      }
    }

    return null;
  }

  private async checkBMIImprovementBadge(): Promise<BadgeCheck | null> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('start_bmi, current_bmi')
      .eq('user_id', this.userId)
      .single();

    if (!profile?.start_bmi || !profile?.current_bmi) return null;

    const bmiImprovement = profile.start_bmi - profile.current_bmi;
    
    if (bmiImprovement >= 2) { // BMI improved by 2+ points
      const { data: existingBadge } = await supabase
        .from('badges')
        .select('id')
        .eq('user_id', this.userId)
        .eq('badge_type', 'special_achievement')
        .eq('badge_name', 'BMI-Verbesserung 📈')
        .maybeSingle();

      if (!existingBadge) {
        return {
          badge_type: 'special_achievement',
          badge_name: 'BMI-Verbesserung 📈',
          badge_description: 'Gesundheits-Boost erreicht!',
          metadata: { 
            start_bmi: profile.start_bmi,
            current_bmi: profile.current_bmi,
            improvement: bmiImprovement
          }
        };
      }
    }

    return null;
  }

  private wasAwardedThisWeek(earnedAt: string): boolean {
    const earnedDate = new Date(earnedAt);
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    return earnedDate >= weekStart;
  }
}
