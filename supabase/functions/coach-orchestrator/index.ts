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

      const { data, error } = await supabase.functions.invoke('training-orchestrator', {
        body: trainingPayload,
      });

      if (error) {
        console.error("training-orchestrator proxy error", error);
        return new Response(JSON.stringify({ error: error.message || "Training orchestrator failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ...data, routed: "training" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Non-training intents: Image classification and routing
    if (event.type === "IMAGE") {
      try {
        const { data: cls, error: clsErr } = await supabase.functions.invoke('image-classifier', {
          body: { imageUrl: event.url, userId }
        });
        if (clsErr) throw clsErr;
        const category = cls?.category || 'general';
        const confidence = Number(cls?.confidence || 0);

        if (category === 'exercise') {
          // Forward image to training orchestrator
          const trainingPayload: any = { clientEventId, event };
          const { data, error } = await supabase.functions.invoke('training-orchestrator', { body: trainingPayload });
          if (error) throw error;
          return new Response(JSON.stringify({ ...data, routed: 'training' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (category === 'supplement') {
          // Log supplement recognition intent for traceability
          if (userId) {
            await supabase.from('supplement_recognition_log').insert([
              {
                user_id: userId,
                image_url: event.url,
                recognized_supplements: cls?.recognized || [],
                confidence_score: confidence || null,
                analysis_result: cls?.description || null,
              },
            ]);
          }
          return new Response(
            JSON.stringify({
              text: `💊 Supplement erkannt (Sicherheit ${(confidence * 100).toFixed(0)}%). Soll ich das speichern oder mehr Details analysieren?`,
              routed: 'supplement',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (category === 'food') {
          return new Response(
            JSON.stringify({
              text: `🍽️ Mahlzeit erkannt (Sicherheit ${(confidence * 100).toFixed(0)}%). Möchtest du, dass ich sie jetzt analysiere und speichere? Antworte mit 'ja'.`,
              routed: 'meal_image',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (category === 'body') {
          if (userId) {
            await supabase.from('target_images').insert([
              {
                user_id: userId,
                image_url: event.url,
                image_type: 'progress',
                image_category: 'body_progress',
              },
            ]);
          }
          return new Response(
            JSON.stringify({
              text: '📸 Fortschrittsfoto gespeichert. Soll ich das mit deinem Ziel verknüpfen?',
              routed: 'body_progress',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            text: '🖼️ Bild erhalten. Ich konnte es keiner Kategorie eindeutig zuordnen. Was möchtest du damit machen?',
            routed: 'image_unknown',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (e) {
        console.warn('image classification failed', e);
        return new Response(
          JSON.stringify({
            text: '📸 Bild erhalten. Kurze Analyse nicht möglich – möchtest du Training, Mahlzeit oder Supplement erfassen?',
            routed: 'image_ack',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
        // Try to parse kg from text and update profile weight
        let updated = false;
        if (event.type === "TEXT" && userId) {
          const m = (event.text || '').match(/(\d+(?:[\.,]\d+)?)\s*kg\b/i);
          if (m) {
            const kg = parseFloat(m[1].replace(',', '.'));
            if (!Number.isNaN(kg) && kg > 0 && kg < 400) {
              const { error } = await supabase.from('profiles').update({ weight: kg, updated_at: new Date().toISOString() }).eq('user_id', userId);
              if (!error) updated = true;
            }
          }
        }
        const text = updated
          ? "⚖️ Gewicht gespeichert. Möchtest du einen Trendvergleich sehen?"
          : "⚖️ Gewicht erkannt. Nenne bitte dein Gewicht in kg (z. B. 82.4 kg), dann speichere ich es.";
        return new Response(JSON.stringify({ text, routed: "weight", saved: updated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      case "diary": {
        let saved = false;
        if (event.type === "TEXT" && userId) {
          const today = new Date().toISOString().slice(0, 10);
          const content = (event.text || '').trim();
          if (content) {
            const { error } = await supabase.from('diary_entries').insert([{ user_id: userId, date: today, content }]);
            if (!error) saved = true;
          }
        }
        const text = saved ? "📝 Tagebuch-Eintrag gespeichert. Noch etwas hinzufügen?" : "📝 Tagebuch erkannt. Möchtest du das so speichern? Antworte mit dem gewünschten Text.";
        return new Response(JSON.stringify({ text, routed: "diary", saved }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
