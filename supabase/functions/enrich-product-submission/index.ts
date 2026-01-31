import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = 'https://gzczjscctgyxjyodhnhk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface EnrichedData {
  // Basic product info
  product_name: string;
  brand_name: string | null;
  price_eur: number | null;
  pack_size: number | null;
  pack_unit: string | null;
  dose_per_serving: number | null;
  dose_unit: string | null;
  servings_per_pack: number | null;
  price_per_serving: number | null;
  
  // Amazon
  amazon_asin: string | null;
  amazon_image: string | null;
  
  // Flags
  is_vegan: boolean;
  is_organic: boolean;
  quality_tags: string[];
  ingredients: string[];
  description: string | null;
  
  // Big8 Quality Scores (1-10)
  quality_bioavailability: number | null;
  quality_dosage: number | null;
  quality_form: number | null;
  quality_purity: number | null;
  quality_research: number | null;
  quality_synergy: number | null;
  quality_transparency: number | null;
  quality_value: number | null;
  
  // Computed
  impact_score_big8: number | null;
}

// Calculate Big8 average
function calculateBig8Average(data: EnrichedData): number | null {
  const scores = [
    data.quality_bioavailability,
    data.quality_dosage,
    data.quality_form,
    data.quality_purity,
    data.quality_research,
    data.quality_synergy,
    data.quality_transparency,
    data.quality_value,
  ].filter((s): s is number => s !== null && !isNaN(s));
  
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

// Parse number safely
function parseNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(n) ? null : n;
}

// Derive form quality from form name
function deriveFormQuality(form: string | null): number {
  if (!form) return 7.0;
  const lower = form.toLowerCase();
  if (lower.includes('liposom')) return 10.0;
  if (lower.includes('micell') || lower.includes('nanoemul')) return 9.5;
  if (lower.includes('chelat') || lower.includes('glycinat') || lower.includes('bisglycinat')) return 9.0;
  if (lower.includes('citrat') || lower.includes('malat')) return 8.5;
  if (lower.includes('liquid') || lower.includes('flüssig')) return 8.5;
  if (lower.includes('kapsel') || lower.includes('capsule')) return 8.0;
  if (lower.includes('softgel')) return 8.0;
  if (lower.includes('tablet') || lower.includes('tablette')) return 7.0;
  if (lower.includes('pulver') || lower.includes('powder')) return 7.5;
  if (lower.includes('oxid')) return 5.0;
  return 7.0;
}

async function enrichWithAI(
  currentData: any,
  supplementInfo: any | null
): Promise<Partial<EnrichedData>> {
  if (!OPENAI_API_KEY) {
    console.log('[ENRICH] No OpenAI key, using rule-based enrichment');
    return ruleBasedEnrichment(currentData, supplementInfo);
  }

  try {
    const prompt = `Du bist ein Experte für Nahrungsergänzungsmittel. Analysiere dieses Produkt und gib realistische Big8 Qualitätsscores (1-10):

PRODUKT:
- Name: ${currentData.product_name || 'Unbekannt'}
- Marke: ${currentData.brand_name || 'Unbekannt'}
- Preis: ${currentData.price_eur ? `€${currentData.price_eur}` : 'Unbekannt'}
- Packungsgröße: ${currentData.pack_size || '?'} ${currentData.pack_unit || ''}
- Portionen: ${currentData.servings_per_pack || '?'}
- Dosis/Portion: ${currentData.dose_per_serving || '?'} ${currentData.dose_unit || ''}
- Zutaten: ${(currentData.ingredients || []).slice(0, 10).join(', ')}
- Qualitäts-Tags: ${(currentData.quality_tags || []).join(', ')}

${supplementInfo ? `WIRKSTOFF-INFO:
- Name: ${supplementInfo.name}
- Kategorie: ${supplementInfo.category || 'Unbekannt'}
- Timing: ${supplementInfo.timing || 'Unbekannt'}
` : ''}

Bewerte nach diesen Kriterien (1=schlecht, 10=exzellent):
1. Bioverfügbarkeit (Form-Qualität, Chelat > Citrat > Oxid)
2. Dosierung (Klinisch wirksame Dosis?)
3. Form (Liposomal/Kapsel/Tablette/Pulver)
4. Reinheit (Zusatzstoffe, Füllstoffe, Qualität)
5. Forschung (Wissenschaftliche Evidenz für die Marke/Form)
6. Synergie (Sinnvolle Kombination mit anderen Stoffen)
7. Transparenz (Labortests, Zertifikate, Herkunftsangaben)
8. Preis-Leistung (Kosten pro wirksamer Dosis)

Antworte NUR mit JSON:
{
  "quality_bioavailability": <1-10>,
  "quality_dosage": <1-10>,
  "quality_form": <1-10>,
  "quality_purity": <1-10>,
  "quality_research": <1-10>,
  "quality_synergy": <1-10>,
  "quality_transparency": <1-10>,
  "quality_value": <1-10>,
  "reasoning": "<Kurze Begründung>"
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
          { role: 'system', content: 'Du analysierst Supplement-Qualität. Antworte nur mit validem JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('[ENRICH] OpenAI API error:', response.status);
      return ruleBasedEnrichment(currentData, supplementInfo);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[ENRICH] No JSON in response');
      return ruleBasedEnrichment(currentData, supplementInfo);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('[ENRICH] AI enrichment successful:', parsed.reasoning);
    
    return {
      quality_bioavailability: parseNum(parsed.quality_bioavailability),
      quality_dosage: parseNum(parsed.quality_dosage),
      quality_form: parseNum(parsed.quality_form),
      quality_purity: parseNum(parsed.quality_purity),
      quality_research: parseNum(parsed.quality_research),
      quality_synergy: parseNum(parsed.quality_synergy),
      quality_transparency: parseNum(parsed.quality_transparency),
      quality_value: parseNum(parsed.quality_value),
    };
  } catch (err) {
    console.error('[ENRICH] AI enrichment failed:', err);
    return ruleBasedEnrichment(currentData, supplementInfo);
  }
}

function ruleBasedEnrichment(currentData: any, supplementInfo: any | null): Partial<EnrichedData> {
  // Derive quality scores from available data
  const brandTier = getBrandTier(currentData.brand_name);
  const formScore = deriveFormQuality(currentData.dose_unit);
  
  // Price-value calculation
  const pricePerServing = currentData.price_per_serving || 
    (currentData.price_eur && currentData.servings_per_pack 
      ? currentData.price_eur / currentData.servings_per_pack 
      : null);
  
  let valueScore = 7.0;
  if (pricePerServing !== null) {
    if (pricePerServing < 0.1) valueScore = 9.5;
    else if (pricePerServing < 0.3) valueScore = 8.5;
    else if (pricePerServing < 0.5) valueScore = 7.5;
    else if (pricePerServing < 1.0) valueScore = 6.5;
    else valueScore = 5.5;
  }

  const qualityTags = currentData.quality_tags || [];
  const hasLabTest = qualityTags.some((t: string) => 
    t.toLowerCase().includes('labor') || t.toLowerCase().includes('test') || t.toLowerCase().includes('zertifiz')
  );
  
  return {
    quality_bioavailability: formScore,
    quality_dosage: 7.0 + brandTier,
    quality_form: formScore,
    quality_purity: 7.0 + brandTier + (qualityTags.includes('Ohne Zusatzstoffe') ? 1 : 0),
    quality_research: 6.0 + brandTier,
    quality_synergy: 7.0,
    quality_transparency: 6.5 + brandTier + (hasLabTest ? 1.5 : 0),
    quality_value: valueScore,
  };
}

function getBrandTier(brandName: string | null): number {
  if (!brandName) return 0;
  const lower = brandName.toLowerCase();
  
  // Premium brands (+2)
  const premium = ['sunday natural', 'moleqlar', 'thorne', 'pure encapsulations', 'life extension', 'biogena'];
  if (premium.some(b => lower.includes(b))) return 2;
  
  // Good brands (+1)
  const good = ['now foods', 'jarrow', 'natural elements', 'nature love', 'naturtreu'];
  if (good.some(b => lower.includes(b))) return 1;
  
  // Budget brands (0)
  return 0;
}

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

    // 1. Fetch submission
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
    
    // 2. Get matched supplement info if available
    let supplementInfo = null;
    if (submission.matched_supplement_id) {
      const { data: supp } = await supabase
        .from('supplement_database')
        .select('name, category, timing, form, default_dosage, default_unit')
        .eq('id', submission.matched_supplement_id)
        .single();
      supplementInfo = supp;
    }

    // 3. Enrich with AI or rules
    const enrichedScores = await enrichWithAI(currentData, supplementInfo);

    // 4. Calculate price per serving if missing
    let pricePerServing = currentData.price_per_serving;
    if (!pricePerServing && currentData.price_eur && currentData.servings_per_pack) {
      pricePerServing = Math.round((currentData.price_eur / currentData.servings_per_pack) * 100) / 100;
    }

    // 5. Build enriched data
    const enrichedData: EnrichedData = {
      // Keep existing data
      product_name: currentData.product_name || 'Unbekanntes Produkt',
      brand_name: currentData.brand_name || null,
      price_eur: currentData.price_eur || null,
      pack_size: currentData.pack_size || null,
      pack_unit: currentData.pack_unit || null,
      dose_per_serving: currentData.dose_per_serving || null,
      dose_unit: currentData.dose_unit || null,
      servings_per_pack: currentData.servings_per_pack || null,
      price_per_serving: pricePerServing || null,
      amazon_asin: currentData.amazon_asin || null,
      amazon_image: currentData.amazon_image || null,
      is_vegan: currentData.is_vegan || false,
      is_organic: currentData.is_organic || false,
      quality_tags: currentData.quality_tags || [],
      ingredients: currentData.ingredients || [],
      description: currentData.description || null,
      
      // Add enriched scores
      quality_bioavailability: enrichedScores.quality_bioavailability || null,
      quality_dosage: enrichedScores.quality_dosage || null,
      quality_form: enrichedScores.quality_form || null,
      quality_purity: enrichedScores.quality_purity || null,
      quality_research: enrichedScores.quality_research || null,
      quality_synergy: enrichedScores.quality_synergy || null,
      quality_transparency: enrichedScores.quality_transparency || null,
      quality_value: enrichedScores.quality_value || null,
      
      impact_score_big8: null,
    };

    // Calculate Big8 average
    enrichedData.impact_score_big8 = calculateBig8Average(enrichedData);

    // 6. Update submission with enriched data
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

    console.log('[ENRICH] Successfully enriched submission:', submission_id);

    return new Response(
      JSON.stringify({
        success: true,
        enriched_data: enrichedData,
        has_big8_scores: enrichedData.impact_score_big8 !== null,
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
