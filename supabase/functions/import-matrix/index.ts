import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simplified ingredient matching with manual overrides
const MANUAL_OVERRIDES: Record<string, string[]> = {
  'vit_d3': ['vitamin d3', 'vitamin d', 'cholecalciferol'],
  'vit_k2': ['vitamin k2', 'k2 mk-7', 'k2'],
  'vit_b12': ['vitamin b12', 'b12', 'methylcobalamin'],
  'vit_b_complex': ['b-komplex', 'b komplex', 'vitamin b-komplex'],
  'vit_c': ['vitamin c', 'ascorbinsäure'],
  'vit_e': ['vitamin e', 'tocopherol'],
  'magnesium': ['magnesium', 'magnesiumcitrat', 'magnesium glycinat'],
  'zinc': ['zink'],
  'iron': ['eisen'],
  'calcium': ['calcium', 'kalzium'],
  'selenium': ['selen'],
  'iodine': ['jod'],
  'copper': ['kupfer'],
  'chromium': ['chrom'],
  'boron': ['bor'],
  'creatine': ['kreatin', 'creatine', 'creatin monohydrat', 'creatine monohydrat', 'creatin'],
  'carnitine': ['carnitin', 'l-carnitin', 'acetyl-l-carnitin'],
  'glutamine': ['glutamin', 'l-glutamin'],
  'arginine': ['arginin', 'l-arginin'],
  'citrulline': ['citrullin', 'l-citrullin', 'citrullin malat'],
  'taurine': ['taurin'],
  'glycine': ['glycin'],
  'theanine': ['theanin', 'l-theanin'],
  'tyrosine': ['tyrosin', 'l-tyrosin'],
  'beta_alanine': ['beta-alanin', 'beta alanin'],
  'hmb': ['hmb', 'hmb 3000'],
  'eaa': ['eaa', 'eaa komplex'],
  'bcaa': ['bcaa'],
  'nac': ['nac', 'n-acetyl-cystein', 'gly-nac', 'glynac'],
  'betaine': ['betain', 'tmg', 'trimethylglycin'],
  'omega3_epa': ['omega-3', 'omega 3', 'omega-3 (epa/dha)'],
  'ashwagandha': ['ashwagandha', 'ashwagandha ksm-66', 'ksm-66'],
  'rhodiola': ['rhodiola', 'rhodiola rosea'],
  'ginseng': ['ginseng', 'panax ginseng'],
  'maca': ['maca'],
  'curcumin': ['curcumin', 'kurkuma', 'curcumin longvida'],
  'egcg': ['grüntee extrakt', 'gruentee', 'green tea'],
  'resveratrol': ['resveratrol', 'liposomales nad+ & trans-resveratrol'],
  'quercetin': ['quercetin'],
  'berberine': ['berberin'],
  'tongkat_ali': ['tongkat ali', 'tongkat'],
  'fisetin': ['fisetin'],
  'lions_mane': ['lions mane', 'lion\'s mane', 'hericium'],
  'reishi': ['reishi'],
  'cordyceps': ['cordyceps'],
  'chaga': ['chaga'],
  'coq10': ['coq10', 'ubiquinol', 'coq10 ubiquinol', 'astaxanthin + coenzym q10'],
  'ala': ['alpha-liponsäure', 'alpha liponsäure', 'ala'],
  'pqq': ['pqq'],
  'astaxanthin': ['astaxanthin'],
  'glutathione': ['glutathion'],
  'nmn': ['nmn', 'nmn sublingual', 'nicotinamid mononukleotid', 'nmn (nicotinamid mononukleotid)'],
  'nr': ['nr', 'nicotinamid ribosid'],
  'spermidine': ['spermidin'],
  'probiotics': ['probiotika', 'probiona kulturen komplex'],
  'psyllium': ['flohsamenschalen', 'flohsamen', 'psyllium'],
  'glucosamine': ['glucosamin'],
  'chondroitin': ['chondroitin'],
  'msm': ['msm'],
  'collagen': ['kollagen', 'collagen', 'kollagen peptide'],
  'hyaluronic_acid': ['hyaluronsäure', 'hyaluron', 'hyaluron & kollagen'],
  'citicoline': ['citicolin', 'cdp-cholin'],
  'alpha_gpc': ['alpha-gpc', 'alpha gpc'],
  'ps': ['phosphatidylserin'],
  'mg_threonate': ['magnesium-l-threonat', 'magtein'],
  'whey': ['whey', 'whey protein'],
  'casein': ['casein', 'kasein'],
  'caffeine': ['koffein', 'caffeine'],
  'melatonin': ['melatonin'],
  'bergamot': ['citrus bergamot', 'bergamot', 'bergamotte'],
  'fadogia': ['fadogia agrestis'],
  'dim': ['dim'],
  'apigenin': ['apigenin'],
  'ca_akg': ['ca-akg', 'cakg', 'alpha-ketoglutarat'],
  'bacopa': ['bacopa monnieri', 'bacopa'],
  'opc': ['opc', 'pinienrinden extrakt'],
  'gaba': ['gaba'],
  'lecithin': ['lecithin'],
  'methyl_folate': ['methyl folate', 'folat', 'methylfolat'],
  'methylenblau': ['methylenblau'],
  'elektrolyte': ['elektrolyte (lmnt)', 'elektrolyte'],
  'chlorella': ['chlorella'],
  'spirulina': ['spirulina'],
};

function normalizeForMatch(name: string): string {
  return name.toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findMatch(ingredientId: string, ingredientName: string, dbSupplements: Array<{id: string, name: string}>): {dbId: string, dbName: string, matchType: string} | null {
  // Try manual override first
  const patterns = MANUAL_OVERRIDES[ingredientId];
  if (patterns) {
    for (const pattern of patterns) {
      const normalizedPattern = normalizeForMatch(pattern);
      for (const supp of dbSupplements) {
        const normalizedDb = normalizeForMatch(supp.name);
        if (normalizedDb === normalizedPattern || normalizedDb.includes(normalizedPattern) || normalizedPattern.includes(normalizedDb)) {
          return { dbId: supp.id, dbName: supp.name, matchType: 'manual' };
        }
      }
    }
  }
  
  // Try exact match on ingredient name
  const normalizedImport = normalizeForMatch(ingredientName);
  for (const supp of dbSupplements) {
    const normalizedDb = normalizeForMatch(supp.name);
    if (normalizedDb === normalizedImport) {
      return { dbId: supp.id, dbName: supp.name, matchType: 'exact' };
    }
  }
  
  // Try fuzzy match
  for (const supp of dbSupplements) {
    const normalizedDb = normalizeForMatch(supp.name);
    if (normalizedDb.includes(normalizedImport) || normalizedImport.includes(normalizedDb)) {
      return { dbId: supp.id, dbName: supp.name, matchType: 'fuzzy' };
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get matrix data from request body
    const { matrixIngredients } = await req.json();
    
    if (!matrixIngredients || !Array.isArray(matrixIngredients)) {
      return new Response(
        JSON.stringify({ error: "matrixIngredients array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all supplements from DB
    const { data: dbSupplements, error: fetchError } = await supabase
      .from('supplement_database')
      .select('id, name')
      .order('name');
    
    if (fetchError) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch supplements: ${fetchError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = {
      updated: [] as Array<{dbName: string, importName: string, matchType: string}>,
      skipped: [] as Array<{importName: string, reason: string}>,
      errors: [] as string[],
    };

    // Process each ingredient
    for (const ingredient of matrixIngredients) {
      const match = findMatch(ingredient.ingredient_id, ingredient.ingredient_name, dbSupplements || []);
      
      if (!match) {
        results.skipped.push({
          importName: ingredient.ingredient_name,
          reason: 'No database match found',
        });
        continue;
      }

      // Build the relevance_matrix object
      const matrix: Record<string, unknown> = {};
      if (ingredient.phase_modifiers) matrix.phase_modifiers = ingredient.phase_modifiers;
      if (ingredient.context_modifiers) matrix.context_modifiers = ingredient.context_modifiers;
      if (ingredient.goal_modifiers) matrix.goal_modifiers = ingredient.goal_modifiers;
      if (ingredient.calorie_modifiers) matrix.calorie_modifiers = ingredient.calorie_modifiers;
      if (ingredient.peptide_class_modifiers) matrix.peptide_class_modifiers = ingredient.peptide_class_modifiers;
      if (ingredient.demographic_modifiers) matrix.demographic_modifiers = ingredient.demographic_modifiers;
      if (ingredient.bloodwork_triggers) matrix.bloodwork_triggers = ingredient.bloodwork_triggers;
      if (ingredient.compound_synergies) matrix.compound_synergies = ingredient.compound_synergies;
      if (ingredient.warnings) matrix.explanation_templates = ingredient.warnings;

      // Update the database
      const { error: updateError } = await supabase
        .from('supplement_database')
        .update({ relevance_matrix: matrix })
        .eq('id', match.dbId);
      
      if (updateError) {
        results.errors.push(`Update failed for ${ingredient.ingredient_name}: ${updateError.message}`);
      } else {
        results.updated.push({
          dbName: match.dbName,
          importName: ingredient.ingredient_name,
          matchType: match.matchType,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: results.errors.length === 0,
        totalProcessed: matrixIngredients.length,
        totalUpdated: results.updated.length,
        totalSkipped: results.skipped.length,
        totalErrors: results.errors.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
