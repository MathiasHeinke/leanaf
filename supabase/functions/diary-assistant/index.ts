// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logTraceEvent } from "../telemetry.ts";
import { extractInsightsFromMessage, saveInsights, getExistingInsightStrings, detectPatterns, getAllUserInsights } from "../_shared/memory/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-source, x-chat-mode",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CoachEvent = { type: "TEXT"|"IMAGE"|"END"; text?: string; clientEventId: string; context?: any };
type Reply = { kind: "message"; text: string; traceId?: string };

const getTraceId = (req: Request) => req.headers.get("x-trace-id") || crypto.randomUUID();
const ok = (body: any, headers = {}) => new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json", ...headers } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const traceId = getTraceId(req);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
  );

  try {
    const { userId: providedUserId, event } = await req.json() as { userId?: string; event: CoachEvent };
    if (!event?.clientEventId) return ok({ kind: "message", text: "Fehlende clientEventId.", traceId } satisfies Reply);

    // auth
    let userId = providedUserId;
    if (!userId) {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? undefined;
    }
    if (!userId) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const t0 = Date.now();
    await logTraceEvent(supabase, {
      traceId,
      userId,
      coachId: undefined,
      stage: 'tool_exec',
      handler: 'diary-assistant',
      status: 'RUNNING',
      payload: { clientEventId: event.clientEventId }
    });

    const text = (event.text ?? "").trim();
    if (!text) return ok({ kind: "message", text: "Bitte schreib einen kurzen Tagebuch‑Eintrag.", traceId } satisfies Reply);

    // Insert mit Idempotenz
    const today = new Date().toISOString().split('T')[0];
    const payload: any = {
      user_id: userId,
      content: text,
      client_event_id: event.clientEventId,
      date: today,
    };

    const { error, data: insertedEntry } = await supabase.from("diary_entries").insert(payload).select('id').single();
    if (error) {
      if ((error as any)?.code === "23505") {
        await logTraceEvent(supabase, {
          traceId,
          userId,
          coachId: undefined,
          stage: 'tool_result',
          handler: 'diary-assistant',
          status: 'OK',
          latencyMs: Date.now() - t0,
          payload: { duplicate: true }
        });
        return ok({ kind: "message", text: "Tagebuch‑Eintrag bereits erfasst (Idempotenz).", traceId } satisfies Reply);
      }
      throw error;
    }

    // Phase 4: Extract insights from journal entry (non-blocking)
    (async () => {
      try {
        const existingInsightStrings = await getExistingInsightStrings(userId!, supabase);
        const newInsights = await extractInsightsFromMessage(
          text,
          userId!,
          'journal',
          existingInsightStrings
        );

        if (newInsights.length > 0) {
          await saveInsights(userId!, newInsights, 'journal', insertedEntry?.id || traceId, supabase);
          console.log(`[DIARY-MEMORY] Extracted ${newInsights.length} insights from journal entry`);

          // Also detect patterns
          const allInsights = await getAllUserInsights(userId!, supabase);
          const patterns = await detectPatterns(userId!, newInsights, allInsights, supabase);
          if (patterns.length > 0) {
            console.log(`[DIARY-MEMORY] Detected ${patterns.length} patterns from journal`);
          }
        }
      } catch (memErr) {
        console.warn('[DIARY-MEMORY-WARN] Failed to extract insights:', memErr);
      }
    })();

    await logTraceEvent(supabase, {
      traceId,
      userId,
      coachId: undefined,
      stage: 'tool_result',
      handler: 'diary-assistant',
      status: 'OK',
      latencyMs: Date.now() - t0
    });
    return ok({ kind: "message", text: "✅ Tagebuch gespeichert.", traceId } satisfies Reply);
  } catch (e) {
    console.error("diary-assistant error", e);
    try {
      await logTraceEvent(supabase, {
        traceId,
        userId: undefined,
        coachId: undefined,
        stage: 'error',
        handler: 'diary-assistant',
        status: 'ERROR',
        errorMessage: String(e)
      });
    } catch (_) { /* ignore */ }
    return ok({ kind: "message", text: "Konnte Tagebuch nicht speichern. Bitte nochmal senden.", traceId } satisfies Reply);
  }
});
