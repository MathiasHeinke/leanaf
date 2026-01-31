// =====================================================
// ARES Stack Architect: TypeScript-Typen für Phase 1
// =====================================================

// Timing Constraints für optimale Einnahme (bedtime removed - use evening)
export type TimingConstraint = 
  | 'fasted'       // Auf nüchternen Magen
  | 'with_food'    // Mit Mahlzeit
  | 'with_fats'    // Mit Fett für Absorption
  | 'pre_workout'  // 30-60 Min vor Training
  | 'post_workout' // Nach dem Training
  | 'any';         // Flexibel

// Interaktions-Tags für Warnungen
export type InteractionTag = 
  | 'needs_fat'       // Braucht Fett für Absorption
  | 'blocks_zinc'     // Hemmt Zink-Aufnahme
  | 'blocks_copper'   // Hemmt Kupfer-Aufnahme
  | 'needs_piperine'  // Braucht Piperin (schwarzer Pfeffer)
  | 'avoid_caffeine'  // Nicht mit Koffein
  | 'avoid_evening'   // Nicht abends
  | 'needs_vitamin_c'; // Braucht Vitamin C

// Schedule Types für Zyklen
export type ScheduleType = 
  | 'daily'         // Jeden Tag
  | 'training_days' // Nur an Trainingstagen
  | 'interval'      // Alle X Tage
  | 'cyclic';       // X Wochen on, Y Wochen off

// Preferred Timing für Timeline-Visualisierung (bedtime removed - evening covers it)
export type PreferredTiming = 
  | 'morning'      // 06:00 - 10:00
  | 'noon'         // 11:00 - 14:00
  | 'afternoon'    // 14:00 - 18:00
  | 'evening'      // 18:00 onwards (includes pre-sleep)
  | 'pre_workout'  // Dynamisch vor Training
  | 'post_workout'; // Dynamisch nach Training

// =====================================================
// ARES Impact Score System
// =====================================================

// Evidenz-Level für wissenschaftliche Qualität
export type EvidenceLevel = 'stark' | 'moderat' | 'anekdotisch';

// Necessity Tier für Priorisierung
export type NecessityTier = 'essential' | 'optimizer' | 'specialist';

// Evidenz-Level Konfiguration für UI
export const EVIDENCE_LEVEL_CONFIG: Record<EvidenceLevel, { 
  label: string; 
  color: string; 
  description: string;
  bgClass: string;
  textClass: string;
}> = {
  stark: { 
    label: 'Starke Evidenz', 
    color: 'green',
    description: 'Meta-Analysen & RCTs bestätigen Wirkung',
    bgClass: 'bg-green-500/10',
    textClass: 'text-green-600'
  },
  moderat: { 
    label: 'Moderate Evidenz', 
    color: 'yellow',
    description: 'Einzelne RCTs oder starke mechanistische Daten',
    bgClass: 'bg-yellow-500/10',
    textClass: 'text-yellow-600'
  },
  anekdotisch: { 
    label: 'Anekdotisch', 
    color: 'orange',
    description: 'Tierstudien oder N=1 Erfahrungsberichte',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-600'
  }
};

// Necessity Tier Konfiguration für UI
export const NECESSITY_TIER_CONFIG: Record<NecessityTier, {
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  impactRange: string;
  bgClass: string;
  borderClass: string;
}> = {
  essential: {
    label: 'THE ESSENTIALS',
    shortLabel: 'Essential',
    description: 'Non-Negotiables. Jeder sollte diese nehmen.',
    icon: '🚨',
    impactRange: '9.0 - 10.0',
    bgClass: 'bg-primary/5',
    borderClass: 'border-primary/30'
  },
  optimizer: {
    label: 'TARGETED OPTIMIZERS',
    shortLabel: 'Optimizer',
    description: 'Für spezifische Ziele oder Mängel.',
    icon: '🚀',
    impactRange: '7.0 - 8.9',
    bgClass: 'bg-muted/50',
    borderClass: 'border-muted-foreground/20'
  },
  specialist: {
    label: 'ADVANCED/EXPERIMENTAL',
    shortLabel: 'Specialist',
    description: 'Nische, teuer oder experimentell.',
    icon: '🧪',
    impactRange: '< 7.0',
    bgClass: 'bg-muted/30',
    borderClass: 'border-muted-foreground/10'
  }
};

// ARES Protocol Phase Konfiguration
export const PHASE_CONFIG: Record<number, {
  label: string;
  description: string;
  icon: string;
  subtitle: string;
  color: string;
}> = {
  0: { 
    label: 'Fundament', 
    description: 'Natural Stack für alle',
    icon: '🌱',
    subtitle: 'Phase 0',
    color: 'green'
  },
  1: { 
    label: 'Rekomposition', 
    description: 'TRT/GLP-1 Support',
    icon: '💪',
    subtitle: 'Phase 1',
    color: 'blue'
  },
  2: { 
    label: 'Fine-tuning', 
    description: 'Peptid-Synergie',
    icon: '🔬',
    subtitle: 'Phase 2',
    color: 'purple'
  },
  3: { 
    label: 'Longevity', 
    description: 'Advanced Stack',
    icon: '🧬',
    subtitle: 'Phase 3',
    color: 'amber'
  }
};

// Form Quality for bioavailability
export type FormQuality = 'optimal' | 'gut' | 'schlecht';

// Form Quality Labels for UI
export const FORM_QUALITY_LABELS: Record<FormQuality, { label: string; description: string; color: string }> = {
  optimal: { label: 'Optimal', description: 'Beste Bioverfügbarkeit', color: 'green' },
  gut: { label: 'Gut', description: 'Solide Aufnahme', color: 'yellow' },
  schlecht: { label: 'Schlecht', description: 'Geringe Absorption', color: 'red' },
};

// Import RelevanceMatrix type
import type { RelevanceMatrix } from './relevanceMatrix';

// Supplement Library Item (Master-Katalog) - erweitert
export interface SupplementLibraryItem {
  id: string;
  name: string;
  category: string;
  default_dosage: string | null;
  default_unit: string;
  common_timing: string[];
  timing_constraint: TimingConstraint;
  interaction_tags: InteractionTag[];
  brand_recommendation: string | null;
  description: string | null;
  common_brands?: string[];
  recognition_keywords?: string[];
  // ARES Impact Score System
  protocol_phase: number;
  impact_score: number;
  necessity_tier: NecessityTier;
  priority_score: number;
  evidence_level: EvidenceLevel;
  hallmarks_addressed: string[];
  cost_per_day_eur?: number | null;
  amazon_de_asin?: string | null;
  // Premium UX v2 fields
  form_quality?: FormQuality | null;
  synergies?: string[] | null;
  blockers?: string[] | null;
  cycling_required?: boolean | null;
  cycling_protocol?: string | null;
  underrated_score?: number | null;
  warnung?: string | null;
  // ARES Matrix-Scoring (personalized relevance)
  relevance_matrix?: RelevanceMatrix | null;
}

// Supplement Brand Interface
export interface SupplementBrand {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  website: string | null;
  price_tier: 'budget' | 'mid' | 'premium' | 'luxury' | null;
  specialization: string[] | null;
  quality_certifications: string[] | null;
  description: string | null;
  logo_url: string | null;
}

// Supplement Product Interface
export interface SupplementProduct {
  id: string;
  brand_id: string | null;
  supplement_id: string | null;
  product_name: string;
  pack_size: number;
  pack_unit: string | null;
  servings_per_pack: number | null;
  dose_per_serving: number;
  dose_unit: string;
  price_eur: number | null;
  price_per_serving: number | null;
  form: string | null;
  is_vegan: boolean | null;
  is_recommended: boolean | null;
  is_verified: boolean | null;
  amazon_asin: string | null;
  product_url: string | null;
  brand?: SupplementBrand | null;
  supplement?: SupplementLibraryItem | null;
}

// User Stack Item (persönlicher Stack)
export interface UserStackItem {
  id: string;
  user_id: string;
  supplement_id: string | null;
  name: string;
  custom_name?: string | null;
  dosage: string;
  unit: string;
  timing: string[];
  schedule_type: ScheduleType;
  preferred_timing: PreferredTiming;
  stock_count: number | null;
  is_active: boolean;
  goal?: string | null;
  notes?: string | null;
  frequency_days?: number;
  schedule?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  // Selected product ID (persists brand/product selection)
  selected_product_id?: string | null;
  // Joined data from supplement_database
  supplement?: SupplementLibraryItem | null;
  // Joined data from supplement_products (when selected_product_id exists)
  selected_product?: SupplementProduct | null;
}

// Timing Constraint Labels für UI (bedtime removed)
export const TIMING_CONSTRAINT_LABELS: Record<TimingConstraint, string> = {
  fasted: 'Nüchtern',
  with_food: 'Mit Mahlzeit',
  with_fats: 'Mit Fett',
  pre_workout: 'Vor Training',
  post_workout: 'Nach Training',
  any: 'Flexibel',
};

// Timing Constraint Icons für UI
export const TIMING_CONSTRAINT_ICONS: Record<TimingConstraint, string> = {
  fasted: '💧',
  with_food: '🍽️',
  with_fats: '🥑',
  pre_workout: '🏋️',
  post_workout: '💪',
  any: '⏰',
};

// Interaction Tag Labels für UI
export const INTERACTION_TAG_LABELS: Record<InteractionTag, string> = {
  needs_fat: 'Braucht Fett',
  blocks_zinc: 'Blockiert Zink',
  blocks_copper: 'Blockiert Kupfer',
  needs_piperine: 'Mit Piperin',
  avoid_caffeine: 'Kein Koffein',
  avoid_evening: 'Nicht abends',
  needs_vitamin_c: 'Mit Vitamin C',
};

// Schedule Type Labels für UI
export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  daily: 'Täglich',
  training_days: 'Trainingstage',
  interval: 'Intervall',
  cyclic: 'Zyklisch',
};

// Preferred Timing Labels für UI (bedtime removed - evening covers it)
export const PREFERRED_TIMING_LABELS: Record<PreferredTiming, string> = {
  morning: 'Morgens',
  noon: 'Mittags',
  afternoon: 'Nachmittags',
  evening: 'Abends',
  pre_workout: 'Vor Training',
  post_workout: 'Nach Training',
};

// Timeline Slots für Visualisierung (bedtime merged into evening)
export interface TimelineSlot {
  id: PreferredTiming;
  label: string;
  timeRange: string;
  startHour: number;
  endHour: number;
}

export const TIMELINE_SLOTS: TimelineSlot[] = [
  { id: 'morning', label: 'Morgens', timeRange: '06:00 - 10:00', startHour: 6, endHour: 10 },
  { id: 'noon', label: 'Mittags', timeRange: '11:00 - 14:00', startHour: 11, endHour: 14 },
  { id: 'afternoon', label: 'Nachmittags', timeRange: '14:00 - 18:00', startHour: 14, endHour: 18 },
  { id: 'evening', label: 'Abends', timeRange: '18:00 - 23:00', startHour: 18, endHour: 23 },
];

// Helper: Check if timing constraint matches preferred timing
export function isTimingOptimal(
  constraint: TimingConstraint, 
  preferredTiming: PreferredTiming
): boolean {
  const optimalMappings: Record<TimingConstraint, PreferredTiming[]> = {
    fasted: ['morning'],
    with_food: ['noon', 'evening'],
    with_fats: ['noon', 'evening'],
    pre_workout: ['pre_workout', 'afternoon'],
    post_workout: ['post_workout', 'afternoon', 'evening'],
    any: ['morning', 'noon', 'afternoon', 'evening', 'pre_workout', 'post_workout'],
  };
  
  return optimalMappings[constraint]?.includes(preferredTiming) ?? false;
}

// Helper: Get conflicting supplements based on interaction tags
export function getConflictingTags(tags1: InteractionTag[], tags2: InteractionTag[]): string[] {
  const conflicts: string[] = [];
  
  // Zink + Eisen/Kupfer Konflikt
  if (tags1.includes('blocks_zinc') && tags2.includes('blocks_copper')) {
    conflicts.push('Zink und Kupfer konkurrieren um Absorption');
  }
  if (tags1.includes('blocks_copper') && tags2.includes('blocks_zinc')) {
    conflicts.push('Kupfer und Zink konkurrieren um Absorption');
  }
  
  return conflicts;
}
