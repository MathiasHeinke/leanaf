
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const requestStartTime = Date.now();
  console.log('🚀 [ANALYZE-MEAL] Request started at:', new Date().toISOString());
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    
    // Input validation and sanitization
    const sanitizeText = (text: string): string => {
      if (!text || typeof text !== 'string') return '';
      return text.trim().slice(0, 5000); // Limit to 5k characters for meal descriptions
    };
    
    const validateImages = (images: any[]): string[] => {
      if (!Array.isArray(images)) return [];
      return images
        .slice(0, 5) // Limit to 5 images max
        .filter(url => typeof url === 'string' && url.startsWith('http'))
        .map(url => url.slice(0, 2000)); // Limit URL length
    };
    
    const text = sanitizeText(requestBody.text);
    const images = validateImages(requestBody.images || []);
    
    console.log('📋 [ANALYZE-MEAL] Request payload:', {
      hasText: !!text,
      textLength: text?.length || 0,
      textPreview: text ? text.substring(0, 100) + '...' : 'NO TEXT',
      hasImages: !!images,
      imageCount: images?.length || 0,
      imageUrls: images ? images.map((url: string) => url.substring(0, 50) + '...') : 'NO IMAGES'
    });
    
    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );
    
    // Check rate limit for unauthenticated requests (by IP) - now more robust
    try {
      const { data: rateLimitResult, error: rateLimitError } = await supabaseClient.rpc('check_and_update_rate_limit', {
        p_identifier: clientIP,
        p_endpoint: 'analyze-meal',
        p_window_minutes: 60,
        p_max_requests: 500 // Increased from 100 to 500 requests per hour
      });
      
      // Only block if rate limiting is working AND limit is exceeded
      if (rateLimitResult && !rateLimitResult.allowed) {
        console.log('🚫 [ANALYZE-MEAL] Rate limit exceeded for IP:', clientIP);
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retry_after: rateLimitResult?.retry_after_seconds || 3600
        }), {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult?.retry_after_seconds || 3600)
          }
        });
      }
      
      if (rateLimitError) {
        console.warn('⚠️ [ANALYZE-MEAL] Rate limit check failed, continuing anyway:', rateLimitError);
      }
    } catch (rateLimitException) {
      console.warn('⚠️ [ANALYZE-MEAL] Rate limit check failed with exception, continuing anyway:', rateLimitException);
    }

    // Authentication verification - REQUIRED
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🚫 [ANALYZE-MEAL] Missing or invalid authorization header');
      return new Response(JSON.stringify({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      console.log('🚫 [ANALYZE-MEAL] Authentication failed:', authError?.message);
      return new Response(JSON.stringify({ 
        error: 'Authentication failed',
        code: 'AUTH_FAILED'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = user.id;
    console.log(`👤 [ANALYZE-MEAL] Authenticated user: ${userId}`);
    
    // Check if user has active subscription
    const { data: subscriber } = await supabaseClient
      .from('subscribers')
      .select('subscribed, subscription_tier')
      .eq('user_id', user.id)
      .single();
      
    const userTier = subscriber?.subscribed ? 'pro' : 'free';
    
    // For free users, check usage limits
    if (userTier === 'free') {
      const { data: usageResult } = await supabaseClient.rpc('check_ai_usage_limit', {
        p_user_id: user.id,
        p_feature_type: 'meal_analysis'
      });
      
      if (!usageResult?.can_use) {
        console.log('⛔ [ANALYZE-MEAL] Usage limit exceeded for user:', user.id);
        return new Response(JSON.stringify({ 
          error: 'Daily usage limit exceeded. Upgrade to Pro for unlimited access.',
          code: 'USAGE_LIMIT_EXCEEDED',
          daily_remaining: usageResult?.daily_remaining || 0,
          monthly_remaining: usageResult?.monthly_remaining || 0
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Get coach personality
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('coach_personality')
      .eq('user_id', user.id)
      .single();
      
    const coachPersonality = profile?.coach_personality || 'motivierend';
    
    // Validate input - allow either text OR images OR both
    if (!text && (!images || images.length === 0)) {
      console.log('❌ [ANALYZE-MEAL] No input provided');
      throw new Error('Bitte geben Sie Text ein oder laden Sie ein Bild hoch');
    }

    // Extract user-provided nutritional values from text
    const extractUserValues = (text: string) => {
      const values: any = {};
      
      // Extract calories (kcal, kalorien)
      const calorieMatch = text.match(/(\d+)\s*(?:kcal|kalorien)/i);
      if (calorieMatch) values.calories = parseInt(calorieMatch[1]);
      
      // Extract protein
      const proteinMatch = text.match(/(\d+)\s*(?:g\s*)?protein/i);
      if (proteinMatch) values.protein = parseInt(proteinMatch[1]);
      
      // Extract carbs
      const carbsMatch = text.match(/(\d+)\s*(?:g\s*)?(?:carbs|kohlenhydrate)/i);
      if (carbsMatch) values.carbs = parseInt(carbsMatch[1]);
      
      // Extract fats
      const fatsMatch = text.match(/(\d+)\s*(?:g\s*)?(?:fett|fats)/i);
      if (fatsMatch) values.fats = parseInt(fatsMatch[1]);
      
      return values;
    };

    const userValues = text ? extractUserValues(text) : {};
    const hasUserValues = Object.keys(userValues).length > 0;

    const getPersonalityPrompt = (personality: string): string => {
      switch (personality) {
        case 'streng':
          return "Du bist Sascha - ein direkter, ehrlicher Ernährungsexperte. Sprich natürlich und menschlich, als würdest du mit einem Freund sprechen. Stell ruhig Rückfragen wenn du mehr wissen willst.";
        case 'liebevoll':
          return "Du bist Lucy - eine warmherzige, unterstützende Ernährungsberaterin. Sprich natürlich und freundlich, zeig echtes Interesse und stell gerne Nachfragen um besser zu helfen.";
        default:
          return "Du bist Kai - ein motivierender, energischer Coach. Sprich wie ein echter Kumpel, der sich für Fitness begeistert. Sei natürlich, stell Rückfragen und zeig Interesse an der Person.";
      }
    };

    let prompt = `${getPersonalityPrompt(coachPersonality)} 

Du analysierst Mahlzeiten und schätzt deren Nährwerte ein. Bleib dabei in deiner natürlichen Art - du musst nicht roboterhaft präzise sein, sondern kannst gerne auch mal nachfragen oder deine Gedanken teilen.

WICHTIGE REGELN:
- Respektiere IMMER vom User angegebene Nährwerte (z.B. "620kcal und 50g Protein")
- Verwende realistische Portionsgrößen
- Maximale Kalorienzahl pro normaler Portion: 800 kcal

REALISTISCHE PORTIONSGRÖSSEN - BEISPIELE:
- Rumpsteak 200g: 400-500 kcal, 50-60g Protein, 0g Carbs, 20-25g Fett
- Hähnchenbrust 150g: 250-300 kcal, 50g Protein, 0g Carbs, 3-5g Fett
- Pasta mit Sauce 300g: 400-500 kcal, 15g Protein, 70g Carbs, 12g Fett
- Reis mit Gemüse 250g: 300-400 kcal, 8g Protein, 70g Carbs, 5g Fett
- Sandwich: 350-450 kcal, 20g Protein, 40g Carbs, 15g Fett

${hasUserValues ? `
BENUTZER HAT FOLGENDE WERTE ANGEGEBEN - NUTZE DIESE ALS REFERENZ:
${Object.entries(userValues).map(([key, value]) => `${key}: ${value}`).join(', ')}
` : ''}

${text ? `Analysiere diese Mahlzeit: "${text}"` : ""}

${images?.length > 0 ? `
BILD-ANALYSE:
- Schätze die Portionsgröße anhand der Tellergröße und Lebensmittel-Proportionen
- Berücksichtige die Zubereitungsart (roh, gekocht, gebraten)
- Achte auf Beilagen und Saucen
- Normale Tellergröße = ca. 24-26cm Durchmesser als Referenz
` : ""}

Antworte AUSSCHLIESSLICH im folgenden JSON-Format:

{
  "title": "Prägnante Mahlzeit-Beschreibung",
  "items": [
    {
      "name": "Lebensmittel Name",
      "amount": "Realistische Menge mit Einheit",
      "calories": Kalorien_als_Zahl,
      "protein": Protein_in_Gramm,
      "carbs": Kohlenhydrate_in_Gramm,
      "fats": Fette_in_Gramm
    }
  ],
  "total": {
    "calories": Gesamtkalorien,
    "protein": Gesamt_Protein,
    "carbs": Gesamt_Kohlenhydrate,
    "fats": Gesamt_Fette
  },
  "confidence": "high|medium|low",
  "notes": "Erklärung der Schätzung und respektierte User-Werte"
}`;

    // Build user content with text and images
    let userContent = [{ type: 'text', text: prompt }];
    
    if (images && images.length > 0) {
      console.log('🖼️ [ANALYZE-MEAL] Adding images to request:', images.length);
      // Add each image to the content array
      images.forEach((imageUrl: string, index: number) => {
        console.log(`📷 [ANALYZE-MEAL] Image ${index + 1}:`, imageUrl.substring(0, 80) + '...');
        userContent.push({
          type: 'image_url',
          image_url: { url: imageUrl }
        });
      });
    }

    const messages = [
      {
        role: 'system',
        content: `Du bist ein präziser Ernährungsexperte. Nutze Referenz-Nährwertdatenbanken für genaue Angaben. 
        Respektiere IMMER vom User angegebene Nährwerte. Maximale Kalorienzahl pro normaler Portion: 800 kcal.
        Antworte nur mit dem angeforderten JSON-Format.`
      },
      {
        role: 'user',
        content: userContent
      }
    ];
    
    console.log('📤 [ANALYZE-MEAL] Sending request to OpenAI...');
    const openAIStartTime = Date.now();
    
    // Use GPT-4.1 for all users for better quality
    const aiModel = 'gpt-4.1-2025-04-14';
    console.log(`🤖 [ANALYZE-MEAL] Using AI model: ${aiModel} for ${userTier} user`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages,
        max_tokens: 1500,
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    const openAIEndTime = Date.now();
    const openAIDuration = openAIEndTime - openAIStartTime;
    console.log(`⏱️ [ANALYZE-MEAL] OpenAI API call took: ${openAIDuration}ms (${(openAIDuration/1000).toFixed(1)}s)`);

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ [ANALYZE-MEAL] OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: data.error
      });
      throw new Error(data.error?.message || 'OpenAI API Fehler');
    }

    console.log('✅ [ANALYZE-MEAL] OpenAI response received:', {
      choices: data.choices?.length || 0,
      usage: data.usage,
      model: data.model
    });

    const content = data.choices[0].message.content;
    console.log('📝 [ANALYZE-MEAL] Raw OpenAI content (first 200 chars):', content?.substring(0, 200) + '...');
    
    try {
      const parsed = JSON.parse(content);
      console.log('✅ [ANALYZE-MEAL] JSON parsing successful:', {
        hasTitle: !!parsed.title,
        itemsCount: parsed.items?.length || 0,
        hasTotal: !!parsed.total,
        totalCalories: parsed.total?.calories,
        confidence: parsed.confidence
      });
      
      // Enhanced sanity checks with stricter limits
      if (parsed.total && parsed.total.calories) {
        // More realistic sanity checks
        if (parsed.total.calories > 800) {
          console.warn('⚠️ [ANALYZE-MEAL] Unusual high calorie value detected:', parsed.total.calories);
          parsed.confidence = 'low';
          parsed.notes = (parsed.notes || '') + ' WARNUNG: Ungewöhnlich hohe Kalorienzahl - bitte prüfen.';
        }
        if (parsed.total.calories < 50) {
          console.warn('⚠️ [ANALYZE-MEAL] Unusual low calorie value detected:', parsed.total.calories);
          parsed.confidence = 'low';
          parsed.notes = (parsed.notes || '') + ' WARNUNG: Ungewöhnlich niedrige Kalorienzahl - bitte prüfen.';
        }
        if (parsed.total.protein > 80) {
          console.warn('⚠️ [ANALYZE-MEAL] Unusual high protein value detected:', parsed.total.protein);
          parsed.confidence = 'low';
          parsed.notes = (parsed.notes || '') + ' WARNUNG: Sehr hoher Proteinwert - bitte prüfen.';
        }
      }
      
      // Override with user-provided values if available
      if (hasUserValues) {
        console.log('🎯 [ANALYZE-MEAL] Applying user-provided values:', userValues);
        if (userValues.calories) parsed.total.calories = userValues.calories;
        if (userValues.protein) parsed.total.protein = userValues.protein;
        if (userValues.carbs) parsed.total.carbs = userValues.carbs;
        if (userValues.fats) parsed.total.fats = userValues.fats;
        
        parsed.confidence = 'high';
        parsed.notes = (parsed.notes || '') + ' Benutzerdefinierte Werte wurden berücksichtigt.';
      }
      
      const totalDuration = Date.now() - requestStartTime;
      console.log(`🎉 [ANALYZE-MEAL] Request completed successfully in ${totalDuration}ms (${(totalDuration/1000).toFixed(1)}s)`);
      
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('❌ [ANALYZE-MEAL] JSON Parse Error:', parseError);
      console.error('📄 [ANALYZE-MEAL] Raw content that failed to parse:', content);
      
      // Improved fallback response with more realistic values
      const fallbackResponse = {
        title: text || 'Analysierte Mahlzeit',
        items: [{
          name: text || 'Unbekannte Mahlzeit',
          amount: '1 Portion',
          calories: userValues.calories || 350,
          protein: userValues.protein || 20,
          carbs: userValues.carbs || 40,
          fats: userValues.fats || 12
        }],
        total: {
          calories: userValues.calories || 350,
          protein: userValues.protein || 20,
          carbs: userValues.carbs || 40,
          fats: userValues.fats || 12
        },
        confidence: 'low',
        notes: 'Fallback-Schätzung - bitte Werte überprüfen. ' + (hasUserValues ? 'Benutzerdefinierte Werte wurden berücksichtigt.' : 'Analyse-Fehler bei der KI-Antwort.')
      };
      
      console.log('🔄 [ANALYZE-MEAL] Using fallback response:', fallbackResponse);
      
      return new Response(JSON.stringify(fallbackResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    const totalDuration = Date.now() - requestStartTime;
    console.error('❌ [ANALYZE-MEAL] Error in analyze-meal function:', error);
    console.error('🕐 [ANALYZE-MEAL] Failed after:', `${totalDuration}ms (${(totalDuration/1000).toFixed(1)}s)`);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Ein unerwarteter Fehler ist aufgetreten'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
