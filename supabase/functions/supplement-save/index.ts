// supabase/functions/supplement-save/index.ts
// Thin Function: Save a recognized supplement to the user's stack with idempotency and telemetry.
// Contract (POST): { userId?: string, item: { name: string; canonical?: string|null; dose?: string|null; confidence?: number|null; notes?: string|null; image_url?: string|null }, clientEventId?: string }

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logTraceEvent, softTruncate } from "../telemetry.ts";

type Json = Record<string, any>;

const HANDLER = "supplement-save";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-source, x-chat-mode",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();

  const traceId = req.headers.get("x-trace-id") || crypto.randomUUID();
  const authorization = req.headers.get("Authorization") ?? "";
  const source = req.headers.get("x-source") ?? "chat";
  const chatMode = req.headers.get("x-chat-mode") ?? "";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });

  try {
    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      item?: {
        name?: string;
        canonical?: string | null;
        dose?: string | null;
        confidence?: number | null;
        notes?: string | null;
        image_url?: string | null;
      };
      clientEventId?: string;
    };

    const { data: userRes } = await supabase.auth.getUser();
    const authUserId = userRes?.user?.id ?? null;

    const inputUserId = body?.userId;
    const item = body?.item;
    const clientEventId = body?.clientEventId;
    const userId = inputUserId || authUserId || null;

    await logTraceEvent(supabase, {
      traceId,
      userId,
      coachId: null,
      stage: "received",
      handler: HANDLER,
      status: "RUNNING",
      payload: softTruncate(
        { input: { hasItem: Boolean(item), hasClientEventId: Boolean(clientEventId) }, headers: { source, chatMode } },
        4000,
      ),
    });

    if (!userId) return respond({ success: false, error: "Authentication required" }, 401);
    if (!item || !item.name || typeof item.name !== "string") {
      return respond({ success: false, error: "Invalid item: name required" }, 400);
    }

    // Map to existing schema (user_supplements)
    const normalized: Json = {
      user_id: userId,
      custom_name: String(item.name).trim().slice(0, 160),
      // dosage is NOT NULL in schema; use provided dose or empty string as fallback
      dosage: item.dose ? String(item.dose).trim().slice(0, 160) : "",
      // leave default unit/timing/is_active from DB defaults
      notes: item.notes ? String(item.notes).trim().slice(0, 1000) : null,
      image_url: item.image_url ? String(item.image_url) : null,
      confidence:
        typeof item.confidence === "number"
          ? Math.max(0, Math.min(1, item.confidence))
          : null,
      source: "recognition",
      client_event_id: clientEventId ?? null,
    };

    const execStart = Date.now();
    await logTraceEvent(supabase, {
      traceId,
      userId,
      coachId: null,
      stage: "tool_exec",
      handler: HANDLER,
      status: "RUNNING",
      payload: softTruncate({ action: "insert user_supplements" }, 2000),
    });

    const { data, error } = await supabase
      .from("user_supplements")
      .insert(normalized)
      .select(
        "id, created_at, custom_name, dosage, unit, notes, image_url, confidence, source, client_event_id",
      )
      .single();

    if (error && (error as any).code === "23505") {
      await logTraceEvent(supabase, {
        traceId,
        userId,
        coachId: null,
        stage: "tool_result",
        handler: HANDLER,
        status: "OK",
        latencyMs: Date.now() - execStart,
        payload: { idempotent: true },
      });
      await logTraceEvent(supabase, {
        traceId,
        userId,
        coachId: null,
        stage: "reply_send",
        handler: HANDLER,
        status: "OK",
        latencyMs: Date.now() - t0,
      });
      return respond({ success: true, idempotent: true, message: "Bereits gespeichert (Idempotenz)." }, 200);
    }

    if (error) throw error;

    await logTraceEvent(supabase, {
      traceId,
      userId,
      coachId: null,
      stage: "tool_result",
      handler: HANDLER,
      status: "OK",
      latencyMs: Date.now() - execStart,
      payload: softTruncate({ output: { id: data?.id } }, 2000),
    });

    const friendlyName = data?.custom_name ?? item.name;
    const friendlyDose = normalized.dosage ? ` (${normalized.dosage})` : "";

    await logTraceEvent(supabase, {
      traceId,
      userId,
      coachId: null,
      stage: "reply_send",
      handler: HANDLER,
      status: "OK",
      latencyMs: Date.now() - t0,
    });

    return respond({
      success: true,
      saved: {
        user_supplement_id: data?.id,
        name: friendlyName,
        canonical: null,
        dose: normalized.dosage,
      },
      message: `👍 Gespeichert: ${friendlyName}${friendlyDose}. Willst du tägliche Erinnerungen?`,
      record: data,
    });
  } catch (e: any) {
    try {
      await logTraceEvent(supabase, {
        traceId,
        userId: null,
        coachId: null,
        stage: "error",
        handler: HANDLER,
        status: "ERROR",
        latencyMs: Date.now() - t0,
        errorMessage: String(e?.message || e),
      });
    } catch {
      // ignore logging failure
    }
    return respond({ success: false, error: "Supplements speichern fehlgeschlagen." }, 500);
  }
});
