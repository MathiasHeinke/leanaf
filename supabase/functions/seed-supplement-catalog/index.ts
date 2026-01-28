import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupplementCatalogEntry {
  name: string;
  category: string;
  default_dosage: string;
  default_unit: string;
  timing_constraint: string;
  interaction_tags: string[];
  brand_recommendation: string;
  description: string;
  protocol_phase: number;
  impact_score: number;
  necessity_tier: string;
  priority_score: number;
  evidence_level: string;
  hallmarks_addressed: string[];
  cost_per_day_eur?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { catalog } = await req.json() as { catalog: SupplementCatalogEntry[] };

    if (!catalog || !Array.isArray(catalog)) {
      throw new Error("Invalid catalog data - expected array of supplements");
    }

    console.log(`Processing ${catalog.length} supplements...`);

    let added = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const supplement of catalog) {
      try {
        // Check if supplement exists
        const { data: existing } = await supabase
          .from("supplement_database")
          .select("id")
          .eq("name", supplement.name)
          .maybeSingle();

        const supplementData = {
          name: supplement.name,
          category: supplement.category,
          default_dosage: supplement.default_dosage,
          default_unit: supplement.default_unit,
          timing_constraint: supplement.timing_constraint,
          interaction_tags: supplement.interaction_tags,
          brand_recommendation: supplement.brand_recommendation,
          description: supplement.description,
          protocol_phase: supplement.protocol_phase,
          impact_score: supplement.impact_score,
          necessity_tier: supplement.necessity_tier,
          priority_score: supplement.priority_score,
          evidence_level: supplement.evidence_level,
          hallmarks_addressed: supplement.hallmarks_addressed,
          cost_per_day_eur: supplement.cost_per_day_eur,
        };

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from("supplement_database")
            .update(supplementData)
            .eq("id", existing.id);

          if (error) throw error;
          updated++;
        } else {
          // Insert new
          const { error } = await supabase
            .from("supplement_database")
            .insert(supplementData);

          if (error) throw error;
          added++;
        }
      } catch (err) {
        errors.push(`${supplement.name}: ${err.message}`);
      }
    }

    console.log(`Completed: ${added} added, ${updated} updated, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        added,
        updated,
        errors,
        total: catalog.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
