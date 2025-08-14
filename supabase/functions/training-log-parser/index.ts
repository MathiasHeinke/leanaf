import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Enhanced set parser types
export type SetEntry = { 
  weight: number; 
  reps: number; 
  rpe?: number; 
  unit?: "kg" | "lb";
  notes?: string;
};

export interface Exercise {
  name: string;
  sets: SetEntry[];
  notes?: string;
  superset_with?: string;
}

export interface TrainingSession {
  session_date: string;
  split_type?: string;
  exercises: Exercise[];
  notes?: string;
}

// Exercise name mapping for German/English synonyms
const EXERCISE_MAPPINGS: Record<string, string> = {
  'latziehen': 'Pulldown',
  'latzug': 'Pulldown', 
  'lat pulldown': 'Pulldown',
  'pulldown': 'Pulldown',
  'rudern': 'Seated Row',
  'seated row': 'Seated Row',
  'kabelrudern': 'Seated Row',
  'bankdrücken': 'Bankdrücken',
  'bench press': 'Bankdrücken',
  'kniebeugen': 'Kniebeugen',
  'squats': 'Kniebeugen',
  'kreuzheben': 'Kreuzheben',
  'deadlift': 'Kreuzheben',
  'schulterdrücken': 'Schulterdrücken',
  'shoulder press': 'Schulterdrücken',
  'overhead press': 'Schulterdrücken',
};

const KG_PER_LB = 0.45359237;

function toKg(weight: number, unit?: string) {
  if (!unit) return weight;
  return unit.toLowerCase().startsWith("l") ? +(weight * KG_PER_LB).toFixed(1) : weight;
}

function normalizeExerciseName(name: string): string {
  const lower = name.toLowerCase().trim();
  return EXERCISE_MAPPINGS[lower] || name.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

function parseSetLine(input: string): SetEntry | null {
  const s = input.trim().toLowerCase().replace(",", ".").replace(/\s+/g, " ");

  // Enhanced regex patterns for sets
  const patterns = [
    // "10x 68kg rpe 7" or "8 x 100 kg @8"
    /(?:(\d+)\s*(?:x|×|\*)\s*)?(\d+(?:\.\d+)?)\s*(kg|kilogramm|kilo|lb|lbs|pound|pounds)?(?:.*?\b(?:rpe|@)\s*([0-9]+(?:\.[0-9])?))?/i,
    // "10 wiederholungen 68kg rpe 7"
    /(\d+)\s*(?:wdh|wiederholungen?)?.*?(\d+(?:\.\d+)?)\s*(kg|kilogramm|kilo|lb|lbs|pound|pounds)?(?:.*?\b(?:rpe|@)\s*([0-9]+(?:\.[0-9])?))?/i,
    // Weight first: "68kg 10x rpe7"
    /(\d+(?:\.\d+)?)\s*(kg|kilogramm|kilo|lb|lbs|pound|pounds)?\s*(\d+)\s*(?:x|×|\*|wdh|wiederholungen?).*?(?:rpe|@)\s*([0-9]+(?:\.[0-9])?)/i
  ];

  let match = null;
  let patternIndex = -1;
  
  for (let i = 0; i < patterns.length; i++) {
    match = s.match(patterns[i]);
    if (match) {
      patternIndex = i;
      break;
    }
  }

  if (!match) return null;

  let reps: number, weight: number, unit: string | undefined, rpe: number | undefined;

  if (patternIndex === 2) {
    // Weight first pattern
    weight = parseFloat(match[1]);
    unit = match[2]?.startsWith("k") ? "kg" : match[2]?.startsWith("l") ? "lb" : undefined;
    reps = parseInt(match[3], 10);
    rpe = match[4] !== undefined ? Number(match[4]) : undefined;
  } else {
    // Standard patterns
    reps = match[1] ? parseInt(match[1], 10) : undefined;
    weight = parseFloat(match[2]);
    unit = match[3]?.startsWith("k") ? "kg" : match[3]?.startsWith("l") ? "lb" : undefined;
    rpe = match[4] !== undefined ? Number(match[4]) : undefined;

    // Fallback for missing reps
    if (!reps) {
      const repsMatch = s.match(/(^|\s)(\d+)\s*(?:x|×|\bwdh\b|\bwiederholungen?\b)/i);
      if (repsMatch) reps = parseInt(repsMatch[2], 10);
    }
  }

  if (!reps) return null;

  return { 
    reps, 
    weight: toKg(weight, unit), 
    rpe, 
    unit: "kg" as const
  };
}

function detectSupersets(text: string): Map<string, string[]> {
  const supersetMap = new Map<string, string[]>();
  const lines = text.split(/\n|;/);
  
  let currentSuperset: string[] = [];
  let lastExercise = '';
  
  for (const line of lines) {
    const exerciseMatch = line.match(/\b(pulldown|latziehen|seated row|rudern|bankdrücken|bench|kniebeugen|squats|kreuzheben|deadlift)/i);
    
    if (exerciseMatch) {
      const exercise = normalizeExerciseName(exerciseMatch[1]);
      
      // Check if this line contains set info for current exercise
      const hasSetInfo = /\d+\s*(?:x|×|\*|wdh)\s*\d+/.test(line);
      
      if (hasSetInfo && lastExercise && exercise !== lastExercise) {
        // Different exercise with set info - potential superset
        if (currentSuperset.length === 0) {
          currentSuperset = [lastExercise];
        }
        currentSuperset.push(exercise);
      } else if (currentSuperset.length > 0 && exercise !== lastExercise) {
        // End of superset
        if (currentSuperset.length > 1) {
          currentSuperset.forEach(ex => {
            supersetMap.set(ex, currentSuperset.filter(e => e !== ex));
          });
        }
        currentSuperset = [];
      }
      
      lastExercise = exercise;
    }
  }
  
  // Handle final superset
  if (currentSuperset.length > 1) {
    currentSuperset.forEach(ex => {
      supersetMap.set(ex, currentSuperset.filter(e => e !== ex));
    });
  }
  
  return supersetMap;
}

function parseTrainingLog(rawText: string, locale: string = 'de-DE'): {
  formatted_markdown: string;
  normalized_json: TrainingSession;
  meta: {
    detected_supersets: boolean;
    inferred_defaults: any;
    warnings: string[];
  };
} {
  const lines = rawText.split(/\n|;|·|\|/);
  const exercises: Exercise[] = [];
  const warnings: string[] = [];
  const supersetMap = detectSupersets(rawText);
  
  let currentExercise: Exercise | null = null;
  let sessionDate = new Date().toISOString().split('T')[0];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check for exercise name
    const exerciseMatch = trimmed.match(/\b(pulldown|latziehen|seated row|rudern|bankdrücken|bench|kniebeugen|squats|kreuzheben|deadlift|schulterdrücken|shoulder press)/i);
    
    if (exerciseMatch) {
      // Save previous exercise
      if (currentExercise && currentExercise.sets.length > 0) {
        exercises.push(currentExercise);
      }
      
      const exerciseName = normalizeExerciseName(exerciseMatch[1]);
      currentExercise = {
        name: exerciseName,
        sets: [],
        notes: supersetMap.has(exerciseName) ? `Supersatz mit ${supersetMap.get(exerciseName)?.join(', ')}` : undefined
      };
    }
    
    // Parse set information
    const setEntry = parseSetLine(trimmed);
    if (setEntry && currentExercise) {
      currentExercise.sets.push(setEntry);
    } else if (setEntry && !currentExercise) {
      // Set without exercise - create generic exercise
      currentExercise = {
        name: 'Unbekannte Übung',
        sets: [setEntry]
      };
      warnings.push('Satz ohne Übungsname gefunden');
    }
  }
  
  // Add final exercise
  if (currentExercise && currentExercise.sets.length > 0) {
    exercises.push(currentExercise);
  }
  
  if (exercises.length === 0) {
    warnings.push('Keine Übungen erkannt');
  }
  
  // Generate formatted markdown
  const markdown = generateFormattedMarkdown(exercises, sessionDate);
  
  // Build normalized JSON
  const normalizedJson: TrainingSession = {
    session_date: sessionDate,
    split_type: exercises.length <= 3 ? 'upper_lower' : 'full_body',
    exercises,
    notes: warnings.length > 0 ? `Warnungen: ${warnings.join(', ')}` : undefined
  };
  
  return {
    formatted_markdown: markdown,
    normalized_json: normalizedJson,
    meta: {
      detected_supersets: supersetMap.size > 0,
      inferred_defaults: { units: 'kg' },
      warnings
    }
  };
}

function generateFormattedMarkdown(exercises: Exercise[], sessionDate: string): string {
  let markdown = `# Trainingstag – ${sessionDate}\n\n`;
  
  exercises.forEach(exercise => {
    markdown += `## ${exercise.name}\n`;
    markdown += `| Satz | Gewicht | Wdh. | RPE | Notizen |\n`;
    markdown += `|------|---------|------|-----|----------|\n`;
    
    exercise.sets.forEach((set, index) => {
      const notes = set.notes || (exercise.notes && index === 0 ? exercise.notes : '');
      markdown += `| ${index + 1} | ${set.weight} kg | ${set.reps} | ${set.rpe || '-'} | ${notes} |\n`;
    });
    
    // Add technique hints
    markdown += `\n**Ausführungshinweise**\n`;
    markdown += getExerciseHints(exercise.name);
    
    // Add progression recommendations
    markdown += `\n**Progression**\n`;
    markdown += getProgressionAdvice(exercise.sets);
    markdown += `\n---\n\n`;
  });
  
  return markdown;
}

function getExerciseHints(exerciseName: string): string {
  const hints: Record<string, string> = {
    'Pulldown': '- Schulterblätter nach unten/hinten ziehen, kein Schwung.\n- Explosiver Zug, langsames Absenken (2–3 Sek.).\n',
    'Seated Row': '- Core stabil halten, Brust nach vorn.\n- Kein Rückschwung, volle Dehnung in der negativen Phase.\n',
    'Bankdrücken': '- Schulterblätter zusammenziehen, stabiler Stand.\n- Kontrollierte Absenkung zur Brust, explosives Drücken.\n',
    'Kniebeugen': '- Knie tracking über Zehenspitzen.\n- Hüfte nach hinten, Brust aufrecht.\n',
    'Kreuzheben': '- Neutraler Rücken, Blick nach vorn.\n- Gewicht nah am Körper, explosive Hüftstreckung.\n'
  };
  
  return hints[exerciseName] || '- Saubere Technik vor Gewicht.\n- Kontrollierte Bewegung, volle Range of Motion.\n';
}

function getProgressionAdvice(sets: SetEntry[]): string {
  if (sets.length === 0) return '- Keine Sätze vorhanden.\n';
  
  const avgRpe = sets.reduce((sum, set) => sum + (set.rpe || 7), 0) / sets.length;
  
  if (avgRpe <= 7) {
    return '- Gewicht um +2,5-5% erhöhen, wenn RPE ≤ 7 bleibt.\n';
  } else if (avgRpe <= 8.5) {
    return '- Gewicht halten, Technik perfektionieren.\n';
  } else {
    return '- Gewicht reduzieren oder mehr Regeneration einplanen.\n';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { raw_text, locale = 'de-DE', defaults = {}, request_id } = await req.json();

    if (!raw_text) {
      return new Response(
        JSON.stringify({ error: 'raw_text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[TRAINING-PARSER] Processing request_id: ${request_id}`);
    console.log(`[TRAINING-PARSER] Raw text length: ${raw_text.length}`);

    // Parse the training log
    const result = parseTrainingLog(raw_text, locale);

    console.log(`[TRAINING-PARSER] Parsed ${result.normalized_json.exercises.length} exercises`);
    console.log(`[TRAINING-PARSER] Detected supersets: ${result.meta.detected_supersets}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TRAINING-PARSER] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Training log parsing failed',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});