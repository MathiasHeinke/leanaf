/**
 * ARES Matrix CSV Export
 * Exports all supplement relevance matrices as a flat CSV for Excel/Sheets fine-tuning
 */

import { supabase } from '@/integrations/supabase/client';
import type { RelevanceMatrix } from '@/types/relevanceMatrix';

// All known modifier keys for consistent column ordering
const CSV_HEADERS = [
  // Base data
  'name', 'category', 'impact_score', 'necessity_tier', 'evidence_level', 'protocol_phase',
  
  // Phase modifiers
  'phase_0', 'phase_1', 'phase_2', 'phase_3',
  
  // Context modifiers
  'ctx_true_natural', 'ctx_enhanced_no_trt', 'ctx_on_trt', 'ctx_on_glp1',
  
  // Goal modifiers
  'goal_fat_loss', 'goal_muscle_gain', 'goal_recomposition', 'goal_maintenance',
  'goal_longevity', 'goal_performance', 'goal_cognitive', 'goal_sleep', 'goal_gut_health',
  
  // Calorie modifiers
  'cal_in_deficit', 'cal_in_surplus',
  
  // Demographic modifiers
  'demo_age_over_40', 'demo_age_over_50', 'demo_age_over_60', 'demo_is_male', 'demo_is_female',
  
  // Peptide class modifiers
  'pep_gh_secretagogue', 'pep_healing', 'pep_longevity', 'pep_nootropic',
  'pep_metabolic', 'pep_immune', 'pep_testo', 'pep_skin',
  
  // Bloodwork triggers
  'bw_cortisol_high', 'bw_testosterone_low', 'bw_vitamin_d_low', 'bw_magnesium_low',
  'bw_triglycerides_high', 'bw_inflammation_high', 'bw_glucose_high', 'bw_insulin_resistant',
  'bw_hdl_low', 'bw_ldl_high', 'bw_apob_high', 'bw_ferritin_high', 'bw_homocysteine_high',
  'bw_nad_low', 'bw_b12_low', 'bw_iron_low', 'bw_thyroid_slow',
  
  // Compound synergies
  'syn_retatrutide', 'syn_tirzepatide', 'syn_semaglutide', 'syn_epitalon', 'syn_mots_c',
  'syn_bpc_157', 'syn_tb_500', 'syn_cjc_1295', 'syn_ipamorelin'
] as const;

interface SupplementRow {
  name: string;
  category: string | null;
  impact_score: number | null;
  necessity_tier: string | null;
  evidence_level: string | null;
  protocol_phase: number | null;
  relevance_matrix: RelevanceMatrix | null;
}

/**
 * Flatten a relevance matrix into CSV column values
 */
function flattenMatrix(
  row: SupplementRow
): Record<string, string | number> {
  const matrix = row.relevance_matrix || {};
  const result: Record<string, string | number> = {};
  
  // Base data
  result['name'] = row.name || '';
  result['category'] = row.category || '';
  result['impact_score'] = row.impact_score ?? '';
  result['necessity_tier'] = row.necessity_tier || '';
  result['evidence_level'] = row.evidence_level || '';
  result['protocol_phase'] = row.protocol_phase ?? '';
  
  // Phase modifiers
  const phases = matrix.phase_modifiers || {};
  result['phase_0'] = phases['0'] ?? phases['phase_0'] ?? '';
  result['phase_1'] = phases['1'] ?? phases['phase_1'] ?? '';
  result['phase_2'] = phases['2'] ?? phases['phase_2'] ?? '';
  result['phase_3'] = phases['3'] ?? phases['phase_3'] ?? '';
  
  // Context modifiers
  const ctx = matrix.context_modifiers || {};
  result['ctx_true_natural'] = ctx.true_natural ?? '';
  result['ctx_enhanced_no_trt'] = ctx.enhanced_no_trt ?? '';
  result['ctx_on_trt'] = ctx.on_trt ?? '';
  result['ctx_on_glp1'] = ctx.on_glp1 ?? '';
  
  // Goal modifiers
  const goals = matrix.goal_modifiers || {};
  result['goal_fat_loss'] = goals.fat_loss ?? '';
  result['goal_muscle_gain'] = goals.muscle_gain ?? '';
  result['goal_recomposition'] = goals.recomposition ?? '';
  result['goal_maintenance'] = goals.maintenance ?? '';
  result['goal_longevity'] = goals.longevity ?? '';
  result['goal_performance'] = goals.performance ?? '';
  result['goal_cognitive'] = goals.cognitive ?? '';
  result['goal_sleep'] = goals.sleep ?? '';
  result['goal_gut_health'] = goals.gut_health ?? '';
  
  // Calorie modifiers
  const cal = matrix.calorie_modifiers || {};
  result['cal_in_deficit'] = cal.in_deficit ?? '';
  result['cal_in_surplus'] = cal.in_surplus ?? '';
  
  // Demographic modifiers
  const demo = matrix.demographic_modifiers || {};
  result['demo_age_over_40'] = demo.age_over_40 ?? '';
  result['demo_age_over_50'] = demo.age_over_50 ?? '';
  result['demo_age_over_60'] = demo.age_over_60 ?? '';
  result['demo_is_male'] = demo.is_male ?? '';
  result['demo_is_female'] = demo.is_female ?? '';
  
  // Peptide class modifiers
  const pep = matrix.peptide_class_modifiers || {};
  result['pep_gh_secretagogue'] = pep.gh_secretagogue ?? '';
  result['pep_healing'] = pep.healing ?? '';
  result['pep_longevity'] = pep.longevity ?? '';
  result['pep_nootropic'] = pep.nootropic ?? '';
  result['pep_metabolic'] = pep.metabolic ?? '';
  result['pep_immune'] = pep.immune ?? '';
  result['pep_testo'] = pep.testo ?? '';
  result['pep_skin'] = pep.skin ?? '';
  
  // Bloodwork triggers
  const bw = matrix.bloodwork_triggers || {};
  result['bw_cortisol_high'] = bw.cortisol_high ?? '';
  result['bw_testosterone_low'] = bw.testosterone_low ?? '';
  result['bw_vitamin_d_low'] = bw.vitamin_d_low ?? '';
  result['bw_magnesium_low'] = bw.magnesium_low ?? '';
  result['bw_triglycerides_high'] = bw.triglycerides_high ?? '';
  result['bw_inflammation_high'] = bw.inflammation_high ?? '';
  result['bw_glucose_high'] = bw.glucose_high ?? '';
  result['bw_insulin_resistant'] = bw.insulin_resistant ?? '';
  result['bw_hdl_low'] = bw.hdl_low ?? '';
  result['bw_ldl_high'] = bw.ldl_high ?? '';
  result['bw_apob_high'] = bw.apob_high ?? '';
  result['bw_ferritin_high'] = bw.ferritin_high ?? '';
  result['bw_homocysteine_high'] = bw.homocysteine_high ?? '';
  result['bw_nad_low'] = bw.nad_low ?? '';
  result['bw_b12_low'] = bw.b12_low ?? '';
  result['bw_iron_low'] = bw.iron_low ?? '';
  result['bw_thyroid_slow'] = bw.thyroid_slow ?? '';
  
  // Compound synergies
  const syn = matrix.compound_synergies || {};
  result['syn_retatrutide'] = syn.retatrutide ?? '';
  result['syn_tirzepatide'] = syn.tirzepatide ?? '';
  result['syn_semaglutide'] = syn.semaglutide ?? '';
  result['syn_epitalon'] = syn.epitalon ?? '';
  result['syn_mots_c'] = syn.mots_c ?? '';
  result['syn_bpc_157'] = syn.bpc_157 ?? '';
  result['syn_tb_500'] = syn.tb_500 ?? '';
  result['syn_cjc_1295'] = syn.cjc_1295 ?? '';
  result['syn_ipamorelin'] = syn.ipamorelin ?? '';
  
  return result;
}

/**
 * Escape CSV values (handle commas, quotes, newlines)
 */
function escapeCSV(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate and download the complete ARES Matrix CSV
 */
export async function exportSupplementMatrixCSV(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    // Fetch all supplements with relevance_matrix
    const { data, error } = await supabase
      .from('supplement_database')
      .select('name, category, impact_score, necessity_tier, evidence_level, protocol_phase, relevance_matrix')
      .not('relevance_matrix', 'is', null)
      .order('impact_score', { ascending: false });
    
    if (error) {
      console.error('Failed to fetch supplements:', error);
      return { success: false, error: error.message };
    }
    
    if (!data || data.length === 0) {
      return { success: false, error: 'Keine Supplements mit Relevance Matrix gefunden' };
    }
    
    // Build CSV content
    const rows: string[] = [];
    
    // Documentation legend for external users
    const legendRow = [
      '# ARES Matrix Export',
      'Legende: phase_X = Phasen-Boost (0-3)',
      'ctx_* = Kontext (Natural/Enhanced/TRT/GLP-1)',
      'goal_* = Ziel-Modifier',
      'cal_* = Kalorien-Status',
      'demo_* = Demografie',
      'pep_* = Peptid-Klassen',
      'bw_* = Blutwert-Trigger',
      'syn_* = Substanz-Synergien',
      'Positive Werte = Score-Boost',
      'Negative Werte = Penalty',
      'MAX_SINGLE_MODIFIER = 4.0',
      'MAX_TOTAL_BOOST = 12.0'
    ].join(' | ');
    rows.push(legendRow);
    
    // Header row
    rows.push(CSV_HEADERS.map(h => escapeCSV(h)).join(','));
    
    // Data rows
    for (const supplement of data) {
      const flattened = flattenMatrix(supplement as SupplementRow);
      const rowValues = CSV_HEADERS.map(header => escapeCSV(flattened[header] ?? ''));
      rows.push(rowValues.join(','));
    }
    
    // Add UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    const csvContent = BOM + rows.join('\n');
    
    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const today = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `ares_matrix_export_${today}.csv`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`✅ Exported ${data.length} supplements to CSV`);
    return { success: true, count: data.length };
    
  } catch (err) {
    console.error('CSV export failed:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unbekannter Fehler' 
    };
  }
}
