// ARES Supplement Seeding Edge Function v4.0
// Schlank: Daten werden per Request-Body übergeben statt inline eingebettet

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  description: string;
  impact_score?: number;
  necessity_tier?: string;
  evidence_level?: string;
  default_dose?: number;
  default_unit?: string;
  synergies?: string[];
}

interface SeedRequest {
  products?: ProductSeed[];
  supplements?: SupplementSeed[];
  batch_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    let requestData: SeedRequest = {};
    try {
      requestData = await req.json();
    } catch {
      // Leerer Body = nur Status zurückgeben
    }

    const { products = [], supplements = [], batch_name = 'manual' } = requestData;

    const results = {
      batch_name,
      supplements_added: 0,
      supplements_skipped: 0,
      supplements_errors: [] as string[],
      products_added: 0,
      products_skipped: 0,
      products_errors: [] as string[],
    };

    // 1. Supplements einfügen (falls vorhanden)
    for (const supp of supplements) {
      const { data: existing } = await supabase
        .from('supplement_database')
        .select('id')
        .eq('name', supp.name)
        .maybeSingle();

      if (existing) {
        results.supplements_skipped++;
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
          synergies: supp.synergies || [],
        });

      if (error) {
        results.supplements_errors.push(`${supp.name}: ${error.message}`);
      } else {
        results.supplements_added++;
      }
    }

    // 2. Lade aktuelle Brands und Supplements für Mapping
    const { data: brands } = await supabase
      .from('supplement_brands')
      .select('id, slug');

    const { data: dbSupplements } = await supabase
      .from('supplement_database')
      .select('id, name');

    const brandMap = new Map(brands?.map(b => [b.slug, b.id]) || []);
    const suppMap = new Map(dbSupplements?.map(s => [s.name.toLowerCase().trim(), s.id]) || []);

    // 3. Produkte einfügen
    for (const product of products) {
      const brandId = brandMap.get(product.brand_slug);
      if (!brandId) {
        results.products_errors.push(`${product.product_name}: Unknown brand ${product.brand_slug}`);
        continue;
      }

      // Duplikat-Check
      const { data: existingProduct } = await supabase
        .from('supplement_products')
        .select('id')
        .eq('brand_id', brandId)
        .eq('product_name', product.product_name)
        .maybeSingle();

      if (existingProduct) {
        results.products_skipped++;
        continue;
      }

      // Supplement-ID finden
      const suppId = suppMap.get(product.supplement_name.toLowerCase().trim()) || null;

      const { error } = await supabase
        .from('supplement_products')
        .insert({
          brand_id: brandId,
          supplement_id: suppId,
          product_name: product.product_name,
          pack_size: product.pack_size,
          pack_unit: product.pack_unit,
          servings_per_pack: product.servings_per_pack,
          dose_per_serving: product.dose_per_serving,
          dose_unit: product.dose_unit,
          price_eur: product.price_eur,
          price_per_serving: product.price_per_serving,
          form: product.form,
          is_verified: true,
          quality_tags: product.quality_tags || [],
        });

      if (error) {
        results.products_errors.push(`${product.product_name}: ${error.message}`);
      } else {
        results.products_added++;
      }
    }

    // 4. Aktuellen DB-Stand holen
    const { count: totalProducts } = await supabase
      .from('supplement_products')
      .select('*', { count: 'exact', head: true });

    const { count: totalSupplements } = await supabase
      .from('supplement_database')
      .select('*', { count: 'exact', head: true });

    const { count: totalBrands } = await supabase
      .from('supplement_brands')
      .select('*', { count: 'exact', head: true });

    return new Response(
      JSON.stringify({
        success: true,
        results,
        database_totals: {
          products: totalProducts,
          supplements: totalSupplements,
          brands: totalBrands,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
