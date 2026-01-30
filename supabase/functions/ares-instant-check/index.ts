/**
 * ARES Instant Check - Lightweight Supplement Analysis
 * 
 * Purpose: Stateless, one-shot supplement analysis without chat history
 * Model: Gemini 2.5 Flash (speed priority)
 * Response Time Target: < 3 seconds
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

interface UserContext {
  goal?: string;
  phase?: number;
  weight?: number;
  age?: number;
  gender?: string;
  protocol_mode?: string;
  target_calories?: number;
  target_protein?: number;
}

interface SupplementStackItem {
  name: string;
  dosage: string;
  unit: string;
  timing: string;
}

interface PeptideProtocol {
  compound: string;
  status: string;
}

interface BloodworkMarker {
  marker_name: string;
  value: number;
  unit: string;
  test_date: string;
}

interface UserInsight {
  insight_type: string;
  content: string;
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
    // PARALLEL DATA LOADING - Minimize latency
    // ═══════════════════════════════════════════════════════════════════════════
    
    const startTime = Date.now();

    const [
      profileResult,
      stackResult,
      peptidesResult,
      bloodworkResult,
      insightsResult,
      goalsResult,
    ] = await Promise.all([
      // 1. User Profile
      svcClient
        .from('profiles')
        .select('goal, phase, weight, age, gender, protocol_mode, preferred_name, display_name')
        .eq('user_id', userId)
        .maybeSingle(),

      // 2. Current Supplement Stack
      svcClient
        .from('user_supplements')
        .select('name, dosage, unit, preferred_timing')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(20),

      // 3. Active Peptide Protocols
      svcClient
        .from('peptide_protocols')
        .select('compound, status, dose, frequency')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(10),

      // 4. Recent Bloodwork (last 90 days)
      svcClient
        .from('user_bloodwork')
        .select('marker_name, value, unit, test_date')
        .eq('user_id', userId)
        .gte('test_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('test_date', { ascending: false })
        .limit(15),

      // 5. User Insights (known preferences)
      svcClient
        .from('ares_user_insights')
        .select('insight_type, content')
        .eq('user_id', userId)
        .in('insight_type', ['preference', 'health_context', 'supplement_tolerance'])
        .limit(10),

      // 6. Daily Goals
      svcClient
        .from('daily_goals')
        .select('calories, protein, carbs, fats')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    const loadTime = Date.now() - startTime;
    console.log(`[ARES-INSTANT-CHECK] Data loaded in ${loadTime}ms`);

    // Extract data with fallbacks
    const profile = profileResult.data || {};
    const stack: SupplementStackItem[] = (stackResult.data || [])
      .filter((s: any) => s.name) // Filter out entries without name
      .map((s: any) => ({
        name: s.name,
        dosage: s.dosage || '?',
        unit: s.unit || '',
        timing: TIMING_LABELS[s.preferred_timing] || s.preferred_timing || 'Unbekannt',
      }));
    const peptides: PeptideProtocol[] = (peptidesResult.data || [])
      .filter((p: any) => p.compound) // Filter out entries without compound
      .map((p: any) => ({
        compound: p.compound,
        status: p.status || 'unknown',
      }));
    const bloodwork: BloodworkMarker[] = (bloodworkResult.data || [])
      .filter((b: any) => b.marker_name); // Filter out entries without marker_name
    const insights: UserInsight[] = insightsResult.data || [];
    const goals = goalsResult.data || {};

    // ═══════════════════════════════════════════════════════════════════════════
    // BUILD ANALYSIS PROMPT
    // ═══════════════════════════════════════════════════════════════════════════

    const userName = profile.preferred_name || profile.display_name || 'User';
    const timingLabel = TIMING_LABELS[supplement.timing] || supplement.timing;
    const constraintLabel = supplement.constraint ? CONSTRAINT_LABELS[supplement.constraint] : null;

    // Format stack for prompt (safely handle null/undefined names)
    const supplementNameLower = (supplement.name || '').toLowerCase();
    const stackSection = stack.length > 0
      ? stack
          .filter(s => s.name && s.name.toLowerCase() !== supplementNameLower) // Exclude current supplement
          .map(s => `- ${s.name} (${s.dosage}${s.unit}, ${s.timing})`)
          .join('\n') || 'Noch keine anderen Supplements'
      : 'Noch keine Supplements eingetragen';

    // Format peptides for prompt
    const peptideSection = peptides.length > 0
      ? peptides.map(p => `- ${p.compound} (${p.status})`).join('\n')
      : 'Keine';

    // Format relevant bloodwork (safely handle null marker names)
    const relevantMarkers = ['Vitamin D', 'Magnesium', 'Ferritin', 'B12', 'Zink', 'Eisen'];
    const bloodworkSection = bloodwork.length > 0
      ? bloodwork
          .filter(b => b.marker_name && relevantMarkers.some(m => 
            b.marker_name.toLowerCase().includes(m.toLowerCase())
          ))
          .slice(0, 5)
          .map(b => `- ${b.marker_name}: ${b.value} ${b.unit || ''}`)
          .join('\n') || 'Keine relevanten Marker verfügbar'
      : 'Keine Blutwerte vorhanden';

    // Format insights
    const insightSection = insights.length > 0
      ? insights.map(i => `- ${i.content}`).join('\n')
      : 'Keine bekannten Präferenzen';

    const systemPrompt = `Du bist ARES, der Elite-Supplement-Auditor. Du analysierst Supplements für ${userName} und gibst eine prägnante, personalisierte Bewertung.

STIL:
- Direkt und auf den Punkt
- Nutze Emojis für Struktur (✅ ⏰ 💊 ⚠️ 💡)
- Maximal 4 kurze Absätze
- Maximal 150 Wörter
- Keine Floskeln, keine Einleitungen`;

    const userPrompt = `## USER KONTEXT
- Phase: ${profile.phase || 'unbekannt'} | Protokoll: ${profile.protocol_mode || 'natural'}
- Ziel: ${profile.goal || 'nicht definiert'}${goals.calories ? ` (${goals.calories} kcal/Tag)` : ''}
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
- Dosis: ${supplement.dosage}${supplement.unit}
- Timing: ${timingLabel}
${constraintLabel ? `- Einnahme-Hinweis: ${constraintLabel}` : ''}

## AUFGABE
Bewerte dieses Supplement für ${userName}:
1. Passt es zu den Zielen?
2. Ist das Timing optimal?
3. Ist die Dosis angemessen?
4. Gibt es Interaktionen mit dem Stack/Peptiden?
5. Qualität der Marke (falls bekannt)?`;

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
        temperature: 0.3, // Low temperature for consistent, focused responses
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
          temperature: 0.3,
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
        JSON.stringify({ analysis, timing: { load: loadTime, ai: aiTime, total: totalTime } }),
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
