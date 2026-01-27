/**
 * Protocol Adjustments Calculator
 * 
 * Provides adjustment factors based on the user's Protocol Mode
 * (Natural, Enhanced, Clinical). These adjustments affect:
 * - Maximum sustainable daily deficit
 * - Realism score multiplier (pharmacological support increases sustainability)
 * - Protein boost (enhanced protein synthesis on TRT)
 */

export type ProtocolMode = 'natural' | 'enhanced' | 'clinical';

export interface ProtocolAdjustments {
  /** Maximum sustainable daily deficit in kcal */
  maxDeficitKcal: number;
  /** Multiplier for realism score (1.0 = no change) */
  realismMultiplier: number;
  /** Additional g/kg protein boost */
  proteinBoost: number;
  /** User-facing hint explaining the mode */
  hint: string;
  /** Whether any pharmacological support is active */
  hasPharmSupport: boolean;
}

/**
 * Calculate protocol adjustments based on active modes
 * 
 * Scientific basis:
 * - GLP-1/Reta increases satiety and protects muscle mass during deficit
 * - TRT maximizes protein synthesis (hence +0.2g/kg usable)
 * - Combination allows aggressive recomposition without muscle loss
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
      maxDeficitKcal: 1000,
      realismMultiplier: 1.5,
      proteinBoost: 0.3,
      hint: 'Reta + TRT: Maximale Rekomposition möglich',
      hasPharmSupport: true,
    };
  }
  
  // Clinical only (TRT)
  if (hasClinical) {
    return {
      maxDeficitKcal: 800,
      realismMultiplier: 1.3,
      proteinBoost: 0.2,
      hint: 'TRT: Optimierter Muskelschutz',
      hasPharmSupport: true,
    };
  }
  
  // Enhanced only (GLP-1/Retatrutide)
  if (hasEnhanced) {
    return {
      maxDeficitKcal: 750,
      realismMultiplier: 1.25,
      proteinBoost: 0.1,
      hint: 'GLP-1: Aggressiveres Defizit möglich',
      hasPharmSupport: true,
    };
  }
  
  // Natural (default)
  return {
    maxDeficitKcal: 500,
    realismMultiplier: 1.0,
    proteinBoost: 0,
    hint: 'Natural: Konservatives Defizit empfohlen',
    hasPharmSupport: false,
  };
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
