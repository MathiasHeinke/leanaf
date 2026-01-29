// =====================================================
// ARES Matrix-Scoring: Relevance Matrix Types
// =====================================================

/**
 * Relevance Matrix stored in supplement_database.relevance_matrix
 * Controls personalized scoring based on user context
 */
export interface RelevanceMatrix {
  // Phase modifiers (0-3)
  phase_modifiers?: Record<string, number>;
  
  // Context-based modifiers (trumping hierarchy: TRT > Enhanced > Natural)
  context_modifiers?: {
    true_natural?: number;      // Applied only if TRUE Natural (no peptides, no TRT)
    enhanced_no_trt?: number;   // Peptides active WITHOUT TRT (high risk scenario)
    on_trt?: number;            // TRT/HRT active (trumps other context modifiers)
    on_glp1?: number;           // GLP-1 agonist active (additive, not exclusive)
  };
  
  // Goal-based modifiers
  goal_modifiers?: Record<string, number>;
  
  // Bloodwork-triggered modifiers
  bloodwork_triggers?: Record<string, number>;
  
  // Peptide/Compound synergies
  compound_synergies?: Record<string, number>;
  
  // Explanation templates for UI
  explanation_templates?: Record<string, string>;
}

/**
 * User context for relevance scoring
 * Aggregated from profiles, peptide_protocols, user_bloodwork
 */
export interface UserRelevanceContext {
  // Core computed flags
  isTrueNatural: boolean;     // Natural mode AND no active peptides AND no TRT
  isEnhancedNoTRT: boolean;   // Peptides active WITHOUT TRT
  isOnTRT: boolean;           // TRT/HRT active (regardless of peptides)
  isOnGLP1: boolean;          // GLP-1 agonist active (Reta/Tirze/Sema)
  
  // Raw data
  phase: 0 | 1 | 2 | 3;
  protocolModes: string[];    // ['natural'] or ['enhanced'] or ['enhanced', 'clinical']
  activePeptides: string[];   // ['retatrutide', 'bpc_157', etc.]
  goal: string;               // 'fat_loss', 'muscle_gain', etc.
  bloodworkFlags: string[];   // ['cortisol_high', 'hdl_low', etc.]
}

/**
 * Result of relevance score calculation
 */
export interface RelevanceScoreResult {
  score: number;              // Final score (0-10, clamped)
  baseScore: number;          // Original impact_score before modifiers
  reasons: string[];          // Human-readable reasons for modifiers
  warnings: string[];         // Important warnings (e.g., "TRT makes this redundant")
  isPersonalized: boolean;    // Whether user context was applied
}

/**
 * Bloodwork thresholds for flag generation
 * Key = bloodwork field, value = { flag_name, threshold, comparison }
 */
export interface BloodworkThreshold {
  flag: string;
  threshold: number;
  comparison: 'above' | 'below';
}

export const BLOODWORK_THRESHOLDS: Record<string, BloodworkThreshold> = {
  // Hormones
  cortisol: { flag: 'cortisol_high', threshold: 25, comparison: 'above' },
  total_testosterone_low: { flag: 'testosterone_low', threshold: 300, comparison: 'below' },
  dhea_s: { flag: 'dhea_low', threshold: 100, comparison: 'below' },
  
  // Lipids
  hdl: { flag: 'hdl_low', threshold: 40, comparison: 'below' },
  ldl: { flag: 'ldl_high', threshold: 130, comparison: 'above' },
  triglycerides: { flag: 'triglycerides_high', threshold: 150, comparison: 'above' },
  apob: { flag: 'apob_high', threshold: 100, comparison: 'above' },
  
  // Vitamins/Minerals
  vitamin_d: { flag: 'vitamin_d_low', threshold: 30, comparison: 'below' },
  vitamin_b12: { flag: 'b12_low', threshold: 400, comparison: 'below' },
  magnesium: { flag: 'magnesium_low', threshold: 0.85, comparison: 'below' },
  ferritin_high: { flag: 'ferritin_high', threshold: 300, comparison: 'above' },
  iron: { flag: 'iron_low', threshold: 60, comparison: 'below' },
  
  // Metabolic
  fasting_glucose: { flag: 'glucose_high', threshold: 100, comparison: 'above' },
  hba1c: { flag: 'hba1c_elevated', threshold: 5.7, comparison: 'above' },
  insulin: { flag: 'insulin_high', threshold: 10, comparison: 'above' },
  homa_ir: { flag: 'insulin_resistant', threshold: 2.5, comparison: 'above' },
  
  // Inflammation
  hs_crp: { flag: 'inflammation_high', threshold: 1, comparison: 'above' },
  homocysteine: { flag: 'homocysteine_high', threshold: 10, comparison: 'above' },
  
  // Thyroid
  tsh_high: { flag: 'thyroid_slow', threshold: 4, comparison: 'above' },
  tsh_low: { flag: 'thyroid_overactive', threshold: 0.5, comparison: 'below' },
};

// GLP-1 agonist compound names for detection
export const GLP1_AGENTS = [
  'retatrutide', 
  'tirzepatide', 
  'semaglutide', 
  'liraglutide',
  'reta',
  'tirze',
  'ozempic',
  'wegovy',
  'mounjaro',
  'zepbound',
];

// TRT/HRT related compound names for detection
export const TRT_AGENTS = [
  'testosterone',
  'trt',
  'hrt',
  'test e',
  'test c',
  'enanthate',
  'cypionate',
  'sustanon',
  'nebido',
];
