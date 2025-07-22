
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { message, userId, chatHistory = [], userData = {} } = await req.json();
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('Processing enhanced coach chat for user:', userId);

    // Get user profile and coach settings
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('coach_personality, muscle_maintenance_priority, macro_strategy, goal, age, gender, activity_level, weight, height')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      throw new Error('Could not load user profile');
    }

    // Get comprehensive data if not provided in userData
    let todaysTotals = userData.todaysTotals || { calories: 0, protein: 0, carbs: 0, fats: 0 };
    let dailyGoals = userData.dailyGoals;
    let averages = userData.averages || { calories: 0, protein: 0, carbs: 0, fats: 0 };
    let recentHistory = userData.historyData || [];
    let trendData = userData.trendData;
    let weightHistory = userData.weightHistory || [];

    // If userData is not complete, fetch from database
    if (!dailyGoals) {
      const { data: goalsData } = await supabase
        .from('daily_goals')
        .select('calories, protein, carbs, fats, bmr, tdee')
        .eq('user_id', userId)
        .single();
      dailyGoals = goalsData;
    }

    // Get recent workouts if available
    const { data: recentWorkouts } = await supabase
      .from('workouts')
      .select('exercise_name, sets, reps, weight, date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(5);

    // Get recent sleep data
    const { data: recentSleep } = await supabase
      .from('sleep_tracking')
      .select('sleep_hours, sleep_quality, date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(7);

    // Create personality-based system message
    const personalityPrompts = {
      hart: "Du bist ein direkter, kompromissloser Fitness-Coach. Du sagst die Wahrheit ohne Umschweife und forderst Disziplin. Keine Ausreden werden akzeptiert.",
      soft: "Du bist ein einfühlsamer, verständnisvoller Coach. Du motivierst sanft, zeigst Empathie und unterstützt mit positiven Worten.",
      lustig: "Du bist ein humorvoller Coach mit guter Laune. Du motivierst mit Witzen, lockeren Sprüchen und bringst die Leute zum Lächeln.",
      ironisch: "Du bist ein ironischer Coach mit sarkastischem Humor. Du nutzt Ironie und Augenzwinkern, aber immer konstruktiv.",
      motivierend: "Du bist ein begeisternder, positiver Coach. Du feuerst an, motivierst mit Energie und siehst immer das Positive."
    };

    const personality = profile?.coach_personality || 'motivierend';
    const personalityPrompt = personalityPrompts[personality as keyof typeof personalityPrompts];

    // Calculate progress percentages
    const calorieProgress = dailyGoals?.calories ? Math.round((todaysTotals.calories / dailyGoals.calories) * 100) : 0;
    const proteinProgress = dailyGoals?.protein ? Math.round((todaysTotals.protein / dailyGoals.protein) * 100) : 0;

    const systemMessage = `${personalityPrompt}

Du bist ein KaloAI Coach und hilfst dem Benutzer bei Ernährung, Training und Fitness. Du hast vollständigen Zugang zu allen Benutzerdaten.

BENUTZER-PROFIL:
- Persönlichkeit: ${personality}
- Muskelerhalt-Priorität: ${profile?.muscle_maintenance_priority ? 'Ja' : 'Nein'}
- Makro-Strategie: ${profile?.macro_strategy}
- Ziel: ${profile?.goal}
- Alter: ${profile?.age}, Geschlecht: ${profile?.gender}
- Aktivitätslevel: ${profile?.activity_level}
- Gewicht: ${profile?.weight}kg, Größe: ${profile?.height}cm

HEUTIGE ZIELE & FORTSCHRITT:
- Kalorien: ${todaysTotals.calories}/${dailyGoals?.calories || 0} (${calorieProgress}%)
- Protein: ${todaysTotals.protein}g/${dailyGoals?.protein || 0}g (${proteinProgress}%)
- Kohlenhydrate: ${todaysTotals.carbs}g/${dailyGoals?.carbs || 0}g
- Fette: ${todaysTotals.fats}g/${dailyGoals?.fats || 0}g

DURCHSCHNITTSWERTE (letzte Tage):
- Kalorien: ${averages.calories}kcal/Tag
- Protein: ${averages.protein}g/Tag
- Kohlenhydrate: ${averages.carbs}g/Tag
- Fette: ${averages.fats}g/Tag

AKTUELLE TRENDS:
${trendData ? `
- Wöchentlicher Durchschnitt: ${trendData.weeklyAverage}kcal
- Trend: ${trendData.trend === 'up' ? 'Steigend' : trendData.trend === 'down' ? 'Fallend' : 'Stabil'}
- Zielerreichung: ${trendData.weeklyGoalReach}% der Tage
- Verbesserung: ${trendData.improvement}
` : 'Noch nicht genügend Daten für Trends verfügbar'}

GEWICHTSVERLAUF (letzte Einträge):
${weightHistory.length > 0 ? weightHistory.slice(0, 3).map((w: any) => `- ${w.date}: ${w.weight}kg`).join('\n') : '- Noch keine Gewichtsdaten'}

LETZTE WORKOUTS:
${recentWorkouts?.length ? recentWorkouts.slice(0, 3).map((w: any) => `- ${w.date}: ${w.exercise_name} (${w.sets}x${w.reps}@${w.weight}kg)`).join('\n') : '- Noch keine Workouts eingetragen'}

SCHLAF (letzte 7 Tage):
${recentSleep?.length ? recentSleep.slice(0, 3).map((s: any) => `- ${s.date}: ${s.sleep_hours}h (Qualität: ${s.sleep_quality}/10)`).join('\n') : '- Keine Schlafdaten verfügbar'}

ERNÄHRUNGSHISTORIE (letzte Tage):
${recentHistory.length > 0 ? recentHistory.slice(0, 3).map((day: any) => `- ${day.date}: ${day.totals.calories}kcal (${day.meals.length} Mahlzeiten)`).join('\n') : '- Noch keine Ernährungshistorie'}

WICHTIGE ANWEISUNGEN:
- Sei ${personality} in deinen Antworten
- Gib konkrete, umsetzbare Ratschläge basierend auf den Daten
- Berücksichtige das Ziel "${profile?.goal}" in allen Empfehlungen
- ${profile?.muscle_maintenance_priority ? 'Fokussiere stark auf Muskelerhalt und Protein' : ''}
- Halte Antworten prägnant aber hilfreich (max. 2-3 Absätze)
- Nutze die verfügbaren Daten für personalisierte Insights
- Bei Fragen nach spezifischen Plänen, erstelle konkrete Vorschläge

Antworte auf Deutsch und nutze die Persönlichkeit "${personality}".`;

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemMessage },
      ...chatHistory.slice(-8).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log('Sending enhanced request to OpenAI with personality:', personality);

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: personality === 'lustig' ? 0.9 : personality === 'hart' ? 0.4 : 0.7,
        max_tokens: 300,
        frequency_penalty: 0.3,
        presence_penalty: 0.1,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const reply = openAIData.choices[0]?.message?.content;

    if (!reply) {
      throw new Error('No response from OpenAI');
    }

    console.log('Generated enhanced chat response successfully');

    return new Response(JSON.stringify({ 
      response: reply,
      personality,
      context: {
        todaysTotals,
        dailyGoals,
        progressPercentages: { calories: calorieProgress, protein: proteinProgress },
        hasWorkouts: recentWorkouts?.length > 0,
        hasSleepData: recentSleep?.length > 0,
        hasWeightData: weightHistory.length > 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in enhanced coach-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      response: 'Entschuldigung, ich kann gerade nicht antworten. Versuche es bitte später noch einmal.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
