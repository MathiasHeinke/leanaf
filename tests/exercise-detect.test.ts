
import { describe, it, expect } from "vitest";
import { detectExerciseFromText, listExerciseCatalog } from "../src/tools/exercise-detect";

describe("exercise-detect", () => {
  it("detects bench press variants", () => {
    const r = detectExerciseFromText("Heute Bankdrücken gemacht");
    expect(r?.name).toContain("Bankdrücken");
    expect((r?.confidence ?? 0)).toBeGreaterThan(0.55);
  });

  it("detects ohp", () => {
    const r = detectExerciseFromText("OHP 5x5");
    expect((r?.name ?? "").toLowerCase()).toContain("überkopf");
  });

  it("catalog lists canonical names", () => {
    expect(listExerciseCatalog().length).toBeGreaterThan(3);
  });
});
