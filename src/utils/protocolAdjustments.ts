/**
 * Protocol Adjustments Calculator
 * 
 * Provides adjustment factors based on the user's Protocol Mode
 * (Natural, Enhanced, Clinical). These adjustments affect:
 * - Maximum sustainable daily deficit (Dual-Cap: percentage + hard cap)
 * - Realism score multiplier (pharmacological support increases sustainability)
 * - Protein boost (enhanced protein synthesis on TRT)
 * - Absolute protein recommendation per kg
 */

export type ProtocolMode = 'natural' | 'enhanced' | 'clinical';

export interface ProtocolAdjustments {
  /** Maximum deficit as percentage of TDEE (e.g., 0.20 = 20%) */
  maxDeficitPercent: number;
  /** Hard cap for maximum daily deficit in kcal */
  maxDeficitKcal: number;
  /** Multiplier for realism score (1.0 = no change) */
  realismMultiplier: number;
  /** Additional g/kg protein boost */
  proteinBoost: number;
  /** Absolute protein recommendation in g/kg */
  proteinPerKg: number;
  /** User-facing hint explaining the mode */
  hint: string;
  /** Whether any pharmacological support is active */
  hasPharmSupport: boolean;
}

/**
 * Calculate protocol adjustments based on active modes
 * 
 * Scientific basis:
 * - Natural: Max 20% deficit to prevent hormonal crash (cortisol/testosterone)
 * - GLP-1/Reta: Increases satiety, allows 30% deficit safely
 * - TRT: Maximizes protein synthesis, protects muscle at 40% deficit
 * - Combination: 45% deficit possible with full pharmacological support
 * 
 * @param modes - Array of active protocol modes
 * @returns ProtocolAdjustments object with all factors
 */
export function getProtocolAdjustments(modes: ProtocolMode[]): ProtocolAdjustments {
  const hasEnhanced = modes.includes('enhanced');
  const hasClinical = modes.includes('clinical');
  
  // Combined: Enhanced + Clinical (Reta + TRT)
  if (hasEnhanced && hasClinical) {
    return {
      maxDeficitPercent: 0.45,
      maxDeficitKcal: 1400,
      realismMultiplier: 1.5,
      proteinBoost: 0.5,
      proteinPerKg: 2.5,
      hint: 'Reta + TRT: Maximale Rekomposition möglich',
      hasPharmSupport: true,
    };
  }
  
  // Clinical only (TRT)
  if (hasClinical) {
    return {
      maxDeficitPercent: 0.40,
      maxDeficitKcal: 1200,
      realismMultiplier: 1.3,
      proteinBoost: 0.3,
      proteinPerKg: 2.5,
      hint: 'TRT: Muskelschutz erlaubt aggressives Defizit',
      hasPharmSupport: true,
    };
  }
  
  // Enhanced only (GLP-1/Retatrutide)
  if (hasEnhanced) {
    return {
      maxDeficitPercent: 0.30,
      maxDeficitKcal: 900,
      realismMultiplier: 1.25,
      proteinBoost: 0.2,
      proteinPerKg: 2.2,
      hint: 'GLP-1: Bis 30% Defizit sicher möglich',
      hasPharmSupport: true,
    };
  }
  
  // Natural (default)
  return {
    maxDeficitPercent: 0.20,
    maxDeficitKcal: 600,
    realismMultiplier: 1.0,
    proteinBoost: 0,
    proteinPerKg: 2.0,
    hint: 'Natural: Max 20% Defizit empfohlen',
    hasPharmSupport: false,
  };
}

/**
 * Calculate effective max deficit using the Dual-Cap System
 * Takes the minimum of percentage-based and hard cap limits
 * 
 * This protects smaller individuals from excessive deficits:
 * - 60kg person at 1800 TDEE: Natural max = min(360, 600) = 360 kcal
 * - 100kg person at 3000 TDEE: Natural max = min(600, 600) = 600 kcal
 * 
 * @param tdee - User's Total Daily Energy Expenditure
 * @param adjustments - Protocol adjustments with limits
 * @returns Effective maximum deficit in kcal
 */
export function calculateEffectiveMaxDeficit(
  tdee: number,
  adjustments: ProtocolAdjustments
): number {
  const percentBasedLimit = Math.round(tdee * adjustments.maxDeficitPercent);
  return Math.min(percentBasedLimit, adjustments.maxDeficitKcal);
}

/**
 * Get deficit status color based on protocol limits
 * 
 * @param deficit - Current daily deficit in kcal
 * @param maxDeficit - Maximum recommended deficit for protocol
 * @returns CSS color class string
 */
export function getDeficitStatusColor(deficit: number, maxDeficit: number): string {
  if (deficit <= maxDeficit * 0.7) return 'text-green-500';
  if (deficit <= maxDeficit) return 'text-amber-500';
  return 'text-red-500';
}

/**
 * Check if deficit exceeds protocol recommendation
 */
export function isDeficitExceeded(deficit: number, maxDeficit: number): boolean {
  return deficit > maxDeficit;
}
