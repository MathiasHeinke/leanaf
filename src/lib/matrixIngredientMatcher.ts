// =====================================================
// ARES Matrix Import: Ingredient Name Matching
// =====================================================

import { norm, damerau, trigramScore } from '@/intake/fuzzy';

/**
 * Database supplement entry (minimal interface for matching)
 */
export interface DbSupplement {
  id: string;
  name: string;
}

/**
 * Match result for an imported ingredient
 */
export interface MatchResult {
  ingredientId: string;
  ingredientName: string;
  matchedDbId: string | null;
  matchedDbName: string | null;
  matchScore: number;
  matchType: 'exact' | 'fuzzy' | 'manual' | 'none';
}

/**
 * Manual override mapping for problematic ingredients
 * Maps ingredient_id from import -> DB name patterns
 */
const MANUAL_OVERRIDES: Record<string, string[]> = {
  // Vitamins - EXTENDED
  'vit_d3': ['vitamin d3', 'vitamin d', 'cholecalciferol', 'vitamin d3 + k2', 'vitamin d3 + k2 mk7 tropfen', 'vitamin d balance', 'd3 + k2'],
  'vit_k2': ['vitamin k2', 'k2 mk-7', 'k2', 'k2 mk7'],
  'vit_b12': ['vitamin b12', 'b12', 'methylcobalamin', 'cobalamin'],
  'vit_b_complex': ['b-komplex', 'b komplex', 'vitamin b-komplex', 'b-vitamine'],
  'vit_c': ['vitamin c', 'ascorbinsäure', 'ascorbinsaure', 'vitamin c liposomal', 'vitamin c (liposomal)'],
  'vit_e': ['vitamin e', 'tocopherol'],
  'vit_a': ['vitamin a', 'retinol'],
  'folate': ['folat', 'folsaeure', 'folsäure', 'methyl folate', '5-mthf', 'methylfolat'],
  'multivitamin': ['multivitamin', 'a-z komplex', 'multi', 'a-z'],
  
  // Minerals - EXTENDED
  'magnesium': ['magnesium', 'magnesium glycinat', 'magnesiumcitrat', 'mg-glycinat', 'mg-citrat', 'magnesium bisglycinat'],
  'zinc': ['zink', 'zink bisglycinat', 'zinc complex', 'zink-bisglycinat', 'zinkglycinat'],
  'iron': ['eisen'],
  'calcium': ['calcium', 'kalzium'],
  'potassium': ['kalium'],
  'selenium': ['selen'],
  'iodine': ['jod'],
  'copper': ['kupfer'],
  'chromium': ['chrom'],
  'boron': ['bor'],
  
  // Amino acids - EXTENDED
  'creatine': ['kreatin', 'creatine', 'creatin monohydrat', 'creatine monohydrat', 'creatin'],
  'carnitine': ['carnitin', 'l-carnitin', 'acetyl-l-carnitin', 'alcar'],
  'glutamine': ['glutamin', 'l-glutamin'],
  'arginine': ['arginin', 'l-arginin'],
  'citrulline': ['citrullin', 'l-citrullin', 'citrullin malat'],
  'taurine': ['taurin', 'taurin kardioprotektiv', 'taurin (kardioprotektiv)'],
  'glycine': ['glycin'],
  'theanine': ['theanin', 'l-theanin'],
  'tyrosine': ['tyrosin', 'l-tyrosin'],
  'tryptophan': ['tryptophan', 'l-tryptophan'],
  'beta_alanine': ['beta-alanin', 'beta alanin'],
  'hmb': ['hmb', 'hmb 3000'],
  'eaa': ['eaa', 'essential amino acids', 'eaa komplex'],
  'bcaa': ['bcaa'],
  'nac': ['nac', 'n-acetyl-cystein', 'n-acetyl cystein'],
  'glynac': ['glynac', 'gly-nac', 'glycin + nac'],
  'betaine': ['betain', 'tmg', 'trimethylglycin'],
  
  // Fatty acids - EXTENDED
  'omega3_epa': ['omega-3', 'omega 3', 'epa', 'fischöl', 'fischoel', 'omega-3 (epa/dha)', 'omega-3 epa/dha'],
  'omega3_dha': ['dha', 'omega-3 dha'],
  'mct_oil': ['mct', 'mct-öl', 'mct oel'],
  'krill_oil': ['krill', 'krillöl', 'krill oel'],
  
  // Adaptogens - EXTENDED
  'ashwagandha': ['ashwagandha', 'ksm-66', 'withania', 'ashwagandha ksm-66', 'ksm66'],
  'rhodiola': ['rhodiola', 'rhodiola rosea', 'rosenwurz'],
  'ginseng': ['ginseng', 'panax ginseng'],
  'maca': ['maca'],
  'curcumin': ['curcumin', 'kurkuma', 'curcuma', 'curcumin longvida'],
  'egcg': ['egcg', 'grüntee', 'gruentee', 'green tea', 'grüntee extrakt'],
  'resveratrol': ['resveratrol', 'trans-resveratrol', 'liposomales nad+ & trans-resveratrol'],
  'quercetin': ['quercetin'],
  'berberine': ['berberin'],
  'tongkat_ali': ['tongkat ali', 'tongkat', 'eurycoma'],
  'fisetin': ['fisetin'],
  'shilajit': ['shilajit', 'mumijo'],
  'turkesterone': ['turkesterone', 'turkesteron', 'turkesterone max'],
  
  // Mushrooms
  'lions_mane': ['lions mane', 'lion\'s mane', 'hericium'],
  'reishi': ['reishi'],
  'cordyceps': ['cordyceps'],
  'chaga': ['chaga'],
  
  // Longevity - EXTENDED
  'coq10': ['coq10', 'ubiquinol', 'coenzym q10', 'astaxanthin + coenzym q10'],
  'ala': ['alpha-liponsäure', 'alpha-liponsaeure', 'ala', 'r-ala', 'liponsäure', 'liponsaeure'],
  'pqq': ['pqq'],
  'astaxanthin': ['astaxanthin'],
  'glutathione': ['glutathion'],
  'nmn': ['nmn', 'nicotinamid mononukleotid', 'nmn sublingual', 'nmn (nicotinamid mononukleotid)'],
  'nr': ['nr', 'nicotinamid ribosid', 'niagen'],
  'spermidine': ['spermidin'],
  'urolithin_a': ['urolithin a', 'mitopure', 'urolithin'],
  'tudca': ['tudca'],
  'pterostilbene': ['pterostilben', 'pterostilbene'],
  'akg': ['alpha-ketoglutarat', 'akg', 'ca-akg', 'caakg', 'alpha-ketoglutarat (akg)', 'rejuvant'],
  
  // Gut health - EXTENDED
  'probiotics_lacto': ['probiotika', 'lactobacillus', 'probiotics', 'probiona kulturen komplex', 'probiotika multi-strain'],
  'probiotics_bifido': ['bifidobacterium'],
  'prebiotics': ['präbiotika', 'praebiotika', 'inulin', 'fos'],
  'psyllium': ['flohsamenschalen', 'flohsamen', 'psyllium'],
  
  // Joints
  'glucosamine': ['glucosamin'],
  'chondroitin': ['chondroitin'],
  'msm': ['msm'],
  'collagen': ['kollagen', 'collagen', 'kollagen peptide'],
  'collagen_peptides': ['kollagen-peptide', 'collagen peptides', 'kollagen peptide'],
  'hyaluronic_acid': ['hyaluronsäure', 'hyaluron', 'hyaluron & kollagen'],
  
  // Nootropics
  'citicoline': ['citicolin', 'cdp-cholin', 'cdp cholin'],
  'alpha_gpc': ['alpha-gpc', 'alpha gpc'],
  'ps': ['phosphatidylserin'],
  'mg_threonate': ['magnesium-l-threonat', 'magtein', 'magnesium komplex 11 ultra', 'magnesium komplex'],
  
  // Proteins - EXTENDED
  'whey': ['whey', 'whey protein', 'molkenprotein', 'protein pulver'],
  'casein': ['casein', 'kasein'],
  'pea_protein': ['erbsenprotein', 'pea protein'],
  
  // Other - EXTENDED
  'caffeine': ['koffein', 'caffeine'],
  'melatonin': ['melatonin'],
  'bergamot': ['citrus bergamot', 'bergamot', 'bergamotte'],
  'electrolytes': ['elektrolyte', 'lmnt', 'elektrolyte (lmnt)'],
  'milk_thistle': ['silymarin', 'mariendistel', 'milk thistle'],
  'pine_bark': ['pinienrinden extrakt', 'opc', 'pycnogenol', 'pinienrinden'],
  'black_seed_oil': ['schwarzkuemmeloel 1000', 'schwarzkuemmeloel', 'schwarzkümmelöl', 'nigella sativa'],
  'fadogia': ['fadogia agrestis', 'fadogia'],
  'dim': ['dim'],
  'apigenin': ['apigenin'],
  'bacopa': ['bacopa monnieri', 'bacopa'],
  'gaba': ['gaba'],
  'lecithin': ['lecithin'],
  'chlorella': ['chlorella'],
  'spirulina': ['spirulina'],
};

/**
 * Normalize ingredient name for matching
 */
function normalizeForMatch(name: string): string {
  return norm(name)
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Try to find an exact match
 */
function findExactMatch(ingredientName: string, dbSupplements: DbSupplement[]): DbSupplement | null {
  const normalizedImport = normalizeForMatch(ingredientName);
  
  for (const supp of dbSupplements) {
    const normalizedDb = normalizeForMatch(supp.name);
    if (normalizedDb === normalizedImport) {
      return supp;
    }
  }
  
  return null;
}

/**
 * Try to find a manual override match
 */
function findManualMatch(ingredientId: string, dbSupplements: DbSupplement[]): DbSupplement | null {
  const patterns = MANUAL_OVERRIDES[ingredientId];
  if (!patterns) return null;
  
  for (const pattern of patterns) {
    const normalizedPattern = normalizeForMatch(pattern);
    
    for (const supp of dbSupplements) {
      const normalizedDb = normalizeForMatch(supp.name);
      
      // Exact match on pattern
      if (normalizedDb === normalizedPattern) {
        return supp;
      }
      
      // Contains match
      if (normalizedDb.includes(normalizedPattern) || normalizedPattern.includes(normalizedDb)) {
        return supp;
      }
    }
  }
  
  return null;
}

/**
 * Find best fuzzy match using Damerau-Levenshtein and trigram similarity
 */
function findFuzzyMatch(ingredientName: string, dbSupplements: DbSupplement[]): { match: DbSupplement | null; score: number } {
  const normalizedImport = normalizeForMatch(ingredientName);
  let bestMatch: DbSupplement | null = null;
  let bestScore = 0;
  
  for (const supp of dbSupplements) {
    const normalizedDb = normalizeForMatch(supp.name);
    
    // Calculate trigram similarity
    const trigram = trigramScore(normalizedImport, normalizedDb);
    
    // Calculate edit distance similarity
    const maxLen = Math.max(normalizedImport.length, normalizedDb.length);
    const editDistance = damerau(normalizedImport, normalizedDb);
    const editSimilarity = maxLen > 0 ? 1 - (editDistance / maxLen) : 0;
    
    // Combined score (weighted average)
    const combinedScore = trigram * 0.6 + editSimilarity * 0.4;
    
    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestMatch = supp;
    }
  }
  
  return { match: bestMatch, score: bestScore };
}

/**
 * Match an ingredient to database supplements
 */
export function matchIngredient(
  ingredientId: string,
  ingredientName: string,
  dbSupplements: DbSupplement[]
): MatchResult {
  // 1. Try exact match first
  const exactMatch = findExactMatch(ingredientName, dbSupplements);
  if (exactMatch) {
    return {
      ingredientId,
      ingredientName,
      matchedDbId: exactMatch.id,
      matchedDbName: exactMatch.name,
      matchScore: 1.0,
      matchType: 'exact',
    };
  }
  
  // 2. Try manual override match
  const manualMatch = findManualMatch(ingredientId, dbSupplements);
  if (manualMatch) {
    return {
      ingredientId,
      ingredientName,
      matchedDbId: manualMatch.id,
      matchedDbName: manualMatch.name,
      matchScore: 0.95,
      matchType: 'manual',
    };
  }
  
  // 3. Try fuzzy match
  const { match: fuzzyMatch, score: fuzzyScore } = findFuzzyMatch(ingredientName, dbSupplements);
  
  // Accept fuzzy match if score is above threshold
  if (fuzzyMatch && fuzzyScore >= 0.6) {
    return {
      ingredientId,
      ingredientName,
      matchedDbId: fuzzyMatch.id,
      matchedDbName: fuzzyMatch.name,
      matchScore: fuzzyScore,
      matchType: 'fuzzy',
    };
  }
  
  // No match found
  return {
    ingredientId,
    ingredientName,
    matchedDbId: null,
    matchedDbName: null,
    matchScore: fuzzyScore,
    matchType: 'none',
  };
}

/**
 * Match all ingredients to database supplements
 */
export function matchAllIngredients(
  ingredients: Array<{ ingredient_id: string; ingredient_name: string }>,
  dbSupplements: DbSupplement[]
): MatchResult[] {
  return ingredients.map(ing => 
    matchIngredient(ing.ingredient_id, ing.ingredient_name, dbSupplements)
  );
}

/**
 * Get match statistics
 */
export function getMatchStats(results: MatchResult[]): {
  total: number;
  matched: number;
  exact: number;
  manual: number;
  fuzzy: number;
  unmatched: number;
} {
  return {
    total: results.length,
    matched: results.filter(r => r.matchType !== 'none').length,
    exact: results.filter(r => r.matchType === 'exact').length,
    manual: results.filter(r => r.matchType === 'manual').length,
    fuzzy: results.filter(r => r.matchType === 'fuzzy').length,
    unmatched: results.filter(r => r.matchType === 'none').length,
  };
}
