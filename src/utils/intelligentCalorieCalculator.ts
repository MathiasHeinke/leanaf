import { supabase } from '@/integrations/supabase/client';

export interface CalorieCalculationResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  confidence: 'low' | 'medium' | 'high';
  dataQuality: {
    hasWeightHistory: boolean;
    hasMealData: boolean;
    hasWorkoutData: boolean;
    hasSleepData: boolean;
    daysOfData: number;
  };
  recommendations?: string[];
  metabolicAdaptation?: number;
}

interface UserData {
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female';
  activityLevel: string;
  goal: 'lose' | 'maintain' | 'gain';
  calorieDeficit: number;
}

interface HistoricalData {
  weightHistory: Array<{ date: string; weight: number }>;
  mealHistory: Array<{ date: string; calories: number }>;
  workoutHistory: Array<{ date: string; duration_minutes?: number; workout_type: string }>;
  sleepHistory: Array<{ date: string; sleep_hours?: number; sleep_quality?: number }>;
}

export class IntelligentCalorieCalculator {
  
  /**
   * Phase 1: Baseline calculation with minimal data
   */
  private calculateBaselineBMR(userData: UserData): number {
    const { weight, height, age, gender } = userData;
    
    // Mifflin-St Jeor Equation
    if (gender === 'male') {
      return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
  }

  private getActivityMultiplier(activityLevel: string, hasWorkoutData: boolean = false, avgWorkoutsPerWeek: number = 0): number {
    const baseMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };

    let multiplier = baseMultipliers[activityLevel as keyof typeof baseMultipliers] || 1.55;

    // Adjust based on actual workout data if available
    if (hasWorkoutData && avgWorkoutsPerWeek > 0) {
      const workoutBonus = Math.min(avgWorkoutsPerWeek * 0.05, 0.3); // Max 30% bonus
      multiplier += workoutBonus;
    }

    return multiplier;
  }

  /**
   * Phase 2: Enhanced calculation with historical data
   */
  private async calculateActualTDEE(userData: UserData, historicalData: HistoricalData): Promise<number | null> {
    const { weightHistory, mealHistory } = historicalData;
    
    if (weightHistory.length < 7 || mealHistory.length < 7) {
      return null; // Need at least a week of data
    }

    // Calculate average daily calorie intake
    const avgCaloriesPerDay = mealHistory.reduce((sum, meal) => sum + meal.calories, 0) / mealHistory.length;
    
    // Calculate weight change over time
    const firstWeight = weightHistory[0].weight;
    const lastWeight = weightHistory[weightHistory.length - 1].weight;
    const weightChange = lastWeight - firstWeight; // negative = weight loss
    const daysElapsed = Math.max(1, weightHistory.length);

    // 1 kg fat = ~7700 kcal
    const calorieDeficitFromWeightChange = (weightChange * -7700) / daysElapsed;
    
    // Actual TDEE = calories eaten + calorie deficit from weight change
    const actualTDEE = avgCaloriesPerDay + calorieDeficitFromWeightChange;

    return Math.max(1000, Math.min(4000, actualTDEE)); // Reasonable bounds
  }

  /**
   * Phase 3: Detect metabolic adaptation
   */
  private calculateMetabolicAdaptation(userData: UserData, actualTDEE: number): number {
    const baselineTDEE = this.calculateBaselineBMR(userData) * this.getActivityMultiplier(userData.activityLevel);
    
    if (actualTDEE < baselineTDEE * 0.8) {
      // Significant metabolic slowdown detected
      return (baselineTDEE - actualTDEE) / baselineTDEE;
    }
    
    return 0;
  }

  /**
   * Analyze sleep impact on metabolism
   */
  private analyzeSleepImpact(sleepHistory: Array<{ sleep_hours?: number; sleep_quality?: number }>): number {
    if (sleepHistory.length === 0) return 1.0;

    const avgSleepHours = sleepHistory
      .filter(s => s.sleep_hours)
      .reduce((sum, s) => sum + (s.sleep_hours || 0), 0) / sleepHistory.length || 7;

    const avgSleepQuality = sleepHistory
      .filter(s => s.sleep_quality)
      .reduce((sum, s) => sum + (s.sleep_quality || 5), 0) / sleepHistory.length || 5;

    // Poor sleep reduces metabolism by up to 10%
    let sleepMultiplier = 1.0;
    
    if (avgSleepHours < 6) {
      sleepMultiplier -= 0.1; // 10% reduction
    } else if (avgSleepHours < 7) {
      sleepMultiplier -= 0.05; // 5% reduction
    }

    if (avgSleepQuality < 3) {
      sleepMultiplier -= 0.05; // Additional 5% for poor quality
    }

    return Math.max(0.8, sleepMultiplier);
  }

  /**
   * Main calculation function
   */
  async calculateIntelligentCalories(userId: string, userData: UserData): Promise<CalorieCalculationResult> {
    // Fetch historical data
    const historicalData = await this.fetchHistoricalData(userId);
    
    // Analyze data quality
    const dataQuality = {
      hasWeightHistory: historicalData.weightHistory.length > 0,
      hasMealData: historicalData.mealHistory.length > 0,
      hasWorkoutData: historicalData.workoutHistory.length > 0,
      hasSleepData: historicalData.sleepHistory.length > 0,
      daysOfData: Math.max(
        historicalData.weightHistory.length,
        historicalData.mealHistory.length,
        historicalData.workoutHistory.length
      )
    };

    // Phase 1: Baseline calculation
    const baselineBMR = this.calculateBaselineBMR(userData);
    
    // Calculate average workouts per week if data available
    const avgWorkoutsPerWeek = dataQuality.hasWorkoutData 
      ? (historicalData.workoutHistory.length / Math.max(1, dataQuality.daysOfData / 7))
      : 0;

    let tdee: number;
    let confidence: 'low' | 'medium' | 'high' = 'low';
    let metabolicAdaptation = 0;
    const recommendations: string[] = [];

    // Phase 2: Enhanced calculation if enough data
    const actualTDEE = await this.calculateActualTDEE(userData, historicalData);
    
    if (actualTDEE && dataQuality.daysOfData >= 14) {
      // Use actual TDEE calculation
      tdee = actualTDEE;
      confidence = dataQuality.daysOfData >= 30 ? 'high' : 'medium';
      
      // Phase 3: Check for metabolic adaptation
      metabolicAdaptation = this.calculateMetabolicAdaptation(userData, actualTDEE);
      
      if (metabolicAdaptation > 0.15) {
        recommendations.push('Metabolische Anpassung erkannt - eventuell Diet Break einlegen');
      }
    } else {
      // Fallback to baseline with activity multiplier
      const activityMultiplier = this.getActivityMultiplier(
        userData.activityLevel, 
        dataQuality.hasWorkoutData,
        avgWorkoutsPerWeek
      );
      tdee = baselineBMR * activityMultiplier;
      confidence = dataQuality.hasWorkoutData ? 'medium' : 'low';
    }

    // Apply sleep impact if data available
    if (dataQuality.hasSleepData) {
      const sleepMultiplier = this.analyzeSleepImpact(historicalData.sleepHistory);
      tdee *= sleepMultiplier;
      
      if (sleepMultiplier < 0.95) {
        recommendations.push('Schlafqualität verbessern für besseren Stoffwechsel');
      }
    }

    // Calculate target calories
    const multiplier = userData.goal === 'lose' ? -1 : userData.goal === 'gain' ? 1 : 0;
    const targetCalories = Math.round(tdee + (multiplier * userData.calorieDeficit));

    // Add recommendations based on data quality
    if (!dataQuality.hasWeightHistory) {
      recommendations.push('Regelmäßiges Wiegen für genauere Berechnungen');
    }
    if (!dataQuality.hasMealData) {
      recommendations.push('Mahlzeiten tracken für bessere TDEE-Berechnung');
    }
    if (dataQuality.daysOfData < 14) {
      recommendations.push('Mehr Daten sammeln für präzisere Empfehlungen');
    }

    return {
      bmr: Math.round(baselineBMR),
      tdee: Math.round(tdee),
      targetCalories,
      confidence,
      dataQuality,
      recommendations,
      metabolicAdaptation: metabolicAdaptation > 0 ? metabolicAdaptation : undefined
    };
  }

  private async fetchHistoricalData(userId: string): Promise<HistoricalData> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    try {
      // Fetch weight history
      const { data: weightData } = await supabase
        .from('weight_history')
        .select('date, weight')
        .eq('user_id', userId)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      // Fetch meal history (aggregate by date)
      const { data: mealData } = await supabase
        .from('meals')
        .select('calories, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Fetch workout history
      const { data: workoutData } = await supabase
        .from('workouts')
        .select('date, duration_minutes, workout_type')
        .eq('user_id', userId)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Fetch sleep history  
      const { data: sleepData } = await supabase
        .from('sleep_tracking')
        .select('date, sleep_hours, sleep_quality')
        .eq('user_id', userId)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Aggregate meal data by date
      const mealsByDate = (mealData || []).reduce((acc: Record<string, number>, meal) => {
        const date = meal.created_at.split('T')[0];
        acc[date] = (acc[date] || 0) + (meal.calories || 0);
        return acc;
      }, {});

      const mealHistory = Object.entries(mealsByDate).map(([date, calories]) => ({
        date,
        calories
      }));

      return {
        weightHistory: weightData || [],
        mealHistory,
        workoutHistory: workoutData || [],
        sleepHistory: sleepData || []
      };
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return {
        weightHistory: [],
        mealHistory: [],
        workoutHistory: [],
        sleepHistory: []
      };
    }
  }
}

export const intelligentCalorieCalculator = new IntelligentCalorieCalculator();