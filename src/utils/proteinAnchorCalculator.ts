/**
 * Protein Anchor Calculator
 * 
 * Replaces percentage-based macro strategies with biologically correct
 * g/kg body weight calculations. Includes "Carb Floor" to prevent
 * metabolic crashes (headaches) on GLP-1/GIP protocols like Retatrutide.
 */

export type ProtocolIntensity = 'rookie' | 'warrior' | 'elite';

export interface MacroResult {
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  proteinPercent: number;
  carbPercent: number;
  fatPercent: number;
  warnings: string[];
}

// g/kg body weight per intensity level
const PROTEIN_PER_KG: Record<ProtocolIntensity, number> = {
  rookie: 1.2,   // Start phase, getting stomach used to protein
  warrior: 2.0,  // Active protocol (Reta/Sema), recomposition
  elite: 2.5,    // Advanced, aggressive shredding
};

// Safety thresholds
const CARB_FLOOR_GRAMS = 120;  // Minimum for brain function, prevents headaches
const MIN_FAT_PER_KG = 0.6;    // Minimum for hormonal health

/**
 * Calculate macros using Protein Anchor logic
 * 
 * @param intensity - Protocol intensity level (rookie/warrior/elite)
 * @param weightKg - User's body weight in kg
 * @param targetCalories - Daily calorie target
 * @returns MacroResult with grams, percentages, and any warnings
 */
/**
 * Calculate macros using Protein Anchor logic
 * 
 * @param intensity - Protocol intensity level (rookie/warrior/elite)
 * @param weightKg - User's body weight in kg
 * @param targetCalories - Daily calorie target
 * @param proteinBoostPerKg - Additional g/kg from Protocol Mode (Enhanced/Clinical)
 * @returns MacroResult with grams, percentages, and any warnings
 */
export function calculateProteinAnchorMacros(
  intensity: ProtocolIntensity,
  weightKg: number,
  targetCalories: number,
  proteinBoostPerKg: number = 0
): MacroResult {
  const warnings: string[] = [];
  
  // Ensure valid inputs
  const safeWeight = Math.max(40, weightKg || 80);
  const safeCalories = Math.max(1000, targetCalories || 2000);
  const safeBoost = Math.max(0, Math.min(0.5, proteinBoostPerKg)); // Cap at 0.5g/kg
  
  // 1. Protein Anchor (fixed based on body weight) + Protocol Boost
  // Example: Warrior (2.0g/kg) + TRT Boost (0.2g/kg) = 2.2g/kg effective
  let proteinGrams = Math.round(safeWeight * (PROTEIN_PER_KG[intensity] + safeBoost));
  let proteinCalories = proteinGrams * 4;
  
  // 2. Safety check: Protein should not exceed 50% of calories
  if (proteinCalories > safeCalories * 0.5) {
    proteinGrams = Math.round((safeCalories * 0.5) / 4);
    proteinCalories = proteinGrams * 4;
    warnings.push('Protein wurde begrenzt - Kalorienziel zu niedrig');
  }
  
  let remainingCalories = safeCalories - proteinCalories;
  
  // 3. Carb Floor (Headache Prevention for Warrior/Elite)
  let carbGrams: number;
  if (intensity === 'warrior' || intensity === 'elite') {
    // Ensure minimum carbs for brain function + proportional allocation
    carbGrams = Math.max(CARB_FLOOR_GRAMS, Math.round((remainingCalories * 0.4) / 4));
  } else {
    // Rookie: 50/50 split for flexibility and stomach adaptation
    carbGrams = Math.round((remainingCalories * 0.5) / 4);
  }
  
  const carbCalories = carbGrams * 4;
  remainingCalories -= carbCalories;
  
  // 4. Rest goes to Fat
  let fatGrams = Math.max(0, Math.round(remainingCalories / 9));
  
  // 5. Minimum Fat for hormonal health
  const minFat = Math.round(safeWeight * MIN_FAT_PER_KG);
  if (fatGrams < minFat) {
    fatGrams = minFat;
    // Reduce carbs to make room for minimum fat
    const fatCaloriesNeeded = fatGrams * 9;
    const remainingForCarbs = safeCalories - proteinCalories - fatCaloriesNeeded;
    carbGrams = Math.max(CARB_FLOOR_GRAMS, Math.round(remainingForCarbs / 4));
    warnings.push('Fett wurde erhöht für Hormonbalance');
  }
  
  // Calculate percentages (for DB compatibility and display)
  const totalCalories = proteinGrams * 4 + carbGrams * 4 + fatGrams * 9;
  
  return {
    proteinGrams,
    carbGrams,
    fatGrams,
    proteinPercent: Math.round((proteinGrams * 4 / totalCalories) * 100),
    carbPercent: Math.round((carbGrams * 4 / totalCalories) * 100),
    fatPercent: Math.round((fatGrams * 9 / totalCalories) * 100),
    warnings
  };
}

/**
 * Get display info for a protocol intensity
 */
export function getIntensityInfo(intensity: ProtocolIntensity) {
  const info = {
    rookie: {
      emoji: '🌱',
      label: 'ROOKIE',
      proteinPerKg: '1.2g/kg',
      description: 'Startphase. Magen an Protein gewöhnen.',
      color: 'emerald'
    },
    warrior: {
      emoji: '⚔️',
      label: 'WARRIOR',
      proteinPerKg: '2.0g/kg',
      description: 'Rekomposition. Maximaler Muskelschutz + stabiler Blutzucker.',
      color: 'amber',
      recommended: true
    },
    elite: {
      emoji: '🏆',
      label: 'ELITE',
      proteinPerKg: '2.5g/kg',
      description: 'Profi-Defizit. Aggressive Trockenlegung.',
      color: 'purple'
    }
  };
  
  return info[intensity];
}

/**
 * Check if a macro_strategy value is a valid ProtocolIntensity
 */
export function isProtocolIntensity(value: string): value is ProtocolIntensity {
  return ['rookie', 'warrior', 'elite'].includes(value);
}

/**
 * Convert legacy macro strategy to ProtocolIntensity
 * Maps old percentage-based strategies to the new system
 */
export function mapLegacyStrategy(legacyStrategy: string): ProtocolIntensity {
  // High protein strategies map to warrior
  if (legacyStrategy === 'high_protein' || legacyStrategy === 'zone_balanced') {
    return 'warrior';
  }
  // Low carb/keto strategies map to elite (aggressive)
  if (legacyStrategy === 'low_carb' || legacyStrategy === 'keto') {
    return 'elite';
  }
  // Everything else defaults to warrior (safest option)
  return 'warrior';
}
