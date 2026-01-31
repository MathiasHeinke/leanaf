import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = 'https://gzczjscctgyxjyodhnhk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// ===== EXTENDED ENRICHED DATA INTERFACE (54+ FIELDS) =====
interface ExtendedEnrichedData {
  // === PRODUCT (20 fields) ===
  product_name: string;
  brand_name: string | null;
  form: string | null;
  category: string | null;
  pack_size: number | null;
  pack_unit: string | null;
  servings_per_pack: number | null;
  dose_per_serving: number | null;
  dose_unit: string | null;
  dosage_per_serving: string | null;
  serving_size: string | null;
  price_eur: number | null;
  price_per_serving: number | null;
  is_vegan: boolean;
  is_organic: boolean;
  is_gluten_free: boolean;
  allergens: string[];
  quality_tags: string[];
  timing: string | null;
  short_description: string | null;
  description: string | null;
  ingredients: string[];
  
  // === AMAZON (5 fields) ===
  amazon_asin: string | null;
  amazon_url: string | null;
  amazon_image: string | null;
  amazon_name: string | null;
  amazon_match_score: number | null;
  
  // === BIG8 QUALITY SCORES (8 fields) ===
  quality_bioavailability: number | null;
  quality_dosage: number | null;
  quality_form: number | null;
  quality_purity: number | null;
  quality_research: number | null;
  quality_synergy: number | null;
  quality_transparency: number | null;
  quality_value: number | null;
  
  // === LEGACY QUALITY (7 fields) ===
  bioavailability: number | null;
  potency: number | null;
  reviews: number | null;
  origin: string | null;
  lab_tests: string | null;
  purity: number | null;
  value: number | null;
  
  // === SCORES (3 fields) ===
  impact_score_big8: number | null;
  popularity_score: number | null;
  match_score: number | null;
  
  // === INGREDIENT DATA (from supplement_database) ===
  synergies: string[];
  blockers: string[];
  timing_constraint: string | null;
  cycling_protocol: string | null;
  evidence_level: string | null;
  necessity_tier: string | null;
  hallmarks_addressed: string[];
  clinical_dosage_min: number | null;
  clinical_dosage_max: number | null;
  clinical_dosage_unit: string | null;
  
  // === BRAND DATA (from supplement_brands) ===
  brand_id: string | null;
  brand_country: string | null;
  brand_price_tier: string | null;
  brand_certifications: string[];
  brand_is_new: boolean;
  
  // === META ===
  enrichment_version: string;
  enriched_at: string;
  enrichment_source: 'ai' | 'rules' | 'hybrid';
}

// ===== HELPER FUNCTIONS =====
function parseNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(n) ? null : n;
}

function clampScore(val: number | null): number | null {
  if (val === null) return null;
  return Math.min(10, Math.max(1, Math.round(val * 10) / 10));
}

// ===== FORM QUALITY MAPPING =====
const FORM_QUALITY_MAP: Record<string, number> = {
  'liposomal': 10.0,
  'liposom': 10.0,
  'nanoemulsion': 9.5,
  'micellized': 9.5,
  'micell': 9.5,
  'chelated': 9.0,
  'chelat': 9.0,
  'glycinate': 9.0,
  'glycinat': 9.0,
  'bisglycinate': 9.0,
  'bisglycinat': 9.0,
  'malate': 8.5,
  'malat': 8.5,
  'citrate': 8.5,
  'citrat': 8.5,
  'liquid': 8.5,
  'flüssig': 8.5,
  'tropfen': 8.5,
  'softgel': 8.0,
  'capsule': 8.0,
  'kapsel': 8.0,
  'vcaps': 8.0,
  'pulver': 7.5,
  'powder': 7.5,
  'tablet': 7.0,
  'tablette': 7.0,
  'gummy': 6.5,
  'gummies': 6.5,
  'oxide': 5.0,
  'oxid': 5.0,
};

function deriveFormScore(form: string | null, ingredients: string[]): number {
  const searchText = [form, ...ingredients].join(' ').toLowerCase();
  
  for (const [key, score] of Object.entries(FORM_QUALITY_MAP)) {
    if (searchText.includes(key)) {
      return score;
    }
  }
  return 7.0;
}

// ===== BRAND TIER MAPPING =====
const BRAND_TIERS: Record<string, { tier: 'premium' | 'mid' | 'budget', bonus: number }> = {
  'sunday natural': { tier: 'premium', bonus: 2 },
  'moleqlar': { tier: 'premium', bonus: 2 },
  'thorne': { tier: 'premium', bonus: 2 },
  'pure encapsulations': { tier: 'premium', bonus: 2 },
  'life extension': { tier: 'premium', bonus: 2 },
  'biogena': { tier: 'premium', bonus: 2 },
  'jarrow': { tier: 'mid', bonus: 1 },
  'now foods': { tier: 'mid', bonus: 1 },
  'natural elements': { tier: 'mid', bonus: 1 },
  'nature love': { tier: 'mid', bonus: 1 },
  'naturtreu': { tier: 'mid', bonus: 1 },
  'esn': { tier: 'mid', bonus: 1 },
  'more nutrition': { tier: 'mid', bonus: 1 },
  'bulk': { tier: 'budget', bonus: 0 },
  'myprotein': { tier: 'budget', bonus: 0 },
};

function getBrandInfo(brandName: string | null): { tier: string, bonus: number } {
  if (!brandName) return { tier: 'unknown', bonus: 0 };
  const lower = brandName.toLowerCase();
  
  for (const [name, info] of Object.entries(BRAND_TIERS)) {
    if (lower.includes(name)) {
      return info;
    }
  }
  return { tier: 'unknown', bonus: 0 };
}

// ===== STAGE 1: SMART PRODUCT ANALYSIS (LLM) =====
async function stage1_smartProductAnalysis(
  currentData: any,
  sourceUrl: string
): Promise<Partial<ExtendedEnrichedData>> {
  console.log('[ENRICH] Stage 1: Smart Product Analysis');
  
  if (!OPENAI_API_KEY) {
    console.log('[ENRICH] No OpenAI key, using rule-based analysis');
    return stage1_ruleBasedAnalysis(currentData);
  }

  try {
    const prompt = `Du bist ein Experte für Nahrungsergänzungsmittel. Analysiere dieses Produkt VOLLSTÄNDIG und extrahiere ALLE verfügbaren Informationen.

PRODUKT-DATEN:
- Name: ${currentData.product_name || 'Unbekannt'}
- Marke: ${currentData.brand_name || 'Unbekannt'}
- Beschreibung: ${(currentData.description || '').slice(0, 500)}
- Preis: ${currentData.price_eur ? `€${currentData.price_eur}` : 'Unbekannt'}
- Packungsgröße: ${currentData.pack_size || '?'} ${currentData.pack_unit || ''}
- Portionen: ${currentData.servings_per_pack || '?'}
- Dosis/Portion: ${currentData.dose_per_serving || '?'} ${currentData.dose_unit || ''}
- Bekannte Zutaten: ${(currentData.ingredients || []).slice(0, 15).join(', ')}
- Bekannte Tags: ${(currentData.quality_tags || []).join(', ')}
- URL: ${sourceUrl}

Analysiere und extrahiere:
1. FORM: Kapsel, Tablette, Pulver, Liposomal, Softgel, Tropfen, etc.
2. CATEGORY: Vitamin, Mineral, Aminosäure, Protein, Omega, Adaptogen, etc.
3. ALLERGENS: Milch, Soja, Gluten, Nüsse, etc. (Array)
4. QUALITY_FLAGS: GMP, Made in Germany, Lab-tested, Bio, Vegan, etc. (Array)
5. ACTIVE_INGREDIENTS: Nur die aktiven Wirkstoffe, keine Füllstoffe (Array)
6. SHORT_DESCRIPTION: 1-2 Sätze Zusammenfassung
7. IS_VEGAN: true/false
8. IS_ORGANIC: true/false  
9. IS_GLUTEN_FREE: true/false
10. TIMING: morning, noon, evening, pre_workout, post_workout, with_meals
11. SERVING_SIZE: z.B. "2 Kapseln", "1 Messlöffel (30g)"

Antworte NUR mit validem JSON:
{
  "form": "kapsel",
  "category": "mineral",
  "allergens": [],
  "quality_flags": ["GMP", "Made in Germany"],
  "active_ingredients": ["Magnesium Bisglycinat"],
  "short_description": "Hochdosiertes Magnesium...",
  "is_vegan": true,
  "is_organic": false,
  "is_gluten_free": true,
  "timing": "evening",
  "serving_size": "2 Kapseln"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Du analysierst Supplement-Produkte. Antworte nur mit validem JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      console.error('[ENRICH] Stage 1 AI error:', response.status);
      return stage1_ruleBasedAnalysis(currentData);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[ENRICH] Stage 1: No JSON in response');
      return stage1_ruleBasedAnalysis(currentData);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('[ENRICH] Stage 1 AI analysis complete');
    
    return {
      form: parsed.form || null,
      category: parsed.category || null,
      allergens: parsed.allergens || [],
      quality_tags: [...(currentData.quality_tags || []), ...(parsed.quality_flags || [])],
      ingredients: parsed.active_ingredients || currentData.ingredients || [],
      short_description: parsed.short_description || null,
      is_vegan: parsed.is_vegan ?? currentData.is_vegan ?? false,
      is_organic: parsed.is_organic ?? currentData.is_organic ?? false,
      is_gluten_free: parsed.is_gluten_free ?? false,
      timing: parsed.timing || null,
      serving_size: parsed.serving_size || null,
    };
  } catch (err) {
    console.error('[ENRICH] Stage 1 failed:', err);
    return stage1_ruleBasedAnalysis(currentData);
  }
}

function stage1_ruleBasedAnalysis(currentData: any): Partial<ExtendedEnrichedData> {
  const text = [
    currentData.product_name,
    currentData.description,
    ...(currentData.ingredients || [])
  ].join(' ').toLowerCase();
  
  // Form detection
  let form = null;
  if (text.includes('liposom')) form = 'liposomal';
  else if (text.includes('kapsel') || text.includes('capsule')) form = 'kapsel';
  else if (text.includes('tablette') || text.includes('tablet')) form = 'tablette';
  else if (text.includes('pulver') || text.includes('powder')) form = 'pulver';
  else if (text.includes('tropfen') || text.includes('liquid')) form = 'tropfen';
  else if (text.includes('softgel')) form = 'softgel';
  
  // Category detection
  let category = null;
  if (text.includes('vitamin')) category = 'vitamin';
  else if (text.includes('magnesium') || text.includes('zink') || text.includes('eisen')) category = 'mineral';
  else if (text.includes('omega') || text.includes('fischöl')) category = 'omega';
  else if (text.includes('protein') || text.includes('whey')) category = 'protein';
  else if (text.includes('kreatin') || text.includes('creatine')) category = 'performance';
  
  // Allergens
  const allergens: string[] = [];
  if (text.includes('milch') || text.includes('lactose')) allergens.push('Milch');
  if (text.includes('soja')) allergens.push('Soja');
  if (text.includes('gluten') || text.includes('weizen')) allergens.push('Gluten');
  
  return {
    form,
    category,
    allergens,
    is_vegan: currentData.is_vegan || text.includes('vegan'),
    is_organic: currentData.is_organic || text.includes('bio ') || text.includes('organic'),
    is_gluten_free: text.includes('glutenfrei') || text.includes('gluten-free'),
  };
}

// ===== STAGE 2: DATABASE CONTEXT ENRICHMENT =====
async function stage2_databaseEnrichment(
  supabase: any,
  matchedSupplementId: string | null
): Promise<Partial<ExtendedEnrichedData>> {
  console.log('[ENRICH] Stage 2: Database Context Enrichment');
  
  if (!matchedSupplementId) {
    console.log('[ENRICH] No matched supplement, skipping Stage 2');
    return {};
  }

  try {
    const { data: supplement, error } = await supabase
      .from('supplement_database')
      .select(`
        name,
        category,
        timing,
        form,
        default_dosage,
        default_unit,
        synergies,
        blockers,
        timing_constraint,
        cycling_protocol,
        evidence_level,
        necessity_tier,
        hallmarks_addressed,
        clinical_dosage_min,
        clinical_dosage_max,
        clinical_dosage_unit,
        impact_score
      `)
      .eq('id', matchedSupplementId)
      .single();

    if (error || !supplement) {
      console.log('[ENRICH] Stage 2: Supplement not found');
      return {};
    }

    console.log('[ENRICH] Stage 2: Loaded supplement data:', supplement.name);
    
    return {
      category: supplement.category || null,
      timing: supplement.timing || null,
      synergies: supplement.synergies || [],
      blockers: supplement.blockers || [],
      timing_constraint: supplement.timing_constraint || null,
      cycling_protocol: supplement.cycling_protocol || null,
      evidence_level: supplement.evidence_level || null,
      necessity_tier: supplement.necessity_tier || null,
      hallmarks_addressed: supplement.hallmarks_addressed || [],
      clinical_dosage_min: parseNum(supplement.clinical_dosage_min),
      clinical_dosage_max: parseNum(supplement.clinical_dosage_max),
      clinical_dosage_unit: supplement.clinical_dosage_unit || null,
    };
  } catch (err) {
    console.error('[ENRICH] Stage 2 failed:', err);
    return {};
  }
}

// ===== STAGE 3: BRAND INTELLIGENCE =====
async function stage3_brandIntelligence(
  supabase: any,
  brandName: string | null
): Promise<Partial<ExtendedEnrichedData>> {
  console.log('[ENRICH] Stage 3: Brand Intelligence');
  
  if (!brandName) {
    return { brand_is_new: false };
  }

  try {
    // Try to find existing brand
    const { data: brand, error } = await supabase
      .from('supplement_brands')
      .select('id, name, country, price_tier, certifications, website')
      .ilike('name', `%${brandName}%`)
      .limit(1)
      .single();

    if (brand && !error) {
      console.log('[ENRICH] Stage 3: Found existing brand:', brand.name);
      return {
        brand_id: brand.id,
        brand_country: brand.country || null,
        brand_price_tier: brand.price_tier || null,
        brand_certifications: brand.certifications || [],
        brand_is_new: false,
      };
    }

    // Brand not found - use rule-based tier
    const brandInfo = getBrandInfo(brandName);
    console.log('[ENRICH] Stage 3: Brand not in DB, tier:', brandInfo.tier);
    
    return {
      brand_id: null,
      brand_country: null,
      brand_price_tier: brandInfo.tier,
      brand_certifications: [],
      brand_is_new: true,
    };
  } catch (err) {
    console.error('[ENRICH] Stage 3 failed:', err);
    const brandInfo = getBrandInfo(brandName);
    return {
      brand_id: null,
      brand_price_tier: brandInfo.tier,
      brand_is_new: true,
    };
  }
}

// ===== STAGE 4: SMART BIG8 SCORING =====
async function stage4_smartBig8Scoring(
  currentData: any,
  stage1Data: Partial<ExtendedEnrichedData>,
  stage2Data: Partial<ExtendedEnrichedData>,
  stage3Data: Partial<ExtendedEnrichedData>
): Promise<Partial<ExtendedEnrichedData>> {
  console.log('[ENRICH] Stage 4: Smart Big8 Scoring');
  
  const brandInfo = getBrandInfo(currentData.brand_name);
  const ingredients = stage1Data.ingredients || currentData.ingredients || [];
  const form = stage1Data.form || currentData.form;
  const qualityTags = stage1Data.quality_tags || currentData.quality_tags || [];
  
  // === BIOAVAILABILITY (Form-based) ===
  const formScore = deriveFormScore(form, ingredients);
  const quality_bioavailability = clampScore(formScore);
  
  // === DOSAGE (vs. clinical standard) ===
  let quality_dosage = 7.0;
  const dosePerServing = parseNum(currentData.dose_per_serving);
  const clinicalMin = stage2Data.clinical_dosage_min;
  const clinicalMax = stage2Data.clinical_dosage_max;
  
  if (dosePerServing && clinicalMin) {
    const ratio = dosePerServing / clinicalMin;
    if (ratio >= 1.0 && ratio <= 1.5) quality_dosage = 9.5;
    else if (ratio >= 0.8 && ratio < 1.0) quality_dosage = 8.0;
    else if (ratio >= 0.5 && ratio < 0.8) quality_dosage = 6.5;
    else if (ratio > 1.5 && ratio <= 2.0) quality_dosage = 8.5;
    else if (ratio > 2.0) quality_dosage = 7.0; // Overdosed
    else quality_dosage = 5.0; // Underdosed
  } else {
    quality_dosage = 7.0 + brandInfo.bonus;
  }
  
  // === FORM (Product form mapping) ===
  const quality_form = clampScore(formScore);
  
  // === PURITY (Additives count, quality tags) ===
  let quality_purity = 7.0 + brandInfo.bonus;
  const hasNoAdditives = qualityTags.some((t: string) => 
    t.toLowerCase().includes('ohne zusatz') || t.toLowerCase().includes('pure') || t.toLowerCase().includes('rein')
  );
  if (hasNoAdditives) quality_purity += 1.5;
  if (stage1Data.is_organic) quality_purity += 0.5;
  quality_purity = clampScore(quality_purity);
  
  // === RESEARCH (Evidence level from supplement_database) ===
  let quality_research = 6.0 + brandInfo.bonus;
  const evidenceLevel = stage2Data.evidence_level?.toLowerCase();
  if (evidenceLevel === 'high' || evidenceLevel === 'hoch') quality_research = 9.0;
  else if (evidenceLevel === 'moderate' || evidenceLevel === 'mittel') quality_research = 7.5;
  else if (evidenceLevel === 'animal_strong') quality_research = 7.0;
  else if (evidenceLevel === 'emerging') quality_research = 6.0;
  else if (evidenceLevel === 'low' || evidenceLevel === 'niedrig') quality_research = 5.0;
  quality_research = clampScore(quality_research);
  
  // === SYNERGY (Synergies count) ===
  let quality_synergy = 7.0;
  const synergiesCount = (stage2Data.synergies || []).length;
  if (synergiesCount >= 5) quality_synergy = 9.0;
  else if (synergiesCount >= 3) quality_synergy = 8.0;
  else if (synergiesCount >= 1) quality_synergy = 7.5;
  quality_synergy = clampScore(quality_synergy);
  
  // === TRANSPARENCY (Lab tests, certifications, COA) ===
  let quality_transparency = 6.0 + brandInfo.bonus;
  const hasLabTest = qualityTags.some((t: string) => 
    t.toLowerCase().includes('labor') || t.toLowerCase().includes('test') || 
    t.toLowerCase().includes('zertifiz') || t.toLowerCase().includes('geprüft')
  );
  const hasCertifications = (stage3Data.brand_certifications || []).length > 0;
  if (hasLabTest) quality_transparency += 2.0;
  if (hasCertifications) quality_transparency += 1.0;
  if (qualityTags.some((t: string) => t.toLowerCase().includes('gmp'))) quality_transparency += 0.5;
  if (qualityTags.some((t: string) => t.toLowerCase().includes('made in germany'))) quality_transparency += 0.5;
  quality_transparency = clampScore(quality_transparency);
  
  // === VALUE (Price per clinical dose vs. market) ===
  let quality_value = 7.0;
  const pricePerServing = currentData.price_per_serving || 
    (currentData.price_eur && currentData.servings_per_pack 
      ? currentData.price_eur / currentData.servings_per_pack 
      : null);
  
  if (pricePerServing !== null) {
    if (pricePerServing < 0.10) quality_value = 9.5;
    else if (pricePerServing < 0.25) quality_value = 8.5;
    else if (pricePerServing < 0.50) quality_value = 7.5;
    else if (pricePerServing < 0.75) quality_value = 6.5;
    else if (pricePerServing < 1.00) quality_value = 6.0;
    else if (pricePerServing < 1.50) quality_value = 5.5;
    else quality_value = 5.0;
  }
  quality_value = clampScore(quality_value);
  
  // === CALCULATE BIG8 AVERAGE ===
  const scores = [
    quality_bioavailability,
    quality_dosage,
    quality_form,
    quality_purity,
    quality_research,
    quality_synergy,
    quality_transparency,
    quality_value,
  ].filter((s): s is number => s !== null);
  
  const impact_score_big8 = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;

  console.log('[ENRICH] Stage 4 Big8 scores calculated:', { impact_score_big8 });
  
  return {
    quality_bioavailability,
    quality_dosage: clampScore(quality_dosage),
    quality_form,
    quality_purity,
    quality_research,
    quality_synergy,
    quality_transparency,
    quality_value,
    impact_score_big8,
    // Legacy quality fields
    bioavailability: quality_bioavailability,
    potency: quality_dosage ? clampScore(quality_dosage) : null,
    purity: quality_purity,
    value: quality_value,
  };
}

// ===== MAIN HANDLER =====
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submission_id } = await req.json();
    
    if (!submission_id) {
      return new Response(
        JSON.stringify({ error: 'submission_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch submission
    const { data: submission, error: fetchError } = await supabase
      .from('product_submissions')
      .select('*')
      .eq('id', submission_id)
      .single();

    if (fetchError || !submission) {
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentData = submission.extracted_data || {};
    console.log('[ENRICH] Starting 4-stage enrichment for:', currentData.product_name);

    // ===== RUN ALL 4 STAGES =====
    
    // Stage 1: Smart Product Analysis
    const stage1Data = await stage1_smartProductAnalysis(currentData, submission.source_url);
    
    // Stage 2: Database Context Enrichment
    const stage2Data = await stage2_databaseEnrichment(supabase, submission.matched_supplement_id);
    
    // Stage 3: Brand Intelligence
    const stage3Data = await stage3_brandIntelligence(supabase, currentData.brand_name);
    
    // Stage 4: Smart Big8 Scoring
    const stage4Data = await stage4_smartBig8Scoring(currentData, stage1Data, stage2Data, stage3Data);

    // Calculate price per serving if missing
    let pricePerServing = currentData.price_per_serving;
    if (!pricePerServing && currentData.price_eur && currentData.servings_per_pack) {
      pricePerServing = Math.round((currentData.price_eur / currentData.servings_per_pack) * 100) / 100;
    }

    // ===== MERGE ALL DATA =====
    const enrichedData: ExtendedEnrichedData = {
      // Base product data
      product_name: currentData.product_name || 'Unbekanntes Produkt',
      brand_name: currentData.brand_name || null,
      form: stage1Data.form || currentData.form || null,
      category: stage2Data.category || stage1Data.category || null,
      pack_size: currentData.pack_size || null,
      pack_unit: currentData.pack_unit || null,
      servings_per_pack: currentData.servings_per_pack || null,
      dose_per_serving: currentData.dose_per_serving || null,
      dose_unit: currentData.dose_unit || null,
      dosage_per_serving: currentData.dosage_per_serving || null,
      serving_size: stage1Data.serving_size || null,
      price_eur: currentData.price_eur || null,
      price_per_serving: pricePerServing || null,
      is_vegan: stage1Data.is_vegan ?? currentData.is_vegan ?? false,
      is_organic: stage1Data.is_organic ?? currentData.is_organic ?? false,
      is_gluten_free: stage1Data.is_gluten_free ?? false,
      allergens: stage1Data.allergens || [],
      quality_tags: [...new Set(stage1Data.quality_tags || currentData.quality_tags || [])],
      timing: stage2Data.timing || stage1Data.timing || null,
      short_description: stage1Data.short_description || null,
      description: currentData.description || null,
      ingredients: stage1Data.ingredients || currentData.ingredients || [],
      
      // Amazon data
      amazon_asin: currentData.amazon_asin || null,
      amazon_url: currentData.amazon_url || null,
      amazon_image: currentData.amazon_image || null,
      amazon_name: currentData.amazon_name || null,
      amazon_match_score: currentData.amazon_match_score || null,
      
      // Big8 scores
      quality_bioavailability: stage4Data.quality_bioavailability || null,
      quality_dosage: stage4Data.quality_dosage || null,
      quality_form: stage4Data.quality_form || null,
      quality_purity: stage4Data.quality_purity || null,
      quality_research: stage4Data.quality_research || null,
      quality_synergy: stage4Data.quality_synergy || null,
      quality_transparency: stage4Data.quality_transparency || null,
      quality_value: stage4Data.quality_value || null,
      
      // Legacy quality
      bioavailability: stage4Data.bioavailability || null,
      potency: stage4Data.potency || null,
      reviews: null,
      origin: stage3Data.brand_country || null,
      lab_tests: null,
      purity: stage4Data.purity || null,
      value: stage4Data.value || null,
      
      // Scores
      impact_score_big8: stage4Data.impact_score_big8 || null,
      popularity_score: null,
      match_score: submission.match_confidence || null,
      
      // Ingredient data from supplement_database
      synergies: stage2Data.synergies || [],
      blockers: stage2Data.blockers || [],
      timing_constraint: stage2Data.timing_constraint || null,
      cycling_protocol: stage2Data.cycling_protocol || null,
      evidence_level: stage2Data.evidence_level || null,
      necessity_tier: stage2Data.necessity_tier || null,
      hallmarks_addressed: stage2Data.hallmarks_addressed || [],
      clinical_dosage_min: stage2Data.clinical_dosage_min || null,
      clinical_dosage_max: stage2Data.clinical_dosage_max || null,
      clinical_dosage_unit: stage2Data.clinical_dosage_unit || null,
      
      // Brand data
      brand_id: stage3Data.brand_id || null,
      brand_country: stage3Data.brand_country || null,
      brand_price_tier: stage3Data.brand_price_tier || null,
      brand_certifications: stage3Data.brand_certifications || [],
      brand_is_new: stage3Data.brand_is_new ?? false,
      
      // Meta
      enrichment_version: '2.0',
      enriched_at: new Date().toISOString(),
      enrichment_source: OPENAI_API_KEY ? 'hybrid' : 'rules',
    };

    // Count filled fields
    const filledFields = Object.entries(enrichedData)
      .filter(([_, v]) => v !== null && v !== undefined && v !== '' && 
        (Array.isArray(v) ? v.length > 0 : true))
      .length;

    console.log('[ENRICH] Enrichment complete. Filled fields:', filledFields);

    // Update submission
    const { error: updateError } = await supabase
      .from('product_submissions')
      .update({
        extracted_data: enrichedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', submission_id);

    if (updateError) {
      console.error('[ENRICH] Update failed:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save enriched data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        enriched_data: enrichedData,
        filled_fields: filledFields,
        total_fields: Object.keys(enrichedData).length,
        stages_completed: ['smart_analysis', 'database_context', 'brand_intelligence', 'big8_scoring'],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[ENRICH] Error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
