import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { logTraceEvent } from "../telemetry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trace-id, x-source, x-chat-mode',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coachId, planName, category, description, userGoals, userLevel } = await req.json();

    const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseLog = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const t0 = Date.now();


    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Authorization header
    const authHeader2 = req.headers.get('Authorization');
    if (!authHeader2) {
      throw new Error('No authorization header');
    }

    const token = authHeader2.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Example workout plan generation (simplified)
    await logTraceEvent(supabaseLog, { traceId, stage: 'tool_exec', handler: 'generate-workout-plan', status: 'RUNNING', payload: { category, userLevel } });
    // In a real implementation, this would integrate with OpenAI or other AI services
    const generateExercisesPlan = (category: string, userLevel: string) => {
      const exercisePlans = {
        'Push': [
          { name: 'Bankdrücken', sets: 4, reps: 8-10, rpe: 7, weight_kg: userLevel === 'beginner' ? 40 : 60 },
          { name: 'Schulterdrücken', sets: 3, reps: 10-12, rpe: 6, weight_kg: userLevel === 'beginner' ? 20 : 30 },
          { name: 'Dips', sets: 3, reps: 12-15, rpe: 7, weight_kg: 0 },
          { name: 'Seitheben', sets: 3, reps: 12-15, rpe: 6, weight_kg: userLevel === 'beginner' ? 8 : 12 }
        ],
        'Pull': [
          { name: 'Klimmzüge', sets: 4, reps: 6-8, rpe: 8, weight_kg: 0 },
          { name: 'Langhantel Rudern', sets: 4, reps: 8-10, rpe: 7, weight_kg: userLevel === 'beginner' ? 40 : 60 },
          { name: 'Latzug', sets: 3, reps: 10-12, rpe: 6, weight_kg: userLevel === 'beginner' ? 50 : 70 },
          { name: 'Bizep Curls', sets: 3, reps: 12-15, rpe: 6, weight_kg: userLevel === 'beginner' ? 10 : 15 }
        ],
        'Legs': [
          { name: 'Kniebeugen', sets: 4, reps: 8-10, rpe: 8, weight_kg: userLevel === 'beginner' ? 50 : 80 },
          { name: 'Rumänisches Kreuzheben', sets: 4, reps: 8-10, rpe: 7, weight_kg: userLevel === 'beginner' ? 40 : 60 },
          { name: 'Beinpresse', sets: 3, reps: 12-15, rpe: 6, weight_kg: userLevel === 'beginner' ? 80 : 120 },
          { name: 'Wadenheben', sets: 4, reps: 15-20, rpe: 6, weight_kg: userLevel === 'beginner' ? 60 : 80 }
        ]
      };

      return exercisePlans[category as keyof typeof exercisePlans] || exercisePlans['Push'];
    };

    const exercises = generateExercisesPlan(category, userLevel);
    const estimatedDuration = exercises.length * 8; // Rough estimate: 8 minutes per exercise

    // Create the workout plan in the database
    const { data: workoutPlan, error: planError } = await supabase
      .from('workout_plans')
      .insert({
        name: planName,
        category: category,
        description: description,
        exercises: exercises,
        created_by: user.id,
        estimated_duration_minutes: estimatedDuration,
        is_public: false
      })
      .select()
      .single();

    if (planError) throw planError;

    await logTraceEvent(supabaseLog, {
      traceId,
      stage: 'tool_result',
      handler: 'generate-workout-plan',
      status: 'OK',
      latencyMs: Date.now() - t0,
      payload: { category, exercisesCount: exercises.length }
    });

    return new Response(
      JSON.stringify({
        success: true,
        workoutPlan: workoutPlan,
        message: `Trainingsplan "${planName}" wurde von ${coachId} erstellt!`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating workout plan:', error);
    try {
      const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
      const authHeader = req.headers.get('Authorization') ?? '';
      const supabaseLog = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
      await logTraceEvent(supabaseLog, { traceId, stage: 'error', handler: 'generate-workout-plan', status: 'ERROR', errorMessage: String(error) });
    } catch (_) { /* ignore */ }
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as any).message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});