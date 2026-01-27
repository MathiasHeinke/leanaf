/**
 * ARES Nutrition Advisor - AI-powered personalized meal suggestions & evaluation
 * Considers macros, protocol phase, GLP-1 status, training, bloodwork, and time of day
 * Supports two modes: suggestion (no input) and evaluation (with user idea)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cors } from '../_shared/ares/cors.ts';
import { json } from '../_shared/ares/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

interface Recipe {
  ingredients: string[];
  steps: string[];
  effort: 'low' | 'medium' | 'high';
  cost: 'low' | 'medium' | 'high';
}

interface MealSuggestion {
  title: string;
  reason: string;
  macros: { kcal: number; protein: number; carbs: number; fats: number };
  prepTime: string;
  tags: string[];
  recipe?: Recipe;
}

interface MealEvaluation {
  type: 'evaluation';
  userIdea: string;
  verdict: 'optimal' | 'ok' | 'suboptimal';
  reason: string;
  macros: { kcal: number; protein: number; carbs: number; fats: number };
  optimization: string;
  tags: string[];
  recipe?: Recipe;
  alternatives: MealSuggestion[];
}

interface BloodworkData {
  hba1c: number | null;
  fastingGlucose: number | null;
  triglycerides: number | null;
  insulin: number | null;
  insulinSensitivity: 'optimal' | 'normal' | 'reduced' | 'unknown';
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
  bloodwork: BloodworkData;
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

function calculateInsulinSensitivity(
  glucose: number | null, 
  insulin: number | null
): BloodworkData['insulinSensitivity'] {
  if (!glucose || !insulin) return 'unknown';
  const homaIr = (glucose * insulin) / 405;
  if (homaIr < 1.0) return 'optimal';
  if (homaIr < 2.5) return 'normal';
  return 'reduced';
}

function buildBloodworkContext(bloodwork: BloodworkData): string {
  const lines: string[] = [];
  
  if (bloodwork.hba1c !== null) {
    lines.push(`- HbA1c: ${bloodwork.hba1c}%${bloodwork.hba1c > 5.7 ? ' (erhoht - High-GI vermeiden!)' : ''}`);
  }
  if (bloodwork.triglycerides !== null) {
    lines.push(`- Triglyceride: ${bloodwork.triglycerides} mg/dL${bloodwork.triglycerides > 150 ? ' (erhoht - weniger Fruktose/raffinierte Carbs!)' : ''}`);
  }
  if (bloodwork.fastingGlucose !== null) {
    lines.push(`- Nuechtern-Glukose: ${bloodwork.fastingGlucose} mg/dL`);
  }
  if (bloodwork.insulinSensitivity !== 'unknown') {
    lines.push(`- Insulin-Sensitivitaet: ${bloodwork.insulinSensitivity}`);
  }
  
  if (lines.length === 0) {
    return 'Keine Blutwerte verfuegbar - allgemeine Low-GI Empfehlungen';
  }
  
  return lines.join('\n');
}

function buildEvaluationPrompt(context: NutritionContext, userIdea: string): string {
  const mealTimingLabels: Record<string, string> = {
    'breakfast': 'Fruehstueck',
    'lunch': 'Mittagessen',
    'snack': 'Nachmittags-Snack',
    'dinner': 'Abendessen',
    'late_night': 'Spaeter Snack'
  };

  const glp1Info = context.glp1Active 
    ? `GLP-1/Reta AKTIV (letzte Dosis vor ${context.daysSinceLastDose || '?'} Tagen)`
    : 'GLP-1/Reta nicht aktiv';

  const trainingInfo = context.trainedToday
    ? `HEUTE TRAINIERT (${context.trainingType || 'Training'}) - schnelle Carbs erlaubt!`
    : 'Kein Training heute';

  return `Du bist LESTER - wissenschaftlicher Ernaehrungsberater im ARES-System.

STIL (KRITISCH):
- KURZ: 1-2 Saetze max
- Fakt + Konsequenz (z.B. "Weissmehl + Banane = Insulin-Spike. Nicht ideal bei HbA1c 5.8%.")
- KEINE Phrasen wie "Okay pass auf", "Hoer zu", "Die Wissenschaft sagt"
- Direkt zur Sache, wissenschaftlich fundiert

BLUTWERTE DES USERS:
${buildBloodworkContext(context.bloodwork)}

METABOLISCHE REGELN:
1. HbA1c > 5.7%: Warne vor High-GI Carbs (Weissmehl, reife Banane, Zucker)
2. Triglyceride > 150: Weniger Fruktose, raffinierte Kohlenhydrate
3. Reduzierte Insulin-Sensitivitaet: Low-GI bevorzugen, Protein vor Carbs
4. POST-WORKOUT AUSNAHME: Nach Training sind schnelle Carbs akzeptabel
5. GLP-1/Reta: Kleine Portionen, leicht verdaulich

KONTEXT:
- Uhrzeit: ${context.currentHour}:00 (${mealTimingLabels[context.mealTiming]})
- Verbleibende Makros: ${context.remaining.kcal} kcal, ${context.remaining.protein}g P, ${context.remaining.carbs}g C, ${context.remaining.fats}g F
- ${trainingInfo}
- ${glp1Info}

USER-IDEE ZUM BEWERTEN: "${userIdea}"

AUFGABE:
1. BEWERTE die Idee: optimal / ok / suboptimal
2. ERKLAERE kurz WARUM (1-2 Saetze, wissenschaftlich)
3. SCHAETZE die Makros realistisch
4. GIB eine konkrete OPTIMIERUNG (z.B. "+Quark = +18g Protein, stabiler BZ")
5. GENERIERE 2-3 BESSERE Alternativen

ANTWORTE NUR mit JSON:
{
  "type": "evaluation",
  "userIdea": "${userIdea}",
  "verdict": "ok",
  "reason": "Schnelle Energie, aber Insulin-Spike bei HbA1c 5.8% suboptimal.",
  "macros": { "kcal": 280, "protein": 6, "carbs": 52, "fats": 4 },
  "optimization": "+Quark = stabiler Blutzucker, +18g Protein",
  "tags": ["high-gi", "low-protein"],
  "recipe": {
    "ingredients": ["1 reife Banane", "1 Broetchen (60g)"],
    "steps": ["Broetchen aufschneiden", "Banane essen"],
    "effort": "low",
    "cost": "low"
  },
  "alternatives": [
    {
      "title": "Vollkorn-Quark-Bowl mit Banane",
      "reason": "Casein fuer stabile Energie",
      "macros": { "kcal": 350, "protein": 28, "carbs": 38, "fats": 8 },
      "prepTime": "5 min",
      "tags": ["optimal", "high-protein", "stable-glucose"],
      "recipe": {
        "ingredients": ["200g Magerquark", "1 Banane", "40g Vollkorn-Haferflocken", "10g Nuesse"],
        "steps": ["Quark in Schale", "Banane schneiden", "Haferflocken unterheben", "Nuesse drauf"],
        "effort": "low",
        "cost": "low"
      }
    }
  ]
}

REZEPT-REGELN (KRITISCH - fuer JEDE Mahlzeit inkl. Alternativen):
- "recipe.ingredients": 4-8 Zutaten mit Mengen
- "recipe.steps": 2-5 kurze Schritte (max 8 Worte je)
- "recipe.effort": "low" (<10 min) | "medium" (10-20 min) | "high" (>20 min)
- "recipe.cost": "low" (<3 EUR) | "medium" (3-6 EUR) | "high" (>6 EUR)`;
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

  // Build bloodwork priority rules
  const bloodworkRules: string[] = [];
  if (context.bloodwork.hba1c !== null && context.bloodwork.hba1c > 5.7) {
    bloodworkRules.push('PRIORISIERE Low-GI Optionen (HbA1c erhoht)');
  }
  if (context.bloodwork.triglycerides !== null && context.bloodwork.triglycerides > 150) {
    bloodworkRules.push('MEIDE Fruktose/raffinierte Carbs (Triglyceride erhoht)');
  }
  if (context.bloodwork.insulinSensitivity === 'reduced') {
    bloodworkRules.push('PROTEIN VOR CARBS (reduzierte Insulin-Sensitivitaet)');
  }

  return `Du bist der ARES Nutrition Advisor - ein Elite-Ernaehrungsberater fuer optimierte Koerperzusammensetzung.

KONTEXT-FAKTOREN (priorisiert):
1. VERBLEIBENDE MAKROS: ${context.remaining.kcal} kcal, ${context.remaining.protein}g Protein, ${context.remaining.carbs}g Carbs, ${context.remaining.fats}g Fett
2. TAGESZEIT: ${context.currentHour}:00 Uhr (${mealTimingLabels[context.mealTiming]})
3. ${glp1Info}
4. ${trainingInfo}
5. PROTOKOLL-PHASE: Phase ${context.currentPhase} (${getPhaseDescription(context.currentPhase)})
6. ZIEL: ${context.goal} | Aktivitaetslevel: ${context.activityLevel}
${context.dietaryRestrictions.length > 0 ? `7. EINSCHRAENKUNGEN: ${context.dietaryRestrictions.join(', ')}` : ''}

BLUTWERT-KONTEXT:
${buildBloodworkContext(context.bloodwork)}
${bloodworkRules.length > 0 ? '\nBLUTWERT-REGELN:\n' + bloodworkRules.map(r => `- ${r}`).join('\n') : ''}

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
    "tags": ["quick", "high-protein", "glp1-friendly"],
    "recipe": {
      "ingredients": ["200g Magerquark", "1 Banane", "30g Haferflocken", "10g Honig"],
      "steps": ["Quark in Schale geben", "Banane schneiden", "Haferflocken drauf", "Honig drueber"],
      "effort": "low",
      "cost": "low"
    }
  }
]

REZEPT-REGELN:
- "recipe.ingredients": 4-8 Zutaten mit Mengen
- "recipe.steps": 2-5 kurze Schritte (max 8 Worte je)
- "recipe.effort": "low" (<10 min) | "medium" (10-20 min) | "high" (>20 min)
- "recipe.cost": "low" (<3 EUR) | "medium" (3-6 EUR) | "high" (>6 EUR)`;
}

// Static fallback suggestions when AI is unavailable
function generateFallbackSuggestions(context: NutritionContext): MealSuggestion[] {
  const pool: MealSuggestion[] = [
    {
      title: 'Protein-Shake mit Beeren',
      reason: 'Schneller Protein-Hit ohne Voellegefuehl',
      macros: { kcal: 280, protein: 35, carbs: 25, fats: 6 },
      prepTime: '3 min',
      tags: ['quick', 'high-protein'],
      recipe: {
        ingredients: ['30g Whey Protein', '150ml Milch', '50g Beeren', 'Eiswuerfel'],
        steps: ['Alles in Shaker geben', 'Kraeftig schuetteln', 'Sofort trinken'],
        effort: 'low',
        cost: 'low'
      }
    },
    {
      title: 'Griechischer Joghurt mit Nuessen',
      reason: 'Casein fuer langanhaltende Saettigung',
      macros: { kcal: 320, protein: 28, carbs: 18, fats: 16 },
      prepTime: '2 min',
      tags: ['quick', 'snack'],
      recipe: {
        ingredients: ['200g Griechischer Joghurt', '20g Walnuesse', '10g Honig'],
        steps: ['Joghurt in Schale', 'Nuesse hacken', 'Alles mischen'],
        effort: 'low',
        cost: 'low'
      }
    },
    {
      title: 'Haettenkäse mit Gurke',
      reason: 'Leicht verdaulich, hoher Proteingehalt',
      macros: { kcal: 180, protein: 24, carbs: 8, fats: 5 },
      prepTime: '5 min',
      tags: ['quick', 'glp1-friendly', 'stable-glucose'],
      recipe: {
        ingredients: ['200g Haettenkäse', '1/2 Gurke', 'Salz, Pfeffer', 'Dill optional'],
        steps: ['Gurke in Scheiben schneiden', 'Mit Haettenkäse mischen', 'Wuerzen'],
        effort: 'low',
        cost: 'low'
      }
    },
    {
      title: 'Lachs mit Brokkoli',
      reason: 'Omega-3 fuer Recovery, Protein fuer Muskeln',
      macros: { kcal: 450, protein: 42, carbs: 15, fats: 24 },
      prepTime: '20 min',
      tags: ['optimal', 'post-workout'],
      recipe: {
        ingredients: ['150g Lachsfilet', '200g Brokkoli', '1 EL Olivenoel', 'Zitrone, Salz'],
        steps: ['Brokkoli daempfen', 'Lachs in Pfanne braten', 'Mit Zitrone servieren'],
        effort: 'medium',
        cost: 'high'
      }
    },
    {
      title: 'Haehnchenbrust-Salat',
      reason: 'Volumen bei wenigen Kalorien, hochsaettigend',
      macros: { kcal: 380, protein: 45, carbs: 12, fats: 18 },
      prepTime: '15 min',
      tags: ['optimal', 'deficit-friendly'],
      recipe: {
        ingredients: ['150g Haehnchenbrust', 'Gemischter Salat', 'Tomaten', '2 EL Olivenoel'],
        steps: ['Haehnchen wuerzen und braten', 'Salat anrichten', 'Haehnchen drauf'],
        effort: 'medium',
        cost: 'medium'
      }
    },
    {
      title: 'Rinderhack mit Gemuese',
      reason: 'Protein-Boost mit Mikronährstoffen',
      macros: { kcal: 420, protein: 38, carbs: 18, fats: 22 },
      prepTime: '18 min',
      tags: ['creative', 'muscle-building'],
      recipe: {
        ingredients: ['150g Rinderhack', 'Zucchini', 'Paprika', 'Zwiebel', 'Olivenoel'],
        steps: ['Gemuese wuerfeln', 'Hack anbraten', 'Gemuese dazu', 'Wuerzen'],
        effort: 'medium',
        cost: 'medium'
      }
    },
    {
      title: 'Ei-Omelette mit Spinat',
      reason: 'Schnelles Protein, keto-freundlich',
      macros: { kcal: 340, protein: 28, carbs: 6, fats: 24 },
      prepTime: '10 min',
      tags: ['quick', 'low-carb', 'stable-glucose'],
      recipe: {
        ingredients: ['3 Eier', '50g Spinat', '30g Kaese', 'Butter'],
        steps: ['Eier verquirlen', 'In Butter braten', 'Spinat/Kaese rein', 'Zusammenfalten'],
        effort: 'low',
        cost: 'low'
      }
    },
    {
      title: 'Thunfisch-Avocado Bowl',
      reason: 'Gesunde Fette und Protein',
      macros: { kcal: 390, protein: 32, carbs: 14, fats: 26 },
      prepTime: '8 min',
      tags: ['creative', 'omega-3'],
      recipe: {
        ingredients: ['1 Dose Thunfisch', '1/2 Avocado', 'Zitrone', 'Salz, Pfeffer'],
        steps: ['Thunfisch abtropfen', 'Avocado wuerfeln', 'Alles mischen', 'Zitrone drauf'],
        effort: 'low',
        cost: 'medium'
      }
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

// Fallback evaluation when AI is unavailable
function generateFallbackEvaluation(userIdea: string, context: NutritionContext): MealEvaluation {
  return {
    type: 'evaluation',
    userIdea,
    verdict: 'ok',
    reason: 'Bewertung derzeit nicht verfuegbar. Allgemeine Empfehlung: Protein-reiche Optionen bevorzugen.',
    macros: { kcal: 300, protein: 15, carbs: 30, fats: 10 },
    optimization: '+Protein-Quelle hinzufuegen',
    tags: ['fallback'],
    recipe: {
      ingredients: ['Wie angegeben'],
      steps: ['Zubereitung nach Belieben'],
      effort: 'low',
      cost: 'low'
    },
    alternatives: generateFallbackSuggestions(context).slice(0, 2)
  };
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

    // Parse request body for userIdea
    const body = await req.json().catch(() => ({}));
    const userIdea = (body.userIdea as string | undefined)?.trim();
    const isEvaluationMode = !!userIdea;

    // Use service role for data access
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();
    const mealTiming = getMealTiming(currentHour);

    // Fetch all context data in parallel (including bloodwork)
    const [
      profileRes,
      goalsRes,
      mealsRes,
      protocolRes,
      retaRes,
      trainingRes,
      bloodworkRes
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
        .maybeSingle(),
      
      // Latest bloodwork
      adminClient
        .from('user_bloodwork')
        .select('hba1c, fasting_glucose, triglycerides, insulin, test_date')
        .eq('user_id', user.id)
        .order('test_date', { ascending: false })
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

    // Parse bloodwork
    const bloodworkData = bloodworkRes.data;
    const bloodwork: BloodworkData = {
      hba1c: bloodworkData?.hba1c ?? null,
      fastingGlucose: bloodworkData?.fasting_glucose ?? null,
      triglycerides: bloodworkData?.triglycerides ?? null,
      insulin: bloodworkData?.insulin ?? null,
      insulinSensitivity: calculateInsulinSensitivity(
        bloodworkData?.fasting_glucose ?? null,
        bloodworkData?.insulin ?? null
      )
    };

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
      dietaryRestrictions,
      bloodwork
    };

    // Build prompt based on mode
    const systemPrompt = isEvaluationMode 
      ? buildEvaluationPrompt(context, userIdea!)
      : buildSystemPrompt(context);
    
    const userPrompt = isEvaluationMode
      ? `Bewerte die Mahlzeit-Idee: "${userIdea}"`
      : 'Generiere 3 passende Mahlzeiten-Vorschlaege basierend auf dem Kontext.';

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
        max_tokens: isEvaluationMode ? 1000 : 800,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      // Fallback when AI is unavailable
      if (aiResponse.status === 429 || aiResponse.status === 402) {
        if (isEvaluationMode) {
          return json(generateFallbackEvaluation(userIdea!, context), { headers: cors.headers() });
        }
        return json({ 
          type: 'suggestions',
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
      throw new Error('No content generated');
    }

    // Parse JSON response (handle potential markdown code blocks)
    let parsedResponse: MealSuggestion[] | MealEvaluation;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      if (isEvaluationMode) {
        return json(generateFallbackEvaluation(userIdea!, context), { headers: cors.headers() });
      }
      parsedResponse = generateFallbackSuggestions(context);
    }

    // Log the generation for analytics (fire-and-forget)
    try {
      await adminClient.from('ares_events').insert({
        user_id: user.id,
        component: 'nutrition-advisor',
        event: isEvaluationMode ? 'evaluation_generated' : 'suggestions_generated',
        meta: { 
          mode: isEvaluationMode ? 'evaluation' : 'suggestions',
          user_idea: userIdea || null,
          remaining_kcal: remaining.kcal,
          glp1_active: glp1Active,
          trained_today: trainedToday,
          phase: currentPhase,
          meal_timing: mealTiming,
          has_bloodwork: bloodwork.hba1c !== null,
        }
      });
    } catch (logError) {
      console.warn('Failed to log event:', logError);
    }

    // Return response based on mode
    if (isEvaluationMode) {
      // Ensure it's a valid evaluation response
      const evaluation = parsedResponse as MealEvaluation;
      if (!evaluation.verdict || !evaluation.reason) {
        return json(generateFallbackEvaluation(userIdea!, context), { headers: cors.headers() });
      }
      
      return json({
        ...evaluation,
        type: 'evaluation',
        userIdea,
        generated_at: new Date().toISOString()
      }, { headers: cors.headers() });
    }

    // Suggestion mode
    const suggestions = Array.isArray(parsedResponse) ? parsedResponse : generateFallbackSuggestions(context);
    
    return json({ 
      type: 'suggestions',
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
