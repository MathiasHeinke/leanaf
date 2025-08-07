import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@latest';

// ============================================
// Enhanced Training Plan Generator v1
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced Training Plan Schemas (embedded for edge function)
const SetPlanSchema = z.object({
  setNumber: z.number().min(1),
  targetReps: z.number().optional(),
  targetRepsRange: z.string().optional(),
  targetLoadKg: z.number().optional(),
  targetPct1RM: z.number().min(0).max(100).optional(),
  targetRPE: z.number().min(1).max(10).optional(),
  targetRIR: z.number().min(0).max(5).optional(),
  restSeconds: z.number().default(120),
  isWarmup: z.boolean().default(false)
});

const TrainingExerciseSchema = z.object({
  exerciseName: z.string().min(1),
  exerciseType: z.enum(['strength', 'cardio', 'mobility']).default('strength'),
  muscleGroups: z.array(z.string()).default([]),
  equipment: z.array(z.string()).default([]),
  position: z.number().default(1),
  isSuperset: z.boolean().default(false),
  supersetGroup: z.string().optional(),
  progressionType: z.enum(['linear', 'wave', 'autoregulation']).default('linear'),
  sets: z.array(SetPlanSchema).min(1),
  notes: z.string().optional()
});

const TrainingDaySchema = z.object({
  dayId: z.string(),
  dayName: z.string(),
  focus: z.string().optional(),
  position: z.number().default(1),
  isRestDay: z.boolean().default(false),
  exercises: z.array(TrainingExerciseSchema).default([])
});

const EnhancedTrainingPlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  planType: z.enum(['strength', 'hypertrophy', 'endurance', 'powerlifting', 'bodybuilding', 'custom']).default('custom'),
  durationWeeks: z.number().min(1).max(52).default(4),
  targetFrequency: z.number().min(1).max(7).default(3),
  goals: z.array(z.string()).min(1),
  days: z.array(TrainingDaySchema),
  scientificBasis: z.object({
    methodology: z.string().optional(),
    researchCitations: z.array(z.string()).default([]),
    appliedPrinciples: z.array(z.string()).default([])
  }).default({}),
  progressionScheme: z.object({
    type: z.enum(['linear', 'block', 'undulating', 'autoregulation']).default('linear'),
    volumeProgression: z.boolean().default(true),
    intensityProgression: z.boolean().default(true)
  }).default({})
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userProfile, goals = ['Hypertrophy'], planName, coachId, useAI = false, mode = 'next_day', lookbackDays = 28 } = await req.json();
    
    console.log('Generating training plan:', { userProfile, goals, planName, coachId, useAI, mode, lookbackDays });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Authorization header for user context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // 1. Fetch user strength profile
    const { data: strengthProfile } = await supabase
      .from('v_user_strength_profile')
      .select('*')
      .eq('user_id', user.id);

    console.log('User strength profile:', strengthProfile);

    // 2. Fetch exercise templates
    const { data: exerciseTemplates } = await supabase
      .from('training_exercise_templates')
      .select('*');

    console.log('Available exercise templates:', exerciseTemplates?.length);

    // 3. Generate plan based on approach
    let generatedPlan;
    
    if (useAI) {
      // AI-based generation (placeholder for future LLM integration)
      generatedPlan = await generatePlanWithAI(userProfile, goals, strengthProfile, exerciseTemplates);
    } else if (mode === 'next_day') {
      // History-based next-day generation (uses last training data)
      generatedPlan = await generatePlanFromHistory(supabase, user.id, userProfile, goals, lookbackDays, planName);
    } else {
      // Template-based generation
      generatedPlan = generatePlanFromTemplate(userProfile, goals, strengthProfile, exerciseTemplates);
    }

    // 4. Validate generated plan
    const validatedPlan = EnhancedTrainingPlanSchema.parse(generatedPlan);

    // 5. Create plan in database
    const { data: workoutPlan, error: planError } = await supabase
      .from('workout_plans')
      .insert({
        name: validatedPlan.name,
        description: validatedPlan.description,
        category: validatedPlan.planType,
        plan_type: validatedPlan.planType,
        duration_weeks: validatedPlan.durationWeeks,
        target_frequency: validatedPlan.targetFrequency,
        scientific_basis: validatedPlan.scientificBasis,
        progression_scheme: validatedPlan.progressionScheme,
        created_by: user.id,
        status: 'draft',
        estimated_duration_minutes: estimateWorkoutDuration(validatedPlan.days),
        is_public: false
      })
      .select()
      .single();

    if (planError) throw planError;

    // 6. Create training days and exercises
    for (const day of validatedPlan.days) {
      const { data: trainingDay, error: dayError } = await supabase
        .from('training_plan_days')
        .insert({
          plan_id: workoutPlan.id,
          day_id: day.dayId,
          day_name: day.dayName,
          focus: day.focus,
          position: day.position,
          is_rest_day: day.isRestDay
        })
        .select()
        .single();

      if (dayError) throw dayError;

      // Create exercises for this day
      for (const exercise of day.exercises) {
        const { data: trainingExercise, error: exerciseError } = await supabase
          .from('training_exercises')
          .insert({
            plan_day_id: trainingDay.id,
            exercise_name: exercise.exerciseName,
            exercise_type: exercise.exerciseType,
            muscle_groups: exercise.muscleGroups,
            equipment: exercise.equipment,
            position: exercise.position,
            is_superset: exercise.isSuperset,
            superset_group: exercise.supersetGroup,
            progression_type: exercise.progressionType,
            notes: exercise.notes
          })
          .select()
          .single();

        if (exerciseError) throw exerciseError;

        // Create sets for this exercise
        for (const set of exercise.sets) {
          const { error: setError } = await supabase
            .from('training_sets')
            .insert({
              exercise_id: trainingExercise.id,
              set_number: set.setNumber,
              target_reps: set.targetReps,
              target_reps_range: set.targetRepsRange,
              target_load_kg: set.targetLoadKg,
              target_pct_1rm: set.targetPct1RM,
              target_rpe: set.targetRPE,
              target_rir: set.targetRIR,
              rest_seconds: set.restSeconds,
              is_warmup: set.isWarmup,
              progression_rule: {
                type: 'linear',
                increment: 2.5
              }
            });

          if (setError) throw setError;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        plan: {
          ...validatedPlan,
          id: workoutPlan.id,
          ts: Date.now(),
          html: generatePlanHTML(validatedPlan),
          actions: [
            { label: '✅ Plan aktivieren', variant: 'confirm', action: 'accept' },
            { label: '🛠️ Anpassen', variant: 'edit', action: 'customize' },
            { label: '🗑️ Ablehnen', variant: 'reject', action: 'decline' }
          ]
        },
        metadata: {
          generationMethod: useAI ? 'ai' : (mode === 'next_day' ? 'history' : 'template'),
          coachId,
          strengthProfile: strengthProfile?.length || 0,
          templatesUsed: exerciseTemplates?.length || 0
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating training plan:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        plan: null
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Template-based plan generation
function generatePlanFromTemplate(userProfile: any, goals: string[], strengthProfile: any[], exerciseTemplates: any[]) {
  console.log('Generating plan from template for goals:', goals);

  const planType = determineTrainingType(goals);
  const methodology = getMethodologyForGoals(goals, userProfile);
  
  // Generate 4-day training split
  const days = [
    {
      dayId: 'mon',
      dayName: 'Montag',
      focus: 'Push (Brust, Schultern, Trizeps)',
      position: 1,
      isRestDay: false,
      exercises: generatePushExercises(exerciseTemplates, strengthProfile)
    },
    {
      dayId: 'tue',
      dayName: 'Dienstag',
      focus: 'Pull (Rücken, Bizeps)',
      position: 2,
      isRestDay: false,
      exercises: generatePullExercises(exerciseTemplates, strengthProfile)
    },
    {
      dayId: 'wed',
      dayName: 'Mittwoch',
      focus: 'Ruhetag',
      position: 3,
      isRestDay: true,
      exercises: []
    },
    {
      dayId: 'thu',
      dayName: 'Donnerstag',
      focus: 'Legs (Beine, Gesäß)',
      position: 4,
      isRestDay: false,
      exercises: generateLegExercises(exerciseTemplates, strengthProfile)
    },
    {
      dayId: 'fri',
      dayName: 'Freitag',
      focus: 'Upper Body (Ganzkörper Oberkörper)',
      position: 5,
      isRestDay: false,
      exercises: generateUpperBodyExercises(exerciseTemplates, strengthProfile)
    }
  ];

  return {
    name: `Evidenzbasierter ${planType} Plan`,
    description: `4-Tage Split basierend auf ${methodology.coach} Methodik für ${goals.join(', ')}`,
    planType: planType.toLowerCase(),
    durationWeeks: 4,
    targetFrequency: 4,
    goals,
    days,
    scientificBasis: {
      methodology: methodology.alias,
      researchCitations: methodology.citations,
      appliedPrinciples: ['Progressive Overload', 'Volume Landmarks', 'Training Frequency']
    },
    progressionScheme: {
      type: 'linear',
      volumeProgression: true,
      intensityProgression: true
    }
  };
}

function generatePushExercises(templates: any[], strengthProfile: any[]) {
  return [
    {
      exerciseName: 'Bench Press',
      exerciseType: 'strength',
      muscleGroups: ['pectorals', 'triceps', 'anterior_deltoid'],
      equipment: ['barbell', 'bench'],
      position: 1,
      progressionType: 'linear',
      sets: [
        { setNumber: 1, targetReps: 8, targetRPE: 6, restSeconds: 120 },
        { setNumber: 2, targetReps: 6, targetRPE: 7, restSeconds: 120 },
        { setNumber: 3, targetReps: 4, targetRPE: 8, restSeconds: 180 }
      ]
    },
    {
      exerciseName: 'Overhead Press',
      exerciseType: 'strength',
      muscleGroups: ['anterior_deltoid', 'triceps'],
      equipment: ['barbell'],
      position: 2,
      progressionType: 'linear',
      sets: [
        { setNumber: 1, targetReps: 8, targetRPE: 7, restSeconds: 120 },
        { setNumber: 2, targetReps: 8, targetRPE: 7, restSeconds: 120 },
        { setNumber: 3, targetReps: 8, targetRPE: 8, restSeconds: 120 }
      ]
    },
    {
      exerciseName: 'Dips',
      exerciseType: 'strength',
      muscleGroups: ['triceps', 'lower_chest'],
      equipment: ['dip_bars'],
      position: 3,
      progressionType: 'linear',
      sets: [
        { setNumber: 1, targetReps: 12, targetRPE: 7, restSeconds: 90 },
        { setNumber: 2, targetReps: 10, targetRPE: 8, restSeconds: 90 },
        { setNumber: 3, targetReps: 8, targetRPE: 8, restSeconds: 90 }
      ]
    }
  ];
}

function generatePullExercises(templates: any[], strengthProfile: any[]) {
  return [
    {
      exerciseName: 'Pull-ups',
      exerciseType: 'strength',
      muscleGroups: ['lats', 'rhomboids', 'biceps'],
      equipment: ['pull_up_bar'],
      position: 1,
      progressionType: 'linear',
      sets: [
        { setNumber: 1, targetReps: 8, targetRPE: 7, restSeconds: 120 },
        { setNumber: 2, targetReps: 6, targetRPE: 8, restSeconds: 120 },
        { setNumber: 3, targetReps: 4, targetRPE: 8, restSeconds: 120 }
      ]
    },
    {
      exerciseName: 'Barbell Rows',
      exerciseType: 'strength',
      muscleGroups: ['lats', 'rhomboids', 'middle_traps'],
      equipment: ['barbell'],
      position: 2,
      progressionType: 'linear',
      sets: [
        { setNumber: 1, targetReps: 8, targetRPE: 7, restSeconds: 120 },
        { setNumber: 2, targetReps: 8, targetRPE: 7, restSeconds: 120 },
        { setNumber: 3, targetReps: 8, targetRPE: 8, restSeconds: 120 }
      ]
    }
  ];
}

function generateLegExercises(templates: any[], strengthProfile: any[]) {
  return [
    {
      exerciseName: 'Squat',
      exerciseType: 'strength',
      muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
      equipment: ['barbell', 'rack'],
      position: 1,
      progressionType: 'linear',
      sets: [
        { setNumber: 1, targetReps: 8, targetRPE: 6, restSeconds: 180 },
        { setNumber: 2, targetReps: 6, targetRPE: 7, restSeconds: 180 },
        { setNumber: 3, targetReps: 4, targetRPE: 8, restSeconds: 180 }
      ]
    },
    {
      exerciseName: 'Romanian Deadlift',
      exerciseType: 'strength',
      muscleGroups: ['hamstrings', 'glutes', 'erector_spinae'],
      equipment: ['barbell'],
      position: 2,
      progressionType: 'linear',
      sets: [
        { setNumber: 1, targetReps: 10, targetRPE: 7, restSeconds: 120 },
        { setNumber: 2, targetReps: 8, targetRPE: 8, restSeconds: 120 },
        { setNumber: 3, targetReps: 6, targetRPE: 8, restSeconds: 120 }
      ]
    }
  ];
}

function generateUpperBodyExercises(templates: any[], strengthProfile: any[]) {
  return [
    {
      exerciseName: 'Incline Dumbbell Press',
      exerciseType: 'strength',
      muscleGroups: ['upper_chest', 'anterior_deltoid'],
      equipment: ['dumbbells', 'incline_bench'],
      position: 1,
      progressionType: 'linear',
      sets: [
        { setNumber: 1, targetReps: 10, targetRPE: 7, restSeconds: 120 },
        { setNumber: 2, targetReps: 8, targetRPE: 8, restSeconds: 120 }
      ]
    }
  ];
}

// History-based next-day generation using recent exercise data
async function generatePlanFromHistory(supabase: any, userId: string, userProfile: any, goals: string[], lookbackDays: number, planName?: string) {
  // Helper mappings
  const classifyExercise = (name: string): 'push'|'pull'|'legs'|'other' => {
    const n = (name || '').toLowerCase();
    if (/(bankdr|bench|schrägbank|dips|trizeps|overhead|schulterdr)/.test(n)) return 'push';
    if (/(klimm|pull|rudern|row|lat|bizeps|curl|face pull)/.test(n)) return 'pull';
    if (/(kniebeug|squat|beinpresse|kreuzheb|deadlift|hamstring|ausfallschritt|lunge|waden)/.test(n)) return 'legs';
    return 'other';
  };
  const nextSplit = (after: 'push'|'pull'|'legs'|'other'): 'push'|'pull'|'legs' => {
    if (after === 'push') return 'pull';
    if (after === 'pull') return 'legs';
    return 'push';
  };
  const estimate1RM = (weightKg?: number|null, reps?: number|null) => {
    if (!weightKg || !reps || reps <= 0) return null;
    return weightKg * (1 + reps / 30);
  };

  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);

  // Load recent sets incl. exercise names
  const { data: sets, error } = await supabase
    .from('exercise_sets')
    .select('created_at, weight_kg, reps, exercises ( name )')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Failed to fetch exercise_sets, falling back to template:', error);
    return generatePlanFromTemplate(userProfile, goals, [], []);
  }

  // Determine last split and favorites
  let lastType: 'push'|'pull'|'legs'|'other' = 'other';
  const counts: Record<'push'|'pull'|'legs', Record<string, number>> = { push: {}, pull: {}, legs: {} };
  const perExerciseLast: Record<string, { weight?: number; reps?: number }> = {};

  for (const s of sets || []) {
    const exName = s.exercises?.name || '';
    if (!exName) continue;
    const t = classifyExercise(exName);
    if (t !== 'other') {
      counts[t][exName] = (counts[t][exName] || 0) + 1;
    }
    // remember first occurrence as the latest set for that exercise
    if (!(exName in perExerciseLast) && (s.weight_kg || s.reps)) {
      perExerciseLast[exName] = { weight: s.weight_kg ?? undefined, reps: s.reps ?? undefined };
    }
  }

  if (sets && sets.length > 0) {
    const sample = sets.slice(0, 12);
    const c: Record<'push'|'pull'|'legs', number> = { push: 0, pull: 0, legs: 0 };
    for (const s of sample) {
      const exName = s.exercises?.name || '';
      const t = classifyExercise(exName);
      if (t !== 'other') c[t]++;
    }
    const ordered = Object.entries(c).sort((a,b)=>b[1]-a[1]);
    lastType = (ordered[0]?.[1] ?? 0) > 0 ? (ordered[0][0] as any) : 'other';
  }

  const target = nextSplit(lastType);
  const defaults = {
    push: { focus: 'Brust/Schultern/Trizeps', exercises: ['Bankdrücken', 'Schrägbankdrücken', 'Dips', 'Schulterdrücken', 'Seitheben'] },
    pull: { focus: 'Rücken/Bizeps', exercises: ['Klimmzüge', 'Langhantelrudern', 'T-Bar Rudern', 'Face Pulls', 'Langhantel-Curls'] },
    legs: { focus: 'Beine', exercises: ['Kniebeugen', 'Beinpresse', 'Rumänisches Kreuzheben', 'Ausfallschritte', 'Wadenheben'] },
  } as const;

  const usedSorted = Object.entries(counts[target]).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
  const chosen = Array.from(new Set([...usedSorted, ...defaults[target].exercises])).slice(0, 5);

  const makeSets = (name: string) => {
    const last = perExerciseLast[name];
    const est = estimate1RM(last?.weight, last?.reps);
    const pct = est ? Math.round((0.72) * 100) : null; // display only as info
    const isHeavy = /kniebeug|squat|kreuz|deadlift|beinpresse/i.test(name);
    const baseReps = isHeavy ? [8,6,6] : [12,10,8];
    const rest = isHeavy ? 180 : 120;
    return baseReps.map((r, idx) => ({
      setNumber: idx + 1,
      targetReps: r,
      targetRepsRange: isHeavy ? '5-8' : '8-12',
      targetRPE: isHeavy ? 8 : 7,
      restSeconds: rest,
      isWarmup: false,
      ...(est ? { targetPct1RM: 70 } : {})
    }));
  };

  const exList = chosen.map((name, i) => ({
    exerciseName: name,
    exerciseType: 'strength',
    muscleGroups: [],
    equipment: [],
    position: i + 1,
    isSuperset: false,
    progressionType: 'linear',
    sets: makeSets(name),
    notes: undefined
  }));

  const planType = (goals || []).join(' ').toLowerCase().includes('kraft') ? 'strength' : 'hypertrophy';
  return {
    name: planName || `PPL Next Day – ${target[0].toUpperCase()+target.slice(1)}`,
    description: `Nächster ${target.toUpperCase()}-Tag basierend auf deinen letzten ${lookbackDays} Tagen (Favoriten + 1RM-Schätzung).`,
    planType,
    durationWeeks: 1,
    targetFrequency: 1,
    goals: goals && goals.length ? goals : ['Hypertrophy'],
    days: [
      {
        dayId: 'next',
        dayName: `${target[0].toUpperCase()+target.slice(1)} Tag`,
        focus: defaults[target].focus,
        position: 1,
        isRestDay: false,
        exercises: exList
      }
    ],
    scientificBasis: {
      methodology: 'Evidence-Based Training',
      researchCitations: ['Schoenfeld_2019', 'Helms_2020'],
      appliedPrinciples: ['Progressive Overload', 'Specificity', 'Fatigue Management']
    },
    progressionScheme: {
      type: 'linear',
      volumeProgression: true,
      intensityProgression: true
    }
  };
}

// Placeholder for future AI integration
async function generatePlanWithAI(userProfile: any, goals: string[], strengthProfile: any[], exerciseTemplates: any[]) {
  // TODO: Implement OpenAI integration for fine-tuned plan generation
  console.log('AI generation not yet implemented, falling back to template');
  return generatePlanFromTemplate(userProfile, goals, strengthProfile, exerciseTemplates);
}

// Helper functions
function determineTrainingType(goals: string[]): string {
  if (goals.some(g => g.toLowerCase().includes('kraft'))) return 'Strength';
  if (goals.some(g => g.toLowerCase().includes('muskel'))) return 'Hypertrophy';
  if (goals.some(g => g.toLowerCase().includes('ausdauer'))) return 'Endurance';
  return 'Custom';
}

function getMethodologyForGoals(goals: string[], userProfile: any) {
  // Default to evidence-based approach
  return {
    coach: 'Jeff Nippard',
    alias: 'Evidence-Based Training',
    citations: ['Schoenfeld_2019', 'Kraemer_2017', 'Helms_2020']
  };
}

function estimateWorkoutDuration(days: any[]): number {
  let totalMinutes = 0;
  days.forEach(day => {
    if (!day.isRestDay) {
      day.exercises.forEach((exercise: any) => {
        totalMinutes += exercise.sets.length * 3; // ~3 minutes per set
      });
    }
  });
  return Math.round(totalMinutes / days.filter(d => !d.isRestDay).length);
}

function generatePlanHTML(plan: any): string {
  return `
    <div class="p-4 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg border border-primary/20 dark:border-primary/30">
      <h3 class="text-lg font-semibold text-primary dark:text-primary mb-2">🏋️ ${plan.name}</h3>
      <p class="text-foreground dark:text-foreground mb-2">${plan.description}</p>
      <div class="mt-3 text-xs text-muted-foreground">
        <p>📅 ${plan.durationWeeks} Wochen • 🎯 ${plan.targetFrequency}x/Woche</p>
        <p>🔬 ${plan.scientificBasis.methodology}</p>
        <p>📈 Progressive Überladung mit linearer Progression</p>
      </div>
    </div>
  `;
}