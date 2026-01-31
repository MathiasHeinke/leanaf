import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================
// MANUAL OVERRIDES for Product-Supplement Linking
// =====================================================
const MANUAL_OVERRIDES: Record<string, string[]> = {
  // Vitamins
  'vitamin d3': ['vitamin d', 'cholecalciferol', 'd3', 'd3 + k2', 'vitamin d balance'],
  'vitamin k2': ['k2 mk-7', 'k2', 'k2 mk7', 'menaquinon'],
  'vitamin b12': ['b12', 'methylcobalamin', 'cyanocobalamin', 'cobalamin'],
  'vitamin b-komplex': ['b-komplex', 'b komplex', 'b-vitamine', 'vitamin b complex'],
  'vitamin c': ['ascorbinsäure', 'ascorbic acid', 'c liposomal'],
  'folat': ['folsäure', 'folic acid', '5-mthf', 'methylfolat'],
  'multivitamin': ['multi', 'a-z komplex', 'a-z', 'multivitamine'],
  
  // Minerals
  'magnesium': ['mg', 'magnesiumcitrat', 'magnesium glycinat', 'magnesium bisglycinat', 'mg-glycinat', 'mg-citrat', 'magnesium komplex', 'magnesium-l-threonat', 'magtein'],
  'zink': ['zinc', 'zink bisglycinat', 'zinc complex', 'zink-bisglycinat', 'zinkglycinat', 'zinkpicolinat'],
  'eisen': ['iron', 'eisenbisglycinat', 'ferrochel'],
  'calcium': ['kalzium', 'calciumcitrat'],
  'selen': ['selenium', 'selenomethionin'],
  'jod': ['iodine', 'jodid', 'kelp'],
  'kupfer': ['copper'],
  'chrom': ['chromium', 'chrompicolinat'],
  'bor': ['boron'],
  'kalium': ['potassium'],
  'elektrolyte': ['electrolytes', 'lmnt', 'natrium'],
  
  // Amino Acids
  'kreatin': ['creatine', 'creatin', 'creatine monohydrat', 'creatin monohydrat'],
  'l-carnitin': ['carnitin', 'acetyl-l-carnitin', 'alcar'],
  'l-glutamin': ['glutamine', 'glutamin'],
  'l-arginin': ['arginine', 'arginin'],
  'l-citrullin': ['citrulline', 'citrullin', 'citrullin malat'],
  'taurin': ['taurine'],
  'glycin': ['glycine'],
  'l-theanin': ['theanine', 'theanin'],
  'l-tyrosin': ['tyrosine', 'tyrosin'],
  'beta-alanin': ['beta alanin'],
  'eaa': ['essential amino acids', 'eaa komplex'],
  'bcaa': ['branched chain amino acids'],
  'nac': ['n-acetyl-cystein', 'n-acetylcystein'],
  'tmg': ['betain', 'trimethylglycin'],
  
  // Omega/Fats
  'omega-3': ['omega 3', 'epa', 'dha', 'fischöl', 'fish oil', 'omega-3 epa/dha'],
  
  // Adaptogens
  'ashwagandha': ['ksm-66', 'ksm66', 'withania somnifera'],
  'rhodiola': ['rhodiola rosea'],
  'curcumin': ['kurkuma', 'turmeric', 'curcumin longvida', 'curcumin liposomal'],
  'berberin': ['berberine'],
  'tongkat ali': ['tongkat', 'eurycoma longifolia'],
  'resveratrol': ['trans-resveratrol'],
  'quercetin': ['quercetin phytosom'],
  'fisetin': ['fisetin liposomal'],
  
  // Mushrooms
  "lion's mane": ['lions mane', 'hericium', 'hericium erinaceus'],
  'reishi': ['ganoderma', 'reishi extrakt'],
  'cordyceps': ['cordyceps sinensis', 'cordyceps militaris'],
  
  // Longevity
  'coq10': ['ubiquinol', 'ubiquinon', 'coenzym q10', 'coenzyme q10'],
  'alpha-liponsäure': ['ala', 'r-ala', 'alpha lipoic acid'],
  'pqq': ['pyrrolochinolinchinon'],
  'astaxanthin': ['asta', 'astaxanthin natural'],
  'glutathion': ['glutathione', 'l-glutathion'],
  'nmn': ['nicotinamid mononukleotid', 'nmn sublingual'],
  'spermidin': ['spermidine', 'spermidinreich'],
  'urolithin a': ['mitopure'],
  'tudca': ['tauroursodeoxycholic'],
  'alpha-ketoglutarat': ['akg', 'ca-akg', 'caakg'],
  
  // Gut Health
  'probiotika': ['probiotics', 'probiona', 'lactobacillus', 'bifidobacterium'],
  'flohsamenschalen': ['psyllium', 'flohsamen'],
  
  // Joints
  'glucosamin': ['glucosamine'],
  'chondroitin': ['chondroitinsulfat'],
  'msm': ['methylsulfonylmethan'],
  'kollagen': ['collagen', 'kollagen peptide', 'collagen peptides', 'kollagenpeptide'],
  'hyaluronsäure': ['hyaluronic acid', 'hyaluron'],
  
  // Nootropics
  'citicolin': ['cdp-cholin', 'cognizin'],
  'alpha-gpc': ['alpha gpc', 'alphagpc'],
  'phosphatidylserin': ['ps', 'phosphatidyl serin'],
  
  // Other
  'koffein': ['caffeine', 'coffein'],
  'melatonin': ['melatonin niedrig dosiert'],
  'mariendistel': ['silymarin', 'milk thistle'],
  'opc': ['pinienrinden extrakt', 'traubenkernextrakt', 'pycnogenol'],
  'schwarzkümmelöl': ['black seed oil', 'nigella sativa'],
  'apigenin': ['apigenin sleep'],
  'bacopa': ['bacopa monnieri', 'brahmi'],
  'gaba': ['gamma-aminobuttersäure'],
  'chlorella': ['chlorella vulgaris'],
  'spirulina': ['spirulina platensis'],
};

// =====================================================
// SYNERGIES MAP (from supplementInteractions.ts)
// =====================================================
const SYNERGIES_MAP: Record<string, string[]> = {
  'Vitamin D3': ['Vitamin K2', 'Magnesium'],
  'Vitamin K2': ['Vitamin D3', 'Magnesium'],
  'Magnesium': ['Vitamin D3', 'Vitamin K2', 'Zink'],
  'NMN': ['TMG', 'Resveratrol'],
  'TMG': ['NMN'],
  'Curcumin': ['Piperin'],
  'Kollagen': ['Vitamin C'],
  'Eisen': ['Vitamin C'],
  'Vitamin C': ['Kollagen', 'Eisen'],
  'PQQ': ['CoQ10', 'Ubiquinol'],
  'CoQ10': ['PQQ', 'Ubiquinol'],
  'Ubiquinol': ['PQQ', 'CoQ10'],
  'Zink': ['Kupfer', 'Magnesium'],
  'Kupfer': ['Zink'],
  "Lion's Mane": ['Alpha-GPC'],
  'Alpha-GPC': ["Lion's Mane"],
  'Omega-3': ['Vitamin E', 'Astaxanthin'],
  'Kreatin': ['Kohlenhydrate', 'Beta-Alanin'],
  'Beta-Alanin': ['Kreatin'],
  'L-Citrullin': ['L-Arginin'],
  'L-Arginin': ['L-Citrullin'],
  'NAC': ['Glycin'],
  'Glycin': ['NAC', 'Magnesium'],
  'Ashwagandha': ['Rhodiola'],
  'Rhodiola': ['Ashwagandha'],
  'Resveratrol': ['NMN', 'Quercetin'],
  'Quercetin': ['Resveratrol', 'Fisetin'],
  'Fisetin': ['Quercetin'],
  'Spermidin': ['Resveratrol'],
  'Probiotika': ['Präbiotika', 'L-Glutamin'],
  'L-Glutamin': ['Probiotika'],
};

// =====================================================
// BLOCKERS MAP (from supplementInteractions.ts)
// =====================================================
const BLOCKERS_MAP: Record<string, string[]> = {
  'Eisen': ['Kaffee', 'Tee', 'Milch', 'Kalzium', 'Phytate', 'Zink', 'Magnesium'],
  'Zink': ['Phytate', 'Kalzium', 'Eisen', 'Kupfer'],
  'Kalzium': ['Eisen', 'Zink', 'Magnesium'],
  '5-HTP': ['SSRIs', 'MAO-Hemmer', 'Tramadol'],
  'Tryptophan': ['SSRIs', 'MAO-Hemmer'],
  'Berberin': ['Metformin'],
  'Schilddrüsen-Medikamente': ['Kaffee', 'Kalzium', 'Eisen', 'Magnesium'],
  'Magnesium': ['Kalzium', 'Eisen'],
  'Antibiotika': ['Kalzium', 'Magnesium', 'Eisen', 'Milchprodukte'],
};

// =====================================================
// HELPER: Fuzzy match supplement name in DB
// =====================================================
function findSupplementInDb(
  searchName: string, 
  dbSupplements: Array<{id: string, name: string}>
): { id: string; name: string } | null {
  const searchLower = searchName.toLowerCase().trim();
  
  // Exact match first
  const exact = dbSupplements.find(s => s.name.toLowerCase() === searchLower);
  if (exact) return exact;
  
  // Check manual overrides - if searchName matches any override pattern
  for (const [dbName, patterns] of Object.entries(MANUAL_OVERRIDES)) {
    if (dbName.toLowerCase() === searchLower || patterns.some(p => p.toLowerCase() === searchLower)) {
      const found = dbSupplements.find(s => s.name.toLowerCase() === dbName.toLowerCase());
      if (found) return found;
    }
  }
  
  // Partial match
  const partial = dbSupplements.find(s => 
    s.name.toLowerCase().includes(searchLower) || 
    searchLower.includes(s.name.toLowerCase())
  );
  if (partial) return partial;
  
  return null;
}

// =====================================================
// HELPER: Parse ingredients field (comma-separated or JSON)
// =====================================================
function parseIngredients(ingredients: string | null): string[] {
  if (!ingredients) return [];
  
  // Try JSON array first
  if (ingredients.startsWith('[')) {
    try {
      return JSON.parse(ingredients);
    } catch {
      // fallback to comma split
    }
  }
  
  // Split by comma
  return ingredients
    .split(',')
    .map(i => i.trim())
    .filter(i => i.length > 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const task = body.task || 'all';
    
    const results: Record<string, unknown> = {
      task,
      timestamp: new Date().toISOString(),
    };

    // =====================================================
    // TASK 1: Link products to supplements
    // =====================================================
    if (task === 'link_products' || task === 'all') {
      console.log('[Enrich] Starting product linking...');
      
      // Get all supplements
      const { data: dbSupplements, error: suppError } = await supabase
        .from('supplement_database')
        .select('id, name');
      
      if (suppError) throw new Error(`Failed to fetch supplements: ${suppError.message}`);
      
      // Get products without supplement_id
      const { data: unlinkedProducts, error: prodError } = await supabase
        .from('supplement_products')
        .select('id, product_name, ingredients, brand_id')
        .is('supplement_id', null);
      
      if (prodError) throw new Error(`Failed to fetch products: ${prodError.message}`);
      
      console.log(`[Enrich] Found ${unlinkedProducts?.length || 0} unlinked products`);
      
      let linked = 0;
      let skipped = 0;
      const linkDetails: Array<{product: string, supplement: string}> = [];
      
      for (const product of unlinkedProducts || []) {
        // Try matching by product name first
        let matchedSupplement = findSupplementInDb(product.product_name, dbSupplements || []);
        
        // If no match, try ingredients
        if (!matchedSupplement && product.ingredients) {
          const ingredientList = parseIngredients(product.ingredients);
          for (const ingredient of ingredientList) {
            matchedSupplement = findSupplementInDb(ingredient, dbSupplements || []);
            if (matchedSupplement) break;
          }
        }
        
        if (matchedSupplement) {
          const { error: updateError } = await supabase
            .from('supplement_products')
            .update({ supplement_id: matchedSupplement.id })
            .eq('id', product.id);
          
          if (!updateError) {
            linked++;
            linkDetails.push({
              product: product.product_name,
              supplement: matchedSupplement.name
            });
          }
        } else {
          skipped++;
        }
      }
      
      results.link_products = {
        total_unlinked: unlinkedProducts?.length || 0,
        linked,
        skipped,
        sample_links: linkDetails.slice(0, 10),
      };
      
      console.log(`[Enrich] Linked ${linked} products, skipped ${skipped}`);
    }

    // =====================================================
    // TASK 2: Sync synergies and blockers
    // =====================================================
    if (task === 'sync_interactions' || task === 'all') {
      console.log('[Enrich] Starting interaction sync...');
      
      // Get all supplements
      const { data: dbSupplements, error: suppError } = await supabase
        .from('supplement_database')
        .select('id, name, synergies, blockers');
      
      if (suppError) throw new Error(`Failed to fetch supplements: ${suppError.message}`);
      
      let synergiesUpdated = 0;
      let blockersUpdated = 0;
      const updateDetails: Array<{name: string, synergies: string[], blockers: string[]}> = [];
      
      for (const supplement of dbSupplements || []) {
        const nameVariants = [supplement.name];
        
        // Find synergies for this supplement
        let synergies: string[] = [];
        for (const [key, values] of Object.entries(SYNERGIES_MAP)) {
          if (key.toLowerCase() === supplement.name.toLowerCase() ||
              supplement.name.toLowerCase().includes(key.toLowerCase())) {
            synergies = [...new Set([...synergies, ...values])];
          }
        }
        
        // Find blockers for this supplement
        let blockers: string[] = [];
        for (const [key, values] of Object.entries(BLOCKERS_MAP)) {
          if (key.toLowerCase() === supplement.name.toLowerCase() ||
              supplement.name.toLowerCase().includes(key.toLowerCase())) {
            blockers = [...new Set([...blockers, ...values])];
          }
        }
        
        // Only update if we have data and it's different from existing
        const existingSynergies = Array.isArray(supplement.synergies) ? supplement.synergies : [];
        const existingBlockers = Array.isArray(supplement.blockers) ? supplement.blockers : [];
        
        const needsSynergyUpdate = synergies.length > 0 && 
          JSON.stringify(synergies.sort()) !== JSON.stringify(existingSynergies.sort());
        const needsBlockerUpdate = blockers.length > 0 && 
          JSON.stringify(blockers.sort()) !== JSON.stringify(existingBlockers.sort());
        
        if (needsSynergyUpdate || needsBlockerUpdate) {
          const updateData: Record<string, string[]> = {};
          if (needsSynergyUpdate) updateData.synergies = synergies;
          if (needsBlockerUpdate) updateData.blockers = blockers;
          
          const { error: updateError } = await supabase
            .from('supplement_database')
            .update(updateData)
            .eq('id', supplement.id);
          
          if (!updateError) {
            if (needsSynergyUpdate) synergiesUpdated++;
            if (needsBlockerUpdate) blockersUpdated++;
            updateDetails.push({
              name: supplement.name,
              synergies: needsSynergyUpdate ? synergies : [],
              blockers: needsBlockerUpdate ? blockers : [],
            });
          }
        }
      }
      
      results.sync_interactions = {
        synergies_updated: synergiesUpdated,
        blockers_updated: blockersUpdated,
        sample_updates: updateDetails.slice(0, 10),
      };
      
      console.log(`[Enrich] Updated ${synergiesUpdated} synergies, ${blockersUpdated} blockers`);
    }

    // =====================================================
    // TASK 3: Cleanup empty brands
    // =====================================================
    if (task === 'cleanup' || task === 'all') {
      console.log('[Enrich] Starting cleanup...');
      
      // Find brands with no products
      const { data: allBrands, error: brandError } = await supabase
        .from('supplement_brands')
        .select('id, name, slug');
      
      if (brandError) throw new Error(`Failed to fetch brands: ${brandError.message}`);
      
      const emptyBrands: Array<{id: string, name: string, slug: string}> = [];
      
      for (const brand of allBrands || []) {
        const { count, error: countError } = await supabase
          .from('supplement_products')
          .select('id', { count: 'exact', head: true })
          .eq('brand_id', brand.id);
        
        if (!countError && count === 0) {
          emptyBrands.push({
            id: brand.id,
            name: brand.name,
            slug: brand.brand_slug,
          });
        }
      }
      
      // Delete empty brands
      let deleted = 0;
      for (const brand of emptyBrands) {
        const { error: deleteError } = await supabase
          .from('supplement_brands')
          .delete()
          .eq('id', brand.id);
        
        if (!deleteError) deleted++;
      }
      
      results.cleanup = {
        empty_brands_found: emptyBrands.length,
        brands_deleted: deleted,
        deleted_brands: emptyBrands.map(b => b.name),
      };
      
      console.log(`[Enrich] Deleted ${deleted} empty brands`);
    }

    // =====================================================
    // Get final database stats
    // =====================================================
    const { count: totalProducts } = await supabase
      .from('supplement_products')
      .select('id', { count: 'exact', head: true });
    
    const { count: linkedProducts } = await supabase
      .from('supplement_products')
      .select('id', { count: 'exact', head: true })
      .not('supplement_id', 'is', null);
    
    const { count: totalSupplements } = await supabase
      .from('supplement_database')
      .select('id', { count: 'exact', head: true });
    
    const { count: supplementsWithSynergies } = await supabase
      .from('supplement_database')
      .select('id', { count: 'exact', head: true })
      .not('synergies', 'eq', '{}');
    
    const { count: supplementsWithBlockers } = await supabase
      .from('supplement_database')
      .select('id', { count: 'exact', head: true })
      .not('blockers', 'eq', '{}');
    
    const { count: totalBrands } = await supabase
      .from('supplement_brands')
      .select('id', { count: 'exact', head: true });

    results.database_stats = {
      total_products: totalProducts || 0,
      linked_products: linkedProducts || 0,
      link_rate: totalProducts ? Math.round((linkedProducts || 0) / totalProducts * 100) : 0,
      total_supplements: totalSupplements || 0,
      supplements_with_synergies: supplementsWithSynergies || 0,
      supplements_with_blockers: supplementsWithBlockers || 0,
      total_brands: totalBrands || 0,
    };

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('[Enrich] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
