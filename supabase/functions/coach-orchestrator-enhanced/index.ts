import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { loadCoachPersona } from "./persona.ts";
import { loadRollingSummary, loadUserProfile, loadRecentDailySummaries } from "./memory.ts";

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

// Build ARES Phase 1 prompt with persona + memory
async function buildAresPrompt(supabase: any, userId: string, coachId: string, userText: string) {
  try {
    // Load persona with fallback
    const persona = await loadCoachPersona(supabase, coachId);
    console.log(`[ARES-PROMPT] Persona loaded: ${persona?.name || 'fallback'}`);
    
    // Load memory contexts
    const [memoryHint, userProfile, recentSummaries] = await Promise.all([
      loadRollingSummary(supabase, userId, coachId).catch(() => ''),
      loadUserProfile(supabase, userId).catch(() => ({})),
      loadRecentDailySummaries(supabase, userId, 3).catch(() => [])
    ]);
    
    console.log(`[ARES-PROMPT] Memory loaded: profile=${!!userProfile.goal}, summaries=${recentSummaries.length}`);
    
    // Build facts for context
    const facts = [];
    facts.push(`Du bist ${persona.name || 'ARES'} - ein direkter, mentaler Coach`);
    facts.push(`Dein Stil: ${persona.voice || 'klar, strukturiert, motivierend'}`);
    
    if (userProfile.goal) facts.push(`User-Ziel: ${userProfile.goal}`);
    if (userProfile.weight) facts.push(`Gewicht: ${userProfile.weight}kg`);
    if (userProfile.target_weight) facts.push(`Zielgewicht: ${userProfile.target_weight}kg`);
    if (userProfile.tdee) facts.push(`Kalorienbedarf: ${userProfile.tdee} kcal/Tag`);
    
    if (memoryHint) facts.push(`Gesprächskontext: ${memoryHint}`);
    
    // Training context from summaries
    const trainingDays = recentSummaries.filter(s => s.workout_volume > 0).length;
    if (trainingDays > 0) facts.push(`Training: ${trainingDays}/7 Tage aktiv`);
    
    // Build final prompt
    const prompt = [
      `Du bist ARES - ein direkter, masculiner Mentor-Coach.`,
      `Dein Stil: klar, strukturiert, leicht fordernd aber unterstützend.`,
      `Sprich wie ein Bruder, der fordert aber auch beschützt.`,
      `Nutze kurze, prägnante Sätze. Sei authentisch, nie künstlich.`,
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
    const body = await req.json().catch(() => ({}));
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