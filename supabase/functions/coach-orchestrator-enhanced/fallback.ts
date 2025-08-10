// deno-lint-ignore-file no-explicit-any
export type Event = { type: "TEXT"|"IMAGE"|"END"; text?: string; url?: string; clientEventId: string; context?: any };
export type Intent = { name: string; score: number; toolCandidate?: string|null };

export interface FallbackDeps {
  buildManualAnswer: (intent: Intent, ev: Event) => Promise<string> | string;
  logUnmetTool: (args: LogArgs) => Promise<void> | void;
  logTrace?: (entry: { traceId: string; stage: string; data: unknown }) => Promise<void>|void;
}

export type LogArgs = {
  userId: string; traceId: string; event: Event; intent: Intent;
  handledManually: boolean; error?: string|null; source?: string; clientEventId?: string;
};

export async function fallbackFlow(
  userId: string,
  traceId: string,
  event: Event,
  intent: Intent,
  deps: FallbackDeps,
  opts: { clarify?: boolean; source?: string } = {}
) {
  const reply = await deps.buildManualAnswer(intent, event);
  await deps.logUnmetTool({
    userId, traceId, event, intent,
    handledManually: true, error: null,
    source: opts.source ?? "chat",
    clientEventId: event.clientEventId
  });
  await deps.logTrace?.({ traceId, stage: "fallback_llm_only", data: { intent } });
  return { reply, flags: { unmet_tool: true }, traceId };
}
