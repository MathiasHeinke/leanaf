
/* deno-lint-ignore-file no-explicit-any */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { parseSetLine } from "./tools/set-parser.ts";
import { detectExerciseFromText } from "./tools/exercise-detect.ts";
import { buildSummaryMarkdown } from "./tools/analysis.ts";
import { logTraceEvent } from "../telemetry.ts";

const SUPABASE_URL = "https://gzczjscctgyxjyodhnhk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I";

type CoachEvent = { type: "TEXT"; text: string } | { type: "IMAGE"; url: string } | { type: "END" };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  try {
    const body = await req.json();
    const event: CoachEvent = body?.event;
    const clientEventId: string | undefined = body?.clientEventId;

    if (!event || !event.type) {
      return json({ error: "Invalid payload" }, 400);
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    // 1) Find or create active session
    const { data: activeSession } = await supabase
      .from("exercise_sessions")
      .select("id, metadata, end_time")
      .eq("user_id", userId)
      .is("end_time", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let sessionId = activeSession?.id as string | undefined;
    let metadata: any = activeSession?.metadata ?? {};

    if (!sessionId) {
      const { data: newSession, error: createErr } = await supabase
        .from("exercise_sessions")
        .insert([{ user_id: userId, metadata: {} }])
        .select("id, metadata")
        .single();
      if (createErr || !newSession) throw createErr ?? new Error("Failed to create session");
      sessionId = newSession.id;
      metadata = newSession.metadata ?? {};
    }

    // Ensure metadata structure
    metadata = metadata && typeof metadata === "object" ? metadata : {};
    const pending = metadata.pending ?? null;

    // 2) Handle events
    if (event.type === "IMAGE") {
      const vision = await detectExerciseFromImage(event.url);
      const guessName = vision?.name;
      const confidence = Number(vision?.confidence ?? 0);

      if (!guessName || confidence < 0.55) {
        return await updateAndReply(supabase, sessionId, {
          text: "Bild erhalten 👌 Ich bin mir nicht sicher, welche Übung das ist. Bitte nenne die Übung (z. B. Bankdrücken, Rudern).",
          state: { sessionId, pending: null },
        });
      }

      // Resolve exercise id from DB (exact, then ilike fallback)
      const { data: exact } = await supabase
        .from("exercises")
        .select("id, name")
        .eq("name", guessName)
        .limit(1)
        .maybeSingle();

      let exerciseId = exact?.id as string | undefined;
      if (!exerciseId) {
        const token = guessName.split(" ")[0];
        const { data: similar } = await supabase
          .from("exercises")
          .select("id, name")
          .ilike("name", `%${token}%`)
          .limit(1);
        exerciseId = similar?.[0]?.id;
      }

      if (!exerciseId) {
        return await updateAndReply(supabase, sessionId, {
          text: `Ich glaube, es ist "${guessName}" (Sicherheit ${(confidence * 100).toFixed(0)}%). Bitte bestätige den Namen oder nenne die Übung.`,
          state: { sessionId, pending: null },
        });
      }

      const newMeta = { ...metadata, pending: { exercise_id: exerciseId, missing: ["weight", "reps", "rpe"], source: "image" } };
      await supabase.from("exercise_sessions").update({ metadata: newMeta }).eq("id", sessionId);

      return jsonOK({
        text: `Erkannt: **${guessName}** (Sicherheit ${(confidence * 100).toFixed(0)}%). Bitte Gewicht, Wiederholungen & RPE angeben.`,
        state: { sessionId, pending: newMeta.pending },
      });
    }

    if (event.type === "TEXT") {
      // a) Pending → Satz parsen und speichern
      if (pending?.exercise_id) {
        const parsed = parseSetLine(event.text);
        if (!parsed) {
          return await updateAndReply(supabase, sessionId, {
            text: "Konnte den Satz nicht sicher lesen. Beispiel: 10x 60kg RPE 7",
            state: { sessionId, pending },
          });
        }

        // Idempotenz optional
        const ceid = clientEventId ?? crypto.randomUUID();

        // set_number ermitteln (COUNT(session_id, exercise_id) + 1)
        const { count: existingCount } = await supabase
          .from("exercise_sets")
          .select("id", { count: "exact", head: true })
          .eq("session_id", sessionId)
          .eq("exercise_id", pending.exercise_id);
        const nextSetNumber = (existingCount ?? 0) + 1;

        const insertPayload: any = {
          session_id: sessionId,
          user_id: userId,
          exercise_id: pending.exercise_id,
          set_number: nextSetNumber,
          weight_kg: parsed.weight,
          reps: parsed.reps,
          rpe: parsed.rpe ?? null,
          origin: pending?.source ?? "manual",
          client_event_id: ceid,
        };

        const { error: setErr } = await supabase.from("exercise_sets").insert([insertPayload]);
        if (setErr) {
          // Falls Duplikat (idempotent) oder FK-Problem – nur loggen, UI bleibt positiv
          console.log("Insert set failed", setErr);
        }

        // Clear pending
        const newMeta = { ...metadata, pending: null };
        await supabase.from("exercise_sessions").update({ metadata: newMeta }).eq("id", sessionId);

        return jsonOK({
          text: "Satz gespeichert. Nächste Übung oder Foto?",
          state: { sessionId, pending: null },
        });
      }

      // b) Keine Pending → Übung aus Text erkennen und Exercise-ID auflösen
      const guess = detectExerciseFromText(event.text);
      if (!guess) {
        return await updateAndReply(supabase, sessionId, {
          text: "Welche Übung? (z. B. Bankdrücken, OHP, Rudern, Latzug)",
          state: { sessionId, pending: null },
        });
      }

      // Exercise-ID aus Katalog/DB auflösen
      const { data: exact } = await supabase
        .from("exercises")
        .select("id, name")
        .eq("name", guess.name)
        .limit(1)
        .maybeSingle();

      let exerciseId = exact?.id as string | undefined;

      if (!exerciseId) {
        // Fallback: ILIKE
        const { data: similar } = await supabase
          .from("exercises")
          .select("id, name")
          .ilike("name", `%${guess.name.split(" ")[0]}%`)
          .limit(1);

        exerciseId = similar?.[0]?.id;
      }

      if (!exerciseId) {
        // Kein Treffer -> Nutzer nach Bestätigung/Namen fragen
        return await updateAndReply(supabase, sessionId, {
          text: `Meintest du "${guess.name}"? Bestätige den Namen oder nenne die Übung.`,
          state: { sessionId, pending: null },
        });
      }

      const newMeta = { ...metadata, pending: { exercise_id: exerciseId, missing: ["weight", "reps", "rpe"] } };
      await supabase.from("exercise_sessions").update({ metadata: newMeta }).eq("id", sessionId);

      return jsonOK({
        text: `**${guess.name}** – bitte Gewicht, Wiederholungen & RPE angeben.`,
        state: { sessionId, pending: newMeta.pending },
      });
    }

    if (event.type === "END") {
      // Sets + Exercises laden für Summary
      const { data: rows, error: qErr } = await supabase
        .from("exercise_sets")
        .select(
          `
          weight_kg, reps, rpe,
          exercises ( name )
        `
        )
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (qErr) {
        console.log("Query sets failed", qErr);
      }

      const exs = (rows ?? []).reduce<Record<string, { name: string; sets: any[] }>>((acc, r: any) => {
        const name = r.exercises?.name ?? "Übung";
        if (!acc[name]) acc[name] = { name, sets: [] };
        acc[name].sets.push({ weight: Number(r.weight_kg || 0), reps: Number(r.reps || 0), rpe: r.rpe ?? undefined });
        return acc;
      }, {});

      const md = buildSummaryMarkdown(Object.values(exs));

      // Session beenden
      await supabase
        .from("exercise_sessions")
        .update({ end_time: new Date().toISOString(), metadata: { ...metadata, pending: null, summary: md } })
        .eq("id", sessionId);

      return jsonOK({ text: md, end: true, state: { sessionId, pending: null } });
    }

    return jsonOK({ text: "Sag mir die nächste Übung oder lade ein Foto hoch.", state: { sessionId, pending } });
  } catch (e) {
    console.error("orchestrator error", e);
    return json({ error: "Server error" }, 500);
  }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });
}
function jsonOK(body: any) {
  return json(body, 200);
}

async function updateAndReply(supabase: any, sessionId: string, payload: any) {
  if (payload?.state?.pending !== undefined) {
    const { data: sess } = await supabase.from("exercise_sessions").select("metadata").eq("id", sessionId).single();
    const meta = { ...(sess?.metadata ?? {}), pending: payload.state.pending };
    await supabase.from("exercise_sessions").update({ metadata: meta }).eq("id", sessionId);
  }
  return json(payload, 200);
}

async function detectExerciseFromImage(imageUrl: string): Promise<{ name?: string; confidence?: number; raw?: any }> {
  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not set');
      return {};
    }
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You extract the gym exercise being performed in an image. Reply as JSON: {"exercise":"<name>","confidence":0-1} using German names like Bankdrücken, Rudern, Schulterdrücken, Latzug, Kniebeugen, Kreuzheben.' },
          { role: 'user', content: [
            { type: 'text', text: 'Was ist die Übung? Antworte nur als kompaktes JSON. Wenn unsicher, confidence < 0.55.' },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]}
        ]
      })
    });
    if (!resp.ok) {
      console.error('OpenAI vision error', await resp.text());
      return {};
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === 'string') {
      try { const obj = JSON.parse(content); return { name: obj.exercise ?? obj.name, confidence: obj.confidence, raw: data }; } catch { return { raw: data }; }
    }
    return { raw: data };
  } catch (e) {
    console.error('detectExerciseFromImage failed', e);
    return {};
  }
}

