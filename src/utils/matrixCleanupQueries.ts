/**
 * ARES Matrix Cleanup Queries
 * 
 * Quick Win-Korrekturen für die Supplement-Matrix:
 * 1. Duplikate entfernen (relevance_matrix auf NULL setzen)
 * 2. Sprache vereinheitlichen (evidence_level)
 * 3. Kategorien normalisieren
 * 4. Kritische Modifier-Neugewichtung
 */

import { supabase } from '@/integrations/supabase/client';

// =====================================================
// Quick Win 1: Duplikate bereinigen
// =====================================================
export const DUPLICATE_CLEANUP_QUERY = `
-- Entferne Matrix von Duplikaten (behalte Produkt-Links, nur Matrix auf NULL)
UPDATE supplement_database
SET relevance_matrix = NULL
WHERE name IN (
  -- NMN Duplikate (behalte 'NMN' mit 9.0)
  'NMN (Nicotinamid Mononukleotid)',
  'NMN sublingual',
  
  -- Magnesium Duplikate (behalte 'Magnesium Glycinat' mit 9.5)
  'Magnesium',
  'Magnesiumcitrat', 
  'Magnesium Komplex 11',
  
  -- Creatin Duplikat (behalte 'Creatine Monohydrat' mit 9.8)
  'Creatin',
  
  -- Omega-3 Duplikat (behalte 'Omega-3 (EPA/DHA)' mit 9.2)
  'Omega-3',
  
  -- Vitamin D Duplikate (behalte 'Vitamin D3 + K2' mit 9.0)
  'Vitamin D3',
  'Vitamin D Balance',
  'Vitamin D3 + K2 MK7 Tropfen',
  
  -- HMB Duplikat (behalte 'HMB' mit 7.5)
  'HMB 3000',
  
  -- CaAKG Duplikat (behalte 'CaAKG' mit 8.5)
  'Ca-AKG (Rejuvant)',
  
  -- GlyNAC Duplikat (behalte 'GlyNAC' mit 8.5)
  'GLY-NAC',
  
  -- Ashwagandha Duplikat (behalte 'Ashwagandha KSM-66' mit 7.8)
  'Ashwagandha'
);
`;

// =====================================================
// Quick Win 2: Sprache vereinheitlichen (evidence_level)
// =====================================================
export const LANGUAGE_NORMALIZATION_QUERY = `
-- Normalisiere evidence_level zu englischen Begriffen
UPDATE supplement_database
SET evidence_level = 'moderate'
WHERE evidence_level = 'moderat';

UPDATE supplement_database
SET evidence_level = 'strong'
WHERE evidence_level = 'stark';
`;

// =====================================================
// Quick Win 3: Kategorien normalisieren (Deutsch als Standard)
// =====================================================
export const CATEGORY_NORMALIZATION_QUERY = `
-- Normalisiere Kategorien zu deutschem Standard
UPDATE supplement_database
SET category = 'Longevity'
WHERE LOWER(category) = 'longevity' AND category != 'Longevity';

UPDATE supplement_database
SET category = 'Schlaf'
WHERE LOWER(category) = 'sleep';

UPDATE supplement_database
SET category = 'Kognition'
WHERE LOWER(category) IN ('brain', 'cognitive');

UPDATE supplement_database
SET category = 'Antioxidantien'
WHERE LOWER(category) = 'antioxidant';

UPDATE supplement_database
SET category = 'Muskelerhalt'
WHERE LOWER(category) = 'recovery';

UPDATE supplement_database
SET category = 'Spezialisiert'
WHERE LOWER(category) = 'specialized';

UPDATE supplement_database
SET category = 'Gelenke'
WHERE LOWER(category) = 'musculoskeletal';

UPDATE supplement_database
SET category = 'Hormone'
WHERE LOWER(category) = 'hormonal';

UPDATE supplement_database
SET category = 'Leber'
WHERE LOWER(category) = 'liver';

UPDATE supplement_database
SET category = 'Performance'
WHERE LOWER(category) = 'sport';

UPDATE supplement_database
SET category = 'Energie'
WHERE LOWER(category) = 'metabolic';
`;

// =====================================================
// Quick Win 4: Kritische Modifier-Neugewichtung
// =====================================================

// 4A) NMN - Alters-Modifier begrenzen
export const NMN_MODIFIER_FIX_QUERY = `
-- NMN: Alters-Modifier neu gewichten
UPDATE supplement_database
SET relevance_matrix = relevance_matrix || jsonb_build_object(
  'demographic_modifiers', jsonb_build_object(
    'age_over_40', 1.0,
    'age_over_50', 2.0,
    'age_over_60', 3.0
  )
)
WHERE LOWER(name) = 'nmn' AND relevance_matrix IS NOT NULL;
`;

// 4B) HMB - GLP-1 Modifier korrigieren
export const HMB_MODIFIER_FIX_QUERY = `
-- HMB: GLP-1 Modifier in richtige Spalte + Synergien
UPDATE supplement_database
SET relevance_matrix = relevance_matrix 
  || jsonb_build_object(
    'context_modifiers', COALESCE(relevance_matrix->'context_modifiers', '{}'::jsonb) 
      || jsonb_build_object('on_glp1', 4.0, 'enhanced_no_trt', 2.0)
  )
  || jsonb_build_object(
    'compound_synergies', COALESCE(relevance_matrix->'compound_synergies', '{}'::jsonb)
      || jsonb_build_object('semaglutide', 3.0, 'tirzepatide', 3.0)
  )
WHERE LOWER(name) = 'hmb' AND relevance_matrix IS NOT NULL;
`;

// 4C) Tongkat Ali - Natural-Boost reduzieren
export const TONGKAT_MODIFIER_FIX_QUERY = `
-- Tongkat Ali: Natural-Boost reduzieren, Male-Modifier hinzufuegen
UPDATE supplement_database
SET relevance_matrix = relevance_matrix 
  || jsonb_build_object(
    'context_modifiers', COALESCE(relevance_matrix->'context_modifiers', '{}'::jsonb)
      || jsonb_build_object('true_natural', 1.5)
  )
  || jsonb_build_object(
    'demographic_modifiers', COALESCE(relevance_matrix->'demographic_modifiers', '{}'::jsonb)
      || jsonb_build_object('is_male', 1.0)
  )
WHERE LOWER(name) LIKE '%tongkat%' AND relevance_matrix IS NOT NULL;
`;

// 4D) Berberin - Insulin-Modifier ergänzen
export const BERBERINE_MODIFIER_FIX_QUERY = `
-- Berberin: Insulin-Resistenz Trigger hinzufuegen, Glucose leicht reduzieren
UPDATE supplement_database
SET relevance_matrix = relevance_matrix 
  || jsonb_build_object(
    'bloodwork_triggers', COALESCE(relevance_matrix->'bloodwork_triggers', '{}'::jsonb)
      || jsonb_build_object('glucose_high', 3.0, 'insulin_resistant', 4.0)
  )
WHERE LOWER(name) LIKE '%berberin%' AND relevance_matrix IS NOT NULL;
`;

// =====================================================
// Execution Functions
// =====================================================

interface CleanupResult {
  success: boolean;
  step: string;
  rowsAffected?: number;
  error?: string;
}

/**
 * Execute cleanup by directly updating the database
 * Note: Raw SQL execution requires admin privileges or a dedicated edge function
 * For now, we provide the queries for manual execution in Supabase SQL Editor
 */
export async function executeMatrixCleanup(): Promise<CleanupResult[]> {
  const results: CleanupResult[] = [];
  
  try {
    // Step 1: Duplikate bereinigen
    const duplicateNames = [
      'NMN (Nicotinamid Mononukleotid)', 'NMN sublingual',
      'Magnesium', 'Magnesiumcitrat', 'Magnesium Komplex 11',
      'Creatin', 'Omega-3',
      'Vitamin D3', 'Vitamin D Balance', 'Vitamin D3 + K2 MK7 Tropfen',
      'HMB 3000', 'Ca-AKG (Rejuvant)', 'GLY-NAC', 'Ashwagandha'
    ];
    
    const { error: dupError } = await supabase
      .from('supplement_database')
      .update({ relevance_matrix: null })
      .in('name', duplicateNames);
    
    if (dupError) {
      results.push({ success: false, step: 'Duplikate bereinigen', error: dupError.message });
    } else {
      results.push({ success: true, step: 'Duplikate bereinigen' });
    }
    
    // Step 2: evidence_level normalisieren
    const { error: langError1 } = await supabase
      .from('supplement_database')
      .update({ evidence_level: 'moderate' })
      .eq('evidence_level', 'moderat');
    
    const { error: langError2 } = await supabase
      .from('supplement_database')
      .update({ evidence_level: 'strong' })
      .eq('evidence_level', 'stark');
    
    if (langError1 || langError2) {
      results.push({ success: false, step: 'Sprache normalisieren', error: langError1?.message || langError2?.message });
    } else {
      results.push({ success: true, step: 'Sprache normalisieren' });
    }
    
    // Step 3: Kategorien normalisieren
    const categoryMappings = [
      { from: 'sleep', to: 'Schlaf' },
      { from: 'brain', to: 'Kognition' },
      { from: 'cognitive', to: 'Kognition' },
      { from: 'antioxidant', to: 'Antioxidantien' },
      { from: 'recovery', to: 'Muskelerhalt' },
      { from: 'specialized', to: 'Spezialisiert' },
      { from: 'musculoskeletal', to: 'Gelenke' },
      { from: 'hormonal', to: 'Hormone' },
      { from: 'liver', to: 'Leber' },
      { from: 'sport', to: 'Performance' },
      { from: 'metabolic', to: 'Energie' },
    ];
    
    let categoryErrors = 0;
    for (const mapping of categoryMappings) {
      const { error } = await supabase
        .from('supplement_database')
        .update({ category: mapping.to })
        .ilike('category', mapping.from);
      if (error) categoryErrors++;
    }
    
    // Also fix lowercase 'longevity' -> 'Longevity'
    await supabase
      .from('supplement_database')
      .update({ category: 'Longevity' })
      .eq('category', 'longevity');
    
    results.push({ 
      success: categoryErrors === 0, 
      step: 'Kategorien normalisieren',
      error: categoryErrors > 0 ? `${categoryErrors} Kategorie-Updates fehlgeschlagen` : undefined
    });
    
    // Step 4: Modifier-Fixes müssen via SQL Editor durchgeführt werden
    // (JSONB-Operationen erfordern raw SQL)
    results.push({ 
      success: true, 
      step: 'Modifier-Fixes (manuell)',
      error: 'JSONB-Updates müssen im Supabase SQL Editor ausgeführt werden - siehe Konsole'
    });
    
    // Log the SQL for manual execution
    console.log('=== MANUELLE SQL-UPDATES FÜR MODIFIER ===');
    console.log('Bitte im Supabase SQL Editor ausführen:');
    console.log('\n--- NMN ---');
    console.log(NMN_MODIFIER_FIX_QUERY);
    console.log('\n--- HMB ---');
    console.log(HMB_MODIFIER_FIX_QUERY);
    console.log('\n--- Tongkat Ali ---');
    console.log(TONGKAT_MODIFIER_FIX_QUERY);
    console.log('\n--- Berberin ---');
    console.log(BERBERINE_MODIFIER_FIX_QUERY);
    
  } catch (err) {
    results.push({ 
      success: false, 
      step: 'Allgemeiner Fehler', 
      error: err instanceof Error ? err.message : 'Unknown error' 
    });
  }
  
  return results;
}

/**
 * Verify cleanup results by counting active matrix entries
 */
export async function verifyMatrixCleanup(): Promise<{ 
  totalSupplements: number; 
  withMatrix: number; 
  uniqueCategories: string[];
  evidenceLevels: Record<string, number>;
}> {
  const { data: supplements, error } = await supabase
    .from('supplement_database')
    .select('name, category, evidence_level, relevance_matrix');
  
  if (error || !supplements) {
    console.error('Verification failed:', error);
    return { totalSupplements: 0, withMatrix: 0, uniqueCategories: [], evidenceLevels: {} };
  }
  
  const withMatrix = supplements.filter(s => s.relevance_matrix !== null).length;
  const categories = [...new Set(supplements.map(s => s.category).filter(Boolean))];
  
  const evidenceLevels: Record<string, number> = {};
  for (const s of supplements) {
    if (s.evidence_level) {
      evidenceLevels[s.evidence_level] = (evidenceLevels[s.evidence_level] || 0) + 1;
    }
  }
  
  return {
    totalSupplements: supplements.length,
    withMatrix,
    uniqueCategories: categories as string[],
    evidenceLevels,
  };
}
