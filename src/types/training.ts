// ARES Training Types - 3-Säulen-System
// RPT (Strength), Zone2 (Endurance), VO2max (HIIT)

export type TrainingType = 'rpt' | 'zone2' | 'vo2max' | 'sauna' | 'movement' | 'rest';

export type SplitType = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full' | 'cardio';

export type CardioType = 'walking' | 'running' | 'cycling' | 'swimming' | 'rowing' | 'other';

export type Vo2Protocol = '4x4' | 'tabata' | 'hiit' | 'running' | 'rowing' | 'cycling' | 'stairmaster' | 'other';

export type SaunaTemp = 80 | 90 | 100;

export interface TrainingSession {
  id: string;
  user_id: string;
  session_date: string;
  training_type: TrainingType | null;
  split_type: SplitType | null;
  total_duration_minutes: number | null;
  total_volume_kg: number | null;
  notes: string | null;
  session_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TrainingSessionCreate {
  session_date: string;
  training_type: TrainingType;
  split_type?: SplitType;
  total_duration_minutes?: number;
  total_volume_kg?: number;
  notes?: string;
  session_data?: Record<string, unknown>;
}

// Training tracking (daily aggregate for 3 pillars)
export interface TrainingTracking {
  id: string;
  user_id: string;
  date: string;
  strength_completed: boolean;
  zone2_completed: boolean;
  vo2max_completed: boolean;
  strength_volume_kg: number | null;
  zone2_duration_min: number | null;
  vo2max_duration_min: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Helper to get display name for training type
export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  rpt: 'Krafttraining (RPT)',
  zone2: 'Zone 2 Ausdauer',
  vo2max: 'VO2max / HIIT',
  sauna: 'Sauna (≥80°C)',
  movement: 'Bewegung',
  rest: 'Ruhetag',
};

export const TRAINING_TYPE_ICONS: Record<TrainingType, string> = {
  rpt: '🏋️',
  zone2: '🚶',
  vo2max: '🏃',
  sauna: '🔥',
  movement: '🚶',
  rest: '😴',
};

export const SPLIT_TYPE_LABELS: Record<SplitType, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Beine',
  upper: 'Oberkörper',
  lower: 'Unterkörper',
  full: 'Ganzkörper',
  cardio: 'Cardio',
};

// Cardio type options for Zone 2
export const CARDIO_TYPE_OPTIONS = [
  { id: 'walking' as const, label: 'Gehen', emoji: '🚶' },
  { id: 'running' as const, label: 'Laufen', emoji: '🏃' },
  { id: 'cycling' as const, label: 'Radfahren', emoji: '🚴' },
  { id: 'swimming' as const, label: 'Schwimmen', emoji: '🏊' },
  { id: 'rowing' as const, label: 'Rudern', emoji: '🚣' },
];

// VO2max protocol options (extended)
export const VO2_PROTOCOL_OPTIONS = [
  { id: '4x4' as const, label: '4x4 Intervalle', emoji: '🔥' },
  { id: 'tabata' as const, label: 'Tabata', emoji: '⚡' },
  { id: 'hiit' as const, label: 'HIIT', emoji: '💥' },
  { id: 'running' as const, label: 'Schnelles Joggen', emoji: '🏃' },
  { id: 'rowing' as const, label: 'Rudern', emoji: '🚣' },
  { id: 'cycling' as const, label: 'Radfahren', emoji: '🚴' },
  { id: 'stairmaster' as const, label: 'Stairmaster', emoji: '🪜' },
];

// Cardio entry data structure for Zone2/VO2max logging
export interface CardioEntry {
  activity: CardioType | 'other';
  duration_minutes: number;
  distance_km?: number;
  speed_kmh?: number;
  speed_max_kmh?: number;
  pace_min_km?: number;
  avg_hr?: number;
  max_hr?: number;
  incline_percent?: number;
  calories?: number;
  notes?: string;
}

// Cardio activity labels for display
export const CARDIO_ACTIVITY_LABELS: Record<CardioType | 'other', string> = {
  walking: 'Gehen',
  running: 'Laufen',
  cycling: 'Radfahren',
  swimming: 'Schwimmen',
  rowing: 'Rudern',
  other: 'Sonstiges',
};

// Cardio activity emojis
export const CARDIO_ACTIVITY_EMOJIS: Record<CardioType | 'other', string> = {
  walking: '🚶',
  running: '🏃',
  cycling: '🚴',
  swimming: '🏊',
  rowing: '🚣',
  other: '🏋️',
};

// Sauna temperature options
export const SAUNA_TEMP_OPTIONS = [80, 90, 100] as const;
