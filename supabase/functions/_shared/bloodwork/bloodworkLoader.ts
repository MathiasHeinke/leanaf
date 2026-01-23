// Bloodwork Loader for ARES Coach
// Phase 5: Load and analyze user bloodwork data

import type { BloodworkEntry, BloodworkContext, MarkerEvaluation } from './types.ts';
import { evaluateMarkers, getStatusDisplay, isCriticalStatus } from './markerEvaluator.ts';
import { detectTrends, formatTrend, getTrendSummary } from './trendDetector.ts';

/**
 * Load complete bloodwork context for a user
 */
export async function loadBloodworkContext(
  userId: string,
  supabase: any,
  userGender?: 'male' | 'female'
): Promise<BloodworkContext> {
  const emptyResult: BloodworkContext = {
    latest: null,
    evaluations: [],
    trends: [],
    criticalMarkers: [],
    optimalMarkers: [],
    hasData: false,
    testDate: null,
    summaryForPrompt: ''
  };
  
  try {
    // Load latest bloodwork entry
    const { data: latestData, error: latestError } = await supabase
      .from('user_bloodwork')
      .select('*')
      .eq('user_id', userId)
      .order('test_date', { ascending: false })
      .limit(1)
      .single();
    
    if (latestError || !latestData) {
      console.log('[BLOODWORK] No bloodwork data found for user');
      return emptyResult;
    }
    
    const latest = latestData as BloodworkEntry;
    console.log('[BLOODWORK] Latest test date: ' + latest.test_date);
    
    // Load previous bloodwork for trend analysis
    const { data: previousData } = await supabase
      .from('user_bloodwork')
      .select('*')
      .eq('user_id', userId)
      .lt('test_date', latest.test_date)
      .order('test_date', { ascending: false })
      .limit(1)
      .single();
    
    const previous = previousData as BloodworkEntry | null;
    
    // Evaluate all markers
    const evaluations = await evaluateMarkers(latest, supabase, userGender);
    console.log('[BLOODWORK] Evaluated ' + evaluations.length + ' markers');
    
    // Detect trends
    const trends = detectTrends(latest, previous);
    console.log('[BLOODWORK] Detected ' + trends.length + ' significant trends');
    
    // Filter critical and optimal markers
    const criticalMarkers = evaluations.filter(e => isCriticalStatus(e.status));
    const optimalMarkers = evaluations.filter(e => e.status === 'optimal');
    
    // Build summary for prompt
    const summaryForPrompt = buildPromptSummary(latest, evaluations, trends, criticalMarkers);
    
    return {
      latest,
      evaluations,
      trends,
      criticalMarkers,
      optimalMarkers,
      hasData: true,
      testDate: latest.test_date,
      summaryForPrompt
    };
    
  } catch (error) {
    console.error('[BLOODWORK] Error loading bloodwork context:', error);
    return emptyResult;
  }
}

/**
 * Build a summary string for prompt injection
 */
function buildPromptSummary(
  latest: BloodworkEntry,
  evaluations: MarkerEvaluation[],
  trends: any[],
  criticalMarkers: MarkerEvaluation[]
): string {
  const lines: string[] = [];
  
  // Test date and info
  lines.push('Testdatum: ' + latest.test_date);
  if (latest.lab_name) {
    lines.push('Labor: ' + latest.lab_name);
  }
  if (latest.is_fasted) {
    lines.push('Nuechtern: Ja');
  }
  lines.push('');
  
  // Critical markers (most important)
  if (criticalMarkers.length > 0) {
    lines.push('AUFFAELLIGE WERTE:');
    for (const marker of criticalMarkers.slice(0, 5)) {
      lines.push(`  - ${marker.displayName}: ${marker.value} ${marker.unit} (${getStatusDisplay(marker.status)})`);
      if (marker.coachingTip) {
        lines.push(`    Tipp: ${marker.coachingTip.substring(0, 100)}...`);
      }
    }
    lines.push('');
  }
  
  // Key metrics summary (always include these if available)
  const keyMetrics: string[] = [];
  for (const eval_ of evaluations) {
    if (['total_testosterone', 'vitamin_d', 'hba1c', 'ferritin', 'tsh'].includes(eval_.markerName)) {
      keyMetrics.push(`${eval_.displayName}: ${eval_.value} ${eval_.unit} (${getStatusDisplay(eval_.status)})`);
    }
  }
  if (keyMetrics.length > 0) {
    lines.push('WICHTIGE MARKER:');
    keyMetrics.forEach(m => lines.push('  - ' + m));
    lines.push('');
  }
  
  // Trends
  if (trends.length > 0) {
    lines.push('TRENDS SEIT LETZTEM TEST:');
    for (const trend of trends.slice(0, 5)) {
      lines.push('  - ' + formatTrend(trend));
    }
    lines.push('');
  }
  
  // Overall summary
  const optimalCount = evaluations.filter(e => e.status === 'optimal').length;
  const normalCount = evaluations.filter(e => e.status === 'normal').length;
  const criticalCount = criticalMarkers.length;
  
  lines.push(`ZUSAMMENFASSUNG: ${optimalCount} optimal, ${normalCount} normal, ${criticalCount} auffaellig von ${evaluations.length} Markern`);
  
  return lines.join('\n');
}

/**
 * Format bloodwork context for prompt injection
 */
export function formatBloodworkForPrompt(context: BloodworkContext): string {
  if (!context.hasData) {
    return '';
  }
  
  return [
    '',
    '== AKTUELLE BLUTWERTE ==',
    context.summaryForPrompt,
    ''
  ].join('\n');
}
