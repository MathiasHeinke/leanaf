// =====================================================
// ARES Matrix-Scoring: Relevance Score Calculation Engine
// =====================================================

import type { 
  RelevanceMatrix, 
  UserRelevanceContext, 
  RelevanceScoreResult 
} from '@/types/relevanceMatrix';

/**
 * Calculate personalized relevance score for a supplement
 * 
 * Logic hierarchy (TRT trumps Enhanced trumps Natural):
 * 1. Phase modifiers (additive)
 * 2. Context modifiers (exclusive: TRT > Enhanced > Natural, then GLP-1 additive)
 * 3. Goal modifiers (additive)
 * 4. Bloodwork triggers (additive)
 * 5. Compound synergies (additive)
 * 
 * @param baseImpactScore - The static impact_score from supplement_database
 * @param matrix - The relevance_matrix JSONB from supplement_database
 * @param context - User's current context (phase, mode, peptides, bloodwork)
 * @returns RelevanceScoreResult with score, reasons, and warnings
 */
export function calculateRelevanceScore(
  baseImpactScore: number,
  matrix: RelevanceMatrix | null | undefined,
  context: UserRelevanceContext | null
): RelevanceScoreResult {
  // If no matrix or no context, return base score
  if (!matrix || !context) {
    return { 
      score: baseImpactScore, 
      baseScore: baseImpactScore,
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
  
  // 5. Bloodwork Triggers
  for (const flag of context.bloodworkFlags) {
    const mod = matrix.bloodwork_triggers?.[flag];
    if (mod !== undefined && mod !== 0) {
      score += mod;
      const flagLabel = getBloodworkFlagLabel(flag);
      reasons.push(`Blutwert ${flagLabel}: +${mod}`);
    }
  }
  
  // 6. Compound Synergies
  for (const peptide of context.activePeptides) {
    const normalizedName = peptide.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const mod = matrix.compound_synergies?.[normalizedName];
    if (mod !== undefined && mod !== 0) {
      score += mod;
      reasons.push(`${peptide} Synergie: +${mod}`);
    }
  }
  
  // Clamp score to 0-10
  const clampedScore = Math.max(0, Math.min(10, score));
  
  return { 
    score: clampedScore,
    baseScore: baseImpactScore,
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
