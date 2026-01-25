// Bloodwork Frontend Types
// Phase 7: Complete UI Implementation

export type MarkerCategory = 'hormones' | 'thyroid' | 'metabolic' | 'lipids' | 'vitamins' | 'blood' | 'organs';
export type MarkerStatus = 'optimal' | 'normal' | 'borderline_low' | 'borderline_high' | 'low' | 'high';

export interface BloodworkMarker {
  key: string;
  label: string;
  unit: string;
  category: MarkerCategory;
  description?: string;
}

export interface MarkerCategoryConfig {
  label: string;
  icon: string;
  markers: string[];
}

export const MARKER_CATEGORIES: Record<string, MarkerCategoryConfig> = {
  hormones: {
    label: 'Hormone',
    icon: 'Syringe',
    markers: ['total_testosterone', 'free_testosterone', 'estradiol', 'shbg', 'lh', 'fsh', 'prolactin', 'dhea_s', 'cortisol', 'igf1']
  },
  thyroid: {
    label: 'Schilddrüse',
    icon: 'Activity',
    markers: ['tsh', 'ft3', 'ft4']
  },
  metabolic: {
    label: 'Stoffwechsel',
    icon: 'Flame',
    markers: ['fasting_glucose', 'fasting_insulin', 'hba1c', 'homa_ir']
  },
  lipids: {
    label: 'Blutfette',
    icon: 'Heart',
    markers: ['total_cholesterol', 'ldl', 'hdl', 'triglycerides']
  },
  vitamins: {
    label: 'Vitamine & Mineralien',
    icon: 'Pill',
    markers: ['vitamin_d', 'vitamin_b12', 'ferritin', 'iron', 'magnesium', 'zinc', 'calcium', 'potassium', 'sodium', 'phosphate']
  },
  blood: {
    label: 'Blutbild',
    icon: 'Droplet',
    markers: ['hemoglobin', 'hematocrit', 'rbc', 'wbc', 'platelets']
  },
  organs: {
    label: 'Organwerte',
    icon: 'Stethoscope',
    markers: ['alt', 'ast', 'ggt', 'creatinine', 'egfr', 'albumin', 'crp', 'homocysteine', 'uric_acid', 'psa', 'lipase']
  }
};

// German display names for all markers
export const MARKER_DISPLAY_NAMES: Record<string, string> = {
  // Hormones
  total_testosterone: 'Gesamt-Testosteron',
  free_testosterone: 'Freies Testosteron',
  estradiol: 'Östradiol (E2)',
  shbg: 'SHBG',
  lh: 'LH',
  fsh: 'FSH',
  prolactin: 'Prolaktin',
  dhea_s: 'DHEA-S',
  cortisol: 'Cortisol',
  igf1: 'IGF-1',
  // Thyroid
  tsh: 'TSH',
  ft3: 'Freies T3',
  ft4: 'Freies T4',
  // Metabolic
  fasting_glucose: 'Nüchtern-Glukose',
  fasting_insulin: 'Nüchtern-Insulin',
  hba1c: 'HbA1c',
  homa_ir: 'HOMA-IR',
  // Lipids
  total_cholesterol: 'Gesamt-Cholesterin',
  ldl: 'LDL-Cholesterin',
  hdl: 'HDL-Cholesterin',
  triglycerides: 'Triglyceride',
  // Vitamins & Minerals
  vitamin_d: 'Vitamin D (25-OH)',
  vitamin_b12: 'Vitamin B12',
  ferritin: 'Ferritin',
  iron: 'Eisen',
  magnesium: 'Magnesium',
  zinc: 'Zink',
  calcium: 'Calcium',
  potassium: 'Kalium',
  sodium: 'Natrium',
  phosphate: 'Phosphat',
  // Blood
  hemoglobin: 'Hämoglobin',
  hematocrit: 'Hämatokrit',
  rbc: 'Erythrozyten (RBC)',
  wbc: 'Leukozyten (WBC)',
  platelets: 'Thrombozyten',
  // Organs
  alt: 'ALT (GPT)',
  ast: 'AST (GOT)',
  ggt: 'Gamma-GT',
  creatinine: 'Kreatinin',
  egfr: 'eGFR',
  albumin: 'Albumin',
  crp: 'CRP (hs)',
  homocysteine: 'Homocystein',
  uric_acid: 'Harnsäure',
  psa: 'PSA (Prostata)',
  lipase: 'Lipase (Pankreas)'
};

export interface ReferenceRange {
  marker_name: string;
  unit: string;
  normal_min: number | null;
  normal_max: number | null;
  optimal_min: number | null;
  optimal_max: number | null;
  male_normal_min: number | null;
  male_normal_max: number | null;
  male_optimal_min: number | null;
  male_optimal_max: number | null;
  female_normal_min: number | null;
  female_normal_max: number | null;
  female_optimal_min: number | null;
  female_optimal_max: number | null;
  higher_is_better: boolean | null;
  lower_is_better: boolean | null;
  coaching_tips: string | null;
  description: string | null;
}

export interface MarkerEvaluation {
  markerName: string;
  displayName: string;
  value: number;
  unit: string;
  status: MarkerStatus;
  referenceRange: { min: number; max: number };
  optimalRange: { min: number; max: number } | null;
  coachingTip: string | null;
  percentFromOptimal: number | null;
}

export interface BloodworkEntry {
  id: string;
  user_id: string;
  test_date: string;
  lab_name: string | null;
  is_fasted: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // All marker values
  [key: string]: string | number | boolean | null | undefined;
}

export interface BloodworkTrend {
  markerName: string;
  displayName: string;
  direction: 'improving' | 'stable' | 'declining';
  changePercent: number;
  previousValue: number;
  currentValue: number;
  previousDate: string;
}

// Helper to get display name for a marker
export function getMarkerDisplayName(markerKey: string): string {
  return MARKER_DISPLAY_NAMES[markerKey] || markerKey;
}

// Get all marker keys from all categories
export function getAllMarkerKeys(): string[] {
  return Object.values(MARKER_CATEGORIES).flatMap(cat => cat.markers);
}

// Get category for a marker
export function getMarkerCategory(markerKey: string): string | null {
  for (const [catKey, cat] of Object.entries(MARKER_CATEGORIES)) {
    if (cat.markers.includes(markerKey)) {
      return catKey;
    }
  }
  return null;
}
