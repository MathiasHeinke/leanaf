import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.205.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const dayData = await collectDayData(supa, userId, date);
    if (!hasRelevantData(dayData)) {
      console.log(`⏭️ Keine relevanten Daten für ${date}, überspringe`);
      return resp(200, { date, status: "skipped", reason: "no_data" });
    }

    /* ------------------------------------------------------------------ */
    /* 3. KPIs + 1× XXL-Summary mit Fallback                             */
    /* ------------------------------------------------------------------ */
    const kpis = calculateKPIs(dayData);
    let summary, tokensUsed, status = "success";
    
    try {
      const result = await generateSummary(kpis, dayData, "xxl");
      summary = result.summary;
      tokensUsed = result.tokensUsed;
    } catch (openaiError) {
      console.warn(`⚠️ OpenAI-Fehler für ${date}:`, openaiError);
      // Fallback-Summary
      summary = generateFallbackSummary(kpis, dayData);
      tokensUsed = 0;
      status = "partial_error";
    }

    const std = summary.split(/\s+/).slice(0, 120).join(" ");
    const xl = summary.split(/\s+/).slice(0, 240).join(" ");

    /* ------------------------------------------------------------------ */
    /* 4. Credits & Token-Tracking                                        */
    /* ------------------------------------------------------------------ */
    const credits = Math.ceil(tokensUsed / 750); // ~$0.01/token-block bei GPT-4.1
    
    if (credits > 0) {
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
    const structuredSummary = buildStructuredSummary(date, kpis, dayData);
    
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
      summary_md: std,
      summary_xl_md: xl,
      summary_xxl_md: summary,
      kpi_xxl_json: kpis,
      summary_struct_json: structuredSummary,
      tokens_spent: tokensUsed,
    }, { onConflict: 'user_id,date' });
    
    console.log(`✅ Summary für ${date} erfolgreich erstellt (${status})`);

    // 🔍 DEBUG: Zeige was in die Summary gepackt wurde
    const debugInfo = {
      dataCollected: {
        meals: dayData.meals?.length || 0,
        workouts: dayData.workouts?.length || 0,
        exerciseSets: dayData.exerciseSets?.length || 0,
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
        muscleGroups: kpis.workoutMuscleGroups
      },
      summaryLengths: {
        standard: std.split(' ').length,
        xl: xl.split(' ').length,
        xxl: summary.split(' ').length
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
        xxl: summary.substring(0, 400) + "..."
      }
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

async function collectDayData(supabase: any, userId: string, date: string) {
  // 🕐 TIMEZONE FIX: Verwende UTC für korrekte Datenabfrage
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  console.log(`📅 Collecting data for ${date} (${dayStart} - ${dayEnd})`);

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
        weight, body_fat_percentage, muscle_mass_percentage,
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
    
    // 6. 💊 SUPPLEMENTE - DOSAGE + TIMING
    supabase
      .from('supplement_intake_log')
      .select(`
        id, dosage, timing, taken, created_at,
        food_supplements!inner(name, category, dosage_unit)
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
    
    // 8. 💧 HYDRATION-TRACKING - CONSUMED_AT + BESSERES JOIN
    supabase
      .from('user_fluids')
      .select(`
        id, custom_name, amount_ml, consumed_at, notes,
        fluid_database!inner(name, category, calories_per_100ml, caffeine_mg_per_100ml, alcohol_percentage)
      `)
      .eq('user_id', userId)
      .or(`and(consumed_at.gte.${dayStart},consumed_at.lte.${dayEnd}), date.eq.${date}`)
      .order('consumed_at', { ascending: true })
      .then((result: any) => {
        console.log(`💧 Fluids query result:`, result.error || `${result.data?.length} entries found`);
        return result;
      }),
    
    // 9. 🧠 COACH-GESPRÄCHE
    supabase
      .from('coach_conversations')
      .select('message_content, message_role, coach_personality, created_at')
      .eq('user_id', userId)
      .eq('conversation_date', date)
      .order('created_at', { ascending: true })
      .then((result: any) => {
        console.log(`🧠 Coach conversations query result:`, result.error || `${result.data?.length} messages found`);
        return result;
      }),
    
    // 10. 👤 USER-PROFIL
    supabase
      .from('profiles')
      .select('preferred_name, age, gender, height_cm, activity_level, goal_type')
      .eq('id', userId)
      .maybeSingle()
      .then((result: any) => {
        console.log(`👤 Profile query result:`, result.error || 'Profile found');
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
    dataCollectionTimestamp: new Date().toISOString()
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

  // 1. 🍽️ ERNÄHRUNGS-ANALYSE
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

    // Makro-Verteilung (mit Guard)
    if (kpis.totalCalories > 0) {
      kpis.macroDistribution = {
        protein_percent: Math.round((kpis.totalProtein * 4 / kpis.totalCalories) * 100),
        carbs_percent: Math.round((kpis.totalCarbs * 4 / kpis.totalCalories) * 100),
        fats_percent: Math.round((kpis.totalFats * 9 / kpis.totalCalories) * 100)
      };
    }

    // Top Lebensmittel - MIT QUALITY SCORE
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

  // 5. 💧 HYDRATION & SUPPLEMENTE
  if (dayData.fluids && dayData.fluids.length > 0) {
    dayData.fluids.forEach((fluid: any) => {
      kpis.totalFluidMl += fluid.amount_ml || 0;
      
      if (fluid.fluid_database) {
        const caffeine = (fluid.fluid_database.caffeine_mg_per_100ml || 0) * (fluid.amount_ml / 100);
        const alcohol = (fluid.fluid_database.alcohol_percentage || 0) * (fluid.amount_ml / 100) * 0.8;
        
        kpis.caffeineMg += caffeine;
        kpis.alcoholG += alcohol;
      }
    });
    
    // Hydration-Score
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
    (dayData.fluids && dayData.fluids.length > 0) ||
    (dayData.coachConversations && dayData.coachConversations.length > 0) // Added coach conversations
  );
}

/* ================================================================== */
/* OPENAI SUMMARY GENERATION + FALLBACK                              */
/* ================================================================== */

async function generateSummary(kpis: any, dayData: any, summaryType: 'standard' | 'xl' | 'xxl') {
  const userName = dayData.profile?.preferred_name || 'Athlet';

  const systemPrompt = `
Erstelle eine FACHLICHE Tageszusammenfassung in exakt 700 deutschen Wörtern.

Struktur für XXL-Summary:
1. 🍽️ Ernährung (Makros, Top-Foods, Timing, Kalorienbilanz)
2. 💪 Training (Volumen, Highlights, RPE, Muskel-Fokus) 
3. ⚖️ Körper & Maße (Gewicht, KFA, Messungen, Trend)
4. 😴 Regeneration (Schlaf, HRV, Libido, Mood)
5. 💧 Hydration & Supplemente (Flüssigkeit, Koffein/Alkohol, Compliance)
6. 🔗 Korrelationen & Insights (Schlaf ↔ Leistung, etc.)
7. 📌 Handlungsempfehlungen (max 4 konkrete Punkte)

Sprich ${userName} direkt an. Maximal 2 Emojis pro Abschnitt. Wissenschaftlich fundiert aber verständlich.
`;

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
          { role: 'user', content: JSON.stringify(kpis) }
        ],
        max_tokens: 1200, // Platz für echte 700 Wörter (~1000 tokens)
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