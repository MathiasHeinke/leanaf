// =====================================================
// ARES Dynamic Supplement Sorting Hook
// Groups supplements by CALCULATED score tier, not static DB tier
// Now also groups by BASE SUBSTANCE NAME for deduplication
// =====================================================

import { useMemo } from 'react';
import { useSupplementLibrary } from './useSupplementLibrary';
import { useUserRelevanceContext } from './useUserRelevanceContext';
import { calculateRelevanceScore, calculateComboScore, getDynamicTier } from '@/lib/calculateRelevanceScore';
import type { IngredientScoreData } from '@/lib/calculateRelevanceScore';
import { extractBaseName } from '@/lib/supplementDeduplication';
import type { RelevanceScoreResult, SupplementMarkers, DynamicTier } from '@/types/relevanceMatrix';
import type { SupplementLibraryItem } from '@/types/supplementLibrary';

/**
 * Extended supplement item with calculated score result
 */
export interface ScoredSupplementItem extends SupplementLibraryItem {
  scoreResult: RelevanceScoreResult;
}

/**
 * Group of supplements sharing the same base substance name
 */
export interface BaseNameGroup {
  baseName: string;
  variants: ScoredSupplementItem[];
  topScore: number;
  topVariant: ScoredSupplementItem;
  dynamicTier: DynamicTier;
}

/**
 * Grouped supplements by dynamic tier
 */
export interface DynamicSupplementGroups {
  essentials: ScoredSupplementItem[];
  optimizers: ScoredSupplementItem[];
  niche: ScoredSupplementItem[];
  all: ScoredSupplementItem[];
  // NEW: Grouped by base name within each tier
  essentialGroups: BaseNameGroup[];
  optimizerGroups: BaseNameGroup[];
  nicheGroups: BaseNameGroup[];
  allGroups: BaseNameGroup[];
  isLoading: boolean;
  tierCounts: Record<DynamicTier, { total: number; active?: number }>;
}

// =====================================================
// Helper functions for category detection
// =====================================================

const NATURAL_TESTO_BOOSTER_PATTERNS = [
  'tongkat',
  'fadogia',
  'tribulus',
  'fenugreek',
  'testofen',
  'shilajit',
  'mucuna',
  'ksm-66',
  'ksm66',
  'ashwagandha',
  'boron',
  'd-aspartic',
  'd-asparaginsäure',
];

const BCAA_PATTERNS = ['bcaa', 'branched chain', 'verzweigtkettig'];
const EAA_PATTERNS = ['eaa', 'essential amino', 'essentielle aminosäure'];

function isNaturalTestoBooster(name: string, category?: string): boolean {
  const normalized = name.toLowerCase();
  const categoryNorm = (category || '').toLowerCase();
  
  // Check name patterns
  if (NATURAL_TESTO_BOOSTER_PATTERNS.some(p => normalized.includes(p))) {
    return true;
  }
  
  // Check category
  if (categoryNorm.includes('testosteron') || categoryNorm.includes('hormone')) {
    return true;
  }
  
  return false;
}

function isBCAA(name: string): boolean {
  const normalized = name.toLowerCase();
  // Must contain BCAA pattern but NOT be EAA
  return BCAA_PATTERNS.some(p => normalized.includes(p)) && 
         !EAA_PATTERNS.some(p => normalized.includes(p));
}

function isEAA(name: string): boolean {
  const normalized = name.toLowerCase();
  return EAA_PATTERNS.some(p => normalized.includes(p));
}

/**
 * Helper: Group scored items by base name (tier will be assigned later based on topScore)
 */
function groupByBaseNameWithScores(items: ScoredSupplementItem[]): BaseNameGroup[] {
  const grouped = new Map<string, ScoredSupplementItem[]>();
  
  for (const item of items) {
    const baseName = extractBaseName(item.name);
    if (!grouped.has(baseName)) {
      grouped.set(baseName, []);
    }
    grouped.get(baseName)!.push(item);
  }
  
  const result: BaseNameGroup[] = [];
  for (const [baseName, variants] of grouped) {
    // Sort variants by score (descending)
    variants.sort((a, b) => b.scoreResult.score - a.scoreResult.score);
    const topVariant = variants[0];
    const topScore = topVariant.scoreResult.score;
    
    // Determine tier based on TOP score of the group
    let dynamicTier: DynamicTier;
    if (topScore >= 9.0) {
      dynamicTier = 'essential';
    } else if (topScore >= 6.0) {
      dynamicTier = 'optimizer';
    } else {
      dynamicTier = 'niche';
    }
    
    result.push({
      baseName,
      variants,
      topScore,
      topVariant,
      dynamicTier,
    });
  }
  
  // Sort groups by top score (descending)
  result.sort((a, b) => b.topScore - a.topScore);
  return result;
}

/**
 * Hook for dynamically sorted and grouped supplements
 * Calculates personalized scores and groups by dynamic tier
 */
export function useDynamicallySortedSupplements(): DynamicSupplementGroups {
  const { data: library = [], isLoading: libraryLoading } = useSupplementLibrary();
  const { context, isLoading: contextLoading } = useUserRelevanceContext();

  return useMemo(() => {
    const result: DynamicSupplementGroups = {
      essentials: [],
      optimizers: [],
      niche: [],
      all: [],
      essentialGroups: [],
      optimizerGroups: [],
      nicheGroups: [],
      allGroups: [],
      isLoading: libraryLoading || contextLoading,
      tierCounts: {
        essential: { total: 0 },
        optimizer: { total: 0 },
        niche: { total: 0 },
      },
    };

    if (!library.length) return result;

    // 1. Calculate scores for all items
    const scoredItems: ScoredSupplementItem[] = library.map((item) => {
      // =======================================================
      // COMBO PRODUCTS: Check if this is a multi-ingredient product
      // =======================================================
      if (item.ingredient_ids?.length) {
        // Look up ingredient data from the library
        const ingredientData: IngredientScoreData[] = item.ingredient_ids
          .map(name => {
            const found = library.find(l => l.name === name);
            if (found) {
              return {
                name: found.name,
                impactScore: found.impact_score ?? 5.0,
                relevanceMatrix: found.relevance_matrix ?? null,
              };
            }
            return null;
          })
          .filter((d): d is IngredientScoreData => d !== null);
        
        // If we found at least one ingredient, calculate combo score
        if (ingredientData.length > 0) {
          const comboResult = calculateComboScore(ingredientData, context);
          
          return {
            ...item,
            scoreResult: {
              score: comboResult.score,
              baseScore: item.impact_score ?? 5.0,
              dynamicTier: getDynamicTier(comboResult.score),
              reasons: comboResult.breakdown,
              warnings: [],
              isPersonalized: true,
              isLimitedByMissingData: false,
              dataConfidenceCap: 10.0,
            },
          };
        }
      }
      
      // =======================================================
      // SINGLE INGREDIENTS: Standard calculation
      // =======================================================
      // Detect markers via name/category patterns
      const markers: SupplementMarkers = {
        isNaturalTestoBooster: isNaturalTestoBooster(item.name, item.category),
        isBCAA: isBCAA(item.name),
        isEAA: isEAA(item.name),
      };

      const scoreResult = calculateRelevanceScore(
        item.impact_score ?? 5.0,
        item.relevance_matrix,
        context,
        markers,
        item.name  // Pass name for Core 7 bypass check
      );

      return { ...item, scoreResult };
    });

    // 2. Sort by score (descending)
    scoredItems.sort((a, b) => b.scoreResult.score - a.scoreResult.score);

    // 3. FIRST: Group ALL items by base name (BEFORE tier assignment!)
    const allGroups = groupByBaseNameWithScores(scoredItems);

    // 4. THEN: Distribute groups into tiers based on their TOP score
    for (const group of allGroups) {
      // Also populate flat arrays for backwards compatibility
      for (const item of group.variants) {
        if (group.dynamicTier === 'essential') {
          result.essentials.push(item);
        } else if (group.dynamicTier === 'optimizer') {
          result.optimizers.push(item);
        } else {
          result.niche.push(item);
        }
      }
      
      // Assign group to correct tier
      if (group.dynamicTier === 'essential') {
        result.essentialGroups.push(group);
      } else if (group.dynamicTier === 'optimizer') {
        result.optimizerGroups.push(group);
      } else {
        result.nicheGroups.push(group);
      }
    }

    // 5. Update tier counts (counting unique base names per tier)
    result.tierCounts = {
      essential: { total: result.essentialGroups.length },
      optimizer: { total: result.optimizerGroups.length },
      niche: { total: result.nicheGroups.length },
    };

    result.all = scoredItems;
    result.allGroups = allGroups;
    return result;
  }, [library, context, libraryLoading, contextLoading]);
}

/**
 * Get supplements for a specific dynamic tier
 */
export function useSupplementsByDynamicTier(tier: DynamicTier): {
  items: ScoredSupplementItem[];
  isLoading: boolean;
} {
  const { essentials, optimizers, niche, isLoading } = useDynamicallySortedSupplements();
  
  const items = useMemo(() => {
    switch (tier) {
      case 'essential':
        return essentials;
      case 'optimizer':
        return optimizers;
      case 'niche':
        return niche;
      default:
        return [];
    }
  }, [tier, essentials, optimizers, niche]);
  
  return { items, isLoading };
}

export default useDynamicallySortedSupplements;
