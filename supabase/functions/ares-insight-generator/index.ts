/**
 * ARES Insight Generator - AI-powered pattern discovery
 * Analyzes 7-day user data to find non-obvious correlations
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cors } from '../_shared/ares/cors.ts';
import { json } from '../_shared/ares/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const INSIGHT_SYSTEM_PROMPT = `Du bist ARES, ein analytischer Health-Coach.

DEINE AUFGABE:
Analysiere die User-Daten und finde EIN nicht-offensichtliches Muster oder eine Korrelation.

REGELN:
1. Formuliere als EINE kurze, praegnante Erkenntnis (max 2 Saetze)
2. Sei spezifisch - nutze echte Zahlen aus den Daten wenn moeglich
3. Zeige eine KORRELATION zwischen zwei Metriken, keine reine Statistik
4. Formuliere ueberraschend oder motivierend

BEISPIELE GUTER INSIGHTS:
- "Dein Protein-Timing ist suboptimal. An Trainingstagen ohne Post-Workout Protein sinkt dein Schlaf-Score um 15%."
- "Deine Hydration beeinflusst deine Energie. An Tagen mit mehr als 2.5L Wasser trackst du 23% mehr Schritte."
- "Du erreichst dein Kalorienziel nur an Tagen, an denen du morgens fruehstueckst."
- "Deine besten Schlaftage korrelieren mit Trainingstagen - Sport verbessert deine Erholung um 20%."

VERMEIDE:
- Reine Mathe ("Du bist 500kcal unter Ziel")
- Offensichtliches ("Du hast wenig geschlafen")
- Generisches ("Trink mehr Wasser")
- Lange Erklaerungen

ANTWORTE NUR mit dem Insight-Satz, keine Einfuehrung oder Erklaerung.`;

interface DailyData {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
  hydration_ml: number;
  sleep_hours: number | null;
  sleep_quality: number | null;
  steps: number;
  workout_logged: boolean;
}

function formatDataForAnalysis(dailyData: DailyData[], goals: any): string {
  if (!dailyData || dailyData.length === 0) {
    return `Keine Daten fuer die letzten 7 Tage verfuegbar. Erstelle einen motivierenden Insight ueber die Wichtigkeit von taeglichem Tracking.`;
  }

  const tableRows = dailyData.map(day => {
    const calorieStatus = day.total_calories && goals?.calories 
      ? `${day.total_calories}/${goals.calories}` 
      : day.total_calories || '-';
    const proteinStatus = day.total_protein ? `${day.total_protein}g` : '-';
    const hydration = day.hydration_ml ? `${(day.hydration_ml / 1000).toFixed(1)}L` : '-';
    const sleep = day.sleep_hours ? `${day.sleep_hours}h` : '-';
    const steps = day.steps ? day.steps.toLocaleString('de-DE') : '-';
    const training = day.workout_logged ? 'Ja' : 'Nein';
    
    return `| ${day.date} | ${calorieStatus} | ${proteinStatus} | ${hydration} | ${sleep} | ${steps} | ${training} |`;
  }).join('\n');

  // Calculate aggregates for context
  const daysWithCalories = dailyData.filter(d => d.total_calories > 0);
  const daysWithProtein = dailyData.filter(d => d.total_protein > 0);
  const daysWithSleep = dailyData.filter(d => d.sleep_hours);
  const daysWithSteps = dailyData.filter(d => d.steps > 0);
  
  const avgCalories = daysWithCalories.length > 0 
    ? daysWithCalories.reduce((sum, d) => sum + d.total_calories, 0) / daysWithCalories.length 
    : 0;
  const avgProtein = daysWithProtein.length > 0
    ? daysWithProtein.reduce((sum, d) => sum + d.total_protein, 0) / daysWithProtein.length
    : 0;
  const avgSleep = daysWithSleep.length > 0
    ? daysWithSleep.reduce((sum, d) => sum + (d.sleep_hours || 0), 0) / daysWithSleep.length
    : 0;
  const avgSteps = daysWithSteps.length > 0
    ? daysWithSteps.reduce((sum, d) => sum + d.steps, 0) / daysWithSteps.length
    : 0;
  const trainingDays = dailyData.filter(d => d.workout_logged).length;

  return `## USER DATEN (letzte 7 Tage)

| Datum | Kalorien | Protein | Wasser | Schlaf | Schritte | Training |
|-------|----------|---------|--------|--------|----------|----------|
${tableRows}

## DURCHSCHNITTE
- Kalorien: ${Math.round(avgCalories)} kcal/Tag
- Protein: ${Math.round(avgProtein)}g/Tag
- Schlaf: ${avgSleep.toFixed(1)}h/Nacht
- Schritte: ${Math.round(avgSteps).toLocaleString('de-DE')}/Tag
- Trainingstage: ${trainingDays} von ${dailyData.length}

## ZIELE
- Kalorien-Ziel: ${goals?.calories || 'nicht gesetzt'} kcal
- Protein-Ziel: ${goals?.protein || 'nicht gesetzt'}g
- Wasser-Ziel: ${goals?.fluid_goal_ml ? (goals.fluid_goal_ml / 1000).toFixed(1) + 'L' : 'nicht gesetzt'}

## AUFGABE
Finde eine nicht-offensichtliche Korrelation zwischen diesen Metriken. Welches Muster faellt dir auf?`;
}

serve(async (req) => {
  // Handle CORS
  const preflightResponse = cors.preflight(req);
  if (preflightResponse) return preflightResponse;

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, { status: 401, headers: cors.headers() });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json({ error: 'Invalid token' }, { status: 401, headers: cors.headers() });
    }

    // Use service role for data access
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Calculate date range (last 7 days)
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    // Fetch data from actual tables in parallel
    const [mealsRes, fluidsRes, sleepRes, workoutsRes, goalsRes] = await Promise.all([
      // Meals - aggregate nutrition per day
      adminClient
        .from('meals')
        .select('date, calories, protein, carbs, fats')
        .eq('user_id', user.id)
        .gte('date', sevenDaysAgoStr)
        .lte('date', todayStr),
      
      // Fluids - aggregate hydration per day
      adminClient
        .from('user_fluids')
        .select('date, amount_ml')
        .eq('user_id', user.id)
        .gte('date', sevenDaysAgoStr)
        .lte('date', todayStr),
      
      // Sleep logs
      adminClient
        .from('sleep_logs')
        .select('date, hours, quality_score')
        .eq('user_id', user.id)
        .gte('date', sevenDaysAgoStr)
        .lte('date', todayStr),
      
      // Workouts
      adminClient
        .from('workouts')
        .select('date, did_workout, steps')
        .eq('user_id', user.id)
        .gte('date', sevenDaysAgoStr)
        .lte('date', todayStr),
      
      // Goals
      adminClient
        .from('daily_goals')
        .select('calories, protein, fluid_goal_ml')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    // Aggregate data by date
    const dailyMap = new Map<string, DailyData>();

    // Initialize dates for last 7 days
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap.set(dateStr, {
        date: dateStr,
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fats: 0,
        hydration_ml: 0,
        sleep_hours: null,
        sleep_quality: null,
        steps: 0,
        workout_logged: false
      });
    }

    // Aggregate meals by date
    if (mealsRes.data) {
      for (const meal of mealsRes.data) {
        if (!meal.date) continue;
        const existing = dailyMap.get(meal.date);
        if (existing) {
          existing.total_calories += meal.calories || 0;
          existing.total_protein += meal.protein || 0;
          existing.total_carbs += meal.carbs || 0;
          existing.total_fats += meal.fats || 0;
        }
      }
    }

    // Aggregate fluids by date
    if (fluidsRes.data) {
      for (const fluid of fluidsRes.data) {
        if (!fluid.date) continue;
        const existing = dailyMap.get(fluid.date);
        if (existing) {
          existing.hydration_ml += fluid.amount_ml || 0;
        }
      }
    }

    // Add sleep data
    if (sleepRes.data) {
      for (const sleep of sleepRes.data) {
        if (!sleep.date) continue;
        const existing = dailyMap.get(sleep.date);
        if (existing) {
          existing.sleep_hours = sleep.hours;
          existing.sleep_quality = sleep.quality_score;
        }
      }
    }

    // Add workout data
    if (workoutsRes.data) {
      for (const workout of workoutsRes.data) {
        if (!workout.date) continue;
        const existing = dailyMap.get(workout.date);
        if (existing) {
          existing.workout_logged = existing.workout_logged || workout.did_workout || false;
          existing.steps = Math.max(existing.steps, workout.steps || 0);
        }
      }
    }

    // Convert to array sorted by date desc
    const dailyData = Array.from(dailyMap.values())
      .sort((a, b) => b.date.localeCompare(a.date));

    const goals = goalsRes.data;

    // Format data for LLM analysis
    const dataContext = formatDataForAnalysis(dailyData, goals);

    // Call Gemini Flash for quick insight generation
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: INSIGHT_SYSTEM_PROMPT },
          { role: 'user', content: dataContext }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      // Fallback insights when AI is unavailable
      const fallbackInsights = [
        "Konsistenz schlägt Perfektion. Schon 3 Tage in Folge Tracking machen einen messbaren Unterschied.",
        "Dein Körper ist ein Spiegel deiner Gewohnheiten. Kleine tägliche Wins summieren sich zu großen Ergebnissen.",
        "Die besten Fortschritte entstehen, wenn Ernährung, Training und Schlaf synchronisiert sind.",
        "Hydration beeinflusst alles - von Energie bis Fokus. 2,5L täglich sind dein Fundament.",
        "Post-Workout Protein innerhalb von 60 Minuten maximiert deine Gains.",
      ];
      const randomInsight = fallbackInsights[Math.floor(Math.random() * fallbackInsights.length)];
      
      if (aiResponse.status === 429 || aiResponse.status === 402) {
        // Return fallback instead of error
        return json({ 
          insight: randomInsight,
          generated_at: new Date().toISOString(),
          data_days: dailyData.length,
          fallback: true,
        }, { headers: cors.headers() });
      }
      
      throw new Error('AI generation failed');
    }

    const aiResult = await aiResponse.json();
    const insight = aiResult.choices?.[0]?.message?.content?.trim();

    if (!insight) {
      throw new Error('No insight generated');
    }

    // Log the insight generation for analytics (fire-and-forget, don't await)
    try {
      await adminClient.from('ares_events').insert({
        user_id: user.id,
        component: 'insight-generator',
        event: 'insight_generated',
        meta: { 
          insight_length: insight.length,
          data_days: dailyData.length,
        }
      });
    } catch (logError) {
      // Non-blocking - just log the error
      console.warn('Failed to log event:', logError);
    }

    return json({ 
      insight,
      generated_at: new Date().toISOString(),
      data_days: dailyData.length,
    }, { headers: cors.headers() });

  } catch (error) {
    console.error('Insight generator error:', error);
    return json({ 
      error: 'Insight generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: cors.headers() });
  }
});
