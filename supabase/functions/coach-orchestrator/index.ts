import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-chat-mode",
};

// Project configuration (static per instructions)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://gzczjscctgyxjyodhnhk.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I";

// Simple keyword heuristics for intent detection (self-contained)
function detectIntent(input?: string): "training" | "meal" | "weight" | "diary" | "advice" | "unknown" {
  const s = (input || "").toLowerCase();
  if (!s) return "unknown";
  const looksLikeSet = /(\d+)\s*(x|×|\*)\s*(\d+)(?:\s*(kg|lb))?/i.test(s) || /rpe\s*\d+(?:\.\d+)?/i.test(s);
  if (looksLikeSet || /bankdr|ohp|rudern|latzug|curls|squat|kreuzheben|deadlift|bench|overhead/.test(s)) return "training";
  if (/essen|mahlzeit|kalorien|protein|frühstück|mittag|abend|snack|meal/.test(s)) return "meal";
  if (/gewicht|wiegen|kg\b/.test(s)) return "weight";
  if (/tagebuch|journal|notiz|stimmung|mood/.test(s)) return "diary";
  if (/was (wäre|ist) jetzt gut|tipp|rat|empfehlung/.test(s)) return "advice";
  return "unknown";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authorization = req.headers.get("Authorization") ?? "";
  const chatModeHeader = req.headers.get("x-chat-mode") ?? undefined;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const event = body?.event as { type: "TEXT" | "IMAGE" | "END"; text?: string; url?: string } | undefined;
    const clientEventId = body?.clientEventId as string | undefined;
    const mode: string | undefined = body?.mode || chatModeHeader;

    if (!event || !event.type) {
      return new Response(JSON.stringify({ error: "Missing event" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identify user (optional, but useful for feature flags later)
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;

    // Determine intent
    const quickIntent = event.type === "TEXT" ? detectIntent(event.text) : event.type === "IMAGE" ? (mode === "training" ? "training" : "unknown") : mode === "training" ? "training" : "unknown";
    const finalIntent = (mode === "training") ? "training" : quickIntent;

    // If training intent, proxy to training-orchestrator for full logic
    if (finalIntent === "training") {
      const trainingPayload: any = { clientEventId, event };

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/training-orchestrator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          Authorization: authorization,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(trainingPayload),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        console.error("training-orchestrator proxy error", data);
        return new Response(JSON.stringify({ error: data?.error || "Training orchestrator failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ...data, routed: "training" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Non-training intents: phase-2 minimal acks (no DB writes yet)
    if (event.type === "IMAGE") {
      return new Response(
        JSON.stringify({
          text: "📸 Bild erhalten. Die Bild-Analyse für Nicht-Training wird in Kürze aktiviert.",
          routed: "image_ack",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (finalIntent) {
      case "meal": {
        return new Response(
          JSON.stringify({
            text: "🍽️ Verstanden – Mahlzeit erkannt. Soll ich sie jetzt analysieren und ins Tagebuch übernehmen? Antworte mit 'ja' oder teile ein Foto.",
            routed: "meal",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      case "weight": {
        return new Response(
          JSON.stringify({
            text: "⚖️ Gewicht erkannt. Öffne die Gewichtserfassung? Antworte mit 'ja' oder nenne direkt dein Gewicht (z. B. 82.4 kg).",
            routed: "weight",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      case "diary": {
        return new Response(
          JSON.stringify({
            text: "📝 Tagebuch erkannt. Möchtest du, dass ich das so speichere? Antworte mit 'ja' oder passe den Text an.",
            routed: "diary",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      case "advice": {
        return new Response(
          JSON.stringify({
            text: "💡 Klar! Was ist dein Ziel für heute – Technik, Volumen oder Regeneration?",
            routed: "advice",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      default: {
        return new Response(
          JSON.stringify({
            text: "👍 Verstanden. Möchtest du Training loggen, eine Mahlzeit analysieren oder etwas anderes?",
            routed: "chat",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
  } catch (error) {
    console.error("coach-orchestrator error", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
