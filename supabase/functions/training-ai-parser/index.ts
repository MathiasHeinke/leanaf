import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Types
interface SetEntry {
  reps: number;
  weight: number;
  rpe?: number;
  unit?: "kg" | "lb";
}

interface ParsedExercise {
  name: string;
  normalized_name: string;
  sets: SetEntry[];
  total_volume_kg: number;
  matched_exercise_id?: string;
  muscle_groups?: string[];
}

interface SessionMeta {
  split_type: string;
  total_volume_kg: number;
  total_sets: number;
  estimated_duration_minutes: number;
}

interface ParseResult {
  exercises: ParsedExercise[];
  session_meta: SessionMeta;
  warnings: string[];
}

// Exercise name normalization mapping
const EXERCISE_MAPPINGS: Record<string, string> = {
  'bank': 'Bankdrücken',
  'bankdrücken': 'Bankdrücken',
  'bench': 'Bankdrücken',
  'bench press': 'Bankdrücken',
  'rudern': 'Rudern',
  'ruder': 'Rudern',
  'row': 'Rudern',
  'seated row': 'Rudern',
  'kabelrudern': 'Kabelrudern',
  'latzug': 'Latzug',
  'lat pulldown': 'Latzug',
  'pulldown': 'Latzug',
  'latziehen': 'Latzug',
  'kniebeugen': 'Kniebeugen',
  'kniebeuge': 'Kniebeugen',
  'squats': 'Kniebeugen',
  'squat': 'Kniebeugen',
  'kreuzheben': 'Kreuzheben',
  'deadlift': 'Kreuzheben',
  'schulterdrücken': 'Schulterdrücken',
  'shoulder press': 'Schulterdrücken',
  'overhead press': 'Schulterdrücken',
  'ohp': 'Schulterdrücken',
  'seitheben': 'Seitheben',
  'lateral raise': 'Seitheben',
  'bizeps': 'Bizeps Curls',
  'bizeps curls': 'Bizeps Curls',
  'curls': 'Bizeps Curls',
  'trizeps': 'Trizeps',
  'triceps': 'Trizeps',
  'dips': 'Dips',
  'klimmzüge': 'Klimmzüge',
  'pull ups': 'Klimmzüge',
  'pullups': 'Klimmzüge',
  'chin ups': 'Klimmzüge',
  'beinpresse': 'Beinpresse',
  'leg press': 'Beinpresse',
  'beinbeuger': 'Beinbeuger',
  'leg curl': 'Beinbeuger',
  'beinstrecker': 'Beinstrecker',
  'leg extension': 'Beinstrecker',
};

// Muscle group inference
const MUSCLE_GROUP_MAP: Record<string, string[]> = {
  'bankdrücken': ['chest', 'triceps', 'front_delts'],
  'rudern': ['lats', 'mid_back', 'biceps', 'rear_delts'],
  'kabelrudern': ['lats', 'mid_back', 'biceps'],
  'latzug': ['lats', 'biceps', 'rear_delts'],
  'kniebeugen': ['quads', 'glutes', 'hamstrings', 'core'],
  'kreuzheben': ['hamstrings', 'glutes', 'lower_back', 'traps'],
  'schulterdrücken': ['front_delts', 'triceps', 'upper_chest'],
  'seitheben': ['side_delts'],
  'bizeps curls': ['biceps'],
  'trizeps': ['triceps'],
  'dips': ['triceps', 'chest', 'front_delts'],
  'klimmzüge': ['lats', 'biceps', 'rear_delts'],
  'beinpresse': ['quads', 'glutes'],
  'beinbeuger': ['hamstrings'],
  'beinstrecker': ['quads'],
};

const KG_PER_LB = 0.45359237;

function toKg(weight: number, unit?: string): number {
  if (!unit) return weight;
  return unit.toLowerCase().startsWith("l") ? +(weight * KG_PER_LB).toFixed(1) : weight;
}

function normalizeExerciseName(name: string): string {
  const lower = name.toLowerCase().trim();
  return EXERCISE_MAPPINGS[lower] || name.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

function inferMuscleGroups(normalizedName: string): string[] {
  const lower = normalizedName.toLowerCase();
  return MUSCLE_GROUP_MAP[lower] || ['other'];
}

function inferSplitType(exercises: ParsedExercise[]): string {
  const allMuscles = new Set<string>();
  exercises.forEach(ex => {
    (ex.muscle_groups || []).forEach(m => allMuscles.add(m));
  });
  
  const hasPush = allMuscles.has('chest') || allMuscles.has('triceps') || allMuscles.has('front_delts');
  const hasPull = allMuscles.has('lats') || allMuscles.has('biceps') || allMuscles.has('rear_delts');
  const hasLegs = allMuscles.has('quads') || allMuscles.has('hamstrings') || allMuscles.has('glutes');
  
  if (hasPush && !hasPull && !hasLegs) return 'push';
  if (hasPull && !hasPush && !hasLegs) return 'pull';
  if (hasLegs && !hasPush && !hasPull) return 'legs';
  if (hasPush && hasPull && !hasLegs) return 'upper';
  if (hasLegs && !hasPush && !hasPull) return 'lower';
  return 'full_body';
}

function parseTrainingText(rawText: string): ParseResult {
  const lines = rawText.split('\n').filter(l => l.trim());
  const exercises: ParsedExercise[] = [];
  const warnings: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // Skip comment/tip lines
    if (trimmedLine.startsWith('•') || trimmedLine.startsWith('Tipps') || 
        trimmedLine.startsWith('Format') || trimmedLine.startsWith('Beispiel')) {
      continue;
    }

    // Extract exercise name
    const nameMatch = trimmedLine.match(/^([a-zA-ZäöüÄÖÜßé\s-]+)/);
    if (!nameMatch) {
      warnings.push(`Zeile nicht erkannt: ${trimmedLine}`);
      continue;
    }
    
    const rawName = nameMatch[1].trim();
    if (!rawName || rawName.length < 2) continue;
    
    const normalizedName = normalizeExerciseName(rawName);
    const restOfLine = trimmedLine.slice(rawName.length).trim();
    
    if (!restOfLine) {
      warnings.push(`Keine Sets gefunden für: ${rawName}`);
      continue;
    }

    // Parse "4x10 80kg @7" pattern
    const setsPattern = /(\d+)\s*[x×\*]\s*(\d+)\s+(\d+(?:\.\d+)?)\s*(kg|kilogramm|kilo|lb|lbs)?(?:.*?\b(?:rpe|@)\s*([0-9]+(?:\.[0-9])?))?/i;
    const setsMatch = restOfLine.match(setsPattern);
    
    if (setsMatch) {
      const numSets = parseInt(setsMatch[1], 10);
      const reps = parseInt(setsMatch[2], 10);
      const weight = parseFloat(setsMatch[3]);
      const unit = setsMatch[4]?.toLowerCase().startsWith("l") ? "lb" : "kg";
      const rpe = setsMatch[5] !== undefined ? Number(setsMatch[5]) : undefined;
      
      const weightKg = unit === "lb" ? toKg(weight, "lb") : weight;
      
      const sets: SetEntry[] = [];
      for (let i = 0; i < numSets; i++) {
        sets.push({ reps, weight: weightKg, rpe, unit: "kg" });
      }
      
      const totalVolume = sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
      const muscleGroups = inferMuscleGroups(normalizedName);
      
      exercises.push({
        name: rawName,
        normalized_name: normalizedName,
        sets,
        total_volume_kg: totalVolume,
        muscle_groups: muscleGroups
      });
    } else {
      warnings.push(`Set-Format nicht erkannt für: ${rawName}`);
    }
  }

  if (exercises.length === 0) {
    warnings.push('Keine Übungen erkannt. Bitte Format prüfen: "Übung 4x10 80kg @7"');
  }

  const totalVolume = exercises.reduce((sum, ex) => sum + ex.total_volume_kg, 0);
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const splitType = inferSplitType(exercises);
  
  // Estimate duration: ~2 min per set (including rest)
  const estimatedDuration = Math.round(totalSets * 2);

  return {
    exercises,
    session_meta: {
      split_type: splitType,
      total_volume_kg: totalVolume,
      total_sets: totalSets,
      estimated_duration_minutes: estimatedDuration
    },
    warnings
  };
}

// AI Fallback: Use Gemini 3 Flash to parse complex/natural language input
async function parseWithGemini(rawText: string): Promise<ParseResult | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.warn('[TRAINING-AI-PARSER] No LOVABLE_API_KEY, skipping AI fallback');
    return null;
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `Du bist ein Fitness-Experte. Parse Trainings-Logs in strukturierte Daten.

Regeln:
- Erkenne Übungsnamen auch bei Tippfehlern ("goblet squad" → "Goblet Squat", "kurzanhtel" → "Kurzhantel")
- "3x 8x" oder "3x8" = 3 Sets à 8 Wiederholungen
- "je Seite" / "pro Seite" = unilateral (das angegebene Gewicht ist pro Arm/Bein)
- "KH" = Kurzhantel, "LH" = Langhantel
- Kein RPE angegeben → setze auf 7
- Gewichte immer in kg
- Wenn mehrere Übungen in einer Zeile ("Bizeps und Trizeps"), trenne sie`
          },
          { role: 'user', content: `Parse diesen Trainings-Log:\n\n${rawText}` }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'parse_training_log',
            description: 'Gibt geparste Übungen als strukturierte Daten zurück',
            parameters: {
              type: 'object',
              properties: {
                exercises: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Normalisierter Übungsname auf Deutsch' },
                      sets: { type: 'number', description: 'Anzahl Sets' },
                      reps: { type: 'number', description: 'Wiederholungen pro Set' },
                      weight_kg: { type: 'number', description: 'Gewicht in kg' },
                      rpe: { type: 'number', description: 'RPE 1-10, default 7' },
                      notes: { type: 'string', description: 'Zusätzliche Notizen' }
                    },
                    required: ['name', 'sets', 'reps', 'weight_kg']
                  }
                }
              },
              required: ['exercises']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'parse_training_log' } }
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('[TRAINING-AI-PARSER] Rate limited');
        return null;
      }
      if (response.status === 402) {
        console.warn('[TRAINING-AI-PARSER] Payment required');
        return null;
      }
      console.error('[TRAINING-AI-PARSER] AI gateway error:', response.status);
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.warn('[TRAINING-AI-PARSER] No tool call in Gemini response');
      return null;
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    
    if (!parsed.exercises || !Array.isArray(parsed.exercises) || parsed.exercises.length === 0) {
      console.warn('[TRAINING-AI-PARSER] No exercises in AI response');
      return null;
    }

    // Convert AI output to internal format
    const exercises: ParsedExercise[] = parsed.exercises.map((ex: any) => {
      const sets: SetEntry[] = [];
      for (let i = 0; i < (ex.sets || 3); i++) {
        sets.push({
          reps: ex.reps || 10,
          weight: ex.weight_kg || 0,
          rpe: ex.rpe || 7,
          unit: 'kg'
        });
      }
      
      const normalizedName = normalizeExerciseName(ex.name);
      const muscleGroups = inferMuscleGroups(normalizedName);
      const totalVolume = sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
      
      return {
        name: ex.name,
        normalized_name: normalizedName,
        sets,
        total_volume_kg: totalVolume,
        muscle_groups: muscleGroups
      };
    });

    const totalVolume = exercises.reduce((sum, ex) => sum + ex.total_volume_kg, 0);
    const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

    return {
      exercises,
      session_meta: {
        split_type: inferSplitType(exercises),
        total_volume_kg: totalVolume,
        total_sets: totalSets,
        estimated_duration_minutes: Math.round(totalSets * 2)
      },
      warnings: []
    };
  } catch (error) {
    console.error('[TRAINING-AI-PARSER] Gemini parsing error:', error);
    return null;
  }
}

async function findOrCreateExercise(
  supabase: ReturnType<typeof createClient>,
  name: string,
  normalizedName: string,
  muscleGroups: string[],
  userId: string
): Promise<string> {
  // 1. Exact match (case-insensitive)
  const { data: exact } = await supabase
    .from('exercises')
    .select('id')
    .ilike('name', normalizedName)
    .limit(1)
    .maybeSingle();
  
  if (exact?.id) return exact.id;
  
  // 2. Fuzzy match (first word)
  const firstWord = normalizedName.split(' ')[0];
  const { data: fuzzy } = await supabase
    .from('exercises')
    .select('id, name')
    .ilike('name', `%${firstWord}%`)
    .limit(1)
    .maybeSingle();
  
  if (fuzzy?.id) return fuzzy.id;
  
  // 3. Create new custom exercise
  const { data: newExercise, error } = await supabase
    .from('exercises')
    .insert({
      name: normalizedName,
      category: 'Custom',
      muscle_groups: muscleGroups,
      is_compound: muscleGroups.length > 2,
      created_by: userId,
      is_public: false
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('[TRAINING-AI-PARSER] Error creating exercise:', error);
    return crypto.randomUUID();
  }
  
  return newExercise?.id || crypto.randomUUID();
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

    const { raw_text, training_type = 'strength', persist = false, use_ai = false } = await req.json();

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!raw_text) {
      return new Response(
        JSON.stringify({ error: 'raw_text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[TRAINING-AI-PARSER] Processing for user: ${user.id}`);
    console.log(`[TRAINING-AI-PARSER] Raw text length: ${raw_text.length}, use_ai: ${use_ai}`);

    // Parse the training text with regex first
    let parseResult = parseTrainingText(raw_text);
    
    console.log(`[TRAINING-AI-PARSER] Regex parsed ${parseResult.exercises.length} exercises`);

    // AI Fallback: if use_ai is true OR no exercises were found, try Gemini
    if (use_ai || parseResult.exercises.length === 0) {
      console.log('[TRAINING-AI-PARSER] Trying AI fallback...');
      const aiResult = await parseWithGemini(raw_text);
      
      if (aiResult && aiResult.exercises.length > 0) {
        parseResult = aiResult;
        parseResult.warnings.push('Parsing via KI durchgeführt');
        console.log(`[TRAINING-AI-PARSER] AI parsed ${aiResult.exercises.length} exercises`);
      } else {
        console.log('[TRAINING-AI-PARSER] AI fallback returned no exercises');
      }
    }
    
    console.log(`[TRAINING-AI-PARSER] Final: ${parseResult.exercises.length} exercises`);
    console.log(`[TRAINING-AI-PARSER] Total volume: ${parseResult.session_meta.total_volume_kg}kg`);

    // If not persisting, just return the parse result
    if (!persist) {
      return new Response(
        JSON.stringify({
          success: true,
          ...parseResult
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DUAL WRITE: Persist to both Layer 2 and Layer 3
    const todayStr = new Date().toISOString().slice(0, 10);

    // STEP 1: training_sessions (Layer 2)
    const { data: trainingSession, error: tsError } = await supabase
      .from('training_sessions')
      .insert({
        user_id: user.id,
        session_date: todayStr,
        training_type: training_type === 'strength' ? 'rpt' : training_type,
        split_type: parseResult.session_meta.split_type,
        total_duration_minutes: parseResult.session_meta.estimated_duration_minutes,
        total_volume_kg: parseResult.session_meta.total_volume_kg,
        session_data: {
          raw_text,
          parsed_exercises: parseResult.exercises,
          source: 'layer2_notes'
        }
      })
      .select('id')
      .single();

    if (tsError) {
      console.error('[TRAINING-AI-PARSER] Error inserting training_session:', tsError);
      return new Response(
        JSON.stringify({ error: 'Failed to save training session', details: tsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[TRAINING-AI-PARSER] Created training_session: ${trainingSession.id}`);

    // STEP 2: exercise_sessions (Layer 3 Container)
    const sessionName = `Training ${new Date().toLocaleDateString('de-DE')}`;
    const { data: exerciseSession, error: esError } = await supabase
      .from('exercise_sessions')
      .insert({
        user_id: user.id,
        date: todayStr,
        session_name: sessionName,
        workout_type: 'strength',
        metadata: { 
          source: 'layer2_notes', 
          training_session_id: trainingSession.id 
        }
      })
      .select('id')
      .single();

    if (esError) {
      console.error('[TRAINING-AI-PARSER] Error inserting exercise_session:', esError);
      // Continue anyway - Layer 2 was saved
    }

    // STEP 3: exercise_sets (Layer 3 Sets)
    if (exerciseSession) {
      console.log(`[TRAINING-AI-PARSER] Created exercise_session: ${exerciseSession.id}`);
      
      for (const exercise of parseResult.exercises) {
        // Find or create the exercise in the catalog
        const exerciseId = await findOrCreateExercise(
          supabase,
          exercise.name,
          exercise.normalized_name,
          exercise.muscle_groups || [],
          user.id
        );
        
        // Store the matched ID
        exercise.matched_exercise_id = exerciseId;

        // Insert all sets for this exercise
        for (let i = 0; i < exercise.sets.length; i++) {
          const set = exercise.sets[i];
          const { error: setError } = await supabase
            .from('exercise_sets')
            .insert({
              session_id: exerciseSession.id,
              user_id: user.id,
              exercise_id: exerciseId,
              set_number: i + 1,
              weight_kg: set.weight,
              reps: set.reps,
              rpe: set.rpe || 7,
              date: todayStr,
              origin: 'layer2_notes'
            });

          if (setError) {
            console.error(`[TRAINING-AI-PARSER] Error inserting set ${i + 1}:`, setError);
          }
        }
      }
      
      console.log(`[TRAINING-AI-PARSER] Inserted ${parseResult.session_meta.total_sets} sets`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        training_session_id: trainingSession.id,
        exercise_session_id: exerciseSession?.id || null,
        ...parseResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TRAINING-AI-PARSER] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Training parsing failed',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
