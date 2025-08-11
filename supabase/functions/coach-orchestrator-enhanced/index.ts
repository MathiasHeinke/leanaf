import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fallbackFlow } from "./fallback.ts";
import { logUnmetTool, logTrace } from "./telemetry.ts";
import { logTraceEvent } from "../telemetry.ts";

// CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-chat-mode, x-trace-id, x-source",
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
  | { kind: "clarify"; prompt: string; options: [string, string]; traceId?: string }
  | { kind: "confirm_save_meal"; prompt: string; proposal: any; traceId?: string };

// Thresholds
const THRESHOLDS = { tool: 0.7, clarify: 0.4 };

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

const asMessage = (text: string, traceId: string): OrchestratorReply => ({ kind: "message", text, traceId });

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } }
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

    // Telemetry: received
    await logTraceEvent(supabase, {
      traceId,
      userId,
      coachId: undefined,
      stage: 'received',
      handler: 'coach-orchestrator-enhanced',
      status: 'RUNNING',
      payload: { type: event.type, source, chatMode }
    });

    // Idempotency & retry info
    const retryHeader = req.headers.get('x-retry') === '1';
    const clientEventId = (event as any).clientEventId as string | undefined;
    if (clientEventId) {
      // Check if already processed (prior reply_send with same clientEventId)
      const { data: existingProcessed } = await supabase
        .from('coach_traces')
        .select('id')
        .eq('stage', 'reply_send')
        // @ts-ignore - JSONB contains filter supported at runtime
        .contains('data', { clientEventId })
        .limit(1);
      if (existingProcessed && existingProcessed.length > 0) {
        await logTraceEvent(supabase, { traceId, userId, coachId: undefined, stage: 'reply_send', handler: 'coach-orchestrator-enhanced', status: 'OK', payload: { dedupe: true, clientEventId, retried: retryHeader } });
        return new Response(JSON.stringify(asMessage('Alles klar – ich habe dir bereits geantwortet.', traceId)), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // Lightweight in-flight guard within this instance
      // deno-lint-ignore no-var
      var __inflight = (globalThis as any).__inflightSet as Set<string> | undefined;
      if (!__inflight) { (globalThis as any).__inflightSet = new Set<string>(); __inflight = (globalThis as any).__inflightSet; }
      if (__inflight.has(clientEventId)) {
        await logTraceEvent(supabase, { traceId, userId, coachId: undefined, stage: 'route_decision', handler: 'coach-orchestrator-enhanced', status: 'RUNNING', payload: { inflight: true, clientEventId, retried: retryHeader } });
        return new Response(JSON.stringify(asMessage('⏳ Bin dran – einen Moment …', traceId)), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      __inflight.add(clientEventId);
    }

    // Auto-classify image if missing image_type to improve routing
    if (event.type === "IMAGE" && !(event as any).context?.image_type && (event as any).url) {
      const tStart = Date.now();
      await logTraceEvent(supabase, {
        traceId,
        userId,
        coachId: undefined,
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
        coachId: undefined,
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
          await logTraceEvent(supabase, { traceId, userId, coachId: undefined, stage: 'tool_exec', handler: 'supplement-save', status: 'RUNNING', payload: { mode: body.mode, canonical: body.item.canonical, hasSchedule: !!body.item.schedule } });
          const { data, error } = await supabase.functions.invoke('supplement-save', {
            body,
            headers: { "x-trace-id": traceId, "x-source": source, "x-chat-mode": chatMode ?? "" }
          });
          await logTraceEvent(supabase, { traceId, userId, coachId: undefined, stage: 'tool_result', handler: 'supplement-save', status: error ? 'ERROR' : 'OK', latencyMs: Date.now() - t0, payload: { action: (data as any)?.action, canonical: body.item.canonical } });
          if (error) throw error;
          const act = (data as any)?.action;
          const msg = act === 'insert' ? `✔️ Gespeichert: ${pick.name}${pick.dose ? ` (${pick.dose})` : ''}.` : act === 'update' ? `👍 Aktualisiert: ${pick.name}.` : `Schon vorhanden – alles gut.`;
          return new Response(JSON.stringify(asMessage(msg + ' Willst du Dosis oder Timing anpassen?', traceId)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
          await logTraceEvent(supabase, { traceId, userId, coachId: undefined, stage: 'tool_exec', handler: 'supplement-save', status: 'RUNNING', payload: { mode: 'update', canonical: body.item.canonical, updatedFields: { dose: !!fu.dose, schedule: !!fu.schedule } } });
          const { data, error } = await supabase.functions.invoke('supplement-save', {
            body,
            headers: { "x-trace-id": traceId, "x-source": source, "x-chat-mode": chatMode ?? "" }
          });
          await logTraceEvent(supabase, { traceId, userId, coachId: undefined, stage: 'tool_result', handler: 'supplement-save', status: error ? 'ERROR' : 'OK', latencyMs: Date.now() - t0, payload: { action: (data as any)?.action, canonical: body.item.canonical } });
          if (error) throw error;
          const parts: string[] = [];
          if (fu.dose) parts.push(`Dosis ${fu.dose}`);
          if (fu.schedule?.freq || fu.schedule?.time) {
            const f = fu.schedule?.freq === 'daily' ? 'täglich' : fu.schedule?.freq === 'weekly' ? 'wöchentlich' : fu.schedule?.freq ? 'custom' : '';
            const t = fu.schedule?.time ? ({ morning: 'morgens', noon: 'mittags', evening: 'abends', preworkout: 'vor dem Training', postworkout: 'nach dem Training', bedtime: 'vor dem Schlafen', custom: fu.schedule?.custom ? `um ${fu.schedule.custom}` : 'custom' } as any)[fu.schedule.time] : '';
            parts.push(['Timing', [f, t].filter(Boolean).join(' ')].filter(Boolean).join(' '));
          }
          const friendly = parts.length ? parts.join(', ') : 'Einstellungen';
          return new Response(JSON.stringify(asMessage(`✅ Aktualisiert: ${friendly}.`, traceId)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // unknown follow-up → guiding question
        return new Response(JSON.stringify(asMessage(`Soll ich ${pick.name} speichern oder etwas ändern? Beispiele: "ja", "mach 5 g abends".`, traceId)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    await logTrace({ traceId, stage: "route_decision", data: { intent, source, type: event.type, flags: userFlagsMeta } });
    await logTraceEvent(supabase, {
      traceId,
      userId,
      coachId: undefined,
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
        coachId: undefined,
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
      const reply: OrchestratorReply = typeof out.reply === "string" ? { kind: "message", text: out.reply, traceId } : (out.reply as OrchestratorReply);
      await logTraceEvent(supabase, {
        traceId,
        userId,
        coachId: undefined,
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
      await logTraceEvent(supabase, { traceId, userId, coachId: undefined, stage: 'tool_exec', handler: 'training-orchestrator', status: 'RUNNING', payload: { clientEventId } });
      const { data, error } = await supabase.functions.invoke("training-orchestrator", {
        body: { userId, clientEventId, event },
        headers: { "x-trace-id": traceId, "x-source": source, "x-chat-mode": chatMode ?? "" },
      });
      if (error) throw error;
      await logTraceEvent(supabase, { traceId, userId, coachId: undefined, stage: 'tool_result', handler: 'training-orchestrator', status: 'OK', latencyMs: Date.now() - t0 });
      return new Response(JSON.stringify(asMessage((data as any)?.text ?? "Training erfasst.", traceId)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // meal → analyze-meal (analysis only)
    if (intent.name === "meal") {
      const t0 = Date.now();
      await logTraceEvent(supabase, { traceId, userId, coachId: undefined, stage: 'tool_exec', handler: 'analyze-meal', status: 'RUNNING', payload: { type: event.type } });
      const { data, error } = await supabase.functions.invoke("analyze-meal", {
        body: { userId, event },
        headers: { "x-trace-id": traceId, "x-source": source, "x-chat-mode": chatMode ?? "" },
      });
      if (error) throw error;
      await logTraceEvent(supabase, { traceId, userId, coachId: undefined, stage: 'tool_result', handler: 'analyze-meal', status: 'OK', latencyMs: Date.now() - t0 });
      const proposal = (data as any)?.proposal ?? (data as any)?.analysis ?? null;
      if (!proposal) {
        return new Response(JSON.stringify(asMessage("Ich habe nichts Verlässliches erkannt – nenn mir kurz Menge & Zutaten, dann schätze ich dir die Makros.", traceId)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const reply: OrchestratorReply = { kind: "confirm_save_meal", prompt: "Bitte kurz bestätigen – dann speichere ich die Mahlzeit.", proposal, traceId };
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
        return new Response(JSON.stringify(asMessage(text, traceId)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        const { data, error } = await supabase.functions.invoke("coach-orchestrator", {
          body: { mode: "weight", userId, clientEventId, event },
          headers: { "x-trace-id": traceId, "x-source": source, "x-chat-mode": chatMode ?? "" },
        });
        if (error) throw error;
        return new Response(JSON.stringify(asMessage((data as any)?.text ?? "Gewicht gespeichert.", traceId)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
        return new Response(JSON.stringify(asMessage(text, traceId)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        const { data, error } = await supabase.functions.invoke("coach-orchestrator", {
          body: { mode: "diary", userId, clientEventId, event },
          headers: { "x-trace-id": traceId, "x-source": source, "x-chat-mode": chatMode ?? "" },
        });
        if (error) throw error;
        return new Response(JSON.stringify(asMessage((data as any)?.text ?? "Tagebuch gespeichert.", traceId)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // supplement → analysis only → return confirm_save_supplement proposal
    if (intent.name === "supplement") {
      const tool = event.type === "IMAGE" ? "supplement-recognition" : "supplement-analysis";
      const t0 = Date.now();
      await logTraceEvent(supabase, { traceId, userId, coachId: undefined, stage: 'tool_exec', handler: tool, status: 'RUNNING', payload: { clientEventId } });
      const invokeBody = event.type === "IMAGE"
        ? { userId, imageUrl: (event as any).url, userQuestion: "" }
        : { userId, event };
      const { data, error } = await supabase.functions.invoke(tool, {
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
        return new Response(JSON.stringify(asMessage(`💊 Supplement-Analyse:\n${summary}`, traceId)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    // Default fallback safety
    const out = await fallbackFlow(userId, traceId, event, intent, {
      buildManualAnswer: async () => "Ich antworte dir direkt – sag mir Training/Ernährung/Gewicht/Diary. Feature ist notiert.",
      logUnmetTool: (args) => logUnmetTool(supabase, args),
      logTrace,
    }, { clarify: false, source });
    const reply: OrchestratorReply = typeof out.reply === "string" ? { kind: "message", text: out.reply, traceId } : (out.reply as OrchestratorReply);
    return new Response(JSON.stringify(reply), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    await logTrace({ traceId, stage: "error", data: { error: String(e) } });
    await logTraceEvent(supabase, { traceId, userId: undefined, coachId: undefined, stage: 'error', handler: 'coach-orchestrator-enhanced', status: 'ERROR', errorMessage: String(e) });
    const reply: OrchestratorReply = { kind: "message", text: "Kurz hake ich – bitte nochmal versuchen.", traceId };
    return new Response(JSON.stringify(reply), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});