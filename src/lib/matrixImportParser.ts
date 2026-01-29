// =====================================================
// ARES Matrix Import: Markdown Parser & JSON Extraction
// =====================================================

import type { RelevanceMatrix } from '@/types/relevanceMatrix';

/**
 * Parsed ingredient data from the matrix import file
 */
export interface ImportedIngredient {
  ingredient_id: string;
  ingredient_name: string;
  category: string;
  base_score: number;
  
  // Matrix data (matches RelevanceMatrix schema)
  phase_modifiers?: Record<string, number>;
  context_modifiers?: {
    true_natural?: number;
    enhanced_no_trt?: number;
    on_trt?: number;
    on_glp1?: number;
  };
  goal_modifiers?: Record<string, number>;
  calorie_modifiers?: {
    in_deficit?: number;
    in_surplus?: number;
  };
  peptide_class_modifiers?: Record<string, number>;
  demographic_modifiers?: {
    age_over_40?: number;
    age_over_50?: number;
    age_over_60?: number;
    is_female?: number;
    is_male?: number;
  };
  bloodwork_triggers?: Record<string, number>;
  compound_synergies?: Record<string, number>;
  warnings?: Record<string, string>;
}

/**
 * Parse result containing all extracted ingredients
 */
export interface MatrixParseResult {
  ingredients: ImportedIngredient[];
  errors: string[];
  totalFound: number;
}

/**
 * Extract all JSON blocks from a markdown string
 */
export function extractJsonBlocks(markdown: string): string[] {
  const jsonBlocks: string[] = [];
  
  // Match code blocks with json
  const codeBlockRegex = /```json\s*\n([\s\S]*?)\n```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    if (match[1]) {
      jsonBlocks.push(match[1].trim());
    }
  }
  
  return jsonBlocks;
}

/**
 * Parse a single JSON block into an ImportedIngredient
 */
export function parseIngredientJson(jsonString: string): ImportedIngredient | null {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Validate required fields
    if (!parsed.ingredient_id || !parsed.ingredient_name) {
      return null;
    }
    
    return parsed as ImportedIngredient;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return null;
  }
}

/**
 * Parse the complete matrix markdown file
 */
export function parseMatrixMarkdown(markdown: string): MatrixParseResult {
  const jsonBlocks = extractJsonBlocks(markdown);
  const ingredients: ImportedIngredient[] = [];
  const errors: string[] = [];
  
  for (let i = 0; i < jsonBlocks.length; i++) {
    const block = jsonBlocks[i];
    try {
      const ingredient = parseIngredientJson(block);
      
      if (ingredient) {
        // Skip invalid entries (e.g., base_score: 0 for prescription drugs)
        if (ingredient.base_score === 0 && ingredient.warnings?.prescription) {
          continue;
        }
        ingredients.push(ingredient);
      } else {
        errors.push(`Block ${i + 1}: Invalid ingredient structure`);
      }
    } catch (error) {
      errors.push(`Block ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  }
  
  return {
    ingredients,
    errors,
    totalFound: jsonBlocks.length,
  };
}

/**
 * Convert ImportedIngredient to RelevanceMatrix format for database storage
 */
export function toRelevanceMatrix(ingredient: ImportedIngredient): RelevanceMatrix {
  return {
    phase_modifiers: ingredient.phase_modifiers,
    context_modifiers: ingredient.context_modifiers,
    goal_modifiers: ingredient.goal_modifiers,
    calorie_modifiers: ingredient.calorie_modifiers,
    peptide_class_modifiers: ingredient.peptide_class_modifiers,
    demographic_modifiers: ingredient.demographic_modifiers,
    bloodwork_triggers: ingredient.bloodwork_triggers,
    compound_synergies: ingredient.compound_synergies,
    explanation_templates: ingredient.warnings, // Map warnings -> explanation_templates
  };
}

/**
 * Validate an ImportedIngredient has valid matrix data
 */
export function validateIngredient(ingredient: ImportedIngredient): string[] {
  const issues: string[] = [];
  
  if (typeof ingredient.base_score !== 'number' || ingredient.base_score < 0 || ingredient.base_score > 10) {
    issues.push(`Invalid base_score: ${ingredient.base_score}`);
  }
  
  // Validate phase_modifiers keys
  if (ingredient.phase_modifiers) {
    const validPhases = ['0', '1', '2', '3'];
    for (const key of Object.keys(ingredient.phase_modifiers)) {
      if (!validPhases.includes(key)) {
        issues.push(`Invalid phase key: ${key}`);
      }
    }
  }
  
  return issues;
}
