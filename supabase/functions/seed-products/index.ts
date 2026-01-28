// ARES Supplement Seeding Edge Function
// Lädt Produkte und Wirkstoffe in die Datenbank

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Inline seed data (gekürzt für Edge Function Kompatibilität)
// In Produktion: Via API-Call oder größere Chunks laden

interface ProductSeed {
  brand_slug: string;
  supplement_name: string;
  product_name: string;
  pack_size: number;
  pack_unit: string;
  servings_per_pack: number;
  dose_per_serving: number;
  dose_unit: string;
  price_eur: number;
  price_per_serving: number;
  form: string;
  is_vegan?: boolean;
  is_recommended?: boolean;
  quality_tags?: string[];
  protocol_phase?: number;
  impact_score?: number;
  notes?: string;
}

interface SupplementSeed {
  name: string;
  category: string;
  subcategory?: string;
  description: string;
  impact_score?: number;
  necessity_tier?: string;
  evidence_level?: string;
  default_dose?: number;
  default_unit?: string;
  timing_recommendation?: string;
  synergies?: string[];
  warnings?: string[];
  is_vegan?: boolean;
  form_quality_notes?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for options
    let body: { action?: string; dryRun?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      body = { action: 'products', dryRun: false };
    }

    const { action = 'products', dryRun = false } = body;

    // 1. Lade alle Brands für ID-Mapping
    const { data: brands, error: brandsError } = await supabase
      .from('supplement_brands')
      .select('id, slug, name');
    
    if (brandsError) {
      throw new Error(`Failed to load brands: ${brandsError.message}`);
    }

    const brandMap = new Map(brands?.map(b => [b.slug, b.id]) || []);
    console.log(`Loaded ${brandMap.size} brands`);

    // 2. Lade alle Supplements für ID-Mapping
    const { data: supplements, error: suppError } = await supabase
      .from('supplement_database')
      .select('id, name');
    
    if (suppError) {
      throw new Error(`Failed to load supplements: ${suppError.message}`);
    }

    const suppMap = new Map(
      supplements?.map(s => [s.name.toLowerCase().trim(), s.id]) || []
    );
    console.log(`Loaded ${suppMap.size} supplements`);

    const results = {
      action,
      dryRun,
      brands_loaded: brandMap.size,
      supplements_loaded: suppMap.size,
      products_inserted: 0,
      products_skipped: 0,
      supplements_inserted: 0,
      errors: [] as string[],
      missing_brands: [] as string[],
      missing_supplements: [] as string[],
    };

    // Beispiel-Produkte (erste 10 zum Testen)
    const SAMPLE_PRODUCTS: ProductSeed[] = [
      {
        brand_slug: 'esn',
        supplement_name: 'Kreatin Monohydrat',
        product_name: 'Ultrapure Creatine Monohydrate',
        pack_size: 500,
        pack_unit: 'g',
        servings_per_pack: 100,
        dose_per_serving: 5,
        dose_unit: 'g',
        price_eur: 19.90,
        price_per_serving: 0.20,
        form: 'powder',
        is_vegan: true,
        is_recommended: true,
        quality_tags: ['GMP', 'made-in-de'],
        protocol_phase: 0,
        impact_score: 9.8,
      },
      {
        brand_slug: 'sunday-natural',
        supplement_name: 'Magnesium',
        product_name: 'Magnesium Glycinat',
        pack_size: 180,
        pack_unit: 'capsules',
        servings_per_pack: 90,
        dose_per_serving: 400,
        dose_unit: 'mg',
        price_eur: 24.90,
        price_per_serving: 0.28,
        form: 'capsule',
        is_vegan: true,
        is_recommended: true,
        quality_tags: ['GMP', 'vegan', 'bisglycinat'],
        protocol_phase: 0,
        impact_score: 9.5,
      },
      {
        brand_slug: 'moleqlar',
        supplement_name: 'NMN',
        product_name: 'NMN Uthever® Pulver',
        pack_size: 60,
        pack_unit: 'g',
        servings_per_pack: 120,
        dose_per_serving: 500,
        dose_unit: 'mg',
        price_eur: 72.90,
        price_per_serving: 0.61,
        form: 'powder',
        is_vegan: true,
        is_recommended: true,
        quality_tags: ['uthever', '>99.9%', 'studien-material'],
        protocol_phase: 2,
        impact_score: 9.0,
      },
    ];

    // Beispiel-Supplements (zum Testen)
    const SAMPLE_SUPPLEMENTS: SupplementSeed[] = [
      {
        name: 'NMN',
        category: 'longevity',
        subcategory: 'nad-precursors',
        description: 'Nicotinamid Mononukleotid - NAD+ Vorläufer für zelluläre Energie',
        impact_score: 9.0,
        necessity_tier: 'advanced',
        evidence_level: 'moderate',
        default_dose: 500,
        default_unit: 'mg',
        timing_recommendation: 'Morgens auf nüchternen Magen',
        is_vegan: true,
      },
      {
        name: 'GlyNAC',
        category: 'longevity',
        subcategory: 'glutathione',
        description: 'Glycin + NAC Kombination - TOP Longevity Compound',
        impact_score: 8.5,
        necessity_tier: 'advanced',
        evidence_level: 'moderate',
        default_dose: 1200,
        default_unit: 'mg',
        timing_recommendation: 'Morgens',
        is_vegan: true,
      },
      {
        name: 'Lions Mane',
        category: 'cognitive',
        subcategory: 'nootropics',
        description: 'Hericium erinaceus - NGF-Steigerung für Nervenwachstum',
        impact_score: 8.5,
        necessity_tier: 'optimizer',
        evidence_level: 'moderate',
        default_dose: 500,
        default_unit: 'mg',
        timing_recommendation: 'Morgens',
        is_vegan: true,
      },
    ];

    if (action === 'supplements' || action === 'all') {
      // Supplements einfügen die noch nicht existieren
      for (const supp of SAMPLE_SUPPLEMENTS) {
        const existingId = suppMap.get(supp.name.toLowerCase().trim());
        
        if (existingId) {
          console.log(`Supplement exists: ${supp.name}`);
          continue;
        }

        if (dryRun) {
          console.log(`[DRY RUN] Would insert supplement: ${supp.name}`);
          results.supplements_inserted++;
          continue;
        }

        const { error } = await supabase
          .from('supplement_database')
          .insert({
            name: supp.name,
            category: supp.category,
            description: supp.description,
            impact_score: supp.impact_score,
            necessity_tier: supp.necessity_tier,
            evidence_level: supp.evidence_level,
            default_dosage: supp.default_dose ? `${supp.default_dose} ${supp.default_unit || ''}`.trim() : null,
            default_unit: supp.default_unit,
            synergies: supp.synergies || [],
          });

        if (error) {
          results.errors.push(`Failed to insert ${supp.name}: ${error.message}`);
        } else {
          results.supplements_inserted++;
          console.log(`Inserted supplement: ${supp.name}`);
        }
      }
    }

    if (action === 'products' || action === 'all') {
      // Produkte einfügen
      for (const product of SAMPLE_PRODUCTS) {
        const brandId = brandMap.get(product.brand_slug);
        
        if (!brandId) {
          if (!results.missing_brands.includes(product.brand_slug)) {
            results.missing_brands.push(product.brand_slug);
          }
          results.products_skipped++;
          continue;
        }

        // Supplement-ID finden
        const suppId = suppMap.get(product.supplement_name.toLowerCase().trim());
        
        if (!suppId) {
          if (!results.missing_supplements.includes(product.supplement_name)) {
            results.missing_supplements.push(product.supplement_name);
          }
          // Trotzdem einfügen, supplement_id ist optional
        }

        // Check if product already exists (no unique constraint, so manual check)
        const { data: existingProduct } = await supabase
          .from('supplement_products')
          .select('id')
          .eq('brand_id', brandId)
          .eq('product_name', product.product_name)
          .maybeSingle();

        if (existingProduct) {
          console.log(`Product exists: ${product.product_name}`);
          results.products_skipped++;
          continue;
        }

        if (dryRun) {
          console.log(`[DRY RUN] Would insert product: ${product.product_name}`);
          results.products_inserted++;
          continue;
        }

        const { error } = await supabase
          .from('supplement_products')
          .insert({
            brand_id: brandId,
            supplement_id: suppId || null,
            product_name: product.product_name,
            pack_size: product.pack_size,
            pack_unit: product.pack_unit,
            servings_per_pack: product.servings_per_pack,
            dose_per_serving: product.dose_per_serving,
            dose_unit: product.dose_unit,
            price_eur: product.price_eur,
            price_per_serving: product.price_per_serving,
            form: product.form,
            is_vegan: product.is_vegan ?? false,
            is_verified: true,
          });

        if (error) {
          results.errors.push(`Failed to insert ${product.product_name}: ${error.message}`);
        } else {
          results.products_inserted++;
          console.log(`Inserted product: ${product.product_name}`);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: dryRun 
        ? 'Dry run completed - no data was modified'
        : 'Seeding completed successfully',
      results,
      usage: {
        actions: ['products', 'supplements', 'all'],
        example: 'POST { "action": "all", "dryRun": true }',
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Seeding error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
