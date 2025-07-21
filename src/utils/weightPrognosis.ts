
export interface WeightPrognosisData {
  profileData: {
    weight: number;
    target_weight: number;
  } | null;
  dailyGoals: {
    tdee: number;
  } | null;
  averageCalorieIntake: number;
  workoutsPerWeek: number;
  averageSleepHours: number;
  weightTrend: number; // kg/month based on history
  consistencyScore: number; // 0-1 score
}

export interface WeightPrognosis {
  type: 'loss' | 'gain' | 'maintain' | 'warning';
  daysToTarget?: number;
  weeksToTarget?: number;
  monthsToTarget?: number;
  targetDate?: string;
  weightDifference?: number;
  dailyCalorieBalance?: number;
  message?: string;
  suggestion?: string;
  confidence?: 'low' | 'medium' | 'high';
  timeDisplay?: string;
  factors?: {
    calories: string;
    activity: string;
    sleep: string;
    consistency: string;
  };
}

export const calculateWeightPrognosis = ({
  profileData,
  dailyGoals,
  averageCalorieIntake,
  workoutsPerWeek,
  averageSleepHours,
  weightTrend,
  consistencyScore
}: WeightPrognosisData): WeightPrognosis | null => {
  if (!profileData?.target_weight || !profileData?.weight || !dailyGoals?.tdee || !averageCalorieIntake) {
    return null;
  }

  const currentWeight = profileData.weight;
  const targetWeight = profileData.target_weight;
  const weightDifference = Math.abs(targetWeight - currentWeight);
  const dailyCalorieBalance = averageCalorieIntake - dailyGoals.tdee;
  const caloriesPerKg = 7700;
  
  // Calculate base days from calorie theory
  let baseDaysToTarget = 0;
  let prognosisType: 'loss' | 'gain' | 'maintain' | 'warning' = 'maintain';
  
  if (targetWeight < currentWeight) {
    prognosisType = 'loss';
    if (dailyCalorieBalance < 0) {
      const dailyWeightLoss = Math.abs(dailyCalorieBalance) / caloriesPerKg;
      baseDaysToTarget = weightDifference / dailyWeightLoss;
    } else {
      return {
        type: 'warning',
        message: 'Aktuelle Kalorienzufuhr führt zur Gewichtszunahme',
        suggestion: `Reduziere um ${Math.round(dailyCalorieBalance + 300)} kcal/Tag`,
        confidence: 'high'
      };
    }
  } else if (targetWeight > currentWeight) {
    prognosisType = 'gain';
    if (dailyCalorieBalance > 0) {
      const dailyWeightGain = dailyCalorieBalance / caloriesPerKg;
      baseDaysToTarget = weightDifference / dailyWeightGain;
    } else {
      return {
        type: 'warning',
        message: 'Aktuelle Kalorienzufuhr führt zur Gewichtsabnahme',
        suggestion: `Erhöhe um ${Math.round(Math.abs(dailyCalorieBalance) + 300)} kcal/Tag`,
        confidence: 'high'
      };
    }
  } else {
    return {
      type: 'maintain',
      message: 'Zielgewicht erreicht!',
      suggestion: 'Halte deine aktuelle Kalorienzufuhr bei',
      confidence: 'high'
    };
  }

  // Apply real-world factors
  let adjustedDaysToTarget = baseDaysToTarget;
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  
  // Factor 1: Workout frequency (more workouts = faster progress)
  const workoutFactor = Math.max(0.8, Math.min(1.2, 1 + (workoutsPerWeek - 3) * 0.05));
  adjustedDaysToTarget = adjustedDaysToTarget / workoutFactor;
  
  // Factor 2: Sleep quality (poor sleep = slower metabolism)
  const sleepFactor = averageSleepHours >= 7 ? 1.0 : 
                     averageSleepHours >= 6 ? 0.95 : 
                     averageSleepHours >= 5 ? 0.9 : 0.85;
  adjustedDaysToTarget = adjustedDaysToTarget / sleepFactor;
  
  // Factor 3: Weight trend (if available, use real trend)
  if (weightTrend !== 0) {
    const trendBasedDays = Math.abs(weightDifference / (weightTrend / 30)); // trend is per month
    // Blend calorie theory with real trend (weighted average)
    adjustedDaysToTarget = (adjustedDaysToTarget * 0.3) + (trendBasedDays * 0.7);
  }
  
  // Factor 4: Consistency score affects confidence
  if (consistencyScore >= 0.8) {
    confidence = 'high';
  } else if (consistencyScore >= 0.6) {
    confidence = 'medium';
  } else {
    confidence = 'low';
    adjustedDaysToTarget = adjustedDaysToTarget * 1.2; // Less consistent = slower progress
  }
  
  // Ensure realistic bounds
  adjustedDaysToTarget = Math.max(7, Math.min(365 * 2, adjustedDaysToTarget)); // Min 1 week, max 2 years
  
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + adjustedDaysToTarget);
  
  const daysToTarget = Math.round(adjustedDaysToTarget);
  const weeksToTarget = Math.round(daysToTarget / 7);
  const monthsToTarget = Math.round(daysToTarget / 30);
  
  // Dynamic time display
  let timeDisplay = '';
  if (daysToTarget < 21) {
    timeDisplay = `${daysToTarget} Tage`;
  } else if (daysToTarget < 90) {
    timeDisplay = `${weeksToTarget} Wochen`;
  } else {
    timeDisplay = `${monthsToTarget} Monate`;
  }
  
  // Generate factor analysis
  const factors = {
    calories: dailyCalorieBalance < 0 ? 'Gutes Kaloriendefizit' : 
             dailyCalorieBalance > 0 ? 'Kalorienüberschuss' : 'Ausgeglichen',
    activity: workoutsPerWeek >= 4 ? 'Sehr aktiv' :
             workoutsPerWeek >= 2 ? 'Moderat aktiv' : 'Wenig aktiv',
    sleep: averageSleepHours >= 7 ? 'Ausreichend Schlaf' :
           averageSleepHours >= 6 ? 'Okay' : 'Zu wenig Schlaf',
    consistency: consistencyScore >= 0.8 ? 'Sehr konsistent' :
                consistencyScore >= 0.6 ? 'Moderat konsistent' : 'Unregelmäßig'
  };

  return {
    type: prognosisType,
    daysToTarget,
    weeksToTarget,
    monthsToTarget,
    targetDate: targetDate.toLocaleDateString('de-DE'),
    weightDifference,
    dailyCalorieBalance,
    confidence,
    timeDisplay,
    factors
  };
};
