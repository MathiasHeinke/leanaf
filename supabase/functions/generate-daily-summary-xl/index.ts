import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { userId, daysBack = 14, forceUpdate = false } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`🚀 Starting XL-Summary generation for user ${userId}, ${daysBack} days back`);

    const results = [];
    const today = new Date();

    // Verarbeite jeden Tag der letzten X Tage
    for (let i = 0; i < daysBack; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      console.log(`📅 Processing date: ${dateStr}`);

      try {
        // Prüfe ob Summary bereits existiert
        const { data: existingSummary } = await supabase
          .from('daily_summaries')
          .select('summary_xl_md')
          .eq('user_id', userId)
          .eq('date', dateStr)
          .single();

        if (existingSummary?.summary_xl_md && !forceUpdate) {
          console.log(`⏭️ Summary for ${dateStr} already exists, skipping`);
          results.push({ date: dateStr, status: 'skipped', reason: 'already_exists' });
          continue;
        }

        // Sammle alle Daten für diesen Tag
        console.log(`🔍 Starting data collection for ${dateStr}...`);
        const dayData = await collectDayData(supabase, userId, dateStr);
        
        // Debug: Zeige gesammelte Daten
        console.log(`🔍 Collected data for ${dateStr}:`, {
          meals: dayData.meals?.length || 0,
          workouts: dayData.workouts?.length || 0,
          weight: !!dayData.weight,
          measurements: !!dayData.bodyMeasurements,
          supplements: dayData.supplementLog?.length || 0
        });
        
        // Überspringe Tage ohne Daten
        const hasData = hasRelevantData(dayData);
        console.log(`🔍 Has relevant data for ${dateStr}: ${hasData}`);
        
        if (!hasData) {
          console.log(`⏭️ No relevant data for ${dateStr}, skipping`);
          results.push({ date: dateStr, status: 'skipped', reason: 'no_data' });
          continue;
        }

        // ============================================================================
        // XL-DAILY-BLOCK 2.0: TRIPLE-SUMMARY GENERATION
        // ============================================================================
        
        // Berechne erweiterte KPIs
        const kpis = calculateKPIs(dayData);
        
        // Store KPIs in kpi_catalog
        await supabase.from('kpi_catalog').upsert({
          user_id: userId,
          date: dateStr,
          data: kpis
        });
        
        // Generiere Standard Summary (120 Wörter)
        const { summary: standardSummary, tokensUsed: standardTokens } = await generateSummary(kpis, dayData, 'standard');
        
        // Generiere XL Summary (240 Wörter)
        const { summary: xlSummary, tokensUsed: xlTokens } = await generateSummary(kpis, dayData, 'xl');
        
        // 🚀 XL-DAILY-BLOCK 2.0: Generiere XXL Summary (700 Wörter)
        const { summary: xxlSummary, tokensUsed: xxlTokens } = await generateSummary(kpis, dayData, 'xxl');
        
        const totalTokensUsed = standardTokens + xlTokens + xxlTokens;
        console.log(`🪙 [TOKEN-TRACKING] Used ${totalTokensUsed} tokens (standard: ${standardTokens}, xl: ${xlTokens}, xxl: ${xxlTokens})`);
        
        // Credit-Deduction (1000 tokens = 1 credit)
        const TOKENS_PER_CREDIT = 1000;
        const creditsUsed = Math.ceil(totalTokensUsed / TOKENS_PER_CREDIT);
        
        if (creditsUsed > 0) {
          try {
            const { data: creditResult } = await supabase.rpc('deduct_credits', { 
              p_user_id: userId, 
              p_credits: creditsUsed 
            });
            console.log(`💳 [CREDIT-DEDUCTION] Deducted ${creditsUsed} credits, remaining: ${creditResult?.credits_remaining || 'unknown'}`);
          } catch (creditError) {
            console.warn(`⚠️ [CREDIT-WARNING] Could not deduct credits:`, creditError);
          }
        }
        
        // Track token spend for monitoring
        await supabase.from('daily_token_spend').upsert({
          user_id: userId,
          date: dateStr,
          tokens_spent: totalTokensUsed,
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
          tokens_spent: totalTokensUsed
        });

        console.log(`✅ Generated summaries for ${dateStr}`);
        results.push({ 
          date: dateStr, 
          status: 'success',
          kpis,
          summary_length: xlSummary.length
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
// DATA COLLECTION
// ============================================================================

// ============================================================================
// XL-DAILY-BLOCK 2.0: COMPREHENSIVE DATA COLLECTION
// ============================================================================

async function collectDayData(supabase: any, userId: string, date: string) {
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  console.log(`🚀 [XL-DATA-COLLECTION 2.0] Starting comprehensive data collection for ${date}`);

  // Erweiterte parallele Datenabfragen für maximale Performance
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
    // 1. 🍽️ ERNÄHRUNG (erweitert)
    supabase
      .from('meals')
      .select('id, name, description, calories, protein, carbs, fats, fiber, sugar, meal_type, created_at, photo_url')
      .eq('user_id', userId)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)
      .order('created_at', { ascending: true }),
    
    // 2. 💪 TRAINING SESSIONS (korrigiert: exercise_sessions)
    supabase
      .from('exercise_sessions')
      .select('id, session_name, workout_type, duration_minutes, overall_rpe, notes, start_time, end_time, date')
      .eq('user_id', userId)
      .eq('date', date),
    
    // 3. 🏋️ EXERCISE SETS (erweitert mit Muskelgruppen & Equipment)
    supabase
      .from('exercise_sets')
      .select(`
        exercise_id, weight_kg, reps, rpe, duration_seconds, distance_m, rest_seconds, notes, created_at, set_number,
        exercises(name, muscle_groups, category, equipment, is_compound, difficulty_level)
      `)
      .eq('user_id', userId)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)
      .order('created_at', { ascending: true }),
    
    // 4. ⚖️ GEWICHT & KÖRPERFETT (alle verfügbaren Biomarker)
    supabase
      .from('weight_history')
      .select('weight, body_fat_percentage, muscle_mass_percentage, visceral_fat, bone_mass, body_water_percentage, created_at')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(1),
    
    // 5. 📏 KÖRPERMASSE (komplett: alle 7 Körperteile)
    supabase
      .from('body_measurements')
      .select('chest, waist, belly, hips, thigh, arms, neck, photo_url, notes, created_at')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(1),
    
    // 6. 💊 SUPPLEMENTE (erweitert mit Kategorien)
    supabase
      .from('supplement_intake_log')
      .select(`
        supplement_id, dosage, taken, timing, notes, created_at,
        food_supplements(name, category, dosage_unit, description)
      `)
      .eq('user_id', userId)
      .eq('date', date),
    
    // 7. 😴 SCHLAF-TRACKING (NEU für Recovery-Score)
    supabase
      .from('sleep_tracking')
      .select('hours_slept, sleep_quality, bedtime, wake_time, sleep_score, interruptions, notes, mood_after_sleep, libido_level, recovery_feeling')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(1),
    
    // 8. 💧 HYDRATION-TRACKING (NEU für Flüssigkeitsbilanz)
    supabase
      .from('user_fluids')
      .select(`
        amount_ml, fluid_id, created_at,
        fluid_database(name, category, calories_per_100ml, caffeine_mg_per_100ml, alcohol_percentage)
      `)
      .eq('user_id', userId)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)
      .order('created_at', { ascending: true }),
    
    // 9. 🧠 COACH-GESPRÄCHE (NEU für Sentiment-Analyse)
    supabase
      .from('coach_conversations')
      .select('message_content, message_role, coach_personality, context_data, created_at')
      .eq('user_id', userId)
      .eq('conversation_date', date)
      .order('created_at', { ascending: true }),
    
    // 10. 👤 USER-PROFIL (für Personalisierung)
    supabase
      .from('profiles')
      .select('preferred_name, age, gender, height_cm, activity_level, goal_type')
      .eq('id', userId)
      .single()
  ]);

  // Data-Assembly mit Error-Handling
  const data = {
    // Basis-Daten
    date,
    meals: mealsResult?.data || [],
    workouts: exerciseSessionsResult?.data || [],
    exerciseSets: exerciseSetsResult?.data || [],
    weight: weightResult?.data || null,
    bodyMeasurements: bodyMeasurementsResult?.data || null,
    supplementLog: supplementLogResult?.data || [],
    
    // XL-Block 2.0: Neue Datenquellen
    sleep: sleepResult?.data || null,
    fluids: fluidResult?.data || [],
    coachConversations: coachConversationsResult?.data || [],
    profile: profileResult?.data || null,
    
    // Meta-Info
    dataCollectionTimestamp: new Date().toISOString()
  };

  // Comprehensive Debug-Logging
  console.log(`📊 [XL-DATA-COLLECTED]`, {
    meals: data.meals.length,
    workouts: data.workouts.length,
    exerciseSets: data.exerciseSets.length,
    weight: !!data.weight,
    bodyMeasurements: !!data.bodyMeasurements,
    supplements: data.supplementLog.length,
    sleep: !!data.sleep,
    fluids: data.fluids.length,
    coachMessages: data.coachConversations.length,
    profile: !!data.profile
  });

  return data;
}

// ============================================================================
// KPI CALCULATION
// ============================================================================

// ============================================================================
// XL-DAILY-BLOCK 2.0: ADVANCED KPI CALCULATION ENGINE
// ============================================================================

function calculateKPIs(dayData: any) {
  console.log(`🧮 [XL-KPI-CALCULATION] Starting comprehensive KPI analysis...`);

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
    
    // KÖRPERKOMPOSITION (XL-BLOCK 2.0)
    weight: null,
    bodyFatPercentage: null,
    muscleMassPercentage: null,
    bodyWaterPercentage: null,
    visceralFat: null,
    bodyMeasurements: {},
    
    // RECOVERY & SCHLAF (XL-BLOCK 2.0)
    sleepScore: null,
    sleepHours: null,
    sleepQuality: null,
    libidoLevel: null,
    recoveryFeeling: null,
    recoveryMetrics: {},
    
    // HYDRATION & SUPPLEMENTE (XL-BLOCK 2.0)
    totalFluidMl: 0,
    caffeineMg: 0,
    alcoholG: 0,
    hydrationScore: 0,
    supplementCompliance: 0,
    supplementsMissed: 0,
    
    // MENTAL STATE & COACHING (XL-BLOCK 2.0)
    coachSentiment: 'neutral',
    motivationLevel: 'unknown',
    stressIndicators: [],
    successMoments: [],
    struggles: [],
    
    // KORRELATIONEN & TRENDS (XL-BLOCK 2.0)
    performanceCorrelations: {},
    dailyFlags: []
  };

  // 1. 🍽️ ERWEITERTE ERNÄHRUNGS-ANALYSE
  if (dayData.meals && dayData.meals.length > 0) {
    let mealTimeDistribution: any = {};
    
    dayData.meals.forEach((meal: any) => {
      kpis.totalCalories += meal.calories || 0;
      kpis.totalProtein += meal.protein || 0;
      kpis.totalCarbs += meal.carbs || 0;
      kpis.totalFats += meal.fats || 0;
      kpis.totalFiber += meal.fiber || 0;
      kpis.totalSugar += meal.sugar || 0;
      
      // Meal-Timing-Analyse
      const mealHour = new Date(meal.created_at).getHours();
      mealTimeDistribution[mealHour] = (mealTimeDistribution[mealHour] || 0) + 1;
    });

    // Makro-Verteilung (Kalorien-basiert)
    if (kpis.totalCalories > 0) {
      kpis.macroDistribution = {
        protein_percent: Math.round((kpis.totalProtein * 4 / kpis.totalCalories) * 100),
        carbs_percent: Math.round((kpis.totalCarbs * 4 / kpis.totalCalories) * 100),
        fats_percent: Math.round((kpis.totalFats * 9 / kpis.totalCalories) * 100)
      };
    }

    // Top Lebensmittel & Meal-Timing
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

  // 2. 💪 ERWEITERTE TRAINING-ANALYSE
  if (dayData.workouts && dayData.workouts.length > 0) {
    let totalRPE = 0;
    let rpeCount = 0;
    
    // Workout-Basis-KPIs
    kpis.workoutDuration = dayData.workouts.reduce((total: number, workout: any) => {
      if (workout.overall_rpe) {
        totalRPE += workout.overall_rpe;
        rpeCount++;
      }
      return total + (workout.duration_minutes || 0);
    }, 0);
    
    kpis.avgRPE = rpeCount > 0 ? Math.round((totalRPE / rpeCount) * 10) / 10 : 0;

    // Exercise Sets Analyse
    if (dayData.exerciseSets && dayData.exerciseSets.length > 0) {
      kpis.totalSets = dayData.exerciseSets.length;
      
      // Trainingsvolumen (kg)
      kpis.workoutVolume = dayData.exerciseSets.reduce((total: number, set: any) => {
        const volume = (set.reps || 0) * (set.weight_kg || 0);
        return total + volume;
      }, 0);

      // Muskelgruppen & Exercise-Types
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

  // 3. ⚖️ KÖRPERKOMPOSITION & BIOMETRICS (XL-BLOCK 2.0)
  if (dayData.weight) {
    kpis.weight = dayData.weight.weight;
    kpis.bodyFatPercentage = dayData.weight.body_fat_percentage;
    kpis.muscleMassPercentage = dayData.weight.muscle_mass_percentage;
    kpis.bodyWaterPercentage = dayData.weight.body_water_percentage;
    kpis.visceralFat = dayData.weight.visceral_fat;
  }

  if (dayData.bodyMeasurements) {
    kpis.bodyMeasurements = {
      chest: dayData.bodyMeasurements.chest,
      waist: dayData.bodyMeasurements.waist,
      belly: dayData.bodyMeasurements.belly,
      hips: dayData.bodyMeasurements.hips,
      thigh: dayData.bodyMeasurements.thigh,
      arms: dayData.bodyMeasurements.arms,
      neck: dayData.bodyMeasurements.neck
    };
  }

  // 4. 😴 SLEEP & RECOVERY (XL-BLOCK 2.0)
  if (dayData.sleep) {
    kpis.sleepHours = dayData.sleep.hours_slept;
    kpis.sleepQuality = dayData.sleep.sleep_quality;
    kpis.sleepScore = dayData.sleep.sleep_score;
    kpis.libidoLevel = dayData.sleep.libido_level;
    kpis.recoveryFeeling = dayData.sleep.recovery_feeling;
    
    // Recovery-Score (composite)
    const recoveryFactors = [
      dayData.sleep.sleep_quality || 5,
      dayData.sleep.libido_level || 5,
      (10 - (dayData.sleep.interruptions || 0)),
      dayData.sleep.recovery_feeling || 5
    ];
    kpis.recoveryMetrics = {
      sleepQuality: dayData.sleep.sleep_quality,
      libido: dayData.sleep.libido_level,
      interruptions: dayData.sleep.interruptions,
      overallRecovery: Math.round(recoveryFactors.reduce((a, b) => a + b, 0) / recoveryFactors.length * 10) / 10
    };
  }

  // 5. 💧 HYDRATION & SUPPLEMENTS (XL-BLOCK 2.0)
  if (dayData.fluids && dayData.fluids.length > 0) {
    dayData.fluids.forEach((fluid: any) => {
      kpis.totalFluidMl += fluid.amount_ml || 0;
      
      if (fluid.fluid_database?.caffeine_mg_per_100ml) {
        kpis.caffeineMg += (fluid.amount_ml / 100) * fluid.fluid_database.caffeine_mg_per_100ml;
      }
      
      if (fluid.fluid_database?.alcohol_percentage) {
        kpis.alcoholG += (fluid.amount_ml * fluid.fluid_database.alcohol_percentage * 0.8) / 100;
      }
    });
    
    // Hydration-Score (2-3L Ziel)
    kpis.hydrationScore = Math.min(100, Math.round((kpis.totalFluidMl / 2500) * 100));
  }

  if (dayData.supplementLog && dayData.supplementLog.length > 0) {
    const totalSupplements = dayData.supplementLog.length;
    const takenSupplements = dayData.supplementLog.filter((s: any) => s.taken).length;
    kpis.supplementCompliance = Math.round((takenSupplements / totalSupplements) * 100);
    kpis.supplementsMissed = totalSupplements - takenSupplements;
  }

  // 6. 🧠 COACH-SENTIMENT & MENTAL STATE (XL-BLOCK 2.0)
  if (dayData.coachConversations && dayData.coachConversations.length > 0) {
    const userMessages = dayData.coachConversations.filter((msg: any) => msg.message_role === 'user');
    
    // Einfache Sentiment-Analyse basierend auf Keywords
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    
    const positiveKeywords = ['gut', 'super', 'toll', 'motiviert', 'stark', 'erfolg', 'schaffe', 'freue'];
    const negativeKeywords = ['müde', 'schwer', 'stress', 'problem', 'schaffe nicht', 'demotiviert', 'schlecht'];
    
    userMessages.forEach((msg: any) => {
      const content = msg.message_content.toLowerCase();
      const hasPositive = positiveKeywords.some(word => content.includes(word));
      const hasNegative = negativeKeywords.some(word => content.includes(word));
      
      if (hasPositive && !hasNegative) positiveCount++;
      else if (hasNegative && !hasPositive) negativeCount++;
      else neutralCount++;
    });
    
    if (positiveCount > negativeCount) kpis.coachSentiment = 'positive';
    else if (negativeCount > positiveCount) kpis.coachSentiment = 'negative';
    else kpis.coachSentiment = 'neutral';
    
    kpis.motivationLevel = positiveCount > 0 ? 'high' : negativeCount > 0 ? 'low' : 'medium';
  }

  // 7. 🚩 DAILY FLAGS & CORRELATIONS (XL-BLOCK 2.0)
  const flags = [];
  
  if (kpis.totalCalories > 0) {
    if (kpis.totalCalories < 1200) flags.push('low_calories');
    if (kpis.totalCalories > 3500) flags.push('high_calories');
    if (kpis.totalProtein < 50) flags.push('low_protein');
    if (kpis.macroDistribution.protein_percent < 15) flags.push('insufficient_protein_ratio');
  }
  
  if (kpis.workoutVolume > 5000) flags.push('high_volume_training');
  if (kpis.avgRPE > 8) flags.push('high_intensity_training');
  if (kpis.sleepHours && kpis.sleepHours < 6) flags.push('sleep_deprivation');
  if (kpis.hydrationScore < 50) flags.push('dehydration_risk');
  if (kpis.supplementCompliance < 70) flags.push('poor_supplement_compliance');
  
  kpis.dailyFlags = flags;

  console.log(`🧮 [XL-KPI-COMPLETED] Generated ${Object.keys(kpis).length} KPI metrics with ${flags.length} flags`);
  
  return kpis;
}

// ============================================================================
// SUMMARY GENERATION
// ============================================================================

// ============================================================================
// XL-DAILY-BLOCK 2.0: TRIPLE-SUMMARY GENERATION ENGINE (120W/240W/700W)
// ============================================================================

async function generateSummary(kpis: any, dayData: any, type: 'standard' | 'xl' | 'xxl'): Promise<{ summary: string, tokensUsed: number }> {
  console.log(`🤖 [SUMMARY-GENERATION] Starting ${type.toUpperCase()} summary generation...`);

  // Token & Word Limits für jeden Typ
  const summaryConfig = {
    standard: { maxWords: 120, maxTokens: 150, model: 'gpt-4o-mini' },
    xl: { maxWords: 240, maxTokens: 320, model: 'gpt-4o' },
    xxl: { maxWords: 700, maxTokens: 900, model: 'gpt-4o' } // XL-DAILY-BLOCK 2.0
  };

  const config = summaryConfig[type] || summaryConfig.standard;
  const userName = dayData.profile?.preferred_name || 'Athlet';

  // ============================================================================
  // XXL-BLOCK 2.0: 700-WÖRTER WISSENSCHAFTLICHE SUMMARY
  // ============================================================================
  
  let systemPrompt: string;
  let userData: string;

  if (type === 'xxl') {
    systemPrompt = `Du bist ein wissenschaftlicher Fitness- und Ernährungscoach. Erstelle eine DETAILLIERTE, fachliche Tagesanalyse in ≤700 deutschen Wörtern.

STRUKTUR (EXAKT in dieser Reihenfolge):

1. 🍽️ ERNÄHRUNG (Makros, Top-Foods, Timing, Kalorienbilanz) [~150W]
2. 💪 TRAINING (Volumen, Highlights, RPE, Muskel-Fokus) [~150W]  
3. ⚖️ KÖRPER & MASSE (Gewicht, KFA, Messungen, Trend zu Vortag) [~120W]
4. 😴 REGENERATION (Schlaf, HRV, Libido, Mood) [~120W]
5. 💧 HYDRATION & SUPPLEMENTE (Flüssigkeit, Koffein/Alkohol, Supplement-Compliance) [~100W]
6. 🔗 KORRELATIONEN & INSIGHTS (z.B. Schlaf ↔ Leistung, Hydration ↔ Regeneration) [~80W]
7. 📌 HANDLUNGSEMPFEHLUNGEN (max 4 konkrete Bullet-Points) [max 4 Punkte]

STIL: Sprich ${userName} direkt an. Verwende höchstens 2 Emojis pro Abschnitt. Sei wissenschaftlich präzise aber verständlich. Nutze konkrete Zahlen und Trends.`;

    userData = `VOLLSTÄNDIGE TAGESANALYSE für ${userName} – ${dayData.date}

=== 🍽️ ERNÄHRUNGS-DATEN ===
Kalorien: ${kpis.totalCalories} kcal | Protein: ${kpis.totalProtein}g | Kohlenhydrate: ${kpis.totalCarbs}g | Fette: ${kpis.totalFats}g
Fiber: ${kpis.totalFiber}g | Zucker: ${kpis.totalSugar}g | Mahlzeiten: ${dayData.meals?.length || 0}
Makro-Verteilung: P${kpis.macroDistribution?.protein_percent || 0}% / C${kpis.macroDistribution?.carbs_percent || 0}% / F${kpis.macroDistribution?.fats_percent || 0}%
Top-Foods: ${kpis.topFoods?.slice(0, 5).map((f: any) => `${f.food} (${f.count}x)`).join(', ') || 'keine'}
Meal-Timing: ${kpis.mealTiming?.map((m: any) => `${m.hour}h(${m.meals})`).join(', ') || 'keine Daten'}
Flags: ${kpis.dailyFlags?.filter((f: string) => f.includes('calorie') || f.includes('protein')).join(', ') || 'keine'}

=== 💪 TRAINING-DATEN ===
Sessions: ${dayData.workouts?.length || 0} | Dauer: ${kpis.workoutDuration || 0} Min | Durchschnitt RPE: ${kpis.avgRPE || 0}/10
Gesamtvolumen: ${Math.round(kpis.workoutVolume || 0)} kg | Sets total: ${kpis.totalSets || 0}
Muskelgruppen: ${kpis.workoutMuscleGroups?.join(', ') || 'keine'}
Exercise-Types: ${kpis.exerciseTypes?.join(', ') || 'keine'}
Training-Flags: ${kpis.dailyFlags?.filter((f: string) => f.includes('volume') || f.includes('intensity')).join(', ') || 'keine'}

=== ⚖️ KÖRPERKOMPOSITION ===
Gewicht: ${kpis.weight || 'n/a'} kg | Körperfett: ${kpis.bodyFatPercentage || 'n/a'}% | Muskelmasse: ${kpis.muscleMassPercentage || 'n/a'}%
Körperwasser: ${kpis.bodyWaterPercentage || 'n/a'}% | Viszeralfett: ${kpis.visceralFat || 'n/a'}
Umfänge: ${Object.entries(kpis.bodyMeasurements || {}).filter(([k,v]) => v).map(([k,v]) => `${k}=${v}cm`).join(', ') || 'keine Messungen'}

=== 😴 REGENERATION & SCHLAF ===
Schlaf: ${kpis.sleepHours || 'n/a'}h | Qualität: ${kpis.sleepQuality || 'n/a'}/10 | Sleep-Score: ${kpis.sleepScore || 'n/a'}/100
Libido: ${kpis.libidoLevel || 'n/a'}/10 | Recovery-Feeling: ${kpis.recoveryFeeling || 'n/a'}/10
Recovery-Metrics: ${JSON.stringify(kpis.recoveryMetrics || {})}
Schlaf-Flags: ${kpis.dailyFlags?.filter((f: string) => f.includes('sleep')).join(', ') || 'keine'}

=== 💧 HYDRATION & SUPPLEMENTS ===
Flüssigkeit: ${kpis.totalFluidMl || 0}ml | Hydration-Score: ${kpis.hydrationScore || 0}%
Koffein: ${Math.round(kpis.caffeineMg || 0)}mg | Alkohol: ${Math.round(kpis.alcoholG || 0)}g
Supplements: ${dayData.supplementLog?.length || 0} | Compliance: ${kpis.supplementCompliance || 0}% | Verpasst: ${kpis.supplementsMissed || 0}
Hydration-Flags: ${kpis.dailyFlags?.filter((f: string) => f.includes('hydration') || f.includes('supplement')).join(', ') || 'keine'}

=== 🧠 MENTAL STATE & COACHING ===
Coach-Sentiment: ${kpis.coachSentiment} | Motivation: ${kpis.motivationLevel}
Coach-Messages: ${dayData.coachConversations?.length || 0}
User-Goal: ${dayData.profile?.goal_type || 'unknown'} | Activity-Level: ${dayData.profile?.activity_level || 'unknown'}

=== 🚩 CORRELATIONS & FLAGS ===
Alle Flags: ${kpis.dailyFlags?.join(', ') || 'keine kritischen Flags'}`;

  } else if (type === 'xl') {
    systemPrompt = `Du bist ein KI-Fitness-Coach. Erstelle eine AUSFÜHRLICHE Tagesanalyse (max ${config.maxWords} Wörter).

DETAILLIERTE XL-ZUSAMMENFASSUNG:
- Konkrete Lebensmittel mit Mengen nennen
- Spezifische Übungen und Satzzahlen auflisten  
- Makronährstoff-Verteilung analysieren
- Workout-Volumen und trainierte Muskelgruppen
- Trends und Auffälligkeiten hervorheben
- Verwende Aufzählungen und strukturierte Listen

Stil: Motivierend, datenorientiert. Nutze Emojis sparsam.`;

    userData = `Datum: ${dayData.date}

ERNÄHRUNG:
- Kalorien: ${kpis.totalCalories} kcal | Protein: ${kpis.totalProtein}g | Kohlenhydrate: ${kpis.totalCarbs}g | Fette: ${kpis.totalFats}g
- Mahlzeiten: ${dayData.meals?.length || 0}
${kpis.topFoods?.length > 0 ? `- Top Lebensmittel: ${kpis.topFoods.map((f: any) => `${f.food} (${f.count}x)`).join(', ')}` : ''}

TRAINING:
- Workouts: ${dayData.workouts?.length || 0} | Trainingsvolumen: ${Math.round(kpis.workoutVolume)} kg | Dauer: ${kpis.workoutDuration || 0} Min
${kpis.workoutMuscleGroups?.length > 0 ? `- Muskelgruppen: ${kpis.workoutMuscleGroups.join(', ')}` : ''}

KÖRPERDATEN:
${kpis.weight ? `- Gewicht: ${kpis.weight} kg` : ''}
${kpis.bodyFatPercentage ? `- Körperfett: ${kpis.bodyFatPercentage}%` : ''}

SUPPLEMENTS: ${dayData.supplementLog?.length || 0} Einnahmen`;

  } else {
    // Standard Summary
    systemPrompt = `Du bist ein KI-Fitness-Coach. Erstelle eine KURZE Tageszusammenfassung (max ${config.maxWords} Wörter).

STANDARD-ZUSAMMENFASSUNG:
- Kernmetriken (Kalorien, Protein, Workout)
- Wichtigste Highlights des Tages
- Kurze, prägnante Aussagen

Stil: Motivierend, kompakt.`;

    userData = `${dayData.date}: ${kpis.totalCalories} kcal, ${kpis.totalProtein}g Protein, ${dayData.workouts?.length || 0} Workouts`;
  }

  // ============================================================================
  // OPENAI API CALL MIT TOKEN-TRACKING
  // ============================================================================

  try {
    const startTime = Date.now();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userData }
        ],
        max_tokens: config.maxTokens,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const generatedSummary = data.choices[0].message.content.trim();
    const tokensUsed = data.usage?.total_tokens || Math.ceil(generatedSummary.length / 4); // Fallback estimate
    
    const endTime = Date.now();
    console.log(`🤖 [${type.toUpperCase()}-SUMMARY] Generated ${generatedSummary.length} chars, ${tokensUsed} tokens in ${endTime - startTime}ms`);

    return {
      summary: generatedSummary,
      tokensUsed: tokensUsed
    };

  } catch (error) {
    console.error(`❌ Error generating ${type} summary:`, error);
    
    // Fallback-Summary ohne OpenAI
    let fallbackSummary: string;
    
    if (type === 'xxl') {
      fallbackSummary = `📊 Tagesanalyse für ${userName} – ${dayData.date}

🍽️ ERNÄHRUNG: ${kpis.totalCalories} kcal (P: ${kpis.totalProtein}g, C: ${kpis.totalCarbs}g, F: ${kpis.totalFats}g) aus ${dayData.meals?.length || 0} Mahlzeiten. Top-Foods: ${kpis.topFoods?.slice(0,3).map((f: any) => f.food).join(', ') || 'keine spezifiziert'}.

💪 TRAINING: ${dayData.workouts?.length || 0} Sessions mit ${Math.round(kpis.workoutVolume)}kg Gesamtvolumen über ${kpis.workoutDuration}min. Trainierte Muskelgruppen: ${kpis.workoutMuscleGroups?.join(', ') || 'keine'}. 

⚖️ KÖRPER: ${kpis.weight || 'n/a'}kg${kpis.bodyFatPercentage ? `, ${kpis.bodyFatPercentage}% KFA` : ''}. ${Object.keys(kpis.bodyMeasurements || {}).length} Umfangsmessungen.

😴 REGENERATION: ${kpis.sleepHours || 'n/a'}h Schlaf (Qualität: ${kpis.sleepQuality || 'n/a'}/10). Recovery-Feeling: ${kpis.recoveryFeeling || 'n/a'}/10.

💧 HYDRATION: ${kpis.totalFluidMl}ml Flüssigkeit (${kpis.hydrationScore}% Ziel erreicht). ${kpis.caffeineMg}mg Koffein.

🔗 INSIGHTS: ${kpis.dailyFlags?.length || 0} Auffälligkeiten erkannt. Supplement-Compliance: ${kpis.supplementCompliance || 0}%.`;
      
    } else if (type === 'xl') {
      fallbackSummary = `📊 ${dayData.date}: ${kpis.totalCalories} kcal, ${kpis.totalProtein}g Protein. ${dayData.meals?.length || 0} Mahlzeiten erfasst. ${dayData.workouts?.length || 0} Workouts mit ${Math.round(kpis.workoutVolume)}kg Gesamtvolumen. Trainierte Muskelgruppen: ${kpis.workoutMuscleGroups?.join(', ') || 'keine'}. Top Lebensmittel: ${kpis.topFoods?.map((f: any) => f.food).join(', ') || 'keine spezifiziert'}.`;
    } else {
      fallbackSummary = `📊 ${dayData.date}: ${kpis.totalCalories} kcal, ${kpis.totalProtein}g Protein, ${dayData.workouts?.length || 0} Workouts.`;
    }

    return {
      summary: fallbackSummary,
      tokensUsed: Math.ceil(fallbackSummary.length / 4) // Estimate
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function hasRelevantData(dayData: any): boolean {
  return (
    (dayData.meals && dayData.meals.length > 0) ||
    (dayData.workouts && dayData.workouts.length > 0) ||
    dayData.weight ||
    dayData.bodyMeasurements ||
    (dayData.supplementLog && dayData.supplementLog.length > 0)
  );
}