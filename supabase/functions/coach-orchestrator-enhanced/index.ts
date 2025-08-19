import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { loadCoachPersona } from "./persona.ts";
import { loadRollingSummary, loadUserProfile, loadRecentDailySummaries, loadCoachAnalytics7d } from "./memory.ts";
import { loadUserMoodContext, decideAresDial, getRitualContext } from "./aresDial.ts";

// ARES v2 imports
import { resolveUserName, persistNameAsked, loadNameState } from "./prompting/nameResolver.ts";
import { shouldRecallGoals, shouldRequestData } from "./prompting/gates.ts";
import { isRedundant, generateAlternative } from "./prompting/antiRepeat.ts";
import { pickVoiceLine, wantDeepFollowUp, detectTopic } from "./prompting/voice.ts";
import { dialSettings, mapLegacyDial } from "./prompting/dials.ts";
import { chooseModels, getModelParameters, shouldUseHighFidelity } from "./prompting/modelRouter.ts";
import { buildAresPromptV2, wantsExplanation, extractMetrics } from "./prompting/buildAresPromptV2.ts";
import { logTurnDebug, logNameResolverEvent, logGoalGateEvent, logAntiRepeatEvent, logModelRouterEvent, logToSupabase } from "./prompting/telemetry.ts";
import { loadMessageHistory, saveMessageHistory } from "./prompting/messageHistory.ts";
// CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-trace-id, x-source, x-client-event-id, x-retry, x-chat-mode, x-user-timezone, x-current-date, prefer, accept, x-supabase-api-version, x-ares-v2",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Types
type CoachEvent =
  | { type: "TEXT"; text: string; clientEventId: string; context?: any }
  | { type: "IMAGE"; url: string; clientEventId: string; context?: any }
  | { type: "END"; clientEventId: string; context?: any };

type OrchestratorReply = { kind: "message"; text: string; end?: boolean; traceId?: string; meta?: any };

// Helpers
const getTraceId = (req: Request) => req.headers.get("x-trace-id") || crypto.randomUUID();

// Centralized keyword gates
const KEYWORDS = {
  goal: ['ziel','goal','deadline','plan','blockiert','stuck','fortschritt','progress'],
  review: ['heute','morgen','woche','tag','review','bilanz','zusammenfassung','analyse','planung','report','bericht']
};

// Phase 1 & 2: Name-Context + Goal-Recall-Gate
async function buildAresPrompt(supabase: any, userId: string, coachId: string, userText: string): Promise<{ prompt: string; debug: any }> {
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
    
    console.log(`[ARES-PROMPT] Memory loaded: profile=${!!(userProfile && Object.keys(userProfile).length)}, summaries=${Array.isArray(recentSummaries) ? recentSummaries.length : 0}, workoutsRows=${Array.isArray(workoutRows) ? workoutRows.length : 0}`);
    
    // Phase 1: Name fallback logic (profile -> memory -> summaries)
    let userName: string | null = userProfile.preferred_name || userProfile.display_name || userProfile.first_name || userProfile.full_name || null;
    let nameSource: 'profile' | 'memory' | 'summary' | 'unknown' = userName ? 'profile' : 'unknown';

    function extractNameFromText(text: string): string | null {
      if (!text) return null;
      const t = String(text);
      // Common German/English self-intro patterns
      const patterns = [
        /\bich heiße\s+([A-ZÄÖÜ][a-zäöüß-]+)/i,
        /\bmein name ist\s+([A-ZÄÖÜ][a-zäöüß-]+)/i,
        /\bi am\s+([A-Z][a-z'-]+)/i,
        /\bi'm\s+([A-Z][a-z'-]+)/i,
        /\bname\s*:\s*([A-ZÄÖÜ][a-zäöüß-]+)/i,
        /\bhallo[,!\s]+([A-ZÄÖÜ][a-zäöüß-]+)/i
      ];
      for (const p of patterns) {
        const m = t.match(p);
        if (m && m[1]) return m[1];
      }
      return null;
    }

    if (!userName) {
      const fromMemory = extractNameFromText(memoryHint as string);
      if (fromMemory) { userName = fromMemory; nameSource = 'memory'; }
    }
    if (!userName && Array.isArray(recentSummaries) && recentSummaries.length) {
      const joined = recentSummaries.slice(0, 2).join('\n');
      const fromSummary = extractNameFromText(joined);
      if (fromSummary) { userName = fromSummary; nameSource = 'summary'; }
    }

    const greetName = userName ? `User heißt: ${userName}` : "Name unbekannt - einmal freundlich erfragen";
    console.log(`[ARES-NAME] User name resolved: ${userName || 'NONE'} (source=${nameSource})`);
    
    // Phase 2: Goal-Recall-Gate (context-triggered goals)
    const shouldRecallGoals = isGoalRelevant(userText, userProfile, recentSummaries);
    console.log(`[ARES-GOALS] Goal recall gate: ${shouldRecallGoals ? 'TRIGGERED' : 'SUPPRESSED'}`);
    
    // ARES Dial + Ritual
    const ritualCtx = getRitualContext();
    const dial = decideAresDial(moodCtx || {}, userText);
    
    // Build facts for context
    const facts: string[] = [];
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

    const debug = {
      facts,
      gates: { shouldRecallGoals, includeAnalytics },
      name: { resolved: userName, source: nameSource },
      persona: { name: persona?.name, voice: persona?.voice },
      dial,
      ritual: ritualCtx?.ritual || null
    };
    
    return { prompt, debug };
    
  } catch (error) {
    console.error('[ARES-PROMPT] Error building prompt:', error);
    
    // Emergency fallback prompt
    const prompt = [
      `Du bist ARES - ein direkter Coach.`,
      `Antworte klar und strukturiert auf: "${userText}"`,
      `Sei motivierend aber ehrlich.`
    ].join('\n');

    return { prompt, debug: { error: String(error) } };
  }
}

// Phase 2: Goal-Recall-Gate - only mention goals when contextually relevant
function isGoalRelevant(userText: string, _userProfile: any, _recentSummaries: any[]): boolean {
  const text = (userText || '').toLowerCase();
  if (KEYWORDS.goal.some(k => text.includes(k))) {
    console.log('[ARES-GOALS] Explicit goal mention detected');
    return true;
  }
  if (KEYWORDS.review.some(k => text.includes(k))) {
    console.log('[ARES-GOALS] Daily/weekly review context detected');
    return true;
  }
  // Default: suppress goals
  return false;
}

// Apply "Predigt-Detox" filter to remove repetitive motivational phrases
function applyPredigtDetox(text: string): string {
  const predigtPhrases = [
    /\b(dein ziel|das ziel|fokus auf|konzentrier|konzentriere dich|motivation|motiviert bleiben)\b/gi,
    /\b(bleib dran|durchhalten|nicht aufgeben|am ball bleiben)\b/gi,
    /\b(schritt für schritt|step by step|eins nach dem anderen)\b/gi,
    /\b(du schaffst das|du packst das|ich glaube an dich)\b/gi,
    /\b(gemeinsam|zusammen schaffen wir das|team)\b/gi
  ];
  
  let cleaned = text;
  
  // Replace repetitive phrases with more natural alternatives
  const alternatives = {
    'dein ziel': 'was du erreichen willst',
    'fokus auf': 'schau dir an',
    'konzentriere dich': 'leg den schwerpunkt auf',
    'motivation': 'antrieb',
    'bleib dran': 'mach weiter',
    'durchhalten': 'weitermachen',
    'schritt für schritt': 'nach und nach',
    'du schaffst das': 'das kriegst du hin',
    'gemeinsam': 'lass uns'
  };
  
  // Apply smart replacements (only if phrase appears more than once in conversation context)
  for (const [phrase, replacement] of Object.entries(alternatives)) {
    const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
    if ((cleaned.match(regex) || []).length > 1) {
      cleaned = cleaned.replace(regex, replacement);
    }
  }
  
  return cleaned;
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
  const useAresV2 = req.headers.get("x-ares-v2") === "1" || req.headers.get("x-ares-v2") === "true";
  
  console.log(`[ARES-ENHANCED-${traceId}] Request received from ${origin}`, {
    hasAuth: !!authorization,
    userAgent: userAgent.slice(0, 50),
    useV2: useAresV2
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
    
    // Debug mode flag (header or body)
    const debugMode = (req.headers.get('x-debug') === '1' || req.headers.get('x-debug') === 'true' || body?.debug === true);
    console.log(`[ARES-DEBUG-${traceId}] Debug mode: ${debugMode}`);

    // Health check for debugging - simplified check
    if (req.headers.get('x-health-check') === '1' || body?.action === 'health') {
      console.log(`[ARES-HEALTH-${traceId}] Health check requested`);
      return new Response(JSON.stringify({
        ok: true,
        traceId,
        timestamp: new Date().toISOString(),
        status: 'healthy',
        service: 'coach-orchestrator-enhanced'
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
      
      const built = await buildAresPrompt(supabase, providedUserId || 'anonymous', coachId, userText);
      const prompt = built.prompt;
      const debugInfo = built.debug;
      if (debugMode) {
        console.log(`[ARES-DEBUG-${traceId}] Prompt Built (synthetic):\n${prompt}`);
        console.log(`[ARES-DEBUG-${traceId}] Facts:`, debugInfo.facts);
        console.log(`[ARES-DEBUG-${traceId}] Gates:`, debugInfo.gates);
        console.log(`[ARES-DEBUG-${traceId}] Name:`, debugInfo.name);
      }
      const responseText = await generateAresResponse(prompt, traceId);
      
      return new Response(JSON.stringify({
        kind: "message",
        text: responseText,
        traceId,
         meta: {
           version: "v1",
           model: 'gpt-4o-mini',
           ...(debugMode ? { 
             debug: { 
               prompt, 
               ...debugInfo,
               tokensUsed: responseText.length * 0.75 // Rough estimate
             } 
           } : {})
         }
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
    
    console.log(`[ARES-PHASE1-${traceId}] Processing: user=${userId}, coach=${coachId}, text="${userText}", v2=${useAresV2}`);

    // Choose v1 or v2 implementation
    if (useAresV2) {
      // ARES v2 Implementation
      const startTime = Date.now();
      
      // Name Resolution
      const nameState = await loadNameState(supabase, userId, coachId);
      const identity = { userId, name: nameState?.name, askedAt: nameState?.askedAt };
      const nameResult = await resolveUserName(identity, async () => {
        const profile = await loadUserProfile(supabase, userId);
        return profile.preferred_name || profile.display_name || profile.first_name || null;
      });
      
      logNameResolverEvent({
        userId,
        action: nameResult.ask ? 'ask' : (nameResult.name ? 'found' : 'load'),
        name: nameResult.name,
        success: true
      });
      
      if (nameResult.setAskedAt) {
        await persistNameAsked(supabase, userId, coachId);
      }
      
      // Load context for v2
      const [userProfile, moodCtx] = await Promise.all([
        loadUserProfile(supabase, userId).catch(() => ({})),
        loadUserMoodContext(supabase, userId).catch(() => ({}))
      ]);
      
      // Map legacy dial to v2
      const legacyDial = decideAresDial(moodCtx, userText);
      const v2Dial = mapLegacyDial(legacyDial.dial);
      
      // Extract metrics and build v2 prompt
      const metrics = extractMetrics({ nutrition: {}, missed: {}, isReview: false });
      const promptCtx = {
        identity: { name: nameResult.name },
        dial: v2Dial,
        userMsg: userText,
        metrics,
        facts: { weight: userProfile.weight, goalWeight: userProfile.target_weight, tdee: userProfile.tdee },
        goals: userProfile.goal ? [{ short: userProfile.goal }] : null,
        personalityVersion: "v2"
      };
      
      const v2Prompt = buildAresPromptV2(promptCtx);
      
      // Model selection (pin to stable gpt-4.1 for reliability)
      const models = { 
        chat: 'gpt-4.1-2025-04-14', 
        tools: 'gpt-4o-mini' 
      };
      const modelParams = { max_completion_tokens: 1000 }; // GPT-4.1+ require max_completion_tokens, no temperature
      
      // Log model selection
      logModelRouterEvent({
        chatModel: models.chat,
        toolsModel: models.tools,
        reason: 'stable_pinned_for_v2',
        costSensitive: false,
        highFidelity: shouldUseHighFidelity(userText, promptCtx)
      });
      
      // Generate response with v2 model (with robust error handling and retry logic)
      let responseText = "ARES v2 antwortet nicht.";
      let usedV1Fallback = false;
      let finalModel = models.chat;
      
      // OpenAI API call with retry and downgrade chain
      const callOpenAI = async (model: string, attempt: number = 1): Promise<string> => {
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages: [{ role: 'system', content: v2Prompt.system }, { role: 'user', content: v2Prompt.user }],
              ...modelParams
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'No error body');
            const errorSnippet = errorText.substring(0, 200);
            console.error(`[ARES-V2-${traceId}] OpenAI API Error - Status: ${response.status}, Model: ${model}, Body: ${errorSnippet}`);
            
            // Handle rate limiting with retry
            if (response.status === 429 && attempt <= 3) {
              const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
              console.log(`[ARES-V2-${traceId}] Rate limited, retrying in ${delay}ms (attempt ${attempt})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return callOpenAI(model, attempt + 1);
            }
            
            // Handle server errors with retry
            if (response.status >= 500 && attempt <= 2) {
              const delay = 1000 * attempt;
              console.log(`[ARES-V2-${traceId}] Server error, retrying in ${delay}ms (attempt ${attempt})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return callOpenAI(model, attempt + 1);
            }
            
            throw new Error(`OpenAI API returned ${response.status}: ${errorSnippet}`);
          }
          
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (!content) {
            throw new Error("No content in OpenAI response");
          }
          
          console.log(`[ARES-V2-${traceId}] OpenAI response successful - Model: ${model}, Length: ${content.length}`);
          return content;
          
        } catch (error) {
          console.error(`[ARES-V2-${traceId}] OpenAI call failed - Model: ${model}, Attempt: ${attempt}, Error:`, error);
          throw error;
        }
      };
      
      try {
        // Try primary model first
        finalModel = models.chat;
        responseText = await callOpenAI(finalModel);
        
      } catch (primaryError) {
        console.log(`[ARES-V2-${traceId}] Primary model ${models.chat} failed, trying fallback model`);
        
        // Try fallback to gpt-4.1 if not already using it
        if (models.chat !== 'gpt-4.1-2025-04-14') {
          try {
            finalModel = 'gpt-4.1-2025-04-14';
            responseText = await callOpenAI(finalModel);
            console.log(`[ARES-V2-${traceId}] Fallback model successful`);
            
          } catch (fallbackError) {
            console.error(`[ARES-V2-${traceId}] Fallback model also failed, using v1 generator:`, fallbackError);
            usedV1Fallback = true;
            const legacyPrompt = `Du bist ARES - ein direkter Coach. Antworte klar auf: "${userText}"`;
            responseText = await generateAresResponse(legacyPrompt, traceId);
          }
        } else {
          console.error(`[ARES-V2-${traceId}] Already using stable model, falling back to v1:`, primaryError);
          usedV1Fallback = true;
          const legacyPrompt = `Du bist ARES - ein direkter Coach. Antworte klar auf: "${userText}"`;
          responseText = await generateAresResponse(legacyPrompt, traceId);
        }
      }
      
      // Load recent message history for anti-repeat
      const history = await loadMessageHistory(supabase, userId, coachId);
      
      // Check for redundancy
      const wasRedundant = isRedundant(responseText, history);
      logAntiRepeatEvent({
        candidate: responseText,
        isRedundant: wasRedundant,
        historySize: history.length,
        fallbackUsed: wasRedundant
      });
      
      if (wasRedundant) {
        responseText = generateAlternative(responseText, [
          "Du fragst nach Details - lass uns spezifischer werden.",
          "Sag mir mehr über deine aktuelle Situation.",
          "Was ist der nächste wichtige Schritt für dich?"
        ]);
      }
      
      // Apply "Predigt-Detox" filter - remove generic motivational phrases
      responseText = applyPredigtDetox(responseText);
      
      // Apply voice and anti-repeat
      const topic = detectTopic(userText);
      const voiceLine = pickVoiceLine(v2Prompt.extra.archetype as any, topic);
      const wantDeep = wantDeepFollowUp({ askedWhy: wantsExplanation(userText) });
      
      if (wantDeep) {
        responseText = `${voiceLine} ${responseText}`;
      }
      
      // Integrate name resolver UX
      if (nameResult.ask && nameResult.askText) {
        responseText = `${nameResult.askText} ${responseText}`;
        await persistNameAsked(supabase, userId, coachId);
      }
      
      // Update message history
      const newHistoryItem = { 
        text: responseText, 
        ts: Date.now(), 
        kind: (wantDeep ? "deep" : "short") as any
      };
      const updatedHistory = [...history, newHistoryItem];
      
      // Persist updated history
      await saveMessageHistory(supabase, userId, updatedHistory, coachId);
      
      // Persist full prompt to trace events
      try {
        await supabase.from('coach_trace_events').insert({
          trace_id: traceId,
          step: 'ares_v2_prompt',
          status: 'complete',
          data: {
            user_message: userText,
            response_text: responseText,
            model: models.chat,
            archetype: v2Prompt.extra.archetype,
            dial: v2Dial,
            processing_time_ms: Date.now() - startTime
          },
          full_prompt: `SYSTEM:\n${v2Prompt.system}\n\nUSER:\n${v2Prompt.user}`
        });
      } catch (promptPersistError) {
        console.warn(`[ARES-V2-${traceId}] Failed to persist prompt:`, promptPersistError);
      }
      
      // Log telemetry
      logTurnDebug({
        personaVersion: "v2",
        dial: v2Dial,
        archetype: v2Prompt.extra.archetype,
        nameKnown: !!nameResult.name,
        recallGoals: v2Prompt.extra.recallGoals,
        model: models.chat,
        temp: v2Prompt.extra.temp,
        maxWords: v2Prompt.extra.maxWords,
        responseLength: responseText.length,
        userMsgLength: userText.length,
        processingTimeMs: Date.now() - startTime
      });
      
      return new Response(JSON.stringify({
        kind: "message",
        text: responseText,
        traceId,
        meta: {
          version: "v2",
          usedV1Fallback,
          finalModel,
          antiRepeatTriggered: wasRedundant,
          dial: v2Dial,
          archetype: v2Prompt.extra.archetype,
          ...(debugMode ? { debug: { v2Prompt, models, nameResult } } : {})
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Legacy v1 implementation
    const built = await buildAresPrompt(supabase, userId, coachId, userText);
    const prompt = built.prompt;
    const debugInfo = built.debug;
    console.log(`[ARES-PHASE1-${traceId}] Prompt built, length: ${prompt.length}`);
    if (debugMode) {
      console.log(`[ARES-DEBUG-${traceId}] Prompt Built:\n${prompt}`);
      console.log(`[ARES-DEBUG-${traceId}] Facts:`, debugInfo.facts);
      console.log(`[ARES-DEBUG-${traceId}] Gates:`, debugInfo.gates);
      console.log(`[ARES-DEBUG-${traceId}] Name:`, debugInfo.name);
    }

    // Generate response
    const responseText = await generateAresResponse(prompt, traceId);
    
    const reply: OrchestratorReply = {
      kind: "message",
      text: responseText,
      traceId,
       meta: { 
         version: 'v1', 
         model: 'gpt-4o-mini',
         ...(debugMode ? { 
           debug: { 
             prompt, 
             ...debugInfo,
             tokensUsed: responseText.length * 0.75 // Rough estimate
           } 
         } : {})
       }
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