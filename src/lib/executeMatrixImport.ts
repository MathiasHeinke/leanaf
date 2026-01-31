// =====================================================
// ARES Matrix Import: Batch Execution Script (v2.0)
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { parseMatrixMarkdown, toRelevanceMatrix, type ImportedIngredient } from './matrixImportParser';
import { parseMatrixCSV, type ParsedMatrixCSVEntry } from './matrixCSVParser';
import { matchAllIngredients, getMatchStats, type DbSupplement, type MatchResult } from './matrixIngredientMatcher';
import type { RelevanceMatrix } from '@/types/relevanceMatrix';
import type { NecessityTier, EvidenceLevel } from '@/types/supplementLibrary';

/**
 * Result of the batch import operation
 */
export interface BatchImportResult {
  success: boolean;
  totalParsed: number;
  totalMatched: number;
  totalUpdated: number;
  totalSkipped: number;
  totalErrors: number;
  matchStats: {
    exact: number;
    manual: number;
    fuzzy: number;
    unmatched: number;
  };
  errors: string[];
  updatedSupplements: Array<{
    dbId: string;
    dbName: string;
    importId: string;
    importName: string;
    matchType: string;
  }>;
  skippedIngredients: Array<{
    importId: string;
    importName: string;
    reason: string;
  }>;
}

/**
 * Fetch all supplements from the database
 */
async function fetchAllSupplements(): Promise<DbSupplement[]> {
  const { data, error } = await supabase
    .from('supplement_database')
    .select('id, name')
    .order('name');
  
  if (error) {
    throw new Error(`Failed to fetch supplements: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Update a single supplement's relevance_matrix
 */
async function updateSupplementMatrix(
  supplementId: string,
  matrix: RelevanceMatrix
): Promise<{ success: boolean; error?: string }> {
  // Cast to Json type for Supabase compatibility
  const matrixJson = JSON.parse(JSON.stringify(matrix));
  
  const { error } = await supabase
    .from('supplement_database')
    .update({ relevance_matrix: matrixJson })
    .eq('id', supplementId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Update a supplement with full data from CSV (matrix + base fields)
 */
async function updateSupplementFull(
  supplementId: string,
  entry: ParsedMatrixCSVEntry
): Promise<{ success: boolean; error?: string }> {
  // Cast matrix to Json type for Supabase compatibility
  const matrixJson = JSON.parse(JSON.stringify(entry.relevance_matrix));
  
  const { error } = await supabase
    .from('supplement_database')
    .update({
      relevance_matrix: matrixJson,
      impact_score: entry.impact_score,
      necessity_tier: entry.necessity_tier,
      evidence_level: entry.evidence_level,
      category: entry.category,
      protocol_phase: entry.protocol_phase,
    })
    .eq('id', supplementId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Execute the full batch import from markdown content
 */
export async function executeMatrixImport(markdownContent: string): Promise<BatchImportResult> {
  const result: BatchImportResult = {
    success: false,
    totalParsed: 0,
    totalMatched: 0,
    totalUpdated: 0,
    totalSkipped: 0,
    totalErrors: 0,
    matchStats: { exact: 0, manual: 0, fuzzy: 0, unmatched: 0 },
    errors: [],
    updatedSupplements: [],
    skippedIngredients: [],
  };

  try {
    // Step 1: Parse the markdown
    console.log('[Matrix Import] Parsing markdown content...');
    const parseResult = parseMatrixMarkdown(markdownContent);
    result.totalParsed = parseResult.ingredients.length;
    
    if (parseResult.errors.length > 0) {
      result.errors.push(...parseResult.errors.map(e => `Parse: ${e}`));
    }
    
    console.log(`[Matrix Import] Parsed ${result.totalParsed} ingredients`);

    // Step 2: Fetch all supplements from DB
    console.log('[Matrix Import] Fetching supplements from database...');
    const dbSupplements = await fetchAllSupplements();
    console.log(`[Matrix Import] Found ${dbSupplements.length} supplements in database`);

    // Step 3: Match ingredients to DB entries
    console.log('[Matrix Import] Matching ingredients to database entries...');
    const ingredientsForMatching = parseResult.ingredients.map(ing => ({
      ingredient_id: ing.ingredient_id,
      ingredient_name: ing.ingredient_name,
    }));
    
    const matchResults = matchAllIngredients(ingredientsForMatching, dbSupplements);
    const stats = getMatchStats(matchResults);
    
    result.matchStats = {
      exact: stats.exact,
      manual: stats.manual,
      fuzzy: stats.fuzzy,
      unmatched: stats.unmatched,
    };
    result.totalMatched = stats.matched;
    
    console.log(`[Matrix Import] Match results: ${stats.exact} exact, ${stats.manual} manual, ${stats.fuzzy} fuzzy, ${stats.unmatched} unmatched`);

    // Step 4: Create a map for quick ingredient lookup
    const ingredientMap = new Map<string, ImportedIngredient>();
    for (const ing of parseResult.ingredients) {
      ingredientMap.set(ing.ingredient_id, ing);
    }

    // Step 5: Process each matched ingredient
    console.log('[Matrix Import] Updating database records...');
    
    for (const match of matchResults) {
      if (match.matchType === 'none' || !match.matchedDbId) {
        result.skippedIngredients.push({
          importId: match.ingredientId,
          importName: match.ingredientName,
          reason: 'No database match found',
        });
        result.totalSkipped++;
        continue;
      }

      const ingredient = ingredientMap.get(match.ingredientId);
      if (!ingredient) {
        result.errors.push(`Ingredient ${match.ingredientId} not found in parsed data`);
        result.totalErrors++;
        continue;
      }

      // Convert to RelevanceMatrix format
      const matrix = toRelevanceMatrix(ingredient);

      // Update the database
      const updateResult = await updateSupplementMatrix(match.matchedDbId, matrix);
      
      if (updateResult.success) {
        result.updatedSupplements.push({
          dbId: match.matchedDbId,
          dbName: match.matchedDbName || '',
          importId: match.ingredientId,
          importName: match.ingredientName,
          matchType: match.matchType,
        });
        result.totalUpdated++;
      } else {
        result.errors.push(`Update failed for ${match.ingredientName}: ${updateResult.error}`);
        result.totalErrors++;
      }
    }

    result.success = result.totalErrors === 0;
    
    console.log(`[Matrix Import] Complete: ${result.totalUpdated} updated, ${result.totalSkipped} skipped, ${result.totalErrors} errors`);
    
    return result;

  } catch (error) {
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Execute import from the bundled matrix data file (legacy markdown)
 */
export async function executeMatrixImportFromFile(): Promise<BatchImportResult> {
  try {
    // Dynamic import of the markdown file as raw text (v3-3)
    const matrixModule = await import('@/data/matrix-import-v3-3.md?raw');
    const markdownContent = matrixModule.default;
    
    return executeMatrixImport(markdownContent);
  } catch (error) {
    return {
      success: false,
      totalParsed: 0,
      totalMatched: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      totalErrors: 1,
      matchStats: { exact: 0, manual: 0, fuzzy: 0, unmatched: 0 },
      errors: [`Failed to load matrix file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      updatedSupplements: [],
      skippedIngredients: [],
    };
  }
}

/**
 * Execute import from the new CSV matrix v2.0
 * Updates relevance_matrix + base fields (impact_score, necessity_tier, evidence_level, category)
 */
export async function executeMatrixImportFromCSV(): Promise<BatchImportResult> {
  const result: BatchImportResult = {
    success: false,
    totalParsed: 0,
    totalMatched: 0,
    totalUpdated: 0,
    totalSkipped: 0,
    totalErrors: 0,
    matchStats: { exact: 0, manual: 0, fuzzy: 0, unmatched: 0 },
    errors: [],
    updatedSupplements: [],
    skippedIngredients: [],
  };

  try {
    // Step 1: Load and parse CSV
    console.log('[Matrix Import CSV] Loading matrix v2.2 (PHASE 1+2 COMPLETE | NAD+/GLP-1/TRT validated)...');
    const csvModule = await import('@/data/ares-matrix-v2.2.csv?raw');
    const csvContent = csvModule.default;
    
    const parseResult = parseMatrixCSV(csvContent);
    result.totalParsed = parseResult.stats.total;
    
    if (parseResult.errors.length > 0) {
      result.errors.push(...parseResult.errors.map(e => `Parse: ${e}`));
    }
    
    console.log(`[Matrix Import CSV] Parsed ${result.totalParsed} entries (${parseResult.stats.essential} essential, ${parseResult.stats.optimizer} optimizer, ${parseResult.stats.specialist} specialist)`);

    // Step 2: Fetch all supplements from DB
    console.log('[Matrix Import CSV] Fetching supplements from database...');
    const dbSupplements = await fetchAllSupplements();
    console.log(`[Matrix Import CSV] Found ${dbSupplements.length} supplements in database`);

    // Step 3: Match CSV entries to DB entries
    console.log('[Matrix Import CSV] Matching entries to database...');
    const entriesForMatching = parseResult.entries.map(entry => ({
      ingredient_id: entry.name,
      ingredient_name: entry.name,
    }));
    
    const matchResults = matchAllIngredients(entriesForMatching, dbSupplements);
    const stats = getMatchStats(matchResults);
    
    result.matchStats = {
      exact: stats.exact,
      manual: stats.manual,
      fuzzy: stats.fuzzy,
      unmatched: stats.unmatched,
    };
    result.totalMatched = stats.matched;
    
    console.log(`[Matrix Import CSV] Match results: ${stats.exact} exact, ${stats.manual} manual, ${stats.fuzzy} fuzzy, ${stats.unmatched} unmatched`);

    // Step 4: Create entry map for quick lookup
    const entryMap = new Map<string, ParsedMatrixCSVEntry>();
    for (const entry of parseResult.entries) {
      entryMap.set(entry.name, entry);
    }

    // Step 5: Update matched entries
    console.log('[Matrix Import CSV] Updating database records...');
    
    for (const match of matchResults) {
      if (match.matchType === 'none' || !match.matchedDbId) {
        result.skippedIngredients.push({
          importId: match.ingredientId,
          importName: match.ingredientName,
          reason: 'No database match found',
        });
        result.totalSkipped++;
        continue;
      }

      const entry = entryMap.get(match.ingredientName);
      if (!entry) {
        result.errors.push(`Entry ${match.ingredientName} not found in parsed data`);
        result.totalErrors++;
        continue;
      }

      // Update with full data (matrix + base fields)
      const updateResult = await updateSupplementFull(match.matchedDbId, entry);
      
      if (updateResult.success) {
        result.updatedSupplements.push({
          dbId: match.matchedDbId,
          dbName: match.matchedDbName || '',
          importId: match.ingredientId,
          importName: match.ingredientName,
          matchType: match.matchType,
        });
        result.totalUpdated++;
      } else {
        result.errors.push(`Update failed for ${match.ingredientName}: ${updateResult.error}`);
        result.totalErrors++;
      }
    }

    result.success = result.totalErrors === 0;
    
    console.log(`[Matrix Import CSV] Complete: ${result.totalUpdated} updated, ${result.totalSkipped} skipped, ${result.totalErrors} errors`);
    
    return result;

  } catch (error) {
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}
