// Generic Manufacturer Products Seeding Edge Function v1.0
// Imports/Upserts products from any manufacturer JSON format

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildCorsHeaders, handleOptions, okJson, errJson } from "../_shared/cors.ts";

// ============================================
// TYPES
// ============================================

interface ManufacturerProduct {
  product_id: string;
  product_name: string;
  category: string;
  ingredients: string[];
  dosage: string;
  price: number;
  servings: number;
  pack_size?: number;
  form?: string;
  cost_per_day: number;
  vegan: boolean;
  made_in_germany?: boolean;
  lab_tested?: boolean;
  big8_scores: {
    bioavailability: number;
    form: number;
    potency: number;
    reviews: number;
    origin: number;
    lab_tested?: number;
    lab_tests?: number;
    purity: number;
    value: number;
  };
  impact_score: number;
}

interface ManufacturerJson {
  manufacturer: string;
  manufacturer_id: string;
  country: string;
  website: string;
  focus: string[];
  price_segment: string;
  products: ManufacturerProduct[];
}

// ============================================
// INGREDIENT ID TO SUPPLEMENT NAME MAPPING
// ============================================

const INGREDIENT_TO_SUPPLEMENT: Record<string, string> = {
  // Longevity
  'nmn': 'NMN',
  'resveratrol': 'Resveratrol',
  'coq10': 'CoQ10 Ubiquinol',
  'q10': 'CoQ10 Ubiquinol',
  'coenzyme_q10': 'CoQ10 Ubiquinol',
  'pqq': 'PQQ',
  'ala': 'Alpha Liponsäure',
  'carnitine': 'L-Carnitin',
  'spermidine': 'Spermidin',
  
  // Vitamins
  'vit_d3': 'Vitamin D3',
  'vitamin_d': 'Vitamin D3',
  'vitamin_d3': 'Vitamin D3',
  'vit_k2': 'Vitamin K2',
  'vitamin_k2': 'Vitamin K2',
  'vit_b_complex': 'Vitamin B-Komplex',
  'b_complex': 'Vitamin B-Komplex',
  'vit_b12': 'Vitamin B12',
  'vitamin_b12': 'Vitamin B12',
  'vit_c': 'Vitamin C',
  'vitamin_c': 'Vitamin C',
  'folate': 'Folat',
  'folic_acid': 'Folat',
  'bioflavonoids': 'Vitamin C',
  'multivitamin': 'Multivitamin',
  'vitamin_a': 'Vitamin A',
  'vitamin_e': 'Vitamin E',
  'biotin': 'Biotin',
  
  // Minerals
  'magnesium': 'Magnesium',
  'zinc': 'Zink',
  'selenium': 'Selen',
  'iron': 'Eisen',
  'chromium': 'Chrom',
  'calcium': 'Calcium',
  'iodine': 'Jod',
  'potassium': 'Kalium',
  'boron': 'Bor',
  'silicon': 'Silizium',
  'silica': 'Silizium',
  'kelp': 'Jod',
  
  // Amino acids
  'glutamine': 'L-Glutamin',
  'glutamine_gut': 'L-Glutamin',
  'taurine': 'Taurin',
  'theanine': 'L-Theanin',
  'glycine': 'Glycin',
  'nac': 'NAC',
  'arginine': 'L-Arginin',
  'citrulline': 'L-Citrullin',
  'lysine': 'L-Lysin',
  'tryptophan': 'L-Tryptophan',
  'bcaa': 'BCAA',
  'leucine': 'BCAA',
  'eaa': 'EAA',
  'tyrosine': 'L-Tyrosin',
  
  // Proteins
  'whey': 'Whey Protein',
  'casein': 'Casein',
  'pea_protein': 'Erbsenprotein',
  'rice_protein': 'Reisprotein',
  
  // Fatty acids
  'omega3_dha': 'Omega-3',
  'omega3_epa': 'Omega-3',
  'omega3': 'Omega-3',
  'omega_3': 'Omega-3',
  'fish_oil': 'Omega-3',
  'epa': 'Omega-3',
  'dha': 'Omega-3',
  
  // Adaptogens
  'ashwagandha': 'Ashwagandha',
  'rhodiola': 'Rhodiola',
  'ginseng': 'Ginseng',
  'maca': 'Maca',
  
  // Antioxidants
  'curcumin': 'Curcumin',
  'piperine': 'Curcumin',
  'quercetin': 'Quercetin',
  'glutathione': 'Glutathion',
  'opc': 'OPC',
  'astaxanthin': 'Astaxanthin',
  'lutein': 'Lutein',
  'zeaxanthin': 'Zeaxanthin',
  
  // Gut health
  'probiotics_lacto': 'Probiotika',
  'probiotics_bifido': 'Probiotika',
  'probiotics': 'Probiotika',
  'prebiotics': 'Präbiotika',
  'psyllium': 'Flohsamen',
  
  // Joint health
  'collagen': 'Kollagen',
  'collagen_peptides': 'Kollagen',
  'glucosamine': 'Glucosamin',
  'chondroitin': 'Chondroitin',
  'msm': 'MSM',
  'hyaluronic_acid': 'Hyaluronsäure',
  'boswellia': 'Boswellia',
  'rosehip': 'Hagebutte',
  
  // Sleep
  'melatonin': 'Melatonin',
  '5htp': '5-HTP',
  'valerian': 'Baldrian',
  'passionflower': 'Passionsblume',
  'gaba': 'GABA',
  
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
  'ginkgo': 'Ginkgo',
  
  // Sport
  'creatine': 'Creatine',
  'beta_alanine': 'Beta-Alanin',
  'caffeine': 'Koffein',
  'hmb': 'HMB',
  'carnitine': 'L-Carnitin',
  'betaine': 'Betain',
  'mct_oil': 'MCT-Öl',
  'sodium': 'Elektrolyte',
  
  // Antioxidants (extended)
  'ala': 'Alpha-Liponsäure',
  'coq10': 'CoQ10 Ubiquinol',
  
  // Superfoods
  'spirulina': 'Spirulina',
  'chlorella': 'Chlorella',
  
  // Liver & Detox
  'milk_thistle': 'Mariendistel',
  'artichoke': 'Artischocke',
  
  // Other
  'black_seed_oil': 'Schwarzkümmelöl',
  'ginger': 'Ingwer',
  'elderberry': 'Holunder',
};

// ============================================
// FORM MAPPING (English to German)
// ============================================

const FORM_MAPPING: Record<string, string> = {
  'tablets': 'Tabletten',
  'tablet': 'Tabletten',
  'softgels': 'Softgels',
  'softgel': 'Softgels',
  'capsules': 'Kapseln',
  'capsule': 'Kapseln',
  'drops': 'Tropfen',
  'powder': 'Pulver',
  'liquid': 'Flüssig',
  'gummies': 'Gummies',
  'lozenges': 'Lutschtabletten',
};

// ============================================
// CATEGORY TO PROTOCOL PHASE MAPPING
// ============================================

const CATEGORY_TO_PHASE: Record<string, number> = {
  'longevity': 2,
  'vitamine': 0,
  'vitamins': 0,
  'multivitamin': 0,
  'mineralien': 0,
  'minerals': 0,
  'fettsaeuren': 0,
  'omega': 0,
  'adaptogene': 0,
  'antioxidantien': 1,
  'antioxidants': 1,
  'aminosaeuren': 0,
  'amino_acids': 0,
  'darm': 0,
  'gut': 0,
  'gelenke': 1,
  'joints': 1,
  'schlaf': 0,
  'sleep': 0,
  'pilze': 0,
  'mushrooms': 0,
  'stoffwechsel': 1,
  'metabolism': 1,
  'nootropics': 1,
  'sport': 0,
  'fitness': 0,
  'heart': 1,
  'herz': 1,
  'eyes': 1,
  'augen': 1,
  'skin': 1,
  'haut': 1,
  'hair': 1,
  'haare': 1,
  'immune': 0,
  'immun': 0,
  'energy': 0,
  'energie': 0,
  'bone': 1,
  'knochen': 1,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseDosage(dosage: string): { amount: number; unit: string } {
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*(mg|µg|mcg|g|IE|IU)/i,
    /(\d+(?:[.,]\d+)?)\s*(Mrd)\s*KBE/i,
  ];
  
  for (const pattern of patterns) {
    const match = dosage.match(pattern);
    if (match) {
      return {
        amount: parseFloat(match[1].replace(',', '.')),
        unit: match[2].toLowerCase() === 'mcg' ? 'µg' : match[2],
      };
    }
  }
  
  return { amount: 1, unit: 'Portion' };
}

function scoresToTags(
  scores: ManufacturerProduct['big8_scores'],
  madeInGermany?: boolean,
  labTested?: boolean,
  country?: string
): string[] {
  const tags: string[] = [];
  
  // Country-based tags
  if (madeInGermany) {
    tags.push('made-in-de');
  } else if (country === 'AT') {
    tags.push('made-in-at');
  }
  
  // Lab tested from boolean field
  if (labTested) {
    tags.push('lab-tested');
  }
  
  // Score-based tags (threshold 8.5 for good, 10 for excellent)
  if (scores.bioavailability >= 9) tags.push('high-bioavailability');
  if (scores.form >= 9) tags.push('optimal-form');
  if (scores.purity >= 9) tags.push('ultra-pure');
  if (scores.value >= 8.5) tags.push('good-value');
  if (scores.potency >= 9) tags.push('clinical-dose');
  
  // Lab tested from scores (both field names)
  const labScore = scores.lab_tested ?? scores.lab_tests ?? 0;
  if (labScore >= 9) tags.push('lab-verified');
  
  return tags;
}

function determineForm(product: ManufacturerProduct): string {
  // Use explicit form field if available
  if (product.form) {
    const mappedForm = FORM_MAPPING[product.form.toLowerCase()];
    if (mappedForm) return mappedForm;
  }
  
  // Parse from dosage/name as fallback
  const lowerName = product.product_name.toLowerCase();
  const lowerDosage = product.dosage.toLowerCase();
  
  if (lowerName.includes('tropfen') || lowerDosage.includes('tropfen')) return 'Tropfen';
  if (lowerName.includes('pulver') || lowerDosage.includes('pulver')) return 'Pulver';
  if (lowerName.includes('liposomal')) return 'Liposomal';
  if (lowerName.includes('softgel')) return 'Softgels';
  if (lowerName.includes('tablette')) return 'Tabletten';
  if (lowerDosage.includes('kbe')) return 'Pulver';
  
  return 'Kapseln';
}

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptions(req);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    let manufacturerData: ManufacturerJson;
    try {
      manufacturerData = await req.json();
    } catch {
      return errJson('Invalid JSON body', req, 400);
    }

    if (!manufacturerData.products || !Array.isArray(manufacturerData.products)) {
      return errJson('Missing or invalid products array', req, 400);
    }

    if (!manufacturerData.manufacturer_id) {
      return errJson('Missing manufacturer_id field', req, 400);
    }

    const brandSlug = manufacturerData.manufacturer_id;

    // Get brand by slug
    const { data: brand, error: brandError } = await supabase
      .from('supplement_brands')
      .select('id')
      .eq('slug', brandSlug)
      .single();

    if (brandError || !brand) {
      return errJson(
        `Brand "${brandSlug}" not found in database. Please create it first via migration.`,
        req,
        404
      );
    }

    const brandId = brand.id;

    // Get all supplements for name-to-id mapping
    const { data: supplements } = await supabase
      .from('supplement_database')
      .select('id, name');

    const suppMap = new Map(
      supplements?.map(s => [s.name.toLowerCase().trim(), s.id]) || []
    );

    // Results tracking
    const results = {
      manufacturer: manufacturerData.manufacturer,
      manufacturer_id: brandSlug,
      total: manufacturerData.products.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      details: [] as { name: string; action: string; supplement: string | null }[],
    };

    // Process each product
    for (const product of manufacturerData.products) {
      try {
        // Get supplement name from first ingredient
        const mainIngredient = product.ingredients[0] || '';
        const supplementName = INGREDIENT_TO_SUPPLEMENT[mainIngredient] || mainIngredient;
        const supplementId = suppMap.get(supplementName.toLowerCase().trim()) || null;
        
        // Parse dosage
        const { amount, unit } = parseDosage(product.dosage);
        
        // Convert scores to tags
        const qualityTags = scoresToTags(
          product.big8_scores,
          product.made_in_germany,
          product.lab_tested,
          manufacturerData.country
        );
        
        // Determine form
        const form = determineForm(product);
        
        // Determine pack size (use pack_size if available, otherwise servings)
        const packSize = product.pack_size ?? product.servings;
        
        // Prepare record
        const record = {
          brand_id: brandId,
          supplement_id: supplementId,
          product_name: product.product_name,
          pack_size: packSize,
          pack_unit: 'Stück',
          servings_per_pack: product.servings,
          dose_per_serving: amount,
          dose_unit: unit,
          price_eur: product.price,
          price_per_serving: product.cost_per_day,
          form,
          is_vegan: product.vegan,
          is_verified: true,
          quality_tags: qualityTags,
        };

        // Check if product exists
        const { data: existing } = await supabase
          .from('supplement_products')
          .select('id')
          .eq('brand_id', brandId)
          .eq('product_name', product.product_name)
          .maybeSingle();

        if (existing) {
          // Update existing
          const { error: updateError } = await supabase
            .from('supplement_products')
            .update(record)
            .eq('id', existing.id);

          if (updateError) {
            results.errors.push(`Update ${product.product_name}: ${updateError.message}`);
          } else {
            results.updated++;
            results.details.push({
              name: product.product_name,
              action: 'updated',
              supplement: supplementName,
            });
          }
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from('supplement_products')
            .insert(record);

          if (insertError) {
            results.errors.push(`Insert ${product.product_name}: ${insertError.message}`);
          } else {
            results.inserted++;
            results.details.push({
              name: product.product_name,
              action: 'inserted',
              supplement: supplementName,
            });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`${product.product_name}: ${msg}`);
        results.skipped++;
      }
    }

    // Get final count for this brand
    const { count: totalBrandProducts } = await supabase
      .from('supplement_products')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId);

    return okJson({
      success: true,
      results,
      brand_total_products: totalBrandProducts,
    }, req);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errJson(message, req, 500);
  }
});
