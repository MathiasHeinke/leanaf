// Biogena JSON to ProductSeed Converter v1.0
// Konvertiert das erweiterte Biogena JSON-Format in das bestehende ProductSeed-Format

import { ProductSeed } from '@/data/supplementProductsSeed';

// ============================================
// TYPES
// ============================================

export interface BiogenaProduct {
  product_id: string;
  product_name: string;
  category: string;
  ingredients: string[];
  dosage: string;
  price: number;
  servings: number;
  cost_per_day: number;
  vegan: boolean;
  big8_scores: {
    bioavailability: number;
    form: number;
    potency: number;
    reviews: number;
    origin: number;
    lab_tested: number;
    purity: number;
    value: number;
  };
  impact_score: number;
}

export interface BiogenaJson {
  manufacturer: string;
  manufacturer_id: string;
  country: string;
  website: string;
  focus: string[];
  price_segment: string;
  products: BiogenaProduct[];
}

// ============================================
// INGREDIENT ID TO SUPPLEMENT NAME MAPPING
// ============================================

const INGREDIENT_TO_SUPPLEMENT: Record<string, string> = {
  // Longevity
  'nmn': 'NMN',
  'resveratrol': 'Resveratrol',
  'coq10': 'CoQ10 Ubiquinol',
  'pqq': 'PQQ',
  'ala': 'Alpha Liponsäure',
  'carnitine': 'L-Carnitin',
  'spermidine': 'Spermidin',
  
  // Vitamins
  'vit_d3': 'Vitamin D3',
  'vit_k2': 'Vitamin K2',
  'vit_b_complex': 'Vitamin B-Komplex',
  'vit_b12': 'Vitamin B12',
  'vit_c': 'Vitamin C',
  'folate': 'Folat',
  'bioflavonoids': 'Vitamin C', // Maps to parent
  
  // Minerals
  'magnesium': 'Magnesium',
  'zinc': 'Zink',
  'selenium': 'Selen',
  'iron': 'Eisen',
  'chromium': 'Chrom',
  
  // Amino acids
  'glutamine': 'L-Glutamin',
  'taurine': 'Taurin',
  'theanine': 'L-Theanin',
  'glycine': 'Glycin',
  'nac': 'NAC',
  
  // Fatty acids
  'omega3_dha': 'Omega-3',
  'omega3_epa': 'Omega-3',
  
  // Adaptogens
  'ashwagandha': 'Ashwagandha',
  'rhodiola': 'Rhodiola',
  
  // Antioxidants
  'curcumin': 'Curcumin',
  'quercetin': 'Quercetin',
  'glutathione': 'Glutathion',
  'opc': 'OPC',
  
  // Gut health
  'probiotics_lacto': 'Probiotika',
  'probiotics_bifido': 'Probiotika',
  
  // Joint health
  'collagen': 'Kollagen',
  'collagen_peptides': 'Kollagen',
  'glucosamine': 'Glucosamin',
  'msm': 'MSM',
  'hyaluronic_acid': 'Hyaluronsäure',
  'boswellia': 'Boswellia',
  
  // Sleep
  'melatonin': 'Melatonin',
  
  // Mushrooms
  'lions_mane': 'Lions Mane',
  'reishi': 'Reishi',
  'cordyceps': 'Cordyceps',
  
  // Metabolic
  'berberine': 'Berberin',
  'myo_inositol': 'Inositol',
  'bergamot': 'Citrus Bergamot',
  
  // Nootropics
  'phosphatidylcholine': 'Phosphatidylcholin',
  'alpha_gpc': 'Alpha-GPC',
  'ps': 'Phosphatidylserin',
  
  // Sport
  'creatine': 'Creatine',
};

// ============================================
// CATEGORY TO PROTOCOL PHASE MAPPING
// ============================================

const CATEGORY_TO_PHASE: Record<string, number> = {
  'longevity': 2,
  'vitamine': 0,
  'mineralien': 0,
  'fettsaeuren': 0,
  'adaptogene': 0,
  'antioxidantien': 1,
  'aminosaeuren': 0,
  'darm': 0,
  'gelenke': 1,
  'schlaf': 0,
  'pilze': 0,
  'stoffwechsel': 1,
  'nootropics': 1,
  'sport': 0,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parses dosage string to extract amount and unit for main ingredient
 * Examples:
 * - "NMN 125mg + Resveratrol 100mg" → { amount: 125, unit: 'mg' }
 * - "1000 IE Cholecalciferol" → { amount: 1000, unit: 'IE' }
 * - "500µg Methylcobalamin" → { amount: 500, unit: 'µg' }
 */
export function parseDosage(dosage: string): { amount: number; unit: string } {
  // Try patterns: "X mg", "X IE", "X µg", "X g"
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(mg|µg|mcg|g|IE|IU)/i,
    /(\d+(?:\.\d+)?)\s*(Mrd)\s*KBE/i, // Probiotics: "7.5 Mrd KBE"
  ];
  
  for (const pattern of patterns) {
    const match = dosage.match(pattern);
    if (match) {
      return {
        amount: parseFloat(match[1]),
        unit: match[2].toLowerCase() === 'mcg' ? 'µg' : match[2],
      };
    }
  }
  
  // Default fallback
  return { amount: 1, unit: 'Portion' };
}

/**
 * Converts big8_scores to quality_tags
 * Scores ≥ 9 get converted to tags
 */
export function scoresToTags(scores: BiogenaProduct['big8_scores']): string[] {
  const tags: string[] = ['reinsubstanz', 'GMP', 'made-in-at']; // Base Biogena tags
  
  if (scores.bioavailability >= 10) tags.push('high-bioavailability');
  if (scores.form >= 10) tags.push('optimal-form');
  if (scores.purity >= 10) tags.push('ultra-pure');
  if (scores.lab_tested >= 10) tags.push('lab-verified');
  if (scores.potency >= 10) tags.push('clinical-dose');
  
  return tags;
}

/**
 * Determines product form from dosage string
 */
export function determineForm(dosage: string, productName: string): ProductSeed['form'] {
  const lowerName = productName.toLowerCase();
  const lowerDosage = dosage.toLowerCase();
  
  if (lowerName.includes('tropfen') || lowerDosage.includes('tropfen')) return 'drops';
  if (lowerName.includes('pulver') || lowerDosage.includes('pulver')) return 'powder';
  if (lowerName.includes('liposomal')) return 'liquid';
  if (lowerDosage.includes('kbe')) return 'powder'; // Probiotics
  
  return 'capsule'; // Default for Biogena
}

// ============================================
// MAIN CONVERTER
// ============================================

export function convertBiogenaProduct(product: BiogenaProduct): ProductSeed {
  // Get supplement name from first ingredient
  const mainIngredient = product.ingredients[0] || '';
  const supplementName = INGREDIENT_TO_SUPPLEMENT[mainIngredient] || mainIngredient;
  
  // Parse dosage
  const { amount, unit } = parseDosage(product.dosage);
  
  // Convert scores to tags
  const qualityTags = scoresToTags(product.big8_scores);
  
  // Determine form
  const form = determineForm(product.dosage, product.product_name);
  
  // Get protocol phase
  const protocolPhase = CATEGORY_TO_PHASE[product.category] ?? 0;
  
  return {
    brand_slug: 'biogena',
    supplement_name: supplementName,
    product_name: product.product_name,
    pack_size: product.servings,
    pack_unit: 'capsules',
    servings_per_pack: product.servings,
    dose_per_serving: amount,
    dose_unit: unit,
    price_eur: product.price,
    price_per_serving: product.cost_per_day,
    form,
    is_vegan: product.vegan,
    is_recommended: product.impact_score >= 9.5,
    quality_tags: qualityTags,
    protocol_phase: protocolPhase as 0 | 1 | 2,
    impact_score: product.impact_score,
    notes: `Big8 Avg: ${(
      (product.big8_scores.bioavailability +
        product.big8_scores.form +
        product.big8_scores.potency +
        product.big8_scores.reviews +
        product.big8_scores.origin +
        product.big8_scores.lab_tested +
        product.big8_scores.purity +
        product.big8_scores.value) / 8
    ).toFixed(1)}/10`,
  };
}

export function convertBiogenaJson(json: BiogenaJson): ProductSeed[] {
  return json.products.map(convertBiogenaProduct);
}
