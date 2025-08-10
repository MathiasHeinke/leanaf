// telemetry utilities (no local Supabase client needed)

export async function logTrace(entry: { traceId: string; stage: string; data: unknown }) {
  console.log("[trace]", JSON.stringify(entry));
}

export async function logUnmetTool(
  supabase: any,
  args: {
    userId: string; traceId: string; event: any; intent: any;
    handledManually: boolean; error?: string|null; source?: string; clientEventId?: string;
  }
) {
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
