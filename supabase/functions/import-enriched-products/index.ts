import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichedProduct {
  product_name: string;
  brand_slug: string;
  pack_size?: number;
  pack_unit?: string;
  servings_per_pack?: number;
  dose_per_serving?: number;
  dose_unit?: string;
  price_eur?: number;
  price_per_serving?: number;
  form?: string;
  is_vegan?: boolean | string;
  is_organic?: boolean | string;
  is_verified?: boolean | string;
  is_recommended?: boolean | string;
  quality_tags?: string;
  supplement_name?: string;
  supplement_id?: string;
  
  // Big8 Scores
  bioavailability?: number;
  potency?: number;
  reviews?: number;
  origin?: number | string;
  lab_tests?: number;
  purity?: number;
  value?: number;
  impact_score_big8?: number;
  
  // Amazon
  amazon_asin?: string;
  amazon_url?: string;
  amazon_image?: string;
  amazon_name?: string;
}

// Convert NaN, "NaN", undefined to null
function sanitizeValue<T>(val: T): T | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number' && isNaN(val)) return null;
  if (typeof val === 'string' && val.toLowerCase() === 'nan') return null;
  return val;
}

// Parse boolean from various formats
function parseBoolean(val: unknown): boolean | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'ja') return true;
    if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'nein') return false;
  }
  if (typeof val === 'number') return val !== 0;
  return null;
}

// Parse number, handling NaN and string numbers
function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    if (val.toLowerCase() === 'nan' || val === '') return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { products, batch_name } = await req.json() as { 
      products: EnrichedProduct[]; 
      batch_name?: string;
    };

    if (!products || !Array.isArray(products)) {
      return new Response(
        JSON.stringify({ error: 'products array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[import-enriched] Processing batch: ${batch_name || 'unnamed'}, ${products.length} products`);

    // Get all brands for lookup
    const { data: brands } = await supabase
      .from('supplement_brands')
      .select('id, slug');
    
    const brandMap = new Map(brands?.map(b => [b.slug, b.id]) || []);

    // Get all supplements for name matching (fallback if no supplement_id)
    const { data: supplements } = await supabase
      .from('supplement_database')
      .select('id, name');
    
    const supplementMap = new Map(supplements?.map(s => [s.name.toLowerCase(), s.id]) || []);

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const product of products) {
      try {
        // Get brand_id
        const brandId = brandMap.get(product.brand_slug);
        if (!brandId) {
          errors.push(`Brand not found: ${product.brand_slug}`);
          skipped++;
          continue;
        }

        // Get supplement_id - prefer from JSON, fallback to name matching
        let supplementId = sanitizeValue(product.supplement_id);
        if (!supplementId && product.supplement_name) {
          supplementId = supplementMap.get(product.supplement_name.toLowerCase()) || null;
        }

        // Check if product exists
        const { data: existing } = await supabase
          .from('supplement_products')
          .select('id')
          .eq('brand_id', brandId)
          .eq('product_name', product.product_name)
          .maybeSingle();

        const productData = {
          brand_id: brandId,
          product_name: product.product_name,
          supplement_id: supplementId,
          
          // Basic info
          pack_size: parseNumber(product.pack_size),
          pack_unit: sanitizeValue(product.pack_unit),
          servings_per_pack: parseNumber(product.servings_per_pack),
          dose_per_serving: parseNumber(product.dose_per_serving),
          dose_unit: sanitizeValue(product.dose_unit),
          price_eur: parseNumber(product.price_eur),
          price_per_serving: parseNumber(product.price_per_serving),
          form: sanitizeValue(product.form),
          
          // Boolean flags
          is_vegan: parseBoolean(product.is_vegan),
          is_organic: parseBoolean(product.is_organic),
          is_verified: parseBoolean(product.is_verified),
          is_recommended: parseBoolean(product.is_recommended),
          
          // Quality
          quality_tags: sanitizeValue(product.quality_tags),
          
          // Big8 Scores
          bioavailability: parseNumber(product.bioavailability),
          potency: parseNumber(product.potency),
          reviews: parseNumber(product.reviews),
          origin: parseNumber(product.origin),
          lab_tests: parseNumber(product.lab_tests),
          purity: parseNumber(product.purity),
          value: parseNumber(product.value),
          impact_score_big8: parseNumber(product.impact_score_big8),
          
          // Amazon data
          amazon_asin: sanitizeValue(product.amazon_asin),
          amazon_url: sanitizeValue(product.amazon_url),
          amazon_image: sanitizeValue(product.amazon_image),
          amazon_name: sanitizeValue(product.amazon_name),
        };

        if (existing) {
          // Update existing product
          const { error } = await supabase
            .from('supplement_products')
            .update(productData)
            .eq('id', existing.id);

          if (error) {
            errors.push(`Update failed ${product.product_name}: ${error.message}`);
            skipped++;
          } else {
            updated++;
          }
        } else {
          // Insert new product
          const { error } = await supabase
            .from('supplement_products')
            .insert(productData);

          if (error) {
            errors.push(`Insert failed ${product.product_name}: ${error.message}`);
            skipped++;
          } else {
            imported++;
          }
        }
      } catch (err) {
        errors.push(`Error processing ${product.product_name}: ${err.message}`);
        skipped++;
      }
    }

    // Get current DB totals
    const { count: productCount } = await supabase
      .from('supplement_products')
      .select('*', { count: 'exact', head: true });

    const { count: withBig8 } = await supabase
      .from('supplement_products')
      .select('*', { count: 'exact', head: true })
      .not('bioavailability', 'is', null);

    const { count: withAmazon } = await supabase
      .from('supplement_products')
      .select('*', { count: 'exact', head: true })
      .not('amazon_asin', 'is', null);

    const { count: withSupplement } = await supabase
      .from('supplement_products')
      .select('*', { count: 'exact', head: true })
      .not('supplement_id', 'is', null);

    console.log(`[import-enriched] Done: ${imported} imported, ${updated} updated, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        batch_name,
        results: {
          imported,
          updated,
          skipped,
          errors: errors.slice(0, 10), // Limit error output
        },
        database_totals: {
          products: productCount || 0,
          with_big8_scores: withBig8 || 0,
          with_amazon_data: withAmazon || 0,
          with_supplement_link: withSupplement || 0,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[import-enriched] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
