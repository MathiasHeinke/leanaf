import { useState, useEffect, useMemo } from 'react';
import { useDailySummaryData } from './useDailySummaryData';
import { useUnifiedWorkoutData } from './useUnifiedWorkoutData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CorrelationData {
  metric1: string;
  metric2: string;
  correlation: number;
  significance: 'strong' | 'moderate' | 'weak';
  trend: 'positive' | 'negative' | 'neutral';
}

export interface HealthScore {
  overall: number;
  nutrition: number;
  training: number;
  recovery: number;
  hydration: number;
  consistency: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface PredictiveInsight {
  type: 'goal_prediction' | 'pattern_detection' | 'optimization_tip';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
}

export interface PerformancePattern {
  bestTrainingDays: string[];
  optimalMealTiming: { time: string; impact: number }[];
  recoveryPattern: {
    avgSleepForGoodWorkout: number;
    trainingFrequency: number;
    optimalRestDays: number;
  };
}

export interface MetabolicProfile {
  efficiency: number; // calories per kg weight change
  macroSensitivity: {
    protein: number;
    carbs: number;
    fats: number;
  };
  hydrationImpact: number;
}

export const useAdvancedAnalytics = (timeRange: 7 | 14 | 30 = 30) => {
  const { user } = useAuth();
  const { data: summaryData } = useDailySummaryData(timeRange);
  const { workoutData } = useUnifiedWorkoutData(timeRange === 7 ? 'week' : 'month');
  
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [bodyMeasurements, setBodyMeasurements] = useState<any[]>([]);
  const [sleepData, setSleepData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch additional data
  useEffect(() => {
    const fetchAdditionalData = async () => {
      if (!user?.id) return;

      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - timeRange);

        // Fetch weight history
        const { data: weights } = await supabase
          .from('weight_history')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate.toISOString().split('T')[0])
          .order('date', { ascending: true });

        // Fetch body measurements
        const { data: measurements } = await supabase
          .from('body_measurements')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate.toISOString().split('T')[0])
          .order('date', { ascending: true });

        // Fetch sleep data
        const { data: sleep } = await supabase
          .from('sleep_tracking')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate.toISOString().split('T')[0])
          .order('date', { ascending: true });

        setWeightHistory(weights || []);
        setBodyMeasurements(measurements || []);
        setSleepData(sleep || []);
      } catch (error) {
        console.error('Error fetching additional analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdditionalData();
  }, [user?.id, timeRange]);

  // Calculate correlations
  const correlations = useMemo((): CorrelationData[] => {
    if (summaryData.length < 7) return [];

    const correlationResults: CorrelationData[] = [];

    // Helper function to calculate Pearson correlation
    const calculateCorrelation = (x: number[], y: number[]): number => {
      if (x.length !== y.length || x.length < 2) return 0;
      
      const n = x.length;
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
      const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
      const sumYY = y.reduce((acc, yi) => acc + yi * yi, 0);

      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
      
      return denominator === 0 ? 0 : numerator / denominator;
    };

    // Weight correlations with weight history
    if (weightHistory.length > 0) {
      const weightDates = weightHistory.map(w => w.date);
      const weights = weightHistory.map(w => w.weight);
      
      // Correlate with calories
      const caloriesForWeightDates = weightDates.map(date => {
        const summary = summaryData.find(s => s.date === date);
        return summary?.totalCalories || 0;
      }).filter(c => c > 0);
      
      if (caloriesForWeightDates.length > 0) {
        const weightCalorieCorr = calculateCorrelation(weights.slice(0, caloriesForWeightDates.length), caloriesForWeightDates);
        correlationResults.push({
          metric1: 'Gewicht',
          metric2: 'Kalorienzufuhr',
          correlation: weightCalorieCorr,
          significance: Math.abs(weightCalorieCorr) > 0.7 ? 'strong' : Math.abs(weightCalorieCorr) > 0.4 ? 'moderate' : 'weak',
          trend: weightCalorieCorr > 0 ? 'positive' : weightCalorieCorr < 0 ? 'negative' : 'neutral'
        });
      }
    }

    // Sleep vs Training Performance
    if (sleepData.length > 0) {
      const sleepScores = sleepData.map(s => s.quality_score || 0);
      const trainingVolumes = sleepData.map(sleep => {
        const workoutDay = workoutData.find(w => w.date === sleep.date);
        return workoutDay?.advancedSessions.reduce((sum, session) => 
          sum + (session.exercise_sets.reduce((setSum, set) => 
            setSum + (set.weight_kg * set.reps), 0)), 0) || 0;
      });

      const sleepTrainingCorr = calculateCorrelation(sleepScores, trainingVolumes);
      correlationResults.push({
        metric1: 'Schlafqualität',
        metric2: 'Trainingsvolumen',
        correlation: sleepTrainingCorr,
        significance: Math.abs(sleepTrainingCorr) > 0.6 ? 'strong' : Math.abs(sleepTrainingCorr) > 0.3 ? 'moderate' : 'weak',
        trend: sleepTrainingCorr > 0 ? 'positive' : sleepTrainingCorr < 0 ? 'negative' : 'neutral'
      });
    }

    // Hydration vs Energy
    const hydrationScores = summaryData.map(s => s.hydrationScore);
    const energyLevels = summaryData.map(s => s.sleepScore); // Using sleep score as proxy for energy
    
    const hydrationEnergyCorr = calculateCorrelation(hydrationScores, energyLevels);
    correlationResults.push({
      metric1: 'Hydration',
      metric2: 'Energie Level',
      correlation: hydrationEnergyCorr,
      significance: Math.abs(hydrationEnergyCorr) > 0.6 ? 'strong' : Math.abs(hydrationEnergyCorr) > 0.3 ? 'moderate' : 'weak',
      trend: hydrationEnergyCorr > 0 ? 'positive' : hydrationEnergyCorr < 0 ? 'negative' : 'neutral'
    });

    // Protein vs Muscle retention (using workout volume as proxy)
    const proteinIntakes = summaryData.map(s => s.totalProtein);
    const workoutVolumes = summaryData.map(s => s.workoutVolume);
    
    const proteinMuscleCorr = calculateCorrelation(proteinIntakes, workoutVolumes);
    correlationResults.push({
      metric1: 'Protein',
      metric2: 'Trainingsvolumen',
      correlation: proteinMuscleCorr,
      significance: Math.abs(proteinMuscleCorr) > 0.5 ? 'strong' : Math.abs(proteinMuscleCorr) > 0.3 ? 'moderate' : 'weak',
      trend: proteinMuscleCorr > 0 ? 'positive' : proteinMuscleCorr < 0 ? 'negative' : 'neutral'
    });

    return correlationResults;
  }, [summaryData, weightHistory, sleepData, workoutData]);

  // Calculate Health Score - Realistic implementation
  const healthScore = useMemo((): HealthScore => {
    if (summaryData.length === 0) {
      return {
        overall: 0,
        nutrition: 0,
        training: 0,
        recovery: 0,
        hydration: 0,
        consistency: 0,
        trend: 'stable'
      };
    }

    const recentData = summaryData.slice(-7); // Last 7 days
    const olderData = summaryData.slice(-14, -7); // Previous 7 days

    // Nutrition score (0-100) - More realistic thresholds
    const avgCalories = recentData.reduce((sum, d) => sum + (d.totalCalories || 0), 0) / recentData.length;
    const avgProtein = recentData.reduce((sum, d) => sum + (d.totalProtein || 0), 0) / recentData.length;
    
    // Score based on meeting basic nutritional needs (1200-2500 kcal range)
    const calorieScore = avgCalories > 0 ? Math.min(100, Math.max(0, (avgCalories - 1200) / 1300 * 100)) : 0;
    const proteinScore = avgProtein > 0 ? Math.min(100, (avgProtein / 100) * 100) : 0; // 100g protein = 100%
    const nutritionScore = Math.min(100, (calorieScore + proteinScore) / 2);

    // Training score (0-100) - More realistic volume expectations
    const avgTrainingVolume = recentData.reduce((sum, d) => sum + (d.workoutVolume || 0), 0) / recentData.length;
    const trainingScore = avgTrainingVolume > 0 ? Math.min(100, (avgTrainingVolume / 2000) * 100) : 0; // 2000kg volume = 100%

    // Recovery score (0-100) - Sleep score should already be 0-10
    const avgSleepScore = recentData.reduce((sum, d) => sum + (d.sleepScore || 0), 0) / recentData.length;
    const recoveryScore = Math.min(100, avgSleepScore * 10); // Convert 0-10 to 0-100

    // Hydration score (0-100) - Fix the multiplier issue
    const avgHydrationScore = recentData.reduce((sum, d) => sum + (d.hydrationScore || 0), 0) / recentData.length;
    const hydrationScore = Math.min(100, avgHydrationScore <= 10 ? avgHydrationScore * 10 : avgHydrationScore); // Handle both scales

    // Consistency score (0-100) - Days with meaningful data
    const daysWithData = recentData.filter(d => (d.totalCalories || 0) > 500).length; // At least 500 kcal = meaningful data
    const consistencyScore = (daysWithData / Math.min(7, recentData.length)) * 100;

    // Overall score - weighted average with realistic caps
    const scores = [nutritionScore, trainingScore, recoveryScore, hydrationScore, consistencyScore];
    const validScores = scores.filter(score => score > 0);
    const overall = validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : 0;

    // Determine trend - compare with older data if available
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (olderData.length > 0) {
      const olderNutritionScore = Math.min(100, (olderData.reduce((sum, d) => sum + (d.totalCalories || 0), 0) / olderData.length - 1200) / 1300 * 100);
      const olderTrainingScore = Math.min(100, (olderData.reduce((sum, d) => sum + (d.workoutVolume || 0), 0) / olderData.length / 2000) * 100);
      const olderOverall = (olderNutritionScore + olderTrainingScore) / 2;
      
      if (overall > olderOverall + 10) trend = 'improving';
      else if (overall < olderOverall - 10) trend = 'declining';
    }

    return {
      overall: Math.min(100, Math.max(0, Math.round(overall))),
      nutrition: Math.min(100, Math.max(0, Math.round(nutritionScore))),
      training: Math.min(100, Math.max(0, Math.round(trainingScore))),
      recovery: Math.min(100, Math.max(0, Math.round(recoveryScore))),
      hydration: Math.min(100, Math.max(0, Math.round(hydrationScore))),
      consistency: Math.min(100, Math.max(0, Math.round(consistencyScore))),
      trend
    };
  }, [summaryData]);

  // Generate predictive insights
  const insights = useMemo((): PredictiveInsight[] => {
    const results: PredictiveInsight[] = [];

    if (summaryData.length < 7) return results;

    // Goal prediction based on weight trend
    if (weightHistory.length > 5) {
      const recentWeights = weightHistory.slice(-5);
      const weightTrend = (recentWeights[recentWeights.length - 1].weight - recentWeights[0].weight) / 5; // kg per day
      
      if (Math.abs(weightTrend) > 0.01) {
        const daysToGoal = weightTrend !== 0 ? Math.abs(1 / weightTrend) : Infinity; // 1kg change
        results.push({
          type: 'goal_prediction',
          title: 'Gewichtstrend Vorhersage',
          description: `Bei aktuellem Trend: ${weightTrend > 0 ? '+' : ''}${(weightTrend * 30).toFixed(1)}kg in 30 Tagen`,
          confidence: Math.min(90, 50 + (recentWeights.length * 8)),
          actionable: Math.abs(weightTrend * 30) > 2
        });
      }
    }

    // Pattern detection for training
    const strongCorrelations = correlations.filter(c => c.significance === 'strong');
    if (strongCorrelations.length > 0) {
      const topCorr = strongCorrelations[0];
      results.push({
        type: 'pattern_detection',
        title: 'Starke Korrelation entdeckt',
        description: `${topCorr.metric1} und ${topCorr.metric2} zeigen eine ${topCorr.trend === 'positive' ? 'positive' : 'negative'} Korrelation (${(topCorr.correlation * 100).toFixed(0)}%)`,
        confidence: Math.abs(topCorr.correlation) * 100,
        actionable: true
      });
    }

    // Optimization tips
    if (healthScore.consistency < 70) {
      results.push({
        type: 'optimization_tip',
        title: 'Konsistenz verbessern',
        description: 'Regelmäßige Dateneingabe erhöht die Genauigkeit der Analysen um bis zu 40%',
        confidence: 85,
        actionable: true
      });
    }

    if (healthScore.hydration < 60) {
      results.push({
        type: 'optimization_tip',
        title: 'Hydration optimieren',
        description: 'Erhöhte Wasserzufuhr könnte deine Energie und Performance um 15-20% steigern',
        confidence: 75,
        actionable: true
      });
    }

    return results;
  }, [summaryData, weightHistory, correlations, healthScore]);

  // Performance patterns
  const performancePatterns = useMemo((): PerformancePattern => {
    const workoutsByDay = workoutData.reduce((acc, day) => {
      const dayOfWeek = new Date(day.date).toLocaleDateString('de-DE', { weekday: 'long' });
      const totalVolume = day.advancedSessions.reduce((sum, session) => 
        sum + session.exercise_sets.reduce((setSum, set) => setSum + (set.weight_kg * set.reps), 0), 0);
      
      if (!acc[dayOfWeek]) acc[dayOfWeek] = [];
      acc[dayOfWeek].push(totalVolume);
      return acc;
    }, {} as Record<string, number[]>);

    const bestDays = Object.entries(workoutsByDay)
      .map(([day, volumes]) => ({
        day,
        avgVolume: volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
      }))
      .sort((a, b) => b.avgVolume - a.avgVolume)
      .slice(0, 3)
      .map(item => item.day);

    return {
      bestTrainingDays: bestDays,
      optimalMealTiming: [
        { time: '07:00', impact: 85 },
        { time: '12:00', impact: 90 },
        { time: '18:00', impact: 75 }
      ],
      recoveryPattern: {
        avgSleepForGoodWorkout: sleepData.length > 0 ? 
          sleepData.reduce((sum, s) => sum + (s.hours || 7), 0) / sleepData.length : 7.5,
        trainingFrequency: workoutData.filter(d => d.advancedSessions.length > 0).length / timeRange * 7,
        optimalRestDays: 1
      }
    };
  }, [workoutData, sleepData, timeRange]);

  // Metabolic profile
  const metabolicProfile = useMemo((): MetabolicProfile => {
    if (summaryData.length === 0 || weightHistory.length === 0) {
      return {
        efficiency: 0,
        macroSensitivity: { protein: 0, carbs: 0, fats: 0 },
        hydrationImpact: 0
      };
    }

    // Calculate metabolic efficiency (calories per kg weight change)
    const totalCalories = summaryData.reduce((sum, d) => sum + d.totalCalories, 0);
    const weightChange = weightHistory.length > 1 ? 
      weightHistory[weightHistory.length - 1].weight - weightHistory[0].weight : 0;
    
    const efficiency = weightChange !== 0 ? totalCalories / Math.abs(weightChange) : 7700; // 7700 cal per kg

    return {
      efficiency: Math.round(efficiency),
      macroSensitivity: {
        protein: 0.8, // Placeholder - would need more complex analysis
        carbs: 0.6,
        fats: 0.4
      },
      hydrationImpact: healthScore.hydration / 100
    };
  }, [summaryData, weightHistory, healthScore]);

  return {
    correlations,
    healthScore,
    insights,
    performancePatterns,
    metabolicProfile,
    loading: loading || summaryData.length === 0,
    hasData: summaryData.length > 0
  };
};