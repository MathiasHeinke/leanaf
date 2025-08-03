import { z } from "zod";

export const CtxInput = z.object({
  userId: z.string().uuid(),
  coachId: z.string(),
  userMessage: z.string(),
  enableRag: z.boolean().optional().default(false),
  tokenCap: z.number().optional().default(8_000)
});
export type CtxInput = z.infer<typeof CtxInput>;

export type BuiltCtx = {
  persona: { name: string; style: string[] };
  memory: { relationship?: string; trust?: number; summary?: string } | null;
  daily: { caloriesLeft?: number; lastWorkout?: string; sleepHours?: number } | null;
  ragChunks: { source: string; text: string }[] | null;
  conversationSummary: string | null;
  metrics: { tokensIn: number };
};

function approxTokens(s: string): number {
  return Math.ceil((s || "").length / 4);
}

function hardTrim(str: string, tokenCap: number): string {
  const charCap = tokenCap * 4;
  if (str.length <= charCap) return str;
  return str.slice(0, charCap);
}

async function safe<T>(p: Promise<T>): Promise<T | null> {
  try { 
    return await p; 
  } catch (error) {
    console.warn('Context loader failed:', error);
    return null; 
  }
}

// Dummy loaders that integrate with existing infrastructure
async function getCoachPersona(coachId: string) {
  // This would integrate with your existing coach personas
  const personas: Record<string, any> = {
    lucy: { name: "Lucy", style: ["direkt", "empathisch", "lösungsorientiert"] },
    markus: { name: "Markus", style: ["motivierend", "kraftsport-fokussiert", "präzise"] },
    vita: { name: "Dr. Vita", style: ["wissenschaftlich", "ganzheitlich", "präventiv"] },
    sophia: { name: "Dr. Sophia", style: ["integral", "bewusstseinsorientiert", "transformativ"] }
  };
  return personas[coachId] || { name: "Coach", style: ["direkt", "lösungsorientiert"] };
}

async function loadCoachMemory(userId: string, coachId: string) {
  // This would integrate with your existing coach memory system
  return {
    relationship: "aufbauend",
    trust: 75,
    summary: "Nutzer bevorzugt kurze, präzise Anweisungen"
  };
}

async function loadConversationSummary(userId: string, coachId: string) {
  // This would integrate with your existing conversation memory
  return "Letzte Sessions: Fokus auf Ernährungsoptimierung und Trainingsplanung";
}

async function loadDailySummary(userId: string) {
  // This would integrate with your existing daily tracking
  return {
    caloriesLeft: 520,
    lastWorkout: "Push Training gestern",
    sleepHours: 7.2
  };
}

async function runRag(query: string, coachId: string) {
  // This would integrate with your existing RAG system
  return {
    chunks: [
      { source: "nutrition-guide.md", text: "Proteinziel: 1.8-2.2g/kg Körpergewicht täglich" },
      { source: "training-basics.md", text: "Progressive Overload ist der Schlüssel für kontinuierliche Kraftsteigerung" }
    ]
  };
}

/**  
 * Builds comprehensive AI context with fail-soft pattern
 * - Promise.allSettled ⇒ no 500s if subsystems fail
 * - Token HardCap ⇒ protection against >32k inputs
 */
export async function buildAIContext(rawInput: CtxInput): Promise<BuiltCtx> {
  const input = CtxInput.parse(rawInput);

  // 1) Load everything in parallel - individual failures allowed
  const [
    personaRes,
    memoryRes,
    convoRes,
    dailyRes,
    ragRes
  ] = await Promise.allSettled([
    getCoachPersona(input.coachId),
    loadCoachMemory(input.userId, input.coachId),
    loadConversationSummary(input.userId, input.coachId),
    loadDailySummary(input.userId),
    input.enableRag ? runRag(input.userMessage, input.coachId) : null
  ]);

  // 2) Fail-soft ⇢ null instead of throwing
  const persona = personaRes.status === "fulfilled"
    ? personaRes.value
    : { name: "Coach", style: ["direkt", "lösungsorientiert"] };

  const memory = memoryRes.status === "fulfilled" ? memoryRes.value : null;
  const conversationSummary = convoRes.status === "fulfilled" ? convoRes.value : null;
  const daily = dailyRes.status === "fulfilled" ? dailyRes.value : null;
  const ragChunks = ragRes?.status === "fulfilled" ? ragRes.value?.chunks : null;

  // 3) Token budget enforcement (≈4 chars/token rule of thumb)
  const budget = input.tokenCap;
  const metrics = { tokensIn: 0 };

  const trim = (txt?: string | null) => {
    if (!txt) return txt;
    metrics.tokensIn += approxTokens(txt);
    return hardTrim(txt, budget);
  };

  return {
    persona,
    memory,
    daily,
    ragChunks: ragChunks?.slice(0, 6) ?? null,   // max 6 chunks
    conversationSummary: trim(conversationSummary),
    metrics
  };
}