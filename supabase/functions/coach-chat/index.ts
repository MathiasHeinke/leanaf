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
    
    const { message, userId, chatHistory = [] } = await req.json();
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('Processing chat message for user:', userId);

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

    // Get daily goals
    const { data: dailyGoals, error: goalsError } = await supabase
      .from('daily_goals')
      .select('calories, protein, carbs, fats, bmr, tdee')
      .eq('user_id', userId)
      .single();

    if (goalsError) {
      console.error('Goals error:', goalsError);
    }

    // Get today's meals for context
    const today = new Date().toISOString().split('T')[0];
    const { data: todaysMeals, error: mealsError } = await supabase
      .from('meals')
      .select('text, calories, protein, carbs, fats, meal_type, created_at')
      .eq('user_id', userId)
      .gte('created_at', today)
      .order('created_at', { ascending: false });

    if (mealsError) {
      console.error('Meals error:', mealsError);
    }

    // Calculate today's totals
    const todaysTotals = todaysMeals?.reduce((sum, meal) => ({
      calories: sum.calories + (meal.calories || 0),
      protein: sum.protein + (meal.protein || 0),
      carbs: sum.carbs + (meal.carbs || 0),
      fats: sum.fats + (meal.fats || 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 }) || { calories: 0, protein: 0, carbs: 0, fats: 0 };

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

    const systemMessage = `${personalityPrompt}

Du hilfst dem Benutzer bei Ernährung und Fitness. Hier sind die aktuellen Daten:

BENUTZER-PROFIL:
- Persönlichkeit: ${personality}
- Muskelerhalt-Priorität: ${profile?.muscle_maintenance_priority ? 'Ja' : 'Nein'}
- Makro-Strategie: ${profile?.macro_strategy}
- Ziel: ${profile?.goal}
- Alter: ${profile?.age}, Geschlecht: ${profile?.gender}
- Aktivitätslevel: ${profile?.activity_level}
- Gewicht: ${profile?.weight}kg, Größe: ${profile?.height}cm

TÄGLICHE ZIELE:
- Kalorien: ${dailyGoals?.calories || 'nicht gesetzt'}
- Protein: ${dailyGoals?.protein || 0}g
- Kohlenhydrate: ${dailyGoals?.carbs || 0}g
- Fette: ${dailyGoals?.fats || 0}g

HEUTIGER FORTSCHRITT:
- Kalorien: ${todaysTotals.calories}/${dailyGoals?.calories || 0} (${dailyGoals?.calories ? Math.round((todaysTotals.calories / dailyGoals.calories) * 100) : 0}%)
- Protein: ${todaysTotals.protein}g/${dailyGoals?.protein || 0}g
- Kohlenhydrate: ${todaysTotals.carbs}g/${dailyGoals?.carbs || 0}g
- Fette: ${todaysTotals.fats}g/${dailyGoals?.fats || 0}g

HEUTIGE MAHLZEITEN:
${todaysMeals?.length ? todaysMeals.map(meal => `- ${meal.meal_type}: ${meal.text} (${meal.calories}kcal)`).join('\n') : '- Noch keine Mahlzeiten eingetragen'}

Antworte auf Deutsch und berücksichtige die Persönlichkeit ${personality}. 
${profile?.muscle_maintenance_priority ? 'Fokussiere auf Muskelerhalt und Krafttraining-optimierte Tipps.' : ''}
Halte deine Antworten prägnant und hilfreich (max. 200 Wörter).`;

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemMessage },
      ...chatHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log('Sending request to OpenAI with personality:', personality);

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
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

    console.log('Generated chat response successfully');

    return new Response(JSON.stringify({ 
      reply,
      personality,
      context: {
        todaysTotals,
        dailyGoals,
        mealsCount: todaysMeals?.length || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in coach-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      reply: 'Entschuldigung, ich kann gerade nicht antworten. Versuche es bitte später noch einmal.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});