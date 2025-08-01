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

        // Berechne KPIs
        const kpis = calculateKPIs(dayData);
        
        // Generiere Standard Summary (120 Wörter)
        const standardSummary = await generateSummary(kpis, dayData, 'standard');
        
        // Generiere XL Summary (240 Wörter)
        const xlSummary = await generateSummary(kpis, dayData, 'xl');

        // Speichere in Datenbank
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
          summary_xl_md: xlSummary
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

async function collectDayData(supabase: any, userId: string, date: string) {
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  console.log(`📊 Collecting data for ${date} (${dayStart} to ${dayEnd})`);

  const data: any = {
    date,
    meals: [],
    workouts: [],
    exerciseSets: [],
    weight: null,
    bodyMeasurements: null,
    sleepData: null,
    supplementLog: []
  };

  // Mahlzeiten sammeln
  try {
    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd);
    
    if (mealsError) {
      console.error(`❌ Error fetching meals for ${date}:`, mealsError);
    } else {
      data.meals = meals || [];
      console.log(`🍽️ Found ${data.meals.length} meals for ${date}`);
    }
  } catch (error) {
    console.error(`❌ Exception fetching meals for ${date}:`, error);
  }

  // Workouts sammeln (korrigierte Tabelle: workouts statt exercise_sessions)
  try {
    const { data: workouts, error: workoutsError } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date);
    
    if (workoutsError) {
      console.error(`❌ Error fetching workouts for ${date}:`, workoutsError);
    } else {
      data.workouts = workouts || [];
      console.log(`💪 Found ${data.workouts.length} workouts for ${date}`);
    }
  } catch (error) {
    console.error(`❌ Exception fetching workouts for ${date}:`, error);
  }

  // Exercise Sets sammeln (falls Workouts vorhanden)
  if (data.workouts && data.workouts.length > 0) {
    try {
      const workoutIds = data.workouts.map((w: any) => w.id);
      const { data: sets, error: setsError } = await supabase
        .from('exercise_sets')
        .select('*, exercises(name, muscle_groups)')
        .eq('user_id', userId)
        .in('session_id', workoutIds);
      
      if (setsError) {
        console.error(`❌ Error fetching exercise sets for ${date}:`, setsError);
      } else {
        data.exerciseSets = sets || [];
        console.log(`🏋️ Found ${data.exerciseSets.length} exercise sets for ${date}`);
      }
    } catch (error) {
      console.error(`❌ Exception fetching exercise sets for ${date}:`, error);
    }
  }

  // Gewicht sammeln
  try {
    const { data: weight, error: weightError } = await supabase
      .from('weight_history')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();
    
    if (weightError) {
      console.error(`❌ Error fetching weight for ${date}:`, weightError);
    } else {
      data.weight = weight;
      if (weight) console.log(`⚖️ Found weight data for ${date}: ${weight.weight}kg`);
    }
  } catch (error) {
    console.error(`❌ Exception fetching weight for ${date}:`, error);
  }

  // Körpermaße sammeln
  try {
    const { data: measurements, error: measurementsError } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();
    
    if (measurementsError) {
      console.error(`❌ Error fetching body measurements for ${date}:`, measurementsError);
    } else {
      data.bodyMeasurements = measurements;
      if (measurements) console.log(`📏 Found body measurements for ${date}`);
    }
  } catch (error) {
    console.error(`❌ Exception fetching body measurements for ${date}:`, error);
  }

  // Supplements sammeln (korrigierte Tabelle: supplement_intake_log statt supplement_log)
  try {
    const { data: supplements, error: supplementsError } = await supabase
      .from('supplement_intake_log')
      .select('*')
      .eq('user_id', userId)
      .gte('taken_at', dayStart)
      .lte('taken_at', dayEnd);
    
    if (supplementsError) {
      console.error(`❌ Error fetching supplements for ${date}:`, supplementsError);
    } else {
      data.supplementLog = supplements || [];
      console.log(`💊 Found ${data.supplementLog.length} supplement entries for ${date}`);
    }
  } catch (error) {
    console.error(`❌ Exception fetching supplements for ${date}:`, error);
  }

  // Debug-Ausgabe der gesammelten Daten
  const hasData = hasRelevantData(data);
  console.log(`📈 Data summary for ${date}: meals=${data.meals.length}, workouts=${data.workouts.length}, exerciseSets=${data.exerciseSets.length}, weight=${!!data.weight}, measurements=${!!data.bodyMeasurements}, supplements=${data.supplementLog.length}, hasRelevantData=${hasData}`);

  return data;
}

// ============================================================================
// KPI CALCULATION
// ============================================================================

function calculateKPIs(dayData: any) {
  const kpis: any = {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFats: 0,
    macroDistribution: {},
    topFoods: [],
    workoutVolume: 0,
    workoutMuscleGroups: [],
    sleepScore: null,
    recoveryMetrics: {}
  };

  // Ernährungs-KPIs
  if (dayData.meals && dayData.meals.length > 0) {
    dayData.meals.forEach((meal: any) => {
      kpis.totalCalories += meal.calories || 0;
      kpis.totalProtein += meal.protein || 0;
      kpis.totalCarbs += meal.carbs || 0;
      kpis.totalFats += meal.fats || 0;
    });

    // Makro-Verteilung
    const totalMacros = kpis.totalProtein + kpis.totalCarbs + kpis.totalFats;
    if (totalMacros > 0) {
      kpis.macroDistribution = {
        protein_percent: Math.round((kpis.totalProtein * 4 / kpis.totalCalories) * 100),
        carbs_percent: Math.round((kpis.totalCarbs * 4 / kpis.totalCalories) * 100),
        fats_percent: Math.round((kpis.totalFats * 9 / kpis.totalCalories) * 100)
      };
    }

    // Top 3 Lebensmittel
    const foodCounts: any = {};
    dayData.meals.forEach((meal: any) => {
      const food = meal.food_name || 'Unbekannt';
      foodCounts[food] = (foodCounts[food] || 0) + 1;
    });
    
    kpis.topFoods = Object.entries(foodCounts)
      .sort(([,a]: any, [,b]: any) => b - a)
      .slice(0, 3)
      .map(([food, count]) => ({ food, count }));
  }

  // Workout-KPIs
  if (dayData.workouts && dayData.workouts.length > 0) {
    // Gesamtvolumen (Sets × Reps × Gewicht)
    if (dayData.exerciseSets && dayData.exerciseSets.length > 0) {
      kpis.workoutVolume = dayData.exerciseSets.reduce((total: number, set: any) => {
        const volume = (set.reps || 0) * (set.weight_kg || 0);
        return total + volume;
      }, 0);

      // Trainierte Muskelgruppen
      const muscleGroups = new Set();
      dayData.exerciseSets.forEach((set: any) => {
        if (set.exercises?.muscle_groups) {
          set.exercises.muscle_groups.forEach((mg: string) => muscleGroups.add(mg));
        }
      });
      kpis.workoutMuscleGroups = Array.from(muscleGroups);
    }

    // Workout-Dauer
    kpis.workoutDuration = dayData.workouts.reduce((total: number, workout: any) => {
      return total + (workout.duration_minutes || 0);
    }, 0);
  }

  // Gewichts-Trends
  if (dayData.weight) {
    kpis.weight = dayData.weight.weight;
    kpis.bodyFatPercentage = dayData.weight.body_fat_percentage;
  }

  return kpis;
}

// ============================================================================
// SUMMARY GENERATION
// ============================================================================

async function generateSummary(kpis: any, dayData: any, type: 'standard' | 'xl'): Promise<string> {
  const maxWords = type === 'xl' ? 240 : 120;
  const maxTokens = type === 'xl' ? 300 : 150;

  const systemPrompt = `Du bist ein KI-Assistent, der tägliche Fitness- und Ernährungsdaten zusammenfasst.

Erstelle eine ${type === 'xl' ? 'AUSFÜHRLICHE' : 'KURZE'} Zusammenfassung (max ${maxWords} Wörter) mit folgenden Schwerpunkten:

${type === 'xl' ? `
DETAILLIERTE XL-ZUSAMMENFASSUNG:
- Konkrete Lebensmittel mit Mengen nennen
- Spezifische Übungen und Satzzahlen auflisten
- Makronährstoff-Verteilung analysieren
- Workout-Volumen und trainierte Muskelgruppen
- Trends und Auffälligkeiten hervorheben
- Verwende Aufzählungen und strukturierte Listen
` : `
STANDARD-ZUSAMMENFASSUNG:
- Kernmetriken (Kalorien, Protein, Workout)
- Wichtigste Highlights des Tages
- Kurze, prägnante Aussagen
`}

Stil: Sachlich, motivierend, datenorientiert. Nutze Emojis sparsam.`;

  const userData = `
Datum: ${dayData.date}

ERNÄHRUNG:
- Kalorien: ${kpis.totalCalories} kcal
- Protein: ${kpis.totalProtein}g
- Kohlenhydrate: ${kpis.totalCarbs}g  
- Fette: ${kpis.totalFats}g
- Mahlzeiten: ${dayData.meals?.length || 0}
${type === 'xl' && kpis.topFoods.length > 0 ? `- Top Lebensmittel: ${kpis.topFoods.map((f: any) => `${f.food} (${f.count}x)`).join(', ')}` : ''}

TRAINING:
- Workouts: ${dayData.workouts?.length || 0}
- Trainingsvolumen: ${Math.round(kpis.workoutVolume)} kg
- Dauer: ${kpis.workoutDuration || 0} Min
${type === 'xl' && kpis.workoutMuscleGroups.length > 0 ? `- Muskelgruppen: ${kpis.workoutMuscleGroups.join(', ')}` : ''}

KÖRPERDATEN:
${kpis.weight ? `- Gewicht: ${kpis.weight} kg` : ''}
${dayData.bodyMeasurements ? `- Körpermaße erfasst` : ''}

SUPPLEMENTS:
- Einnahmen: ${dayData.supplementLog?.length || 0}
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
          { role: 'user', content: userData }
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();

  } catch (error) {
    console.error('❌ Error generating summary:', error);
    
    // Fallback: Einfache Summary ohne OpenAI
    if (type === 'xl') {
      return `📊 ${dayData.date}: ${kpis.totalCalories} kcal, ${kpis.totalProtein}g Protein. ${dayData.meals?.length || 0} Mahlzeiten erfasst. ${dayData.workouts?.length || 0} Workouts mit ${Math.round(kpis.workoutVolume)}kg Gesamtvolumen. Trainierte Muskelgruppen: ${kpis.workoutMuscleGroups.join(', ') || 'keine'}. Top Lebensmittel: ${kpis.topFoods.map((f: any) => f.food).join(', ') || 'keine spezifiziert'}.`;
    } else {
      return `📊 ${dayData.date}: ${kpis.totalCalories} kcal, ${kpis.totalProtein}g Protein, ${dayData.workouts?.length || 0} Workouts.`;
    }
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