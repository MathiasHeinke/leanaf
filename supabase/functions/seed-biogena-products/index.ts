// Biogena Products Seeding Edge Function v1.0
// Imports/Upserts Biogena products from extended JSON format

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildCorsHeaders, handleOptions, okJson, errJson } from "../_shared/cors.ts";

// ============================================
// TYPES
// ============================================

interface BiogenaProduct {
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

interface BiogenaJson {
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
  'bioflavonoids': 'Vitamin C',
  
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

function parseDosage(dosage: string): { amount: number; unit: string } {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(mg|µg|mcg|g|IE|IU)/i,
    /(\d+(?:\.\d+)?)\s*(Mrd)\s*KBE/i,
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
  
  return { amount: 1, unit: 'Portion' };
}

function scoresToTags(scores: BiogenaProduct['big8_scores']): string[] {
  const tags: string[] = ['reinsubstanz', 'GMP', 'made-in-at'];
  
  if (scores.bioavailability >= 10) tags.push('high-bioavailability');
  if (scores.form >= 10) tags.push('optimal-form');
  if (scores.purity >= 10) tags.push('ultra-pure');
  if (scores.lab_tested >= 10) tags.push('lab-verified');
  if (scores.potency >= 10) tags.push('clinical-dose');
  
  return tags;
}

function determineForm(dosage: string, productName: string): string {
  const lowerName = productName.toLowerCase();
  const lowerDosage = dosage.toLowerCase();
  
  if (lowerName.includes('tropfen') || lowerDosage.includes('tropfen')) return 'Tropfen';
  if (lowerName.includes('pulver') || lowerDosage.includes('pulver')) return 'Pulver';
  if (lowerName.includes('liposomal')) return 'Liposomal';
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
    let biogenaData: BiogenaJson;
    try {
      biogenaData = await req.json();
    } catch {
      return errJson('Invalid JSON body', req, 400);
    }

    if (!biogenaData.products || !Array.isArray(biogenaData.products)) {
      return errJson('Missing or invalid products array', req, 400);
    }

    // Get Biogena brand ID
    const { data: brand, error: brandError } = await supabase
      .from('supplement_brands')
      .select('id')
      .eq('slug', 'biogena')
      .single();

    if (brandError || !brand) {
      return errJson('Biogena brand not found in database', req, 404);
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
      total: biogenaData.products.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      details: [] as { name: string; action: string; supplement: string | null }[],
    };

    // Process each product
    for (const product of biogenaData.products) {
      try {
        // Get supplement name from first ingredient
        const mainIngredient = product.ingredients[0] || '';
        const supplementName = INGREDIENT_TO_SUPPLEMENT[mainIngredient] || mainIngredient;
        const supplementId = suppMap.get(supplementName.toLowerCase().trim()) || null;
        
        // Parse dosage
        const { amount, unit } = parseDosage(product.dosage);
        
        // Convert scores to tags
        const qualityTags = scoresToTags(product.big8_scores);
        
        // Determine form
        const form = determineForm(product.dosage, product.product_name);
        
        // Get protocol phase
        const protocolPhase = CATEGORY_TO_PHASE[product.category] ?? 0;
        
        // Prepare record
        const record = {
          brand_id: brandId,
          supplement_id: supplementId,
          product_name: product.product_name,
          pack_size: product.servings,
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

    // Get final count
    const { count: totalBiogenaProducts } = await supabase
      .from('supplement_products')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId);

    return okJson({
      success: true,
      results,
      biogena_total_products: totalBiogenaProducts,
    }, req);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errJson(message, req, 500);
  }
});
