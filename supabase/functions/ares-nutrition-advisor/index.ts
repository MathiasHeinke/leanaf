/**
 * ARES Nutrition Advisor - AI-powered personalized meal suggestions
 * Considers macros, protocol phase, GLP-1 status, training, and time of day
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cors } from '../_shared/ares/cors.ts';
import { json } from '../_shared/ares/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

interface MealSuggestion {
  title: string;
  reason: string;
  macros: { kcal: number; protein: number; carbs: number; fats: number };
  prepTime: string;
  tags: string[];
}

interface NutritionContext {
  currentHour: number;
  mealTiming: 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'late_night';
  consumed: { kcal: number; protein: number; carbs: number; fats: number };
  remaining: { kcal: number; protein: number; carbs: number; fats: number };
  goals: { kcal: number; protein: number; carbs: number; fats: number };
  goal: string;
  activityLevel: string;
  currentPhase: number;
  glp1Active: boolean;
  daysSinceLastDose: number | null;
  trainedToday: boolean;
  trainingType: string | null;
  dietaryRestrictions: string[];
}

function getMealTiming(hour: number): NutritionContext['mealTiming'] {
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 17) return 'snack';
  if (hour >= 17 && hour < 21) return 'dinner';
  return 'late_night';
}

function getPhaseDescription(phase: number): string {
  const descriptions: Record<number, string> = {
    0: 'Fundament - Basis-Gewohnheiten aufbauen',
    1: 'Rekomposition - aktives Kaloriendefizit fuer Fettabbau mit Muskelerhalt',
    2: 'Finetuning - Optimierung der Koerperzusammensetzung',
    3: 'Longevity - Langzeit-Erhaltung und Gesundheit'
  };
  return descriptions[phase] || 'Phase unbekannt';
}

function buildSystemPrompt(context: NutritionContext): string {
  const mealTimingLabels: Record<string, string> = {
    'breakfast': 'Fruehstueck',
    'lunch': 'Mittagessen',
    'snack': 'Nachmittags-Snack',
    'dinner': 'Abendessen',
    'late_night': 'Spaeter Snack'
  };

  const glp1Info = context.glp1Active 
    ? `GLP-1/Reta AKTIV (letzte Dosis vor ${context.daysSinceLastDose || '?'} Tagen) - reduzierter Appetit, bevorzuge leicht verdauliche, naehrstoffdichte Optionen in kleineren Portionen`
    : 'GLP-1/Reta nicht aktiv';

  const trainingInfo = context.trainedToday
    ? `HEUTE TRAINIERT (${context.trainingType || 'Training'}). Post-Workout Ernaehrung priorisieren: schnell absorbierbares Protein + moderate Kohlenhydrate fuer Regeneration.`
    : 'Kein Training heute';

  return `Du bist der ARES Nutrition Advisor - ein Elite-Ernaehrungsberater fuer optimierte Koerperzusammensetzung.

KONTEXT-FAKTOREN (priorisiert):
1. VERBLEIBENDE MAKROS: ${context.remaining.kcal} kcal, ${context.remaining.protein}g Protein, ${context.remaining.carbs}g Carbs, ${context.remaining.fats}g Fett
2. TAGESZEIT: ${context.currentHour}:00 Uhr (${mealTimingLabels[context.mealTiming]})
3. ${glp1Info}
4. ${trainingInfo}
5. PROTOKOLL-PHASE: Phase ${context.currentPhase} (${getPhaseDescription(context.currentPhase)})
6. ZIEL: ${context.goal} | Aktivitaetslevel: ${context.activityLevel}
${context.dietaryRestrictions.length > 0 ? `7. EINSCHRAENKUNGEN: ${context.dietaryRestrictions.join(', ')}` : ''}

REGELN:
1. Vorschlaege MUESSEN die verbleibenden Makros respektieren (nicht ueberschreiten!)
2. Bei GLP-1-Nutzung: Kleinere Portionen, leicht verdaulich, hohe Naehrstoffdichte
3. Post-Workout (heute trainiert): Schnell absorbierbares Protein + moderate Carbs
4. Abends (nach 20 Uhr): Casein-lastig, weniger Carbs, kein Voellegefuehl
5. Phase 0/1 Defizit: Hochvolumige, saettigende Optionen mit viel Protein
6. Phase 2/3 Maintenance: Mehr Flexibilitaet, darf genussvoller sein

VARIIERE die 3 Vorschlaege:
- Option 1: SCHNELL (< 10 min Zubereitung) - fuer Zeitdruck
- Option 2: OPTIMAL (beste Makro-Verteilung) - perfekt abgestimmt
- Option 3: KREATIV (ueberraschend, aber passend) - Abwechslung

ANTWORTE NUR mit JSON-Array, keine Erklaerung:
[
  {
    "title": "Griechische Quark-Bowl",
    "reason": "Leicht verdaulich nach Reta, trifft dein Protein-Ziel perfekt",
    "macros": { "kcal": 320, "protein": 35, "carbs": 18, "fats": 12 },
    "prepTime": "5 min",
    "tags": ["quick", "high-protein", "glp1-friendly"]
  }
]`;
}

// Static fallback suggestions when AI is unavailable
function generateFallbackSuggestions(context: NutritionContext): MealSuggestion[] {
  const pool: MealSuggestion[] = [
    {
      title: 'Protein-Shake mit Beeren',
      reason: 'Schneller Protein-Hit ohne Voellegefuehl',
      macros: { kcal: 280, protein: 35, carbs: 25, fats: 6 },
      prepTime: '3 min',
      tags: ['quick', 'high-protein']
    },
    {
      title: 'Griechischer Joghurt mit Nuessen',
      reason: 'Casein fuer langanhaltende Saettigung',
      macros: { kcal: 320, protein: 28, carbs: 18, fats: 16 },
      prepTime: '2 min',
      tags: ['quick', 'snack']
    },
    {
      title: 'Haettenkäse mit Gurke',
      reason: 'Leicht verdaulich, hoher Proteingehalt',
      macros: { kcal: 180, protein: 24, carbs: 8, fats: 5 },
      prepTime: '5 min',
      tags: ['quick', 'glp1-friendly']
    },
    {
      title: 'Lachs mit Brokkoli',
      reason: 'Omega-3 fuer Recovery, Protein fuer Muskeln',
      macros: { kcal: 450, protein: 42, carbs: 15, fats: 24 },
      prepTime: '20 min',
      tags: ['optimal', 'post-workout']
    },
    {
      title: 'Haehnchenbrust-Salat',
      reason: 'Volumen bei wenigen Kalorien, hochsaettigend',
      macros: { kcal: 380, protein: 45, carbs: 12, fats: 18 },
      prepTime: '15 min',
      tags: ['optimal', 'deficit-friendly']
    },
    {
      title: 'Rinderhack mit Gemuese',
      reason: 'Protein-Boost mit Mikronährstoffen',
      macros: { kcal: 420, protein: 38, carbs: 18, fats: 22 },
      prepTime: '18 min',
      tags: ['creative', 'muscle-building']
    },
    {
      title: 'Ei-Omelette mit Spinat',
      reason: 'Schnelles Protein, keto-freundlich',
      macros: { kcal: 340, protein: 28, carbs: 6, fats: 24 },
      prepTime: '10 min',
      tags: ['quick', 'low-carb']
    },
    {
      title: 'Thunfisch-Avocado Bowl',
      reason: 'Gesunde Fette und Protein',
      macros: { kcal: 390, protein: 32, carbs: 14, fats: 26 },
      prepTime: '8 min',
      tags: ['creative', 'omega-3']
    }
  ];

  // Filter by remaining macros
  const filtered = pool.filter(meal => 
    meal.macros.kcal <= context.remaining.kcal + 100 &&
    meal.macros.protein <= context.remaining.protein + 20
  );

  // If too few options, use the smallest ones from the pool
  const options = filtered.length >= 3 
    ? filtered.slice(0, 3) 
    : pool.sort((a, b) => a.macros.kcal - b.macros.kcal).slice(0, 3);

  return options;
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

    const todayStr = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();
    const mealTiming = getMealTiming(currentHour);

    // Fetch all context data in parallel
    const [
      profileRes,
      goalsRes,
      mealsRes,
      protocolRes,
      retaRes,
      trainingRes
    ] = await Promise.all([
      // Profile
      adminClient
        .from('profiles')
        .select('goal, activity_level, macro_strategy, muscle_maintenance_priority, dietary_restrictions')
        .eq('id', user.id)
        .maybeSingle(),
      
      // Goals
      adminClient
        .from('daily_goals')
        .select('calories, protein, carbs, fats')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      
      // Today's meals
      adminClient
        .from('meals')
        .select('calories, protein, carbs, fats')
        .eq('user_id', user.id)
        .gte('created_at', `${todayStr}T00:00:00`)
        .lte('created_at', `${todayStr}T23:59:59`),
      
      // Protocol status
      adminClient
        .from('user_protocol_status')
        .select('current_phase, protocol_mode')
        .eq('user_id', user.id)
        .maybeSingle(),
      
      // Reta/GLP-1 status (last dose)
      adminClient
        .from('reta_micro_log')
        .select('injected_at, dose_mg')
        .eq('user_id', user.id)
        .order('injected_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      
      // Today's training
      adminClient
        .from('training_sessions')
        .select('training_type, total_duration_minutes')
        .eq('user_id', user.id)
        .eq('session_date', todayStr)
        .limit(1)
        .maybeSingle()
    ]);

    // Parse profile
    const profile = profileRes.data;
    const goal = profile?.goal || 'maintenance';
    const activityLevel = profile?.activity_level || 'moderate';
    const dietaryRestrictions: string[] = profile?.dietary_restrictions || [];

    // Parse goals
    const goals = {
      kcal: goalsRes.data?.calories || 2200,
      protein: goalsRes.data?.protein || 150,
      carbs: goalsRes.data?.carbs || 250,
      fats: goalsRes.data?.fats || 70
    };

    // Calculate consumed macros
    const meals = mealsRes.data || [];
    const consumed = meals.reduce((acc, m) => ({
      kcal: acc.kcal + (m.calories || 0),
      protein: acc.protein + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fats: acc.fats + (m.fats || 0)
    }), { kcal: 0, protein: 0, carbs: 0, fats: 0 });

    // Calculate remaining
    const remaining = {
      kcal: Math.max(0, goals.kcal - consumed.kcal),
      protein: Math.max(0, goals.protein - consumed.protein),
      carbs: Math.max(0, goals.carbs - consumed.carbs),
      fats: Math.max(0, goals.fats - consumed.fats)
    };

    // Parse protocol phase
    const currentPhase = protocolRes.data?.current_phase ?? 0;

    // Parse GLP-1/Reta status
    let glp1Active = false;
    let daysSinceLastDose: number | null = null;
    
    if (retaRes.data?.injected_at) {
      const lastDoseDate = new Date(retaRes.data.injected_at);
      const today = new Date();
      daysSinceLastDose = Math.floor((today.getTime() - lastDoseDate.getTime()) / (1000 * 60 * 60 * 24));
      // GLP-1 effects typically last ~14 days
      glp1Active = daysSinceLastDose < 14;
    }

    // Parse training
    const trainedToday = !!trainingRes.data;
    const trainingType = trainingRes.data?.training_type || null;

    // Build context
    const context: NutritionContext = {
      currentHour,
      mealTiming,
      consumed,
      remaining,
      goals,
      goal,
      activityLevel,
      currentPhase,
      glp1Active,
      daysSinceLastDose,
      trainedToday,
      trainingType,
      dietaryRestrictions
    };

    // Build prompt
    const systemPrompt = buildSystemPrompt(context);
    const userPrompt = `Generiere 3 passende Mahlzeiten-Vorschlaege basierend auf dem Kontext.`;

    // Call Gemini Flash for quick suggestion generation
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      // Fallback suggestions when AI is unavailable
      if (aiResponse.status === 429 || aiResponse.status === 402) {
        return json({ 
          suggestions: generateFallbackSuggestions(context),
          generated_at: new Date().toISOString(),
          fallback: true,
        }, { headers: cors.headers() });
      }
      
      throw new Error('AI generation failed');
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('No suggestions generated');
    }

    // Parse JSON response (handle potential markdown code blocks)
    let suggestions: MealSuggestion[];
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      suggestions = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      suggestions = generateFallbackSuggestions(context);
    }

    // Validate and ensure we have 3 suggestions
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      suggestions = generateFallbackSuggestions(context);
    }

    // Log the suggestion generation for analytics (fire-and-forget)
    try {
      await adminClient.from('ares_events').insert({
        user_id: user.id,
        component: 'nutrition-advisor',
        event: 'suggestions_generated',
        meta: { 
          suggestion_count: suggestions.length,
          remaining_kcal: remaining.kcal,
          glp1_active: glp1Active,
          trained_today: trainedToday,
          phase: currentPhase,
          meal_timing: mealTiming,
        }
      });
    } catch (logError) {
      console.warn('Failed to log event:', logError);
    }

    return json({ 
      suggestions,
      generated_at: new Date().toISOString(),
      context: {
        remaining,
        glp1Active,
        trainedToday,
        mealTiming
      }
    }, { headers: cors.headers() });

  } catch (error) {
    console.error('Nutrition advisor error:', error);
    return json({ 
      error: 'Suggestion generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: cors.headers() });
  }
});
