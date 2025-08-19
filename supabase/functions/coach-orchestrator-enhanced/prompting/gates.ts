// Goal Recall Gate: Only show goals when relevant
export function shouldRecallGoals({
  userMsg,
  metrics
}: {
  userMsg: string;
  metrics?: { 
    kcalDeviation?: number; 
    missedMissions?: number; 
    dailyReview?: boolean;
  };
}): boolean {
  if (!userMsg && !metrics) return false;

  // Text triggers
  const hasGoalKeywords = /(ziel|deadline|plan|block|review|zielgewicht|termin|fortschritt|target)/i.test(userMsg || '');
  
  // Metric triggers
  const hasHighDeviation = (metrics?.kcalDeviation ?? 0) > 300;
  const hasMissedMissions = (metrics?.missedMissions ?? 0) >= 2;
  const isDailyReview = metrics?.dailyReview === true;
  
  return hasGoalKeywords || hasHighDeviation || hasMissedMissions || isDailyReview;
}

export function shouldRequestData(userMsg: string): string[] {
  const gaps: string[] = [];
  
  if (/(gewicht|kg|bmi|wiegen)/i.test(userMsg)) {
    gaps.push('weight');
  }
  if (/(schlaf|müde|energy|energie)/i.test(userMsg)) {
    gaps.push('sleep');
  }
  if (/(training|workout|kraft|sets)/i.test(userMsg)) {
    gaps.push('workout');
  }
  if (/(essen|kalorien|makros|protein)/i.test(userMsg)) {
    gaps.push('nutrition');
  }
  
  return gaps;
}