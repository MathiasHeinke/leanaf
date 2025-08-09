
export type SetEntry = { weight: number; reps: number; rpe?: number; unit?: "kg" | "lb" };

const KG_PER_LB = 0.45359237;

function toKg(weight: number, unit?: string) {
  if (!unit) return weight;
  return unit.toLowerCase().startsWith("l") ? +(weight * KG_PER_LB).toFixed(1) : weight;
}

export function parseSetLine(input: string): SetEntry | null {
  const s = input.trim().toLowerCase().replace(",", ".").replace(/\s+/g, " ");

  const re =
    /(?:(\d+)\s*(?:x|×|\*)\s*)?(\d+(?:\.\d+)?)\s*(kg|kilogramm|kilo|lb|lbs|pound|pounds)?(?:.*?\b(?:rpe|@)\s*([0-9]+(?:\.[0-9])?))?/i;

  const reAlt =
    /(\d+)\s*(?:wdh|wiederholungen?)?.*?(\d+(?:\.\d+)?)\s*(kg|kilogramm|kilo|lb|lbs|pound|pounds)?(?:.*?\b(?:rpe|@)\s*([0-9]+(?:\.[0-9])?))?/i;

  const m = s.match(re) || s.match(reAlt);
  if (!m) return null;

  let reps = m[1] ? parseInt(m[1], 10) : undefined;
  const weight = parseFloat(m[2]);
  const unit = m[3]?.startsWith("k") ? "kg" : m[3]?.startsWith("l") ? "lb" : undefined;
  const rpe = m[4] !== undefined ? Number(m[4]) : undefined;

  if (!reps) {
    const repsMatch = s.match(/(^|\s)(\d+)\s*(?:x|×|\bwdh\b|\bwiederholungen?\b)/i);
    if (repsMatch) reps = parseInt(repsMatch[2], 10);
  }

  if (!reps) return null;

  return { reps, weight: toKg(weight, unit), rpe, unit: "kg" };
}
