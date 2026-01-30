// Edge Function: import-products-csv
// Imports enriched product data from CSV and handles upserts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProductRow {
  id?: string;
  product_name: string;
  brand_slug: string;
  product_sku?: string;
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
  allergens?: string[];
  product_url?: string;
  amazon_asin?: string;
  is_verified?: boolean | string;
  is_recommended?: boolean | string;
  popularity_score?: number;
  quality_tags?: string[];
  ingredients?: any;
  supplement_name?: string;
  // New enriched fields
  short_description?: string;
  bioavailability?: number;
  potency?: number;
  reviews?: number;
  origin?: string;
  lab_tests?: number;
  purity?: number;
  value?: number;
  impact_score_big8?: number;
  category?: string;
  serving_size?: string;
  servings_per_container?: number;
  dosage_per_serving?: string;
  quality_purity?: number;
  quality_bioavailability?: number;
  quality_dosage?: number;
  quality_synergy?: number;
  quality_research?: number;
  quality_form?: number;
  quality_value?: number;
  quality_transparency?: number;
  timing?: string;
  is_gluten_free?: boolean | string;
  country_of_origin?: string;
  amazon_url?: string;
  amazon_image?: string;
  amazon_name?: string;
  match_score?: number;
}

function parseBoolean(val: any): boolean | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "boolean") return val;
  const str = String(val).toLowerCase().trim();
  if (["true", "ja", "yes", "1"].includes(str)) return true;
  if (["false", "nein", "no", "0"].includes(str)) return false;
  return null;
}

function parseNumber(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  const num = parseFloat(String(val).replace(",", "."));
  return isNaN(num) ? null : num;
}

function parseArray(val: any): string[] | null {
  if (!val) return null;
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return val.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
  }
  return null;
}

function cleanString(val: any): string | null {
  if (val === null || val === undefined || val === "") return null;
  return String(val).trim() || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { products, batch_name = "manual", delete_ids, update_amazon_data } = body;

    // Handle Amazon data update from CSV
    if (update_amazon_data && Array.isArray(update_amazon_data) && update_amazon_data.length > 0) {
      console.log(`Updating Amazon data for ${update_amazon_data.length} products`);
      
      // Pre-fetch all brands for lookup
      const { data: brands } = await supabase
        .from("supplement_brands")
        .select("id, slug");
      
      const brandMap = new Map(brands?.map(b => [b.slug, b.id]) || []);
      
      let updated = 0;
      let notFound = 0;
      const notFoundItems: string[] = [];
      
      for (const item of update_amazon_data) {
        const brandId = brandMap.get(item.brand_slug);
        
        if (!brandId) {
          notFound++;
          notFoundItems.push(`Brand not found: ${item.brand_slug}`);
          continue;
        }
        
        // Find product by name + brand
        const { data: product } = await supabase
          .from("supplement_products")
          .select("id")
          .eq("product_name", item.product_name)
          .eq("brand_id", brandId)
          .maybeSingle();
        
        if (product) {
          const updateData: Record<string, any> = {
            updated_at: new Date().toISOString(),
          };
          
          if (item.amazon_asin !== undefined) updateData.amazon_asin = cleanString(item.amazon_asin);
          if (item.amazon_url !== undefined) updateData.amazon_url = cleanString(item.amazon_url);
          if (item.amazon_name !== undefined) updateData.amazon_name = cleanString(item.amazon_name);
          if (item.amazon_image_url !== undefined) updateData.amazon_image = cleanString(item.amazon_image_url);
          
          const { error } = await supabase
            .from("supplement_products")
            .update(updateData)
            .eq("id", product.id);
          
          if (error) {
            notFound++;
            notFoundItems.push(`Update failed: ${item.product_name} - ${error.message}`);
          } else {
            updated++;
          }
        } else {
          notFound++;
          notFoundItems.push(`Product not found: ${item.product_name} (${item.brand_slug})`);
        }
      }
      
      // Get final ASIN stats
      const { data: asinStats } = await supabase
        .from("supplement_products")
        .select("amazon_asin")
        .not("amazon_asin", "is", null)
        .neq("amazon_asin", "");
      
      const uniqueAsins = new Set(asinStats?.map(p => p.amazon_asin) || []);
      
      const { count: totalProducts } = await supabase
        .from("supplement_products")
        .select("*", { count: "exact", head: true });
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Updated Amazon data for ${updated} products, ${notFound} not found/failed`,
          updated,
          not_found: notFound,
          not_found_items: notFoundItems.slice(0, 50),
          database_totals: {
            products: totalProducts || 0,
            products_with_asin: asinStats?.length || 0,
            unique_asins: uniqueAsins.size
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle delete operation
    if (delete_ids && Array.isArray(delete_ids) && delete_ids.length > 0) {
      console.log(`Deleting ${delete_ids.length} products by ID`);
      
      let deleted = 0;
      let notFound = 0;
      
      for (const id of delete_ids) {
        const { error, count } = await supabase
          .from("supplement_products")
          .delete()
          .eq("id", id);
        
        if (error || !count || count === 0) {
          notFound++;
        } else {
          deleted++;
        }
      }
      
      const { count: finalCount } = await supabase
        .from("supplement_products")
        .select("*", { count: "exact", head: true });
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Deleted ${deleted} products, ${notFound} not found`,
          deleted,
          not_found: notFound,
          database_totals: { products: finalCount || 0 }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no products, return current status
    if (!products || !Array.isArray(products) || products.length === 0) {
      const { count: productsCount } = await supabase
        .from("supplement_products")
        .select("*", { count: "exact", head: true });
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "No products to import - returning current status",
          database_totals: { products: productsCount || 0 }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${batch_name}] Processing ${products.length} products`);

    // Pre-fetch all brands for lookup
    const { data: brands } = await supabase
      .from("supplement_brands")
      .select("id, slug");
    
    const brandMap = new Map(brands?.map(b => [b.slug, b.id]) || []);

    // Pre-fetch all supplements for lookup
    const { data: supplements } = await supabase
      .from("supplement_database")
      .select("id, name");
    
    const supplementMap = new Map(supplements?.map(s => [s.name.toLowerCase(), s.id]) || []);

    let updated = 0;
    let inserted = 0;
    const errors: string[] = [];

    for (const row of products as ProductRow[]) {
      try {
        const brandId = brandMap.get(row.brand_slug);
        if (!brandId) {
          errors.push(`Brand not found: ${row.brand_slug} for ${row.product_name}`);
          continue;
        }

        // Find supplement_id by supplement_name
        let supplementId = null;
        if (row.supplement_name) {
          supplementId = supplementMap.get(row.supplement_name.toLowerCase()) || null;
        }

        const productData = {
          product_name: cleanString(row.product_name),
          brand_id: brandId,
          supplement_id: supplementId,
          product_sku: cleanString(row.product_sku),
          pack_size: parseNumber(row.pack_size),
          pack_unit: cleanString(row.pack_unit),
          servings_per_pack: parseNumber(row.servings_per_pack),
          dose_per_serving: parseNumber(row.dose_per_serving),
          dose_unit: cleanString(row.dose_unit),
          price_eur: parseNumber(row.price_eur),
          price_per_serving: parseNumber(row.price_per_serving),
          form: cleanString(row.form),
          is_vegan: parseBoolean(row.is_vegan),
          is_organic: parseBoolean(row.is_organic),
          allergens: parseArray(row.allergens),
          product_url: cleanString(row.product_url),
          amazon_asin: cleanString(row.amazon_asin),
          is_verified: parseBoolean(row.is_verified),
          is_recommended: parseBoolean(row.is_recommended),
          popularity_score: parseNumber(row.popularity_score),
          quality_tags: parseArray(row.quality_tags),
          // New enriched fields
          short_description: cleanString(row.short_description),
          bioavailability: parseNumber(row.bioavailability),
          potency: parseNumber(row.potency),
          reviews: parseNumber(row.reviews),
          origin: cleanString(row.origin),
          lab_tests: parseNumber(row.lab_tests),
          purity: parseNumber(row.purity),
          value: parseNumber(row.value),
          impact_score_big8: parseNumber(row.impact_score_big8),
          category: cleanString(row.category),
          serving_size: cleanString(row.serving_size),
          servings_per_container: parseNumber(row.servings_per_container),
          dosage_per_serving: cleanString(row.dosage_per_serving),
          quality_purity: parseNumber(row.quality_purity),
          quality_bioavailability: parseNumber(row.quality_bioavailability),
          quality_dosage: parseNumber(row.quality_dosage),
          quality_synergy: parseNumber(row.quality_synergy),
          quality_research: parseNumber(row.quality_research),
          quality_form: parseNumber(row.quality_form),
          quality_value: parseNumber(row.quality_value),
          quality_transparency: parseNumber(row.quality_transparency),
          timing: cleanString(row.timing),
          is_gluten_free: parseBoolean(row.is_gluten_free),
          country_of_origin: cleanString(row.country_of_origin),
          amazon_url: cleanString(row.amazon_url),
          amazon_image: cleanString(row.amazon_image),
          amazon_name: cleanString(row.amazon_name),
          match_score: parseNumber(row.match_score),
          updated_at: new Date().toISOString(),
        };

        // Try UPDATE if ID exists
        if (row.id) {
          const { error: updateError } = await supabase
            .from("supplement_products")
            .update(productData)
            .eq("id", row.id);

          if (!updateError) {
            updated++;
            continue;
          }
        }

        // Check if product exists by name + brand
        const { data: existing } = await supabase
          .from("supplement_products")
          .select("id")
          .eq("product_name", row.product_name)
          .eq("brand_id", brandId)
          .maybeSingle();

        if (existing) {
          // Update existing
          const { error: updateError } = await supabase
            .from("supplement_products")
            .update(productData)
            .eq("id", existing.id);

          if (updateError) {
            errors.push(`Update failed for ${row.product_name}: ${updateError.message}`);
          } else {
            updated++;
          }
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from("supplement_products")
            .insert({
              ...productData,
              created_at: new Date().toISOString(),
            });

          if (insertError) {
            errors.push(`Insert failed for ${row.product_name}: ${insertError.message}`);
          } else {
            inserted++;
          }
        }
      } catch (err) {
        errors.push(`Error processing ${row.product_name}: ${err.message}`);
      }
    }

    // Get final counts
    const { count: finalCount } = await supabase
      .from("supplement_products")
      .select("*", { count: "exact", head: true });

    console.log(`[${batch_name}] Complete: ${updated} updated, ${inserted} inserted, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        results: {
          batch_name,
          products_updated: updated,
          products_inserted: inserted,
          products_errors: errors.slice(0, 20), // Limit error output
          total_errors: errors.length,
        },
        database_totals: {
          products: finalCount || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
