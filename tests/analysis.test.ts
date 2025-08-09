
import { describe, it, expect } from "vitest";
import { buildSummaryMarkdown, calcVolume, ExerciseEntry } from "../src/tools/analysis";

describe("analysis", () => {
  const exs: ExerciseEntry[] = [
    { name: "Bankdrücken (liegend)", muscles: ["chest", "triceps"], sets: [{ reps: 10, weight: 60, rpe: 7 }] },
    { name: "Rudern Kabel (eng, sitzend)", muscles: ["lats", "biceps"], sets: [{ reps: 10, weight: 70, rpe: 8 }] }
  ];

  it("calculates totals and balance", () => {
    const a = calcVolume(exs);
    expect(a.total).toBe(60 * 10 + 70 * 10);
    expect(a.pushPull.pull).toBe(700);
    expect(a.pushPull.push).toBe(600);
  });

  it("builds markdown summary", () => {
    const md = buildSummaryMarkdown(exs);
    expect(md).toContain("Training – Zusammenfassung");
    expect(md).toContain("Volumen gesamt");
  });
});
