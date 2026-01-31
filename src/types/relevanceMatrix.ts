// =====================================================
// ARES Matrix-Scoring: Relevance Matrix Types (Extended v2)
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
  
  // Caloric status modifiers
  calorie_modifiers?: {
    in_deficit?: number;        // User is in caloric deficit
    in_surplus?: number;        // User is in caloric surplus
  };
  
  // Peptide class modifiers (by functional category)
  peptide_class_modifiers?: Record<string, number>;
  
  // Demographic modifiers
  demographic_modifiers?: {
    age_over_40?: number;
    age_over_50?: number;
    age_over_60?: number;
    is_female?: number;
    is_male?: number;
  };
  
  // Bloodwork-triggered modifiers
  bloodwork_triggers?: Record<string, number>;
  
  // Peptide/Compound synergies
  compound_synergies?: Record<string, number>;
  
  // Explanation templates for UI
  explanation_templates?: Record<string, string>;
  
  // Scientific evidence notes (for Info-Overlay display)
  evidence_notes?: {
    sources?: string[];           // ["PMC9415500", "MDPI 2024"]
    critical_insight?: string;    // "Nur bei Low-T effektiv"
    validation_status?: 'validated' | 'pending' | 'disputed';
  };
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
  
  // Caloric status
  isInDeficit: boolean;       // Currently in caloric deficit
  isInSurplus: boolean;       // Currently in caloric surplus
  
  // Demographic flags
  ageOver40: boolean;
  ageOver50: boolean;
  ageOver60: boolean;
  isFemale: boolean;
  isMale: boolean;
  
  // Active peptide classes
  activePeptideClasses: string[];  // ['gh_secretagogue', 'healing', etc.]
  
  // Raw data
  phase: 0 | 1 | 2 | 3;
  protocolModes: string[];    // ['natural'] or ['enhanced'] or ['enhanced', 'clinical']
  activePeptides: string[];   // ['retatrutide', 'bpc_157', etc.]
  goal: string;               // 'fat_loss', 'muscle_gain', etc.
  bloodworkFlags: string[];   // ['cortisol_high', 'hdl_low', etc.]
  
  // Nutritional context (for BCAA/EAA logic)
  dailyProteinPerKg?: number; // Estimated protein intake per kg bodyweight
}

/**
 * Marker flags for special supplement categories
 * Used for targeted modifiers (T-booster penalty, BCAA penalty, etc.)
 */
export interface SupplementMarkers {
  isNaturalTestoBooster?: boolean;
  isBCAA?: boolean;
  isEAA?: boolean;
}

/**
 * Dynamic tier based on calculated score
 */
export type DynamicTier = 'essential' | 'optimizer' | 'niche';

/**
 * Result of relevance score calculation
 */
export interface RelevanceScoreResult {
  score: number;              // Final score (0-10, clamped)
  baseScore: number;          // Original impact_score before modifiers
  dynamicTier: DynamicTier;   // Calculated tier based on final score
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

// =====================================================
// Peptide Class System
// =====================================================

export const PEPTIDE_CATEGORIES = [
  'gh_secretagogue',
  'healing',
  'longevity',
  'nootropic',
  'metabolic',
  'immune',
  'testo',
  'skin',
] as const;

export type PeptideCategory = typeof PEPTIDE_CATEGORIES[number];

/**
 * Mapping from peptide names to functional categories
 * Normalized to lowercase with underscores
 */
export const PEPTIDE_TO_CATEGORY: Record<string, PeptideCategory> = {
  // GH Secretagogues
  'cjc_1295': 'gh_secretagogue',
  'cjc-1295': 'gh_secretagogue',
  'cjc1295': 'gh_secretagogue',
  'ipamorelin': 'gh_secretagogue',
  'tesamorelin': 'gh_secretagogue',
  'mk_677': 'gh_secretagogue',
  'mk-677': 'gh_secretagogue',
  'mk677': 'gh_secretagogue',
  'sermorelin': 'gh_secretagogue',
  'ghrp_6': 'gh_secretagogue',
  'ghrp-6': 'gh_secretagogue',
  'ghrp_2': 'gh_secretagogue',
  'ghrp-2': 'gh_secretagogue',
  'hexarelin': 'gh_secretagogue',
  
  // Healing
  'bpc_157': 'healing',
  'bpc-157': 'healing',
  'bpc157': 'healing',
  'tb_500': 'healing',
  'tb-500': 'healing',
  'tb500': 'healing',
  'thymosin_beta_4': 'healing',
  'pentadecapeptide': 'healing',
  
  // Longevity
  'epitalon': 'longevity',
  'epithalon': 'longevity',
  'thymalin': 'longevity',
  'ss_31': 'longevity',
  'ss-31': 'longevity',
  'mots_c': 'longevity',
  'mots-c': 'longevity',
  'humanin': 'longevity',
  
  // Nootropic
  'semax': 'nootropic',
  'selank': 'nootropic',
  'dihexa': 'nootropic',
  'p21': 'nootropic',
  'na_semax': 'nootropic',
  'na-semax': 'nootropic',
  'cerebrolysin': 'nootropic',
  
  // Metabolic (GLP-1 agonists)
  'retatrutide': 'metabolic',
  'reta': 'metabolic',
  'tirzepatide': 'metabolic',
  'tirze': 'metabolic',
  'mounjaro': 'metabolic',
  'zepbound': 'metabolic',
  'semaglutide': 'metabolic',
  'ozempic': 'metabolic',
  'wegovy': 'metabolic',
  'liraglutide': 'metabolic',
  'saxenda': 'metabolic',
  'victoza': 'metabolic',
  'aod_9604': 'metabolic',
  'aod-9604': 'metabolic',
  'fragment_176_191': 'metabolic',
  
  // Immune
  'thymosin_alpha_1': 'immune',
  'ta1': 'immune',
  'll_37': 'immune',
  'll-37': 'immune',
  
  // Testosterone-related
  'testosterone': 'testo',
  'kisspeptin': 'testo',
  'kisspeptin_10': 'testo',
  'gonadorelin': 'testo',
  'hcg': 'testo',
  
  // Skin/Cosmetic
  'ghk_cu': 'skin',
  'ghk-cu': 'skin',
  'copper_peptide': 'skin',
  'matrixyl': 'skin',
  'snap_8': 'skin',
  'snap-8': 'skin',
  'argireline': 'skin',
  'melanotan': 'skin',
  'melanotan_ii': 'skin',
  'melanotan_2': 'skin',
  'pt_141': 'skin',
  'pt-141': 'skin',
};

/**
 * Get the category for a peptide name
 */
export function getPeptideCategory(peptideName: string): PeptideCategory | null {
  const normalized = peptideName.toLowerCase().replace(/[\s-]/g, '_');
  return PEPTIDE_TO_CATEGORY[normalized] || null;
}

/**
 * Get all categories for a list of peptide names
 */
export function getPeptideCategories(peptideNames: string[]): PeptideCategory[] {
  const categories = new Set<PeptideCategory>();
  for (const name of peptideNames) {
    const category = getPeptideCategory(name);
    if (category) {
      categories.add(category);
    }
  }
  return Array.from(categories);
}

// =====================================================
// Labels for UI Display
// =====================================================

export const PEPTIDE_CLASS_LABELS: Record<PeptideCategory, string> = {
  gh_secretagogue: 'GH-Stimulation',
  healing: 'Heilung',
  longevity: 'Langlebigkeit',
  nootropic: 'Nootropika',
  metabolic: 'Stoffwechsel',
  immune: 'Immunsystem',
  testo: 'Testosteron',
  skin: 'Haut/Kosmetik',
};

export const DEMOGRAPHIC_LABELS: Record<string, string> = {
  age_over_40: 'Alter 40+',
  age_over_50: 'Alter 50+',
  age_over_60: 'Alter 60+',
  is_female: 'Weiblich',
  is_male: 'Männlich',
};

export const CALORIE_STATUS_LABELS: Record<string, string> = {
  in_deficit: 'Kaloriendefizit',
  in_surplus: 'Kalorienüberschuss',
};
