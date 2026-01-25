// ARES 3.0 XP Calculator

import { DEFAULT_XP_CONFIG, InteractionData, XPResult } from './types.ts';

/**
 * Calculate XP earned from an ARES interaction
 */
export function calculateInteractionXP(data: InteractionData): XPResult {
  const config = DEFAULT_XP_CONFIG;
  const breakdown: { source: string; amount: number }[] = [];
  
  // Base XP for asking a question
  let baseXP = config.base_question;
  breakdown.push({ source: 'Frage gestellt', amount: config.base_question });
  
  // Bonus for tool usage
  let bonusXP = 0;
  if (data.toolsUsed && data.toolsUsed.length > 0) {
    const toolBonus = data.toolsUsed.length * config.tool_usage;
    bonusXP += toolBonus;
    breakdown.push({ source: `${data.toolsUsed.length}x Tool genutzt`, amount: toolBonus });
  }
  
  // Bonus for bloodwork analysis
  if (data.isBloodworkAnalysis) {
    bonusXP += config.bloodwork_analysis;
    breakdown.push({ source: 'Blutwert-Analyse', amount: config.bloodwork_analysis });
  }
  
  // Bonus for protocol questions
  if (data.isProtocolQuestion) {
    bonusXP += config.protocol_question;
    breakdown.push({ source: 'Protokoll-Frage', amount: config.protocol_question });
  }
  
  // First question of the day bonus
  if (data.isFirstOfDay) {
    bonusXP += config.first_of_day_bonus;
    breakdown.push({ source: 'Erste Frage heute', amount: config.first_of_day_bonus });
  }
  
  // Calculate streak multiplier
  let multiplier = 1.0;
  if (data.streakDays >= 30) {
    multiplier = config.streak_multiplier_30d;
  } else if (data.streakDays >= 14) {
    multiplier = config.streak_multiplier_14d;
  } else if (data.streakDays >= 7) {
    multiplier = config.streak_multiplier_7d;
  } else if (data.streakDays >= 3) {
    multiplier = config.streak_multiplier_3d;
  }
  
  if (multiplier > 1.0) {
    breakdown.push({ source: `${data.streakDays}-Tage Streak (${multiplier}x)`, amount: 0 });
  }
  
  const totalXP = Math.round((baseXP + bonusXP) * multiplier);
  
  return {
    baseXP,
    bonusXP,
    multiplier,
    totalXP,
    breakdown,
  };
}

/**
 * Detect if the message is about bloodwork/lab values
 */
export function isBloodworkRelated(text: string): boolean {
  const bloodworkKeywords = [
    'blutwert', 'blutbild', 'laborwert', 'marker', 'testosteron',
    'oestrogen', 'vitamin d', 'hba1c', 'cholesterin', 'triglyceride',
    'crp', 'ferritin', 'eisen', 'b12', 'schilddruese', 'tsh',
    'leber', 'niere', 'kreatin', 'glucose', 'insulin', 'cortisol',
    'dhea', 'igf', 'homocystein', 'omega', 'bluttest', 'blutuntersuchung'
  ];
  
  const lowerText = text.toLowerCase();
  return bloodworkKeywords.some(kw => lowerText.includes(kw));
}

/**
 * Detect if the message is about longevity protocols
 */
export function isProtocolRelated(text: string): boolean {
  const protocolKeywords = [
    'rapamycin', 'metformin', 'nad', 'nmn', 'nr', 'resveratrol',
    'senolytic', 'fisetin', 'quercetin', 'dasatinib', 'epitalon',
    'peptid', 'bpc', 'tb500', 'gh', 'hgh', 'sarm', 'sirt',
    'autophagie', 'fasten', 'protokoll', 'longevity', 'anti-aging',
    'telomer', 'mitochond', 'stammzell', 'regenerat'
  ];
  
  const lowerText = text.toLowerCase();
  return protocolKeywords.some(kw => lowerText.includes(kw));
}

/**
 * Get the appropriate streak multiplier text for display
 */
export function getStreakMultiplierText(streakDays: number): string | null {
  if (streakDays >= 30) return '2x Streak-Bonus (30+ Tage)';
  if (streakDays >= 14) return '1.75x Streak-Bonus (14+ Tage)';
  if (streakDays >= 7) return '1.5x Streak-Bonus (7+ Tage)';
  if (streakDays >= 3) return '1.25x Streak-Bonus (3+ Tage)';
  return null;
}
