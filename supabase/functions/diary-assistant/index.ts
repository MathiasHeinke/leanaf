// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { error } = await supabase.from("diary_entries").insert(payload);
    if (error) {
      if ((error as any)?.code === "23505") {
        return ok({ kind: "message", text: "Tagebuch‑Eintrag bereits erfasst (Idempotenz).", traceId } satisfies Reply);
      }
      throw error;
    }
    return ok({ kind: "message", text: "✅ Tagebuch gespeichert.", traceId } satisfies Reply);
  } catch (e) {
    console.error("diary-assistant error", e);
    return ok({ kind: "message", text: "Konnte Tagebuch nicht speichern. Bitte nochmal senden.", traceId } satisfies Reply);
  }
});
