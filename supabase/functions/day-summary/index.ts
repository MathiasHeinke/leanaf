import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.205.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DateTime } from "https://esm.sh/luxon@3.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-tz, x-no-text",
};

const url = Deno.env.get("SUPABASE_URL")!;
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const oKey = Deno.env.get("OPENAI_API_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supa = createClient(url, key, { auth: { persistSession: false } });

  try {
    const { userId, date, forceUpdate = false } = await req.json();

    if (!userId || !date) {
      return resp(400, { error: "`userId` und `date` sind Pflicht." });
    }

    console.log(`🗓️ Processing single day: ${date} for user ${userId}`);

    /* ------------------------------------------------------------------ */
    /* 1. Skip wenn schon vorhanden                                       */
    /* ------------------------------------------------------------------ */
    const { data: existing } = await supa
      .from("daily_summaries")
      .select("summary_xxl_md")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    if (existing?.summary_xxl_md && !forceUpdate) {
      console.log(`⏭️ Summary für ${date} bereits vorhanden, überspringe`);
      return resp(200, { date, status: "skipped", reason: "already_exists" });
    }

    /* ------------------------------------------------------------------ */
    /* 2. Daten einsammeln                                                */
    /* ------------------------------------------------------------------ */
    const dayData = await collectDayData(supa, userId, date, req);
    if (!hasRelevantData(dayData)) {
      console.log(`⏭️ Keine relevanten Daten für ${date}, überspringe`);
      return resp(200, { date, status: "skipped", reason: "no_data" });
    }

    /* ------------------------------------------------------------------ */
    /* 3. KPIs + Structured JSON zuerst, Text optional                   */
    /* ------------------------------------------------------------------ */
    const kpis = calculateKPIs(dayData);
    const structuredSummary = buildStructuredSummary(date, kpis, dayData);
    
    /* 4. OPTIONAL: knappe Text-Snippets nur wenn Credits > 0 ----------- */
    let std = '', xl = '', xxl = '';
    let tokensUsed = 0;
    let status = "success";
    
  const skipTextGeneration =
    (req.headers.get('x-no-text') ?? '').toLowerCase() === 'true';
    
    if (!skipTextGeneration) {
      try {
        const result = await generateSummary(kpis, dayData, 'xxl'); // 519 Wörter ≈ 750 T
        xxl = result.summary;
        xl = xxl.split(/\s+/).slice(0, 240).join(' ');
        std = xxl.split(/\s+/).slice(0, 120).join(' ');
        tokensUsed = result.tokensUsed;
        status = "success";
      } catch (openaiError) {
        console.warn(`⚠️ OpenAI-Fehler für ${date}:`, openaiError);
        // Fallback-Summary
        xxl = generateFallbackSummary(kpis, dayData);
        xl = xxl.split(/\s+/).slice(0, 240).join(' ');
        std = xxl.split(/\s+/).slice(0, 120).join(' ');
        tokensUsed = 0;
        status = "partial_error";
      }
    }

    /* ------------------------------------------------------------------ */
    /* 4. Credits & Token-Tracking                                        */
    /* ------------------------------------------------------------------ */
    const credits = Math.ceil(tokensUsed / 750); // ~$0.01/token-block bei GPT-4.1
    
    // Credit-Abzug nur bei erfolgreichem Summary
    if (status === "success" && credits > 0) {
      try {
        await supa.rpc("deduct_credits", { p_user_id: userId, p_credits: credits });
        console.log(`💳 ${credits} Credits abgezogen für ${date}`);
      } catch (creditError) {
        console.warn(`⚠️ Credit-Abzug fehlgeschlagen:`, creditError);
      }
    }

    await supa.from("daily_token_spend").upsert({
      user_id: userId,
      date,
      tokens_spent: tokensUsed,
      credits_used: credits,
      operation_type: "summary_generation",
    });

    /* ------------------------------------------------------------------ */
    /* 5. Upsert Summary + Structured JSON                               */
    /* ------------------------------------------------------------------ */
    await supa.from("daily_summaries").upsert({
      user_id: userId,
      date,
      total_calories: safe(kpis.totalCalories, 0),
      total_protein: safe(kpis.totalProtein, 0),
      total_carbs: safe(kpis.totalCarbs, 0),
      total_fats: safe(kpis.totalFats, 0),
      macro_distribution: safe(kpis.macroDistribution, {}),
      top_foods: safe(kpis.topFoods, []),
      workout_volume: safe(kpis.workoutVolume, 0),
      workout_muscle_groups: safe(kpis.workoutMuscleGroups, []),
      sleep_score: safe(kpis.sleepScore, null),
      recovery_metrics: safe(kpis.recoveryMetrics, {}),
      summary_md: std || null,
      summary_xl_md: xl || null,
      summary_xxl_md: xxl || null,
      kpi_xxl_json: kpis,
      summary_struct_json: structuredSummary,
      tokens_spent: tokensUsed,
      text_generated: status === 'success'  // Flag indicating if text was actually generated
    }, { onConflict: 'user_id,date' });
    
    console.log(`✅ Summary für ${date} erfolgreich erstellt (${status})`);

    // 🔍 DEBUG: Zeige was in die Summary gepackt wurde
    const debugInfo = {
      dataCollected: {
        meals: dayData.meals?.length || 0,
        workouts: dayData.workouts?.length || 0,
        exerciseSets: dayData.exerciseSets?.length || 0,
        quickWorkouts: dayData.quickWorkouts?.length || 0,
        weightEntries: dayData.weight ? 1 : 0,
        bodyMeasurements: dayData.bodyMeasurements ? 1 : 0,
        supplementEntries: dayData.supplementLog?.length || 0,
        sleepEntries: dayData.sleep ? 1 : 0,
        fluidEntries: dayData.fluids?.length || 0,
        coachConversations: dayData.coachConversations?.length || 0
      },
      calculatedKPIs: {
        totalCalories: kpis.totalCalories,
        totalProtein: kpis.totalProtein,
        workoutVolume: kpis.workoutVolume,
        sleepScore: kpis.sleepScore,
        hydrationScore: kpis.hydrationScore,
        muscleGroups: kpis.workoutMuscleGroups,
        // NEW: Quick workout activity
        stepsCount: kpis.stepsCount,
        distanceKm: kpis.distanceKm,
        activeMinutes: kpis.activeMinutes,
        quickWorkoutActive: kpis.quickWorkoutActive,
        supplementCompliance: kpis.supplementCompliance
      },
      summaryLengths: {
        standard: std.split(' ').length,
        xl: xl.split(' ').length,
        xxl: xxl.split(' ').length
      },
      flags: kpis.dailyFlags || []
    };

    return resp(200, {
      date,
      status,
      tokens_used: tokensUsed,
      credits_used: credits,
      flags: kpis.dailyFlags,
      // 🔍 DEBUG-OUTPUT für besseres Verständnis
      debug: debugInfo,
      summary_preview: {
        standard: std.substring(0, 200) + "...",
        xl: xl.substring(0, 300) + "...",
        xxl: xxl.substring(0, 400) + "..."
      },
      // 📄 FULL XXL TEXT for frontend display
      summary_xxl_full: xxl
    });
  } catch (e) {
    console.error(`❌ Fehler bei Day-Summary:`, e);
    return resp(500, { status: "error", message: e.message });
  }
});

/* --------------------------- HELPERS --------------------------- */
const resp = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

/* ================================================================== */
/* DATA COLLECTION - 1:1 aus der alten Function übernommen          */
/* ================================================================== */

async function collectDayData(supabase: any, userId: string, date: string, req?: Request) {
  // 🕐 TIMEZONE HANDLING mit Luxon
  const tz = req?.headers.get("x-user-tz") 
    ?? (await supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle()).data?.timezone
    ?? "Europe/Berlin"; // Fallback
  
  const dayStart = DateTime.fromISO(date, { zone: tz }).startOf("day").toISO();
  const dayEnd = DateTime.fromISO(date, { zone: tz }).endOf("day").toISO();

  console.log(`📅 Collecting data for ${date} in ${tz} (${dayStart} - ${dayEnd})`);

  // 👉 Fast aggregation queries for performance
  const [fastMealData, fastVolumeData, fastFluidData] = await Promise.all([
    supabase.rpc('fast_meal_totals', { p_user: userId, p_d: date }),
    supabase.rpc('fast_sets_volume', { p_user: userId, p_d: date }),
    supabase.rpc('fast_fluid_totals', { p_user: userId, p_d: date })
  ]);

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
    profileResult,
    quickWorkoutsResult,
    weeklyWorkoutsResult,
    weeklyExerciseSessionsResult
  ] = await Promise.all([
    // 1. 🍽️ ERNÄHRUNG - ERWEITERTE SPALTEN
    supabase
      .from('meals')
      .select(`
        id, text, calories, protein, carbs, fats,
        meal_type, quality_score, images, consumption_percentage,
        created_at
      `)
      .eq('user_id', userId)
      .or(`and(created_at.gte.${dayStart},created_at.lte.${dayEnd}), date.eq.${date}`)
      .order('created_at', { ascending: true })
      .then((result: any) => {
        console.log(`🍽️ Meals query result:`, result.error || `${result.data?.length} meals found`);
        return result;
      }),
    
    // 2. 💪 TRAINING SESSIONS
    supabase
      .from('exercise_sessions')
      .select('id, session_name, workout_type, duration_minutes, overall_rpe, notes, start_time, end_time, date')
      .eq('user_id', userId)
      .eq('date', date)
      .then((result: any) => {
        console.log(`💪 Exercise sessions query result:`, result.error || `${result.data?.length} sessions found`);
        return result;
      }),
    
    // 3. 🏋️ EXERCISE SETS
    supabase
      .from('exercise_sets')
      .select(`
        exercise_id, weight_kg, reps, rpe, duration_seconds, rest_seconds, set_number, created_at,
        exercises!inner(name, muscle_groups, category, equipment, is_compound)
      `)
      .eq('user_id', userId)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)
      .order('created_at', { ascending: true })
      .then((result: any) => {
        console.log(`🏋️ Exercise sets query result:`, result.error || `${result.data?.length} sets found`);
        return result;
      }),
    
    // 4. ⚖️ GEWICHT & KÖRPERFETT - ALLE FELDER
    supabase
      .from('weight_history')
      .select(`
        weight, body_fat_percentage, muscle_percentage,
        visceral_fat, body_water_percentage, created_at
      `)
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(1)
      .then((result: any) => {
        console.log(`⚖️ Weight query result:`, result.error || `${result.data?.length} entries found`);
        return result;
      }),
    
    // 5. 📏 KÖRPERMASSE - MIT NOTIZEN
    supabase
      .from('body_measurements')
      .select(`
        chest, waist, belly, hips, thigh, arms, neck, notes, created_at
      `)
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(1)
      .then((result: any) => {
        console.log(`📏 Body measurements query result:`, result.error || `${result.data?.length} entries found`);
        return result;
      }),
    
    // 6. 💊 SUPPLEMENTE - TIMING + TAKEN STATUS (Fix taken_at logic + column names)
    supabase
      .from('supplement_intake_log')
      .select(`
        id, timing, taken, taken_at, created_at,
        user_supplements!inner(custom_name, dosage, unit)
      `)
      .eq('user_id', userId)
      .eq('date', date)
      .then((result: any) => {
        console.log(`💊 Supplements query result:`, result.error || `${result.data?.length} entries found`);
        return result;
      }),
    
    // 7. 😴 SCHLAF-TRACKING - ERWEITERTE FELDER
    supabase
      .from('sleep_tracking')
      .select(`
        sleep_hours, sleep_quality, sleep_interruptions,
        bedtime, wake_time,
        morning_libido, motivation_level,
        created_at
      `)
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(1)
      .then((result: any) => {
        console.log(`😴 Sleep query result:`, result.error || `${result.data?.length} entries found`);
        return result;
      }),
    
    // 8. 💧 HYDRATION-TRACKING - CONSUMED_AT + CORRECTED JOIN
    supabase
      .from('user_fluids')
      .select(`
        id, custom_name, amount_ml, consumed_at, notes,
        fluid_database!inner(name, category, calories_per_100ml, alcohol_percentage)
      `)
      .eq('user_id', userId)
      .or(`and(consumed_at.gte.${dayStart},consumed_at.lte.${dayEnd}), date.eq.${date}`)
      .order('consumed_at', { ascending: true })
      .then((result: any) => {
        console.log(`💧 Fluids query result:`, result.error || `${result.data?.length} entries found`);
        return result;
      }),
    
    // 9. 🧠 COACH-GESPRÄCHE - Fixed timezone query
    supabase
      .from('coach_conversations')
      .select('message_content, message_role, coach_personality, created_at')
      .eq('user_id', userId)
      .or(`and(created_at.gte.${dayStart},created_at.lte.${dayEnd}), conversation_date.eq.${date}`)
      .order('created_at', { ascending: true })
      .then((result: any) => {
        console.log(`🧠 Coach conversations query result:`, result.error || `${result.data?.length} messages found`);
        return result;
      }),
    
    // 10. 👤 USER-PROFIL
    supabase
      .from('profiles')
      .select('preferred_name, age, gender, height_cm, weight_kg, activity_level, goal_type')
      .eq('id', userId)
      .maybeSingle()
      .then((result: any) => {
        console.log(`👤 Profile query result:`, result.error || 'Profile found');
        return result;
      }),
    
    // 11. 🏃 QUICK-WORKOUT-INPUT (Steps, Distance, Cardio)
    supabase
      .from('workouts')
      .select(`
        workout_type, duration_minutes, intensity, distance_km, steps, notes, 
        date, created_at, did_workout
      `)
      .eq('user_id', userId)
      .eq('date', date)
      .then((result: any) => {
        console.log(`🏃 Quick workouts query result:`, result.error || `${result.data?.length} quick workouts found`);
        return result;
      }),
    
    // 12. 📊 7-TAGE WORKOUT ÜBERSICHT für Training/Rest-Verhältnis
    supabase
      .from('workouts')
      .select('date, did_workout, workout_type, duration_minutes, intensity, steps, distance_km')
      .eq('user_id', userId)
      .gte('date', (() => {
        const sevenDaysAgo = new Date(date);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        return sevenDaysAgo.toISOString().split('T')[0];
      })())
      .lte('date', date)
      .order('date', { ascending: false })
      .then((result: any) => {
        console.log(`📊 Weekly workouts query result:`, result.error || `${result.data?.length} days found`);
        return result;
      }),
    
    // 13. 💪 7-TAGE TRAINING SESSIONS für Volumen-Analyse  
    supabase
      .from('exercise_sessions')
      .select(`
        date, duration_minutes, overall_rpe,
        exercise_sets!inner(weight_kg, reps, rpe)
      `)
      .eq('user_id', userId)
      .gte('date', (() => {
        const sevenDaysAgo = new Date(date);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        return sevenDaysAgo.toISOString().split('T')[0];
      })())
      .lte('date', date)
      .then((result: any) => {
        console.log(`💪 Weekly exercise sessions query result:`, result.error || `${result.data?.length} sessions found`);
        return result;
      })
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
    quickWorkouts: quickWorkoutsResult?.data || [],
    weeklyWorkouts: weeklyWorkoutsResult?.data || [],
    weeklyExerciseSessions: weeklyExerciseSessionsResult?.data || [],
    dataCollectionTimestamp: new Date().toISOString(),
    // Fast aggregation results for performance
    fastMealTotals: fastMealData?.data || null,
    fastWorkoutVolume: fastVolumeData?.data || 0,
    fastFluidTotal: fastFluidData?.data || 0
  };
}

/* ================================================================== */
/* KPI CALCULATION - 1:1 aus der alten Function übernommen           */
/* ================================================================== */

// Helper function for safe value extraction
const safe = <T>(val: T | undefined | null, def: T): T => val ?? def;

function buildStructuredSummary(date: string, kpis: any, rawData: any) {
  return {
    day: date,
    meta: { collected_at: new Date().toISOString() },
    nutrition: {
      totals: {
        kcal: safe(kpis.totalCalories, 0),
        protein_g: safe(kpis.totalProtein, 0),
        carbs_g: safe(kpis.totalCarbs, 0),
        fat_g: safe(kpis.totalFats, 0),
        fiber_g: safe(kpis.totalFiber, 0),
        sugar_g: safe(kpis.totalSugar, 0),
        drink_kcal: safe(kpis.totalDrinkCalories, 0)
      },
      macro_pct: safe(kpis.macroDistribution, {}),
      top_foods: safe(kpis.topFoods, []),
      meal_timing: safe(kpis.mealTiming, []),
      meals: safe(rawData.meals, [])
    },
    training: {
      volume_kg: safe(kpis.workoutVolume, 0),
      sets: safe(kpis.totalSets, 0),
      avg_rpe: safe(kpis.avgRPE, 0),
      duration_min: safe(kpis.workoutDuration, 0),
      muscle_groups: safe(kpis.workoutMuscleGroups, []),
      exercise_types: safe(kpis.exerciseTypes, []),
      sessions: safe(rawData.workouts, []),
      exercise_sets: safe(rawData.exerciseSets, [])
    },
    body: {
      weight_kg: safe(kpis.weight, null),
      body_fat_pct: safe(kpis.bodyFatPercentage, null),
      muscle_mass_pct: safe(kpis.muscleMassPercentage, null),
      measurements: safe(rawData.bodyMeasurements, null),
      weight_entries: safe(rawData.weight, [])
    },
    recovery: {
      sleep_hours: safe(kpis.sleepHours, null),
      sleep_score: safe(kpis.sleepScore, null),
      sleep_quality: safe(kpis.sleepQuality, null),
      libido_level: safe(kpis.libidoLevel, null),
      recovery_feeling: safe(kpis.recoveryFeeling, null),
      recovery_metrics: safe(kpis.recoveryMetrics, {}),
      sleep_data: safe(rawData.sleep, [])
    },
    hydration: {
      total_ml: safe(kpis.totalFluidMl, 0),
      caffeine_mg: safe(kpis.caffeineMg, 0),
      alcohol_g: safe(kpis.alcoholG, 0),
      hydration_score: safe(kpis.hydrationScore, 0),
      fluids: safe(rawData.fluids, [])
    },
    supplements: {
      compliance_pct: safe(kpis.supplementCompliance, 0),
      missed_count: safe(kpis.supplementsMissed, 0),
      supplement_log: safe(rawData.supplementLog, [])
    },
    activity: {
      steps_count: safe(kpis.stepsCount, 0),
      distance_km: safe(kpis.distanceKm, 0),
      active_minutes: safe(kpis.activeMinutes, 0),
      quick_workout_active: safe(kpis.quickWorkoutActive, false),
      quick_workouts: safe(rawData.quickWorkouts, [])
    },
    weekly_training: {
      training_days: safe(kpis.weeklyTrainingDays, 0),
      rest_days: safe(kpis.weeklyRestDays, 0),
      avg_intensity: safe(kpis.avgWeeklyIntensity, 0),
      total_volume: safe(kpis.weeklyExerciseVolume, 0),
      workouts: safe(rawData.weeklyWorkouts, []),
      sessions: safe(rawData.weeklyExerciseSessions, [])
    },
    user_profile: {
      name: safe(rawData.profile?.preferred_name, 'Unbekannt'),
      age: safe(rawData.profile?.age, null),
      height: safe(rawData.profile?.height_cm, null),
      weight_goal: safe(rawData.profile?.weight_kg, null),
      activity_level: safe(rawData.profile?.activity_level, null),
      goal_type: safe(rawData.profile?.goal_type, null),
      current_weight: safe(kpis.weight, null)
    },
    coaching: {
      sentiment: safe(kpis.coachSentiment, 'neutral'),
      motivation_level: safe(kpis.motivationLevel, 'unknown'),
      conversations: safe(rawData.coachConversations, [])
    },
    flags: safe(kpis.dailyFlags, []),
    profile: safe(rawData.profile, null)
  };
}

function calculateKPIs(dayData: any) {
  const kpis: any = {
    // BASIS-ERNÄHRUNG - Use fast aggregation if available
    totalCalories: dayData.fastMealTotals?.calories || 0,
    totalProtein: dayData.fastMealTotals?.protein || 0,
    totalCarbs: dayData.fastMealTotals?.carbs || 0,
    totalFats: dayData.fastMealTotals?.fats || 0,
    totalFiber: 0, // Not in fast aggregation
    totalSugar: 0, // Not in fast aggregation  
    macroDistribution: {},
    topFoods: [],
    mealTiming: [],
    
    // BASIS-TRAINING - Use fast aggregation with numeric cast
    workoutVolume: Number(dayData.fastWorkoutVolume) || 0,
    workoutMuscleGroups: [],
    workoutDuration: 0,
    avgRPE: 0,
    totalSets: 0,
    exerciseTypes: [],
    
    // QUICK-WORKOUT-INPUT ACTIVITY
    stepsCount: 0,
    distanceKm: 0,
    activeMinutes: 0,
    quickWorkoutActive: false,
    
    // 7-TAGE TRAINING ÜBERSICHT
    weeklyTrainingDays: 0,
    weeklyRestDays: 0,
    avgWeeklyIntensity: 0,
    weeklyExerciseVolume: 0,
    
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
    
    // HYDRATION & SUPPLEMENTE - Use fast aggregation if available
    totalFluidMl: dayData.fastFluidTotal || 0,
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

  // 1. 🍽️ ERNÄHRUNGS-ANALYSE - Macro distribution & top foods regardless of fast totals
  if (dayData.meals && dayData.meals.length > 0) {
    let mealTimeDistribution: any = {};
    
    // If no fast totals, calculate manually
    if (!dayData.fastMealTotals) {
      dayData.meals.forEach((meal: any) => {
        kpis.totalCalories += meal.calories || 0;
        kpis.totalProtein += meal.protein || 0;
        kpis.totalCarbs += meal.carbs || 0;
        kpis.totalFats += meal.fats || 0;
        // Note: fiber and sugar not available in meals table
      });
    }

    // ALWAYS process meal timing and top foods from individual meals
    dayData.meals.forEach((meal: any) => {
      const mealHour = new Date(meal.created_at).getHours();
      mealTimeDistribution[mealHour] = (mealTimeDistribution[mealHour] || 0) + 1;
    });

    // Makro-Verteilung (mit Guard)
    if (kpis.totalCalories > 0) {
      kpis.macroDistribution = {
        protein_percent: Math.round((kpis.totalProtein * 4 / kpis.totalCalories) * 100),
        carbs_percent: Math.round((kpis.totalCarbs * 4 / kpis.totalCalories) * 100),
        fats_percent: Math.round((kpis.totalFats * 9 / kpis.totalCalories) * 100)
      };
    }

    // Top Lebensmittel - MIT QUALITY SCORE (ALWAYS process from individual meals)
    const foodCounts: any = {};
    dayData.meals.forEach((meal: any) => {
      const foodKey = `${meal.text || 'Unbekannt'}|${meal.quality_score ?? 0}`;
      foodCounts[foodKey] = (foodCounts[foodKey] || 0) + 1;
    });
    
    kpis.topFoods = Object.entries(foodCounts)
      .sort(([,a]: any, [,b]: any) => b - a)
      .slice(0, 5)
      .map(([key, count]) => {
        const [food, score] = key.split('|');
        return { food, score: Number(score), count };
      });
      
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

  // 4. 😴 RECOVERY & SCHLAF - ERWEITERTE FELDER
  if (dayData.sleep) {
    kpis.sleepScore = null; // Nicht verfügbar in DB
    kpis.sleepHours = dayData.sleep.sleep_hours;
    kpis.sleepQuality = dayData.sleep.sleep_quality;
    kpis.libidoLevel = dayData.sleep.morning_libido;
    kpis.motivationLevel = dayData.sleep.motivation_level ?? 'unknown';
    kpis.bedTime = dayData.sleep.bedtime;
    kpis.wakeTime = dayData.sleep.wake_time;
    kpis.recoveryFeeling = null; // Nicht verfügbar in DB
    
    kpis.recoveryMetrics = {
      sleep_interruptions: dayData.sleep.sleep_interruptions,
      motivation_level: dayData.sleep.motivation_level,
      sleep_efficiency: dayData.sleep.sleep_hours && dayData.sleep.sleep_hours >= 7 ? 'good' : 'needs_improvement'
    };
  }

  // 2.5. 🏃 QUICK-WORKOUT-INPUT PROCESSING (NEW)
  if (dayData.quickWorkouts && dayData.quickWorkouts.length > 0) {
    console.log(`🏃 Processing ${dayData.quickWorkouts.length} quick workouts`);
    
    dayData.quickWorkouts.forEach((qw: any) => {
      kpis.stepsCount += qw.steps || 0;
      kpis.distanceKm += qw.distance_km || 0;
      kpis.activeMinutes += qw.duration_minutes || 0;
      
      // Mark as active if any workout data present
      if (qw.workout_type || qw.steps || qw.distance_km || qw.duration_minutes) {
        kpis.quickWorkoutActive = true;
      }
    });
    
    console.log(`🏃 Quick workout totals: ${kpis.stepsCount} steps, ${kpis.distanceKm}km, ${kpis.activeMinutes}min active`);
  }

  // 5. 💧 HYDRATION & SUPPLEMENTE - Fix double counting
  // Use fast aggregation if available, otherwise loop (prevent double count)
  if (!dayData.fastFluidTotal && dayData.fluids && dayData.fluids.length > 0) {
    console.log(`💧 Processing fluids manually (no fast total available)`);
    dayData.fluids.forEach((fluid: any) => {
      kpis.totalFluidMl += fluid.amount_ml || 0;
      
      if (fluid.fluid_database) {
        // Note: Using available columns from fluid_database
        const alcohol = (fluid.fluid_database.alcohol_percentage || 0) * (fluid.amount_ml / 100) * 0.8;
        
        kpis.alcoholG += alcohol;
      }
    });
  } else if (dayData.fastFluidTotal) {
    console.log(`💧 Using fast fluid total: ${dayData.fastFluidTotal}ml`);
    // Fast total already applied at top, just process additional metadata
    if (dayData.fluids && dayData.fluids.length > 0) {
      dayData.fluids.forEach((fluid: any) => {
        if (fluid.fluid_database) {
          const alcohol = (fluid.fluid_database.alcohol_percentage || 0) * (fluid.amount_ml / 100) * 0.8;
          kpis.alcoholG += alcohol;
        }
      });
    }
  }
    
  // Hydration-Score: Robust fallback on profile weight
  const userWeight =
    kpis.weight ??
    dayData.profile?.weight_kg ??
    dayData.weight?.weight ??
    null;

  if (userWeight && userWeight > 0 && kpis.totalFluidMl > 0) {
    const mlPerKg = kpis.totalFluidMl / userWeight;
    kpis.hydrationScore = Math.min(100, Math.round((mlPerKg / 35) * 100));
  } else {
    kpis.hydrationScore = null;
  }

  // 5.5. 💊 SUPPLEMENT COMPLIANCE - Fix taken logic
  if (dayData.supplementLog && dayData.supplementLog.length > 0) {
    console.log(`💊 Processing ${dayData.supplementLog.length} supplement entries`);
    
    // Count taken supplements: either taken=true OR taken_at is not null
    const takenCount = dayData.supplementLog.filter((sup: any) => 
      sup.taken === true || sup.taken_at != null
    ).length;
    
    kpis.supplementCompliance = Math.round((takenCount / dayData.supplementLog.length) * 100);
    kpis.supplementsMissed = dayData.supplementLog.length - takenCount;
    
    console.log(`💊 Supplement compliance: ${takenCount}/${dayData.supplementLog.length} = ${kpis.supplementCompliance}%`);
  }

  // 6. 🧠 COACH-GESPRÄCHE & SENTIMENT
  if (dayData.coachConversations && dayData.coachConversations.length > 0) {
    const userMessages = dayData.coachConversations.filter((msg: any) => msg.message_role === 'user');
    
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
  
  // 7. 📊 7-TAGE TRAINING ANALYSE (NEW)
  if (dayData.weeklyWorkouts && dayData.weeklyWorkouts.length > 0) {
    console.log(`📊 Processing ${dayData.weeklyWorkouts.length} weekly workout days`);
    
    const trainingDays = dayData.weeklyWorkouts.filter((w: any) => w.did_workout).length;
    const restDays = dayData.weeklyWorkouts.filter((w: any) => !w.did_workout).length;
    
    kpis.weeklyTrainingDays = trainingDays;
    kpis.weeklyRestDays = restDays;
    
    // Calculate average intensity from quick workouts
    const intensities = dayData.weeklyWorkouts
      .filter((w: any) => w.intensity && w.intensity > 0)
      .map((w: any) => w.intensity);
    
    kpis.avgWeeklyIntensity = intensities.length > 0 
      ? Math.round((intensities.reduce((a: number, b: number) => a + b, 0) / intensities.length) * 10) / 10 
      : 0;
    
    console.log(`📊 Weekly summary: ${trainingDays} training days, ${restDays} rest days, avg intensity: ${kpis.avgWeeklyIntensity}`);
  }
  
  // 8. 💪 7-TAGE EXERCISE VOLUMEN (NEW)
  if (dayData.weeklyExerciseSessions && dayData.weeklyExerciseSessions.length > 0) {
    console.log(`💪 Processing ${dayData.weeklyExerciseSessions.length} weekly exercise sessions`);
    
    let weeklyVolume = 0;
    dayData.weeklyExerciseSessions.forEach((session: any) => {
      if (session.exercise_sets && session.exercise_sets.length > 0) {
        session.exercise_sets.forEach((set: any) => {
          weeklyVolume += (set.weight_kg || 0) * (set.reps || 0);
        });
      }
    });
    
    kpis.weeklyExerciseVolume = Math.round(weeklyVolume);
    console.log(`💪 Weekly exercise volume: ${kpis.weeklyExerciseVolume}kg`);
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
    (dayData.fluids && dayData.fluids.length > 0) ||
    (dayData.coachConversations && dayData.coachConversations.length > 0) // Added coach conversations
  );
}

/* ================================================================== */
/* OPENAI SUMMARY GENERATION + FALLBACK                              */
/* ================================================================== */

async function generateSummary(kpis: any, dayData: any, summaryType: 'standard' | 'xl' | 'xxl') {
  const userName = dayData.profile?.preferred_name || 'Athlet';

  /**  ➜  80 − 90 Token system prompt
   *  - stichpunktartige Struktur
   *  - maximal 700 Wörter in DE
   *  - Emojis optional (≤ 2/Abschnitt)
   */
  const systemPrompt = `
Du bist ein datengetriebener Fitness-Coach. 
Erstelle eine **Tages-XXL-Summary (< 700 Wörter, DE)** im Format:

1. 🍽 Ernährung – kcal, Makros %, Top-Foods (⩽ 3)  
2. 💪 Training – Volumen kg, Sätze, Top-Übungen (⩽ 3)  
3. ⚖ Körper – Gewicht, KFA, Messungen (falls)  
4. 😴 Regeneration – Schlaf h, Qualität, HRV (falls)  
5. 💧 Hydration/Supps – Flüssigkeit ml, Score %, Compliance %  
6. 🔗 Insights – Korrelationen (z. B. Schlaf ↔ RPE)  
7. ▶ Empfehlungen – 3-4 präzise Aufgaben

Direkte Ansprache: **${userName}**, wissenschaftlich & motivierend.
Keine Einleitung, keine Abschiedsfloskeln.
`;

  const userPrompt = JSON.stringify({
    ...kpis,
    date: dayData.date,
    flags: kpis.dailyFlags,
  });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${oKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14', // Latest flagship model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1500,   // Extended for full XXL text generation
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "Keine Summary generiert";
    const tokensUsed = data.usage?.total_tokens || 0;

    return { summary, tokensUsed };

  } catch (error) {
    console.error(`Error generating summary:`, error);
    throw error;
  }
}

function generateFallbackSummary(kpis: any, dayData: any): string {
  const userName = dayData.profile?.preferred_name || 'Athlet';
  
  return `
Hallo ${userName}! 

📊 **Tageszusammenfassung für ${dayData.date}**

🍽️ **Ernährung**: ${kpis.totalCalories} kcal mit ${kpis.totalProtein}g Protein, ${kpis.totalCarbs}g Kohlenhydrate und ${kpis.totalFats}g Fett verbraucht.

💪 **Training**: ${kpis.workoutVolume}kg Gesamtvolumen über ${kpis.totalSets} Sätze. Durchschnittliche Anstrengung: ${kpis.avgRPE}/10.

⚖️ **Körperdaten**: ${kpis.weight ? `Gewicht: ${kpis.weight}kg` : 'Keine Gewichtsmessung'}.

😴 **Regeneration**: ${kpis.sleepHours ? `${kpis.sleepHours}h Schlaf` : 'Keine Schlafdaten'}.

💧 **Hydration**: ${kpis.totalFluidMl}ml Flüssigkeit getrunken.

🔧 **System-Info**: Diese Zusammenfassung wurde automatisch generiert, da der AI-Service temporär nicht verfügbar war.
`;
}