import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Brain, 
  TrendingUp, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Zap, 
  ChevronDown, 
  ChevronUp,
  Activity,
  Calendar,
  Scale,
  Moon,
  Utensils,
  Heart,
  Target
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDataRefresh } from "@/hooks/useDataRefresh";
import { supabase } from "@/integrations/supabase/client";
import { PremiumGate } from "@/components/PremiumGate";

interface CoachInsight {
  type: 'success' | 'warning' | 'info' | 'motivation' | 'correlation' | 'habit' | 'trend';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  icon: string;
  data?: Record<string, any>;
  correlation?: number;
  pattern?: string;
}

interface UserData {
  meals: any[];
  sleepData: any[];
  weightData: any[];
  workoutData: any[];
  supplementData: any[];
  fluidData: any[];
  measurementData: any[];
}

export const SmartCoachInsights = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<CoachInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (user) {
      generateInsights();
    }
  }, [user]);

  // Auto-refresh when data changes
  useDataRefresh(() => {
    if (user) {
      generateInsights();
    }
  });

  const generateInsights = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const userData = await loadAllUserData();
      const newInsights = await analyzeAllData(userData);
      setInsights(newInsights);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUserData = async (): Promise<UserData> => {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const dateFilter = last30Days.toISOString().split('T')[0];

    // Load all data types in parallel
    const [meals, sleepData, weightData, workoutData, supplementData, fluidData, measurementData] = await Promise.all([
      // Meals
      supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', last30Days.toISOString())
        .order('created_at', { ascending: false }),
      
      // Sleep data (using meals table for now as sleep_tracking doesn't exist)
      supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', last30Days.toISOString())
        .limit(0), // Empty result set
      
      // Weight data
      supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', dateFilter)
        .order('date', { ascending: false }),
      
      // Workout data
      supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', dateFilter)
        .order('date', { ascending: false }),
      
      // Supplement data (using meals table for now as supplement_tracking doesn't exist)
      supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', last30Days.toISOString())
        .limit(0), // Empty result set
      
      // Fluid data (using meals table for now as fluid_tracking doesn't exist)
      supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', last30Days.toISOString())
        .limit(0), // Empty result set
      
      // Body measurements
      supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', dateFilter)
        .order('date', { ascending: false })
    ]);

    return {
      meals: meals.data || [],
      sleepData: sleepData.data || [],
      weightData: weightData.data || [],
      workoutData: workoutData.data || [],
      supplementData: supplementData.data || [],
      fluidData: fluidData.data || [],
      measurementData: measurementData.data || []
    };
  };

  const analyzeAllData = async (userData: UserData): Promise<CoachInsight[]> => {
    const insights: CoachInsight[] = [];

    // Meal Pattern Analysis
    insights.push(...analyzeMealPatterns(userData.meals));
    
    // Sleep-Weight Correlation
    insights.push(...analyzeSleepWeightCorrelation(userData.sleepData, userData.weightData));
    
    // Workout-Sleep Correlation
    insights.push(...analyzeWorkoutSleepCorrelation(userData.workoutData, userData.sleepData));
    
    // Calorie vs Weight Trend
    insights.push(...analyzeCalorieWeightTrend(userData.meals, userData.weightData));
    
    // Weekly Habits Analysis
    insights.push(...analyzeWeeklyHabits(userData));
    
    // Supplement Effectiveness
    if (userData.supplementData.length > 0) {
      insights.push(...analyzeSupplementEffectiveness(userData));
    }
    
    // Overall Health Score
    insights.push(...calculateHealthScore(userData));

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const analyzeMealPatterns = (meals: any[]): CoachInsight[] => {
    const insights: CoachInsight[] = [];
    
    if (meals.length < 5) return insights;

    // Meal timing analysis
    const mealTimes = meals.map(meal => {
      const hour = new Date(meal.created_at).getHours();
      return hour;
    });

    const avgMealTime = mealTimes.reduce((sum, hour) => sum + hour, 0) / mealTimes.length;
    const lateMeals = mealTimes.filter(hour => hour > 21).length;
    const earlyMeals = mealTimes.filter(hour => hour < 7).length;

    if (lateMeals > meals.length * 0.3) {
      insights.push({
        type: 'warning',
        priority: 'high',
        title: 'Späte Mahlzeiten-Gewohnheit',
        message: `${Math.round((lateMeals/meals.length)*100)}% deiner Mahlzeiten sind nach 21 Uhr - das kann den Schlaf und Stoffwechsel beeinträchtigen`,
        icon: '🌙',
        pattern: 'late_eating'
      });
    }

    // Calorie consistency
    const dailyCalories = new Map<string, number>();
    meals.forEach(meal => {
      const date = meal.created_at.split('T')[0];
      const current = dailyCalories.get(date) || 0;
      dailyCalories.set(date, current + (meal.calories || 0));
    });

    const calorieValues = Array.from(dailyCalories.values());
    if (calorieValues.length >= 7) {
      const avg = calorieValues.reduce((sum, cal) => sum + cal, 0) / calorieValues.length;
      const variance = calorieValues.reduce((sum, cal) => sum + Math.pow(cal - avg, 2), 0) / calorieValues.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev < avg * 0.15) {
        insights.push({
          type: 'success',
          priority: 'medium',
          title: 'Konsistente Kalorienzufuhr',
          message: `Sehr stabile Kalorienzufuhr mit nur ${Math.round(stdDev)} kcal Abweichung - das hilft beim Erreichen deiner Ziele!`,
          icon: '🎯',
          data: { avgCalories: Math.round(avg), stdDev: Math.round(stdDev) }
        });
      } else if (stdDev > avg * 0.3) {
        insights.push({
          type: 'warning',
          priority: 'medium',
          title: 'Schwankende Kalorienzufuhr',
          message: `Deine täglichen Kalorien schwanken stark (±${Math.round(stdDev)} kcal). Mehr Konstanz könnte helfen.`,
          icon: '📊',
          data: { avgCalories: Math.round(avg), stdDev: Math.round(stdDev) }
        });
      }
    }

    return insights;
  };

  const analyzeSleepWeightCorrelation = (sleepData: any[], weightData: any[]): CoachInsight[] => {
    const insights: CoachInsight[] = [];
    
    if (sleepData.length < 7 || weightData.length < 7) return insights;

    // Find matching dates and calculate correlation
    const matchingData = [];
    sleepData.forEach(sleep => {
      const weight = weightData.find(w => w.date === sleep.date);
      if (weight && sleep.sleep_duration) {
        matchingData.push({
          sleep: sleep.sleep_duration,
          weight: weight.weight,
          date: sleep.date
        });
      }
    });

    if (matchingData.length >= 5) {
      const correlation = calculateCorrelation(
        matchingData.map(d => d.sleep),
        matchingData.map(d => d.weight)
      );

      if (Math.abs(correlation) > 0.3) {
        insights.push({
          type: correlation < -0.3 ? 'info' : 'warning',
          priority: Math.abs(correlation) > 0.5 ? 'high' : 'medium',
          title: 'Schlaf-Gewicht Zusammenhang',
          message: correlation < -0.3 
            ? `Mehr Schlaf korreliert mit niedrigerem Gewicht (r=${correlation.toFixed(2)}) - ausreichend Schlaf hilft beim Gewichtsmanagement!`
            : `Weniger Schlaf scheint mit Gewichtszunahme zusammenzuhängen (r=${correlation.toFixed(2)}) - priorisiere deinen Schlaf!`,
          icon: correlation < -0.3 ? '😴' : '⚠️',
          correlation,
          data: { sampleSize: matchingData.length }
        });
      }
    }

    return insights;
  };

  const analyzeWorkoutSleepCorrelation = (workoutData: any[], sleepData: any[]): CoachInsight[] => {
    const insights: CoachInsight[] = [];
    
    if (workoutData.length < 5 || sleepData.length < 5) return insights;

    // Check if workouts affect next day's sleep
    const correlationData = [];
    workoutData.forEach(workout => {
      const nextDay = new Date(workout.date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      
      const sleep = sleepData.find(s => s.date === nextDayStr);
      if (sleep && workout.intensity && sleep.sleep_quality) {
        correlationData.push({
          workoutIntensity: workout.intensity,
          sleepQuality: sleep.sleep_quality,
          workoutDate: workout.date
        });
      }
    });

    if (correlationData.length >= 4) {
      const correlation = calculateCorrelation(
        correlationData.map(d => d.workoutIntensity),
        correlationData.map(d => d.sleepQuality)
      );

      if (Math.abs(correlation) > 0.25) {
        insights.push({
          type: correlation > 0.25 ? 'success' : 'warning',
          priority: 'medium',
          title: 'Training-Schlaf Wirkung',
          message: correlation > 0.25
            ? `Intensiveres Training führt zu besserem Schlaf (r=${correlation.toFixed(2)}) - dein Körper liebt die Bewegung!`
            : `Intensives Training scheint deinen Schlaf zu beeinträchtigen (r=${correlation.toFixed(2)}) - vielleicht früher am Tag trainieren?`,
          icon: correlation > 0.25 ? '💪' : '🏃‍♂️',
          correlation
        });
      }
    }

    return insights;
  };

  const analyzeCalorieWeightTrend = (meals: any[], weightData: any[]): CoachInsight[] => {
    const insights: CoachInsight[] = [];
    
    if (meals.length < 10 || weightData.length < 5) return insights;

    // Group meals by date and calculate daily calories
    const dailyCalories = new Map<string, number>();
    meals.forEach(meal => {
      const date = meal.created_at.split('T')[0];
      const current = dailyCalories.get(date) || 0;
      dailyCalories.set(date, current + (meal.calories || 0));
    });

    // Calculate average weekly calories and weight trend
    const last2Weeks = new Date();
    last2Weeks.setDate(last2Weeks.getDate() - 14);
    
    const recentWeightData = weightData.filter(w => new Date(w.date) >= last2Weeks);
    const recentCalorieData = Array.from(dailyCalories.entries())
      .filter(([date]) => new Date(date) >= last2Weeks);

    if (recentWeightData.length >= 3 && recentCalorieData.length >= 7) {
      const avgCalories = recentCalorieData.reduce((sum, [, cal]) => sum + cal, 0) / recentCalorieData.length;
      const weightTrend = recentWeightData[0].weight - recentWeightData[recentWeightData.length - 1].weight;

      insights.push({
        type: 'info',
        priority: 'medium',
        title: 'Kalorien-Gewicht Balance',
        message: `Bei durchschnittlich ${Math.round(avgCalories)} kcal/Tag ${weightTrend > 0 ? 'hast du' : 'hast du'} ${Math.abs(weightTrend).toFixed(1)}kg ${weightTrend > 0 ? 'zugenommen' : 'abgenommen'}`,
        icon: weightTrend > 0 ? '📈' : '📉',
        data: { avgCalories: Math.round(avgCalories), weightChange: weightTrend.toFixed(1) }
      });
    }

    return insights;
  };

  const analyzeWeeklyHabits = (userData: UserData): CoachInsight[] => {
    const insights: CoachInsight[] = [];
    
    // Analyze weekly patterns across all data types
    const weeklyPatterns = {
      meals: new Array(7).fill(0),
      workouts: new Array(7).fill(0),
      sleep: new Array(7).fill(0),
      measurements: new Array(7).fill(0)
    };

    const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

    // Count activities by day of week
    userData.meals.forEach(meal => {
      const dayOfWeek = new Date(meal.created_at).getDay();
      weeklyPatterns.meals[dayOfWeek]++;
    });

    userData.workoutData.forEach(workout => {
      const dayOfWeek = new Date(workout.date).getDay();
      weeklyPatterns.workouts[dayOfWeek]++;
    });

    userData.sleepData.forEach(sleep => {
      const dayOfWeek = new Date(sleep.date).getDay();
      weeklyPatterns.sleep[dayOfWeek]++;
    });

    userData.measurementData.forEach(measurement => {
      const dayOfWeek = new Date(measurement.date).getDay();
      weeklyPatterns.measurements[dayOfWeek]++;
    });

    // Find most active days
    const totalActivity = weeklyPatterns.meals.map((meals, i) => 
      meals + weeklyPatterns.workouts[i] + weeklyPatterns.sleep[i] + weeklyPatterns.measurements[i]
    );

    const maxActivityDay = totalActivity.indexOf(Math.max(...totalActivity));
    const minActivityDay = totalActivity.indexOf(Math.min(...totalActivity));

    if (Math.max(...totalActivity) > 0) {
      insights.push({
        type: 'habit',
        priority: 'low',
        title: 'Wochenmuster entdeckt',
        message: `${dayNames[maxActivityDay]} ist dein aktivster Tag beim Tracking, ${dayNames[minActivityDay]} der ruhigste. Nutze diese Routine!`,
        icon: '📅',
        pattern: `${dayNames[maxActivityDay]}_peak`,
        data: { peakDay: dayNames[maxActivityDay], lowDay: dayNames[minActivityDay] }
      });
    }

    return insights;
  };

  const analyzeSupplementEffectiveness = (userData: UserData): CoachInsight[] => {
    const insights: CoachInsight[] = [];
    
    // Analyze supplement timing vs sleep quality
    const supplementSleepData = [];
    userData.supplementData.forEach(supplement => {
      const sleep = userData.sleepData.find(s => s.date === supplement.date);
      if (sleep && sleep.sleep_quality) {
        supplementSleepData.push({
          hasSupplement: true,
          sleepQuality: sleep.sleep_quality
        });
      }
    });

    // Compare with days without supplements
    const noSupplementDays = userData.sleepData.filter(sleep => 
      !userData.supplementData.some(supp => supp.date === sleep.date) && sleep.sleep_quality
    );

    if (supplementSleepData.length >= 3 && noSupplementDays.length >= 3) {
      const avgWithSupplement = supplementSleepData.reduce((sum, d) => sum + d.sleepQuality, 0) / supplementSleepData.length;
      const avgWithoutSupplement = noSupplementDays.reduce((sum, d) => sum + d.sleep_quality, 0) / noSupplementDays.length;
      
      const difference = avgWithSupplement - avgWithoutSupplement;
      
      if (Math.abs(difference) > 0.5) {
        insights.push({
          type: difference > 0 ? 'success' : 'warning',
          priority: 'medium',
          title: 'Supplement-Wirkung auf Schlaf',
          message: difference > 0 
            ? `An Tagen mit Supplements schläfst du ${difference.toFixed(1)} Punkte besser - sie scheinen zu helfen!`
            : `An Supplement-Tagen ist dein Schlaf ${Math.abs(difference).toFixed(1)} Punkte schlechter - überprüfe Timing oder Dosierung`,
          icon: difference > 0 ? '💊✅' : '💊⚠️',
          data: { withSupp: avgWithSupplement.toFixed(1), withoutSupp: avgWithoutSupplement.toFixed(1) }
        });
      }
    }

    return insights;
  };

  const calculateHealthScore = (userData: UserData): CoachInsight[] => {
    const insights: CoachInsight[] = [];
    
    let score = 0;
    let maxScore = 0;
    const factors: string[] = [];
    const improvementTips: string[] = [];
    const categoryScores: any = { consistency: 0, quality: 0, trends: 0, balance: 0 };
    const categoryMax: any = { consistency: 25, quality: 25, trends: 25, balance: 25 };

    // Consistency scoring (0-25 points)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const recentMeals = userData.meals.filter(m => new Date(m.created_at) >= last7Days);
    const recentSleep = userData.sleepData.filter(s => new Date(s.date) >= last7Days);
    const recentWorkouts = userData.workoutData.filter(w => new Date(w.date) >= last7Days);

    maxScore += 25;
    
    // Meal consistency
    if (recentMeals.length >= 14) { 
      score += 10; 
      categoryScores.consistency += 10;
      factors.push('Regelmäßige Mahlzeiten'); 
    } else if (recentMeals.length >= 7) {
      score += 6; 
      categoryScores.consistency += 6;
      factors.push('Gute Mahlzeitenerfassung');
      improvementTips.push('📱 Erfasse 2 Mahlzeiten täglich für maximale Konsistenz-Punkte');
    } else {
      improvementTips.push('📱 Starte mit täglicher Erfassung von 2 Mahlzeiten (+10 Punkte möglich)');
    }
    
    // Sleep consistency
    if (recentSleep.length >= 5) { 
      score += 8; 
      categoryScores.consistency += 8;
      factors.push('Konsequente Schlafaufzeichnung'); 
    } else if (recentSleep.length >= 3) {
      score += 5; 
      categoryScores.consistency += 5;
      factors.push('Guter Schlaftrack');
      improvementTips.push('😴 Trage deinen Schlaf 5x pro Woche ein für mehr Punkte');
    } else {
      improvementTips.push('😴 Trage deinen Schlaf regelmäßig ein (+8 Punkte möglich)');
    }
    
    // Workout consistency
    if (recentWorkouts.length >= 2) { 
      score += 7; 
      categoryScores.consistency += 7;
      factors.push('Aktives Training'); 
    } else if (recentWorkouts.length >= 1) {
      score += 4; 
      categoryScores.consistency += 4;
      factors.push('Sportliche Aktivität');
      improvementTips.push('💪 Trainiere 2-3x pro Woche für optimalen Konsistenz-Score');
    } else {
      improvementTips.push('💪 Starte mit 2 Trainings pro Woche (+7 Punkte möglich)');
    }

    // Data quality scoring (0-25 points)
    maxScore += 25;
    const avgSleepQuality = recentSleep.length > 0 
      ? recentSleep.reduce((sum, s) => sum + (s.sleep_quality || 0), 0) / recentSleep.length 
      : 0;
    
    if (avgSleepQuality >= 8) { 
      score += 15; 
      categoryScores.quality += 15;
      factors.push('Exzellente Schlafqualität'); 
    } else if (avgSleepQuality >= 6) { 
      score += 10; 
      categoryScores.quality += 10;
      factors.push('Gute Schlafqualität'); 
      improvementTips.push('🌙 Verbessere deine Schlafqualität auf 8+ für Bonuspunkte');
    } else if (avgSleepQuality >= 4) { 
      score += 5; 
      categoryScores.quality += 5;
      factors.push('Moderate Schlafqualität'); 
      improvementTips.push('🌙 Arbeite an deiner Schlafqualität - Ziel: 6+ Rating');
    } else if (recentSleep.length > 0) {
      improvementTips.push('🌙 Verbessere deine Schlafqualität für bis zu 15 Bonuspunkte');
    }

    if (recentWorkouts.some(w => w.intensity >= 7)) { 
      score += 10; 
      categoryScores.quality += 10;
      factors.push('Hochintensive Workouts'); 
    } else if (recentWorkouts.length > 0) {
      improvementTips.push('🔥 Steigere deine Trainingsintensität auf 7+ für 10 Bonuspunkte');
    }

    // Trend scoring (0-25 points)
    maxScore += 25;
    if (userData.weightData.length >= 3) {
      const weightTrend = userData.weightData[0].weight - userData.weightData[userData.weightData.length - 1].weight;
      if (Math.abs(weightTrend) <= 2) { 
        score += 15; 
        categoryScores.trends += 15;
        factors.push('Stabiles Gewicht'); 
      } else if (Math.abs(weightTrend) <= 5) { 
        score += 10; 
        categoryScores.trends += 10;
        factors.push('Kontrollierte Gewichtsveränderung'); 
        improvementTips.push('⚖️ Halte dein Gewicht stabiler (±2kg) für maximale Trend-Punkte');
      } else {
        improvementTips.push('⚖️ Arbeite an einer stabileren Gewichtsentwicklung (+15 Punkte möglich)');
      }
    } else {
      improvementTips.push('⚖️ Erfasse regelmäßig dein Gewicht für Trend-Analyse (+15 Punkte möglich)');
    }

    if (userData.measurementData.length >= 2) { 
      score += 10; 
      categoryScores.trends += 10;
      factors.push('Körpermaße überwacht'); 
    } else {
      improvementTips.push('📏 Erfasse deine Körpermaße für weitere 10 Punkte');
    }

    // Balance scoring (0-25 points)
    maxScore += 25;
    const hasAllTypes = recentMeals.length > 0 && recentSleep.length > 0 && recentWorkouts.length > 0;
    if (hasAllTypes) { 
      score += 20; 
      categoryScores.balance += 20;
      factors.push('Ganzheitlicher Ansatz'); 
    } else {
      const missing = [];
      if (recentMeals.length === 0) missing.push('Mahlzeiten');
      if (recentSleep.length === 0) missing.push('Schlaf');
      if (recentWorkouts.length === 0) missing.push('Training');
      improvementTips.push(`🎯 Nutze alle Bereiche: ${missing.join(', ')} für ganzheitlichen Ansatz (+20 Punkte)`);
    }
    
    if (userData.supplementData.length > 0) { 
      score += 5; 
      categoryScores.balance += 5;
      factors.push('Ergänzende Supplements'); 
    } else {
      improvementTips.push('💊 Ergänze mit Supplements für weitere 5 Punkte');
    }

    const percentage = Math.round((score / maxScore) * 100);
    const missingPoints = maxScore - score;
    const nextMilestone = percentage < 50 ? 50 : percentage < 75 ? 75 : percentage < 90 ? 90 : 100;
    const pointsToNext = Math.ceil(((nextMilestone / 100) * maxScore) - score);
    
    insights.push({
      type: percentage >= 80 ? 'success' : percentage >= 60 ? 'info' : 'motivation',
      priority: 'high',
      title: 'Gesundheits-Score',
      message: percentage >= 90 
        ? `Fantastisch! Du erreichst ${percentage}% deines Gesundheitspotentials. Du bist auf dem perfekten Weg! 🏆`
        : percentage >= 75
        ? `Sehr gut! Du erreichst ${percentage}% deines Potentials. Noch ${pointsToNext} Punkte bis zu ${nextMilestone}%. 🎯`
        : `Du erreichst ${percentage}% deines Gesundheitspotentials. ${missingPoints} Punkte sind noch möglich! 📈`,
      icon: percentage >= 90 ? '🏆' : percentage >= 75 ? '🎯' : percentage >= 50 ? '📈' : '🚀',
      data: { 
        score, 
        maxScore, 
        percentage, 
        factors,
        missingPoints,
        improvementTips: improvementTips.slice(0, 5),
        categoryScores,
        categoryMax,
        nextMilestone,
        pointsToNext
      }
    });

    return insights;
  };

  // Helper function to calculate Pearson correlation coefficient
  const calculateCorrelation = (x: number[], y: number[]): number => {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      case 'motivation':
        return <Zap className="h-5 w-5 text-purple-600" />;
      case 'correlation':
        return <Activity className="h-5 w-5 text-orange-600" />;
      case 'habit':
        return <Calendar className="h-5 w-5 text-indigo-600" />;
      case 'trend':
        return <TrendingUp className="h-5 w-5 text-emerald-600" />;
      default:
        return <Brain className="h-5 w-5" />;
    }
  };

  const getInsightColors = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800';
      case 'warning':
        return 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800';
      case 'info':
        return 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800';
      case 'motivation':
        return 'bg-purple-50/50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800';
      case 'correlation':
        return 'bg-orange-50/50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800';
      case 'habit':
        return 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800';
      case 'trend':
        return 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800';
      default:
        return 'bg-gray-50/50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800';
    }
  };

  if (loading && insights.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <h3 className="font-semibold text-lg">KI-Coach analysiert...</h3>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        </div>
      </Card>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="bg-gradient-to-br from-indigo-50/50 via-indigo-25/30 to-indigo-50/20 dark:from-indigo-950/20 dark:via-indigo-950/10 dark:to-indigo-950/5 border-indigo-200/30 dark:border-indigo-800/30">
        <CollapsibleTrigger className="w-full">
          <div className="p-6 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                  <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg">KI-Coach Insights</h3>
                  <p className="text-sm text-muted-foreground">Datenanalyse & Korrelationen</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {insights.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {insights.length} Insights
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-6 pb-6 space-y-6">
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateInsights}
                disabled={loading}
                className="border-indigo-200 dark:border-indigo-800"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Aktualisieren
              </Button>
            </div>

            {insights.length > 0 ? (
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-xl border ${getInsightColors(insight.type)} transition-all hover:scale-[1.01]`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{insight.title}</h4>
                          <span className="text-lg">{insight.icon}</span>
                          {insight.correlation && (
                            <Badge variant="outline" className="text-xs">
                              r={insight.correlation.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {insight.message}
                        </p>
                        
                         {insight.data && (
                           <div className="mt-3">
                             {insight.title === 'Gesundheits-Score' ? (
                               <div className="space-y-4">
                                 {/* Score Display */}
                                 <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/30 rounded-lg p-3">
                                   <div>
                                     <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                                       {insight.data.score}/{insight.data.maxScore} Punkte
                                     </div>
                                     <div className="text-sm text-indigo-600 dark:text-indigo-400">
                                       {insight.data.percentage >= 100 ? 'Perfekt!' : `Noch ${insight.data.missingPoints} Punkte möglich`}
                                     </div>
                                   </div>
                                   <div className="text-right">
                                     <div className="text-lg font-medium text-indigo-600 dark:text-indigo-400">
                                       {insight.data.nextMilestone < 100 && `Nächstes Ziel: ${insight.data.nextMilestone}%`}
                                     </div>
                                     {insight.data.pointsToNext > 0 && insight.data.nextMilestone < 100 && (
                                       <div className="text-xs text-indigo-500 dark:text-indigo-500">
                                         Noch {insight.data.pointsToNext} Punkte
                                       </div>
                                     )}
                                   </div>
                                 </div>

                                 {/* Category Breakdown */}
                                 <div className="grid grid-cols-2 gap-3">
                                   {Object.entries(insight.data.categoryScores).map(([category, score]: [string, any]) => {
                                     const maxScore = insight.data.categoryMax[category];
                                     const percentage = Math.round((score / maxScore) * 100);
                                     const categoryNames: any = {
                                       consistency: 'Konsistenz',
                                       quality: 'Qualität', 
                                       trends: 'Trends',
                                       balance: 'Balance'
                                     };
                                     
                                     return (
                                       <div key={category} className="bg-white/50 dark:bg-gray-800/30 rounded-lg p-3">
                                         <div className="flex justify-between items-center mb-2">
                                           <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                             {categoryNames[category]}
                                           </span>
                                           <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                             {score}/{maxScore}
                                           </span>
                                         </div>
                                         <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                           <div 
                                             className={`h-2 rounded-full transition-all duration-500 ${
                                               percentage >= 80 ? 'bg-green-500' : 
                                               percentage >= 60 ? 'bg-yellow-500' : 
                                               percentage >= 40 ? 'bg-orange-500' : 'bg-red-500'
                                             }`}
                                             style={{ width: `${percentage}%` }}
                                           />
                                         </div>
                                       </div>
                                     );
                                   })}
                                 </div>

                                 {/* Improvement Tips */}
                                 {insight.data.improvementTips && insight.data.improvementTips.length > 0 && (
                                   <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
                                     <div className="flex items-center gap-2 mb-3">
                                       <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
                                       <span className="font-medium text-green-700 dark:text-green-300">
                                         Weg zu 100% Gesundheits-Score:
                                       </span>
                                     </div>
                                     <div className="space-y-2">
                                       {insight.data.improvementTips.map((tip: string, tipIndex: number) => (
                                         <div key={tipIndex} className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300">
                                           <span className="text-green-500 dark:text-green-400 font-bold">•</span>
                                           <span>{tip}</span>
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                 )}

                                 {/* Current Strengths */}
                                 {insight.data.factors && insight.data.factors.length > 0 && (
                                   <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                                     <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
                                       🏆 Deine Stärken:
                                     </div>
                                     <div className="flex gap-1 flex-wrap">
                                       {insight.data.factors.slice(0, 6).map((factor: string, factorIndex: number) => (
                                         <Badge 
                                           key={factorIndex} 
                                           variant="outline" 
                                           className="text-xs bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                                         >
                                           {factor}
                                         </Badge>
                                       ))}
                                     </div>
                                   </div>
                                 )}
                               </div>
                             ) : (
                               <div className="flex gap-2 flex-wrap">
                                 {Object.entries(insight.data).slice(0, 4).map(([key, value]) => (
                                   <Badge 
                                     key={key} 
                                     variant="outline" 
                                     className="text-xs"
                                   >
                                     {key}: {typeof value === 'number' ? value.toFixed(1) : String(value)}
                                   </Badge>
                                 ))}
                               </div>
                             )}
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <PremiumGate 
                feature="premium_insights"
                hideable={true}
                fallbackMessage="KI-Coach Insights sind ein Premium Feature. Upgrade für erweiterte KI-gestützte Analyse!"
              >
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
                  <h4 className="font-medium mb-2">Sammle mehr Daten</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tracke mindestens 5-7 Tage Mahlzeiten, Schlaf und Aktivitäten für aussagekräftige Korrelationen
                  </p>
                  <Button 
                    onClick={generateInsights}
                    disabled={loading}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Analyse starten
                  </Button>
                </div>
              </PremiumGate>
            )}

            {/* Quick Tips */}
            <div className="pt-4 border-t border-indigo-200/30 dark:border-indigo-800/30">
              <h4 className="font-medium mb-3 text-indigo-700 dark:text-indigo-300">🔍 Insights basierend auf:</h4>
              <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Utensils className="h-4 w-4" />
                  <span>Mahlzeiten & Timing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  <span>Schlaf & Erholung</span>
                </div>
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  <span>Gewichtstrends</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  <span>Aktivitätsmuster</span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};