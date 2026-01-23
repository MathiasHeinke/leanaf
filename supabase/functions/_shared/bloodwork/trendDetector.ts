// Trend Detector for ARES Bloodwork System
// Compares bloodwork entries over time to detect trends

import type { BloodworkEntry, BloodworkTrend } from './types.ts';

// Display names for markers (German)
const MARKER_DISPLAY_NAMES: Record<string, string> = {
  total_testosterone: 'Gesamt-Testosteron',
  free_testosterone: 'Freies Testosteron',
  estradiol: 'Estradiol (E2)',
  shbg: 'SHBG',
  vitamin_d: 'Vitamin D',
  vitamin_b12: 'Vitamin B12',
  ferritin: 'Ferritin',
  hba1c: 'HbA1c',
  fasting_glucose: 'Nuechtern-Glukose',
  homa_ir: 'HOMA-IR',
  ldl: 'LDL-Cholesterin',
  hdl: 'HDL-Cholesterin',
  triglycerides: 'Triglyceride',
  crp: 'CRP',
  hemoglobin: 'Haemoglobin',
  hematocrit: 'Haematokrit',
  alt: 'ALT (GPT)',
  ast: 'AST (GOT)',
  tsh: 'TSH',
  cortisol: 'Cortisol'
};

// Markers where lower is better (for determining "improving" direction)
const LOWER_IS_BETTER = new Set([
  'hba1c', 'fasting_glucose', 'fasting_insulin', 'homa_ir',
  'ldl', 'triglycerides', 'total_cholesterol',
  'crp', 'homocysteine',
  'alt', 'ast', 'ggt',
  'cortisol', 'prolactin',
  'uric_acid', 'creatinine',
  'estradiol' // for males typically
]);

// Markers where higher is better
const HIGHER_IS_BETTER = new Set([
  'total_testosterone', 'free_testosterone',
  'hdl',
  'vitamin_d', 'vitamin_b12', 'ferritin', 'iron',
  'egfr',
  'albumin',
  'dhea_s', 'igf1'
]);

// Threshold for considering a change significant (percentage)
const SIGNIFICANT_CHANGE_THRESHOLD = 5;

/**
 * Detect trends between two bloodwork entries
 */
export function detectTrends(
  current: BloodworkEntry,
  previous: BloodworkEntry | null
): BloodworkTrend[] {
  const trends: BloodworkTrend[] = [];
  
  if (!previous) {
    return trends;
  }
  
  // Get all marker keys
  const markerKeys = Object.keys(current).filter(key => 
    !['id', 'user_id', 'test_date', 'lab_name', 'is_fasted', 'notes', 'created_at', 'updated_at'].includes(key)
  );
  
  for (const key of markerKeys) {
    const currentValue = (current as any)[key];
    const previousValue = (previous as any)[key];
    
    // Skip if either value is missing
    if (currentValue === null || currentValue === undefined) continue;
    if (previousValue === null || previousValue === undefined) continue;
    
    const currentNum = typeof currentValue === 'number' ? currentValue : parseFloat(currentValue);
    const previousNum = typeof previousValue === 'number' ? previousValue : parseFloat(previousValue);
    
    if (isNaN(currentNum) || isNaN(previousNum)) continue;
    if (previousNum === 0) continue; // Avoid division by zero
    
    // Calculate percentage change
    const changePercent = ((currentNum - previousNum) / previousNum) * 100;
    
    // Determine direction based on marker type
    const direction = determineTrendDirection(key, changePercent);
    
    // Only include if change is significant
    if (Math.abs(changePercent) >= SIGNIFICANT_CHANGE_THRESHOLD) {
      trends.push({
        markerName: key,
        displayName: MARKER_DISPLAY_NAMES[key] || key,
        direction,
        changePercent: Math.round(changePercent * 10) / 10, // Round to 1 decimal
        previousValue: previousNum,
        currentValue: currentNum,
        previousDate: previous.test_date
      });
    }
  }
  
  // Sort by absolute change (most significant first)
  trends.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  
  return trends;
}

/**
 * Determine if a trend is improving, declining, or stable
 */
function determineTrendDirection(
  markerName: string,
  changePercent: number
): 'improving' | 'stable' | 'declining' {
  // Check if change is significant enough
  if (Math.abs(changePercent) < SIGNIFICANT_CHANGE_THRESHOLD) {
    return 'stable';
  }
  
  // Determine if the change is positive or negative for health
  const isLowerBetter = LOWER_IS_BETTER.has(markerName);
  const isHigherBetter = HIGHER_IS_BETTER.has(markerName);
  
  if (isLowerBetter) {
    // For markers where lower is better:
    // - Decrease = improving
    // - Increase = declining
    return changePercent < 0 ? 'improving' : 'declining';
  }
  
  if (isHigherBetter) {
    // For markers where higher is better:
    // - Increase = improving
    // - Decrease = declining
    return changePercent > 0 ? 'improving' : 'declining';
  }
  
  // For markers where optimal is in the middle (not clearly better in one direction)
  // Just report as stable or note the change without judgment
  return 'stable';
}

/**
 * Format a single trend for display
 */
export function formatTrend(trend: BloodworkTrend): string {
  const arrow = trend.direction === 'improving' ? '↑' : 
                trend.direction === 'declining' ? '↓' : '→';
  
  const sign = trend.changePercent >= 0 ? '+' : '';
  
  return `${trend.displayName}: ${arrow} ${sign}${trend.changePercent}% (${trend.previousValue} → ${trend.currentValue})`;
}

/**
 * Get trend summary for prompt
 */
export function getTrendSummary(trends: BloodworkTrend[]): string {
  if (trends.length === 0) {
    return 'Keine signifikanten Veraenderungen seit dem letzten Test.';
  }
  
  const improving = trends.filter(t => t.direction === 'improving');
  const declining = trends.filter(t => t.direction === 'declining');
  
  const parts: string[] = [];
  
  if (improving.length > 0) {
    parts.push(`Verbessert: ${improving.map(t => t.displayName).join(', ')}`);
  }
  
  if (declining.length > 0) {
    parts.push(`Verschlechtert: ${declining.map(t => t.displayName).join(', ')}`);
  }
  
  return parts.join(' | ');
}
