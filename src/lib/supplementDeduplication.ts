import type { SupplementLibraryItem, NecessityTier } from '@/types/supplementLibrary';

// =====================================================
// Supplement Deduplication & Grouping Utilities
// For 4-Step Selection Flow: Tier -> Base -> Variant -> Product
// =====================================================

// Pattern-based base name extraction
const BASE_PATTERNS: Array<{ pattern: RegExp; baseName: string }> = [
  { pattern: /^magnesium/i, baseName: 'Magnesium' },
  { pattern: /^omega[- ]?3/i, baseName: 'Omega-3' },
  { pattern: /^vitamin\s*d/i, baseName: 'Vitamin D' },
  { pattern: /^vitamin\s*k/i, baseName: 'Vitamin K' },
  { pattern: /^vitamin\s*b/i, baseName: 'Vitamin B' },
  { pattern: /^vitamin\s*c/i, baseName: 'Vitamin C' },
  { pattern: /^vitamin\s*e/i, baseName: 'Vitamin E' },
  { pattern: /^vitamin\s*a/i, baseName: 'Vitamin A' },
  { pattern: /^creatin/i, baseName: 'Creatine' },
  { pattern: /^ashwagandha/i, baseName: 'Ashwagandha' },
  { pattern: /^curcumin|^kurkuma/i, baseName: 'Curcumin' },
  { pattern: /^kollagen/i, baseName: 'Kollagen' },
  { pattern: /^probiotik/i, baseName: 'Probiotika' },
  { pattern: /^nmn/i, baseName: 'NMN' },
  { pattern: /^coq10|^ubiquinol|^ubiquinon/i, baseName: 'CoQ10' },
  { pattern: /^hmb/i, baseName: 'HMB' },
  { pattern: /^eisen/i, baseName: 'Eisen' },
  { pattern: /^zink/i, baseName: 'Zink' },
  { pattern: /^selen/i, baseName: 'Selen' },
  { pattern: /^jod/i, baseName: 'Jod' },
  { pattern: /^alpha[- ]?lipons/i, baseName: 'Alpha-Liponsäure' },
  { pattern: /^resveratrol/i, baseName: 'Resveratrol' },
  { pattern: /^quercetin/i, baseName: 'Quercetin' },
  { pattern: /^fisetin/i, baseName: 'Fisetin' },
  { pattern: /^berber/i, baseName: 'Berberin' },
  { pattern: /^apigenin/i, baseName: 'Apigenin' },
  { pattern: /^elektrolyt/i, baseName: 'Elektrolyte' },
  { pattern: /^natrium/i, baseName: 'Natrium' },
  { pattern: /^kalium/i, baseName: 'Kalium' },
  { pattern: /^l[- ]?glutamin/i, baseName: 'L-Glutamin' },
  { pattern: /^l[- ]?carnitin/i, baseName: 'L-Carnitin' },
  { pattern: /^l[- ]?theanin/i, baseName: 'L-Theanin' },
  { pattern: /^glycin/i, baseName: 'Glycin' },
  { pattern: /^taurin/i, baseName: 'Taurin' },
  { pattern: /^tmg|^betain/i, baseName: 'TMG/Betain' },
  { pattern: /^nad\+?|^nicotinamid/i, baseName: 'NAD+' },
  { pattern: /^pterostilben/i, baseName: 'Pterostilben' },
  { pattern: /^spermid/i, baseName: 'Spermidin' },
  { pattern: /^calcium[- ]?d[- ]?glucarat/i, baseName: 'Calcium-D-Glucarat' },
  { pattern: /^dim/i, baseName: 'DIM' },
  { pattern: /^citrus[- ]?bergamot/i, baseName: 'Citrus Bergamot' },
  { pattern: /^boron|^bor$/i, baseName: 'Bor' },
  { pattern: /^tongkat/i, baseName: 'Tongkat Ali' },
  { pattern: /^fadogia/i, baseName: 'Fadogia Agrestis' },
];

/**
 * Extract the base supplement name from a full name
 * e.g., "Magnesium Glycinat" -> "Magnesium"
 *       "Vitamin D3 + K2" -> "Vitamin D"
 */
export function extractBaseName(name: string): string {
  const trimmedName = name.trim();
  
  // Try pattern matching first
  for (const { pattern, baseName } of BASE_PATTERNS) {
    if (pattern.test(trimmedName)) {
      return baseName;
    }
  }
  
  // Fallback: Use first word(s) before common separators
  const separators = /[\s-]+(glycinat|citrat|bisglycinat|l-threonat|komplex|monohydrat|oxide?|malat|taurate?|orotat|\d+|plus|\+|hcl|extended|depot)/i;
  const match = trimmedName.split(separators)[0];
  
  return match?.trim() || trimmedName;
}

/**
 * Extract the variant/form name from full supplement name
 * e.g., "Magnesium Glycinat" with base "Magnesium" -> "Glycinat"
 *       "Magnesium" with base "Magnesium" -> "Standard"
 */
export function getVariantName(fullName: string, baseName: string): string {
  const trimmedFull = fullName.trim();
  const trimmedBase = baseName.trim();
  
  // If names are identical, it's the standard form
  if (trimmedFull.toLowerCase() === trimmedBase.toLowerCase()) {
    return 'Standard';
  }
  
  // Remove base name and clean up the variant
  let variant = trimmedFull;
  
  // Try to extract variant by removing the base name
  const basePattern = new RegExp(`^${trimmedBase}\\s*[-]?\\s*`, 'i');
  variant = variant.replace(basePattern, '').trim();
  
  // Clean up common prefixes/suffixes
  variant = variant.replace(/^\(|\)$/g, '').trim();
  
  // If still empty after cleanup, use "Standard"
  if (!variant || variant.toLowerCase() === trimmedBase.toLowerCase()) {
    return 'Standard';
  }
  
  return variant;
}

/**
 * Group supplements by their base name
 * Returns a Map where key is base name, value is array of variants
 */
export function groupByBaseName(
  items: SupplementLibraryItem[]
): Map<string, SupplementLibraryItem[]> {
  const grouped = new Map<string, SupplementLibraryItem[]>();
  
  for (const item of items) {
    const baseName = extractBaseName(item.name);
    
    if (!grouped.has(baseName)) {
      grouped.set(baseName, []);
    }
    grouped.get(baseName)!.push(item);
  }
  
  // Sort variants by impact_score (highest first)
  for (const [, variants] of grouped) {
    variants.sort((a, b) => (b.impact_score || 0) - (a.impact_score || 0));
  }
  
  return grouped;
}

/**
 * Group supplements by necessity tier
 */
export function groupByTier(
  items: SupplementLibraryItem[]
): Record<NecessityTier, SupplementLibraryItem[]> {
  const result: Record<NecessityTier, SupplementLibraryItem[]> = {
    essential: [],
    optimizer: [],
    specialist: [],
  };
  
  for (const item of items) {
    const tier = item.necessity_tier || 'optimizer';
    result[tier].push(item);
  }
  
  // Sort each tier by impact_score
  for (const tier of Object.keys(result) as NecessityTier[]) {
    result[tier].sort((a, b) => (b.impact_score || 0) - (a.impact_score || 0));
  }
  
  return result;
}

/**
 * Get unique base names for a tier, sorted by highest impact_score within that base
 * Returns array of { baseName, topImpactScore, count }
 */
export interface BaseNameGroup {
  baseName: string;
  topImpactScore: number;
  variantCount: number;
  topVariant: SupplementLibraryItem;
}

export function getUniqueBaseNames(
  items: SupplementLibraryItem[]
): BaseNameGroup[] {
  const grouped = groupByBaseName(items);
  const result: BaseNameGroup[] = [];
  
  for (const [baseName, variants] of grouped) {
    // variants already sorted by impact_score
    const topVariant = variants[0];
    result.push({
      baseName,
      topImpactScore: topVariant.impact_score || 0,
      variantCount: variants.length,
      topVariant,
    });
  }
  
  // Sort by top impact score
  result.sort((a, b) => b.topImpactScore - a.topImpactScore);
  
  return result;
}

/**
 * Get variants for a specific base name within items
 */
export function getVariantsForBase(
  items: SupplementLibraryItem[],
  baseName: string
): SupplementLibraryItem[] {
  return items.filter(item => extractBaseName(item.name) === baseName)
    .sort((a, b) => (b.impact_score || 0) - (a.impact_score || 0));
}

/**
 * Check if a supplement has multiple variants
 */
export function hasMultipleVariants(
  items: SupplementLibraryItem[],
  baseName: string
): boolean {
  const variants = getVariantsForBase(items, baseName);
  return variants.length > 1;
}
