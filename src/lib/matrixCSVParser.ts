// =====================================================
// ARES Matrix CSV Parser: v2.3 FINAL (PHASE 1-4 COMPLETE)
// NAD+ Age-Calibration, GLP-1 Lean Mass Protection, TRT Support
// Goal Weighting (Fat Loss/Muscle Gain/Cognitive), Peptide Synergies
// =====================================================

import type { RelevanceMatrix } from '@/types/relevanceMatrix';
import type { NecessityTier, EvidenceLevel } from '@/types/supplementLibrary';

/**
 * Parsed entry from the Matrix CSV
 */
export interface ParsedMatrixCSVEntry {
  // Identity
  name: string;
  category: string;
  
  // Base scoring fields
  impact_score: number;
  necessity_tier: NecessityTier;
  evidence_level: EvidenceLevel;
  protocol_phase: number;
  
  // Relevance Matrix
  relevance_matrix: RelevanceMatrix;
}

/**
 * Result of parsing the CSV
 */
export interface MatrixCSVParseResult {
  entries: ParsedMatrixCSVEntry[];
  errors: string[];
  stats: {
    total: number;
    essential: number;
    optimizer: number;
    specialist: number;
    strongEvidence: number;
    moderateEvidence: number;
  };
}

/**
 * Parse a single numeric value, returning undefined if empty/NaN
 */
function parseNumeric(value: string | undefined): number | undefined {
  if (!value || value.trim() === '') return undefined;
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}

/**
 * Parse necessity tier from CSV value
 */
function parseTier(value: string): NecessityTier {
  const normalized = value.toLowerCase().trim();
  if (normalized === 'essential') return 'essential';
  if (normalized === 'specialist') return 'specialist';
  return 'optimizer';
}

/**
 * Parse evidence level from CSV value
 */
function parseEvidence(value: string): EvidenceLevel {
  const normalized = value.toLowerCase().trim();
  if (normalized === 'strong' || normalized === 'stark') return 'stark';
  if (normalized === 'anekdotisch' || normalized === 'anecdotal') return 'anekdotisch';
  return 'moderat';
}

/**
 * Build a record from column prefix/suffix pairs
 * Only includes entries with non-zero values
 */
function buildModifierRecord(
  row: Record<string, string>,
  prefix: string,
  keyMap: Record<string, string>
): Record<string, number> | undefined {
  const result: Record<string, number> = {};
  let hasValues = false;
  
  for (const [csvSuffix, matrixKey] of Object.entries(keyMap)) {
    const csvKey = `${prefix}${csvSuffix}`;
    const value = parseNumeric(row[csvKey]);
    if (value !== undefined && value !== 0) {
      result[matrixKey] = value;
      hasValues = true;
    }
  }
  
  return hasValues ? result : undefined;
}

/**
 * Convert a CSV row to RelevanceMatrix
 */
function csvRowToRelevanceMatrix(row: Record<string, string>): RelevanceMatrix {
  const matrix: RelevanceMatrix = {};
  
  // Phase modifiers (phase_0, phase_1, phase_2, phase_3)
  const phaseModifiers: Record<string, number> = {};
  ['0', '1', '2', '3'].forEach(phase => {
    const value = parseNumeric(row[`phase_${phase}`]);
    if (value !== undefined && value !== 0) {
      phaseModifiers[phase] = value;
    }
  });
  if (Object.keys(phaseModifiers).length > 0) {
    matrix.phase_modifiers = phaseModifiers;
  }
  
  // Context modifiers
  const ctxMods = buildModifierRecord(row, 'ctx_', {
    'true_natural': 'true_natural',
    'enhanced_no_trt': 'enhanced_no_trt',
    'on_trt': 'on_trt',
    'on_glp1': 'on_glp1',
  });
  if (ctxMods) {
    matrix.context_modifiers = {
      true_natural: ctxMods.true_natural,
      enhanced_no_trt: ctxMods.enhanced_no_trt,
      on_trt: ctxMods.on_trt,
      on_glp1: ctxMods.on_glp1,
    };
  }
  
  // Goal modifiers
  matrix.goal_modifiers = buildModifierRecord(row, 'goal_', {
    'fat_loss': 'fat_loss',
    'muscle_gain': 'muscle_gain',
    'recomposition': 'recomposition',
    'maintenance': 'maintenance',
    'longevity': 'longevity',
    'performance': 'performance',
    'cognitive': 'cognitive',
    'sleep': 'sleep',
    'gut_health': 'gut_health',
  });
  
  // Calorie modifiers
  const calMods = buildModifierRecord(row, 'cal_', {
    'in_deficit': 'in_deficit',
    'in_surplus': 'in_surplus',
  });
  if (calMods) {
    matrix.calorie_modifiers = {
      in_deficit: calMods.in_deficit,
      in_surplus: calMods.in_surplus,
    };
  }
  
  // Demographic modifiers
  const demoMods = buildModifierRecord(row, 'demo_', {
    'age_over_40': 'age_over_40',
    'age_over_50': 'age_over_50',
    'age_over_60': 'age_over_60',
    'is_male': 'is_male',
    'is_female': 'is_female',
  });
  if (demoMods) {
    matrix.demographic_modifiers = {
      age_over_40: demoMods.age_over_40,
      age_over_50: demoMods.age_over_50,
      age_over_60: demoMods.age_over_60,
      is_male: demoMods.is_male,
      is_female: demoMods.is_female,
    };
  }
  
  // Peptide class modifiers
  matrix.peptide_class_modifiers = buildModifierRecord(row, 'pep_', {
    'gh_secretagogue': 'gh_secretagogue',
    'healing': 'healing',
    'longevity': 'longevity',
    'nootropic': 'nootropic',
    'metabolic': 'metabolic',
    'immune': 'immune',
    'testo': 'testo',
    'skin': 'skin',
  });
  
  // Bloodwork triggers
  matrix.bloodwork_triggers = buildModifierRecord(row, 'bw_', {
    'cortisol_high': 'cortisol_high',
    'testosterone_low': 'testosterone_low',
    'vitamin_d_low': 'vitamin_d_low',
    'magnesium_low': 'magnesium_low',
    'triglycerides_high': 'triglycerides_high',
    'inflammation_high': 'inflammation_high',
    'glucose_high': 'glucose_high',
    'insulin_resistant': 'insulin_resistant',
    'hdl_low': 'hdl_low',
    'ldl_high': 'ldl_high',
    'apob_high': 'apob_high',
    'ferritin_high': 'ferritin_high',
    'homocysteine_high': 'homocysteine_high',
    'nad_low': 'nad_low',
    'b12_low': 'b12_low',
    'iron_low': 'iron_low',
    'thyroid_slow': 'thyroid_slow',
  });
  
  // Compound synergies
  matrix.compound_synergies = buildModifierRecord(row, 'syn_', {
    'retatrutide': 'retatrutide',
    'tirzepatide': 'tirzepatide',
    'semaglutide': 'semaglutide',
    'epitalon': 'epitalon',
    'mots_c': 'mots_c',
    'bpc_157': 'bpc_157',
    'tb_500': 'tb_500',
    'cjc_1295': 'cjc_1295',
    'ipamorelin': 'ipamorelin',
  });
  
  return matrix;
}

/**
 * Parse CSV content to array of rows
 */
function parseCSVContent(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  // First line is header/comment, second is column names
  let headerLineIndex = 0;
  // Skip comment lines starting with #
  while (headerLineIndex < lines.length && lines[headerLineIndex].startsWith('#')) {
    headerLineIndex++;
  }
  
  const headerLine = lines[headerLineIndex];
  const headers = headerLine.split(',').map(h => h.trim());
  
  const rows: Record<string, string>[] = [];
  
  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.startsWith('#')) continue;
    
    const values = line.split(',');
    const row: Record<string, string> = {};
    
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() || '';
    });
    
    // Only add rows with a valid name
    if (row['name'] && row['name'].trim()) {
      rows.push(row);
    }
  }
  
  return rows;
}

/**
 * Main parser function for Matrix CSV v2.0
 */
export function parseMatrixCSV(csvContent: string): MatrixCSVParseResult {
  const result: MatrixCSVParseResult = {
    entries: [],
    errors: [],
    stats: {
      total: 0,
      essential: 0,
      optimizer: 0,
      specialist: 0,
      strongEvidence: 0,
      moderateEvidence: 0,
    },
  };
  
  try {
    const rows = parseCSVContent(csvContent);
    
    for (const row of rows) {
      try {
        const entry: ParsedMatrixCSVEntry = {
          name: row['name'],
          category: row['category'] || 'Sonstige',
          impact_score: parseNumeric(row['impact_score']) ?? 5.0,
          necessity_tier: parseTier(row['necessity_tier'] || 'optimizer'),
          evidence_level: parseEvidence(row['evidence_level'] || 'moderate'),
          protocol_phase: parseNumeric(row['protocol_phase']) ?? 0,
          relevance_matrix: csvRowToRelevanceMatrix(row),
        };
        
        result.entries.push(entry);
        result.stats.total++;
        
        // Update tier counts
        if (entry.necessity_tier === 'essential') result.stats.essential++;
        else if (entry.necessity_tier === 'specialist') result.stats.specialist++;
        else result.stats.optimizer++;
        
        // Update evidence counts
        if (entry.evidence_level === 'stark') result.stats.strongEvidence++;
        else result.stats.moderateEvidence++;
        
      } catch (rowError) {
        result.errors.push(`Row "${row['name']}": ${rowError instanceof Error ? rowError.message : 'Unknown error'}`);
      }
    }
    
  } catch (error) {
    result.errors.push(`CSV Parse Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return result;
}
