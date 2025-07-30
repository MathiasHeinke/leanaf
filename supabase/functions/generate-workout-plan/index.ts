import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coachId, planName, category, description, userGoals, userLevel } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Parse the JWT token to get user info
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Example workout plan generation (simplified)
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
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});