import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, date, force = false, text = true, timezone = 'Europe/Berlin' } = await req.json();
    if (!userId || !date) {
      return errorResponse(400, "userId + date required");
    }

    console.log(`🚀 Processing summary for ${userId} on ${date} (force: ${force}) in timezone ${timezone}`);

    // Check if summary already exists and has complete data (unless force mode)
    if (!force) {
      const { data: existing } = await supabase
        .from("daily_summaries")
        .select("summary_struct_json")
        .eq("user_id", userId)
        .eq("date", date)
        .maybeSingle();

      if (existing?.summary_struct_json) {
        console.log(`🔄 Skip – already complete: ${date}`);
        return okResponse({ status: "skipped", reason: "already_exists" });
      }
    }

    // Collect raw data with timezone awareness
    console.log('🔍 Step 1: Collecting raw data with timezone...');
    const raw = await collectRawData(userId, date, timezone);
    console.log('✅ Raw data collected:', { hasData: raw.hasData, userProfile: !!raw.userProfile });
    
    if (!raw.hasData) {
      console.log(`⚠️ No data found for ${date}`);
      return okResponse({ status: "skipped", reason: "no_data" });
    }

    // Derive KPIs and build blueprint JSON
    console.log('📊 Step 2: Deriving KPIs...');
    const kpi = deriveKPIs(raw);
    console.log('✅ KPIs derived:', { totalCalories: kpi.nutrition?.totals?.kcal });
    
    console.log('🏗️ Step 3: Building blueprint JSON...');
    const blueprintJson = buildBlueprintJson(date, kpi, raw);
    console.log('✅ Blueprint built, size:', JSON.stringify(blueprintJson).length);

    // Optional GPT text generation
    let summaryMd = null, summaryXl = null, summaryXxl = null, tokens = 0;
    if (text) {
      console.log('🤖 Step 4: Generating GPT text...');
      const gptResult = await generateGPTSummary(kpi, raw);
      summaryXxl = gptResult.text;
      tokens = gptResult.tokens;
      summaryXl = summaryXxl.split(/\s+/).slice(0, 240).join(" ");
      summaryMd = summaryXl.split(/\s+/).slice(0, 120).join(" ");
      console.log('✅ GPT text generated, tokens:', tokens);
    }

    // 📝 Debug: Log vor Upsert
    console.log('📝 Going to upsert summary', {
      date,
      user_id: userId,
      kcal: kpi.nutrition.totals.kcal,
      struct_len: JSON.stringify(blueprintJson).length,
      schema_version: '2025-08-v1'
    });

    // Save to database
    const { error: upsertError } = await supabase
      .from("daily_summaries")
      .upsert({
        user_id: userId,
        date,
        total_calories: kpi.nutrition.totals.kcal,
        total_protein: kpi.nutrition.totals.protein_g,
        total_carbs: kpi.nutrition.totals.carbs_g,
        total_fats: kpi.nutrition.totals.fat_g,
        workout_volume: kpi.training.volume_kg,
        sleep_score: kpi.recovery.sleep_score,
        hydration_score: kpi.hydration.hydration_score,
        summary_md: summaryMd,
        summary_xl_md: summaryXl,
        summary_xxl_md: summaryXxl,
        summary_struct_json: blueprintJson,
        schema_version: '2025-08-v1',
        tokens_spent: tokens,
        text_generated: !!text
      }, { 
        onConflict: "user_id,date" 
      });

    // 📦 Debug: Log nach Upsert
    console.log('📦 Upsert done', { 
      upErr: upsertError,
      errorCode: upsertError?.code,
      errorMessage: upsertError?.message,
      errorDetails: upsertError?.details
    });

    if (upsertError) {
      console.error("❌ Upsert error:", upsertError);
      throw upsertError;
    }

    console.log(`✅ Summary generated for ${date}, tokens: ${tokens}`);
    return okResponse({ status: "success", tokens, hasText: !!text });

  } catch (error) {
    console.error("❌ Error in generate-day-summary-v2:", error);
    return errorResponse(500, error.message);
  }
});

// Helper functions
function okResponse(body: any) {
  return new Response(JSON.stringify(body), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function collectRawData(userId: string, date: string, timezone: string = 'Europe/Berlin') {
  console.log(`📊 Collecting raw data for ${userId} on ${date} in timezone ${timezone}`);

  // Calculate timezone-aware day boundaries
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);
  
  // For Berlin timezone: adjust UTC boundaries
  const utcDayStart = new Date(dayStart.getTime() - (2 * 60 * 60 * 1000)); // -2h for CEST
  const utcDayEnd = new Date(dayEnd.getTime() - (2 * 60 * 60 * 1000));   // -2h for CEST
  
  console.log(`📅 Day boundaries: ${utcDayStart.toISOString()} to ${utcDayEnd.toISOString()}`);

  // Fast aggregations using RPC functions
  const [fastMeals, fastVolume, fastFluids] = await Promise.all([
    supabase.rpc('fast_meal_totals', { p_user: userId, p_d: date }),
    supabase.rpc('fast_sets_volume', { p_user: userId, p_d: date }),
    supabase.rpc('fast_fluid_totals', { p_user: userId, p_d: date })
  ]);

  console.log('🔍 RPC Results Debug:', {
    fastMeals: { data: fastMeals.data, error: fastMeals.error },
    fastVolume: { data: fastVolume.data, error: fastVolume.error },
    fastFluids: { data: fastFluids.data, error: fastFluids.error }
  });

  // Profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  // Daily goals
  const { data: goals } = await supabase
    .from('daily_goals')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  // Detailed meals (last 10) - fix date filter
  const { data: meals } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true });

  console.log('🍽️ Meals fetched', { count: meals?.length || 0, kcal: (meals || []).reduce((s: number, m: any) => s + (Number(m.calories) || 0), 0) });

  // Exercise sessions
  const { data: sessions } = await supabase
    .from('exercise_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date);

  // Exercise sets (last 15 sets for the day) - timezone-aware
  const { data: exerciseSets } = await supabase
    .from('exercise_sets')
    .select(`
      *,
      exercises:exercise_id (name, muscle_groups, exercise_type)
    `)
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true })
    .limit(200);

  // Sleep data
  const { data: sleep } = await supabase
    .from('sleep_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  // Weight data
  const { data: weight } = await supabase
    .from('weight_history')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  // Fluids (detailed) - timezone-aware
  const { data: fluids } = await supabase
    .from('user_fluids')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date);

  // Supplements
  const { data: supplements } = await supabase
    .from('supplement_intake_log')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date);

  // Coach conversations for the day
  const { data: conversations } = await supabase
    .from('coach_conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('conversation_date', date)
    .order('created_at', { ascending: true })
    .limit(20);

  // Quick workouts for the day
  const { data: quickWorkouts } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date);

  // Extract RPC response data correctly - fixing the data access
  const fmRaw = Array.isArray(fastMeals.data) ? fastMeals.data[0] : fastMeals.data;
  const mealTotals = {
    calories: Number(fmRaw?.calories ?? 0) || 0,
    protein: Number(fmRaw?.protein ?? 0) || 0,
    carbs: Number(fmRaw?.carbs ?? 0) || 0,
    fats: Number(fmRaw?.fats ?? 0) || 0,
  };
  const volumeTotal = Number(fastVolume.data ?? 0) || 0;
  const fluidTotal = Number(fastFluids.data ?? 0) || 0;

  console.log('🔍 Extracted RPC Data:', { 
    mealTotals,
    volumeTotal,
    fluidTotal
  });

  const hasData = !!(
    mealTotals.calories || 
    volumeTotal || 
    fluidTotal || 
    sessions?.length || 
    sleep || 
    weight ||
    supplements?.length
  );
  
  return {
    hasData,
    fastMeals: mealTotals,  
    fastVolume: volumeTotal,
    fastFluids: fluidTotal,
    profile,
    goals,
    meals: meals || [],
    sessions: sessions || [],
    exerciseSets: exerciseSets || [],
    sleep,
    weight,
    fluids: fluids || [],
    supplements: supplements || [],
    conversations: conversations || [],
    quickWorkouts: quickWorkouts || []
  };
}

function deriveKPIs(raw: any) {
  console.log('📊 DeriveKPIs Input:', { 
    fastMeals: raw.fastMeals, 
    fastVolume: raw.fastVolume,
    fastFluids: raw.fastFluids,
    mealsCount: raw.meals?.length 
  });

  // Nutrition KPIs - Improved fallback logic
  let totalCalories = raw.fastMeals?.calories || 0;
  let totalProtein = raw.fastMeals?.protein || 0;
  let totalCarbs = raw.fastMeals?.carbs || 0;
  let totalFats = raw.fastMeals?.fats || 0;
  
  // Fallback: Direkt aus meals berechnen wenn RPC leer ist
  if (totalCalories === 0 && raw.meals?.length > 0) {
    console.log('🔄 Using meals fallback calculation');
    totalCalories = raw.meals.reduce((sum: number, m: any) => sum + (m.calories || 0), 0);
    totalProtein = raw.meals.reduce((sum: number, m: any) => sum + (m.protein || 0), 0);
    totalCarbs = raw.meals.reduce((sum: number, m: any) => sum + (m.carbs || 0), 0);
    totalFats = raw.meals.reduce((sum: number, m: any) => sum + (m.fats || 0), 0);
  }
  
  const nutrition = {
    totals: {
      kcal: totalCalories,
      protein_g: totalProtein,
      carbs_g: totalCarbs,
      fat_g: totalFats,
      fiber_g: (raw.meals || []).reduce((sum: number, m: any) => sum + (Number(m.fiber) || 0), 0),
      sugar_g: (raw.meals || []).reduce((sum: number, m: any) => sum + (Number(m.sugar) || 0), 0),
      drink_kcal: (raw.fluids || []).reduce((sum: number, f: any) => sum + (Number(f.calories) || 0), 0)
    },
    macro_pct: calculateMacroPercentages(raw.fastMeals),
    top_foods: getTopFoods(raw.meals || []),
    meal_timing: getMealTiming(raw.meals || []),
    meals_count: (raw.meals || []).length
  };

  // Training KPIs - Fixed NULL handling
  const quickVolume = raw.quickWorkouts?.reduce((sum: number, w: any) => 
    sum + (w.sets || 0) * (w.reps || 0) * (w.weight_kg || 0), 0) || 0;
  
  // Ensure workout volume is never NULL, always a number (even if 0)
  const workoutVolume = (raw.fastVolume || 0) + quickVolume;
  
  const training = {
    volume_kg: workoutVolume, // Explicitly 0 instead of NULL for rest days
    sets: (raw.exerciseSets?.length || 0) + (raw.quickWorkouts?.reduce((sum: number, w: any) => sum + (w.sets || 0), 0) || 0),
    avg_rpe: calculateAverageRPE(raw.exerciseSets || []),
    duration_min: raw.sessions?.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0) || 0,
    muscle_groups: getUniqueValues(raw.exerciseSets || [], 'exercises.muscle_groups'),
    exercise_types: getUniqueValues(raw.exerciseSets || [], 'exercises.exercise_type'),
    sessions_count: raw.sessions?.length || 0,
    quick_workouts_count: raw.quickWorkouts?.length || 0
  };

  console.log('💪 Training KPIs calculated:', training);

  // Recovery KPIs - Ensure defaults for missing data
  const recovery = {
    sleep_hours: raw.sleep?.sleep_hours || raw.sleep?.hours_slept || 0,
    sleep_score: raw.sleep?.sleep_score || raw.sleep?.quality_score || 0,
    sleep_quality: raw.sleep?.sleep_quality || null,
    motivation_level: raw.sleep?.motivation_level || null,
    recovery_feeling: null // TODO: add to schema if needed
  };

  // Hydration KPIs - Ensure proper scoring
  const hydration = {
    total_ml: raw.fastFluids || 0,
    caffeine_mg: calculateCaffeineIntake(raw.fluids || []),
    alcohol_g: calculateAlcoholIntake(raw.fluids || []),
    hydration_score: calculateHydrationScore(raw.fastFluids || 0, raw.goals?.calories || 2000)
  };

  console.log('🌊 Hydration KPIs calculated:', hydration);
  console.log('😴 Recovery KPIs calculated:', recovery);

  // Supplements KPIs
  const supplements = {
    compliance_pct: calculateSupplementCompliance(raw.supplements),
    missed_count: raw.supplements.filter((s: any) => !s.taken).length,
    taken_count: raw.supplements.filter((s: any) => s.taken).length
  };

  return {
    nutrition,
    training,
    recovery,
    hydration,
    supplements
  };
}

function buildBlueprintJson(date: string, kpi: any, raw: any) {
  const now = new Date().toISOString();
  
  return {
    // Top-level KPIs for frontend compatibility
    kpis: {
      nutrition: {
        totals: kpi.nutrition.totals
      },
      training: {
        volume_kg: kpi.training.volume_kg,
        sets: kpi.training.sets,
        avg_rpe: kpi.training.avg_rpe,
        duration_min: kpi.training.duration_min
      },
      recovery: {
        sleep_hours: kpi.recovery.sleep_hours,
        sleep_score: kpi.recovery.sleep_score
      },
      hydration: {
        total_ml: kpi.hydration.total_ml,
        hydration_score: kpi.hydration.hydration_score
      },
      supplements: {
        compliance_pct: kpi.supplements.compliance_pct
      }
    },

    // Day header & meta
    day: date,
    meta: {
      snapshot_generated_at: now,
      prompt_version: "2025-08-01-XL",
      source: "edge_function_day_summary_v2",
      timezone: "Europe/Berlin",
      data_completeness_score: calculateCompletenessScore(raw)
    },

    // User profile
    profile: {
      uid: raw.profile?.id,
      display_name: raw.profile?.display_name,
      age: raw.profile?.age,
      gender: raw.profile?.gender,
      height_cm: raw.profile?.height,
      goal_type: raw.profile?.goal_type,
      activity_level: raw.profile?.activity_level,
      target_weight_kg: raw.profile?.target_weight,
      avatar_url: raw.profile?.avatar_url,
      membership_tier: "premium" // TODO: get from subscription
    },

    // Daily goals
    daily_goals: {
      calories: raw.goals?.calories || null,
      protein_g: raw.goals?.protein || null,
      carbs_g: raw.goals?.carbs || null,
      fats_g: raw.goals?.fats || null,
      steps: 10000, // TODO: get from goals
      water_ml: 3500 // TODO: get from goals
    },

    // Nutrition
    nutrition: {
      totals: kpi.nutrition.totals,
      macro_pct: kpi.nutrition.macro_pct,
      top_foods: kpi.nutrition.top_foods,
      meal_timing: kpi.nutrition.meal_timing,
      meals: raw.meals.slice(0, 10).map((m: any) => ({
        id: m.id,
        created_at: m.created_at,
        text: m.name || m.description,
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fats: m.fats,
        meal_type: m.meal_type,
        quality_score: m.quality_score
      }))
    },

    // Training
    training: {
      volume_kg: kpi.training.volume_kg,
      sets: kpi.training.sets,
      avg_rpe: kpi.training.avg_rpe,
      duration_min: kpi.training.duration_min,
      muscle_groups: kpi.training.muscle_groups,
      exercise_types: kpi.training.exercise_types,
      sessions: raw.sessions.map((s: any) => ({
        id: s.id,
        date: s.date,
        session_name: s.session_name,
        workout_type: s.workout_type,
        overall_rpe: s.overall_rpe,
        duration_minutes: s.duration_minutes
      })),
      exercise_sets: raw.exerciseSets.slice(0, 15)
    },

    // Body measurements
    body: {
      weight_kg: raw.weight?.weight,
      body_fat_pct: raw.weight?.body_fat_percentage,
      muscle_mass_pct: null, // TODO: calculate
      measurements: {
        waist_cm: null, // TODO: get from body_measurements
        chest_cm: null,
        arms_cm: null
      },
      weight_entries: raw.weight ? [{ date: raw.weight.date, weight: raw.weight.weight }] : []
    },

    // Recovery/Sleep
    recovery: {
      sleep_hours: kpi.recovery.sleep_hours,
      sleep_score: kpi.recovery.sleep_score,
      sleep_quality: kpi.recovery.sleep_quality,
      libido_level: null, // TODO: add to schema
      recovery_feeling: kpi.recovery.recovery_feeling,
      recovery_metrics: {
        sleep_interruptions: raw.sleep?.interruptions || 0,
        motivation_level: kpi.recovery.motivation_level,
        sleep_efficiency: calculateSleepEfficiency(raw.sleep)
      },
      sleep_data: raw.sleep ? [{
        date: raw.sleep.date,
        bedtime: raw.sleep.bedtime,
        wake_time: raw.sleep.wake_time,
        sleep_hours: raw.sleep.hours_slept
      }] : []
    },

    // Hydration
    hydration: {
      total_ml: kpi.hydration.total_ml,
      caffeine_mg: kpi.hydration.caffeine_mg,
      alcohol_g: kpi.hydration.alcohol_g,
      hydration_score: kpi.hydration.hydration_score,
      fluids: raw.fluids.map((f: any) => ({
        id: f.id,
        custom_name: f.custom_name,
        amount_ml: f.amount_ml,
        consumed_at: f.consumed_at
      }))
    },

    // Supplements
    supplements: {
      compliance_pct: kpi.supplements.compliance_pct,
      missed_count: kpi.supplements.missed_count,
      supplement_log: raw.supplements.map((s: any) => ({
        id: s.id,
        name: s.supplement_name,
        dosage: s.dosage,
        taken: s.taken,
        timing: s.timing,
        date: s.date
      }))
    },

    // Coaching conversations
    coaching: {
      sentiment: analyzeSentiment(raw.conversations),
      motivation_level: "medium", // TODO: derive from conversations
      topics: extractTopics(raw.conversations),
      conversations: raw.conversations.slice(0, 10).map((c: any) => ({
        timestamp: c.created_at,
        role: c.message_role,
        content: c.message_content
      }))
    },

    // Activity (placeholder for future integration)
    activity: {
      steps: null,
      distance_km: null,
      kcal_burned: null,
      resting_hr: null,
      hrv_ms: null
    },

    // Quality flags
    flags: generateQualityFlags(kpi, raw)
  };
}

// Helper calculation functions
function calculateMacroPercentages(fastMeals: any) {
  if (!fastMeals?.calories || fastMeals.calories === 0) {
    return { protein_percent: 0, carbs_percent: 0, fats_percent: 0 };
  }

  const proteinCal = (fastMeals.protein || 0) * 4;
  const carbsCal = (fastMeals.carbs || 0) * 4;
  const fatsCal = (fastMeals.fats || 0) * 9;
  const totalCal = proteinCal + carbsCal + fatsCal;

  if (totalCal === 0) return { protein_percent: 0, carbs_percent: 0, fats_percent: 0 };

  return {
    protein_percent: Math.round((proteinCal / totalCal) * 100),
    carbs_percent: Math.round((carbsCal / totalCal) * 100),
    fats_percent: Math.round((fatsCal / totalCal) * 100)
  };
}

function getTopFoods(meals: any[]) {
  const foodCount: { [key: string]: { count: number, quality_score: number } } = {};
  
  meals.forEach(meal => {
    const foodName = meal.name || meal.description || "Unknown";
    if (!foodCount[foodName]) {
      foodCount[foodName] = { count: 0, quality_score: meal.quality_score || 5 };
    }
    foodCount[foodName].count++;
  });

  return Object.entries(foodCount)
    .map(([food, data]) => ({ food, count: data.count, quality_score: data.quality_score }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function getMealTiming(meals: any[]) {
  const hourCount: { [key: number]: number } = {};
  
  meals.forEach(meal => {
    const hour = new Date(meal.created_at).getHours();
    hourCount[hour] = (hourCount[hour] || 0) + 1;
  });

  return Object.entries(hourCount)
    .map(([hour, count]) => ({ hour: parseInt(hour), meals: count }))
    .sort((a, b) => a.hour - b.hour);
}

function calculateAverageRPE(sets: any[]) {
  const validRPEs = sets.filter(s => s.rpe && s.rpe > 0).map(s => s.rpe);
  if (validRPEs.length === 0) return null;
  
  return Math.round((validRPEs.reduce((sum, rpe) => sum + rpe, 0) / validRPEs.length) * 10) / 10;
}

function getUniqueValues(items: any[], path: string) {
  const values = new Set();
  items.forEach(item => {
    const pathParts = path.split('.');
    let current = item;
    for (const part of pathParts) {
      current = current?.[part];
    }
    if (Array.isArray(current)) {
      current.forEach(val => values.add(val));
    } else if (current) {
      values.add(current);
    }
  });
  return Array.from(values);
}

function calculateCaffeineIntake(fluids: any[]) {
  return fluids.reduce((sum, fluid) => sum + (fluid.caffeine_mg || 0), 0);
}

function calculateAlcoholIntake(fluids: any[]) {
  return fluids.reduce((sum, fluid) => sum + (fluid.alcohol_g || 0), 0);
}

function calculateHydrationScore(totalMl: number, calorieGoal: number) {
  const recommendedMl = Math.max(2000, calorieGoal * 1.2); // Base 2L + extra based on calorie goal
  const score = Math.min(100, Math.round((totalMl / recommendedMl) * 100));
  return score;
}

function calculateSupplementCompliance(supplements: any[]) {
  if (supplements.length === 0) return null; // No data instead of 100%
  const takenCount = supplements.filter(s => s.taken).length;
  return Math.round((takenCount / supplements.length) * 100);
}

function calculateCompletenessScore(raw: any) {
  let score = 0;
  let maxScore = 0;

  // Nutrition (weight: 30%)
  maxScore += 30;
  if (raw.fastMeals?.calories > 0) score += 30;

  // Training (weight: 25%)
  maxScore += 25;
  if (raw.fastVolume > 0 || raw.sessions.length > 0) score += 25;

  // Sleep (weight: 20%)
  maxScore += 20;
  if (raw.sleep) score += 20;

  // Hydration (weight: 15%)
  maxScore += 15;
  if (raw.fastFluids > 0) score += 15;

  // Supplements (weight: 10%)
  maxScore += 10;
  if (raw.supplements.length > 0) score += 10;

  return maxScore > 0 ? Math.round((score / maxScore) * 100) / 100 : 0;
}

function calculateSleepEfficiency(sleep: any) {
  if (!sleep?.hours_slept) return null;
  
  if (sleep.hours_slept >= 7) return "good";
  if (sleep.hours_slept >= 6) return "fair";
  return "needs_improvement";
}

function analyzeSentiment(conversations: any[]) {
  // Simple sentiment analysis based on keywords
  const positiveWords = ['gut', 'super', 'toll', 'perfekt', 'danke', 'freue'];
  const negativeWords = ['schlecht', 'müde', 'stress', 'problem', 'schwer'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  conversations.forEach(conv => {
    if (conv.message_role === 'user') {
      const content = conv.message_content.toLowerCase();
      positiveWords.forEach(word => {
        if (content.includes(word)) positiveCount++;
      });
      negativeWords.forEach(word => {
        if (content.includes(word)) negativeCount++;
      });
    }
  });
  
  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

function extractTopics(conversations: any[]) {
  const topics = new Set();
  const keywords = {
    'Ernährung': ['essen', 'mahlzeit', 'kalorien', 'protein', 'kohlenhydrate'],
    'Training': ['training', 'workout', 'übung', 'gewicht', 'reps'],
    'Schlaf': ['schlaf', 'müde', 'schlafen', 'aufwachen'],
    'Motivation': ['motivation', 'ziel', 'fortschritt', 'erfolg']
  };
  
  conversations.forEach(conv => {
    if (conv.message_role === 'user') {
      const content = conv.message_content.toLowerCase();
      Object.entries(keywords).forEach(([topic, words]) => {
        if (words.some(word => content.includes(word))) {
          topics.add(topic);
        }
      });
    }
  });
  
  return Array.from(topics);
}

function generateQualityFlags(kpi: any, raw: any) {
  const flags = [];
  
  if (kpi.recovery.sleep_hours < 6) {
    flags.push("insufficient_sleep");
  }
  
  if (kpi.nutrition.totals.kcal < 1200) {
    flags.push("very_low_calories");
  }
  
  if (kpi.hydration.total_ml < 1500) {
    flags.push("low_hydration");
  }
  
  if (kpi.nutrition.totals.protein_g < 50) {
    flags.push("low_protein");
  }
  
  return flags;
}

async function generateGPTSummary(kpi: any, raw: any) {
  const systemPrompt = `Du bist ein datengetriebener Fitness-Coach. Erstelle eine prägnante deutsche Zusammenfassung basierend auf den strukturierten Tagesdaten.

Fokussiere auf:
- Wichtigste Erkenntnisse des Tages
- Auffälligkeiten in Ernährung, Training, Schlaf
- Kurze Bewertung der Performance
- 1-2 konkrete Optimierungsvorschläge

Stil: Motivierend aber ehrlich, max. 2-3 Sätze.`;

  const userContent = JSON.stringify({
    nutrition: kpi.nutrition.totals,
    training: kpi.training,
    recovery: kpi.recovery,
    hydration: kpi.hydration,
    supplements: kpi.supplements
  });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        max_tokens: 900,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      console.error("OpenAI API error:", response.status);
      return { text: "Zusammenfassung konnte nicht generiert werden.", tokens: 0 };
    }

    const data = await response.json();
    return {
      text: data.choices?.[0]?.message?.content || "Keine Zusammenfassung verfügbar.",
      tokens: data.usage?.total_tokens || 0
    };
  } catch (error) {
    console.error("Error generating GPT summary:", error);
    return { text: "Zusammenfassung konnte nicht generiert werden.", tokens: 0 };
  }
}