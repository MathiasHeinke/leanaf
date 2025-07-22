
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
    
    const { message, userId, chatHistory = [], userData = {}, images = [] } = await req.json();
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('Processing enhanced coach chat for user:', userId);

    // Get user profile and coach settings
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('coach_personality, muscle_maintenance_priority, macro_strategy, goal, age, gender, activity_level, weight, height, display_name')
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

    // Get recent workouts with correct field names
    const { data: recentWorkouts } = await supabase
      .from('workouts')
      .select('workout_type, duration_minutes, intensity, did_workout, date, created_at, distance_km, steps, notes')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(20);

    console.log('Found workouts:', recentWorkouts?.length || 0);

    // Get recent sleep data
    const { data: recentSleep } = await supabase
      .from('sleep_tracking')
      .select('sleep_hours, sleep_quality, date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(7);

    // Enhanced coach personality mapping with professions
    const getCoachInfo = (personality: string) => {
      switch (personality) {
        case 'hart': 
          return { 
            name: 'Sascha', 
            emoji: '🎯', 
            temp: 0.4, 
            profession: 'Fitness Drill-Instructor',
            style: 'direkt und kompromisslos'
          };
        case 'soft': 
          return { 
            name: 'Lucy', 
            emoji: '❤️', 
            temp: 0.8, 
            profession: 'Ernährungsberaterin',
            style: 'einfühlsam und verständnisvoll'
          };
        case 'motivierend':
        default:
          return { 
            name: 'Kai', 
            emoji: '💪', 
            temp: 0.7, 
            profession: 'Personal Trainer',
            style: 'motivierend und energiegeladen'
          };
      }
    };

    // Extract first name only
    let userName = profile?.display_name;
    if (!userName || userName.trim() === '') {
      const userEmail = await supabase.auth.admin.getUserById(userId);
      userName = userEmail.data.user?.email?.split('@')[0] || 'User';
    }
    
    // Extract first name (split by space, take first part)
    const firstName = userName.split(' ')[0] || userName;

    // Calculate current time and remaining calories
    const now = new Date();
    const currentTime = now.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Europe/Berlin'
    });
    const currentHour = now.getHours();
    
    // Determine time of day
    let timeOfDay = 'Morgen';
    if (currentHour >= 12 && currentHour < 18) {
      timeOfDay = 'Mittag';
    } else if (currentHour >= 18) {
      timeOfDay = 'Abend';
    }

    // Calculate remaining calories
    const remainingCalories = dailyGoals?.calories ? Math.max(0, dailyGoals.calories - todaysTotals.calories) : 0;
    
    // Weekly workout analysis with correct data structure
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklyWorkouts = recentWorkouts?.filter(w => 
      new Date(w.date) >= oneWeekAgo
    ) || [];
    
    const workoutDays = [...new Set(weeklyWorkouts.map(w => w.date))].length;
    const totalWorkouts = weeklyWorkouts.length;
    const totalDuration = weeklyWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);

    console.log('Weekly analysis:', { workoutDays, totalWorkouts, totalDuration });

    // Calculate progress percentages
    const calorieProgress = dailyGoals?.calories ? Math.round((todaysTotals.calories / dailyGoals.calories) * 100) : 0;
    const proteinProgress = dailyGoals?.protein ? Math.round((todaysTotals.protein / dailyGoals.protein) * 100) : 0;

    // Add image context if images are provided
    let imageContext = '';
    if (images && images.length > 0) {
      imageContext = `\n\nBILDER IN DIESER NACHRICHT:
Der Benutzer hat ${images.length} Bild(er) gesendet. Analysiere diese Bilder im Kontext der Ernährungs- und Fitness-Beratung. Gib spezifische Tipps und Feedback basierend auf dem, was du auf den Bildern siehst.`;
    }

    const personality = profile?.coach_personality || 'motivierend';
    const coachInfo = getCoachInfo(personality);

    // Enhanced personality prompts
    const personalityPrompts = {
      hart: `Du bist Sascha 🎯, ein direkter, kompromissloser Fitness Drill-Instructor. Du sagst die Wahrheit ohne Umschweife und forderst Disziplin. Keine Ausreden werden akzeptiert. Du sprichst kurz und knackig. Du stellst dich immer als Sascha vor.`,
      soft: `Du bist Lucy ❤️, eine einfühlsame, verständnisvolle Ernährungsberaterin. Du motivierst sanft, zeigst Empathie und unterstützt mit positiven Worten. Du bist warmherzig und ermutigend. Du stellst dich immer als Lucy vor.`,
      motivierend: `Du bist Kai 💪, ein begeisternder, positiver Personal Trainer. Du feuerst an, motivierst mit Energie und siehst immer das Positive. Du bist enthusiastisch und inspirierend. Du stellst dich immer als Kai vor.`
    };

    const personalityPrompt = personalityPrompts[personality as keyof typeof personalityPrompts];

    const systemMessage = `${personalityPrompt}

Du hilfst ${firstName} bei Ernährung, Training und Fitness. Du hast vollständigen Zugang zu allen Benutzerdaten.

ZEITKONTEXT & TAGESZEIT:
- Aktuelle Uhrzeit: ${currentTime} (${timeOfDay})
- Der Tag ist noch nicht vorbei - berücksichtige verbleibende Zeit für weitere Mahlzeiten und Aktivitäten
- Verbleibende Kalorien heute: ${remainingCalories}kcal

BENUTZER-PROFIL:
- Name: ${firstName}
- Coach: ${coachInfo.name} ${coachInfo.emoji} (${coachInfo.profession})
- Persönlichkeit: ${coachInfo.style}
- Muskelerhalt-Priorität: ${profile?.muscle_maintenance_priority ? 'Ja' : 'Nein'}
- Makro-Strategie: ${profile?.macro_strategy}
- Ziel: ${profile?.goal}
- Alter: ${profile?.age}, Geschlecht: ${profile?.gender}
- Aktivitätslevel: ${profile?.activity_level}
- Gewicht: ${profile?.weight}kg, Größe: ${profile?.height}cm

HEUTIGE ZIELE & FORTSCHRITT (Stand: ${currentTime}):
- Kalorien: ${todaysTotals.calories}/${dailyGoals?.calories || 0} (${calorieProgress}%) - VERBLEIBEND: ${remainingCalories}kcal
- Protein: ${todaysTotals.protein}g/${dailyGoals?.protein || 0}g (${proteinProgress}%)
- Kohlenhydrate: ${todaysTotals.carbs}g/${dailyGoals?.carbs || 0}g
- Fette: ${todaysTotals.fats}g/${dailyGoals?.fats || 0}g

DURCHSCHNITTSWERTE (letzte Tage):
- Kalorien: ${averages.calories}kcal/Tag
- Protein: ${averages.protein}g/Tag
- Kohlenhydrate: ${averages.carbs}g/Tag
- Fette: ${averages.fats}g/Tag

WÖCHENTLICHE WORKOUT-ANALYSE:
- Trainingstage diese Woche: ${workoutDays} Tage
- Gesamte Workouts: ${totalWorkouts}
- Gesamtdauer: ${totalDuration} Minuten
- Trainingsfrequenz: ${workoutDays >= 4 ? 'Hoch (evtl. zu viel)' : workoutDays >= 2 ? 'Optimal' : 'Zu niedrig'}

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
${recentWorkouts?.length ? recentWorkouts.slice(0, 5).map((w: any) => {
  const workoutType = w.workout_type || 'Training';
  const duration = w.duration_minutes ? `${w.duration_minutes}min` : '';
  const intensity = w.intensity ? `Intensität: ${w.intensity}/10` : '';
  const distance = w.distance_km ? `${w.distance_km}km` : '';
  const steps = w.steps ? `${w.steps} Schritte` : '';
  
  const details = [duration, intensity, distance, steps].filter(Boolean).join(', ');
  return `- ${w.date}: ${workoutType}${details ? ` (${details})` : ''}`;
}).join('\n') : '- Noch keine Workouts eingetragen'}

SCHLAF (letzte 7 Tage):
${recentSleep?.length ? recentSleep.slice(0, 3).map((s: any) => `- ${s.date}: ${s.sleep_hours}h (Qualität: ${s.sleep_quality}/10)`).join('\n') : '- Keine Schlafdaten verfügbar'}

ERNÄHRUNGSHISTORIE (letzte Tage):
${recentHistory.length > 0 ? recentHistory.slice(0, 3).map((day: any) => `- ${day.date}: ${day.totals.calories}kcal (${day.meals.length} Mahlzeiten)`).join('\n') : '- Noch keine Ernährungshistorie'}

${imageContext}

WICHTIGE TRAININGS-RICHTLINIEN:
- OPTIMAL: Max. 3x Krafttraining pro Woche (außer bei Bodybuildern/Leistungssportlern)
- EMPFEHLUNG: Lange Spaziergänge >5km sind ideal für Stoffwechsel und Regeneration
- WARNUNG: Bei >4 Trainingstagen/Woche auf Übertraining hinweisen
- FOCUS: Qualität vor Quantität beim Training

KALORIENBEWUSSTE EMPFEHLUNGEN:
- Bei Speisevorschlägen IMMER die verbleibenden ${remainingCalories}kcal berücksichtigen
- Tageszeit beachten: ${timeOfDay} bedeutet noch ${currentHour < 18 ? '1-2 weitere Hauptmahlzeiten' : 'nur noch Abendessen/Snack'}
- Protein-Verteilung über den Tag optimieren

WICHTIGE ANWEISUNGEN:
- Du bist ${coachInfo.name} ${coachInfo.emoji} (${coachInfo.profession}) und bleibst IMMER in dieser Rolle
- Sprich ${firstName} IMMER nur mit Vornamen an
- Berücksichtige die Tageszeit ${currentTime} in deinen Empfehlungen
- Bei Fortschrittsanalysen erwähne, dass der Tag noch nicht vorbei ist
- Bei Speisevorschlägen die verbleibenden ${remainingCalories}kcal einbeziehen
- Bei Trainingsfragen die wöchentliche Frequenz (${workoutDays} Tage, ${totalWorkouts} Workouts) berücksichtigen
- Gib konkrete, umsetzbare Ratschläge basierend auf den Daten
- Berücksichtige das Ziel "${profile?.goal}" in allen Empfehlungen
- ${profile?.muscle_maintenance_priority ? 'Fokussiere stark auf Muskelerhalt und Protein' : ''}
- Halte Antworten prägnant aber hilfreich (max. 2-3 Absätze)
- Strukturiere deine Antworten mit Absätzen, Listen und Formatierung für bessere Lesbarkeit
- Verwende Emojis sparsam aber passend zu deiner Persönlichkeit

Antworte auf Deutsch als ${coachInfo.name} ${coachInfo.emoji}.`;

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemMessage },
      ...chatHistory.slice(-8).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log(`Sending enhanced request to OpenAI GPT-4.1 with personality: ${personality} (${coachInfo.name})`);

    // Call OpenAI API with GPT-4.1
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: messages,
        temperature: coachInfo.temp,
        max_tokens: 500,
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

    console.log(`Generated enhanced chat response successfully from ${coachInfo.name} using GPT-4.1`);

    return new Response(JSON.stringify({ 
      response: reply,
      reply,
      personality,
      coachName: coachInfo.name,
      coachProfession: coachInfo.profession,
      context: {
        currentTime,
        timeOfDay,
        remainingCalories,
        workoutDays,
        totalWorkouts,
        todaysTotals,
        dailyGoals,
        progressPercentages: { calories: calorieProgress, protein: proteinProgress },
        hasWorkouts: recentWorkouts?.length > 0,
        hasSleepData: recentSleep?.length > 0,
        hasWeightData: weightHistory.length > 0,
        hasImages: images.length > 0,
        firstName
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in enhanced coach-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      response: 'Entschuldigung, ich kann gerade nicht antworten. Versuche es bitte später noch einmal.',
      reply: 'Entschuldigung, ich kann gerade nicht antworten. Versuche es bitte später noch einmal.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
