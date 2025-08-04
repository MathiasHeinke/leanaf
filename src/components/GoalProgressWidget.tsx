import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Trophy, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Goal {
  id: string;
  exercise: string;
  targetWeight: number;
  currentWeight: number;
  targetDate: string;
  category: string;
}

export const GoalProgressWidget: React.FC = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [goalType, setGoalType] = useState<'weight' | 'body_fat' | 'both'>('weight');
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('goal_type, target_body_fat_percentage, target_weight, target_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      setUserProfile(profile);
      setGoalType((profile?.goal_type as 'weight' | 'body_fat' | 'both') || 'weight');
      
      // Load appropriate goals based on goal type
      if (profile?.goal_type === 'body_fat') {
        loadBodyFatProgress(profile);
      } else if (profile?.goal_type === 'both') {
        // For 'both', we'll show strength goals for now
        loadGoalProgress();
      } else {
        loadGoalProgress();
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      loadGoalProgress(); // Fallback to strength goals
    }
  };

  const loadBodyFatProgress = async (profile: any) => {
    if (!user || !profile?.target_body_fat_percentage) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get most recent body fat percentage from weight_history
      const { data: recentWeight, error } = await supabase
        .from('weight_history')
        .select('body_fat_percentage, created_at')
        .eq('user_id', user.id)
        .not('body_fat_percentage', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const currentBodyFat = recentWeight?.body_fat_percentage || 0;
      const targetBodyFat = profile.target_body_fat_percentage;
      
      // For body fat, lower is better, so progress calculation is inverted
      const progress = currentBodyFat > targetBodyFat 
        ? Math.max(0, Math.min(100, ((currentBodyFat - targetBodyFat) / (currentBodyFat * 0.3)) * 100))
        : 100;

      const bodyFatGoal: Goal = {
        id: 'body_fat',
        exercise: 'Körperfett-Reduktion',
        targetWeight: targetBodyFat,
        currentWeight: currentBodyFat,
        targetDate: profile.target_date || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'body_composition'
      };

      setGoals([bodyFatGoal]);
    } catch (error) {
      console.error('Error loading body fat progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGoalProgress = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get recent exercise data to calculate current maxes
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const { data: recentSets, error } = await supabase
        .from('exercise_sets')
        .select(`
          weight_kg,
          reps,
          exercises (
            name,
            category
          )
        `)
        .eq('user_id', user.id)
        .gte('created_at', threeMonthsAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Define common goals with smart targets
      const commonExercises = ['Bankdrücken', 'Kniebeugen', 'Kreuzheben', 'Schulterdrücken'];
      const goalData: Goal[] = [];

      commonExercises.forEach(exercise => {
        const exerciseSets = recentSets?.filter(set => 
          set.exercises?.name?.toLowerCase().includes(exercise.toLowerCase()) ||
          set.exercises?.name?.toLowerCase().includes(exercise.slice(0, 5).toLowerCase())
        ) || [];

        if (exerciseSets.length > 0) {
          // Calculate estimated 1RM using Epley formula
          const bestSet = exerciseSets.reduce((best, current) => {
            const currentEstimate = (current.weight_kg || 0) * (1 + (current.reps || 0) / 30);
            const bestEstimate = (best.weight_kg || 0) * (1 + (best.reps || 0) / 30);
            return currentEstimate > bestEstimate ? current : best;
          });

          const currentMax = Math.round((bestSet.weight_kg || 0) * (1 + (bestSet.reps || 0) / 30));
          
          // Set smart target (20-30% increase for strength goals)
          let targetWeight = currentMax;
          if (currentMax > 0) {
            if (exercise === 'Bankdrücken') {
              targetWeight = Math.max(100, Math.round(currentMax * 1.25 / 5) * 5);
            } else if (exercise === 'Kniebeugen') {
              targetWeight = Math.max(120, Math.round(currentMax * 1.3 / 5) * 5);
            } else if (exercise === 'Kreuzheben') {
              targetWeight = Math.max(140, Math.round(currentMax * 1.25 / 5) * 5);
            } else {
              targetWeight = Math.max(80, Math.round(currentMax * 1.2 / 2.5) * 2.5);
            }
          } else {
            // Default targets for beginners
            if (exercise === 'Bankdrücken') targetWeight = 100;
            else if (exercise === 'Kniebeugen') targetWeight = 120;
            else if (exercise === 'Kreuzheben') targetWeight = 140;
            else targetWeight = 80;
          }

          // Set target date (6 months from now)
          const targetDate = new Date();
          targetDate.setMonth(targetDate.getMonth() + 6);

          goalData.push({
            id: exercise,
            exercise,
            targetWeight,
            currentWeight: currentMax,
            targetDate: targetDate.toISOString().split('T')[0],
            category: bestSet.exercises?.category || 'strength'
          });
        }
      });

      setGoals(goalData.slice(0, 3)); // Show top 3 goals
    } catch (error) {
      console.error('Error loading goal progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.min(100, Math.max(0, (current / target) * 100));
  };

  const getDaysUntilTarget = (targetDate: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'text-green-600 dark:text-green-400';
    if (progress >= 70) return 'text-blue-600 dark:text-blue-400';
    if (progress >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  if (loading) {
    return (
      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-purple-700 dark:text-purple-400">
            <Target className="h-4 w-4" />
            Kraftziele
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Analysiere Fortschritt...</div>
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-purple-700 dark:text-purple-400">
            <Target className="h-4 w-4" />
            Kraftziele
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-2">
            Trainiere regelmäßig, um automatische Kraftziele zu erhalten.
          </div>
          <Badge variant="outline" className="text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            Starte dein Training
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-purple-700 dark:text-purple-400">
          <Target className="h-4 w-4" />
          Kraftziele
          <Badge variant="secondary" className="ml-auto">
            <Trophy className="h-3 w-3 mr-1" />
            {goals.length} Ziele
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal) => {
          const progress = goal.category === 'body_composition' 
            ? (goal.currentWeight > goal.targetWeight ? Math.max(0, 100 - ((goal.currentWeight - goal.targetWeight) / goal.currentWeight * 100)) : 100)
            : calculateProgress(goal.currentWeight, goal.targetWeight);
          const daysLeft = getDaysUntilTarget(goal.targetDate);
          const isBodyFat = goal.category === 'body_composition';
          
          return (
            <div key={goal.id} className="bg-background/50 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">{goal.exercise}</h4>
                <Badge 
                  variant={progress >= 90 ? 'default' : 'secondary'} 
                  className="text-xs"
                >
                  {Math.round(progress)}%
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Aktuell: {goal.currentWeight}{isBodyFat ? '%' : 'kg'}
                  </span>
                  <span className={`font-medium ${getProgressColor(progress)}`}>
                    Ziel: {goal.targetWeight}{isBodyFat ? '%' : 'kg'}
                  </span>
                </div>
                
                <Progress 
                  value={progress} 
                  className="h-2"
                />
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {isBodyFat 
                      ? `Noch ${Math.abs(goal.currentWeight - goal.targetWeight).toFixed(1)}% zu reduzieren`
                      : `Noch ${goal.targetWeight - goal.currentWeight}kg`
                    }
                  </span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {daysLeft > 0 ? `${daysLeft} Tage` : 'Überfällig'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        <div className="text-xs text-muted-foreground text-center">
          🎯 Ziele basieren auf deinen aktuellen Leistungen
        </div>
      </CardContent>
    </Card>
  );
};