// ARES Prompt Builder v2: Human-like flow, no goal preaching
import { dialSettings } from "./dials.ts";
import { shouldRecallGoals } from "./gates.ts";

export type PromptContext = {
  identity: { 
    name?: string | null; 
    greetName?: string | null; 
  };
  dial: 1 | 2 | 3 | 4 | 5;
  userMsg: string;
  metrics?: { 
    kcalDeviation?: number; 
    missedMissions?: number; 
    dailyReview?: boolean; 
  };
  facts?: { 
    weight?: number; 
    goalWeight?: number; 
    tdee?: number; 
  } | null;
  goals?: { 
    short?: string; 
    long?: string; 
  }[] | null;
  attachDeep?: boolean;
  timeOfDay?: "morning" | "day" | "evening";
  personalityVersion?: string;
  conversationHistory?: string[];
};

export type PromptResult = {
  system: string;
  user: string;
  extra: {
    temp?: number;
    recallGoals: boolean;
    archetype: string;
    maxWords: number;
    askForName?: boolean;
  };
};

export function buildAresPromptV2(ctx: PromptContext): PromptResult {
  const dial = dialSettings(ctx.dial);
  
  // Name handling
  const nameLine = ctx.identity.name 
    ? `Nutze den Namen sparsam und natürlich: ${ctx.identity.name}.`
    : "Frage einmal freundlich nach dem Namen, wenn er dir fehlt – danach nicht erneut.";

  // Goal recall gate
  const recallGoals = shouldRecallGoals({ 
    userMsg: ctx.userMsg, 
    metrics: ctx.metrics 
  });

  const conciseGoals = recallGoals && ctx.goals?.length
    ? `Relevante Ziele (kurz erwähnen, keine Predigt): ${ctx.goals.slice(0, 2).map(g => g.short || g.long).join(" • ")}`
    : "";

  // Core persona rules
  const personaRules = `
Du bist ARES – vielschichtiger männlicher Mentor.
Sprich menschlich, höre zu, stelle Rückfragen, antworte variabel.
Vermeide Wiederholungen und Ziel-Predigten. 
Nenne maximal EINE konkrete Next Action, wenn sinnvoll.
${nameLine}
Wenn nach "Warum/Erklärung" gefragt wird, liefere klare, kurze Begründung (1-2 Sätze).

Tools: Nutze sie erst nach kurzer Bestätigung, nicht sofort.
`;

  // Context facts
  const contextFacts = [
    ctx.facts?.weight ? `Gewicht: ${ctx.facts.weight} kg` : null,
    ctx.facts?.goalWeight ? `Zielgewicht: ${ctx.facts.goalWeight} kg` : null,
    ctx.facts?.tdee ? `TDEE ca.: ${ctx.facts.tdee} kcal` : null,
    conciseGoals || null
  ].filter(Boolean).join("\n- ");

  // Length and style guidance
  const lengthHint = `
Antworte in ${dial.maxWords <= 90 ? "knappen" : "normalen"} Sätzen.
Gesamtlänge ≤ ${dial.maxWords} Wörter.
Stil: ${dial.archetype} - ${dial.style}.
`;

  // Time-based adjustments
  const timeContext = ctx.timeOfDay === "morning" 
    ? "Es ist Morgen - kurz und motivierend."
    : ctx.timeOfDay === "evening"
    ? "Es ist Abend - reflektierend und ruhiger."
    : "";

  // Build final system prompt
  const systemPrompt = [
    personaRules,
    `Aktueller Archetyp: ${dial.archetype}.`,
    lengthHint,
    timeContext,
    contextFacts ? `Kontext:\n- ${contextFacts}` : ""
  ].filter(Boolean).join("\n\n");

  return {
    system: systemPrompt,
    user: ctx.userMsg,
    extra: {
      temp: dial.temp,
      recallGoals,
      archetype: dial.archetype,
      maxWords: dial.maxWords,
      askForName: !ctx.identity.name && !recallGoals
    }
  };
}

// Helper to detect if user is asking for explanation
export function wantsExplanation(userMsg: string): boolean {
  return /(warum|wieso|weshalb|wie kommt|erkläre|begründe|why|explain)/i.test(userMsg);
}

// Helper to extract key metrics for prompt context
export function extractMetrics(userContext: any) {
  return {
    kcalDeviation: userContext?.nutrition?.deviation || 0,
    missedMissions: userContext?.missed?.count || 0,
    dailyReview: userContext?.isReview === true
  };
}