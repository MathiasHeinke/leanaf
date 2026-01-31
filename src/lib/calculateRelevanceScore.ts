// =====================================================
// ARES Matrix-Scoring: Relevance Score Calculation Engine (Extended v3)
// =====================================================

import type { 
  RelevanceMatrix, 
  UserRelevanceContext, 
  RelevanceScoreResult,
  SupplementMarkers,
  DynamicTier,
} from '@/types/relevanceMatrix';
import { PEPTIDE_CLASS_LABELS } from '@/types/relevanceMatrix';

/**
 * Determine dynamic tier based on calculated score
 * Essential (≥9.0) | Optimizer (6.0-8.9) | Niche (<6.0)
 */
export function getDynamicTier(score: number): DynamicTier {
  if (score >= 9.0) return 'essential';
  if (score >= 6.0) return 'optimizer';
  return 'niche';
}

/**
 * Dynamic tier configuration for UI
 */
export const DYNAMIC_TIER_CONFIG: Record<DynamicTier, {
  label: string;
  shortLabel: string;
  icon: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  description: string;
}> = {
  essential: {
    label: 'Essential (Must-Have)',
    shortLabel: 'Essential',
    icon: '🚨',
    bgClass: 'bg-green-500/10',
    borderClass: 'border-green-500/30',
    textClass: 'text-green-600 dark:text-green-400',
    description: 'Basierend auf deinem Profil unverzichtbar',
  },
  optimizer: {
    label: 'Optimizer',
    shortLabel: 'Optimizer',
    icon: '🎯',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30',
    textClass: 'text-blue-600 dark:text-blue-400',
    description: 'Starke Empfehlungen für dein Ziel',
  },
  niche: {
    label: 'Optional / Nische',
    shortLabel: 'Nische',
    icon: '💭',
    bgClass: 'bg-muted/50',
    borderClass: 'border-border',
    textClass: 'text-muted-foreground',
    description: 'Situativ oder für Spezialisten',
  },
};

/**
 * Calculate personalized relevance score for a supplement
 * 
 * Logic hierarchy (TRT trumps Enhanced trumps Natural):
 * 1. Phase modifiers (additive)
 * 2. Context modifiers (exclusive: TRT > Enhanced > Natural, then GLP-1 additive)
 * 3. Goal modifiers (additive)
 * 4. Calorie status modifiers (additive)
 * 5. Peptide class modifiers (additive)
 * 6. Demographic modifiers (additive)
 * 7. Bloodwork triggers (additive)
 * 8. Compound synergies (additive)
 * 9. Special category penalties (T-Booster, BCAA) - NEW
 * 
 * @param baseImpactScore - The static impact_score from supplement_database
 * @param matrix - The relevance_matrix JSONB from supplement_database
 * @param context - User's current context (phase, mode, peptides, bloodwork)
 * @param markers - Optional special category markers for targeted penalties
 * @returns RelevanceScoreResult with score, dynamicTier, reasons, and warnings
 */
export function calculateRelevanceScore(
  baseImpactScore: number,
  matrix: RelevanceMatrix | null | undefined,
  context: UserRelevanceContext | null,
  markers?: SupplementMarkers
): RelevanceScoreResult {
  const baseTier = getDynamicTier(baseImpactScore);
  
  // If no matrix or no context, return base score
  if (!matrix || !context) {
    return { 
      score: baseImpactScore, 
      baseScore: baseImpactScore,
      dynamicTier: baseTier,
      reasons: [], 
      warnings: [],
      isPersonalized: false
    };
  }
  
  let score = baseImpactScore;
  const reasons: string[] = [];
  const warnings: string[] = [];
  
  // 1. Phase Modifier
  const phaseKey = context.phase.toString();
  const phaseMod = matrix.phase_modifiers?.[phaseKey] || 0;
  if (phaseMod !== 0) {
    score += phaseMod;
    reasons.push(`Phase ${context.phase}: ${phaseMod > 0 ? '+' : ''}${phaseMod}`);
  }
  
  // 2. Context Modifiers (IMPORTANT: Trumping hierarchy!)
  // TRT trumps everything - check first
  if (context.isOnTRT && matrix.context_modifiers?.on_trt !== undefined) {
    const mod = matrix.context_modifiers.on_trt;
    score += mod;
    if (mod < 0) {
      warnings.push('TRT deckt diesen Bereich hormonell ab');
    }
    reasons.push(`TRT aktiv: ${mod > 0 ? '+' : ''}${mod}`);
  }
  // Enhanced without TRT (Reta/Peptides without hormone protection)
  else if (context.isEnhancedNoTRT && matrix.context_modifiers?.enhanced_no_trt !== undefined) {
    const mod = matrix.context_modifiers.enhanced_no_trt;
    score += mod;
    if (mod > 2) {
      warnings.push('Kritisch bei Peptiden ohne TRT-Schutz!');
    }
    reasons.push(`Peptide ohne TRT: +${mod}`);
  }
  // True Natural (no peptides, no TRT)
  else if (context.isTrueNatural && matrix.context_modifiers?.true_natural !== undefined) {
    const mod = matrix.context_modifiers.true_natural;
    score += mod;
    reasons.push(`100% Natural: +${mod}`);
  }
  
  // 3. GLP-1 Specific (ADDITIVE, not exclusive - can stack with TRT)
  if (context.isOnGLP1 && matrix.context_modifiers?.on_glp1 !== undefined) {
    const mod = matrix.context_modifiers.on_glp1;
    score += mod;
    reasons.push(`GLP-1 aktiv: +${mod}`);
  }
  
  // 4. Goal Modifiers
  if (context.goal && matrix.goal_modifiers?.[context.goal] !== undefined) {
    const mod = matrix.goal_modifiers[context.goal];
    score += mod;
    const goalLabel = getGoalLabel(context.goal);
    reasons.push(`Ziel ${goalLabel}: ${mod > 0 ? '+' : ''}${mod}`);
  }
  
  // 5. Calorie Status Modifiers
  if (context.isInDeficit && matrix.calorie_modifiers?.in_deficit !== undefined) {
    const mod = matrix.calorie_modifiers.in_deficit;
    if (mod !== 0) {
      score += mod;
      reasons.push(`Defizit aktiv: ${mod > 0 ? '+' : ''}${mod}`);
    }
  }
  if (context.isInSurplus && matrix.calorie_modifiers?.in_surplus !== undefined) {
    const mod = matrix.calorie_modifiers.in_surplus;
    if (mod !== 0) {
      score += mod;
      reasons.push(`Aufbauphase: ${mod > 0 ? '+' : ''}${mod}`);
    }
  }
  
  // 6. Peptide Class Modifiers
  for (const peptideClass of context.activePeptideClasses) {
    const mod = matrix.peptide_class_modifiers?.[peptideClass];
    if (mod !== undefined && mod !== 0) {
      score += mod;
      const classLabel = PEPTIDE_CLASS_LABELS[peptideClass as keyof typeof PEPTIDE_CLASS_LABELS] || peptideClass;
      reasons.push(`${classLabel} Protokoll: ${mod > 0 ? '+' : ''}${mod}`);
    }
  }
  
  // 7. Demographic Modifiers
  if (context.ageOver60 && matrix.demographic_modifiers?.age_over_60 !== undefined) {
    const mod = matrix.demographic_modifiers.age_over_60;
    if (mod !== 0) {
      score += mod;
      reasons.push(`Alter 60+: ${mod > 0 ? '+' : ''}${mod}`);
    }
  } else if (context.ageOver50 && matrix.demographic_modifiers?.age_over_50 !== undefined) {
    const mod = matrix.demographic_modifiers.age_over_50;
    if (mod !== 0) {
      score += mod;
      reasons.push(`Alter 50+: ${mod > 0 ? '+' : ''}${mod}`);
    }
  } else if (context.ageOver40 && matrix.demographic_modifiers?.age_over_40 !== undefined) {
    const mod = matrix.demographic_modifiers.age_over_40;
    if (mod !== 0) {
      score += mod;
      reasons.push(`Alter 40+: ${mod > 0 ? '+' : ''}${mod}`);
    }
  }
  
  // Gender modifiers (additive, not exclusive)
  if (context.isFemale && matrix.demographic_modifiers?.is_female !== undefined) {
    const mod = matrix.demographic_modifiers.is_female;
    if (mod !== 0) {
      score += mod;
      reasons.push(`Weiblich: ${mod > 0 ? '+' : ''}${mod}`);
    }
  }
  if (context.isMale && matrix.demographic_modifiers?.is_male !== undefined) {
    const mod = matrix.demographic_modifiers.is_male;
    if (mod !== 0) {
      score += mod;
      reasons.push(`Männlich: ${mod > 0 ? '+' : ''}${mod}`);
    }
  }
  
  // 8. Bloodwork Triggers
  for (const flag of context.bloodworkFlags) {
    const mod = matrix.bloodwork_triggers?.[flag];
    if (mod !== undefined && mod !== 0) {
      score += mod;
      const flagLabel = getBloodworkFlagLabel(flag);
      reasons.push(`Blutwert ${flagLabel}: ${mod > 0 ? '+' : ''}${mod}`);
    }
  }
  
  // 9. Compound Synergies
  for (const peptide of context.activePeptides) {
    const normalizedName = peptide.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const mod = matrix.compound_synergies?.[normalizedName];
    if (mod !== undefined && mod !== 0) {
      score += mod;
      reasons.push(`${peptide} Synergie: ${mod > 0 ? '+' : ''}${mod}`);
    }
  }
  
  // 10. Special Category Penalties (NEW - based on markers)
  if (markers) {
    // Natural T-Booster penalty when on GH Secretagogues or TRT
    if (markers.isNaturalTestoBooster) {
      const hasGHSecretagogue = context.activePeptideClasses.includes('gh_secretagogue');
      const hasTesto = context.activePeptideClasses.includes('testo');
      
      if (hasGHSecretagogue || hasTesto) {
        score -= 2.0;
        reasons.push('GH/Peptid aktiv: -2.0 (Diminishing Returns)');
        warnings.push('Natürliche T-Booster bei Peptid-Protokoll weniger effektiv');
      }
    }
    
    // BCAA penalty when high protein intake (>2g/kg)
    if (markers.isBCAA && context.dailyProteinPerKg && context.dailyProteinPerKg > 2.0) {
      score -= 1.5;
      reasons.push(`Protein >2g/kg: -1.5 (Redundant)`);
      warnings.push('BCAAs bei hoher Proteinzufuhr überflüssig - EAAs bevorzugen');
    }
  }
  
  // Clamp score to 0-10
  const clampedScore = Math.max(0, Math.min(10, score));
  
  return { 
    score: clampedScore,
    baseScore: baseImpactScore,
    dynamicTier: getDynamicTier(clampedScore),
    reasons,
    warnings,
    isPersonalized: reasons.length > 0
  };
}

/**
 * Get human-readable label for goal
 */
function getGoalLabel(goal: string): string {
  const labels: Record<string, string> = {
    fat_loss: 'Fettabbau',
    muscle_gain: 'Muskelaufbau',
    longevity: 'Langlebigkeit',
    maintenance: 'Erhaltung',
    recomposition: 'Rekomposition',
    performance: 'Leistung',
    health: 'Gesundheit',
    cognitive: 'Kognition',
    sleep: 'Schlaf',
    gut_health: 'Darmgesundheit',
  };
  return labels[goal] || goal;
}

/**
 * Get human-readable label for bloodwork flag
 */
function getBloodworkFlagLabel(flag: string): string {
  const labels: Record<string, string> = {
    cortisol_high: 'Cortisol erhöht',
    testosterone_low: 'Testosteron niedrig',
    dhea_low: 'DHEA niedrig',
    hdl_low: 'HDL niedrig',
    ldl_high: 'LDL erhöht',
    triglycerides_high: 'Triglyceride erhöht',
    apob_high: 'ApoB erhöht',
    vitamin_d_low: 'Vitamin D niedrig',
    b12_low: 'B12 niedrig',
    magnesium_low: 'Magnesium niedrig',
    ferritin_high: 'Ferritin erhöht',
    iron_low: 'Eisen niedrig',
    glucose_high: 'Glukose erhöht',
    hba1c_elevated: 'HbA1c erhöht',
    insulin_high: 'Insulin erhöht',
    insulin_resistant: 'Insulinresistenz',
    inflammation_high: 'Entzündung erhöht',
    homocysteine_high: 'Homocystein erhöht',
    thyroid_slow: 'Schilddrüse langsam',
    thyroid_overactive: 'Schilddrüse überaktiv',
  };
  return labels[flag] || flag.replace(/_/g, ' ');
}

/**
 * Get score tier based on final score
 */
export function getScoreTier(score: number): 'essential' | 'recommended' | 'optional' | 'redundant' {
  if (score >= 9) return 'essential';
  if (score >= 7) return 'recommended';
  if (score >= 4) return 'optional';
  return 'redundant';
}

/**
 * Get tier label and color for UI
 */
export function getScoreTierConfig(score: number): { 
  label: string; 
  labelShort: string;
  bgClass: string; 
  textClass: string; 
  borderClass: string;
  icon: string;
} {
  const tier = getScoreTier(score);
  
  switch (tier) {
    case 'essential':
      return {
        label: 'Essentiell für dich',
        labelShort: 'Essential',
        bgClass: 'bg-green-500/10',
        textClass: 'text-green-600 dark:text-green-400',
        borderClass: 'border-green-500/30',
        icon: '🚨',
      };
    case 'recommended':
      return {
        label: 'Empfohlen',
        labelShort: 'Empfohlen',
        bgClass: 'bg-blue-500/10',
        textClass: 'text-blue-600 dark:text-blue-400',
        borderClass: 'border-blue-500/30',
        icon: '✅',
      };
    case 'optional':
      return {
        label: 'Optional',
        labelShort: 'Optional',
        bgClass: 'bg-muted/50',
        textClass: 'text-muted-foreground',
        borderClass: 'border-border',
        icon: '💭',
      };
    case 'redundant':
      return {
        label: 'Nicht notwendig',
        labelShort: 'Redundant',
        bgClass: 'bg-orange-500/10',
        textClass: 'text-orange-600 dark:text-orange-400',
        borderClass: 'border-orange-500/30',
        icon: '⚠️',
      };
  }
}
