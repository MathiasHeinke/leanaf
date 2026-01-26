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

interface DailyLog {
  date: string;
  total_calories: number | null;
  total_protein: number | null;
  total_carbs: number | null;
  total_fats: number | null;
  hydration_ml: number | null;
  sleep_hours: number | null;
  sleep_quality: string | null;
  steps: number | null;
  workout_logged: boolean;
  calorie_goal: number | null;
  protein_goal: number | null;
}

function formatLogsForAnalysis(logs: DailyLog[], goals: any): string {
  if (!logs || logs.length === 0) {
    return `Keine Daten fuer die letzten 7 Tage verfuegbar. Erstelle einen motivierenden Insight ueber die Wichtigkeit von taeglichem Tracking.`;
  }

  const tableRows = logs.map(log => {
    const calorieStatus = log.total_calories && log.calorie_goal 
      ? `${log.total_calories}/${log.calorie_goal}` 
      : log.total_calories || '-';
    const proteinStatus = log.total_protein ? `${log.total_protein}g` : '-';
    const hydration = log.hydration_ml ? `${(log.hydration_ml / 1000).toFixed(1)}L` : '-';
    const sleep = log.sleep_hours ? `${log.sleep_hours}h` : '-';
    const steps = log.steps ? log.steps.toLocaleString('de-DE') : '-';
    const training = log.workout_logged ? 'Ja' : 'Nein';
    
    return `| ${log.date} | ${calorieStatus} | ${proteinStatus} | ${hydration} | ${sleep} | ${steps} | ${training} |`;
  }).join('\n');

  // Calculate some aggregates for context
  const avgCalories = logs.filter(l => l.total_calories).reduce((sum, l) => sum + (l.total_calories || 0), 0) / logs.filter(l => l.total_calories).length || 0;
  const avgProtein = logs.filter(l => l.total_protein).reduce((sum, l) => sum + (l.total_protein || 0), 0) / logs.filter(l => l.total_protein).length || 0;
  const avgSleep = logs.filter(l => l.sleep_hours).reduce((sum, l) => sum + (l.sleep_hours || 0), 0) / logs.filter(l => l.sleep_hours).length || 0;
  const avgSteps = logs.filter(l => l.steps).reduce((sum, l) => sum + (l.steps || 0), 0) / logs.filter(l => l.steps).length || 0;
  const trainingDays = logs.filter(l => l.workout_logged).length;

  return `## USER DATEN (letzte 7 Tage)

| Datum | Kalorien | Protein | Wasser | Schlaf | Schritte | Training |
|-------|----------|---------|--------|--------|----------|----------|
${tableRows}

## DURCHSCHNITTE
- Kalorien: ${Math.round(avgCalories)} kcal/Tag
- Protein: ${Math.round(avgProtein)}g/Tag
- Schlaf: ${avgSleep.toFixed(1)}h/Nacht
- Schritte: ${Math.round(avgSteps).toLocaleString('de-DE')}/Tag
- Trainingstage: ${trainingDays} von ${logs.length}

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

    // Fetch daily logs
    const { data: logs, error: logsError } = await adminClient
      .from('daily_logs')
      .select('date, total_calories, total_protein, total_carbs, total_fats, sleep_hours, sleep_quality, steps, workout_logged')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgoStr)
      .order('date', { ascending: false });

    if (logsError) {
      console.error('Error fetching logs:', logsError);
    }

    // Fetch hydration data separately
    const { data: hydrationLogs } = await adminClient
      .from('hydration_log')
      .select('date, amount_ml')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgoStr);

    // Aggregate hydration by date
    const hydrationByDate: Record<string, number> = {};
    if (hydrationLogs) {
      for (const h of hydrationLogs) {
        hydrationByDate[h.date] = (hydrationByDate[h.date] || 0) + h.amount_ml;
      }
    }

    // Merge hydration into logs
    const enrichedLogs = (logs || []).map(log => ({
      ...log,
      hydration_ml: hydrationByDate[log.date] || null,
      calorie_goal: null, // Will be filled from goals
      protein_goal: null,
    }));

    // Fetch user goals
    const { data: goals } = await adminClient
      .from('daily_goals')
      .select('calories, protein, fluid_goal_ml')
      .eq('user_id', user.id)
      .single();

    // Format data for LLM analysis
    const dataContext = formatLogsForAnalysis(enrichedLogs, goals);

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
        temperature: 0.7, // Some creativity for varied insights
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return json({ error: 'Rate limit exceeded. Bitte versuche es spaeter erneut.' }, { status: 429, headers: cors.headers() });
      }
      if (aiResponse.status === 402) {
        return json({ error: 'AI Credits aufgebraucht.' }, { status: 402, headers: cors.headers() });
      }
      
      throw new Error('AI generation failed');
    }

    const aiResult = await aiResponse.json();
    const insight = aiResult.choices?.[0]?.message?.content?.trim();

    if (!insight) {
      throw new Error('No insight generated');
    }

    // Log the insight generation for analytics
    await adminClient.from('ares_events').insert({
      user_id: user.id,
      component: 'insight-generator',
      event: 'insight_generated',
      meta: { 
        insight_length: insight.length,
        data_days: enrichedLogs.length,
      }
    }).catch(() => {}); // Non-blocking

    return json({ 
      insight,
      generated_at: new Date().toISOString(),
      data_days: enrichedLogs.length,
    }, { headers: cors.headers() });

  } catch (error) {
    console.error('Insight generator error:', error);
    return json({ 
      error: 'Insight generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: cors.headers() });
  }
});
