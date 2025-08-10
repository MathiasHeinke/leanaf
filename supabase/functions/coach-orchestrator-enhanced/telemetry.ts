import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function logTrace(entry: { traceId: string; stage: string; data: unknown }) {
  console.log("[trace]", JSON.stringify(entry));
}

export async function logUnmetTool(
  supabaseOrArgs: any,
  maybeArgs?: {
    userId: string; traceId: string; event: any; intent: any;
    handledManually: boolean; error?: string|null; source?: string; clientEventId?: string;
  }
) {
  // Support calling either as logUnmetTool(supabase, args) or logUnmetTool(args)
  const hasClient = !!maybeArgs;
  const args = (hasClient ? maybeArgs : supabaseOrArgs) as any;

  let supabase = hasClient ? supabaseOrArgs : null;
  if (!supabase) {
    // Fallback: construct client with current Authorization header if present
    const auth = (globalThis as any)?.Deno?.env?.get?.("AUTHORIZATION") || "";
    supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
  }

  const payload = {
    user_id: args.userId,
    trace_id: args.traceId,
    message: args.event?.type === "TEXT" ? (args.event?.text ?? "") : (args.event?.type ?? ""),
    intent_guess: args.intent?.name ?? "unknown",
    confidence: args.intent?.score ?? null,
    suggested_tool: args.intent?.toolCandidate ?? null,
    handled_manually: args.handledManually,
    error: args.error ?? null,
    source: args.source ?? "chat",
    client_event_id: args.clientEventId ?? null,
  };

  try {
    await supabase.from("unmet_tool_events").insert(payload);
  } catch (e) {
    console.warn("unmet_tool_events insert failed (non-fatal)", e);
  }
}
