import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichedProduct {
  // === IDENTIFIKATION (3 Felder) ===
  product_name: string;
  brand_slug: string;
  supplement_name?: string;
  supplement_id?: string;
  
  // === MARKE (9 Felder) ===
  brand_name?: string;
  brand_country?: string;
  brand_website?: string;
  brand_price_tier?: string;
  brand_specialization?: string | string[];
  brand_certifications?: string | string[];
  brand_quality_certifications?: string | string[];
  
  // === PREISE (5 Felder) ===
  price?: number;
  price_eur?: number;
  price_per_serving?: number;
  cost_per_day_eur?: number;
  currency?: string;
  
  // === DOSIERUNG (10 Felder) ===
  pack_size?: number;
  pack_unit?: string;
  servings_per_pack?: number;
  servings_per_container?: number;
  dose_per_serving?: number;
  dosage_per_serving?: string;
  dose_unit?: string;
  default_dosage?: string;
  default_unit?: string;
  serving_size?: string;
  
  // === QUALITY BIG8 (8 Felder) ===
  quality_bioavailability?: number;
  quality_dosage?: number;
  quality_form?: number;
  quality_purity?: number;
  quality_research?: number;
  quality_synergy?: number;
  quality_transparency?: number;
  quality_value?: number;
  
  // === QUALITY DETAIL (8 Felder) ===
  bioavailability?: number;
  potency?: number;
  reviews?: number;
  origin?: number | string;
  lab_tests?: number;
  purity?: number;
  value?: number;
  form_quality?: number | string;
  
  // === SCORES (5 Felder) ===
  impact_score?: number;
  impact_score_big8?: number;
  priority_score?: number;
  match_score?: number;
  popularity_score?: number;
  
  // === KLASSIFIKATION (7 Felder) ===
  supplement_category?: string;
  category?: string;
  necessity_tier?: string;
  evidence_level?: string;
  protocol_phase?: number;
  hallmarks_addressed?: string | string[];
  form?: string;
  
  // === TIMING (4 Felder) ===
  timing?: string;
  timing_constraint?: string;
  cycling_protocol?: string;
  cycling_required?: boolean | string;
  
  // === INTERAKTIONEN (3 Felder) ===
  ingredients?: unknown;
  synergies?: string | string[];
  blockers?: string | string[];
  
  // === FLAGS (6 Felder) ===
  is_vegan?: boolean | string;
  is_organic?: boolean | string;
  is_recommended?: boolean | string;
  is_verified?: boolean | string;
  is_gluten_free?: boolean | string;
  quality_tags?: string | string[];
  
  // === URLS (6 Felder) ===
  shop_url?: string;
  product_url?: string;
  amazon_asin?: string;
  amazon_url?: string;
  amazon_image?: string;
  amazon_name?: string;
  
  // === META (3 Felder) ===
  is_deprecated?: boolean | string;
  short_description?: string;
  country_of_origin?: string;
  
  // === ZUSÄTZLICH ===
  product_sku?: string;
  allergens?: string | string[];
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
    if (lower === 'nan' || lower === '') return null;
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

// Parse JSON field (ingredients)
function parseJson(val: unknown): unknown | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    if (val.toLowerCase() === 'nan' || val === '') return null;
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return null;
}

// Parse string array (allergens, quality_tags, synergies, blockers, hallmarks_addressed)
function parseStringArray(val: unknown): string[] | null {
  if (val === null || val === undefined) return null;
  if (Array.isArray(val)) return val.map(String).filter(s => s && s.toLowerCase() !== 'nan');
  if (typeof val === 'string') {
    if (val.toLowerCase() === 'nan' || val === '') return null;
    // Handle "item1; item2; item3" or "item1, item2" format
    const items = val.split(/[;,]/).map(s => s.trim()).filter(Boolean);
    return items.length > 0 ? items : null;
  }
  return null;
}

// Check if product has relevant supplement_database data
function hasSupplementData(product: EnrichedProduct): boolean {
  return !!(
    product.synergies ||
    product.blockers ||
    product.cycling_protocol ||
    product.cycling_required !== undefined ||
    product.impact_score ||
    product.priority_score ||
    product.protocol_phase ||
    product.evidence_level ||
    product.necessity_tier ||
    product.hallmarks_addressed ||
    product.cost_per_day_eur ||
    product.default_dosage ||
    product.default_unit ||
    product.timing_constraint ||
    product.form_quality
  );
}

// Check if product has relevant brand data
function hasBrandData(product: EnrichedProduct): boolean {
  return !!(
    product.brand_country ||
    product.brand_website ||
    product.brand_price_tier ||
    product.brand_specialization ||
    product.brand_certifications ||
    product.brand_quality_certifications
  );
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
    let supplementsUpdated = 0;
    let brandsUpdated = 0;
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

        // Build product data for all 54 supplement_products columns
        const productData = {
          brand_id: brandId,
          product_name: product.product_name,
          supplement_id: supplementId,
          
          // === DOSIERUNG ===
          pack_size: parseNumber(product.pack_size),
          pack_unit: sanitizeValue(product.pack_unit),
          servings_per_pack: parseNumber(product.servings_per_pack),
          servings_per_container: parseNumber(product.servings_per_container),
          dose_per_serving: parseNumber(product.dose_per_serving),
          dosage_per_serving: sanitizeValue(product.dosage_per_serving),
          dose_unit: sanitizeValue(product.dose_unit),
          serving_size: sanitizeValue(product.serving_size),
          
          // === PREISE ===
          price_eur: parseNumber(product.price_eur) || parseNumber(product.price),
          price_per_serving: parseNumber(product.price_per_serving),
          
          // === FORM & KLASSIFIKATION ===
          form: sanitizeValue(product.form),
          category: sanitizeValue(product.category) || sanitizeValue(product.supplement_category),
          country_of_origin: sanitizeValue(product.country_of_origin),
          
          // === FLAGS ===
          is_vegan: parseBoolean(product.is_vegan),
          is_organic: parseBoolean(product.is_organic),
          is_verified: parseBoolean(product.is_verified),
          is_recommended: parseBoolean(product.is_recommended),
          is_gluten_free: parseBoolean(product.is_gluten_free),
          is_deprecated: parseBoolean(product.is_deprecated),
          
          // === QUALITY TAGS ===
          quality_tags: parseStringArray(product.quality_tags),
          
          // === QUALITY BIG8 ===
          quality_bioavailability: parseNumber(product.quality_bioavailability),
          quality_dosage: parseNumber(product.quality_dosage),
          quality_form: parseNumber(product.quality_form),
          quality_purity: parseNumber(product.quality_purity),
          quality_research: parseNumber(product.quality_research),
          quality_synergy: parseNumber(product.quality_synergy),
          quality_transparency: parseNumber(product.quality_transparency),
          quality_value: parseNumber(product.quality_value),
          
          // === QUALITY DETAIL ===
          bioavailability: parseNumber(product.bioavailability),
          potency: parseNumber(product.potency),
          reviews: parseNumber(product.reviews),
          origin: sanitizeValue(product.origin), // TEXT field, not numeric
          lab_tests: parseNumber(product.lab_tests),
          purity: parseNumber(product.purity),
          value: parseNumber(product.value),
          
          // === SCORES ===
          impact_score_big8: parseNumber(product.impact_score_big8),
          match_score: parseNumber(product.match_score),
          popularity_score: parseNumber(product.popularity_score),
          
          // === TIMING ===
          timing: sanitizeValue(product.timing),
          
          // === URLs ===
          product_url: sanitizeValue(product.product_url) || sanitizeValue(product.shop_url),
          amazon_asin: sanitizeValue(product.amazon_asin),
          amazon_url: sanitizeValue(product.amazon_url),
          amazon_image: sanitizeValue(product.amazon_image),
          amazon_name: sanitizeValue(product.amazon_name),
          
          // === META ===
          short_description: sanitizeValue(product.short_description),
          product_sku: sanitizeValue(product.product_sku),
          
          // === INTERAKTIONEN ===
          ingredients: parseJson(product.ingredients),
          allergens: parseStringArray(product.allergens),
        };

        let productSuccess = false;

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
            productSuccess = true;
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
            productSuccess = true;
          }
        }

        // === UPDATE supplement_database (15 Felder) ===
        if (productSuccess && supplementId && hasSupplementData(product)) {
          const supplementUpdateData: Record<string, unknown> = {};
          
          // Only add fields that have values
          const synergies = parseStringArray(product.synergies);
          if (synergies) supplementUpdateData.synergies = synergies;
          
          const blockers = parseStringArray(product.blockers);
          if (blockers) supplementUpdateData.blockers = blockers;
          
          const cyclingProtocol = sanitizeValue(product.cycling_protocol);
          if (cyclingProtocol) supplementUpdateData.cycling_protocol = cyclingProtocol;
          
          const cyclingRequired = parseBoolean(product.cycling_required);
          if (cyclingRequired !== null) supplementUpdateData.cycling_required = cyclingRequired;
          
          const impactScore = parseNumber(product.impact_score);
          if (impactScore !== null) supplementUpdateData.impact_score = impactScore;
          
          const priorityScore = parseNumber(product.priority_score);
          if (priorityScore !== null) supplementUpdateData.priority_score = priorityScore;
          
          const protocolPhase = parseNumber(product.protocol_phase);
          if (protocolPhase !== null) supplementUpdateData.protocol_phase = protocolPhase;
          
          const evidenceLevel = sanitizeValue(product.evidence_level);
          if (evidenceLevel) supplementUpdateData.evidence_level = evidenceLevel;
          
          const necessityTier = sanitizeValue(product.necessity_tier);
          if (necessityTier) supplementUpdateData.necessity_tier = necessityTier;
          
          const hallmarksAddressed = parseStringArray(product.hallmarks_addressed);
          if (hallmarksAddressed) supplementUpdateData.hallmarks_addressed = hallmarksAddressed;
          
          const costPerDayEur = parseNumber(product.cost_per_day_eur);
          if (costPerDayEur !== null) supplementUpdateData.cost_per_day_eur = costPerDayEur;
          
          const defaultDosage = sanitizeValue(product.default_dosage);
          if (defaultDosage) supplementUpdateData.default_dosage = defaultDosage;
          
          const defaultUnit = sanitizeValue(product.default_unit);
          if (defaultUnit) supplementUpdateData.default_unit = defaultUnit;
          
          const timingConstraint = sanitizeValue(product.timing_constraint);
          if (timingConstraint) supplementUpdateData.timing_constraint = timingConstraint;
          
          const formQuality = sanitizeValue(product.form_quality);
          if (formQuality) supplementUpdateData.form_quality = formQuality;

          if (Object.keys(supplementUpdateData).length > 0) {
            const { error: suppError } = await supabase
              .from('supplement_database')
              .update(supplementUpdateData)
              .eq('id', supplementId);

            if (!suppError) {
              supplementsUpdated++;
            } else {
              console.log(`[import-enriched] supplement_database update failed for ${supplementId}: ${suppError.message}`);
            }
          }
        }

        // === UPDATE supplement_brands (5 Felder) ===
        if (productSuccess && brandId && hasBrandData(product)) {
          const brandUpdateData: Record<string, unknown> = {};
          
          const country = sanitizeValue(product.brand_country);
          if (country) brandUpdateData.country = country;
          
          const website = sanitizeValue(product.brand_website);
          if (website) brandUpdateData.website = website;
          
          const priceTier = sanitizeValue(product.brand_price_tier);
          if (priceTier) brandUpdateData.price_tier = priceTier;
          
          const specialization = parseStringArray(product.brand_specialization);
          if (specialization) brandUpdateData.specialization = specialization;
          
          const certifications = parseStringArray(product.brand_certifications) 
            || parseStringArray(product.brand_quality_certifications);
          if (certifications) brandUpdateData.quality_certifications = certifications;

          if (Object.keys(brandUpdateData).length > 0) {
            const { error: brandError } = await supabase
              .from('supplement_brands')
              .update(brandUpdateData)
              .eq('id', brandId);

            if (!brandError) {
              brandsUpdated++;
            } else {
              console.log(`[import-enriched] supplement_brands update failed for ${brandId}: ${brandError.message}`);
            }
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
      .not('quality_bioavailability', 'is', null);

    const { count: withAmazon } = await supabase
      .from('supplement_products')
      .select('*', { count: 'exact', head: true })
      .not('amazon_asin', 'is', null);

    const { count: withSupplement } = await supabase
      .from('supplement_products')
      .select('*', { count: 'exact', head: true })
      .not('supplement_id', 'is', null);

    console.log(`[import-enriched] Done: ${imported} imported, ${updated} updated, ${skipped} skipped, ${supplementsUpdated} supplements updated, ${brandsUpdated} brands updated`);

    return new Response(
      JSON.stringify({
        success: true,
        batch_name,
        results: {
          products_imported: imported,
          products_updated: updated,
          supplements_updated: supplementsUpdated,
          brands_updated: brandsUpdated,
          skipped,
          errors: errors.slice(0, 10),
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
