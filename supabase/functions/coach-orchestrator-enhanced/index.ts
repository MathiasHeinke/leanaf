import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fallbackFlow } from "./fallback.ts";
import { logUnmetTool, logTrace } from "./telemetry.ts";
import { logTraceEvent } from "../telemetry.ts";
import { loadCoachPersona } from "./persona.ts";
import { toLucyTone, toAresVoice } from "./tone.ts";
import { personaPreset } from "./persona.ts";
import { loadRollingSummary, loadUserProfile, loadRecentDailySummaries } from "./memory.ts";
import { llmOpenIntake, type Meta } from "./open-intake.ts";
import { saveShadowState, loadShadowState } from "./shadow-state.ts";

// CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-chat-mode, x-trace-id, x-source",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Types
type CoachEvent =
  | { type: "TEXT"; text: string; clientEventId: string; context?: any }
  | { type: "IMAGE"; url: string; clientEventId: string; context?: any }
  | { type: "END"; clientEventId: string; context?: any };

type IntentName =
  | "training"
  | "meal"
  | "weight"
  | "diary"
  | "supplement"
  | "advice"
  | "unknown";

interface Intent {
  name: IntentName;
  score: number;
  toolCandidate?: string | null;
}

type OrchestratorReply =
  | { kind: "message"; text: string; end?: boolean; traceId?: string }
  | { kind: "reflect"; text: string; traceId?: string }
  | { kind: "choice_suggest"; prompt: string; options: string[]; traceId?: string }
  | { kind: "clarify"; prompt: string; options: string[]; traceId?: string }
  | { kind: "confirm_save_meal"; prompt: string; proposal: any; traceId?: string }
  | { kind: "confirm_save_supplement"; prompt: string; proposal: any; traceId?: string };

// Thresholds
const THRESHOLDS = { tool: 0.7, clarify: 0.4 };

// Client event helpers for proper idempotency - robust error handling
async function upsertClientEvent(supabase: any, userId: string, clientEventId: string) {
  const insertResult = await supabase
    .from('client_events')
    .insert({ user_id: userId, client_event_id: clientEventId, status: 'RECEIVED' })
    .select('status, last_reply, created_at')
    .single();

  if (!insertResult.error) return { ok: true, created: true, status: 'RECEIVED' as const };

  // On conflict, fetch existing row
  const selectResult = await supabase
    .from('client_events')
    .select('status, last_reply, created_at')
    .eq('user_id', userId)
    .eq('client_event_id', clientEventId)
    .maybeSingle();

  if (selectResult.error) {
    // DO NOT continue silently - throw error for debugging
    throw new Error(`client_events upsert failed: ${insertResult.error.message} / ${selectResult.error.message}`);
  }

  return { 
    ok: true, 
    created: false, 
    status: selectResult.data?.status, 
    lastReply: selectResult.data?.last_reply, 
    createdAt: selectResult.data?.created_at 
  };
}

async function markFinal(supabase: any, userId: string, clientEventId: string, reply: any, traceId?: string) {
  try {
    await upsertClientEvent(supabase, userId, clientEventId);
  } catch (_e) {
    // ignore upsert errors, proceed to update
  }
  const updateResult = await supabase
    .from('client_events')
    .update({ status: 'FINAL', last_reply: reply, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('client_event_id', clientEventId);
  
  if (updateResult.error) {
    throw new Error(`client_events final update failed: ${updateResult.error.message}`);
  }
  
  if (traceId) {
    await logTraceEvent(supabase, {
      traceId,
      userId,
      coachId: undefined,
      stage: 'idempotency_final' as any,
      handler: 'coach-orchestrator-enhanced',
      status: 'OK',
      payload: { clientEventId }
    });
  }
}

// Helpers
const getTraceId = (req: Request) => req.headers.get("x-trace-id") || crypto.randomUUID();
const clarifyOptions = (intent: Intent): [string, string] => {
  if (intent.name === "unknown") return ["Training loggen", "Ernährung analysieren"];
  if (intent.name === "meal") return ["Ernährungs-Analyse", "Gewicht eintragen"];
  if (intent.name === "training") return ["Training loggen", "Tagebuch"];
  if (intent.name === "supplement") return ["Supplements analysieren", "Ernährung analysieren"];
  return ["Training", "Ernährung"];
};

function detectIntentWithConfidence(event: CoachEvent): Intent {
  // Text based heuristic
  const txt = event.type === "TEXT" ? (event.text || "") : "";
  const lower = txt.toLowerCase();
  if (/(bankdr|satz|rpe|wdh|reps|training|workout)/.test(lower)) return { name: "training", score: 0.85, toolCandidate: "training-orchestrator" };
  if (/(kalorien|kcal|skyr|banane|essen|mahlzeit|meal)/.test(lower)) return { name: "meal", score: 0.82, toolCandidate: "analyze-meal" };
  if (/(gewicht|kg|wiegen)/.test(lower)) return { name: "weight", score: 0.76, toolCandidate: "weight" };
  if (/(tagebuch|journal|stimmung|gratitude)/.test(lower)) return { name: "diary", score: 0.72, toolCandidate: "diary" };
  if (/(supplement|creatin|omega|vitamin|kapsel|dose)/.test(lower)) return { name: "supplement", score: 0.74, toolCandidate: "supplement" };
  // Image heuristic via context
  if (event.type === "IMAGE") {
    const t = event.context?.image_type;
    if (t === "food") return { name: "meal", score: 0.75, toolCandidate: "analyze-meal" };
    if (t === "exercise") return { name: "training", score: 0.7, toolCandidate: "training-orchestrator" };
    if (t === "supplement") return { name: "supplement", score: 0.7, toolCandidate: "supplement" };
  }
  return { name: "unknown", score: 0.2, toolCandidate: null };
}

// asMessage is defined inside the handler to apply persona tone

// Robust analysis intent detector for supplements (covers prüfen/überprüfen/checken variants)
const isAnalysisRequest = (t?: string) =>
  !!t && /\b(analysier|analysiere|bewerte|prüf(?:e|en)?|überprüf(?:e|en)?|check(?:e|en)?)\b.*\b(supplement|stack|supplements?)\b/i.test(t);

function suggestTimeFromType(name?: string) {
  const n = (name || '').toLowerCase();
  if (/(melatonin|zma|magnesium)/.test(n)) return 'abends';
  if (/(creatin|creatine)/.test(n)) return 'wann es passt';
  if (/(omega|fischöl|epa|dha)/.test(n)) return 'zu einer Mahlzeit';
  if (/(vitamin d|vit d|d3)/.test(n)) return 'morgens mit Fett';
  return 'abends ok';
}
// ---- Supplement follow-up parsing helpers ----
type ParsedFollowUp =
  | { kind: 'save'; pickIdx?: number }
  | { kind: 'update'; dose?: string | null; schedule?: { freq?: 'daily' | 'weekly' | 'custom'; time?: 'morning' | 'noon' | 'evening' | 'preworkout' | 'postworkout' | 'bedtime' | 'custom'; custom?: string | null } }
  | { kind: 'unknown' };

const YES_RE = /\b(ja|jep|yo|yup|klar|mach ?(das|es)|speicher(e)?|hinzu(?:füge|fuege)?|add|ok)\b/i;
const SAVE_RE = /\b(speicher|hinzu(?:fügen|fuegen)|add)\b/i;
const UPDATE_RE = /\b(änder[e]?|aendere|passe an|update|mach|stell[e]? um|setze)\b/i;

function parseDose(text: string): string | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(g|mg|mcg|µg|kapsel[n]?|caps?|tablette[n]?|ml|scoops?)\b/i);
  if (!m) return null;
  const qty = m[1].replace(',', '.');
  const unit = m[2].toLowerCase();
  return `${qty} ${unit}`;
}

function parseTime(text: string): 'morning' | 'noon' | 'evening' | 'preworkout' | 'postworkout' | 'bedtime' | 'custom' | null {
  if (/\bmorgens?\b|am morgen\b/i.test(text)) return 'morning';
  if (/\bmittags?\b|zu mittag\b/i.test(text)) return 'noon';
  if (/\babends?\b|am abend\b/i.test(text)) return 'evening';
  if (/\bvor dem training\b|pre[- ]?workout\b/i.test(text)) return 'preworkout';
  if (/\bnach dem training\b|post[- ]?workout\b/i.test(text)) return 'postworkout';
  if (/\bvor dem schlafen\b|schlaf(?:en)?s?zeit|bedtime\b/i.test(text)) return 'bedtime';
  return null;
}

function parseFreq(text: string): 'daily' | 'weekly' | 'custom' | null {
  if (/\btäglich|taeglich|jeden tag|daily\b/i.test(text)) return 'daily';
  if (/\bwöchentlich|woechentlich|1x pro woche|weekly\b/i.test(text)) return 'weekly';
  return null;
}

function parseFollowUp(text: string): ParsedFollowUp {
  const t = (text || '').trim();
  if (!t) return { kind: 'unknown' };
  if (YES_RE.test(t) || SAVE_RE.test(t)) return { kind: 'save' };
  if (UPDATE_RE.test(t)) {
    const dose = parseDose(t);
    const time = parseTime(t);
    const freq = parseFreq(t);
    const schedule: any = {};
    if (freq) schedule.freq = freq;
    if (time) schedule.time = time;
    const m = t.match(/\bum\s*(\d{1,2}:\d{2})\b/);
    if (m) { schedule.time = 'custom'; schedule.custom = m[1]; }
    return { kind: 'update', dose: dose ?? null, schedule: Object.keys(schedule).length ? schedule : undefined };
  }
  return { kind: 'unknown' };
}

// Feature flags helpers (JSON-based flags in user_feature_flags.metadata)
function mergeFlagMetadata(rows: Array<{ metadata?: Record<string, any> }>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const r of rows || []) {
    if (r?.metadata && typeof r.metadata === "object") {
      Object.assign(out, r.metadata);
    }
  }
  return out;
}
function isFlagOn(meta: Record<string, any> | null | undefined, key: string): boolean {
  if (!meta) return false;
  return Boolean((meta as any)[key]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const traceId = getTraceId(req);
  const authorization = req.headers.get("Authorization") ?? "";
  const chatMode = req.headers.get("x-chat-mode") ?? undefined;
  const source = req.headers.get("x-source") ?? "chat";

  // Create two Supabase clients: one for user data, one for system state
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } }
  );
  
  // Service role client for client_events (system state)
  const supabaseState = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const event = body?.event as CoachEvent | undefined;
    const providedUserId = body?.userId as string | undefined;

    if (!event || !event.type) {
      return new Response(JSON.stringify({ error: "Missing event" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Identify user if not provided
    let userId = providedUserId;
    if (!userId) {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? undefined;
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Persona & memory context - ARES Support
    const coachId = (event as any)?.context?.coachId ?? 'lucy';
    const persona = await loadCoachPersona(supabase, coachId);
    const memoryHint = await loadRollingSummary(supabase, userId, coachId);
    
    // ARES-specific voice generation or standard tone application
    const generateAresResponse = async (userText: string, userProfile: any, analytics: any) => {
      try {
        // Build protocol state from user data
        const protocolState = {
          training: analytics?.training ? [{
            date: new Date().toISOString().split('T')[0],
            session: 'general',
            lifts: [],
            rpe_avg: 7,
            notes: ''
          }] : [],
          nutrition: analytics?.nutrition ? [{
            date: new Date().toISOString().split('T')[0],
            kcal: analytics.nutrition.avg_calories || 2000,
            protein_g: analytics.nutrition.avg_protein || 100,
            carbs_g: analytics.nutrition.avg_carbs || 250,
            fat_g: analytics.nutrition.avg_fats || 70,
            meals: 3,
            notes: ''
          }] : [],
          dev: [{
            date: new Date().toISOString().split('T')[0],
            sleep_hours: analytics?.sleep?.avg_score ? (analytics.sleep.avg_score * 10 / 100) : 7,
            mood: 6,
            stress_keywords: [],
            misses: 0,
            alcohol_units: 0,
            wins: analytics?.training?.workout_days || 0
          }]
        };

        // ARES config based on user performance
        const performanceScore = (analytics?.training?.workout_days || 0) / 7;
        const aresConfig = {
          language: 'de' as const,
          humorHardnessBias: performanceScore > 0.5 ? 0.2 : -0.3,
          allowDrill: true,
          sentenceLength: {
            scale: 0.3, // Short sentences for ARES
            minWords: 3,
            maxWords: 8,
            jitter: 0.2
          },
          archetypeBlend: {
            commander: performanceScore > 0.7 ? 0.4 : 0.2,
            smith: 0.3,
            father: performanceScore < 0.3 ? 0.2 : 0.1,
            sage: 0.1,
            comrade: 0.2,
            hearth: 0.1,
            drill: performanceScore > 0.8 ? 0.1 : 0.05
          }
        };

        // Context tags from user text and situation
        const contextTags: string[] = [];
        const lowerText = userText.toLowerCase();
        if (/(training|workout|kraft)/.test(lowerText)) contextTags.push('push-day');
        if (/(abend|spät|müde)/.test(lowerText)) contextTags.push('evening');
        if (/(schlecht|miss|fail)/.test(lowerText)) contextTags.push('missed');

        // Call ARES voice generator
        const { data: aresResult, error } = await supabase.functions.invoke('ares-voice-generator', {
          body: { cfg: aresConfig, state: protocolState, contextTags }
        });

        if (error || !aresResult?.text) {
          console.error('ARES generator error:', error);
          return 'Wer jammert, hat schon verloren.'; // Fallback signature
        }

        return aresResult.text;
      } catch (error) {
        console.error('ARES response generation failed:', error);
        return 'Schwer ist korrekt. Weiter.'; // Fallback signature
      }
    };

    // Coach-specific tone functions
    const applyCoachTone = (txt: string) => {
      if (coachId === 'ares') {
        return toAresVoice(String(txt || ''), persona, { memoryHint, addSignOff: false });
      }
      return toLucyTone(String(txt || ''), persona, { memoryHint, addSignOff: false });
    };
    
    const asCoachMessage = (text: string, traceId: string): OrchestratorReply => ({ 
      kind: "message", 
      text: applyCoachTone(text), 
      traceId 
    });

    // Start timer for server ack measurement
    const t0 = Date.now();

    // Telemetry: received
    await logTraceEvent(supabase, {
      traceId,
      userId,
      coachId,
      stage: 'received',
      handler: 'coach-orchestrator-enhanced',
      status: 'RUNNING',
      payload: { type: event.type, source, chatMode }
    });

    // Early DEFERRED reply marker to reflect immediate client ack
    await logTraceEvent(supabase, {
      traceId,
      userId,
      coachId,
      stage: 'reply_send',
      handler: 'coach-orchestrator-enhanced',
      status: 'RUNNING',
      payload: { early: true, source, chatMode, clientEventId: (event as any)?.clientEventId ?? null }
    });
    try {
      await supabase.rpc('log_trace_event', { p_trace_id: traceId, p_stage: 'reply_send', p_data: { early: true, source, chatMode, clientEventId: (event as any)?.clientEventId ?? null } });
    } catch {
      // ignore rpc errors
    }

    // Robust idempotency with dedicated state table
    const retryHeader = req.headers.get('x-retry') === '1';
    const clientEventId = (event as any).clientEventId || crypto.randomUUID();
    
// Idempotency variant B: No early upsert to avoid stale RECEIVED rows.
// clientEventId is carried forward; we will persist only upon final reply.

    // Rate limit check
    try {
      const { data: rl } = await supabase.rpc('check_and_update_rate_limit', { p_identifier: userId, p_endpoint: 'coach-orchestrator-enhanced' });
      if (rl && rl.allowed === false) {
        const retry = rl.retry_after_seconds ?? 30;
        await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'error', handler: 'coach-orchestrator-enhanced', status: 'ERROR', payload: { rate_limited: true, retry } });
        try { await supabase.rpc('log_trace_event', { p_trace_id: traceId, p_stage: 'rate_limited', p_data: { retry } }); } catch {}
        return new Response(JSON.stringify(asCoachMessage(`Zu viele Anfragen – bitte in ${retry}s nochmal.`, traceId)), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 });
      }
    } catch {
      // ignore
    }

    // Load user feature flags
    const { data: flagRows } = await supabase
      .from('user_feature_flags')
      .select('metadata')
      .eq('user_id', userId ?? '');
    const userFlags = mergeFlagMetadata(flagRows || []);
    const convFirstEnv = Deno.env.get('CONVERSATION_FIRST_ENABLED') === 'true';
    const conversationFirstEnabled = isFlagOn(userFlags, 'conversation_first') || convFirstEnv || chatMode === 'dev';

    // Follow-up hint from FE (important to avoid reflect loop)
    const isFollowUp = Boolean(event?.context?.followup) || Boolean(event?.context?.last_proposal);

    // 1) OPEN-INTAKE: First response → ARES voice generator or LLM-first
    if (!isFollowUp && event?.type === 'TEXT') {
      const [profile, recentSummaries, analytics] = await Promise.all([
        loadUserProfile(supabase, userId),
        loadRecentDailySummaries(supabase, userId, 3),
        coachId === 'ares' ? supabase.rpc('get_coach_analytics_7d', { p_user_id: userId }).then(r => r.data || {}) : Promise.resolve({})
      ]);
      
      // ARES: Use voice generator instead of LLM
      if (coachId === 'ares') {
        await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'ares_voice_gen', handler: 'coach-orchestrator-enhanced', status: 'RUNNING' });
        
        const aresText = await generateAresResponse(event.text ?? '', profile, analytics);
        
        const reply = { 
          kind: 'message' as const, 
          text: aresText, 
          traceId 
        };
        
        await markFinal(supabaseState, userId, clientEventId, reply, traceId);
        await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'ares_voice_gen', handler: 'coach-orchestrator-enhanced', status: 'OK' });
        
        return new Response(JSON.stringify(reply), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      // Other coaches: Use LLM
      const out = await llmOpenIntake({ 
        userText: event.text ?? '', 
        coachId, 
        memoryHint,
        profile,
        recentSummaries,
        supabase
      });
      
      await saveShadowState(supabaseState, { userId, traceId, meta: out.meta });
      
      const reply = { 
        kind: 'reflect' as const, 
        text: applyCoachTone(out.assistant_text), 
        traceId 
      };
      
      await markFinal(supabaseState, userId, clientEventId, reply, traceId);
      return new Response(JSON.stringify(reply), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 2) FOLLOW-UP: Chips/action → Tools or continued conversation
    if (isFollowUp && event?.type === 'TEXT') {
      const shadowTraceId = event?.context?.shadowTraceId ?? traceId;
      const meta = await loadShadowState(supabaseState, { userId, traceId: shadowTraceId });
      
      // Parse follow-up intent
      const text = String(event?.text ?? '').toLowerCase().normalize('NFKD').replace(/\p{Diacritic}/gu,'').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
      let followUpAction: 'analyze' | 'save' | 'update' | 'continue' = 'continue';
      
      // Explicit tool requests
      if (/(analyse|analy|check|prüf|ueberpruef|interaktion|bewerte)/.test(text)) {
        followUpAction = 'analyze';
      } else if (/(speicher|hinzu|add|log|save)/.test(text)) {
        followUpAction = 'save';
      } else if (/(dosis|timing|zeit|schedule|anpassen|update|änder)/.test(text)) {
        followUpAction = 'update';
      }

      const lp = event?.context?.last_proposal; // { kind: 'supplement'|'meal', data: {...} }

      // Handle explicit tool requests
      if (lp?.kind === 'supplement' && (followUpAction === 'analyze' || followUpAction === 'save' || followUpAction === 'update')) {
        if (followUpAction === 'analyze') {
          await logTraceEvent(supabase, { traceId, userId, stage:'tool_exec', handler:'supplement-analysis', status:'RUNNING' });
          const { data, error } = await supabase.functions.invoke('supplement-analysis', {
            body: { userId, event, proposal: lp.data }, 
            headers: { 'x-trace-id': traceId, 'x-source': source, 'x-chat-mode': chatMode },
          });
          await logTraceEvent(supabase, { traceId, userId, stage:'tool_result', handler:'supplement-analysis', status: error?'ERROR':'OK' });
          const text = data?.summary ?? 'Kurz gecheckt. Soll ich es speichern oder Dosis/Timing anpassen?';
          const reply: OrchestratorReply = { kind: 'message', text: applyCoachTone(text), traceId };
          await markFinal(supabaseState, userId, clientEventId, reply, traceId);
          return new Response(JSON.stringify(reply), { headers:{...corsHeaders,'Content-Type':'application/json'} });
        }
        if (followUpAction === 'save' || followUpAction === 'update') {
          await logTraceEvent(supabase, { traceId, userId, stage:'tool_exec', handler:'supplement-save', status:'RUNNING' });
          const mode = followUpAction === 'save' ? 'insert' : 'update';
          const body = { 
            userId, 
            mode, 
            clientEventId: event.clientEventId ?? crypto.randomUUID(), 
            item: lp.data?.items?.[lp.data.topPickIdx ?? 0] ?? lp.data?.items?.[0] 
          };
          const { data, error } = await supabase.functions.invoke('supplement-save', {
            body, 
            headers: { 'x-trace-id': traceId, 'x-source': source, 'x-chat-mode': chatMode },
          });
          await logTraceEvent(supabase, { traceId, userId, stage:'tool_result', handler:'supplement-save', status: error?'ERROR':'OK', payload:{ action: data?.action } });
          const text = data?.action === 'insert' ? '✔️ Gespeichert. Dosis/Timing anpassen?' :
                       data?.action === 'update' ? '✅ Aktualisiert. Passt so?' : 
                       'Schon vorhanden – willst du etwas ändern?';
          const reply: OrchestratorReply = { kind: 'message', text: applyCoachTone(text), traceId };
          await markFinal(supabaseState, userId, clientEventId, reply, traceId);
          return new Response(JSON.stringify(reply), { headers:{...corsHeaders,'Content-Type':'application/json'} });
        }
      }

      if (lp?.kind === 'meal' && (followUpAction === 'analyze' || followUpAction === 'save')) {
        if (followUpAction === 'analyze') {
          await logTraceEvent(supabase, { traceId, userId, stage:'tool_exec', handler:'meal-analysis', status:'RUNNING' });
          const { data, error } = await supabase.functions.invoke('meal-analysis', {
            body: { userId, event, proposal: lp.data }, 
            headers: { 'x-trace-id': traceId, 'x-source': source, 'x-chat-mode': chatMode },
          });
          await logTraceEvent(supabase, { traceId, userId, stage:'tool_result', handler:'meal-analysis', status: error?'ERROR':'OK' });
          const text = data?.summary ?? 'Kurz gecheckt. Speichern oder später?';
           const reply: OrchestratorReply = { kind: 'message', text: applyCoachTone(text), traceId };
           await markFinal(supabaseState, userId, clientEventId, reply, traceId);
           return new Response(JSON.stringify(reply), { headers:{...corsHeaders,'Content-Type':'application/json'} });
        }
        if (followUpAction === 'save') {
          await logTraceEvent(supabase, { traceId, userId, stage:'tool_exec', handler:'meal-save', status:'RUNNING' });
          const { data, error } = await supabase.functions.invoke('meal-save', {
            body: { userId, clientEventId: event.clientEventId ?? crypto.randomUUID(), item: lp.data }, 
            headers: { 'x-trace-id': traceId,'x-source': source,'x-chat-mode': chatMode },
          });
           await logTraceEvent(supabase, { traceId, userId, stage:'tool_result', handler:'meal-save', status: error?'ERROR':'OK' });
           const text = data?.success ? '🍽️ gespeichert! Was steht als nächstes an?' : 'Konnte nicht speichern – nochmal?';
           const reply: OrchestratorReply = { kind: 'message', text: applyCoachTone(text), traceId };
           await markFinal(supabaseState, userId, clientEventId, reply, traceId);
           return new Response(JSON.stringify(reply), { headers:{...corsHeaders,'Content-Type':'application/json'} });
        }
      }

      // Continue conversation with open intake (no explicit tool request)
      if (followUpAction === 'continue') {
        const [profile, recentSummaries] = await Promise.all([
          loadUserProfile(supabase, userId),
          loadRecentDailySummaries(supabase, userId, 3)
        ]);
        
        const out = await llmOpenIntake({ 
          userText: event.text ?? '', 
          coachId, 
          memoryHint,
          profile,
          recentSummaries,
          supabase
        });
        
        await saveShadowState(supabaseState, { userId, traceId, meta: out.meta });
        
        const reply = { 
          kind: 'message' as const, 
          text: applyCoachTone(out.assistant_text), 
          traceId 
        };
        
        await markFinal(supabaseState, userId, clientEventId, reply, traceId);
        return new Response(JSON.stringify(reply), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // unknown follow-up → gentle chips (fallback)
      return new Response(JSON.stringify({
        kind:'choice_suggest',
        prompt:'Wie machen wir weiter?',
        options:['Kurze Analyse','Speichern','Später'],
        traceId
      }), { headers:{...corsHeaders,'Content-Type':'application/json'} });
    }

    // 2) REFLECT-FIRST: Initial TEXT/IMAGE, only if flag on and no follow-up
    if (conversationFirstEnabled && !isFollowUp) {
      if (event.type === 'TEXT') {
        const intentQuick = detectIntentWithConfidence(event);
        await logTraceEvent(supabase, {
          traceId,
          userId,
          coachId,
          stage: 'intent_from_text',
          handler: 'coach-orchestrator-enhanced',
          status: 'OK',
          payload: intentQuick as any,
        });
        const domLabel = intentQuick.name === 'meal' ? 'Ernährung' : intentQuick.name === 'training' ? 'Training' : intentQuick.name === 'supplement' ? 'Supplements' : 'dem Thema';
        const reflectTextRaw = intentQuick.name === 'unknown'
          ? `Ich lese: „${(((event as any).text)||'').toString().slice(0,80)}“. Geht’s um Ernährung, Training oder Supplements – oder etwas anderes?`
          : `Klingt nach ${domLabel}. Willst du eher eine kurze Analyse, etwas speichern oder erstmal Infos?`;
        const reflectText = applyCoachTone(reflectTextRaw);
        await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'reflect', handler: 'coach-orchestrator-enhanced', status: 'OK' });
        await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'reply_send', handler: 'coach-orchestrator-enhanced', status: 'OK', latencyMs: Date.now() - t0, payload: { kind: 'reflect' } });
        try { await supabase.rpc('log_trace_event', { p_trace_id: traceId, p_stage: 'reply_send', p_data: { kind: 'reflect' } }); } catch {}
        return new Response(JSON.stringify({ kind: 'reflect', text: reflectText, traceId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-trace-id': traceId } });
      }
      if (event.type === 'IMAGE') {
        const textRaw = 'Danke fürs Bild – ich schau kurz, worum es geht. Magst du sagen, was dich daran interessiert?';
        const text = applyCoachTone(textRaw);
        await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'reflect', handler: 'coach-orchestrator-enhanced', status: 'OK' });
        await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'reply_send', handler: 'coach-orchestrator-enhanced', status: 'OK', latencyMs: Date.now() - t0, payload: { kind: 'reflect' } });
        try { await supabase.rpc('log_trace_event', { p_trace_id: traceId, p_stage: 'reply_send', p_data: { kind: 'reflect' } }); } catch {}
        return new Response(JSON.stringify({ kind: 'reflect', text, traceId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-trace-id': traceId } });
      }
      await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'reply_send', handler: 'coach-orchestrator-enhanced', status: 'OK', latencyMs: Date.now() - t0, payload: { kind: 'choice_suggest' } });
      try { await supabase.rpc('log_trace_event', { p_trace_id: traceId, p_stage: 'reply_send', p_data: { kind: 'choice_suggest' } }); } catch {}
      return new Response(JSON.stringify({ kind: 'choice_suggest', prompt: 'Wie machen wir weiter?', options: ['Kurze Analyse','Speichern','Später'], traceId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-trace-id': traceId } });
    }

    // Auto-classify image if missing image_type to improve routing
    if (event.type === "IMAGE" && !(event as any).context?.image_type && (event as any).url) {
      const tStart = Date.now();
      await logTraceEvent(supabase, {
        traceId,
        userId,
        coachId,
        stage: 'tool_exec',
        handler: 'image-classifier',
        status: 'RUNNING',
        payload: { action: 'classify_image' }
      });
      const { data: cls, error: clsErr } = await supabase.functions.invoke("image-classifier", {
        body: { imageUrl: (event as any).url, userId },
        headers: { "x-trace-id": traceId, "x-source": source, "x-chat-mode": chatMode ?? "" },
      });
      const detectedCategory = (cls as any)?.classification?.category ?? 'unknown';
      await logTraceEvent(supabase, {
        traceId,
        userId,
        coachId,
        stage: 'tool_result',
        handler: 'image-classifier',
        status: clsErr ? 'ERROR' : 'OK',
        latencyMs: Date.now() - tStart,
        payload: { category: (cls as any)?.classification?.category, confidence: (cls as any)?.classification?.confidence, image_type_after_classify: detectedCategory }
      });
      (event as any).context = { ...(event as any).context, image_type: detectedCategory };
    }

    // Supplement text follow-ups based on last proposal context
    if (event.type === "TEXT" && (event as any).context?.last_proposal?.kind === "supplement") {
      const lp = (event as any).context.last_proposal?.data as { items: Array<{ name: string; canonical?: string | null; dose?: string | null }>; topPickIdx?: number; existingId?: number | null; existingSchedule?: any | null };
      const fu = parseFollowUp((event as any).text || "");
      const pickIdx = Number.isInteger(lp?.topPickIdx) ? lp!.topPickIdx! : 0;
      const pick = lp?.items?.[pickIdx];

      if (pick) {
        const wantsInfo = /\b(info|infos|information|mehr infos|wechselwirkung|wechselwirkungen|interaktionen|timing|einnehmen)\b/i.test(((event as any).text || '').toString());
        if (wantsInfo) {
          const tInfo = Date.now();
          await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'tool_exec', handler: 'supplement-analysis', status: 'RUNNING', payload: { context: 'follow_up_info' } });
          const { data: stack } = await supabase
            .from('user_supplements')
            .select('name, canonical')
            .eq('user_id', userId)
            .eq('is_active', true);
          const names = (stack || []).map((s: any) => s.canonical || s.name).filter(Boolean);
          const supplements = [{ name: pick.canonical ?? pick.name }, ...names.map((n: string) => ({ name: n }))];
          const { data: infoData, error: infoErr } = await supabase.functions.invoke('supplement-analysis', {
            body: { supplements, userProfile: null },
            headers: { 'x-trace-id': traceId, 'x-source': source, 'x-chat-mode': chatMode ?? '' },
          });
          await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'tool_result', handler: 'supplement-analysis', status: infoErr ? 'ERROR' : 'OK', latencyMs: Date.now() - tInfo });
          const analysisText = (infoData as any)?.analysis ?? 'Okay – kurzer Check: Keine kritischen Konflikte gefunden. Balance statt Perfektion ✨';
          return new Response(JSON.stringify({ kind: 'message', text: applyCoachTone(analysisText), traceId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (fu.kind === 'save') {
          const ceid = crypto.randomUUID();
          const body = {
            mode: lp?.existingId ? "update" : "insert",
            clientEventId: ceid,
            item: {
              id: lp?.existingId ?? undefined,
              canonical: pick.canonical ?? pick.name,
              name: pick.name,
              dose: pick.dose ?? null,
              schedule: lp?.existingSchedule ?? null
            }
          };
          const t0 = Date.now();
          await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'tool_exec', handler: 'supplement-save', status: 'RUNNING', payload: { mode: body.mode, canonical: body.item.canonical, hasSchedule: !!body.item.schedule } });
          const { data, error } = await supabase.functions.invoke('supplement-save', {
            body,
            headers: { "x-trace-id": traceId, "x-source": source, "x-chat-mode": chatMode ?? "" }
          });
          await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'tool_result', handler: 'supplement-save', status: error ? 'ERROR' : 'OK', latencyMs: Date.now() - t0, payload: { action: (data as any)?.action, canonical: body.item.canonical } });
          if (error) throw error;
          const act = (data as any)?.action;
          const msg = act === 'insert' ? `✔️ Gespeichert: ${pick.name}${pick.dose ? ` (${pick.dose})` : ''}.` : act === 'update' ? `👍 Aktualisiert: ${pick.name}.` : `Schon vorhanden – alles gut.`;
          return new Response(JSON.stringify({ kind: 'message', text: applyCoachTone(msg + ' Willst du Dosis oder Timing anpassen?'), traceId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (fu.kind === 'update') {
          const ceid = crypto.randomUUID();
          const body = {
            mode: 'update',
            clientEventId: ceid,
            item: {
              id: lp?.existingId ?? undefined,
              canonical: pick.canonical ?? pick.name,
              name: pick.name,
              ...(fu.dose !== undefined ? { dose: fu.dose } : {}),
              ...(fu.schedule !== undefined ? { schedule: fu.schedule } : {})
            }
          };
          const t0 = Date.now();
          await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'tool_exec', handler: 'supplement-save', status: 'RUNNING', payload: { mode: 'update', canonical: body.item.canonical, updatedFields: { dose: !!fu.dose, schedule: !!fu.schedule } } });
          const { data, error } = await supabase.functions.invoke('supplement-save', {
            body,
            headers: { "x-trace-id": traceId, "x-source": source, "x-chat-mode": chatMode ?? "" }
          });
          await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'tool_result', handler: 'supplement-save', status: error ? 'ERROR' : 'OK', latencyMs: Date.now() - t0, payload: { action: (data as any)?.action, canonical: body.item.canonical } });
          if (error) throw error;
          const parts: string[] = [];
          if (fu.dose) parts.push(`Dosis ${fu.dose}`);
          if (fu.schedule?.freq || fu.schedule?.time) {
            const f = fu.schedule?.freq === 'daily' ? 'täglich' : fu.schedule?.freq === 'weekly' ? 'wöchentlich' : fu.schedule?.freq ? 'custom' : '';
            const t = fu.schedule?.time ? ({ morning: 'morgens', noon: 'mittags', evening: 'abends', preworkout: 'vor dem Training', postworkout: 'nach dem Training', bedtime: 'vor dem Schlafen', custom: fu.schedule?.custom ? `um ${fu.schedule.custom}` : 'custom' } as any)[fu.schedule.time] : '';
            parts.push(['Timing', [f, t].filter(Boolean).join(' ')].filter(Boolean).join(' '));
          }
          const friendly = parts.length ? parts.join(', ') : 'Einstellungen';
          return new Response(JSON.stringify({ kind: 'message', text: applyCoachTone(`✅ Aktualisiert: ${friendly}.`), traceId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // unknown follow-up → guiding question
        return new Response(JSON.stringify(asCoachMessage(`Soll ich ${pick.name} speichern oder etwas ändern? Beispiele: "ja", "mach 5 g abends".`, traceId)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const intent = chatMode === "training"
      ? { name: "training", score: 0.9, toolCandidate: "training-orchestrator" } as Intent
      : detectIntentWithConfidence(event);

    // Load user flags (JSON metadata)
    const { data: userFlagRows } = await supabase
      .from('user_feature_flags')
      .select('metadata, assigned_at')
      .eq('user_id', userId);
    const userFlagsMeta = mergeFlagMetadata(userFlagRows as any[] || []);

    // Open-Intake for ambiguous supplement TEXT (no heavy tools yet)
    if (event.type === "TEXT" && intent.name === "supplement") {
      const txt = ((event as any)?.text || "").toString();
      const openIntake = isFlagOn(userFlagsMeta, 'open_intake_v1') || true;
      if (openIntake && !isAnalysisRequest(txt)) {
        // Reflect stage
      await logTraceEvent(supabase, {
        traceId,
        userId,
        coachId,
          stage: 'reflect' as any,
          handler: 'coach-orchestrator-enhanced',
          status: 'OK',
          payload: { hypothesis: 'supplement', analysisRequest: false, source, type: event.type }
        });
        // Route decision (clarify)
      await logTraceEvent(supabase, {
        traceId,
        userId,
        coachId,
          stage: 'route_decision',
          handler: 'coach-orchestrator-enhanced',
          status: 'OK',
          payload: { intent, decision: 'clarify', source, type: event.type, flags: userFlagsMeta }
        });
        const reply = {
          kind: 'clarify',
          prompt: 'Alles klar – was genau zu Supplements?',
          options: ['Foto analysieren', 'Meinen Stack bewerten', 'Neues Supplement hinzufügen'],
          traceId,
        } as any;
        return new Response(JSON.stringify(reply), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    await logTrace({ traceId, stage: "route_decision", data: { intent, source, type: event.type, flags: userFlagsMeta } });
    await logTraceEvent(supabase, {
      traceId,
      userId,
        coachId,
      stage: 'route_decision',
      handler: 'coach-orchestrator-enhanced',
      status: 'OK',
      payload: { intent, source, type: event.type, flags: userFlagsMeta }
    });

    // Clarify path
    if (intent.score >= THRESHOLDS.clarify && intent.score < THRESHOLDS.tool) {
      const opts = clarifyOptions(intent);
      const reply: OrchestratorReply = { kind: "clarify", prompt: "Meinst du das hier?", options: opts, traceId };
      await logTraceEvent(supabase, {
        traceId,
        userId,
        coachId,
        stage: 'clarify_reply',
        handler: 'coach-orchestrator-enhanced',
        status: 'OK',
        payload: { options: opts }
      });
      return new Response(JSON.stringify(reply), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Low confidence → fallback
    if (intent.score < THRESHOLDS.clarify) {
      const out = await fallbackFlow(userId, traceId, event, intent, {
        buildManualAnswer: async () => "Ich helfe dir direkt: Sag mir kurz Training/Ernährung/Gewicht/Diary – ich kümmere mich. Ich habe es nebenbei als Feature markiert.",
        logUnmetTool: (args) => logUnmetTool(supabase, args),
        logTrace,
      }, { clarify: false, source });
      const reply: OrchestratorReply = typeof out.reply === "string" ? asCoachMessage(out.reply, traceId) : (out.reply as OrchestratorReply);
      await logTraceEvent(supabase, {
        traceId,
        userId,
        coachId,
        stage: 'fallback_llm_only',
        handler: 'coach-orchestrator-enhanced',
        status: 'OK',
        payload: { intent }
      });
      return new Response(JSON.stringify(reply), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // High confidence → tool routing
    // reuse clientEventId from earlier idempotency block

    // training
    if (intent.name === "training") {
      const t0 = Date.now();
      await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'tool_exec', handler: 'training-orchestrator', status: 'RUNNING', payload: { clientEventId } });
      const { data, error } = await supabase.functions.invoke("training-orchestrator", {
        body: { userId, clientEventId, event },
        headers: { "x-trace-id": traceId, "x-source": source, "x-chat-mode": chatMode ?? "" },
      });
      if (error) throw error;
      await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'tool_result', handler: 'training-orchestrator', status: 'OK', latencyMs: Date.now() - t0 });
      const finalText = (data as any)?.text ?? "Training erfasst.";
      const finalReply: OrchestratorReply = { kind: 'message', text: applyCoachTone(finalText), traceId };
      await markFinal(supabaseState, userId, clientEventId, finalReply, traceId);
      return new Response(JSON.stringify(finalReply), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // meal → analyze-meal (analysis only)
    if (intent.name === "meal") {
      const t0 = Date.now();
      await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'tool_exec', handler: 'analyze-meal', status: 'RUNNING', payload: { type: event.type } });
      const { data, error } = await supabase.functions.invoke("analyze-meal", {
        body: { userId, event },
        headers: { "x-trace-id": traceId, "x-source": source, "x-chat-mode": chatMode ?? "" },
      });
      if (error) throw error;
      await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'tool_result', handler: 'analyze-meal', status: 'OK', latencyMs: Date.now() - t0 });
      const proposal = (data as any)?.proposal ?? (data as any)?.analysis ?? null;
      if (!proposal) {
        const finalReply = asCoachMessage("Ich habe nichts Verlässliches erkannt – nenn mir kurz Menge & Zutaten, dann schätze ich dir die Makros.", traceId);
        await markFinal(supabaseState, userId, clientEventId, finalReply, traceId);
        return new Response(JSON.stringify(finalReply), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const reply: OrchestratorReply = { kind: "confirm_save_meal", prompt: "Bitte kurz bestätigen – dann speichere ich die Mahlzeit.", proposal, traceId };
      await markFinal(supabaseState, userId, clientEventId, reply, traceId);
      return new Response(JSON.stringify(reply), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // weight → flag-gated thin function, else legacy
    if (intent.name === "weight") {
      if (isFlagOn(userFlagsMeta, 'auto_tool_orchestration')) {
        const { data, error } = await supabase.functions.invoke("weight-tracker", {
          body: { userId, event },
          headers: { "x-trace-id": traceId, "x-source": source, "x-chat-mode": chatMode ?? "" },
        });
        if (error) throw error;
        const text = (data as any)?.text ?? (data as any)?.reply ?? "Gewicht gespeichert.";
        return new Response(JSON.stringify({ kind: 'message', text: applyCoachTone(text), traceId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        const { data, error } = await supabase.functions.invoke("coach-orchestrator", {
          body: { mode: "weight", userId, clientEventId, event },
          headers: { "x-trace-id": traceId, "x-source": source, "x-chat-mode": chatMode ?? "" },
        });
        if (error) throw error;
        return new Response(JSON.stringify({ kind: 'message', text: applyCoachTone((data as any)?.text ?? "Gewicht gespeichert."), traceId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // diary → flag-gated thin function, else legacy
    if (intent.name === "diary") {
      if (isFlagOn(userFlagsMeta, 'auto_tool_orchestration')) {
        const { data, error } = await supabase.functions.invoke("diary-assistant", {
          body: { userId, event },
          headers: { "x-trace-id": traceId, "x-source": source, "x-chat-mode": chatMode ?? "" },
        });
        if (error) throw error;
        const text = (data as any)?.text ?? (data as any)?.reply ?? "Tagebuch gespeichert.";
        return new Response(JSON.stringify({ kind: 'message', text: applyCoachTone(text), traceId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        const { data, error } = await supabase.functions.invoke("coach-orchestrator", {
          body: { mode: "diary", userId, clientEventId, event },
          headers: { "x-trace-id": traceId, "x-source": source, "x-chat-mode": chatMode ?? "" },
        });
        if (error) throw error;
        return new Response(JSON.stringify({ kind: 'message', text: applyCoachTone((data as any)?.text ?? "Tagebuch gespeichert."), traceId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // supplement → lightweight intake first
    if (intent.name === "supplement") {
      // IMAGE: quick classify + immediate full proposal for interactive confirm
      if (event.type === 'IMAGE') {
        // 1) Quick human summary via classifier
        const t0 = Date.now();
        await logTraceEvent(supabase, { traceId, userId, coachId: undefined, stage: 'tool_exec', handler: 'image-classifier', status: 'RUNNING', payload: { action: 'classify_image_quick' } });
        const { data: icData, error: icErr } = await supabase.functions.invoke('image-classifier', {
          body: { imageUrl: (event as any).url, userId },
          headers: { 'x-trace-id': traceId, 'x-source': source, 'x-chat-mode': chatMode ?? '' },
        });
        await logTraceEvent(supabase, { traceId, userId, coachId: undefined, stage: 'tool_result', handler: 'image-classifier', status: icErr ? 'ERROR' : 'OK', latencyMs: Date.now() - t0, payload: { classification: (icData as any)?.classification ?? null } });

        const cls: any = (icData as any)?.classification ?? {};
        const pct = Math.round(Math.max(60, Math.min(98, (cls?.confidence ?? 0.6) * 100)));
        const name = cls?.name || 'Supplement';
        const desc = (cls?.description || '').toString().trim();
        const bullets = [
          `Erkannt: **${name}** (~${pct} %)`,
          ...(desc ? [`Beschreibung: ${desc}`] : []),
          ...(cls?.benefit ? [`Nutzen: ${cls.benefit}`] : []),
          ...(cls?.caution ? [`Hinweis: ${cls.caution}`] : []),
          `Timing-Vorschlag: ${suggestTimeFromType(name)}`,
        ].slice(0, 4);

        // 2) Build full proposal by running analysis so user can Save/Adjust immediately
        const t1 = Date.now();
        await logTraceEvent(supabase, { traceId, userId, coachId: undefined, stage: 'tool_exec', handler: 'supplement-recognition', status: 'RUNNING', payload: { withImage: true } });
        const { data, error } = await supabase.functions.invoke('supplement-recognition', {
          body: { userId, imageUrl: (event as any).url, userQuestion: ((cls as any)?.description || '') },
          headers: { 'x-trace-id': traceId, 'x-source': source, 'x-chat-mode': chatMode ?? '' },
        });
        await logTraceEvent(supabase, { traceId, userId, coachId: undefined, stage: 'tool_result', handler: 'supplement-recognition', status: error ? 'ERROR' : 'OK', latencyMs: Date.now() - t1 });
        if (error) {
          const text = `💊\n${bullets.map(b => `• ${b}`).join('\n')}\n\nSag mir kurz, ob du Infos willst oder speichern möchtest.`;
          return new Response(JSON.stringify(asCoachMessage(text, traceId)), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const raw: any = data;
        const recognized = (raw?.items && Array.isArray(raw.items))
          ? raw.items
          : (raw?.recognized_supplements && Array.isArray(raw.recognized_supplements))
            ? raw.recognized_supplements.map((r: any) => ({
                name: r.product_name || r.name || 'Unbekannt',
                canonical: r.supplement_match ?? r.canonical ?? null,
                dose: r.quantity_estimate ?? r.dose ?? null,
                confidence: typeof r.confidence === 'number' ? r.confidence : (raw?.confidence_score ?? 0.7),
                notes: r.notes ?? null,
                image_url: (event as any)?.url ?? null,
              }))
            : [];

        if (!recognized.length) {
          const text = `💊\n${bullets.map(b => `• ${b}`).join('\n')}\n\nIch habe nichts Verlässliches erkannt – magst du mir kurz den Namen schreiben?`;
          return new Response(JSON.stringify(asCoachMessage(text, traceId)), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: existingStack } = await supabase
          .from('user_supplements')
          .select('id, canonical, name, dose, schedule')
          .eq('user_id', userId);
        const existing = (existingStack || []) as Array<{ id: number; canonical: string | null; name: string; dose: string | null; schedule: any | null }>;

        let topPickIdx = 0; let best = -1;
        recognized.forEach((it: any, idx: number) => { const c = typeof it.confidence === 'number' ? it.confidence : 0; if (c > best) { best = c; topPickIdx = idx; } });

        const proposal = {
          items: recognized.map((r: any) => {
            const match = existing.find((e) =>
              (r.canonical && e.canonical && e.canonical === r.canonical) ||
              (e.name && r.name && (e.name.toLowerCase().includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(e.name.toLowerCase())))
            );
            return {
              name: r.name,
              canonical: r.canonical ?? null,
              dose: r.dose ?? null,
              confidence: typeof r.confidence === 'number' ? r.confidence : 0.7,
              notes: r.notes ?? null,
              image_url: r.image_url ?? ((event as any)?.url ?? null),
              existingId: match?.id ?? null,
              existingDose: match?.dose ?? null,
              existingSchedule: match?.schedule ?? null,
            };
          }),
          topPickIdx,
          imageUrl: (event as any)?.url ?? null,
        };

        const top = proposal.items[topPickIdx];
        const pct2 = Math.round(Math.max(60, Math.min(98, (top.confidence || 0) * 100)));
        const prompt = `💊 Kurz-Check\n${bullets.map(b => `• ${b}`).join('\n')}\n\n• Erkannt (Analyse): ${top.name} (Sicherheit ${pct2}%)`;
        const reply: OrchestratorReply = { kind: 'confirm_save_supplement', prompt, proposal, traceId } as any;
        return new Response(JSON.stringify(reply), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // TEXT: only run analysis if explicitly asked
      const tool = isAnalysisRequest(((event as any)?.text || '').toString()) ? 'supplement-analysis' : null;

      if (!tool) {
        const reply = {
          kind: 'clarify',
          prompt: 'Alles klar – was genau zu Supplements?',
          options: [
            'Foto analysieren',
            'Meinen Stack bewerten',
            'Neues Supplement hinzufügen'
          ],
          traceId
        } as any;
        return new Response(JSON.stringify(reply), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const t0 = Date.now();
      await logTraceEvent(supabase, { traceId, userId, coachId: undefined, stage: 'tool_exec', handler: tool, status: 'RUNNING', payload: { clientEventId } });
      const invokeBody = event.type === "IMAGE"
        ? { userId, imageUrl: (event as any).url, userQuestion: "" }
        : { userId, event };
      const { data, error } = await supabase.functions.invoke(tool as string, {
        body: invokeBody,
        headers: { "x-trace-id": traceId, "x-source": source, "x-chat-mode": chatMode ?? "" },
      });
      if (error) throw error;
      await logTraceEvent(supabase, { traceId, userId, coachId: undefined, stage: 'tool_result', handler: tool, status: 'OK', latencyMs: Date.now() - t0, payload: { clientEventId } });

      // Normalize response into items
      const raw: any = data;
      const recognized = (raw?.items && Array.isArray(raw.items))
        ? raw.items
        : (raw?.recognized_supplements && Array.isArray(raw.recognized_supplements))
          ? raw.recognized_supplements.map((r: any) => ({
              name: r.product_name || r.name || 'Unbekannt',
              canonical: r.supplement_match ?? r.canonical ?? null,
              dose: r.quantity_estimate ?? r.dose ?? null,
              confidence: typeof r.confidence === 'number' ? r.confidence : (raw?.confidence_score ?? 0.7),
              notes: r.notes ?? null,
              image_url: (invokeBody as any)?.imageUrl ?? null,
            }))
          : [];

      if (!recognized.length) {
        const summary = typeof data === "string" ? data : ((raw as any)?.summary ?? (raw as any)?.text ?? JSON.stringify(raw).slice(0, 800));
        return new Response(JSON.stringify({ kind: 'message', text: applyCoachTone(`💊 Supplement-Analyse:\n${summary}`), traceId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // pick top by confidence
      let topPickIdx = 0;
      let best = -1;
      recognized.forEach((it: any, idx: number) => {
        const c = typeof it.confidence === 'number' ? it.confidence : 0;
        if (c > best) { best = c; topPickIdx = idx; }
      });

      // Enrich with existing stack matches
      const { data: existingStack } = await supabase
        .from('user_supplements')
        .select('id, canonical, name, dose, schedule')
        .eq('user_id', userId);
      const existing = (existingStack || []) as Array<{ id: number; canonical: string | null; name: string; dose: string | null; schedule: any | null }>;

      const proposal = {
        items: recognized.map((r: any) => {
          const match = existing.find((e) =>
            (r.canonical && e.canonical && e.canonical === r.canonical) ||
            (e.name && r.name && (e.name.toLowerCase().includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(e.name.toLowerCase())))
          );
          return {
            name: r.name,
            canonical: r.canonical ?? null,
            dose: r.dose ?? null,
            confidence: typeof r.confidence === 'number' ? r.confidence : 0.7,
            notes: r.notes ?? null,
            image_url: r.image_url ?? ((invokeBody as any)?.imageUrl ?? null),
            existingId: match?.id ?? null,
            existingDose: match?.dose ?? null,
            existingSchedule: match?.schedule ?? null,
          };
        }),
        topPickIdx,
        imageUrl: (invokeBody as any)?.imageUrl ?? null
      };


      const top = proposal.items[topPickIdx];
      const pct = Math.round(Math.max(60, Math.min(98, (top.confidence || 0) * 100)));
      const prompt = `💊 Supplement-Analyse\n• Erkannt: ${top.name} (Sicherheit ${pct}%)`;

      const reply: OrchestratorReply = { kind: "confirm_save_supplement", prompt, proposal, traceId } as any;
      return new Response(JSON.stringify(reply), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Default fallback safety - ARES gets voice generator for non-tool responses
    if (coachId === 'ares' && event.type === 'TEXT') {
      await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'ares_fallback', handler: 'coach-orchestrator-enhanced', status: 'RUNNING' });
      
      try {
        const [profile, analytics] = await Promise.all([
          loadUserProfile(supabase, userId),
          supabase.rpc('get_coach_analytics_7d', { p_user_id: userId }).then(r => r.data || {})
        ]);
        
        const aresText = await generateAresResponse(event.text ?? '', profile, analytics);
        
        const reply: OrchestratorReply = { 
          kind: 'message', 
          text: aresText, 
          traceId 
        };
        
        await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'ares_fallback', handler: 'coach-orchestrator-enhanced', status: 'OK' });
        
        // Mark as final in client_events
        await markFinal(supabaseState, userId, clientEventId, reply, traceId);
        return new Response(JSON.stringify(reply), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (error) {
        console.error('ARES fallback failed:', error);
        await logTraceEvent(supabase, { traceId, userId, coachId, stage: 'ares_fallback', handler: 'coach-orchestrator-enhanced', status: 'ERROR', errorMessage: String(error) });
        // Fall through to standard fallback
      }
    }
    
    // Standard fallback for other coaches
    const out = await fallbackFlow(userId, traceId, event, intent, {
      buildManualAnswer: async () => "Ich antworte dir direkt – sag mir Training/Ernährung/Gewicht/Diary. Feature ist notiert.",
      logUnmetTool: (args) => logUnmetTool(supabase, args),
      logTrace,
    }, { clarify: false, source });
    const reply: OrchestratorReply = typeof out.reply === "string" ? asCoachMessage(out.reply, traceId) : (out.reply as OrchestratorReply);
    
    // Mark as final in client_events (persist final reply)
    try {
      await markFinal(supabaseState, userId, clientEventId, reply, traceId);
    } catch (e) {
      console.warn('Failed to mark final in fallback:', e);
      // Continue anyway
    }
    
    return new Response(JSON.stringify(reply), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    await logTrace({ traceId, stage: "error", data: { error: String(e) } });
    await logTraceEvent(supabase, { traceId, userId: undefined, coachId: undefined, stage: 'error', handler: 'coach-orchestrator-enhanced', status: 'ERROR', errorMessage: String(e) });
    const reply: OrchestratorReply = { kind: "message", text: "Kurz hake ich – bitte nochmal versuchen.", traceId };
    return new Response(JSON.stringify(reply), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});