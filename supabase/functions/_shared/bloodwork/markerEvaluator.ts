// Marker Evaluator for ARES Bloodwork System
// Evaluates individual markers against reference ranges

import type { BloodworkEntry, ReferenceRange, MarkerEvaluation, MarkerStatus } from './types.ts';

// Display names for markers (German)
const MARKER_DISPLAY_NAMES: Record<string, string> = {
  total_testosterone: 'Gesamt-Testosteron',
  free_testosterone: 'Freies Testosteron',
  estradiol: 'Estradiol (E2)',
  shbg: 'SHBG',
  lh: 'LH',
  fsh: 'FSH',
  prolactin: 'Prolaktin',
  dhea_s: 'DHEA-S',
  cortisol: 'Cortisol',
  tsh: 'TSH',
  ft3: 'fT3',
  ft4: 'fT4',
  vitamin_d: 'Vitamin D',
  vitamin_b12: 'Vitamin B12',
  ferritin: 'Ferritin',
  iron: 'Eisen',
  hba1c: 'HbA1c',
  fasting_glucose: 'Nuechtern-Glukose',
  fasting_insulin: 'Nuechtern-Insulin',
  homa_ir: 'HOMA-IR',
  total_cholesterol: 'Gesamt-Cholesterin',
  ldl: 'LDL-Cholesterin',
  hdl: 'HDL-Cholesterin',
  triglycerides: 'Triglyceride',
  crp: 'CRP (Entzuendung)',
  homocysteine: 'Homocystein',
  hemoglobin: 'Haemoglobin',
  hematocrit: 'Haematokrit',
  rbc: 'Erythrozyten',
  wbc: 'Leukozyten',
  platelets: 'Thrombozyten',
  creatinine: 'Kreatinin',
  egfr: 'eGFR (Nierenfunktion)',
  alt: 'ALT (GPT)',
  ast: 'AST (GOT)',
  ggt: 'GGT',
  albumin: 'Albumin',
  zinc: 'Zink',
  magnesium: 'Magnesium',
  sodium: 'Natrium',
  potassium: 'Kalium',
  calcium: 'Calcium',
  phosphate: 'Phosphat',
  uric_acid: 'Harnsaeure',
  psa: 'PSA',
  igf1: 'IGF-1'
};

/**
 * Evaluate all markers in a bloodwork entry against reference ranges
 */
export async function evaluateMarkers(
  bloodwork: BloodworkEntry,
  supabase: any,
  userGender?: 'male' | 'female'
): Promise<MarkerEvaluation[]> {
  const evaluations: MarkerEvaluation[] = [];
  
  try {
    // Load all reference ranges
    const { data: ranges, error } = await supabase
      .from('bloodwork_reference_ranges')
      .select('*');
    
    if (error || !ranges) {
      console.error('[BLOODWORK] Error loading reference ranges:', error);
      return evaluations;
    }
    
    // Create lookup map
    const rangeMap = new Map<string, ReferenceRange>();
    for (const range of ranges) {
      rangeMap.set(range.marker_name.toLowerCase(), range);
    }
    
    // Evaluate each marker that has a value
    const markerKeys = Object.keys(bloodwork).filter(key => 
      !['id', 'user_id', 'test_date', 'lab_name', 'is_fasted', 'notes', 'created_at', 'updated_at'].includes(key)
    );
    
    for (const key of markerKeys) {
      const value = (bloodwork as any)[key];
      if (value === null || value === undefined) continue;
      
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(numValue)) continue;
      
      const range = rangeMap.get(key.toLowerCase());
      if (!range) continue;
      
      const evaluation = evaluateSingleMarker(key, numValue, range, userGender);
      if (evaluation) {
        evaluations.push(evaluation);
      }
    }
    
    return evaluations;
    
  } catch (error) {
    console.error('[BLOODWORK] Error evaluating markers:', error);
    return evaluations;
  }
}

/**
 * Evaluate a single marker against its reference range
 */
function evaluateSingleMarker(
  markerName: string,
  value: number,
  range: ReferenceRange,
  userGender?: 'male' | 'female'
): MarkerEvaluation | null {
  // Get gender-specific ranges if available
  let normalMin = range.normal_min;
  let normalMax = range.normal_max;
  let optimalMin = range.optimal_min;
  let optimalMax = range.optimal_max;
  
  if (userGender === 'male') {
    normalMin = range.male_normal_min ?? normalMin;
    normalMax = range.male_normal_max ?? normalMax;
    optimalMin = range.male_optimal_min ?? optimalMin;
    optimalMax = range.male_optimal_max ?? optimalMax;
  } else if (userGender === 'female') {
    normalMin = range.female_normal_min ?? normalMin;
    normalMax = range.female_normal_max ?? normalMax;
    optimalMin = range.female_optimal_min ?? optimalMin;
    optimalMax = range.female_optimal_max ?? optimalMax;
  }
  
  // Skip if no reference range defined
  if (normalMin === null && normalMax === null) {
    return null;
  }
  
  // Determine status
  const status = determineMarkerStatus(
    value, 
    normalMin ?? 0, 
    normalMax ?? Infinity,
    optimalMin,
    optimalMax,
    range.higher_is_better,
    range.lower_is_better
  );
  
  // Calculate percent from optimal (if optimal range exists)
  let percentFromOptimal: number | null = null;
  if (optimalMin !== null && optimalMax !== null) {
    const optimalMid = (optimalMin + optimalMax) / 2;
    percentFromOptimal = ((value - optimalMid) / optimalMid) * 100;
  }
  
  return {
    markerName,
    displayName: MARKER_DISPLAY_NAMES[markerName] || markerName,
    value,
    unit: range.unit,
    status,
    referenceRange: { 
      low: normalMin ?? 0, 
      high: normalMax ?? Infinity 
    },
    optimalRange: optimalMin !== null && optimalMax !== null 
      ? { low: optimalMin, high: optimalMax }
      : null,
    coachingTip: range.coaching_tips,
    percentFromOptimal
  };
}

/**
 * Determine the status of a marker based on its value and ranges
 */
function determineMarkerStatus(
  value: number,
  normalMin: number,
  normalMax: number,
  optimalMin: number | null,
  optimalMax: number | null,
  higherIsBetter: boolean | null,
  lowerIsBetter: boolean | null
): MarkerStatus {
  // Check if in optimal range first
  if (optimalMin !== null && optimalMax !== null) {
    if (value >= optimalMin && value <= optimalMax) {
      return 'optimal';
    }
  }
  
  // Check normal range
  if (value >= normalMin && value <= normalMax) {
    // In normal range but not optimal
    if (optimalMin !== null && optimalMax !== null) {
      // Check if borderline
      const normalRange = normalMax - normalMin;
      const borderlineThreshold = normalRange * 0.1; // 10% of range
      
      if (value < normalMin + borderlineThreshold) {
        return higherIsBetter ? 'borderline_low' : 'normal';
      }
      if (value > normalMax - borderlineThreshold) {
        return lowerIsBetter ? 'borderline_high' : 'normal';
      }
    }
    return 'normal';
  }
  
  // Outside normal range
  if (value < normalMin) {
    // Check if borderline (within 10% of min)
    const threshold = normalMin * 0.1;
    if (value >= normalMin - threshold) {
      return 'borderline_low';
    }
    return 'low';
  }
  
  if (value > normalMax) {
    // Check if borderline (within 10% of max)
    const threshold = normalMax * 0.1;
    if (value <= normalMax + threshold) {
      return 'borderline_high';
    }
    return 'high';
  }
  
  return 'normal';
}

/**
 * Get status display string in German
 */
export function getStatusDisplay(status: MarkerStatus): string {
  const statusMap: Record<MarkerStatus, string> = {
    'optimal': 'OPTIMAL',
    'normal': 'NORMAL',
    'borderline_low': 'GRENZWERTIG NIEDRIG',
    'borderline_high': 'GRENZWERTIG HOCH',
    'low': 'ZU NIEDRIG',
    'high': 'ZU HOCH'
  };
  return statusMap[status] || status.toUpperCase();
}

/**
 * Check if a marker status is critical (needs attention)
 */
export function isCriticalStatus(status: MarkerStatus): boolean {
  return ['low', 'high', 'borderline_low', 'borderline_high'].includes(status);
}
