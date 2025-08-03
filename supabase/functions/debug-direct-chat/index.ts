import { serve } from "https://deno.land/std@0.205.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts"; // fetch-polyfill

const supaUrl = Deno.env.get("SUPABASE_URL")!;
const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openKey = Deno.env.get("OPENAI_API_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, authorization, x-client-info, accept, accept-profile, content-profile",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { userId, message, coachId = "lucy", model = "gpt-4.1-2025-04-14" } = await req.json();
    if (!userId || !message) {
      return json(400, { error: "`userId` und `message` sind Pflicht." });
    }

    console.log(`🔧 Debug-Direct-Chat: User ${userId}, Coach ${coachId}, Model ${model}, Message: ${message.substring(0, 50)}...`);
    console.log(`🔧 Deployment timestamp: ${new Date().toISOString()}`);

    /* ---------- 1. minimales System-Prompt (Coach-Persona) ---------- */
    const supa = createClient(supaUrl, supaKey, { auth: { persistSession: false } });
    
    // Simplified coach personas for debugging
    const coachPersonas: Record<string, string> = {
      lucy: "Du bist Lucy, ein empathischer Ernährungs-Coach. Antworte freundlich und hilfreich.",
      sascha: "Du bist Sascha, ein motivierender Fitness-Coach. Antworte energisch und ermutigend.",
      sophia: "Du bist Dr. Sophia, eine integrale Gesundheitsexpertin. Antworte wissenschaftlich fundiert aber verständlich.",
      vita: "Du bist Dr. Vita Femina, Spezialistin für Frauengesundheit. Antworte einfühlsam und kompetent."
    };

    const systemPrompt = coachPersonas[coachId] ?? coachPersonas.lucy;

    /* ---------- 2. OpenAI-Call ohne Schnickschnack ---------- */
    console.log(`🔧 Sending to OpenAI with model: ${model}`);
    
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${openKey}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`🔧 OpenAI-Error ${res.status}:`, errorText);
      throw new Error(`OpenAI-Error ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content ?? "";

    console.log(`🔧 OpenAI Response: ${answer.substring(0, 100)}... (${data.usage?.total_tokens} tokens)`);

    /* ---------- 3. (optional) Roh loggen für spätere Analyse ---------- */
    try {
      await supa.from("debug_logs").insert({
        user_id: userId,
        coach_id: coachId,
        user_msg: message,
        assistant_msg: answer,
        tokens: data.usage?.total_tokens,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.warn("🔧 Debug log insert failed:", logError);
      // Continue anyway - logging failure shouldn't break the debug flow
    }

    return json(200, {
      role: "assistant",
      content: answer,
      debug: { 
        tokens: data.usage?.total_tokens,
        model: model,
        timestamp: new Date().toISOString()
      },
    });
  } catch (e) {
    console.error("🔧 DBG-Direct-Chat ❌", e);
    return json(500, { error: e.message ?? e });
  }
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}