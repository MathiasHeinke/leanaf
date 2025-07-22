
export const calculateMealBonusPoints = (qualityScore?: number): number => {
  if (!qualityScore) return 0;
  
  if (qualityScore >= 8) return 3; // Hervorragend
  if (qualityScore >= 7) return 2; // Sehr gut
  if (qualityScore >= 6) return 1; // Gut
  return 0; // Keine Bonus-Punkte
};

export const getMealPointsIcon = (hasPhoto: boolean): string => {
  return hasPhoto ? "📸" : "📊";
};

export const getMealBasePoints = (hasPhoto: boolean): number => {
  return hasPhoto ? 5 : 3;
};
