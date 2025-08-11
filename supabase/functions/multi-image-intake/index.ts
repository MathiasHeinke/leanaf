import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers incl. tracing propagation
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-source, x-chat-mode",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Simple telemetry helper (best-effort; non-fatal on failure)
async function logTraceEvent(supabase: any, e: {
  traceId: string;
  userId?: string | null;
  stage:
    | "received"
    | "tool_exec"
    | "tool_result"
    | "merge"
    | "reply_send"
    | "error";
  handler: string;
  status: "RUNNING" | "OK" | "ERROR";
  latencyMs?: number | null;
  payload?: unknown;
  errorMessage?: string | null;
}) {
  try {
    // Attempt to persist to orchestrator_traces (if table + RLS allow)
    await supabase.from("orchestrator_traces").insert({
      trace_id: e.traceId,
      user_id: e.userId ?? null,
      stage: e.stage,
      handler_name: e.handler,
      status: e.status,
      latency_ms: e.latencyMs ?? null,
      payload_json: softTruncate(e.payload ?? null),
      error_message: e.errorMessage ?? null,
    });
  } catch (err) {
    // Last resort: console log
    console.log("[trace]", JSON.stringify({ ...e, payload: softTruncate(e.payload ?? null) }));
  }
}

function softTruncate(obj: any, maxLen: number = 8000) {
  try {
    const s = JSON.stringify(obj ?? null);
    if (!s) return null;
    if (s.length > maxLen) {
      return { __truncated__: true };
    }
    return obj;
  } catch {
    return { __truncated__: true };
  }
}

// Fake classifier placeholder – replace with real model/logic if available
async function classifyOne(url: string) {
  // Simulate minimal async latency
  await new Promise((r) => setTimeout(r, 10));
  return { url, kind: "unknown", items: [], notes: null };
}

// Timeout guard per image to avoid worker stalls
async function withTimeout<T>(p: Promise<T>, ms = 10000): Promise<T> {
  let t: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    // deno-lint-ignore no-explicit-any
    t = setTimeout(() => reject(new Error("timeout")) as any, ms) as any;
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (t) clearTimeout(t as any);
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabase = createClient(supabaseUrl!, supabaseKey!);

  const traceId = req.headers.get("x-trace-id") ?? crypto.randomUUID();
  const source = req.headers.get("x-source") ?? "unknown";
  const chatMode = req.headers.get("x-chat-mode") ?? "";

  let payload: any = {};
  try {
    payload = await req.json();
  } catch (_) {
    // ignore
  }

  const userId: string | undefined = payload?.userId ?? undefined;
  const images: string[] = Array.isArray(payload?.images) ? payload.images : [];

  const MAX_IMAGES = 5;

  // Initial trace
  await logTraceEvent(supabase, {
    traceId,
    userId,
    stage: "received",
    handler: "multi-image-intake",
    status: "RUNNING",
    payload: { nImages: images.length, source, chatMode },
  });
  await logTraceEvent(supabase, {
    traceId,
    userId,
    stage: "reflect",
    handler: "multi-image-intake",
    status: "OK",
    payload: { nImages: images.length, source, chatMode },
  });

  // Server-side cap with friendly 400
  if (images.length > MAX_IMAGES) {
    await logTraceEvent(supabase, {
      traceId,
      userId,
      stage: "tool_result",
      handler: "multi-image-intake",
      status: "ERROR",
      payload: { too_many_images: true, n: images.length, max: MAX_IMAGES },
      errorMessage: "too_many_images",
    });

    const body = { ok: false, error: "too_many_images", max: MAX_IMAGES, traceId };
    return new Response(JSON.stringify(body), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json", "x-trace-id": traceId },
    });
  }

  // Concurrency pool (max 3)
  const startTotal = performance.now();
  const queue = [...images];
  const results: any[] = [];
  const worker = async () => {
    while (queue.length) {
      const url = queue.shift()!;
      const t0 = performance.now();
      await logTraceEvent(supabase, {
        traceId,
        userId,
        stage: "tool_exec",
        handler: "image-classifier",
        status: "RUNNING",
        payload: { url },
      });
      try {
        const out = await withTimeout(classifyOne(url), 10000);
        const t1 = performance.now();
        results.push(out);
        await logTraceEvent(supabase, {
          traceId,
          userId,
          stage: "tool_result",
          handler: "image-classifier",
          status: "OK",
          latencyMs: Math.round(t1 - t0),
          payload: { url },
        });
      } catch (err: any) {
        const t1 = performance.now();
        await logTraceEvent(supabase, {
        traceId,
        userId,
        stage: "tool_result",
        handler: "image-classifier",
        status: "ERROR",
        latencyMs: Math.round(t1 - t0),
        payload: { url },
        errorMessage: String(err?.message ?? err ?? "error"),
        });
      }
    }
  };

  const workers = Array.from({ length: Math.min(3, queue.length || 1) }, () => worker());
  await Promise.all(workers);
  const endClassify = performance.now();

  // Merge/consolidate step (placeholder)
  const mergeStart = performance.now();
  const consolidated = {
    items: results.flatMap((r) => r.items ?? []),
    topPickIdx: 0,
  } as any;
  const preview = {
    title: "Analyse-Vorschau",
    description: images.length > 1 ? `${images.length} Bilder verarbeitet` : `1 Bild verarbeitet`,
    bullets: images.slice(0, 5).map((u, i) => `Bild ${i + 1}`),
  };
  const mergeEnd = performance.now();

  // Final telemetry
  const classifyMs = Math.round(endClassify - startTotal);
  const mergeMs = Math.round(mergeEnd - mergeStart);
  const totalMs = Math.round(mergeEnd - startTotal);

  await logTraceEvent(supabase, {
    traceId,
    userId,
    stage: "merge",
    handler: "multi-image-intake",
    status: "OK",
    latencyMs: mergeMs,
    payload: { classifyMs, mergeMs, totalMs, nImages: images.length },
  });

  await logTraceEvent(supabase, {
    traceId,
    userId,
    stage: "reply_send",
    handler: "multi-image-intake",
    status: "OK",
    latencyMs: totalMs,
    payload: { source, chatMode, nImages: images.length },
  });

  // Response
  return new Response(
    JSON.stringify({ ok: true, preview, consolidated, traceId, max: MAX_IMAGES, metrics: { classifyMs, mergeMs, totalMs } }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "x-trace-id": traceId },
    }
  );
});
