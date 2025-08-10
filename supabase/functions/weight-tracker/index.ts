// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logTraceEvent } from "../telemetry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-source, x-chat-mode",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CoachEvent = { type: "TEXT"|"IMAGE"|"END"; text?: string; clientEventId: string; context?: any };
type Reply = { kind: "message"; text: string; traceId?: string };

const getTraceId = (req: Request) => req.headers.get("x-trace-id") || crypto.randomUUID();
const ok = (body: any, headers = {}) => new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json", ...headers } });

function parseKg(text: string | undefined): number | null {
  if (!text) return null;
  // Beispiele: "Gewicht 82,4", "82.4 kg", "heute 83kg"
  const m = text.replace(',', '.').match(/(\d+(?:\.\d+)?)[ ]*kg?/i);
  if (!m) return null;
  const kg = parseFloat(m[1]);
  if (isNaN(kg) || kg <= 0 || kg > 500) return null;
  return Math.round(kg * 10) / 10;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const traceId = getTraceId(req);
  const t0 = Date.now();
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

    await logTraceEvent(supabase, {
      traceId,
      userId,
      coachId: undefined,
      stage: 'tool_exec',
      handler: 'weight-tracker',
      status: 'RUNNING',
      payload: { clientEventId: event.clientEventId }
    });

    const kg = parseKg(event.text);
    if (kg == null) return ok({ kind: "message", text: "Ich konnte kein gültiges Gewicht erkennen. Beispiel: „Gewicht 82,4 kg“.", traceId } satisfies Reply);

    // Insert mit Idempotenz
    const payload: any = {
      user_id: userId,
      weight_kg: kg,
      client_event_id: event.clientEventId,
      measured_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("weight_history").insert(payload);
    const duration = Date.now() - t0;
    if (error) {
      // 23505 = unique_violation (idempotent)
      if ((error as any)?.code === "23505") {
        await logTraceEvent(supabase, {
          traceId,
          userId,
          coachId: undefined,
          stage: 'tool_result',
          handler: 'weight-tracker',
          status: 'OK',
          latencyMs: duration,
          payload: { duplicate: true, kg }
        });
        return ok({ kind: "message", text: `Gewicht ${kg} kg ist bereits erfasst (Idempotenz).`, traceId } satisfies Reply);
      }
      await logTraceEvent(supabase, {
        traceId,
        userId,
        coachId: undefined,
        stage: 'error',
        handler: 'weight-tracker',
        status: 'ERROR',
        latencyMs: duration,
        payload: { kg },
        errorMessage: String(error)
      });
      throw error;
    }

    await logTraceEvent(supabase, {
      traceId,
      userId,
      coachId: undefined,
      stage: 'tool_result',
      handler: 'weight-tracker',
      status: 'OK',
      latencyMs: duration,
      payload: { kg }
    });
    return ok({ kind: "message", text: `✅ Gewicht gespeichert: ${kg} kg.`, traceId } satisfies Reply);
  } catch (e) {
    console.error("weight-tracker error", e);
    return ok({ kind: "message", text: "Konnte Gewicht nicht speichern. Bitte nochmal senden.", traceId } satisfies Reply);
  }
});
