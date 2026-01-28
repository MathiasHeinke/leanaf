// =====================================================
// ARES Stack Architect: TypeScript-Typen für Phase 1
// =====================================================

// Timing Constraints für optimale Einnahme
export type TimingConstraint = 
  | 'fasted'       // Auf nüchternen Magen
  | 'with_food'    // Mit Mahlzeit
  | 'with_fats'    // Mit Fett für Absorption
  | 'pre_workout'  // 30-60 Min vor Training
  | 'post_workout' // Nach dem Training
  | 'bedtime'      // Vor dem Schlafengehen
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

// Preferred Timing für Timeline-Visualisierung
export type PreferredTiming = 
  | 'morning'      // 06:00 - 10:00
  | 'noon'         // 11:00 - 14:00
  | 'afternoon'    // 14:00 - 18:00
  | 'evening'      // 18:00 - 21:00
  | 'bedtime'      // 21:00 - 23:00
  | 'pre_workout'  // Dynamisch vor Training
  | 'post_workout'; // Dynamisch nach Training

// Supplement Library Item (Master-Katalog)
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
  // Joined data from supplement_database
  supplement?: SupplementLibraryItem | null;
}

// Timing Constraint Labels für UI
export const TIMING_CONSTRAINT_LABELS: Record<TimingConstraint, string> = {
  fasted: 'Nüchtern',
  with_food: 'Mit Mahlzeit',
  with_fats: 'Mit Fett',
  pre_workout: 'Vor Training',
  post_workout: 'Nach Training',
  bedtime: 'Vor dem Schlaf',
  any: 'Flexibel',
};

// Timing Constraint Icons für UI
export const TIMING_CONSTRAINT_ICONS: Record<TimingConstraint, string> = {
  fasted: '💧',
  with_food: '🍽️',
  with_fats: '🥑',
  pre_workout: '🏋️',
  post_workout: '💪',
  bedtime: '🌙',
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

// Preferred Timing Labels für UI
export const PREFERRED_TIMING_LABELS: Record<PreferredTiming, string> = {
  morning: 'Morgens',
  noon: 'Mittags',
  afternoon: 'Nachmittags',
  evening: 'Abends',
  bedtime: 'Vor dem Schlaf',
  pre_workout: 'Vor Training',
  post_workout: 'Nach Training',
};

// Timeline Slots für Visualisierung
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
  { id: 'evening', label: 'Abends', timeRange: '18:00 - 21:00', startHour: 18, endHour: 21 },
  { id: 'bedtime', label: 'Vor dem Schlaf', timeRange: '21:00 - 23:00', startHour: 21, endHour: 23 },
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
    bedtime: ['bedtime', 'evening'],
    any: ['morning', 'noon', 'afternoon', 'evening', 'bedtime', 'pre_workout', 'post_workout'],
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
