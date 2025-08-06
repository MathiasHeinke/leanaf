// Unified realism calculator for transformation goals
export interface TransformationGoals {
  currentWeight: number;
  targetWeight: number;
  currentBodyFat?: number;
  targetBodyFat?: number;
  targetDate: Date;
}

export function calculateRealismScore(goals: TransformationGoals): number {
  const {
    currentWeight,
    targetWeight,
    currentBodyFat = 20, // Default assumption
    targetBodyFat = 15, // Default assumption
    targetDate
  } = goals;

  const weeksToTarget = Math.max(1, Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7)));
  const monthsToTarget = Math.max(0.25, weeksToTarget / 4.33);
  
  const weightChange = Math.abs(targetWeight - currentWeight);
  const bodyFatChange = Math.abs(targetBodyFat - currentBodyFat);
  const isGaining = targetWeight > currentWeight;
  
  // Weight loss/gain rate assessment
  const weeklyWeightRate = weightChange / weeksToTarget;
  let weightScore = 100;
  
  if (!isGaining) {
    // Weight loss standards
    if (weeklyWeightRate > 1.0) {
      weightScore = Math.max(0, 30 - (weeklyWeightRate - 1.0) * 20); // Very unrealistic
    } else if (weeklyWeightRate > 0.75) {
      weightScore = 60; // Very ambitious but possible
    } else if (weeklyWeightRate > 0.5) {
      weightScore = 85; // Ambitious but realistic
    } else {
      weightScore = 100; // Very realistic
    }
  } else {
    // Weight gain - generally more realistic
    if (weeklyWeightRate > 0.5) {
      weightScore = Math.max(40, 80 - (weeklyWeightRate - 0.5) * 60);
    } else {
      weightScore = 95;
    }
  }
  
  // Body fat change assessment
  const monthlyBodyFatRate = bodyFatChange / monthsToTarget;
  let bodyFatScore = 100;
  
  if (monthlyBodyFatRate > 3.0) {
    bodyFatScore = Math.max(0, 20 - (monthlyBodyFatRate - 3.0) * 10); // Nearly impossible
  } else if (monthlyBodyFatRate > 2.0) {
    bodyFatScore = 40; // Very difficult
  } else if (monthlyBodyFatRate > 1.5) {
    bodyFatScore = 70; // Challenging but doable
  } else {
    bodyFatScore = 95; // Realistic
  }
  
  // Timeline assessment
  let timelineScore = 100;
  if (weeksToTarget < 4 && (weightChange > 2 || bodyFatChange > 1)) {
    timelineScore = 20; // Too short for meaningful change
  } else if (weeksToTarget < 8 && (weightChange > 4 || bodyFatChange > 2)) {
    timelineScore = 50; // Very tight timeline
  }
  
  // Combined assessment - body recomposition is harder
  let combinedPenalty = 0;
  if (weightChange > 3 && bodyFatChange > 2) {
    combinedPenalty = 20; // Simultaneous major changes are very difficult
  } else if (weightChange > 1.5 && bodyFatChange > 1) {
    combinedPenalty = 10; // Moderate combined changes
  }
  
  // Final score calculation
  const finalScore = Math.max(0, Math.min(100, 
    (weightScore * 0.4 + bodyFatScore * 0.4 + timelineScore * 0.2) - combinedPenalty
  ));
  
  return Math.round(finalScore);
}

export function getRealismLabel(score: number): string {
  if (score >= 81) return "Realistisch erreichbar - mit konstanter Disziplin";
  if (score >= 61) return "Ambitioniert aber machbar - mit viel Disziplin";
  if (score >= 31) return "Sehr schwer erreichbar - extremer Aufwand nötig";
  return "Unrealistisch/Gefährlich - Ziele anpassen empfohlen";
}

export function getRealismVariant(score: number): 'default' | 'secondary' | 'destructive' {
  if (score >= 61) return 'default';
  if (score >= 31) return 'secondary';
  return 'destructive';
}