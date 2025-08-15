export type TraceRow = {
  id: number;
  trace_id: string;
  timestamp: string; // timestamptz
  user_id: string | null;
  coach_id: string | null;
  stage: string; // 'received'|'route_decision'|...|'error'
  handler_name: string | null;
  status: 'OK' | 'RUNNING' | 'ERROR';
  latency_ms: number | null;
  payload_json: any | null;
  error_message: string | null;
};

export type TraceStage = {
  stage: string;
  handler?: string | null;
  status: 'OK' | 'RUNNING' | 'ERROR';
  latency_ms?: number | null;
  at: string;
  row: TraceRow;
};

export type TraceBundle = {
  traceId: string;
  startedAt: string; // min timestamp
  lastEventAt: string; // max timestamp
  userId?: string | null;
  coachId?: string | null;
  stages: TraceStage[]; // sorted by time
  agg: { status: 'green' | 'yellow' | 'red'; maxLatencyMs: number; hasError: boolean; running: boolean };
  hasPromptData?: boolean; // indicates if prompt viewer data is available
};

export const SLA_MS = 2000;

export function aggregateTrace(rows: TraceRow[]): TraceBundle {
  // Sort by timestamp ascending
  const sorted = [...rows].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const traceId = sorted[0]?.trace_id ?? '';
  const startedAt = sorted[0]?.timestamp ?? new Date().toISOString();
  const lastEventAt = sorted[sorted.length - 1]?.timestamp ?? startedAt;
  const userId = sorted[0]?.user_id ?? null;
  const coachId = sorted[0]?.coach_id ?? null;

  let maxLatencyMs = 0;
  let hasError = false;
  let hasRunning = false;

  const stages: TraceStage[] = sorted.map((r) => {
    maxLatencyMs = Math.max(maxLatencyMs, r.latency_ms ?? 0);
    if (r.status === 'ERROR') hasError = true;
    if (r.status === 'RUNNING') hasRunning = true;
    return {
      stage: r.stage,
      handler: r.handler_name,
      status: r.status,
      latency_ms: r.latency_ms ?? undefined,
      at: r.timestamp,
      row: r,
    };
  });

  const running = hasRunning && !hasError;
  const status: 'green' | 'yellow' | 'red' = hasError ? 'red' : running || maxLatencyMs >= SLA_MS ? 'yellow' : 'green';

  // Check if prompt data might be available
  const hasPromptData = sorted.some(r => 
    r.stage.includes('prompt') || 
    r.stage.includes('llm') || 
    r.stage.includes('context') || 
    r.stage.includes('rag')
  );

  return {
    traceId,
    startedAt,
    lastEventAt,
    userId,
    coachId,
    stages,
    agg: { status, maxLatencyMs, hasError, running },
    hasPromptData,
  };
}
