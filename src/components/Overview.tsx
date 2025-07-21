
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Target, 
  TrendingUp, 
  Scale,
  Activity,
  BarChart3,
  Calendar,
  TrendingDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { calculateWeightPrognosis, type WeightPrognosisData } from "@/utils/weightPrognosis";

interface OverviewProps {
  todaysTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  dailyGoals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null;
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  weightHistory: any[];
}

export const Overview = ({ todaysTotals, dailyGoals, averages, weightHistory }: OverviewProps) => {
  const [profileData, setProfileData] = useState<any>(null);
  const [fullDailyGoals, setFullDailyGoals] = useState<any>(null);
  const [averageCalorieIntake, setAverageCalorieIntake] = useState<number>(0);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadProfileData();
      loadFullDailyGoals();
      calculateAverageCalorieIntake();
    }
  }, [user]);

  const loadProfileData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setProfileData(data);
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  const loadFullDailyGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setFullDailyGoals(data);
    } catch (error) {
      console.error('Error loading daily goals:', error);
    }
  };

  const calculateAverageCalorieIntake = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('meals')
        .select('calories, created_at')
        .eq('user_id', user?.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (error) throw error;

      if (data && data.length > 0) {
        const totalCalories = data.reduce((sum, meal) => sum + (meal.calories || 0), 0);
        const averageDaily = totalCalories / 7;
        setAverageCalorieIntake(averageDaily);
      }
    } catch (error) {
      console.error('Error calculating average calorie intake:', error);
    }
  };

  if (!dailyGoals) return null;

  const calorieProgress = (todaysTotals.calories / dailyGoals.calories) * 100;
  const proteinProgress = (todaysTotals.protein / dailyGoals.protein) * 100;
  const carbsProgress = (todaysTotals.carbs / dailyGoals.carbs) * 100;
  const fatsProgress = (todaysTotals.fats / dailyGoals.fats) * 100;

  // Calculate weight prognosis
  const weightPrognosis = calculateWeightPrognosis({
    profileData,
    dailyGoals: fullDailyGoals,
    averageCalorieIntake
  });

  return (
    <Card className="glass-card shadow-lg border border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">Überblick</div>
            <div className="text-sm text-muted-foreground font-normal">Deine wichtigsten Kennzahlen</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Makros Heute */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Makros heute
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {/* Kalorien */}
            <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Kalorien</span>
                <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400 text-xs">
                  {Math.round(calorieProgress)}%
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {todaysTotals.calories} / {dailyGoals.calories}
                </div>
                <Progress 
                  value={Math.min(100, calorieProgress)} 
                  className="h-2 bg-blue-100 dark:bg-blue-800/50" 
                />
              </div>
            </div>

            {/* Protein */}
            <div className="space-y-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Protein</span>
                <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400 text-xs">
                  {Math.round(proteinProgress)}%
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {todaysTotals.protein}g / {dailyGoals.protein}g
                </div>
                <Progress 
                  value={Math.min(100, proteinProgress)} 
                  className="h-2 bg-green-100 dark:bg-green-800/50" 
                />
              </div>
            </div>

            {/* Carbs */}
            <div className="space-y-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Carbs</span>
                <Badge variant="outline" className="border-orange-500 text-orange-600 dark:text-orange-400 text-xs">
                  {Math.round(carbsProgress)}%
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {todaysTotals.carbs}g / {dailyGoals.carbs}g
                </div>
                <Progress 
                  value={Math.min(100, carbsProgress)} 
                  className="h-2 bg-orange-100 dark:bg-orange-800/50" 
                />
              </div>
            </div>

            {/* Fats */}
            <div className="space-y-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Fette</span>
                <Badge variant="outline" className="border-purple-500 text-purple-600 dark:text-purple-400 text-xs">
                  {Math.round(fatsProgress)}%
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {todaysTotals.fats}g / {dailyGoals.fats}g
                </div>
                <Progress 
                  value={Math.min(100, fatsProgress)} 
                  className="h-2 bg-purple-100 dark:bg-purple-800/50" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Durchschnitte */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            7-Tage Durchschnitt
          </h4>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Kalorien</div>
              <div className="text-sm font-bold">{averages.calories}</div>
              <div className="text-xs text-muted-foreground">vs {todaysTotals.calories} heute</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Protein</div>
              <div className="text-sm font-bold">{averages.protein}g</div>
              <div className="text-xs text-muted-foreground">vs {todaysTotals.protein}g heute</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Carbs</div>
              <div className="text-sm font-bold">{averages.carbs}g</div>
              <div className="text-xs text-muted-foreground">vs {todaysTotals.carbs}g heute</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Fette</div>
              <div className="text-sm font-bold">{averages.fats}g</div>
              <div className="text-xs text-muted-foreground">vs {todaysTotals.fats}g heute</div>
            </div>
          </div>
        </div>

        {/* Gewichtstrend */}
        {weightHistory && weightHistory.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              Gewichtstrend
            </h4>
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg border border-emerald-200 dark:border-emerald-700/30">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Aktuelles Gewicht</div>
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                    {weightHistory[0]?.weight}kg
                  </div>
                </div>
                {weightHistory.length > 1 && (
                  <div>
                    <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Veränderung</div>
                    <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                      {(weightHistory[0]?.weight - weightHistory[1]?.weight) > 0 ? '+' : ''}
                      {(weightHistory[0]?.weight - weightHistory[1]?.weight).toFixed(1)}kg
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Gewichtsprognose */}
        {weightPrognosis && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Gewichtsprognose
            </h4>
            
            {weightPrognosis.type === 'warning' ? (
              <div className="space-y-3">
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700/30">
                  <div className="flex items-start gap-2">
                    <span className="text-orange-600 text-sm">⚠️</span>
                    <div className="flex-1">
                      <div className="font-medium text-orange-700 dark:text-orange-300 text-sm mb-1">
                        {weightPrognosis.message}
                      </div>
                      <div className="text-xs text-orange-600 dark:text-orange-400">
                        💡 {weightPrognosis.suggestion}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : weightPrognosis.type === 'maintain' ? (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700/30">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 text-sm">✅</span>
                  <div className="flex-1">
                    <div className="font-medium text-green-700 dark:text-green-300 text-sm mb-1">
                      {weightPrognosis.message}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      💡 {weightPrognosis.suggestion}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Prominent Target Date Display */}
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-700/30 shadow-sm">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                      Zielgewicht erreicht am
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-blue-800 dark:text-blue-200 mb-2">
                    {weightPrognosis.targetDate}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    Das sind noch ca. {weightPrognosis.monthsToTarget && weightPrognosis.monthsToTarget > 1 
                      ? `${weightPrognosis.monthsToTarget} Monate` 
                      : `${weightPrognosis.daysToTarget ? Math.ceil(weightPrognosis.daysToTarget / 7) : 0} Wochen`
                    }
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold text-primary mb-1">
                      {weightPrognosis.weightDifference?.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">kg verbleibend</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className={`text-lg font-bold mb-1 ${
                      weightPrognosis.dailyCalorieBalance && weightPrognosis.dailyCalorieBalance < 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-500 dark:text-red-400'
                    }`}>
                      {weightPrognosis.dailyCalorieBalance && weightPrognosis.dailyCalorieBalance > 0 ? '+' : ''}{weightPrognosis.dailyCalorieBalance ? Math.round(weightPrognosis.dailyCalorieBalance) : 0}
                    </div>
                    <div className={`text-xs ${
                      weightPrognosis.dailyCalorieBalance && weightPrognosis.dailyCalorieBalance < 0 
                        ? 'text-green-600/80 dark:text-green-400/80' 
                        : 'text-red-500/80 dark:text-red-400/80'
                    }`}>
                      kcal {weightPrognosis.dailyCalorieBalance && weightPrognosis.dailyCalorieBalance > 0 ? 'Überschuss' : 'Defizit'}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/50 dark:border-blue-700/20">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    {weightPrognosis.type === 'loss' ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : (
                      <TrendingUp className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {weightPrognosis.type === 'loss' ? 'Abnehmen' : 'Zunehmen'} - auf Kurs zum Ziel
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
