export type SetEntry = { weight: number; reps: number; rpe?: number; unit?: "kg" | "lb" };

export interface ParsedExercise {
  name: string;
  sets: SetEntry[];
  totalVolume: number;
}

const KG_PER_LB = 0.45359237;

function toKg(weight: number, unit?: string) {
  if (!unit) return weight;
  return unit.toLowerCase().startsWith("l") ? +(weight * KG_PER_LB).toFixed(1) : weight;
}

/**
 * Parsen eines einzelnen Satzes.
 * Akzeptiert u.a.:
 * - "10x 68kg rpe 7"
 * - "12 x 100 kg @8"
 * - "8 Wiederholungen mit 40kg, RPE9"
 * - "6x135lb RPE 8.5"
 * - "4x10 80kg" (sets x reps weight)
 */
export function parseSetLine(input: string): SetEntry | null {
  const s = input.trim().toLowerCase().replace(",", ".").replace(/\s+/g, " ");

  // Pattern for "4x10 80kg @7" (sets x reps weight rpe) - requires weight after reps
  // This pattern REQUIRES a third number (weight) to avoid matching "12 x 100 kg" as sets x reps
  const setsRepsWeightPattern = /^(\d+)\s*[x×\*]\s*(\d+)\s+(\d+(?:\.\d+)?)\s*(kg|kilogramm|kilo|lb|lbs|pound|pounds)?(?:.*?\b(?:rpe|@)\s*([0-9]+(?:\.[0-9])?))?$/i;
  const setsMatch = s.match(setsRepsWeightPattern);
  
  if (setsMatch) {
    const numSets = parseInt(setsMatch[1], 10);
    const reps = parseInt(setsMatch[2], 10);
    const weight = parseFloat(setsMatch[3]);
    const unit = setsMatch[4]?.startsWith("k") ? "kg" : setsMatch[4]?.startsWith("l") ? "lb" : undefined;
    const rpe = setsMatch[5] !== undefined ? Number(setsMatch[5]) : undefined;
    
    // Return single set entry (caller will handle multiple sets)
    return { reps, weight: toKg(weight, unit), rpe, unit: "kg" };
  }

  // Pattern for "12 x 100 kg @8" (reps x weight) - standard format
  // Fixed: removed \b before @ since @ doesn't create word boundary
  const repsWeightPattern = /(\d+)\s*[x×\*]\s*(\d+(?:\.\d+)?)\s*(kg|kilogramm|kilo|lb|lbs|pound|pounds)(?:.*?(?:rpe\s*|@)\s*([0-9]+(?:\.[0-9])?))?/i;
  const repsMatch = s.match(repsWeightPattern);
  
  if (repsMatch) {
    const reps = parseInt(repsMatch[1], 10);
    const weight = parseFloat(repsMatch[2]);
    const unit = repsMatch[3]?.startsWith("k") ? "kg" : repsMatch[3]?.startsWith("l") ? "lb" : undefined;
    const rpe = repsMatch[4] !== undefined ? Number(repsMatch[4]) : undefined;
    return { reps, weight: toKg(weight, unit), rpe, unit: "kg" };
  }

  // reps (x|×) weight unit (optional) rpe/@
  const re =
    /(?:(\d+)\s*(?:x|×|\*)\s*)?(\d+(?:\.\d+)?)\s*(kg|kilogramm|kilo|lb|lbs|pound|pounds)?(?:.*?(?:rpe\s*|@)\s*([0-9]+(?:\.[0-9])?))?/i;

  // Alternative: "10 wiederholungen 68kg rpe 7"
  const reAlt =
    /(\d+)\s*(?:wdh|wiederholungen?)?.*?(\d+(?:\.\d+)?)\s*(kg|kilogramm|kilo|lb|lbs|pound|pounds)?(?:.*?(?:rpe\s*|@)\s*([0-9]+(?:\.[0-9])?))?/i;

  const m = s.match(re) || s.match(reAlt);
  if (!m) return null;

  // Fallback: wenn reps fehlt (zuerst Gewicht genannt), versuche zweites Pattern "reps x weight"
  let reps = m[1] ? parseInt(m[1], 10) : undefined;
  const weight = parseFloat(m[2]);
  const unit = m[3]?.startsWith("k") ? "kg" : m[3]?.startsWith("l") ? "lb" : undefined;
  const rpe = m[4] !== undefined ? Number(m[4]) : undefined;

  // Noch ein Pattern "reps zuerst, dann Gewicht" wurde ggf. nicht gefunden
  if (!reps) {
    const fallbackRepsMatch = s.match(/(^|\s)(\d+)\s*(?:x|×|\bwdh\b|\bwiederholungen?\b)/i);
    if (fallbackRepsMatch) reps = parseInt(fallbackRepsMatch[2], 10);
  }

  if (!reps) return null;

  return { reps, weight: toKg(weight, unit), rpe, unit: "kg" };
}

/**
 * Parsen mehrerer Sätze aus freiem Text.
 * Trennt per Zeilenumbruch oder Semikolon und sammelt valide Sätze.
 */
export function parseSetsMulti(input: string): SetEntry[] {
  return input
    .split(/\n|;|·|\||,/g)
    .map((p) => parseSetLine(p))
    .filter((x): x is SetEntry => !!x);
}

/**
 * Parse exercises from multi-line text input.
 * Each line should contain: ExerciseName SetsxReps Weight @RPE
 * Example: "Bankdrücken 4x10 80kg @7"
 */
export function parseExercisesFromText(input: string): ParsedExercise[] {
  const lines = input.split('\n').filter(l => l.trim());
  const exercises: ParsedExercise[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // Skip lines that look like comments or tips
    if (trimmedLine.startsWith('•') || trimmedLine.startsWith('Tipps') || trimmedLine.startsWith('Format') || trimmedLine.startsWith('Beispiel')) {
      continue;
    }

    // Extract exercise name (everything before the first number)
    const nameMatch = trimmedLine.match(/^([a-zA-ZäöüÄÖÜßé\s-]+)/);
    if (!nameMatch) continue;
    
    const name = nameMatch[1].trim();
    if (!name || name.length < 2) continue;
    
    // Get the rest of the line for parsing sets
    const restOfLine = trimmedLine.slice(name.length).trim();
    if (!restOfLine) continue;

    // Try to parse "4x10 80kg @7" pattern first
    const setsPattern = /(\d+)\s*[x×\*]\s*(\d+)\s+(\d+(?:\.\d+)?)\s*(kg|kilogramm|kilo|lb|lbs)?(?:.*?\b(?:rpe|@)\s*([0-9]+(?:\.[0-9])?))?/i;
    const setsMatch = restOfLine.match(setsPattern);
    
    if (setsMatch) {
      const numSets = parseInt(setsMatch[1], 10);
      const reps = parseInt(setsMatch[2], 10);
      const weight = parseFloat(setsMatch[3]);
      const unit = setsMatch[4]?.startsWith("l") ? "lb" : "kg";
      const rpe = setsMatch[5] !== undefined ? Number(setsMatch[5]) : undefined;
      
      const weightKg = unit === "lb" ? toKg(weight, "lb") : weight;
      
      // Create array of sets
      const sets: SetEntry[] = [];
      for (let i = 0; i < numSets; i++) {
        sets.push({ reps, weight: weightKg, rpe, unit: "kg" });
      }
      
      const totalVolume = sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
      exercises.push({ name, sets, totalVolume });
    } else {
      // Fallback: try to parse individual sets
      const sets = parseSetsMulti(restOfLine);
      if (sets.length > 0) {
        const totalVolume = sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
        exercises.push({ name, sets, totalVolume });
      }
    }
  }

  return exercises;
}
