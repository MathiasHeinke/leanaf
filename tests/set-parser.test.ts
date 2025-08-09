
import { describe, it, expect } from "vitest";
import { parseSetLine, parseSetsMulti } from "../src/tools/set-parser";

describe("set-parser", () => {
  it("parses strict pattern", () => {
    expect(parseSetLine("10x 68kg rpe 7")).toEqual({ reps: 10, weight: 68, rpe: 7, unit: "kg" });
  });

  it("parses with @RPE", () => {
    expect(parseSetLine("12 x 100 kg @8")).toEqual({ reps: 12, weight: 100, rpe: 8, unit: "kg" });
  });

  it("parses lb and converts", () => {
    const s = parseSetLine("6x135lb RPE 8.5")!;
    expect(s.reps).toBe(6);
    expect(s.weight).toBeCloseTo(61.2, 1);
    expect(s.rpe).toBe(8.5);
  });

  it("parses multiple sets", () => {
    const out = parseSetsMulti("10x50kg rpe6; 8x70kg rpe8");
    expect(out.length).toBe(2);
    expect(out[1].weight).toBe(70);
  });
});
