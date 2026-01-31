import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { buildCorsHeaders, okJson, errJson, handleOptions } from '../_shared/cors.ts';

const SUPABASE_URL = 'https://gzczjscctgyxjyodhnhk.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Supported domains whitelist (85+ shops)
const SUPPORTED_DOMAINS = [
  // Amazon/Marketplace
  'amazon.de', 'amazon.com', 'amazon.co.uk', 'amazon.at',
  // International
  'iherb.com', 'vitacost.com', 'swansonvitamins.com', 'pipingrock.com', 'evitamins.com',
  // Premium/Longevity Hersteller
  'sunday-natural.de', 'sunday.de', 'moleqlar.de', 'biogena.com', 'lifeextension.com',
  'thorne.com', 'nordicnaturals.com', 'purecaps.net', 'pureencapsulations.com',
  'jarrow.com', 'now-foods.de', 'nowfoods.com',
  // Mid-Range Hersteller
  'naturtreu.de', 'naturelove.de', 'nature-love.de', 'natural-elements.de',
  'gloryfeel.de', 'doppelherz.de', 'orthomol.de', 'abtei.de', 'centrum.de',
  // Sport & Fitness
  'esn.com', 'morenutrition.de', 'profuel.de', 'gymbeam.de', 'gymbeam.com',
  'bodylab24.de', 'body-attack.de', 'bulk.com', 'myprotein.de', 'myprotein.com',
  'fitmart.de', 'zecplus.de', 'rocka-nutrition.de', 'ironmaxx.de', 'prozis.com',
  'foodspring.de', 'got7nutrition.de', 'peak-performance.de',
  // Vitaminversand & Shops
  'vitaminversand24.com', 'vitamin360.com', 'vitaworld24.de', 'medicom.de',
  'vit4ever.de', 'nutri-plus.de', 'fairvital.com', 'vitabay.de', 'biovea.com',
  'vitaminexpress.org', 'vitamaze.shop', 'zeinpharma.de', 'effective-nature.com',
  'nu3.de', 'vitafy.de', 'feelgood-shop.com', 'amazon-apa.de',
  // Online Apotheken
  'shop-apotheke.com', 'docmorris.de', 'medpex.de', 'aponeo.de', 'sanicare.de',
  'apo-rot.de', 'apodiscounter.de', 'mycare.de', 'delmed.de', 'disapo.de',
  'versandapo.de', 'zur-rose.de', 'eurapon.de',
  // Longevity & Biohacking
  'braineffect.com', 'edubily.de', 'primal-state.de', 'do-not-age.com',
  'alive-by-science.com', 'humanx.de', 'bio360.de', 'longevity-supplements.de',
];

interface ScrapedProduct {
  product_name: string;
  brand_name: string | null;
  price_eur: number | null;
  pack_size: number | null;
  pack_unit: string | null;
  dose_per_serving: number | null;
  dose_unit: string | null;
  servings_per_pack: number | null;
  price_per_serving: number | null;
  amazon_asin: string | null;
  amazon_image: string | null;
  is_vegan: boolean;
  is_organic: boolean;
  quality_tags: string[];
  ingredients: string[];
  description: string | null;
}

interface SupplementMatch {
  id: string;
  name: string;
  confidence: number;
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function extractAsin(url: string): string | null {
  // Amazon ASIN patterns: /dp/ASIN, /gp/product/ASIN, /gp/aw/d/ASIN
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/gp\/aw\/d\/([A-Z0-9]{10})/i,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

async function scrapeWithFirecrawl(url: string): Promise<string | null> {
  if (!RAPIDAPI_KEY) {
    console.error('RAPIDAPI_KEY not configured');
    return null;
  }

  try {
    console.log('[SCRAPE] Calling RapidAPI Firecrawl for:', url);
    
    const response = await fetch('https://firecrawl-mcp.p.rapidapi.com/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'firecrawl-mcp',
        'x-rapidapi-host': 'firecrawl-mcp.p.rapidapi.com',
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      console.error('[SCRAPE] Firecrawl error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    console.log('[SCRAPE] Firecrawl response received, length:', JSON.stringify(data).length);
    
    // Extract markdown or text content
    return data.markdown || data.content || data.text || JSON.stringify(data);
  } catch (error) {
    console.error('[SCRAPE] Firecrawl exception:', error);
    return null;
  }
}

async function classifyAndExtractWithLLM(
  rawContent: string,
  url: string,
  domain: string
): Promise<{ isSupplement: boolean; product: ScrapedProduct | null; reason: string }> {
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not configured');
    return { isSupplement: false, product: null, reason: 'OpenAI API key not configured' };
  }

  // Truncate content to avoid token limits
  const truncatedContent = rawContent.slice(0, 12000);

  const prompt = `Analysiere diese Produktseite und extrahiere die Daten.

URL: ${url}
Domain: ${domain}

INHALT:
${truncatedContent}

AUFGABEN:
1. Prüfe ob es sich um ein Nahrungsergänzungsmittel (Supplement) handelt
2. Falls ja, extrahiere alle Produktdaten

Antworte NUR mit validem JSON in diesem Format:
{
  "is_supplement": boolean,
  "reason": "Begründung (max 50 Zeichen)",
  "product": {
    "product_name": "Vollständiger Produktname",
    "brand_name": "Markenname oder null",
    "price_eur": Preis als Zahl oder null,
    "pack_size": Anzahl Kapseln/Tabletten als Zahl oder null,
    "pack_unit": "Kapseln" oder "Tabletten" oder "g" etc.,
    "dose_per_serving": Dosis pro Portion als Zahl oder null,
    "dose_unit": "mg" oder "mcg" oder "IU" etc.,
    "servings_per_pack": Portionen pro Packung als Zahl oder null,
    "is_vegan": boolean,
    "is_organic": boolean,
    "quality_tags": ["GMP", "Made in Germany", etc.],
    "ingredients": ["Hauptwirkstoff 1", "Hauptwirkstoff 2"],
    "description": "Kurze Produktbeschreibung (max 200 Zeichen) oder null"
  }
}

Falls kein Supplement: setze "product" auf null.`;

  try {
    console.log('[LLM] Calling OpenAI for classification...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Du bist ein Experte für Nahrungsergänzungsmittel. Antworte nur mit validem JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      console.error('[LLM] OpenAI error:', response.status);
      return { isSupplement: false, product: null, reason: 'LLM classification failed' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content;
    if (content.includes('```json')) {
      jsonStr = content.split('```json')[1]?.split('```')[0] || content;
    } else if (content.includes('```')) {
      jsonStr = content.split('```')[1]?.split('```')[0] || content;
    }
    
    const parsed = JSON.parse(jsonStr.trim());
    console.log('[LLM] Classification result:', parsed.is_supplement, parsed.reason);
    
    return {
      isSupplement: parsed.is_supplement === true,
      product: parsed.product as ScrapedProduct | null,
      reason: parsed.reason || 'Unknown',
    };
  } catch (error) {
    console.error('[LLM] Exception:', error);
    return { isSupplement: false, product: null, reason: 'LLM parsing error' };
  }
}

async function matchSupplement(
  productName: string,
  ingredients: string[],
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<SupplementMatch | null> {
  // Fetch all supplement names from database
  const { data: supplements, error } = await supabaseAdmin
    .from('supplement_database')
    .select('id, name')
    .limit(500);

  if (error || !supplements?.length) {
    console.error('[MATCH] Error fetching supplements:', error);
    return null;
  }

  // Simple fuzzy matching: check if product name or ingredients contain supplement name
  const searchTerms = [productName.toLowerCase(), ...ingredients.map(i => i.toLowerCase())].join(' ');
  
  let bestMatch: SupplementMatch | null = null;
  let bestScore = 0;

  for (const supp of supplements) {
    const suppNameLower = supp.name.toLowerCase();
    const suppNameParts = suppNameLower.split(/[\s\-()]+/);
    
    // Check exact match
    if (searchTerms.includes(suppNameLower)) {
      const score = 0.95;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { id: supp.id, name: supp.name, confidence: score };
      }
    }
    
    // Check partial match
    for (const part of suppNameParts) {
      if (part.length > 3 && searchTerms.includes(part)) {
        const score = 0.7;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { id: supp.id, name: supp.name, confidence: score };
        }
      }
    }
  }

  console.log('[MATCH] Best match:', bestMatch?.name, 'with confidence:', bestScore);
  return bestMatch;
}

async function checkDuplicate(
  url: string,
  asin: string | null,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<boolean> {
  // Check if URL already submitted
  const { data: existingUrl } = await supabaseAdmin
    .from('product_submissions')
    .select('id')
    .eq('submitted_url', url)
    .eq('status', 'approved')
    .single();

  if (existingUrl) return true;

  // Check if ASIN already exists in supplement_products (if Amazon)
  if (asin) {
    const { data: existingProduct } = await supabaseAdmin
      .from('supplement_products')
      .select('id')
      .eq('amazon_asin', asin)
      .single();

    if (existingProduct) return true;
  }

  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions(req);

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errJson('Unauthorized', req, 401);
    }

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return errJson('Unauthorized', req, 401);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return errJson('URL is required', req, 400);
    }

    // Validate URL format
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Extract domain
    const domain = extractDomain(formattedUrl);
    if (!domain) {
      return errJson('Invalid URL format', req, 400);
    }

    // Check if domain is supported (warning only, still proceed)
    const isSupported = SUPPORTED_DOMAINS.some(d => domain.includes(d) || d.includes(domain));
    console.log('[SCRAPE] Domain:', domain, 'Supported:', isSupported);

    // Extract ASIN for Amazon links
    const asin = domain.includes('amazon') ? extractAsin(formattedUrl) : null;

    // Check for duplicates
    const isDuplicate = await checkDuplicate(formattedUrl, asin, supabaseAdmin);
    if (isDuplicate) {
      return okJson({
        success: false,
        error: 'DUPLICATE',
        message: 'Dieses Produkt ist bereits in der Datenbank vorhanden',
      }, req);
    }

    // Scrape page content
    const rawContent = await scrapeWithFirecrawl(formattedUrl);
    if (!rawContent) {
      return errJson('Produktdaten konnten nicht geladen werden. Bitte versuche es später erneut.', req, 500);
    }

    // Classify and extract with LLM
    const { isSupplement, product, reason } = await classifyAndExtractWithLLM(rawContent, formattedUrl, domain);
    
    if (!isSupplement || !product) {
      return okJson({
        success: false,
        error: 'NOT_SUPPLEMENT',
        message: `Das Produkt scheint kein Nahrungsergänzungsmittel zu sein: ${reason}`,
      }, req);
    }

    // Add ASIN and calculate price per serving
    const enrichedProduct: ScrapedProduct = {
      ...product,
      amazon_asin: asin,
      amazon_image: null,
      price_per_serving: (product.price_eur && product.servings_per_pack)
        ? product.price_eur / product.servings_per_pack
        : null,
    };

    // Match to supplement database
    const matchedSupplement = await matchSupplement(
      product.product_name,
      product.ingredients || [],
      supabaseAdmin
    );

    // Create submission record
    const { data: submission, error: insertError } = await supabaseAdmin
      .from('product_submissions')
      .insert({
        user_id: user.id,
        submitted_url: formattedUrl,
        source_domain: domain,
        supplement_id: matchedSupplement?.id || null,
        status: 'pending',
        extracted_data: enrichedProduct,
        product_name: enrichedProduct.product_name,
        brand_name: enrichedProduct.brand_name,
        price_eur: enrichedProduct.price_eur,
        servings: enrichedProduct.servings_per_pack,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[SUBMIT] Insert error:', insertError);
      
      // Check for duplicate constraint violation
      if (insertError.code === '23505') {
        return okJson({
          success: false,
          error: 'DUPLICATE',
          message: 'Du hast diesen Link bereits eingereicht',
        }, req);
      }
      
      return errJson('Fehler beim Speichern der Einreichung', req, 500);
    }

    console.log('[SUBMIT] Submission created:', submission.id);

    return okJson({
      success: true,
      is_valid_supplement: true,
      matched_supplement: matchedSupplement,
      extracted: enrichedProduct,
      submission_id: submission.id,
      is_duplicate: false,
      domain_supported: isSupported,
    }, req);

  } catch (error) {
    console.error('[ERROR] Unhandled exception:', error);
    return errJson('Interner Server-Fehler', req, 500);
  }
});
