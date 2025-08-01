import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FIX 1: Service-Role-Key + Early Abort für OpenAI
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // FIX 1: Early abort wenn OpenAI-Key fehlt
  if (!openAIApiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { 
      auth: { persistSession: false } 
    });
    
    const { userId, daysBack = 14, forceUpdate = false } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`🚀 Starting XL-Summary generation for user ${userId}, ${daysBack} days back`);

    const results = [];
    const today = new Date();

    // FIX 2: Chunk-Processing (3 Tage pro Batch um Timeouts zu vermeiden)
    const CHUNK_SIZE = 3;
    
    for (let offset = 0; offset < daysBack; offset += CHUNK_SIZE) {
      const chunkDays = Math.min(CHUNK_SIZE, daysBack - offset);
      console.log(`📦 Processing chunk: days ${offset} to ${offset + chunkDays - 1}`);
      
      // Verarbeite Chunk
      for (let i = offset; i < offset + chunkDays; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        console.log(`📅 Processing date: ${dateStr}`);

        try {
          // Prüfe ob Summary bereits existiert
          const { data: existingSummary } = await supabase
            .from('daily_summaries')
            .select('summary_xxl_md')
            .eq('user_id', userId)
            .eq('date', dateStr)
            .maybeSingle();

          if (existingSummary?.summary_xxl_md && !forceUpdate) {
            console.log(`⏭️ Summary for ${dateStr} already exists, skipping`);
            results.push({ date: dateStr, status: 'skipped', reason: 'already_exists' });
            continue;
          }

          // Sammle alle Daten für diesen Tag
          const dayData = await collectDayData(supabase, userId, dateStr);
          
          // Überspringe Tage ohne Daten
          const hasData = hasRelevantData(dayData);
          
          if (!hasData) {
            console.log(`⏭️ No relevant data for ${dateStr}, skipping`);
            results.push({ date: dateStr, status: 'skipped', reason: 'no_data' });
            continue;
          }

          // Berechne erweiterte KPIs
          const kpis = calculateKPIs(dayData);
          
          // Store KPIs in kpi_catalog
          await supabase.from('kpi_catalog').upsert({
            user_id: userId,
            date: dateStr,
            data: kpis
          });
          
          // FIX 3: Nur ein OpenAI-Call pro Tag (XXL), andere ableiten
          const { summary: xxlSummary, tokensUsed } = await generateSummary(kpis, dayData, 'xxl');
          
          // Kürzere Summaries lokal ableiten (verhindert zusätzliche API-Calls)
          const standardSummary = xxlSummary.split(' ').slice(0, 120).join(' ') + '...';
          const xlSummary = xxlSummary.split(' ').slice(0, 240).join(' ') + '...';
          
          console.log(`🪙 [TOKEN-TRACKING] Used ${tokensUsed} tokens for XXL summary`);
          
          // Credit-Deduction (1000 tokens = 1 credit)
          const TOKENS_PER_CREDIT = 1000;
          const creditsUsed = Math.ceil(tokensUsed / TOKENS_PER_CREDIT);
          
          if (creditsUsed > 0) {
            try {
              const { data: creditResult } = await supabase.rpc('deduct_credits', { 
                p_user_id: userId, 
                p_credits: creditsUsed 
              });
              console.log(`💳 [CREDIT-DEDUCTION] Deducted ${creditsUsed} credits, success: ${creditResult?.success}`);
            } catch (creditError) {
              console.warn(`⚠️ [CREDIT-WARNING] Could not deduct credits:`, creditError);
            }
          }
          
          // Track token spend for monitoring
          await supabase.from('daily_token_spend').upsert({
            user_id: userId,
            date: dateStr,
            tokens_spent: tokensUsed,
            credits_used: creditsUsed,
            operation_type: 'summary_generation'
          });

          // Speichere erweiterte Summaries in Datenbank
          await supabase.from('daily_summaries').upsert({
            user_id: userId,
            date: dateStr,
            total_calories: kpis.totalCalories,
            total_protein: kpis.totalProtein,
            total_carbs: kpis.totalCarbs,
            total_fats: kpis.totalFats,
            macro_distribution: kpis.macroDistribution,
            top_foods: kpis.topFoods,
            workout_volume: kpis.workoutVolume,
            workout_muscle_groups: kpis.workoutMuscleGroups,
            sleep_score: kpis.sleepScore,
            recovery_metrics: kpis.recoveryMetrics,
            summary_md: standardSummary,
            summary_xl_md: xlSummary,
            summary_xxl_md: xxlSummary,
            kpi_xxl_json: kpis,
            tokens_spent: tokensUsed
          });

          console.log(`✅ Generated summaries for ${dateStr}`);
          results.push({ 
            date: dateStr, 
            status: 'success',
            tokensUsed,
            creditsUsed
          });

        } catch (dayError) {
          console.error(`❌ Error processing ${dateStr}:`, dayError);
          results.push({ 
            date: dateStr, 
            status: 'error', 
            error: dayError.message 
          });
        }
      }
      
      // Kurze Pause zwischen Chunks
      if (offset + CHUNK_SIZE < daysBack) {
        console.log(`⏸️ Chunk completed, brief pause before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const skipCount = results.filter(r => r.status === 'skipped').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`🎯 Summary generation completed: ${successCount} created, ${skipCount} skipped, ${errorCount} errors`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_days: daysBack,
        created: successCount,
        skipped: skipCount,
        errors: errorCount
      },
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ XL-Summary generation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ============================================================================
// XL-DAILY-BLOCK 2.0: COMPREHENSIVE DATA COLLECTION
// ============================================================================

async function collectDayData(supabase: any, userId: string, date: string) {
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  // Erweiterte parallele Datenabfragen mit select(!inner) für bessere Performance
  const [
    mealsResult,
    exerciseSessionsResult,
    exerciseSetsResult,
    weightResult,
    bodyMeasurementsResult,
    supplementLogResult,
    sleepResult,
    fluidResult,
    coachConversationsResult,
    profileResult
  ] = await Promise.all([
    // 1. 🍽️ ERNÄHRUNG
    supabase
      .from('meals')
      .select('id, name, description, calories, protein, carbs, fats, fiber, sugar, meal_type, created_at')
      .eq('user_id', userId)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)
      .order('created_at', { ascending: true }),
    
    // 2. 💪 TRAINING SESSIONS
    supabase
      .from('exercise_sessions')
      .select('id, session_name, workout_type, duration_minutes, overall_rpe, notes, start_time, end_time, date')
      .eq('user_id', userId)
      .eq('date', date),
    
    // 3. 🏋️ EXERCISE SETS (mit gezielten Feldern)
    supabase
      .from('exercise_sets')
      .select(`
        exercise_id, weight_kg, reps, rpe, duration_seconds, rest_seconds, set_number, created_at,
        exercises!inner(name, muscle_groups, category, equipment, is_compound)
      `)
      .eq('user_id', userId)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)
      .order('created_at', { ascending: true }),
    
    // 4. ⚖️ GEWICHT & KÖRPERFETT
    supabase
      .from('weight_history')
      .select('weight, body_fat_percentage, muscle_mass_percentage, visceral_fat, body_water_percentage, created_at')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(1),
    
    // 5. 📏 KÖRPERMASSE
    supabase
      .from('body_measurements')
      .select('chest, waist, belly, hips, thigh, arms, neck, created_at')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(1),
    
    // 6. 💊 SUPPLEMENTE
    supabase
      .from('supplement_intake_log')
      .select(`
        supplement_id, dosage, taken, timing, created_at,
        food_supplements!inner(name, category, dosage_unit)
      `)
      .eq('user_id', userId)
      .eq('date', date),
    
    // 7. 😴 SCHLAF-TRACKING
    supabase
      .from('sleep_tracking')
      .select('hours_slept, sleep_quality, sleep_score, interruptions, mood_after_sleep, libido_level, recovery_feeling')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(1),
    
    // 8. 💧 HYDRATION-TRACKING
    supabase
      .from('user_fluids')
      .select(`
        amount_ml, created_at,
        fluid_database!inner(name, category, calories_per_100ml, caffeine_mg_per_100ml, alcohol_percentage)
      `)
      .eq('user_id', userId)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)
      .order('created_at', { ascending: true }),
    
    // 9. 🧠 COACH-GESPRÄCHE
    supabase
      .from('coach_conversations')
      .select('message_content, message_role, coach_personality, created_at')
      .eq('user_id', userId)
      .eq('conversation_date', date)
      .order('created_at', { ascending: true }),
    
    // 10. 👤 USER-PROFIL
    supabase
      .from('profiles')
      .select('preferred_name, age, gender, height_cm, activity_level, goal_type')
      .eq('id', userId)
      .maybeSingle()
  ]);

  return {
    date,
    meals: mealsResult?.data || [],
    workouts: exerciseSessionsResult?.data || [],
    exerciseSets: exerciseSetsResult?.data || [],
    weight: weightResult?.data?.[0] || null,
    bodyMeasurements: bodyMeasurementsResult?.data?.[0] || null,
    supplementLog: supplementLogResult?.data || [],
    sleep: sleepResult?.data?.[0] || null,
    fluids: fluidResult?.data || [],
    coachConversations: coachConversationsResult?.data || [],
    profile: profileResult?.data || null,
    dataCollectionTimestamp: new Date().toISOString()
  };
}

// ============================================================================
// XL-DAILY-BLOCK 2.0: ADVANCED KPI CALCULATION ENGINE
// ============================================================================

function calculateKPIs(dayData: any) {
  const kpis: any = {
    // BASIS-ERNÄHRUNG
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFats: 0,
    totalFiber: 0,
    totalSugar: 0,
    macroDistribution: {},
    topFoods: [],
    mealTiming: [],
    
    // BASIS-TRAINING
    workoutVolume: 0,
    workoutMuscleGroups: [],
    workoutDuration: 0,
    avgRPE: 0,
    totalSets: 0,
    exerciseTypes: [],
    
    // KÖRPERKOMPOSITION
    weight: null,
    bodyFatPercentage: null,
    muscleMassPercentage: null,
    bodyWaterPercentage: null,
    visceralFat: null,
    bodyMeasurements: {},
    
    // RECOVERY & SCHLAF
    sleepScore: null,
    sleepHours: null,
    sleepQuality: null,
    libidoLevel: null,
    recoveryFeeling: null,
    recoveryMetrics: {},
    
    // HYDRATION & SUPPLEMENTE
    totalFluidMl: 0,
    caffeineMg: 0,
    alcoholG: 0,
    hydrationScore: 0,
    supplementCompliance: 0,
    supplementsMissed: 0,
    
    // MENTAL STATE & COACHING
    coachSentiment: 'neutral',
    motivationLevel: 'unknown',
    stressIndicators: [],
    successMoments: [],
    struggles: [],
    
    // KORRELATIONEN & TRENDS
    performanceCorrelations: {},
    dailyFlags: []
  };

  // 1. 🍽️ ERNÄHRUNGS-ANALYSE (mit Guard für Division durch 0)
  if (dayData.meals && dayData.meals.length > 0) {
    let mealTimeDistribution: any = {};
    
    dayData.meals.forEach((meal: any) => {
      kpis.totalCalories += meal.calories || 0;
      kpis.totalProtein += meal.protein || 0;
      kpis.totalCarbs += meal.carbs || 0;
      kpis.totalFats += meal.fats || 0;
      kpis.totalFiber += meal.fiber || 0;
      kpis.totalSugar += meal.sugar || 0;
      
      const mealHour = new Date(meal.created_at).getHours();
      mealTimeDistribution[mealHour] = (mealTimeDistribution[mealHour] || 0) + 1;
    });

    // FIX 4: Guard für Makro-Verteilung (verhindert Division durch 0)
    if (kpis.totalCalories > 0) {
      kpis.macroDistribution = {
        protein_percent: Math.round((kpis.totalProtein * 4 / kpis.totalCalories) * 100),
        carbs_percent: Math.round((kpis.totalCarbs * 4 / kpis.totalCalories) * 100),
        fats_percent: Math.round((kpis.totalFats * 9 / kpis.totalCalories) * 100)
      };
    }

    // Top Lebensmittel
    const foodCounts: any = {};
    dayData.meals.forEach((meal: any) => {
      const food = meal.name || meal.description || 'Unbekannt';
      foodCounts[food] = (foodCounts[food] || 0) + 1;
    });
    
    kpis.topFoods = Object.entries(foodCounts)
      .sort(([,a]: any, [,b]: any) => b - a)
      .slice(0, 5)
      .map(([food, count]) => ({ food, count }));
      
    kpis.mealTiming = Object.entries(mealTimeDistribution)
      .map(([hour, count]) => ({ hour: parseInt(hour), meals: count }))
      .sort((a, b) => a.hour - b.hour);
  }

  // 2. 💪 TRAINING-ANALYSE
  if (dayData.workouts && dayData.workouts.length > 0) {
    let totalRPE = 0;
    let rpeCount = 0;
    
    kpis.workoutDuration = dayData.workouts.reduce((total: number, workout: any) => {
      if (workout.overall_rpe) {
        totalRPE += workout.overall_rpe;
        rpeCount++;
      }
      return total + (workout.duration_minutes || 0);
    }, 0);
    
    kpis.avgRPE = rpeCount > 0 ? Math.round((totalRPE / rpeCount) * 10) / 10 : 0;

    if (dayData.exerciseSets && dayData.exerciseSets.length > 0) {
      kpis.totalSets = dayData.exerciseSets.length;
      
      kpis.workoutVolume = dayData.exerciseSets.reduce((total: number, set: any) => {
        const volume = (set.reps || 0) * (set.weight_kg || 0);
        return total + volume;
      }, 0);

      const muscleGroups = new Set();
      const exerciseTypes = new Set();
      
      dayData.exerciseSets.forEach((set: any) => {
        if (set.exercises?.muscle_groups) {
          set.exercises.muscle_groups.forEach((mg: string) => muscleGroups.add(mg));
        }
        if (set.exercises?.category) {
          exerciseTypes.add(set.exercises.category);
        }
      });
      
      kpis.workoutMuscleGroups = Array.from(muscleGroups);
      kpis.exerciseTypes = Array.from(exerciseTypes);
    }
  }

  // 3. ⚖️ KÖRPERKOMPOSITION
  if (dayData.weight) {
    kpis.weight = dayData.weight.weight;
    kpis.bodyFatPercentage = dayData.weight.body_fat_percentage;
    kpis.muscleMassPercentage = dayData.weight.muscle_mass_percentage;
    kpis.bodyWaterPercentage = dayData.weight.body_water_percentage;
    kpis.visceralFat = dayData.weight.visceral_fat;
  }

  if (dayData.bodyMeasurements) {
    kpis.bodyMeasurements = dayData.bodyMeasurements;
  }

  // 4. 😴 RECOVERY & SCHLAF
  if (dayData.sleep) {
    kpis.sleepScore = dayData.sleep.sleep_score;
    kpis.sleepHours = dayData.sleep.hours_slept;
    kpis.sleepQuality = dayData.sleep.sleep_quality;
    kpis.libidoLevel = dayData.sleep.libido_level;
    kpis.recoveryFeeling = dayData.sleep.recovery_feeling;
    
    kpis.recoveryMetrics = {
      sleep_interruptions: dayData.sleep.interruptions,
      mood_after_sleep: dayData.sleep.mood_after_sleep,
      sleep_efficiency: dayData.sleep.hours_slept && dayData.sleep.hours_slept >= 7 ? 'good' : 'needs_improvement'
    };
  }

  // 5. 💧 HYDRATION & SUPPLEMENTE
  if (dayData.fluids && dayData.fluids.length > 0) {
    dayData.fluids.forEach((fluid: any) => {
      kpis.totalFluidMl += fluid.amount_ml || 0;
      
      if (fluid.fluid_database) {
        const caffeine = (fluid.fluid_database.caffeine_mg_per_100ml || 0) * (fluid.amount_ml / 100);
        const alcohol = (fluid.fluid_database.alcohol_percentage || 0) * (fluid.amount_ml / 100) * 0.8; // g Alkohol
        
        kpis.caffeineMg += caffeine;
        kpis.alcoholG += alcohol;
      }
    });
    
    // Hydration-Score (ml/kg Körpergewicht, Target: 35ml/kg)
    if (kpis.weight && kpis.weight > 0) {
      const mlPerKg = kpis.totalFluidMl / kpis.weight;
      kpis.hydrationScore = Math.min(100, Math.round((mlPerKg / 35) * 100));
    }
  }

  if (dayData.supplementLog && dayData.supplementLog.length > 0) {
    const takenCount = dayData.supplementLog.filter((sup: any) => sup.taken).length;
    kpis.supplementCompliance = Math.round((takenCount / dayData.supplementLog.length) * 100);
    kpis.supplementsMissed = dayData.supplementLog.length - takenCount;
  }

  // 6. 🧠 COACH-GESPRÄCHE & SENTIMENT
  if (dayData.coachConversations && dayData.coachConversations.length > 0) {
    const userMessages = dayData.coachConversations.filter((msg: any) => msg.message_role === 'user');
    
    // Einfache Sentiment-Analyse
    let positiveWords = 0;
    let negativeWords = 0;
    
    const positiveKeywords = ['gut', 'super', 'toll', 'perfekt', 'motiviert', 'stark', 'erfolg', 'schaffe'];
    const negativeKeywords = ['schlecht', 'müde', 'stress', 'schwer', 'problem', 'schwierig', 'unmotiviert'];
    
    userMessages.forEach((msg: any) => {
      const content = msg.message_content.toLowerCase();
      positiveKeywords.forEach(word => {
        if (content.includes(word)) positiveWords++;
      });
      negativeKeywords.forEach(word => {
        if (content.includes(word)) negativeWords++;
      });
    });
    
    if (positiveWords > negativeWords) {
      kpis.coachSentiment = 'positive';
      kpis.motivationLevel = 'high';
    } else if (negativeWords > positiveWords) {
      kpis.coachSentiment = 'negative';
      kpis.motivationLevel = 'low';
    } else {
      kpis.coachSentiment = 'neutral';
      kpis.motivationLevel = 'moderate';
    }
  }

  // 7. 🚩 DAILY FLAGS
  if (kpis.totalCalories > 0 && kpis.totalCalories < 1200) kpis.dailyFlags.push('very_low_calories');
  if (kpis.totalProtein > 0 && kpis.weight && (kpis.totalProtein / kpis.weight) < 1.2) kpis.dailyFlags.push('low_protein');
  if (kpis.workoutVolume > 5000) kpis.dailyFlags.push('high_volume_training');
  if (kpis.sleepHours && kpis.sleepHours < 6) kpis.dailyFlags.push('insufficient_sleep');
  if (kpis.hydrationScore && kpis.hydrationScore < 60) kpis.dailyFlags.push('dehydrated');
  if (kpis.avgRPE > 8) kpis.dailyFlags.push('high_intensity_training');

  return kpis;
}

function hasRelevantData(dayData: any): boolean {
  return (
    (dayData.meals && dayData.meals.length > 0) ||
    (dayData.workouts && dayData.workouts.length > 0) ||
    (dayData.exerciseSets && dayData.exerciseSets.length > 0) ||
    dayData.weight ||
    dayData.bodyMeasurements ||
    (dayData.supplementLog && dayData.supplementLog.length > 0) ||
    dayData.sleep ||
    (dayData.fluids && dayData.fluids.length > 0)
  );
}

async function generateSummary(kpis: any, dayData: any, summaryType: 'standard' | 'xl' | 'xxl') {
  const prompts = {
    standard: {
      maxTokens: 160,
      wordTarget: '120 deutsche Wörter',
      instruction: 'Kurze, fokussierte Tagesübersicht mit den wichtigsten Makros, Training und einer Empfehlung.'
    },
    xl: {
      maxTokens: 320,
      wordTarget: '240 deutsche Wörter', 
      instruction: 'Detailliertere Analyse mit Ernährung, Training, Körperdaten und 2-3 spezifischen Handlungsempfehlungen.'
    },
    xxl: {
      maxTokens: 900,
      wordTarget: '700 deutsche Wörter',
      instruction: 'Umfassende wissenschaftliche Analyse mit allen Bereichen, Korrelationen und detaillierten Empfehlungen.'
    }
  };

  const config = prompts[summaryType];
  const userName = dayData.profile?.preferred_name || 'Athlet';

  const systemPrompt = summaryType === 'xxl' ? `
Erstelle eine FACHLICHE Tageszusammenfassung in exakt ${config.wordTarget}. 

Struktur für XXL-Summary:
1. 🍽️ Ernährung (Makros, Top-Foods, Timing, Kalorienbilanz)
2. 💪 Training (Volumen, Highlights, RPE, Muskel-Fokus) 
3. ⚖️ Körper & Maße (Gewicht, KFA, Messungen, Trend)
4. 😴 Regeneration (Schlaf, HRV, Libido, Mood)
5. 💧 Hydration & Supplemente (Flüssigkeit, Koffein/Alkohol, Compliance)
6. 🔗 Korrelationen & Insights (Schlaf ↔ Leistung, etc.)
7. 📌 Handlungsempfehlungen (max 4 konkrete Punkte)

Sprich ${userName} direkt an. Maximal 2 Emojis pro Abschnitt. Wissenschaftlich fundiert aber verständlich.
` : `
Fasse die Tagesdaten von ${userName} in ${config.wordTarget} zusammen.
${config.instruction}
Nutze die wichtigsten KPIs und gib konkrete, umsetzbare Empfehlungen.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(kpis) }
        ],
        max_tokens: config.maxTokens,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices[0].message.content;
    const tokensUsed = data.usage?.total_tokens || 0;

    return { summary, tokensUsed };

  } catch (error) {
    console.error(`Error generating ${summaryType} summary:`, error);
    throw error;
  }
}