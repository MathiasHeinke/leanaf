/**
 * Supplement Safety Checker for Lucy's Enhanced Coaching
 * Checks supplement stacks against safe/caution/banned lists
 */

const SAFE_SUPPLEMENTS = [
  'vitamin d', 'magnesium', 'creatin', 'omega-3', 'ashwagandha',
  'vitamin b12', 'eisen', 'zink', 'vitamin c', 'folsäure',
  'probiotika', 'kurkuma', 'spirulina', 'chlorella'
];

const CAUTION_SUPPLEMENTS = [
  'niacin', 'yohimbin', 'koffein', 'vitamin a', 'eisen >45mg', 'zink >40mg'
];

const BANNED_SUPPLEMENTS = [
  'dmaa', 'sarm', 'clenbuterol', 'ephedrin', 'dnp', 'sibutramin'
];

export type SafetyLevel = 'safe' | 'caution' | 'banned';

export function checkSupplementStack(supplements: string[]): SafetyLevel {
  const lowerSupps = supplements.map(s => s.toLowerCase());
  
  // Check for banned substances first
  if (lowerSupps.some(supp => 
    BANNED_SUPPLEMENTS.some(banned => supp.includes(banned))
  )) {
    return 'banned';
  }
  
  // Check for caution substances
  if (lowerSupps.some(supp => 
    CAUTION_SUPPLEMENTS.some(caution => supp.includes(caution.split(' ')[0]))
  )) {
    return 'caution';
  }
  
  return 'safe';
}

export function generateSupplementAdvice(level: SafetyLevel, supplements: string[]): string {
  switch (level) {
    case 'banned':
      return '⚠️ WARNUNG: Dein Stack enthält problematische Substanzen. Bitte lass uns das nochmal durchgehen.';
    case 'caution':
      return '⚡ Vorsicht: Einige Supplements brauchen Aufmerksamkeit bei Dosierung. Lass uns das optimieren.';
    case 'safe':
      return '✅ Dein Supplement-Stack sieht grundsätzlich gut aus! Balance ist key.';
    default:
      return '';
  }
}