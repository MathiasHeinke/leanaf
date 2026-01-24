// ARES Training Types - 3-Säulen-System
// RPT (Strength), Zone2 (Endurance), VO2max (HIIT)

export type TrainingType = 'rpt' | 'zone2' | 'vo2max';

export type SplitType = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full' | 'cardio';

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
};

export const TRAINING_TYPE_ICONS: Record<TrainingType, string> = {
  rpt: '🏋️',
  zone2: '🚶',
  vo2max: '🏃',
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
