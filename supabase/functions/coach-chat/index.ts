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

    // Check if user has active subscription with improved logging
    let userTier = 'free';
    let subscriptionDetails = null;
    
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('subscribed, subscription_tier, subscription_end')
      .eq('user_id', userId)
      .single();
    
    if (subError && subError.code !== 'PGRST116') {
      console.error('Error checking subscription:', subError);
    }
    
    subscriptionDetails = subscriber;
    
    if (subscriber?.subscribed) {
      userTier = 'pro';
      console.log(`✅ [COACH-CHAT] User ${userId} has active subscription:`, {
        tier: subscriber.subscription_tier,
        subscribed: subscriber.subscribed,
        expires: subscriber.subscription_end
      });
    } else {
      console.log(`ℹ️ [COACH-CHAT] User ${userId} on free tier:`, {
        subscribed: subscriber?.subscribed || false,
        tier: subscriber?.subscription_tier || 'none'
      });
    }
    
    // For free users, check usage limits
    if (userTier === 'free') {
      const { data: usageResult, error: usageError } = await supabase.rpc('check_ai_usage_limit', {
        p_user_id: userId,
        p_feature_type: 'coach_chat'
      });
      
      if (usageError) {
        console.error('Error checking usage limit:', usageError);
        // Don't fail completely, just log the error
      }
      
      if (usageResult && !usageResult.can_use) {
        console.log('⛔ [COACH-CHAT] Usage limit exceeded for user:', userId, {
          dailyCount: usageResult.daily_count,
          dailyLimit: usageResult.daily_limit,
          dailyRemaining: usageResult.daily_remaining
        });
        
        return new Response(JSON.stringify({ 
          error: 'Tägliches Limit für Coach-Chat erreicht. Upgrade zu Pro für unbegrenzte Nutzung.',
          code: 'USAGE_LIMIT_EXCEEDED',
          daily_remaining: usageResult?.daily_remaining || 0,
          monthly_remaining: usageResult?.monthly_remaining || 0,
          subscription_status: {
            tier: userTier,
            subscribed: subscriber?.subscribed || false,
            details: subscriptionDetails
          }
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

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

    // Get detailed exercise data for Training+ users
    let detailedExerciseData = null;
    let hasTrainingPlusAccess = false;

    // Check if user has Training+ access (premium subscription)
    if (userTier === 'pro') {
      hasTrainingPlusAccess = true;
      
      // Get recent exercise sessions with detailed data
      const { data: exerciseSessions } = await supabase
        .from('exercise_sessions')
        .select(`
          id, session_name, workout_type, date, start_time, end_time, notes,
          exercise_sets (
            id, set_number, weight_kg, reps, rpe, duration_seconds, distance_m, rest_seconds, notes,
            exercises (
              name, category, muscle_groups, difficulty_level, is_compound
            )
          )
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(10);

      if (exerciseSessions && exerciseSessions.length > 0) {
        // Calculate detailed metrics
        const totalSessions = exerciseSessions.length;
        const totalSets = exerciseSessions.reduce((sum, session) => 
          sum + (session.exercise_sets?.length || 0), 0);
        
        // Calculate total volume (weight * reps)
        const totalVolume = exerciseSessions.reduce((sessionSum, session) => 
          sessionSum + (session.exercise_sets?.reduce((setSum, set) => 
            setSum + ((set.weight_kg || 0) * (set.reps || 0)), 0) || 0), 0);
        
        // Get unique exercises
        const uniqueExercises = new Set();
        exerciseSessions.forEach(session => {
          session.exercise_sets?.forEach(set => {
            if (set.exercises?.name) uniqueExercises.add(set.exercises.name);
          });
        });

        // Calculate average RPE
        const rpeValues = exerciseSessions.flatMap(session => 
          session.exercise_sets?.map(set => set.rpe).filter(rpe => rpe !== null) || []);
        const avgRPE = rpeValues.length > 0 ? 
          rpeValues.reduce((sum, rpe) => sum + rpe, 0) / rpeValues.length : 0;

        // Get most trained exercises
        const exerciseFrequency = new Map();
        exerciseSessions.forEach(session => {
          session.exercise_sets?.forEach(set => {
            if (set.exercises?.name) {
              const exercise = set.exercises.name;
              exerciseFrequency.set(exercise, (exerciseFrequency.get(exercise) || 0) + 1);
            }
          });
        });

        const topExercises = Array.from(exerciseFrequency.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        detailedExerciseData = {
          totalSessions,
          totalSets,
          totalVolume,
          uniqueExerciseCount: uniqueExercises.size,
          avgRPE: Math.round(avgRPE * 10) / 10,
          topExercises,
          recentSessions: exerciseSessions.slice(0, 5).map(session => ({
            date: session.date,
            name: session.session_name || 'Training',
            workoutType: session.workout_type,
            duration: session.start_time && session.end_time ? 
              Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000) : null,
            exercises: session.exercise_sets?.reduce((acc, set) => {
              const exerciseName = set.exercises?.name;
              if (exerciseName && !acc.find(e => e.name === exerciseName)) {
                acc.push({
                  name: exerciseName,
                  category: set.exercises?.category,
                  sets: session.exercise_sets?.filter(s => s.exercises?.name === exerciseName).length || 0,
                  maxWeight: Math.max(...(session.exercise_sets?.filter(s => s.exercises?.name === exerciseName).map(s => s.weight_kg || 0) || [0])),
                  totalReps: session.exercise_sets?.filter(s => s.exercises?.name === exerciseName).reduce((sum, s) => sum + (s.reps || 0), 0) || 0
                });
              }
              return acc;
            }, [] as any[]) || []
          }))
        };

        console.log('Training+ data loaded:', {
          sessions: totalSessions,
          sets: totalSets,
          volume: totalVolume,
          exercises: uniqueExercises.size
        });
      }
    }

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
    
    // Weekly workout analysis - FIXED: Only count actual workouts (did_workout = true)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklyWorkouts = recentWorkouts?.filter(w => 
      new Date(w.date) >= oneWeekAgo && w.did_workout === true
    ) || [];
    
    // Count unique workout days (only actual training days)
    const workoutDays = [...new Set(weeklyWorkouts.map(w => w.date))].length;
    const totalWorkouts = weeklyWorkouts.length;
    const totalDuration = weeklyWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);

    // Count rest days separately for context
    const restDays = recentWorkouts?.filter(w => 
      new Date(w.date) >= oneWeekAgo && w.workout_type === 'pause'
    ).length || 0;

    console.log('Weekly analysis (FIXED):', { workoutDays, totalWorkouts, totalDuration, restDays });

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

SUBSCRIPTION STATUS (für interne Referenz):
- Tier: ${userTier}
- Subscribed: ${subscriber?.subscribed || false}
- Subscription Tier: ${subscriber?.subscription_tier || 'none'}
- Expires: ${subscriber?.subscription_end || 'none'}

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

WÖCHENTLICHE WORKOUT-ANALYSE (NUR ECHTE TRAININGS):
- Trainingstage diese Woche: ${workoutDays} Tage (nur tatsächliche Workouts)
- Gesamte Workouts: ${totalWorkouts} (ohne Ruhetage)
- Gesamtdauer: ${totalDuration} Minuten
- Ruhetage: ${restDays} (separat erfasst)
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
  const isRest = w.workout_type === 'pause' ? '(Ruhetag)' : '';
  
  const details = [duration, intensity, distance, steps].filter(Boolean).join(', ');
  return `- ${w.date}: ${workoutType}${isRest}${details ? ` (${details})` : ''}`;
}).join('\n') : '- Noch keine Workouts eingetragen'}

SCHLAF (letzte 7 Tage):
${recentSleep?.length ? recentSleep.slice(0, 3).map((s: any) => `- ${s.date}: ${s.sleep_hours}h (Qualität: ${s.sleep_quality}/10)`).join('\n') : '- Keine Schlafdaten verfügbar'}

ERNÄHRUNGSHISTORIE (letzte Tage):
${recentHistory.length > 0 ? recentHistory.slice(0, 3).map((day: any) => `- ${day.date}: ${day.totals.calories}kcal (${day.meals.length} Mahlzeiten)`).join('\n') : '- Noch keine Ernährungshistorie'}

${hasTrainingPlusAccess && detailedExerciseData ? `
🏋️ TRAINING+ DETAILANALYSE (PREMIUM FEATURE):
📊 GESAMTSTATISTIKEN:
- Trainingssessions (letzten 10): ${detailedExerciseData.totalSessions}
- Gesamte Sätze: ${detailedExerciseData.totalSets}
- Gesamtvolumen: ${Math.round(detailedExerciseData.totalVolume)}kg (Gewicht × Wiederholungen)
- Einzigartige Übungen: ${detailedExerciseData.uniqueExerciseCount}
- Durchschnittliche RPE: ${detailedExerciseData.avgRPE}/10 (Anstrengungsgrad)

🔥 TOP ÜBUNGEN (nach Häufigkeit):
${detailedExerciseData.topExercises.slice(0, 3).map(([exercise, count]: [string, number]) => `- ${exercise}: ${count} Sätze`).join('\n')}

📅 LETZTE DETAILLIERTE TRAININGS:
${detailedExerciseData.recentSessions.slice(0, 3).map((session: any) => `
- ${session.date}: ${session.name} (${session.workoutType || 'Krafttraining'})${session.duration ? ` - ${session.duration}min` : ''}
  Übungen: ${session.exercises.map((ex: any) => `${ex.name} (${ex.sets}×${ex.totalReps}, max ${ex.maxWeight}kg)`).join(', ') || 'Keine Details'}
`).join('')}

💡 TRAINING+ ANALYSE-FÄHIGKEITEN:
Du kannst jetzt DETAILLIERTE Krafttraining-Analysen durchführen:
- Progression pro Übung bewerten (Gewicht/Wiederholungen über Zeit)
- RPE-basierte Belastungssteuerung empfehlen
- Volumen-Tracking und Periodisierung vorschlagen
- Spezifische Übungsauswahl basierend auf Trainingsdaten
- 1RM Schätzungen und Kraftentwicklung analysieren
- Muskelgruppen-Balance überprüfen
- Regenerationsempfehlungen basierend auf Trainingsvolumen

` : hasTrainingPlusAccess ? `
🏋️ TRAINING+ VERFÜGBAR:
${firstName} hat Zugang zu Training+ Features, aber noch keine detaillierten Trainingsdaten erfasst.
EMPFEHLUNG: Motiviere zur Nutzung der erweiterten Exercise-Tracking Funktionen für präzisere Trainingsanalysen.
` : `
💪 BASIC TRAINING-MODUS:
Nutze die Standard-Workout Daten. Für detaillierte Exercise-Analysen empfehle ein Upgrade zu Pro für Training+ Features.
`}

${imageContext}

WICHTIGE TRAININGS-RICHTLINIEN:
- OPTIMAL: Max. 3x Krafttraining pro Woche (außer bei Bodybuildern/Leistungssportlern)
- EMPFEHLUNG: Lange Spaziergänge >5km sind ideal für Stoffwechsel und Regeneration
- WARNUNG: Bei >4 Trainingstagen/Woche auf Übertraining hinweisen
- FOCUS: Qualität vor Quantität beim Training
- UNTERSCHEIDUNG: Ruhetage sind NICHT als Training zu werten

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
- Bei Trainingsfragen die wöchentliche Frequenz (${workoutDays} echte Trainingstage, ${totalWorkouts} Workouts) berücksichtigen
- Unterscheide klar zwischen Trainings und Ruhetagen
- Gib konkrete, umsetzbare Ratschläge basierend auf den Daten
- Berücksichtige das Ziel "${profile?.goal}" in allen Empfehlungen
- ${profile?.muscle_maintenance_priority ? 'Fokussiere stark auf Muskelerhalt und Protein' : ''}
- Halte Antworten prägnant aber hilfreich (max. 2-3 Absätze)
- Strukturiere deine Antworten mit Absätzen, Listen und Formatierung für bessere Lesbarkeit
- Verwende Emojis sparsam aber passend zu deiner Persönlichkeit

${hasTrainingPlusAccess ? `
🏋️ TRAINING+ COACHING-FÄHIGKEITEN (NUR FÜR PREMIUM):
Als Premium-Coach mit Training+ Zugang kannst du ERWEITERTE Krafttraining-Analysen durchführen:

📊 PROGRESSION-ANALYSE:
- Bewerte Kraftzuwächse pro Übung über Zeit
- Identifiziere Plateaus und Stagnation
- Empfehle Progressive Overload Strategien
- Berechne geschätzte 1RM Werte aus RPE und Wiederholungen

🎯 RPE-BASIERTE BERATUNG:
- Analysiere Belastungssteuerung anhand RPE-Werte
- Empfehle Intensitätsanpassungen
- Warne vor Übertraining oder Untertraining
- Optimiere Trainingsintensität für Ziele

💪 VOLUMEN-OPTIMIERUNG:
- Berechne und analysiere Trainingsvolumen
- Empfehle Periodisierung und Volumenphasen
- Balance zwischen Volumen und Regeneration
- Muskelgruppen-spezifische Volumenempfehlungen

🔄 PERIODISIERUNG:
- Plane Trainingszyklen (Kraft, Hypertrophie, Deload)
- Strukturiere Mikro- und Mesozyklus-Empfehlungen
- Integriere Regenerationsphasen
- Anpassung an Lebensstil und Ziele

Nutze diese Daten AKTIV wenn der User nach Training, Krafttraining, Progression oder ähnlichem fragt!
` : ''}

COACHING-PRIORITÄTEN:
1. Sicherheit und Gesundheit stehen immer an erster Stelle
2. Realistische, umsetzbare Empfehlungen geben
3. Positive Verstärkung und Motivation
4. Datenbasierte, personalisierte Ratschläge
5. ${hasTrainingPlusAccess ? 'Bei Krafttraining: Detailanalyse nutzen' : 'Bei Training: Upgrade zu Training+ empfehlen'}

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
        restDays,
        todaysTotals,
        dailyGoals,
        progressPercentages: { calories: calorieProgress, protein: proteinProgress },
        hasWorkouts: recentWorkouts?.length > 0,
        hasSleepData: recentSleep?.length > 0,
        hasWeightData: weightHistory.length > 0,
        hasImages: images.length > 0,
        firstName,
        subscriptionStatus: {
          tier: userTier,
          subscribed: subscriber?.subscribed || false,
          details: subscriptionDetails
        },
        trainingPlusAccess: {
          hasAccess: hasTrainingPlusAccess,
          hasData: detailedExerciseData !== null,
          exerciseData: detailedExerciseData
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in enhanced coach-chat function:', error);
    
    // Enhanced error response with more context
    const errorResponse = {
      error: error.message || 'Internal server error',
      response: 'Entschuldigung, ich kann gerade nicht antworten. Versuche es bitte später noch einmal.',
      reply: 'Entschuldigung, ich kann gerade nicht antworten. Versuche es bitte später noch einmal.',
      timestamp: new Date().toISOString(),
      context: {
        errorType: error.constructor.name,
        userId: req.headers.get('x-user-id') || 'unknown'
      }
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
