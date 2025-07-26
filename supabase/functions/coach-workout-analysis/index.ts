import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, workoutData } = await req.json();

    if (!userId || !workoutData) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or workoutData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get historical workout data (last 14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const { data: historicalWorkouts, error: workoutError } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .gte('date', twoWeeksAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (workoutError) {
      console.error('Error fetching workout data:', workoutError);
    }

    // Get user profile for context
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('goal, age, activity_level')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    // Analyze workout patterns
    const workoutsLast7Days = historicalWorkouts?.filter(w => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(w.date) >= weekAgo;
    }) || [];

    const totalWorkouts = workoutsLast7Days.length;
    const activeWorkouts = workoutsLast7Days.filter(w => w.did_workout).length;
    const restDays = workoutsLast7Days.filter(w => !w.did_workout).length;
    
    const avgDuration = activeWorkouts > 0 ? 
      workoutsLast7Days
        .filter(w => w.did_workout)
        .reduce((sum, w) => sum + (w.duration_minutes || 0), 0) / activeWorkouts : 0;
    
    const avgIntensity = activeWorkouts > 0 ?
      workoutsLast7Days
        .filter(w => w.did_workout)
        .reduce((sum, w) => sum + (w.intensity || 0), 0) / activeWorkouts : 0;

    // Check workout types distribution
    const workoutTypes = workoutsLast7Days.reduce((acc, w) => {
      acc[w.workout_type] = (acc[w.workout_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Identify patterns and recommendations
    const isFirstWorkout = historicalWorkouts?.length === 0;
    const isConsistent = activeWorkouts >= 3; // 3+ workouts per week
    const isOvertraining = activeWorkouts > 6 && restDays === 0;
    const isUndertraining = activeWorkouts < 2;
    const hasBalance = workoutTypes.kraft > 0 && workoutTypes.cardio > 0;

    // Current workout analysis
    const currentWorkout = Array.isArray(workoutData) ? workoutData : [workoutData];
    const hasMultipleToday = currentWorkout.length > 1;
    const includesRest = currentWorkout.some(w => w.workout_type === 'pause');

    // Create context for AI analysis
    const workoutContext = {
      current: currentWorkout,
      historical: {
        totalWorkouts,
        activeWorkouts,
        restDays,
        avgDuration: Number(avgDuration.toFixed(1)),
        avgIntensity: Number(avgIntensity.toFixed(1)),
        workoutTypes
      },
      patterns: {
        isFirstWorkout,
        isConsistent,
        isOvertraining,
        isUndertraining,
        hasBalance,
        hasMultipleToday,
        includesRest
      },
      user: {
        goal: profile?.goal || 'maintain',
        age: profile?.age,
        activityLevel: profile?.activity_level
      }
    };

    // Generate AI feedback from Sascha
    const systemPrompt = `Du bist Sascha, ein direkter und performance-fokussierter Trainingscoach.

Deine Persönlichkeit:
- Direkt, ehrlich und motivierend
- Performance- und zielorientiert
- Wissenschaftlich fundiert aber praktisch
- Ermutigend aber auch fordernd bei Bedarf
- Fokus auf kontinuierliche Verbesserung

Dein Stil:
- Sprichst den User direkt an ("Du trainierst...", "Dein Workout...")
- Verwendest 1-2 passende Emojis pro Nachricht (💪 🔥 🎯 ⚡ 🏋️‍♂️ 🚀)
- Kurze, knackige Sätze
- Bei schlechter Performance: Motivierende Herausforderung
- Bei guter Performance: Anerkennung und nächste Schritte

Analysiere die Trainingsdaten und gib eine personalisierte Bewertung ab. Berücksichtige:
- Aktuelle vs. historische Trainingsfrequenz
- Trainingsverteilung (Kraft vs. Cardio vs. Pause)
- Intensität und Dauer
- Übertraining vs. Untertraining
- Benutzerkontext und Ziele

Antwort in 3-4 kurzen Sätzen. Sei spezifisch und motivierend.`;

    const userPrompt = `Hier sind die Trainingsdaten zur Analyse:

Heutiges Training:
${currentWorkout.map(w => `- ${w.workout_type === 'kraft' ? 'Krafttraining' : 
  w.workout_type === 'cardio' ? 'Cardio' : 
  w.workout_type === 'pause' ? 'Pause/Ruhetag' : 'Anderes'}: ${w.duration_minutes || 0} Min, Intensität: ${w.intensity || 0}/10`).join('\n')}

Letzte 7 Tage:
- Gesamt Trainings: ${totalWorkouts}
- Aktive Workouts: ${activeWorkouts}
- Ruhetage: ${restDays}
- Durchschnittliche Dauer: ${avgDuration.toFixed(1)} Min
- Durchschnittliche Intensität: ${avgIntensity.toFixed(1)}/10

Trainingsverteilung:
${Object.entries(workoutTypes).map(([type, count]) => 
  `- ${type === 'kraft' ? 'Krafttraining' : 
      type === 'cardio' ? 'Cardio' : 
      type === 'pause' ? 'Pause' : 'Anderes'}: ${count}x`).join('\n')}

Benutzerkontext:
- Ziel: ${profile?.goal || 'maintain'}
- Alter: ${profile?.age || 'nicht angegeben'}
- Aktivitätslevel: ${profile?.activity_level || 'nicht angegeben'}

Besonderheiten:
${isFirstWorkout ? '🎉 Erstes Training!' : ''}
${isOvertraining ? '⚠️ Mögliches Übertraining (>6 Workouts, keine Pause)' : ''}
${isUndertraining ? '⚠️ Zu wenig Training (<2 Workouts/Woche)' : ''}
${isConsistent ? '✅ Konsistentes Training (3+ Workouts/Woche)' : ''}
${hasBalance ? '✅ Ausgewogene Trainingsverteilung' : ''}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const coachFeedback = aiResponse.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        coachFeedback,
        context: workoutContext
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in coach-workout-analysis:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});