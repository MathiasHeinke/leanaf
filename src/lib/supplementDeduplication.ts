import type { SupplementLibraryItem, NecessityTier } from '@/types/supplementLibrary';

// =====================================================
// Supplement Deduplication & Grouping Utilities
// For 4-Step Selection Flow: Tier -> Base -> Variant -> Product
// =====================================================

// Pattern-based base name extraction
// These patterns group variants under a single base substance name
const BASE_PATTERNS: Array<{ pattern: RegExp; baseName: string }> = [
  // Minerals
  { pattern: /^magnesium/i, baseName: 'Magnesium' },
  { pattern: /^zink|^zinc/i, baseName: 'Zink' },
  { pattern: /^eisen/i, baseName: 'Eisen' },
  { pattern: /^selen/i, baseName: 'Selen' },
  { pattern: /^jod/i, baseName: 'Jod' },
  { pattern: /^kalium/i, baseName: 'Kalium' },
  { pattern: /^natrium/i, baseName: 'Natrium' },
  { pattern: /^boron|^bor$/i, baseName: 'Bor' },
  { pattern: /^elektrolyt/i, baseName: 'Elektrolyte' },
  
  // Multi-Vitamins (must be BEFORE individual vitamins to match first)
  { pattern: /^(multi-?vitamin|a-z\s*(komplex)?|multivit)/i, baseName: 'Multivitamin' },
  
  // Vitamins
  { pattern: /^vitamin\s*d|^d3\b/i, baseName: 'Vitamin D' },
  { pattern: /^vitamin\s*k/i, baseName: 'Vitamin K' },
  { pattern: /^vitamin\s*b/i, baseName: 'Vitamin B' },
  { pattern: /^vitamin\s*c/i, baseName: 'Vitamin C' },
  { pattern: /^vitamin\s*e/i, baseName: 'Vitamin E' },
  { pattern: /^vitamin\s*a/i, baseName: 'Vitamin A' },
  
  // Omega-3
  { pattern: /^omega[- ]?3|fisch[öo]l|fish[- ]?oil/i, baseName: 'Omega-3' },
  
  // Amino Acids
  { pattern: /^eaa|^essential[- ]?amino/i, baseName: 'EAA' },
  { pattern: /^bcaa|^branched[- ]?chain/i, baseName: 'BCAA' },
  { pattern: /^l[- ]?glutamin/i, baseName: 'L-Glutamin' },
  { pattern: /^l[- ]?carnitin/i, baseName: 'L-Carnitin' },
  { pattern: /^l[- ]?theanin/i, baseName: 'L-Theanin' },
  { pattern: /^glycin/i, baseName: 'Glycin' },
  { pattern: /^taurin/i, baseName: 'Taurin' },
  
  // Performance
  { pattern: /^creatin|^kreatin/i, baseName: 'Creatin' },
  { pattern: /^hmb/i, baseName: 'HMB' },
  { pattern: /^citrullin/i, baseName: 'Citrullin' },
  { pattern: /^beta[- ]?alanin/i, baseName: 'Beta-Alanin' },
  
  // Adaptogens
  { pattern: /^ashwagandha|^ksm[- ]?66|^withania/i, baseName: 'Ashwagandha' },
  { pattern: /^rhodiola/i, baseName: 'Rhodiola' },
  { pattern: /^tongkat/i, baseName: 'Tongkat Ali' },
  { pattern: /^fadogia/i, baseName: 'Fadogia Agrestis' },
  { pattern: /^mucuna/i, baseName: 'Mucuna Pruriens' },
  { pattern: /^shilajit/i, baseName: 'Shilajit' },
  
  // GlyNAC
  { pattern: /^gly[- ]?nac/i, baseName: 'GlyNAC' },
  
  // Longevity / NAD+
  { pattern: /^ca[- ]?akg|^calcium[- ]?alpha[- ]?ketoglutarat|rejuvant/i, baseName: 'Ca-AKG' },
  { pattern: /^nmn/i, baseName: 'NMN' },
  { pattern: /^nr[- ]?|^niagen|^nicotinamid[- ]?riboside?/i, baseName: 'NR (Niagen)' },
  { pattern: /^nad\+?|^nicotinamid(?![- ]?riboside)/i, baseName: 'NAD+' },
  { pattern: /^resveratrol/i, baseName: 'Resveratrol' },
  { pattern: /^pterostilben/i, baseName: 'Pterostilben' },
  { pattern: /^spermid/i, baseName: 'Spermidin' },
  { pattern: /^fisetin/i, baseName: 'Fisetin' },
  { pattern: /^quercetin/i, baseName: 'Quercetin' },
  
  // CoQ10
  { pattern: /^coq10|^ubiquinol|^ubiquinon/i, baseName: 'CoQ10' },
  
  // Anti-Inflammatory / Curcumin
  { pattern: /^curcumin|^kurkuma/i, baseName: 'Curcumin' },
  { pattern: /^berber/i, baseName: 'Berberin' },
  { pattern: /^alpha[- ]?lipons/i, baseName: 'Alpha-Liponsäure' },
  
  // Sleep / Calm
  { pattern: /^apigenin/i, baseName: 'Apigenin' },
  { pattern: /^melatonin/i, baseName: 'Melatonin' },
  { pattern: /^gaba/i, baseName: 'GABA' },
  
  // Other
  { pattern: /^kollagen/i, baseName: 'Kollagen' },
  { pattern: /^probiotik/i, baseName: 'Probiotika' },
  { pattern: /^tmg|^betain/i, baseName: 'TMG/Betain' },
  { pattern: /^calcium[- ]?d[- ]?glucarat|^cdg/i, baseName: 'Calcium-D-Glucarat' },
  { pattern: /^dim/i, baseName: 'DIM' },
  { pattern: /^citrus[- ]?bergamot/i, baseName: 'Citrus Bergamot' },
  { pattern: /^sulforaphan/i, baseName: 'Sulforaphan' },
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
    // Defensive: Map unknown tiers to 'specialist'
    let tier = item.necessity_tier || 'optimizer';
    if (!(tier in result)) {
      tier = 'specialist';
    }
    result[tier as NecessityTier].push(item);
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
