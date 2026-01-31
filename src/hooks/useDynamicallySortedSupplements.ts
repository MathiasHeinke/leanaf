// =====================================================
// ARES Dynamic Supplement Sorting Hook
// Groups supplements by CALCULATED score tier, not static DB tier
// Now also groups by BASE SUBSTANCE NAME for deduplication
// =====================================================

import { useMemo } from 'react';
import { useSupplementLibrary } from './useSupplementLibrary';
import { useUserRelevanceContext } from './useUserRelevanceContext';
import { calculateRelevanceScore } from '@/lib/calculateRelevanceScore';
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
 * Helper: Group scored items by base name
 */
function groupByBaseNameWithScores(items: ScoredSupplementItem[], tier: DynamicTier): BaseNameGroup[] {
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
    result.push({
      baseName,
      variants,
      topScore: topVariant.scoreResult.score,
      topVariant,
      dynamicTier: tier,
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

    // 3. Group into dynamic tiers
    for (const item of scoredItems) {
      const tier = item.scoreResult.dynamicTier;
      if (tier === 'essential') {
        result.essentials.push(item);
      } else if (tier === 'optimizer') {
        result.optimizers.push(item);
      } else {
        result.niche.push(item);
      }
    }

    // 4. Create base-name groups for each tier
    result.essentialGroups = groupByBaseNameWithScores(result.essentials, 'essential');
    result.optimizerGroups = groupByBaseNameWithScores(result.optimizers, 'optimizer');
    result.nicheGroups = groupByBaseNameWithScores(result.niche, 'niche');
    result.allGroups = groupByBaseNameWithScores(scoredItems, 'essential'); // tier not used for all

    // 5. Update tier counts (now counting unique base names)
    result.tierCounts = {
      essential: { total: result.essentialGroups.length },
      optimizer: { total: result.optimizerGroups.length },
      niche: { total: result.nicheGroups.length },
    };

    result.all = scoredItems;
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
