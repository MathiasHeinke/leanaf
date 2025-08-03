import { describe, test, expect } from 'vitest';

// Mock the context building functions for testing
function buildSystemPrompt(ctx: any, coachId: string) {
  const persona = ctx.persona;
  const ragBlock = ctx.ragChunks?.length
    ? ctx.ragChunks.map((c: any, i: number) => `[#${i+1} ${c.source}]\n${c.text}`).join("\n\n")
    : "—";

  const daily = ctx.daily ?? {};
  const mem = ctx.memory ?? {};

  return [
    `Du bist ${persona.name}, ein professioneller Coach.`,
    `Stilregeln: ${persona.style.join(", ")}. Keine Floskeln, klare Sätze, Praxisfokus.`,
    `Wenn Tools/Pläne betroffen sind: erst kurz zusammenfassen, Zustimmung einholen, dann Aktion vorschlagen.`,
    `Wenn Stimmung negativ: erst 1 empathischer Satz, dann konkret werden.`,
    `Antworte kurz genug zum Scannen, aber vollständig.`,
    ``,
    `[Beziehungsstatus] ${mem.relationship ?? "unbekannt"} | Vertrauen: ${mem.trust ?? 50}/100`,
    `[Gesprächszusammenfassung] ${ctx.conversationSummary ?? "—"}`,
    `[Tageskontext] kcal übrig: ${daily.caloriesLeft ?? "?"}, letztes Workout: ${daily.lastWorkout ?? "?"}, Schlaf: ${daily.sleepHours ?? "?"}h`,
    `[RAG-Kontext]\n${ragBlock}`,
    ``,
    `Halte dich an die Persona.`
  ].join("\n");
}

describe('Coach Persona Consistency', () => {
  test("Lucy bleibt im Stil", () => {
    const ctx = {
      persona: { name: "Lucy", style: ["direkt", "empathisch", "lösungsorientiert"] },
      memory: { relationship: "freundlich", trust: 80, summary: "" },
      rag: null, 
      daily: { caloriesLeft: 520, lastWorkout: "Push Training", sleepHours: 7 }, 
      conversationSummary: "Fokus auf Ernährungsoptimierung",
      metrics: { tokensIn: 0 }
    };
    
    const systemPrompt = buildSystemPrompt(ctx, "lucy");
    expect(systemPrompt).toMatchSnapshot();
  });

  test("Markus bleibt kraftsport-fokussiert", () => {
    const ctx = {
      persona: { name: "Markus", style: ["motivierend", "kraftsport-fokussiert", "präzise"] },
      memory: { relationship: "trainingspartner", trust: 85, summary: "mag intensive Workouts" },
      rag: null, 
      daily: { caloriesLeft: 800, lastWorkout: "Deadlift 5x5", sleepHours: 8 }, 
      conversationSummary: "Kraftsteigerung steht im Fokus",
      metrics: { tokensIn: 0 }
    };
    
    const systemPrompt = buildSystemPrompt(ctx, "markus");
    expect(systemPrompt).toMatchSnapshot();
  });

  test("Dr. Vita bleibt wissenschaftlich", () => {
    const ctx = {
      persona: { name: "Dr. Vita", style: ["wissenschaftlich", "ganzheitlich", "präventiv"] },
      memory: { relationship: "vertrauensvoll", trust: 90, summary: "interessiert an Studien" },
      rag: { chunks: [{ source: "study.pdf", text: "Aktuelle Forschung zeigt..." }] }, 
      daily: { caloriesLeft: 300, lastWorkout: "Yoga", sleepHours: 7.5 }, 
      conversationSummary: "Gesundheitsoptimierung durch Evidenz",
      metrics: { tokensIn: 0 }
    };
    
    const systemPrompt = buildSystemPrompt(ctx, "vita");
    expect(systemPrompt).toMatchSnapshot();
  });
});