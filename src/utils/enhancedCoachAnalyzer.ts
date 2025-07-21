import { supabase } from "@/integrations/supabase/client";
import { intelligentCalorieCalculator, type CalorieCalculationResult } from "@/utils/intelligentCalorieCalculator";

export interface TransformationData {
  workouts: any[];
  sleepData: any[];
  measurements: any[];
  meals: any[];
  weight: any[];
  goals: any;
  profile: any;
  calorieInsights?: CalorieCalculationResult;
}

export interface CoachInsight {
  type: 'success' | 'warning' | 'info' | 'motivation';
  title: string;
  message: string;
  icon: string;
  data?: any;
}

export class EnhancedCoachAnalyzer {
  private data: TransformationData;

  constructor(data: TransformationData) {
    this.data = data;
  }

  async generateInsights(): Promise<CoachInsight[]> {
    const insights: CoachInsight[] = [];

    // NEW: AI-Powered Calorie Intelligence - Highest priority
    const calorieInsight = await this.analyzeIntelligentCalories();
    if (calorieInsight) insights.push(calorieInsight);

    // AI-Powered Priority Analysis - Most important first
    const criticalInsight = this.analyzeCriticalPatterns();
    if (criticalInsight) insights.push(criticalInsight);

    // Smart plateau vs real progress
    const plateauInsight = this.analyzePlateauVsProgress();
    if (plateauInsight) insights.push(plateauInsight);

    // Predictive weight analysis
    const predictiveInsight = this.analyzePredictivePatterns();
    if (predictiveInsight) insights.push(predictiveInsight);

    // Multi-factor correlation analysis
    const correlationInsight = this.analyzeMultiFactorCorrelation();
    if (correlationInsight) insights.push(correlationInsight);

    // Smart water retention detection
    const waterInsight = this.analyzeWaterRetention();
    if (waterInsight) insights.push(waterInsight);

    // Workout efficiency analysis
    const workoutInsight = this.analyzeWorkoutEfficiency();
    if (workoutInsight) insights.push(workoutInsight);

    // Sleep-performance correlation
    const sleepInsight = this.analyzeSleepPerformanceImpact();
    if (sleepInsight) insights.push(sleepInsight);

    // Body composition insights
    const bodyCompInsight = this.analyzeBodyComposition();
    if (bodyCompInsight) insights.push(bodyCompInsight);

    // Nutrition timing optimization
    const nutritionInsight = this.analyzeNutritionTiming();
    if (nutritionInsight) insights.push(nutritionInsight);

    // Goal-specific coaching
    const goalInsight = this.generateGoalSpecificInsight();
    if (goalInsight) insights.push(goalInsight);

    // Adaptive motivation
    const motivationInsight = this.generateAdaptiveMotivation();
    if (motivationInsight) insights.push(motivationInsight);

    // Limit to top 4-5 insights for better UX
    return insights.slice(0, 5);
  }

  private analyzePlateauVsProgress(): CoachInsight | null {
    const recentWeight = this.getRecentWeightTrend(7);
    const recentMeasurements = this.getRecentMeasurements(14);

    if (recentWeight.length < 2 || recentMeasurements.length < 2) return null;

    const weightStagnant = Math.abs(recentWeight[0] - recentWeight[recentWeight.length - 1]) < 0.5;
    const bellyDecreasing = this.isMeasurementDecreasing(recentMeasurements, 'belly');

    if (weightStagnant && bellyDecreasing) {
      return {
        type: 'success',
        title: 'Echter Fortschritt! 🎉',
        message: 'Die Waage stagniert, aber dein Bauchumfang sinkt. Das ist Fettabbau bei Muskelerhalt - genau so soll es sein!',
        icon: '📏',
        data: { weightChange: 0, bellyChange: this.getMeasurementChange(recentMeasurements, 'belly') }
      };
    }

    if (weightStagnant && !bellyDecreasing) {
      return {
        type: 'info',
        title: 'Plateau-Phase',
        message: 'Sowohl Gewicht als auch Maße stagnieren. Zeit für eine kleine Anpassung - vielleicht mehr Bewegung oder Defizit prüfen?',
        icon: '🔄',
        data: { suggestion: 'adjustment_needed' }
      };
    }

    return null;
  }

  private analyzeWaterRetention(): CoachInsight | null {
    const recentSleep = this.data.sleepData.slice(-3);
    const recentWorkouts = this.data.workouts.slice(-3);
    const recentWeight = this.getRecentWeightTrend(3);

    if (recentWeight.length < 2) return null;

    const weightIncrease = recentWeight[0] - recentWeight[recentWeight.length - 1] > 0.5;
    const poorSleep = recentSleep.some(s => s.sleep_quality < 3);
    const intensiveWorkouts = recentWorkouts.some(w => w.did_workout && w.intensity >= 4);
    const noWorkouts = recentWorkouts.every(w => !w.did_workout);

    if (weightIncrease && (poorSleep || intensiveWorkouts || noWorkouts)) {
      let reason = '';
      if (poorSleep) reason = 'schlechter Schlaf';
      else if (intensiveWorkouts) reason = 'intensives Training';
      else if (noWorkouts) reason = 'fehlende Bewegung';

      return {
        type: 'warning',
        title: 'Wasser-Retention erklärt 💧',
        message: `Gewichtszunahme durch ${reason}? Das ist normal! Wasser-Schwankungen sind temporär - focus auf die Maße.`,
        icon: '💧',
        data: { reason, weightChange: recentWeight[0] - recentWeight[recentWeight.length - 1] }
      };
    }

    return null;
  }

  private analyzeWorkoutConsistency(): CoachInsight | null {
    const weeklyWorkouts = this.data.workouts.slice(-7);
    const workoutCount = weeklyWorkouts.filter(w => w.did_workout).length;

    if (workoutCount >= 3) {
      return {
        type: 'success',
        title: 'Workout-Konsistenz Top! 💪',
        message: `${workoutCount} Trainings diese Woche - perfekt für Muskelerhalt und Stoffwechsel!`,
        icon: '💪',
        data: { workoutCount }
      };
    }

    if (workoutCount === 0) {
      return {
        type: 'warning',
        title: 'Training fehlt',
        message: 'Diese Woche kein Training? 1-2x Krafttraining hilft beim Muskelerhalt und macht das Defizit effektiver.',
        icon: '⚠️',
        data: { workoutCount }
      };
    }

    return null;
  }

  private analyzeSleepImpact(): CoachInsight | null {
    const recentSleep = this.data.sleepData.slice(-7);
    if (recentSleep.length < 3) return null;

    const avgQuality = recentSleep.reduce((sum, s) => sum + (s.sleep_quality || 3), 0) / recentSleep.length;
    const avgHours = recentSleep
      .filter(s => s.sleep_hours)
      .reduce((sum, s) => sum + s.sleep_hours, 0) / recentSleep.filter(s => s.sleep_hours).length;

    if (avgQuality >= 4 && avgHours >= 7) {
      return {
        type: 'success',
        title: 'Schlaf-Champion! 😴',
        message: 'Perfekter Schlaf unterstützt deine Transformation. Weiter so!',
        icon: '😴',
        data: { avgQuality, avgHours }
      };
    }

    if (avgQuality < 3 || avgHours < 6) {
      return {
        type: 'warning',
        title: 'Schlaf optimieren',
        message: 'Schlechter Schlaf kann Fortschritte bremsen. 7+ Stunden guter Schlaf = bessere Ergebnisse!',
        icon: '🌙',
        data: { avgQuality, avgHours }
      };
    }

    return null;
  }

  private analyzeMeasurementProgress(): CoachInsight | null {
    const measurements = this.data.measurements.slice(-4); // Last 4 measurements
    if (measurements.length < 2) return null;

    const bellyProgress = this.getMeasurementChange(measurements, 'belly');
    const waistProgress = this.getMeasurementChange(measurements, 'waist');

    if (bellyProgress < -2 || waistProgress < -2) {
      return {
        type: 'success',
        title: 'Transformation sichtbar! 📏✨',
        message: `${Math.abs(bellyProgress).toFixed(1)}cm weniger Bauchumfang - das ist echter Fortschritt!`,
        icon: '📏',
        data: { bellyProgress, waistProgress }
      };
    }

    return null;
  }

  // NEW: Critical pattern detection - highest priority insights
  private analyzeCriticalPatterns(): CoachInsight | null {
    const recentWeight = this.getRecentWeightTrend(14);
    const recentWorkouts = this.data.workouts.slice(-14);
    const recentSleep = this.data.sleepData.slice(-7);
    
    // Critical: Rapid weight loss + no training = muscle loss risk
    if (recentWeight.length >= 3) {
      const weightLossRate = (recentWeight[recentWeight.length - 1] - recentWeight[0]) / (recentWeight.length / 7);
      const noTraining = recentWorkouts.filter(w => w.did_workout).length === 0;
      
      if (weightLossRate < -1 && noTraining) {
        return {
          type: 'warning',
          title: 'WARNUNG: Muskelverlust-Risiko! ⚠️',
          message: `Schneller Gewichtsverlust (${Math.abs(weightLossRate).toFixed(1)}kg/Woche) ohne Training kann Muskelmasse kosten. Sofort 2x/Woche Krafttraining!`,
          icon: '🚨',
          data: { weightLossRate, trainingDays: 0 }
        };
      }
    }

    // Critical: Consistent poor sleep affecting everything
    const poorSleepDays = recentSleep.filter(s => s.sleep_quality < 2 || s.sleep_hours < 5).length;
    if (poorSleepDays >= 5) {
      return {
        type: 'warning',
        title: 'Schlaf-Krise gefährdet Ziele! 😴',
        message: `${poorSleepDays} Tage schlechter Schlaf blockieren deinen Fortschritt. Priorität #1: Schlaf optimieren!`,
        icon: '🚨',
        data: { poorSleepDays }
      };
    }

    return null;
  }

  // NEW: Intelligent Calorie Analysis using the advanced calculator
  private async analyzeIntelligentCalories(): Promise<CoachInsight | null> {
    if (!this.data.profile || !this.data.calorieInsights) return null;

    const { calorieInsights } = this.data;
    const { confidence, dataQuality, metabolicAdaptation, recommendations } = calorieInsights;

    // Critical: Metabolic adaptation detected
    if (metabolicAdaptation && metabolicAdaptation > 0.15) {
      return {
        type: 'warning',
        title: 'Metabolische Anpassung erkannt! 🔥',
        message: `Dein Stoffwechsel hat sich um ${(metabolicAdaptation * 100).toFixed(1)}% verlangsamt. Diet Break oder Refeed könnte helfen.`,
        icon: '🚨',
        data: { metabolicAdaptation: metabolicAdaptation * 100, confidence }
      };
    }

    // High confidence calculation with good progress
    if (confidence === 'high' && dataQuality.daysOfData >= 30) {
      const recentWeight = this.getRecentWeightTrend(7);
      const isLosingWeight = recentWeight.length >= 2 && recentWeight[0] > recentWeight[recentWeight.length - 1];
      
      if (isLosingWeight) {
        return {
          type: 'success',
          title: 'KI-Kalorienziel optimiert! 🧠✨',
          message: `Basierend auf ${dataQuality.daysOfData} Tagen: Dein TDEE ist ${calorieInsights.tdee}kcal. Die Berechnungen sind hochpräzise!`,
          icon: '🎯',
          data: { 
            tdee: calorieInsights.tdee, 
            targetCalories: calorieInsights.targetCalories,
            confidence,
            daysOfData: dataQuality.daysOfData
          }
        };
      }
    }

    // Data quality recommendations
    if (confidence === 'low' && recommendations && recommendations.length > 0) {
      return {
        type: 'info',
        title: 'Kalorienziel verbessern! 📊',
        message: `Aktuelle Berechnung unsicher (${confidence}). ${recommendations[0]} für genauere Empfehlungen.`,
        icon: '🔍',
        data: { 
          confidence,
          daysOfData: dataQuality.daysOfData,
          mainRecommendation: recommendations[0]
        }
      };
    }

    return null;
  }

  // NEW: Predictive analysis based on trends
  private analyzePredictivePatterns(): CoachInsight | null {
    const recentWeight = this.getRecentWeightTrend(21); // 3 weeks
    const recentMeasurements = this.getRecentMeasurements(21);
    
    if (recentWeight.length >= 6) {
      const weeklyChanges = [];
      for (let i = 0; i < recentWeight.length - 6; i += 7) {
        weeklyChanges.push(recentWeight[i] - recentWeight[i + 7]);
      }
      
      if (weeklyChanges.length >= 2) {
        const avgWeeklyChange = weeklyChanges.reduce((a, b) => a + b, 0) / weeklyChanges.length;
        const isConsistent = weeklyChanges.every(change => Math.sign(change) === Math.sign(avgWeeklyChange));
        
        if (isConsistent && Math.abs(avgWeeklyChange) > 0.3) {
          const prediction = avgWeeklyChange * 4; // Monthly prediction
          return {
            type: avgWeeklyChange < 0 ? 'success' : 'info',
            title: 'Trend-Prognose berechnet! 📊',
            message: `Bei aktuellem Tempo: ${Math.abs(prediction).toFixed(1)}kg ${avgWeeklyChange < 0 ? 'weniger' : 'mehr'} in 4 Wochen. ${avgWeeklyChange < 0 ? 'Perfekt!' : 'Trend beobachten.'}`,
            icon: '🔮',
            data: { weeklyChange: avgWeeklyChange, monthlyPrediction: prediction }
          };
        }
      }
    }

    return null;
  }

  // NEW: Multi-factor correlation analysis
  private analyzeMultiFactorCorrelation(): CoachInsight | null {
    const recentData = this.getCorrelationData(14);
    if (recentData.length < 7) return null;

    // Find best performing days pattern
    const bestDays = recentData
      .filter(d => d.workout && d.sleepQuality >= 3)
      .sort((a, b) => b.sleepQuality - a.sleepQuality);

    if (bestDays.length >= 3) {
      const avgSleep = bestDays.reduce((sum, d) => sum + d.sleepQuality, 0) / bestDays.length;
      return {
        type: 'success',
        title: 'Erfolgsformel identifiziert! 🧪',
        message: `Training + ${avgSleep.toFixed(1)}/5 Schlafqualität = deine beste Kombination! Wiederhole diese Tage.`,
        icon: '⚗️',
        data: { optimalSleep: avgSleep, pattern: 'workout_good_sleep' }
      };
    }

    return null;
  }

  // NEW: Enhanced workout efficiency analysis
  private analyzeWorkoutEfficiency(): CoachInsight | null {
    const recentWorkouts = this.data.workouts.slice(-14);
    const workoutsWithData = recentWorkouts.filter(w => w.did_workout && w.intensity);

    if (workoutsWithData.length >= 3) {
      const avgIntensity = workoutsWithData.reduce((sum, w) => sum + w.intensity, 0) / workoutsWithData.length;
      const highIntensityDays = workoutsWithData.filter(w => w.intensity >= 4).length;
      const recentWeight = this.getRecentWeightTrend(14);

      if (highIntensityDays >= 2 && recentWeight.length >= 2) {
        const weightChange = recentWeight[0] - recentWeight[recentWeight.length - 1];
        
        if (weightChange < -0.5) {
          return {
            type: 'success',
            title: 'High-Intensity zahlt sich aus! 💪⚡',
            message: `${highIntensityDays} intensive Trainings + ${Math.abs(weightChange).toFixed(1)}kg weniger = perfekte Kombination!`,
            icon: '🔥',
            data: { highIntensityDays, weightChange, avgIntensity }
          };
        }
      }
    }

    return this.analyzeWorkoutConsistency(); // Fallback to basic analysis
  }

  // NEW: Sleep-performance correlation
  private analyzeSleepPerformanceImpact(): CoachInsight | null {
    const correlationData = this.getCorrelationData(14);
    if (correlationData.length < 7) return null;

    const workoutDays = correlationData.filter(d => d.workout);
    const noWorkoutDays = correlationData.filter(d => !d.workout);

    if (workoutDays.length >= 3 && noWorkoutDays.length >= 3) {
      const workoutSleepAvg = workoutDays.reduce((sum, d) => sum + d.sleepQuality, 0) / workoutDays.length;
      const restSleepAvg = noWorkoutDays.reduce((sum, d) => sum + d.sleepQuality, 0) / noWorkoutDays.length;

      const difference = workoutSleepAvg - restSleepAvg;
      
      if (Math.abs(difference) > 0.5) {
        return {
          type: difference > 0 ? 'success' : 'info',
          title: 'Training-Schlaf Korrelation! 📊',
          message: `Du schläfst ${Math.abs(difference).toFixed(1)} Punkte ${difference > 0 ? 'besser' : 'schlechter'} nach dem Training. ${difference > 0 ? 'Training hilft deinem Schlaf!' : 'Training könnte deinen Schlaf stören.'}`,
          icon: '🔄',
          data: { workoutSleepAvg, restSleepAvg, correlation: difference }
        };
      }
    }

    return this.analyzeSleepImpact(); // Fallback to basic analysis
  }

  // NEW: Body composition analysis
  private analyzeBodyComposition(): CoachInsight | null {
    const measurements = this.data.measurements.slice(-8); // 8 most recent
    if (measurements.length < 3) return null;

    const latestMeasurement = measurements[0];
    const oldestMeasurement = measurements[measurements.length - 1];
    
    if (latestMeasurement && oldestMeasurement) {
      const bellyChange = this.getMeasurementChange([latestMeasurement, oldestMeasurement], 'belly');
      const waistChange = this.getMeasurementChange([latestMeasurement, oldestMeasurement], 'waist');
      const chestChange = this.getMeasurementChange([latestMeasurement, oldestMeasurement], 'chest');
      
      // Body recomposition pattern
      if (bellyChange < -1 && chestChange > -0.5) {
        return {
          type: 'success',
          title: 'Body Recomposition läuft! 🎯',
          message: `Bauch: ${Math.abs(bellyChange).toFixed(1)}cm weniger, Brust stabil - du baust Fett ab und hältst Muskeln!`,
          icon: '🎯',
          data: { bellyChange, chestChange, waistChange }
        };
      }
    }

    return this.analyzeMeasurementProgress(); // Fallback to basic analysis
  }

  // NEW: Nutrition timing optimization
  private analyzeNutritionTiming(): CoachInsight | null {
    const recentMeals = this.data.meals.slice(-21); // 3 weeks
    if (recentMeals.length < 10) return null;

    // Analyze meal timing patterns
    const mealTimes = recentMeals.map(meal => {
      const hour = new Date(meal.created_at).getHours();
      return { hour, type: meal.meal_type, calories: meal.calories };
    });

    const breakfastMeals = mealTimes.filter(m => m.hour >= 6 && m.hour <= 10);
    const lateMeals = mealTimes.filter(m => m.hour >= 20);
    
    if (lateMeals.length > breakfastMeals.length) {
      return {
        type: 'info',
        title: 'Meal-Timing optimieren! ⏰',
        message: `Mehr späte Mahlzeiten (${lateMeals.length}) als Frühstück (${breakfastMeals.length}). Früher essen kann Stoffwechsel ankurbeln.`,
        icon: '🍽️',
        data: { breakfastCount: breakfastMeals.length, lateCount: lateMeals.length }
      };
    }

    return null;
  }

  // NEW: Goal-specific coaching
  private generateGoalSpecificInsight(): CoachInsight | null {
    if (!this.data.profile || !this.data.goals) return null;

    const goal = this.data.profile.goal || 'maintain';
    const currentWeight = this.data.weight[0]?.weight;
    const targetWeight = this.data.profile.target_weight;

    if (goal === 'lose' && currentWeight && targetWeight) {
      const remaining = currentWeight - targetWeight;
      const recentTrend = this.getRecentWeightTrend(14);
      
      if (remaining > 0 && recentTrend.length >= 3) {
        const weeklyRate = (recentTrend[0] - recentTrend[recentTrend.length - 1]) / (recentTrend.length / 7);
        const weeksToGoal = weeklyRate !== 0 ? Math.abs(remaining / weeklyRate) : 0;

        if (weeksToGoal > 0 && weeksToGoal < 52) {
          return {
            type: 'info',
            title: 'Ziel-Prognose aktualisiert! 🎯',
            message: `Noch ${remaining.toFixed(1)}kg bis zum Ziel. Bei aktuellem Tempo: ${Math.ceil(weeksToGoal)} Wochen. ${weeksToGoal <= 12 ? 'Sehr realistisch!' : 'Geduld zahlt sich aus.'}`,
            icon: '📅',
            data: { remaining, weeksToGoal, weeklyRate }
          };
        }
      }
    }

    return null;
  }

  // NEW: Adaptive motivation based on user data
  private generateAdaptiveMotivation(): CoachInsight | null {
    const recentWorkouts = this.data.workouts.slice(-7).filter(w => w.did_workout).length;
    const recentMeasurements = this.data.measurements.length;
    const consistencyScore = (recentWorkouts * 2 + Math.min(recentMeasurements, 4)) / 10;

    if (consistencyScore >= 0.7) {
      return {
        type: 'motivation',
        title: 'Transformation-Modus: AKTIV! 🚀',
        message: `Konsistenz-Score: ${Math.round(consistencyScore * 100)}%! Du entwickelst echte Gewohnheiten. Jetzt kommen die sichtbaren Resultate!`,
        icon: '🚀'
      };
    } else if (consistencyScore >= 0.4) {
      return {
        type: 'motivation',
        title: 'Auf dem richtigen Weg! 🌟',
        message: 'Kleine tägliche Schritte führen zu großen Veränderungen. Du bist näher am Ziel als du denkst!',
        icon: '🌟'
      };
    } else {
      return {
        type: 'motivation',
        title: 'Neustart-Energie! 💫',
        message: 'Jeder Tag ist eine neue Chance. Ein kleiner Schritt heute ist besser als kein Schritt. Du schaffst das!',
        icon: '💫'
      };
    }
  }

  // Helper method for correlation data
  private getCorrelationData(days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const workouts = this.data.workouts.filter(w => new Date(w.date) >= cutoff);
    const sleepData = this.data.sleepData.filter(s => new Date(s.date) >= cutoff);

    return workouts.map(workout => {
      const matchingSleep = sleepData.find(s => s.date === workout.date);
      return {
        date: workout.date,
        workout: workout.did_workout,
        intensity: workout.intensity || 0,
        sleepQuality: matchingSleep?.sleep_quality || 3,
        sleepHours: matchingSleep?.sleep_hours || 7
      };
    });
  }

  // Helper methods
  private getRecentWeightTrend(days: number): number[] {
    return this.data.weight
      .slice(-days)
      .map(w => w.weight)
      .filter(w => w !== null);
  }

  private getRecentMeasurements(days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return this.data.measurements
      .filter(m => new Date(m.date) >= cutoff)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private isMeasurementDecreasing(measurements: any[], field: string): boolean {
    if (measurements.length < 2) return false;
    
    const values = measurements
      .map(m => m[field])
      .filter(v => v !== null && v !== undefined);
    
    if (values.length < 2) return false;
    
    return values[0] < values[values.length - 1];
  }

  private getMeasurementChange(measurements: any[], field: string): number {
    if (measurements.length < 2) return 0;
    
    const values = measurements
      .map(m => m[field])
      .filter(v => v !== null && v !== undefined);
    
    if (values.length < 2) return 0;
    
    return values[0] - values[values.length - 1];
  }
}

export async function loadTransformationData(userId: string): Promise<TransformationData> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [workouts, sleepData, measurements, meals, weight, goals, profile] = await Promise.all([
    supabase.from('workouts').select('*').eq('user_id', userId).gte('date', thirtyDaysAgo.toISOString().split('T')[0]).order('date', { ascending: false }),
    supabase.from('sleep_tracking').select('*').eq('user_id', userId).gte('date', thirtyDaysAgo.toISOString().split('T')[0]).order('date', { ascending: false }),
    supabase.from('body_measurements').select('*').eq('user_id', userId).gte('date', thirtyDaysAgo.toISOString().split('T')[0]).order('date', { ascending: false }),
    supabase.from('meals').select('*').eq('user_id', userId).gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: false }),
    supabase.from('weight_history').select('*').eq('user_id', userId).gte('date', thirtyDaysAgo.toISOString().split('T')[0]).order('date', { ascending: false }),
    supabase.from('daily_goals').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()
  ]);

  // Enhanced: Calculate intelligent calories if we have profile data
  let calorieInsights: CalorieCalculationResult | undefined;
  if (profile.data && profile.data.weight && profile.data.height && profile.data.age && profile.data.gender) {
    try {
      calorieInsights = await intelligentCalorieCalculator.calculateIntelligentCalories(userId, {
        weight: profile.data.weight,
        height: profile.data.height,
        age: profile.data.age,
        gender: profile.data.gender as 'male' | 'female',
        activityLevel: profile.data.activity_level || 'moderate',
        goal: (profile.data.goal || 'maintain') as 'lose' | 'maintain' | 'gain',
        calorieDeficit: goals.data?.calorie_deficit || 300
      });
    } catch (error) {
      console.error('Error calculating intelligent calories:', error);
    }
  }

  return {
    workouts: workouts.data || [],
    sleepData: sleepData.data || [],
    measurements: measurements.data || [],
    meals: meals.data || [],
    weight: weight.data || [],
    goals: goals.data,
    profile: profile.data,
    calorieInsights
  };
}