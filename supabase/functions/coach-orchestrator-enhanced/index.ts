import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { loadCoachPersona } from "./persona.ts";
import { loadRollingSummary, loadUserProfile, loadRecentDailySummaries, loadCoachAnalytics7d } from "./memory.ts";
import { loadUserMoodContext, decideAresDial, getRitualContext } from "./aresDial.ts";
// CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-trace-id, x-source, x-client-event-id, x-retry, x-chat-mode, x-user-timezone, x-current-date, prefer, accept, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Types
type CoachEvent =
  | { type: "TEXT"; text: string; clientEventId: string; context?: any }
  | { type: "IMAGE"; url: string; clientEventId: string; context?: any }
  | { type: "END"; clientEventId: string; context?: any };

type OrchestratorReply = { kind: "message"; text: string; end?: boolean; traceId?: string };

// Helpers
const getTraceId = (req: Request) => req.headers.get("x-trace-id") || crypto.randomUUID();

// Phase 1 & 2: Name-Context + Goal-Recall-Gate
async function buildAresPrompt(supabase: any, userId: string, coachId: string, userText: string) {
  try {
    // Load persona with fallback
    const persona = await loadCoachPersona(supabase, coachId);
    console.log(`[ARES-PROMPT] Persona loaded: ${persona?.name || 'fallback'}`);
    
    // Load memory + context in parallel
    const [
      memoryHint,
      userProfile,
      recentSummaries,
      moodCtx,
      analytics7d,
      workoutRows,
      dailyGoals
    ] = await Promise.all([
      loadRollingSummary(supabase, userId, coachId).catch(() => ''),
      loadUserProfile(supabase, userId).catch(() => ({})),
      loadRecentDailySummaries(supabase, userId, 3).catch(() => []),
      loadUserMoodContext(supabase, userId).catch(() => ({})),
      loadCoachAnalytics7d(supabase, userId).catch(() => ({})),
      supabase
        .from('daily_summaries')
        .select('date, workout_volume')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(7)
        .then((r: any) => r.data || [])
        .catch(() => []),
      supabase
        .rpc('ensure_daily_goals', { user_id_param: userId })
        .then((r: any) => r?.data || null)
        .catch(() => null)
    ]);
    
    console.log(`[ARES-PROMPT] Memory loaded: profile=${!!userProfile.goal}, summaries=${recentSummaries.length}, workoutsRows=${Array.isArray(workoutRows) ? workoutRows.length : 0}`);
    
    // Phase 1: Name fallback logic
    const userName = userProfile.preferred_name || userProfile.display_name || userProfile.first_name || null;
    const greetName = userName ? `User heißt: ${userName}` : "Name unbekannt - einmal freundlich erfragen";
    console.log(`[ARES-NAME] User name resolved: ${userName || 'NONE'}`);
    
    // Phase 2: Goal-Recall-Gate (context-triggered goals)
    const shouldRecallGoals = isGoalRelevant(userText, userProfile, recentSummaries);
    console.log(`[ARES-GOALS] Goal recall gate: ${shouldRecallGoals ? 'TRIGGERED' : 'SUPPRESSED'}`);
    
    // ARES Dial + Ritual
    const ritualCtx = getRitualContext();
    const dial = decideAresDial(moodCtx || {}, userText);
    
    // Build facts for context
    const facts = [];
    facts.push(`Du bist ${persona.name || 'ARES'} - ein direkter, mentaler Coach`);
    facts.push(`Dein Stil: ${persona.voice || 'klar, strukturiert, motivierend'}`);
    facts.push(greetName);
    facts.push(`ARES-Dial: ${dial.dial} – Archetyp: ${dial.archetype} (${dial.reason})`);
    if (ritualCtx?.ritual) {
      facts.push(`Ritual aktiv: ${ritualCtx.ritual.type} – Prompt: ${ritualCtx.ritual.prompt_key}`);
    }
    
    // Only add goals if goal-gate is triggered
    if (shouldRecallGoals && userProfile.goal) {
      facts.push(`User-Ziel: ${userProfile.goal}`);
    }
    
    if (userProfile.weight) facts.push(`Gewicht: ${userProfile.weight}kg`);
    if (userProfile.target_weight) facts.push(`Zielgewicht: ${userProfile.target_weight}kg`);
    if (userProfile.tdee) facts.push(`Kalorienbedarf: ${userProfile.tdee} kcal/Tag`);
    
    // Daily goals (if available and goal gate open)
    const textLower = userText.toLowerCase();
    const includeAnalytics = ['review','plan','planung','analyse','zusammenfassung','wochenbericht','bericht','report'].some(k => textLower.includes(k));
    if (shouldRecallGoals && dailyGoals) {
      const g = dailyGoals as any;
      const cal = g.calories ?? g.daily_calorie_target ?? null;
      const protein = g.protein ?? g.protein_g ?? userProfile.protein_target_g ?? null;
      const steps = g.steps_goal ?? null;
      const fluids = g.fluid_goal_ml ?? g.fluids ?? null;
      const parts: string[] = [];
      if (cal) parts.push(`Kalorien ${cal}`);
      if (protein) parts.push(`Protein ${protein}g`);
      if (steps) parts.push(`Schritte ${steps}`);
      if (fluids) parts.push(`Flüssigkeit ${fluids}ml`);
      if (parts.length) facts.push(`Tagesziele: ${parts.join(', ')}`);
    }
    
    if (memoryHint) facts.push(`Gesprächskontext: ${memoryHint}`);
    
    // Training context from last 7 days (fixed)
    const trainingDays = Array.isArray(workoutRows) ? workoutRows.filter((d: any) => (d.workout_volume || 0) > 0).length : 0;
    if (trainingDays > 0) facts.push(`Training: ${trainingDays}/7 Tage aktiv`);
    
    // Include analytics if requested by text intent
    if (includeAnalytics && analytics7d) {
      const tr = (analytics7d as any).training || {};
      const nu = (analytics7d as any).nutrition || {};
      const sl = (analytics7d as any).sleep || {};
      if (tr) facts.push(`7d Training: Volumen ${Math.round(tr.total_volume_kg || 0)}kg, Tage ${tr.workout_days || 0}`);
      if (nu) facts.push(`7d Ernährung: Ø Kalorien ${Math.round(nu.avg_calories || 0)}, Ø Protein ${Math.round(nu.avg_protein || 0)}g`);
      if (sl?.avg_score) facts.push(`7d Schlaf: Ø Score ${Math.round(sl.avg_score)}`);
    }
    
    // Build final prompt
    const prompt = [
      `Du bist ARES - ein direkter, masculiner Mentor-Coach.`,
      `Dein Stil: klar, strukturiert, leicht fordernd aber unterstützend.`,
      `Sprich wie ein Bruder, der fordert aber auch beschützt.`,
      `Nutze kurze, prägnante Sätze. Sei authentisch, nie künstlich.`,
      userName ? `Sprich ${userName} mit Namen an wenn passend.` : `Frage einmal freundlich nach dem Namen.`,
      ``,
      `KONTEXT:`,
      ...facts,
      ``,
      `USER SAGT: "${userText}"`,
      ``,
      `Antworte als ARES - direkt, präzise, motivierend.`
    ].join('\n');
    
    return prompt;
    
  } catch (error) {
    console.error('[ARES-PROMPT] Error building prompt:', error);
    
    // Emergency fallback prompt
    return [
      `Du bist ARES - ein direkter Coach.`,
      `Antworte klar und strukturiert auf: "${userText}"`,
      `Sei motivierend aber ehrlich.`
    ].join('\n');
  }
}

// Phase 2: Goal-Recall-Gate - only mention goals when contextually relevant
function isGoalRelevant(userText: string, userProfile: any, recentSummaries: any[]): boolean {
  const text = userText.toLowerCase();
  
  // Explicit goal triggers
  const goalKeywords = ['ziel', 'goal', 'deadline', 'plan', 'blockiert', 'stuck', 'fortschritt', 'progress'];
  if (goalKeywords.some(keyword => text.includes(keyword))) {
    console.log('[ARES-GOALS] Explicit goal mention detected');
    return true;
  }
  
  // Daily review triggers
  const reviewKeywords = ['heute', 'morgen', 'woche', 'tag', 'review', 'bilanz', 'zusammenfassung'];
  if (reviewKeywords.some(keyword => text.includes(keyword))) {
    console.log('[ARES-GOALS] Daily review context detected');
    return true;
  }
  
  // Performance deviation triggers
  const recentMissedDays = recentSummaries.filter(s => s.workout_volume === 0).length;
  if (recentMissedDays >= 2) {
    console.log('[ARES-GOALS] Performance deviation detected');
    return true;
  }
  
  // Default: suppress goals
  return false;
}

// Generate ARES response using OpenAI
async function generateAresResponse(prompt: string, traceId: string) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    console.error('[ARES-RESPONSE] No OpenAI API key found');
    return "ARES System: OpenAI Verbindung nicht verfügbar. Konfiguration prüfen.";
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      console.error('[ARES-RESPONSE] OpenAI API error:', response.status);
      return "ARES System: Temporäre Verbindungsstörung. Versuche es gleich nochmal.";
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || "ARES antwortet nicht. Versuche es nochmal.";
    
    console.log(`[ARES-RESPONSE] Generated response length: ${generatedText.length}`);
    return generatedText;
    
  } catch (error) {
    console.error('[ARES-RESPONSE] Error:', error);
    return "ARES System: Unerwarteter Fehler. Melde das bitte den Entwicklern.";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    const requestHeaders = req.headers.get("access-control-request-headers") || "";
    const origin = req.headers.get("origin") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    console.log(`[ARES-PREFLIGHT] Origin: ${origin}, Request-Headers: ${requestHeaders}, UA: ${userAgent.substring(0, 50)}`);
    return new Response(null, { headers: corsHeaders });
  }

  const traceId = getTraceId(req);
  const authorization = req.headers.get("Authorization") ?? "";
  const origin = req.headers.get("origin") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  
  console.log(`[ARES-ENHANCED-${traceId}] Request received from ${origin}`, {
    hasAuth: !!authorization,
    userAgent: userAgent.slice(0, 50)
  });

  // Create Supabase client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } }
  );

  try {
    // Phase 4: Edge Function Stabilization - robust body parsing
    let body: any = {};
    try {
      const rawBody = await req.text();
      if (rawBody.trim()) {
        body = JSON.parse(rawBody);
      }
    } catch (parseError) {
      console.error(`[ARES-BODY-PARSE-${traceId}] JSON parse failed:`, parseError);
      // Try to recover from malformed JSON
      try {
        const rawBody = await req.text();
        console.log(`[ARES-BODY-RAW-${traceId}] Raw body:`, rawBody);
        if (rawBody.includes('"text"') || rawBody.includes('"message"')) {
          // Attempt basic text extraction
          const textMatch = rawBody.match(/"(?:text|message)"\s*:\s*"([^"]+)"/);
          if (textMatch) {
            body = { text: textMatch[1] };
            console.log(`[ARES-BODY-RECOVERY-${traceId}] Recovered text: ${textMatch[1]}`);
          }
        }
      } catch (recoveryError) {
        console.error(`[ARES-BODY-RECOVERY-${traceId}] Recovery failed:`, recoveryError);
      }
    }
    console.log(`[ARES-BODY-${traceId}] Parsed body:`, JSON.stringify(body, null, 2));
    
    // Health check for debugging - simplified check
    if (req.headers.get('x-health-check') === '1' || body?.action === 'health') {
      console.log(`[ARES-HEALTH-${traceId}] Health check requested`);
      return new Response(JSON.stringify({
        ok: true,
        traceId,
        timestamp: new Date().toISOString(),
        status: 'healthy'
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const event = body?.event as CoachEvent | undefined;
    const providedUserId = body?.userId as string | undefined;

    // More flexible event handling
    if (!event?.type && !body?.text && !body?.message) {
      console.log(`[ARES-VALIDATION-${traceId}] Missing event structure. Body keys: ${Object.keys(body)}`);
      return new Response(JSON.stringify({ error: "Missing event or text/message field" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // If we have direct text/message, create a TEXT event
    if (!event && (body?.text || body?.message)) {
      console.log(`[ARES-COMPAT-${traceId}] Creating TEXT event from direct message`);
      const userText = body.text || body.message;
      const syntheticEvent: CoachEvent = {
        type: "TEXT",
        text: userText,
        clientEventId: body.clientEventId || crypto.randomUUID()
      };
      // Process the synthetic event
      const coachId = body.coachId || 'ares';
      console.log(`[ARES-SYNTHETIC-${traceId}] Processing synthetic event: "${userText}"`);
      
      const prompt = await buildAresPrompt(supabase, providedUserId || 'anonymous', coachId, userText);
      const responseText = await generateAresResponse(prompt, traceId);
      
      return new Response(JSON.stringify({
        kind: "message",
        text: responseText,
        traceId
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get user ID
    let userId = providedUserId;
    if (!userId) {
      try {
        const { data } = await supabase.auth.getUser();
        userId = data.user?.id;
      } catch (error) {
        console.error(`[ARES-PHASE1-${traceId}] Auth error:`, error);
      }
    }

    if (!userId) {
      console.log(`[ARES-PHASE1-${traceId}] No user ID - auth required`);
      return new Response(JSON.stringify({ 
        kind: 'message', 
        text: 'Bitte logge dich ein, um mit ARES zu sprechen.', 
        traceId 
      }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Extract user text
    const userText = event.type === "TEXT" ? event.text : "Bild hochgeladen";
    const coachId = (event as any)?.context?.coachId ?? 'ares';
    
    console.log(`[ARES-PHASE1-${traceId}] Processing: user=${userId}, coach=${coachId}, text="${userText}"`);

    // Build prompt with persona + memory
    const prompt = await buildAresPrompt(supabase, userId, coachId, userText);
    console.log(`[ARES-PHASE1-${traceId}] Prompt built, length: ${prompt.length}`);

    // Generate response
    const responseText = await generateAresResponse(prompt, traceId);
    
    const reply: OrchestratorReply = {
      kind: "message",
      text: responseText,
      traceId
    };

    console.log(`[ARES-PHASE1-${traceId}] Response generated successfully`);
    return new Response(JSON.stringify(reply), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error(`[ARES-PHASE1-${traceId}] Error:`, error);
    
    const fallbackReply = {
      kind: "message",
      text: "ARES System: Unerwarteter Fehler aufgetreten. Versuche es nochmal.",
      traceId
    };
    
    return new Response(JSON.stringify(fallbackReply), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});