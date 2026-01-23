// Bloodwork Analysis Types for ARES Coach
// Phase 5: Clinical Marker Integration

export interface BloodworkEntry {
  id: string;
  user_id: string;
  test_date: string;
  lab_name: string | null;
  is_fasted: boolean;
  notes: string | null;
  // All markers as key-value pairs
  total_testosterone: number | null;
  free_testosterone: number | null;
  estradiol: number | null;
  shbg: number | null;
  lh: number | null;
  fsh: number | null;
  prolactin: number | null;
  dhea_s: number | null;
  cortisol: number | null;
  tsh: number | null;
  ft3: number | null;
  ft4: number | null;
  vitamin_d: number | null;
  vitamin_b12: number | null;
  ferritin: number | null;
  iron: number | null;
  hba1c: number | null;
  fasting_glucose: number | null;
  fasting_insulin: number | null;
  homa_ir: number | null;
  total_cholesterol: number | null;
  ldl: number | null;
  hdl: number | null;
  triglycerides: number | null;
  crp: number | null;
  homocysteine: number | null;
  hemoglobin: number | null;
  hematocrit: number | null;
  rbc: number | null;
  wbc: number | null;
  platelets: number | null;
  creatinine: number | null;
  egfr: number | null;
  alt: number | null;
  ast: number | null;
  ggt: number | null;
  albumin: number | null;
  zinc: number | null;
  magnesium: number | null;
  sodium: number | null;
  potassium: number | null;
  calcium: number | null;
  phosphate: number | null;
  uric_acid: number | null;
  psa: number | null;
  igf1: number | null;
}

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

export type MarkerStatus = 'optimal' | 'normal' | 'borderline_low' | 'borderline_high' | 'low' | 'high';

export interface MarkerEvaluation {
  markerName: string;
  displayName: string;
  value: number;
  unit: string;
  status: MarkerStatus;
  referenceRange: { low: number; high: number };
  optimalRange: { low: number; high: number } | null;
  coachingTip: string | null;
  percentFromOptimal: number | null;
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

export interface BloodworkContext {
  latest: BloodworkEntry | null;
  evaluations: MarkerEvaluation[];
  trends: BloodworkTrend[];
  criticalMarkers: MarkerEvaluation[];
  optimalMarkers: MarkerEvaluation[];
  hasData: boolean;
  testDate: string | null;
  summaryForPrompt: string;
}
