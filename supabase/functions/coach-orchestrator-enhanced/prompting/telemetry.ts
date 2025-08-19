// Telemetry for ARES v2 debugging and monitoring
export type AresTurnData = {
  personaVersion: string;
  dial: number;
  archetype: string;
  nameKnown: boolean;
  recallGoals: boolean;
  model: string;
  temp?: number;
  maxWords: number;
  shortUsed?: string;
  deepUsed?: string;
  responseLength: number;
  wasRedundant?: boolean;
  toolsTriggered?: string[];
  userMsgLength: number;
  processingTimeMs?: number;
};

export function logTurnDebug(data: AresTurnData) {
  console.info("[ARES-V2-TURN]", {
    version: data.personaVersion,
    dial: data.dial,
    archetype: data.archetype,
    nameKnown: data.nameKnown,
    recallGoals: data.recallGoals,
    model: data.model,
    temp: data.temp,
    maxWords: data.maxWords,
    responseLength: data.responseLength,
    userMsgLength: data.userMsgLength,
    wasRedundant: data.wasRedundant,
    toolsTriggered: data.toolsTriggered?.length || 0,
    processingTime: data.processingTimeMs
  });
}

export function logNameResolverEvent(event: {
  userId: string;
  action: 'ask' | 'persist' | 'load' | 'found';
  name?: string;
  success?: boolean;
}) {
  console.info("[ARES-V2-NAME]", {
    action: event.action,
    hasName: !!event.name,
    success: event.success
  });
}

export function logGoalGateEvent(event: {
  triggered: boolean;
  reason?: string;
  goalCount?: number;
  userMsg: string;
}) {
  console.info("[ARES-V2-GOALS]", {
    triggered: event.triggered,
    reason: event.reason,
    goalCount: event.goalCount,
    msgLength: event.userMsg.length
  });
}

export function logAntiRepeatEvent(event: {
  candidate: string;
  isRedundant: boolean;
  similarity?: number;
  historySize: number;
  fallbackUsed?: boolean;
}) {
  console.info("[ARES-V2-REPEAT]", {
    isRedundant: event.isRedundant,
    similarity: event.similarity,
    historySize: event.historySize,
    candidateLength: event.candidate.length,
    fallbackUsed: event.fallbackUsed
  });
}

export function logModelRouterEvent(event: {
  chatModel: string;
  toolsModel: string;
  reason: string;
  costSensitive?: boolean;
  highFidelity?: boolean;
}) {
  console.info("[ARES-V2-MODEL]", {
    chatModel: event.chatModel,
    toolsModel: event.toolsModel,
    reason: event.reason,
    costSensitive: event.costSensitive,
    highFidelity: event.highFidelity
  });
}

export async function logToSupabase(
  supabase: any,
  traceId: string,
  stage: string,
  data: any
) {
  try {
    await supabase.from('coach_traces').insert({
      trace_id: traceId,
      ts: new Date().toISOString(),
      stage,
      data: {
        version: 'v2',
        ...data
      }
    });
  } catch (error) {
    console.warn('Failed to log to Supabase:', error);
  }
}