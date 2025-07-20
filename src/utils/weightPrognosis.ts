
export interface WeightPrognosisData {
  profileData: {
    weight: number;
    target_weight: number;
  } | null;
  dailyGoals: {
    tdee: number;
  } | null;
  averageCalorieIntake: number;
}

export interface WeightPrognosis {
  type: 'loss' | 'gain' | 'maintain' | 'warning';
  daysToTarget?: number;
  monthsToTarget?: number;
  targetDate?: string;
  weightDifference?: number;
  dailyCalorieBalance?: number;
  message?: string;
  suggestion?: string;
}

export const calculateWeightPrognosis = ({
  profileData,
  dailyGoals,
  averageCalorieIntake
}: WeightPrognosisData): WeightPrognosis | null => {
  if (!profileData?.target_weight || !profileData?.weight || !dailyGoals?.tdee || !averageCalorieIntake) {
    return null;
  }

  const currentWeight = profileData.weight;
  const targetWeight = profileData.target_weight;
  const weightDifference = Math.abs(targetWeight - currentWeight);
  const dailyCalorieBalance = averageCalorieIntake - dailyGoals.tdee;
  const caloriesPerKg = 7700;
  
  let daysToTarget = 0;
  let prognosisType: 'loss' | 'gain' | 'maintain' | 'warning' = 'maintain';
  
  if (targetWeight < currentWeight) {
    prognosisType = 'loss';
    if (dailyCalorieBalance < 0) {
      const dailyWeightLoss = Math.abs(dailyCalorieBalance) / caloriesPerKg;
      daysToTarget = weightDifference / dailyWeightLoss;
    } else {
      return {
        type: 'warning',
        message: 'Aktuelle Kalorienzufuhr führt zur Gewichtszunahme',
        suggestion: `Reduziere um ${Math.round(dailyCalorieBalance + 300)} kcal/Tag`
      };
    }
  } else if (targetWeight > currentWeight) {
    prognosisType = 'gain';
    if (dailyCalorieBalance > 0) {
      const dailyWeightGain = dailyCalorieBalance / caloriesPerKg;
      daysToTarget = weightDifference / dailyWeightGain;
    } else {
      return {
        type: 'warning',
        message: 'Aktuelle Kalorienzufuhr führt zur Gewichtsabnahme',
        suggestion: `Erhöhe um ${Math.round(Math.abs(dailyCalorieBalance) + 300)} kcal/Tag`
      };
    }
  } else {
    return {
      type: 'maintain',
      message: 'Zielgewicht erreicht!',
      suggestion: 'Halte deine aktuelle Kalorienzufuhr bei'
    };
  }

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysToTarget);
  const monthsToTarget = Math.ceil(daysToTarget / 30);

  return {
    type: prognosisType,
    daysToTarget: Math.round(daysToTarget),
    monthsToTarget,
    targetDate: targetDate.toLocaleDateString('de-DE'),
    weightDifference,
    dailyCalorieBalance
  };
};
