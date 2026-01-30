/**
 * ARES Instant Check - Lightweight Supplement Analysis
 * 
 * Purpose: Stateless, one-shot supplement analysis without chat history
 * Model: Gemini 2.5 Flash (speed priority)
 * Response Time Target: < 3 seconds
 * 
 * Features:
 * - Persona-aware (Lester/ARES based on user's coach_personality)
 * - Full user context (stack, peptides, bloodwork, insights)
 * - Uses correct DB schemas (fixed from v1)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SupplementInput {
  name: string;
  dosage: string;
  unit: string;
  timing: string;
  brandName?: string;
  constraint?: string;
}

// Timing labels for display
const TIMING_LABELS: Record<string, string> = {
  morning: 'Morgens',
  noon: 'Mittags',
  evening: 'Abends',
  pre_workout: 'Vor Training',
  post_workout: 'Nach Training',
  with_meals: 'Zu den Mahlzeiten',
};

const CONSTRAINT_LABELS: Record<string, string> = {
  fasted: 'Nüchtern einnehmen',
  with_food: 'Mit Mahlzeit einnehmen',
  with_fats: 'Mit Fett einnehmen',
  pre_workout: 'Vor dem Training',
  post_workout: 'Nach dem Training',
  any: 'Flexibel',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user auth
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('[ARES-INSTANT-CHECK] Request for user:', userId);

    // Parse request body
    const body = await req.json();
    const supplement: SupplementInput = body.supplement;

    if (!supplement?.name) {
      return new Response(
        JSON.stringify({ error: 'Missing supplement data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ARES-INSTANT-CHECK] Analyzing:', supplement.name);

    // Create service role client for reading all data
    const svcClient = SUPABASE_SERVICE_ROLE_KEY 
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : supabase;

    // ═══════════════════════════════════════════════════════════════════════════
    // PARALLEL DATA LOADING - Corrected DB Schemas
    // ═══════════════════════════════════════════════════════════════════════════
    
    const startTime = Date.now();

    const [
      profileResult,
      stackResult,
      peptidesResult,
      bloodworkResult,
      insightsResult,
      goalsResult,
      coachMemoryResult,
    ] = await Promise.all([
      // 1. User Profile (CORRECTED: removed 'phase', added coach_personality)
      svcClient
        .from('profiles')
        .select('goal, weight, age, gender, protocol_mode, preferred_name, display_name, coach_personality, daily_calorie_target, protein_target_g')
        .eq('user_id', userId)
        .maybeSingle(),

      // 2. Current Supplement Stack (correct)
      svcClient
        .from('user_supplements')
        .select('name, dosage, unit, preferred_timing')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(20),

      // 3. Peptide Protocols (CORRECTED: use name, peptides JSONB, goal, is_active, phase)
      svcClient
        .from('peptide_protocols')
        .select('name, peptides, goal, is_active, phase')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(5),

      // 4. Bloodwork (CORRECTED: flat marker columns instead of marker_name/value)
      svcClient
        .from('user_bloodwork')
        .select('test_date, vitamin_d, vitamin_b12, ferritin, magnesium, zinc, iron, total_testosterone, free_testosterone, tsh, ft3, ft4, hba1c, creatinine, alt, ast, ggt, hdl, ldl, triglycerides, hscrp')
        .eq('user_id', userId)
        .order('test_date', { ascending: false })
        .limit(1),

      // 5. User Insights (CORRECTED: table is user_insights, not ares_user_insights)
      svcClient
        .from('user_insights')
        .select('category, insight, importance')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('importance', { ascending: false })
        .limit(10),

      // 6. Daily Goals (check if calories/protein exist)
      svcClient
        .from('daily_goals')
        .select('calories, protein, carbs, fats, fluid_goal_ml')
        .eq('user_id', userId)
        .maybeSingle(),

      // 7. Coach Memory (for preferred_name, mood, topics)
      svcClient
        .from('coach_memory')
        .select('memory_data')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    const loadTime = Date.now() - startTime;
    console.log(`[ARES-INSTANT-CHECK] Data loaded in ${loadTime}ms`);

    // Extract profile data
    const profile = profileResult.data || {};
    const goals = goalsResult.data || {};
    const coachMemory = coachMemoryResult.data?.memory_data as Record<string, any> || {};

    // ═══════════════════════════════════════════════════════════════════════════
    // LOAD PERSONA based on coach_personality
    // ═══════════════════════════════════════════════════════════════════════════

    // Map coach_personality to persona ID
    // 'soft' -> LESTER (science nerd), default -> ARES (spartan)
    const coachPersonality = profile.coach_personality || 'default';
    const personaId = coachPersonality === 'soft' ? 'lester' : 'ares';
    
    console.log(`[ARES-INSTANT-CHECK] Loading persona: ${personaId} (from coach_personality: ${coachPersonality})`);

    const personaResult = await svcClient
      .from('coach_personas')
      .select('id, name, language_style, dial_depth, dial_humor, dial_opinion, dial_warmth, dial_directness, dialect, phrases')
      .eq('id', personaId)
      .maybeSingle();

    const persona = personaResult.data;
    console.log(`[ARES-INSTANT-CHECK] Persona loaded:`, persona?.name || 'fallback to ARES');

    // ═══════════════════════════════════════════════════════════════════════════
    // FORMAT DATA FOR PROMPT
    // ═══════════════════════════════════════════════════════════════════════════

    // Get user's preferred name from coach_memory or profile
    const userName = coachMemory.preferred_name || profile.preferred_name || profile.display_name || 'User';

    // Format stack for prompt
    const stack = (stackResult.data || []).filter((s: any) => s.name);
    const supplementNameLower = (supplement.name || '').toLowerCase();
    const stackSection = stack.length > 0
      ? stack
          .filter((s: any) => s.name.toLowerCase() !== supplementNameLower)
          .map((s: any) => `- ${s.name} (${s.dosage || '?'}${s.unit || ''}, ${TIMING_LABELS[s.preferred_timing] || s.preferred_timing || '?'})`)
          .join('\n') || 'Noch keine anderen Supplements'
      : 'Noch keine Supplements eingetragen';

    // Format peptides (CORRECTED: peptides is JSONB array)
    const peptides = (peptidesResult.data || []).filter((p: any) => p.is_active);
    let peptideSection = 'Keine aktiven Protokolle';
    if (peptides.length > 0) {
      const peptideLines: string[] = [];
      for (const protocol of peptides) {
        const peptideList = Array.isArray(protocol.peptides) ? protocol.peptides : [];
        for (const pep of peptideList) {
          const pepName = typeof pep === 'string' ? pep : (pep.name || pep.compound || 'Unbekannt');
          const pepDose = typeof pep === 'object' && pep.dose ? ` (${pep.dose})` : '';
          peptideLines.push(`- ${pepName}${pepDose}: ${protocol.goal || 'aktiv'}`);
        }
      }
      peptideSection = peptideLines.length > 0 ? peptideLines.join('\n') : 'Keine aktiven Protokolle';
    }

    // Format bloodwork (CORRECTED: flat columns instead of marker_name/value)
    const latestBloodwork = bloodworkResult.data?.[0];
    let bloodworkSection = 'Keine Blutwerte vorhanden';
    if (latestBloodwork) {
      const markers: string[] = [];
      if (latestBloodwork.vitamin_d) markers.push(`- Vitamin D: ${latestBloodwork.vitamin_d} ng/ml`);
      if (latestBloodwork.vitamin_b12) markers.push(`- B12: ${latestBloodwork.vitamin_b12} pg/ml`);
      if (latestBloodwork.magnesium) markers.push(`- Magnesium: ${latestBloodwork.magnesium} mg/dl`);
      if (latestBloodwork.zinc) markers.push(`- Zink: ${latestBloodwork.zinc} µg/dl`);
      if (latestBloodwork.ferritin) markers.push(`- Ferritin: ${latestBloodwork.ferritin} ng/ml`);
      if (latestBloodwork.iron) markers.push(`- Eisen: ${latestBloodwork.iron} µg/dl`);
      if (latestBloodwork.total_testosterone) markers.push(`- Testosteron: ${latestBloodwork.total_testosterone} ng/dl`);
      if (latestBloodwork.tsh) markers.push(`- TSH: ${latestBloodwork.tsh} mIU/L`);
      if (latestBloodwork.hba1c) markers.push(`- HbA1c: ${latestBloodwork.hba1c}%`);
      if (latestBloodwork.hscrp) markers.push(`- hsCRP: ${latestBloodwork.hscrp} mg/L`);
      bloodworkSection = markers.length > 0 ? markers.join('\n') : 'Keine relevanten Marker';
    }

    // Format insights (CORRECTED: use category/insight instead of insight_type/content)
    const insights = insightsResult.data || [];
    const relevantCategories = ['gewohnheiten', 'substanzen', 'gesundheit', 'koerper', 'praeferenzen', 'ernaehrung'];
    const insightSection = insights.length > 0
      ? insights
          .filter((i: any) => !i.category || relevantCategories.includes(i.category.toLowerCase()))
          .slice(0, 5)
          .map((i: any) => `- ${i.insight}`)
          .join('\n') || 'Keine bekannten Präferenzen'
      : 'Keine bekannten Präferenzen';

    // ═══════════════════════════════════════════════════════════════════════════
    // BUILD PERSONA-AWARE PROMPT
    // ═══════════════════════════════════════════════════════════════════════════

    const timingLabel = TIMING_LABELS[supplement.timing] || supplement.timing;
    const constraintLabel = supplement.constraint ? CONSTRAINT_LABELS[supplement.constraint] : null;

    // Build persona style block
    let personaStyleBlock = '';
    if (persona) {
      const depth = persona.dial_depth ?? 7;
      const humor = persona.dial_humor ?? 5;
      const opinion = persona.dial_opinion ?? 6;
      const warmth = persona.dial_warmth ?? 5;
      const directness = persona.dial_directness ?? 7;

      personaStyleBlock = `
PERSONA: ${persona.name?.toUpperCase() || 'ARES'}
Stil: ${persona.language_style || 'Direkt und wissenschaftlich fundiert'}
Tiefe: ${depth}/10 | Humor: ${humor}/10 | Meinung: ${opinion}/10 | Wärme: ${warmth}/10 | Direktheit: ${directness}/10
${persona.dialect ? `Dialekt-Hinweis: ${persona.dialect}` : ''}

PERSONA-SPEZIFISCHE ANWEISUNGEN:
${persona.name?.toLowerCase() === 'lester' ? `
- Du bist LESTER, der Wissenschafts-Nerd
- Erkläre wie ein Biochemie-Professor mit Humor
- Nutze Fachbegriffe (IGF-1, mTor, Bioavailability, etc.) und erkläre sie kurz
- Sei nerdig aber charmant, tiefgründig aber unterhaltsam
- Zeige echte Begeisterung für biochemische Zusammenhänge` : `
- Du bist ARES, der spartanische Krieger-Coach
- Direkt, keine Floskeln, effizient
- Fokus auf praktische Optimierung
- Klare Empfehlungen ohne Umschweife`}
`;
    } else {
      // Fallback to ARES style
      personaStyleBlock = `
PERSONA: ARES
Stil: Direkt und effizient, spartanisch
Tiefe: 7/10 | Humor: 3/10 | Meinung: 8/10

PERSONA-SPEZIFISCHE ANWEISUNGEN:
- Direkt, keine Floskeln, effizient
- Fokus auf praktische Optimierung
- Klare Empfehlungen ohne Umschweife
`;
    }

    const systemPrompt = `Du bist ${persona?.name?.toUpperCase() || 'ARES'}, der Elite-Supplement-Auditor.
${personaStyleBlock}

ANTWORT-REGELN:
- Maximal 4 kurze Absätze, maximal 150 Wörter
- Nutze Emojis für Struktur (✅ ⏰ 💊 ⚠️ 💡)
- Keine Floskeln, keine Einleitungen wie "Klar" oder "Natürlich"
- Starte direkt mit der Bewertung
- Antworte IMMER auf Deutsch`;

    // Get calorie target from goals or profile
    const calorieTarget = goals.calories || profile.daily_calorie_target;

    const userPrompt = `## USER KONTEXT
- Protokoll: ${profile.protocol_mode || 'natural'}
- Ziel: ${profile.goal || 'nicht definiert'}${calorieTarget ? ` (${calorieTarget} kcal/Tag)` : ''}
- Alter: ${profile.age || '?'} | Gewicht: ${profile.weight || '?'}kg | Geschlecht: ${profile.gender || '?'}

## AKTUELLER STACK
${stackSection}

## AKTIVE PEPTIDE
${peptideSection}

## RELEVANTE BLUTWERTE
${bloodworkSection}

## BEKANNTE PRÄFERENZEN
${insightSection}

## ZU PRÜFENDES SUPPLEMENT
- Name: ${supplement.name}
- Marke: ${supplement.brandName || 'unbekannt'}
- Dosis: ${supplement.dosage} ${supplement.unit}
- Timing: ${timingLabel}
${constraintLabel ? `- Einnahme-Hinweis: ${constraintLabel}` : ''}

## AUFGABE
Bewerte dieses Supplement für ${userName}:
1. Passt es zu den Zielen?
2. Ist das Timing optimal?
3. Ist die Dosis angemessen?
4. Gibt es Interaktionen mit dem Stack/Peptiden?
5. Qualität der Marke (falls bekannt)?`;

    // Log the complete prompt for debugging
    console.log('[ARES-INSTANT-CHECK] === COMPLETE PROMPT ===');
    console.log('[ARES-INSTANT-CHECK] System:', systemPrompt.substring(0, 200) + '...');
    console.log('[ARES-INSTANT-CHECK] User:', userPrompt);
    console.log('[ARES-INSTANT-CHECK] === END PROMPT ===');

    // ═══════════════════════════════════════════════════════════════════════════
    // CALL GEMINI 2.5 FLASH
    // ═══════════════════════════════════════════════════════════════════════════

    if (!LOVABLE_API_KEY) {
      console.error('[ARES-INSTANT-CHECK] LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiStartTime = Date.now();

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.4, // Slightly higher for more personality
      }),
    });

    const aiTime = Date.now() - aiStartTime;
    console.log(`[ARES-INSTANT-CHECK] AI response in ${aiTime}ms`);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[ARES-INSTANT-CHECK] AI error:', aiResponse.status, errorText);

      // Try fallback model
      console.log('[ARES-INSTANT-CHECK] Trying fallback model...');
      const fallbackResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 500,
          temperature: 0.4,
        }),
      });

      if (!fallbackResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'AI analysis failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const fallbackData = await fallbackResponse.json();
      const analysis = fallbackData.choices?.[0]?.message?.content || 'Analyse konnte nicht generiert werden.';

      const totalTime = Date.now() - startTime;
      console.log(`[ARES-INSTANT-CHECK] Total time (with fallback): ${totalTime}ms`);

      return new Response(
        JSON.stringify({ 
          analysis, 
          persona: persona?.name || 'ARES',
          timing: { load: loadTime, ai: aiTime, total: totalTime } 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await aiResponse.json();
    const analysis = data.choices?.[0]?.message?.content || 'Analyse konnte nicht generiert werden.';

    const totalTime = Date.now() - startTime;
    console.log(`[ARES-INSTANT-CHECK] Total time: ${totalTime}ms`);

    return new Response(
      JSON.stringify({ 
        analysis, 
        persona: persona?.name || 'ARES',
        timing: { 
          load: loadTime, 
          ai: aiTime, 
          total: totalTime 
        } 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ARES-INSTANT-CHECK] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
