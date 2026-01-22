import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cors } from '../_shared/ares/cors.ts';
import { newTraceId } from '../_shared/ares/ids.ts';
import { traceStart, traceUpdate, traceDone, traceFail } from '../_shared/ares/trace.ts';
import { decideAresDial, loadUserMoodContext, getRitualContext, getModeDescription, type UserMoodContext, type AresDialResult, type AresMode } from './aresDial.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const json = (status: number, body: any) =>
  new Response(JSON.stringify(body), { 
    status, 
    headers: { 
      ...cors.headers(), 
      'Content-Type': 'application/json' 
    } 
  });

function respond(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers || {});
  Object.entries(cors.headers()).forEach(([k, v]) => headers.set(k, String(v)));
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(body), { ...init, headers });
}

function makeTraceId() {
  return `t_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}${Date.now().toString(36).slice(-4)}`;
}

function serializeErr(e: unknown) {
  const any = e as any;
  return { message: any?.message ?? String(e), stack: any?.stack ?? null, code: any?.code ?? null };
}

async function safeJson(req: Request) {
  const ct = req.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) {
      return await req.json();
    } else if (ct.includes('text/plain')) {
      return { text: await req.text() };
    }
    return {};
  } catch { 
    return {}; 
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPENAI FUNCTION DEFINITIONS FOR ARES TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

const ARES_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_meta_analysis",
      description: "Führt eine ganzheitliche Meta-Analyse der User-Daten durch (Ernährung, Training, Recovery, Mindset). Nutze dies wenn der User einen Überblick oder eine umfassende Bewertung möchte.",
      parameters: {
        type: "object",
        properties: {
          focus_area: {
            type: "string",
            enum: ["all", "nutrition", "training", "recovery", "mindset"],
            description: "Fokusbereich der Analyse"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_workout_plan",
      description: "Erstellt einen personalisierten Trainingsplan basierend auf User-Profil und Zielen. Nutze dies wenn der User nach einem Trainingsplan fragt.",
      parameters: {
        type: "object",
        properties: {
          goal: {
            type: "string",
            enum: ["muscle_building", "fat_loss", "strength", "endurance", "general_fitness"],
            description: "Hauptziel des Trainingsplans"
          },
          days_per_week: {
            type: "number",
            description: "Trainingstage pro Woche (2-6)"
          },
          duration_weeks: {
            type: "number",
            description: "Dauer des Plans in Wochen"
          }
        },
        required: ["goal"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_nutrition_plan",
      description: "Erstellt einen personalisierten Ernährungsplan. Nutze dies wenn der User nach einem Ernährungsplan oder Makros fragt.",
      parameters: {
        type: "object",
        properties: {
          goal: {
            type: "string",
            enum: ["muscle_building", "fat_loss", "maintenance", "performance"],
            description: "Ernährungsziel"
          },
          daily_calories: {
            type: "number",
            description: "Tägliche Kalorien (optional, wird sonst berechnet)"
          },
          meal_count: {
            type: "number",
            description: "Anzahl der Mahlzeiten pro Tag (3-6)"
          },
          diet_type: {
            type: "string",
            enum: ["standard", "low_carb", "keto", "vegetarian", "vegan"],
            description: "Ernährungsform"
          }
        },
        required: ["goal"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_supplement_plan",
      description: "Erstellt einen personalisierten Supplement-Plan. Nutze dies wenn der User nach Supplements, Nahrungsergänzungen oder Vitaminen fragt.",
      parameters: {
        type: "object",
        properties: {
          goal: {
            type: "string",
            enum: ["muscle_building", "fat_loss", "health", "performance", "recovery"],
            description: "Hauptziel der Supplementierung"
          },
          budget: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Budget-Level"
          },
          experience_level: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced"],
            description: "Erfahrungslevel mit Supplements"
          }
        },
        required: ["goal"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_peptide_protocol",
      description: "Erstellt ein Peptid-Protokoll für fortgeschrittene Optimierung. Nutze dies NUR wenn der User explizit nach Peptiden fragt und entsprechendes Wissen zeigt.",
      parameters: {
        type: "object",
        properties: {
          goal: {
            type: "string",
            enum: ["muscle_growth", "fat_loss", "recovery", "anti_aging", "cognitive"],
            description: "Ziel des Peptid-Protokolls"
          },
          experience_level: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced"],
            description: "Erfahrung mit Peptiden"
          }
        },
        required: ["goal"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_user_plans",
      description: "Holt alle aktiven Pläne des Users (Training, Ernährung, Supplements, Peptide). Nutze dies um zu sehen was der User bereits hat.",
      parameters: {
        type: "object",
        properties: {
          plan_type: {
            type: "string",
            enum: ["all", "workout", "nutrition", "supplement", "peptide"],
            description: "Welche Pläne abgerufen werden sollen"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_plan",
      description: "Aktualisiert einen bestehenden Plan. Nutze dies wenn der User Änderungen an einem existierenden Plan möchte.",
      parameters: {
        type: "object",
        properties: {
          plan_id: {
            type: "string",
            description: "ID des zu aktualisierenden Plans"
          },
          plan_type: {
            type: "string",
            enum: ["workout", "nutrition", "supplement", "peptide"],
            description: "Typ des Plans"
          },
          updates: {
            type: "object",
            description: "Änderungen die vorgenommen werden sollen"
          }
        },
        required: ["plan_id", "plan_type", "updates"]
      }
    }
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL EXECUTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function executeToolCall(
  toolName: string, 
  toolArgs: any, 
  userId: string, 
  supaClient: any,
  context: any
): Promise<{ success: boolean; result: any; error?: string }> {
  console.log(`[ARES-TOOL] Executing: ${toolName}`, toolArgs);
  
  try {
    switch (toolName) {
      case 'get_meta_analysis':
        return await handleMetaAnalysis(userId, supaClient, toolArgs, context);
      
      case 'create_workout_plan':
        return await handleCreateWorkoutPlan(userId, supaClient, toolArgs, context);
      
      case 'create_nutrition_plan':
        return await handleCreateNutritionPlan(userId, supaClient, toolArgs, context);
      
      case 'create_supplement_plan':
        return await handleCreateSupplementPlan(userId, supaClient, toolArgs, context);
      
      case 'create_peptide_protocol':
        return await handleCreatePeptideProtocol(userId, supaClient, toolArgs, context);
      
      case 'get_user_plans':
        return await handleGetUserPlans(userId, supaClient, toolArgs);
      
      case 'update_plan':
        return await handleUpdatePlan(userId, supaClient, toolArgs);
      
      default:
        return { success: false, result: null, error: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    console.error(`[ARES-TOOL] Error executing ${toolName}:`, err);
    return { success: false, result: null, error: err.message };
  }
}

async function handleMetaAnalysis(userId: string, supaClient: any, args: any, context: any) {
  // Use existing aresMetaCoach handler if available, otherwise do inline analysis
  const focusArea = args.focus_area || 'all';
  
  // Fetch comprehensive user data
  const [mealsRes, workoutsRes, sleepRes, supplementsRes] = await Promise.all([
    supaClient.from('meals').select('*').eq('user_id', userId).gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).order('date', { ascending: false }),
    supaClient.from('workouts').select('*').eq('user_id', userId).gte('date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).order('date', { ascending: false }),
    supaClient.from('sleep_logs').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(7),
    supaClient.from('user_supplements').select('*, supplement_database(*)').eq('user_id', userId)
  ]);

  const analysis = {
    focus: focusArea,
    nutrition: {
      meals_logged: mealsRes.data?.length || 0,
      avg_calories: mealsRes.data?.length ? Math.round(mealsRes.data.reduce((sum: number, m: any) => sum + (m.calories || 0), 0) / mealsRes.data.length) : 0,
      avg_protein: mealsRes.data?.length ? Math.round(mealsRes.data.reduce((sum: number, m: any) => sum + (m.protein || 0), 0) / mealsRes.data.length) : 0,
    },
    training: {
      workouts_logged: workoutsRes.data?.length || 0,
      total_duration: workoutsRes.data?.reduce((sum: number, w: any) => sum + (w.duration_minutes || 0), 0) || 0,
      workout_types: [...new Set(workoutsRes.data?.map((w: any) => w.workout_type) || [])]
    },
    recovery: {
      sleep_entries: sleepRes.data?.length || 0,
      avg_sleep_hours: sleepRes.data?.length ? (sleepRes.data.reduce((sum: number, s: any) => sum + (s.hours || 0), 0) / sleepRes.data.length).toFixed(1) : 0
    },
    supplements: {
      active_supplements: supplementsRes.data?.length || 0,
      supplement_names: supplementsRes.data?.map((s: any) => s.supplement_database?.name).filter(Boolean) || []
    },
    profile: context.profile
  };

  return { success: true, result: analysis };
}

async function handleCreateWorkoutPlan(userId: string, supaClient: any, args: any, context: any) {
  const goal = args.goal || 'muscle_building';
  const daysPerWeek = args.days_per_week || 4;
  const durationWeeks = args.duration_weeks || 8;
  
  // Build personalized workout plan
  const workoutPlan = {
    user_id: userId,
    plan_name: `ARES ${goal.replace('_', ' ').toUpperCase()} Plan`,
    goal: goal,
    days_per_week: daysPerWeek,
    duration_weeks: durationWeeks,
    created_by: 'ares',
    status: 'active',
    plan_data: generateWorkoutPlanData(goal, daysPerWeek, context.profile),
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + durationWeeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  };

  const { data, error } = await supaClient.from('workout_plans').insert(workoutPlan).select().single();
  
  if (error) {
    console.error('[ARES-TOOL] Error creating workout plan:', error);
    return { success: false, result: null, error: error.message };
  }
  
  return { success: true, result: { plan_id: data.id, ...workoutPlan } };
}

function generateWorkoutPlanData(goal: string, daysPerWeek: number, profile: any) {
  // Generate periodized workout plan based on goal
  const splits: Record<number, string[]> = {
    2: ['Upper', 'Lower'],
    3: ['Push', 'Pull', 'Legs'],
    4: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
    5: ['Chest/Triceps', 'Back/Biceps', 'Shoulders', 'Legs', 'Arms/Core'],
    6: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs']
  };

  const split = splits[Math.min(daysPerWeek, 6)] || splits[4];
  
  return {
    split_type: daysPerWeek <= 3 ? 'Full Body/PPL' : 'Upper/Lower or Bro Split',
    training_days: split,
    intensity_progression: goal === 'strength' ? 'linear' : 'undulating',
    rep_ranges: goal === 'muscle_building' ? '8-12' : goal === 'strength' ? '3-6' : '12-20',
    rest_periods: goal === 'strength' ? '3-5 min' : '60-90 sec',
    weekly_volume: goal === 'muscle_building' ? '10-20 sets per muscle' : '8-15 sets per muscle',
    deload_frequency: 'Every 4-6 weeks',
    notes: `Personalisiert für ${profile?.first_name || 'User'} - ${goal.replace('_', ' ')}`
  };
}

async function handleCreateNutritionPlan(userId: string, supaClient: any, args: any, context: any) {
  const goal = args.goal || 'maintenance';
  const mealCount = args.meal_count || 4;
  const dietType = args.diet_type || 'standard';
  
  // Calculate macros based on profile
  const weight = context.profile?.weight || 80;
  const tdee = context.profile?.tdee || (weight * 30); // Rough estimate
  
  let calories = args.daily_calories;
  if (!calories) {
    switch (goal) {
      case 'muscle_building': calories = Math.round(tdee * 1.15); break;
      case 'fat_loss': calories = Math.round(tdee * 0.8); break;
      case 'performance': calories = Math.round(tdee * 1.1); break;
      default: calories = tdee;
    }
  }

  const macros = calculateMacros(calories, goal, weight, dietType);

  const nutritionPlan = {
    user_id: userId,
    plan_name: `ARES ${goal.replace('_', ' ').toUpperCase()} Ernährungsplan`,
    goal: goal,
    daily_calories: calories,
    macros: macros,
    meal_count: mealCount,
    diet_type: dietType,
    created_by: 'ares',
    status: 'active',
    meal_schedule: generateMealSchedule(mealCount, macros),
    valid_from: new Date().toISOString().split('T')[0]
  };

  const { data, error } = await supaClient.from('nutrition_plans').insert(nutritionPlan).select().single();
  
  if (error) {
    console.error('[ARES-TOOL] Error creating nutrition plan:', error);
    return { success: false, result: null, error: error.message };
  }
  
  return { success: true, result: { plan_id: data.id, ...nutritionPlan } };
}

function calculateMacros(calories: number, goal: string, weight: number, dietType: string) {
  let proteinMultiplier = 2.0; // g per kg bodyweight
  let fatPercent = 0.25;
  
  if (goal === 'muscle_building') proteinMultiplier = 2.2;
  if (goal === 'fat_loss') proteinMultiplier = 2.4;
  if (dietType === 'keto') fatPercent = 0.7;
  if (dietType === 'low_carb') fatPercent = 0.4;
  
  const protein = Math.round(weight * proteinMultiplier);
  const fat = Math.round((calories * fatPercent) / 9);
  const carbs = Math.round((calories - (protein * 4) - (fat * 9)) / 4);
  
  return {
    protein_grams: protein,
    carbs_grams: Math.max(carbs, 0),
    fat_grams: fat,
    protein_percent: Math.round((protein * 4 / calories) * 100),
    carbs_percent: Math.round((Math.max(carbs, 0) * 4 / calories) * 100),
    fat_percent: Math.round((fat * 9 / calories) * 100)
  };
}

function generateMealSchedule(mealCount: number, macros: any) {
  const meals = [];
  const calsPerMeal = Math.round(macros.protein_grams * 4 + macros.carbs_grams * 4 + macros.fat_grams * 9) / mealCount;
  
  const mealTimes = ['07:00', '10:00', '13:00', '16:00', '19:00', '21:00'];
  const mealNames = ['Frühstück', 'Snack 1', 'Mittagessen', 'Snack 2', 'Abendessen', 'Casein'];
  
  for (let i = 0; i < mealCount; i++) {
    meals.push({
      name: mealNames[i] || `Mahlzeit ${i + 1}`,
      time: mealTimes[i] || `${7 + i * 3}:00`,
      calories: Math.round(calsPerMeal),
      protein: Math.round(macros.protein_grams / mealCount),
      carbs: Math.round(macros.carbs_grams / mealCount),
      fat: Math.round(macros.fat_grams / mealCount)
    });
  }
  
  return meals;
}

async function handleCreateSupplementPlan(userId: string, supaClient: any, args: any, context: any) {
  const goal = args.goal || 'health';
  const budget = args.budget || 'medium';
  const experienceLevel = args.experience_level || 'beginner';
  
  // Get available supplements from database
  const { data: availableSupplements } = await supaClient
    .from('supplement_database')
    .select('*')
    .limit(50);
  
  const recommendedSupplements = getRecommendedSupplements(goal, budget, experienceLevel, availableSupplements || []);
  
  const supplementPlan = {
    user_id: userId,
    plan_name: `ARES ${goal.replace('_', ' ').toUpperCase()} Supplement Stack`,
    goal: goal,
    budget_level: budget,
    experience_level: experienceLevel,
    supplements: recommendedSupplements,
    created_by: 'ares',
    status: 'active',
    notes: `Personalisiert für ${experienceLevel} mit ${budget} Budget`,
    valid_from: new Date().toISOString().split('T')[0]
  };

  const { data, error } = await supaClient.from('supplement_plans').insert(supplementPlan).select().single();
  
  if (error) {
    console.error('[ARES-TOOL] Error creating supplement plan:', error);
    return { success: false, result: null, error: error.message };
  }
  
  return { success: true, result: { plan_id: data.id, ...supplementPlan } };
}

function getRecommendedSupplements(goal: string, budget: string, level: string, available: any[]) {
  // Base supplements for everyone
  const base = [
    { name: 'Vitamin D3', dosage: '4000-5000 IU', timing: 'Morgens mit Fett', priority: 'essential' },
    { name: 'Omega-3 (EPA/DHA)', dosage: '2-3g', timing: 'Mit Mahlzeiten', priority: 'essential' },
    { name: 'Magnesium', dosage: '400-500mg', timing: 'Abends', priority: 'essential' }
  ];
  
  const goalSpecific: Record<string, any[]> = {
    muscle_building: [
      { name: 'Creatin Monohydrat', dosage: '5g', timing: 'Täglich', priority: 'essential' },
      { name: 'Whey Protein', dosage: '25-40g', timing: 'Post-Workout', priority: 'essential' },
      { name: 'Citrullin Malat', dosage: '6-8g', timing: 'Pre-Workout', priority: 'optional' }
    ],
    fat_loss: [
      { name: 'Koffein', dosage: '100-200mg', timing: 'Pre-Workout', priority: 'optional' },
      { name: 'Whey Protein', dosage: '25-40g', timing: 'Zwischen Mahlzeiten', priority: 'essential' },
      { name: 'Grüntee Extrakt', dosage: '500mg EGCG', timing: 'Morgens', priority: 'optional' }
    ],
    health: [
      { name: 'Multivitamin', dosage: '1 Portion', timing: 'Morgens', priority: 'optional' },
      { name: 'Zink', dosage: '15-30mg', timing: 'Abends', priority: 'recommended' }
    ],
    performance: [
      { name: 'Creatin Monohydrat', dosage: '5g', timing: 'Täglich', priority: 'essential' },
      { name: 'Beta-Alanin', dosage: '3-5g', timing: 'Pre-Workout', priority: 'recommended' },
      { name: 'Elektrolyte', dosage: 'Nach Bedarf', timing: 'During/Post Workout', priority: 'essential' }
    ],
    recovery: [
      { name: 'Taurin', dosage: '2-3g', timing: 'Post-Workout', priority: 'recommended' },
      { name: 'Glycin', dosage: '3-5g', timing: 'Vor dem Schlafen', priority: 'optional' },
      { name: 'Ashwagandha', dosage: '300-600mg', timing: 'Abends', priority: 'recommended' }
    ]
  };
  
  let supplements = [...base];
  
  if (goalSpecific[goal]) {
    supplements = [...supplements, ...goalSpecific[goal]];
  }
  
  // Filter by budget
  if (budget === 'low') {
    supplements = supplements.filter(s => s.priority === 'essential');
  } else if (budget === 'medium') {
    supplements = supplements.filter(s => s.priority !== 'optional' || level === 'advanced');
  }
  
  return supplements;
}

async function handleCreatePeptideProtocol(userId: string, supaClient: any, args: any, context: any) {
  const goal = args.goal || 'recovery';
  const experienceLevel = args.experience_level || 'beginner';
  
  // Generate peptide protocol based on goal
  const peptideProtocol = {
    user_id: userId,
    protocol_name: `ARES ${goal.replace('_', ' ').toUpperCase()} Peptid-Protokoll`,
    goal: goal,
    experience_level: experienceLevel,
    peptides: getPeptideRecommendations(goal, experienceLevel),
    contraindications: [
      'Nicht während Schwangerschaft/Stillzeit',
      'Bei aktiven Krebserkrankungen kontraindiziert',
      'Ärztliche Beratung vor Beginn empfohlen'
    ],
    monitoring: [
      'Regelmäßige Blutbilder (alle 3 Monate)',
      'Blutzucker-Kontrolle bei GH-Peptiden',
      'Auf Reaktionen an Injektionsstellen achten'
    ],
    created_by: 'ares',
    status: 'draft', // Peptide protocols start as draft for review
    valid_from: new Date().toISOString().split('T')[0]
  };

  const { data, error } = await supaClient.from('peptide_protocols').insert(peptideProtocol).select().single();
  
  if (error) {
    console.error('[ARES-TOOL] Error creating peptide protocol:', error);
    return { success: false, result: null, error: error.message };
  }
  
  return { 
    success: true, 
    result: { 
      plan_id: data.id, 
      ...peptideProtocol,
      disclaimer: '⚠️ Peptide sind regulierte Substanzen. Verwendung nur nach ärztlicher Beratung. Protokoll als Entwurf gespeichert.'
    } 
  };
}

function getPeptideRecommendations(goal: string, level: string) {
  const protocols: Record<string, any[]> = {
    muscle_growth: [
      { name: 'Ipamorelin', dosage: '200-300mcg', timing: '2-3x täglich', duration: '8-12 Wochen', notes: 'GH-Secretagogue, gut verträglich' },
      { name: 'CJC-1295 (no DAC)', dosage: '100mcg', timing: 'Mit Ipamorelin', duration: '8-12 Wochen', notes: 'Synergistisch mit Ipamorelin' }
    ],
    fat_loss: [
      { name: 'Ipamorelin', dosage: '200-300mcg', timing: 'Morgens nüchtern', duration: '8-12 Wochen', notes: 'Fördert Lipolyse' },
      { name: 'Tesamorelin', dosage: '1-2mg', timing: 'Abends', duration: '12 Wochen', notes: 'Speziell für viszerales Fett' }
    ],
    recovery: [
      { name: 'BPC-157', dosage: '250-500mcg', timing: '2x täglich', duration: '4-8 Wochen', notes: 'Heilungsfördernd für Gewebe' },
      { name: 'TB-500', dosage: '2-5mg', timing: '2x pro Woche', duration: '4-6 Wochen', notes: 'Systemische Regeneration' }
    ],
    anti_aging: [
      { name: 'Ipamorelin', dosage: '200mcg', timing: 'Vor dem Schlafen', duration: 'Langzeit', notes: 'Natürliche GH-Kurve optimieren' },
      { name: 'Epitalon', dosage: '5-10mg', timing: '10 Tage Kur', duration: '2-3 Kuren/Jahr', notes: 'Telomerase-Aktivierung' }
    ],
    cognitive: [
      { name: 'Semax', dosage: '300-600mcg', timing: 'Morgens intranasal', duration: '10-20 Tage', notes: 'Nootropes Peptid' },
      { name: 'Selank', dosage: '250-500mcg', timing: 'Bei Bedarf', duration: '2-3 Wochen', notes: 'Anxiolytisch, kognitiv' }
    ]
  };
  
  let selectedPeptides = protocols[goal] || protocols.recovery;
  
  // For beginners, reduce complexity
  if (level === 'beginner') {
    selectedPeptides = selectedPeptides.slice(0, 1);
  }
  
  return selectedPeptides;
}

async function handleGetUserPlans(userId: string, supaClient: any, args: any) {
  const planType = args.plan_type || 'all';
  
  const results: any = {};
  
  if (planType === 'all' || planType === 'workout') {
    const { data } = await supaClient.from('workout_plans').select('*').eq('user_id', userId).eq('status', 'active');
    results.workout_plans = data || [];
  }
  
  if (planType === 'all' || planType === 'nutrition') {
    const { data } = await supaClient.from('nutrition_plans').select('*').eq('user_id', userId).eq('status', 'active');
    results.nutrition_plans = data || [];
  }
  
  if (planType === 'all' || planType === 'supplement') {
    const { data } = await supaClient.from('supplement_plans').select('*').eq('user_id', userId).eq('status', 'active');
    results.supplement_plans = data || [];
  }
  
  if (planType === 'all' || planType === 'peptide') {
    const { data } = await supaClient.from('peptide_protocols').select('*').eq('user_id', userId);
    results.peptide_protocols = data || [];
  }
  
  return { success: true, result: results };
}

async function handleUpdatePlan(userId: string, supaClient: any, args: any) {
  const { plan_id, plan_type, updates } = args;
  
  const tableMap: Record<string, string> = {
    workout: 'workout_plans',
    nutrition: 'nutrition_plans',
    supplement: 'supplement_plans',
    peptide: 'peptide_protocols'
  };
  
  const table = tableMap[plan_type];
  if (!table) {
    return { success: false, result: null, error: 'Invalid plan type' };
  }
  
  const { data, error } = await supaClient
    .from(table)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', plan_id)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) {
    return { success: false, result: null, error: error.message };
  }
  
  return { success: true, result: data };
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER CONTEXT & MEMORY LOADING
// ═══════════════════════════════════════════════════════════════════════════════

async function buildUserContext({ userId, supaClient }: { userId: string; supaClient: any }) {
  // CRITICAL FIX: Use the service role client to bypass RLS and reliably load user data
  // Previously used ANON key without auth token which caused RLS to block access
  
  console.log(`[ARES-CONTEXT] Loading user context for user: ${userId}`);

  const { data: profile, error: profileError } = await supaClient
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileError) {
    console.warn(`[ARES-CONTEXT] Profile load error:`, profileError.message);
  } else {
    console.log(`[ARES-CONTEXT] Profile loaded: ${profile?.first_name || 'no name'}, weight: ${profile?.weight || 'not set'}`);
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const { data: recentMeals, error: mealsError } = await supaClient
    .from('meals')
    .select('title, calories, protein, carbs, fat, date')
    .eq('user_id', userId)
    .gte('date', sevenDaysAgo)
    .order('date', { ascending: false })
    .limit(5);

  if (mealsError) {
    console.warn(`[ARES-CONTEXT] Meals load error:`, mealsError.message);
  } else {
    console.log(`[ARES-CONTEXT] Meals loaded: ${recentMeals?.length || 0} entries`);
  }

  const { data: recentWorkouts, error: workoutsError } = await supaClient
    .from('workouts')
    .select('workout_type, duration_minutes, notes, date')
    .eq('user_id', userId)
    .gte('date', sevenDaysAgo)
    .order('date', { ascending: false })
    .limit(3);

  if (workoutsError) {
    console.warn(`[ARES-CONTEXT] Workouts load error:`, workoutsError.message);
  } else {
    console.log(`[ARES-CONTEXT] Workouts loaded: ${recentWorkouts?.length || 0} entries`);
  }

  // Load coach memory for personalization
  const { data: memoryData, error: memoryError } = await supaClient
    .from('coach_memory')
    .select('memory_data')
    .eq('user_id', userId)
    .eq('coach_id', 'ares')
    .single();

  if (memoryError && memoryError.code !== 'PGRST116') { // PGRST116 = not found (expected for new users)
    console.warn(`[ARES-CONTEXT] Memory load error:`, memoryError.message);
  }

  // Load sleep data for recovery context
  const { data: sleepData } = await supaClient
    .from('sleep_logs')
    .select('hours, quality, date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(7);

  // Load active supplements
  const { data: supplements } = await supaClient
    .from('user_supplements')
    .select('supplement_id, dosage, timing, supplement_database(name)')
    .eq('user_id', userId)
    .eq('is_active', true);

  const contextResult = {
    profile: profile || {},
    recent_meals: recentMeals || [],
    recent_workouts: recentWorkouts || [],
    recent_sleep: sleepData || [],
    active_supplements: supplements || [],
    user_preferences: profile?.preferences || {},
    memory: memoryData?.memory_data || {
      trust_level: 0,
      relationship_stage: 'new',
      conversation_context: {
        mood_history: [],
        success_moments: [],
        topics_discussed: [],
        struggles_mentioned: []
      }
    }
  };

  console.log(`[ARES-CONTEXT] Context summary: Profile=${!!profile}, Meals=${recentMeals?.length || 0}, Workouts=${recentWorkouts?.length || 0}, Sleep=${sleepData?.length || 0}, Supplements=${supplements?.length || 0}`);
  
  return contextResult;
}

async function loadPersona({ coachId }: { coachId: string }) {
  const supaUser = createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false }
  });

  const { data: personaData } = await supaUser
    .from('coach_personas')
    .select('*')
    .eq('id', coachId)
    .single();

  return personaData || {
    id: coachId,
    name: 'ARES',
    title: 'AI Fitness Coach',
    bio_short: 'Your AI-powered fitness and nutrition coach',
    voice: 'motivational',
    style_rules: ['Be direct and actionable', 'Focus on results', 'Provide specific guidance']
  };
}

function getTimeOfDay(): 'morning' | 'day' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

async function fetchRagSources({ text, context }: { text: string; context: any }) {
  try {
    const supaRag = createClient(SUPABASE_URL, ANON, {
      auth: { persistSession: false }
    });
    
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
      }),
    });
    
    if (!embeddingResponse.ok) {
      console.warn('[RAG] Embedding generation failed:', embeddingResponse.status);
      return { knowledge_chunks: [], relevance_scores: [], total_chunks: 0 };
    }
    
    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;
    
    if (!queryEmbedding) {
      console.warn('[RAG] No embedding returned');
      return { knowledge_chunks: [], relevance_scores: [], total_chunks: 0 };
    }
    
    const { data: ragResults, error: ragError } = await supaRag.rpc('match_knowledge_chunks', {
      query_embedding: queryEmbedding,
      similarity_threshold: 0.6,
      match_count: 5,
      filter_coach_id: 'ares'
    });
    
    if (ragError) {
      const { data: directResults, error: directError } = await supaRag
        .from('knowledge_base_embeddings')
        .select('content_chunk, knowledge_id')
        .limit(5);
      
      if (!directError && directResults) {
        return {
          knowledge_chunks: directResults.map((r: any) => r.content_chunk),
          relevance_scores: directResults.map(() => 0.7),
          total_chunks: directResults.length
        };
      }
      
      console.warn('[RAG] Query failed:', ragError?.message);
      return { knowledge_chunks: [], relevance_scores: [], total_chunks: 0 };
    }
    
    return {
      knowledge_chunks: ragResults?.map((r: any) => r.content_chunk) || [],
      relevance_scores: ragResults?.map((r: any) => r.similarity) || [],
      total_chunks: ragResults?.length || 0
    };
    
  } catch (err) {
    console.error('[RAG] Error fetching sources:', err);
    return { knowledge_chunks: [], relevance_scores: [], total_chunks: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDING WITH MEMORY INTEGRATION - Phase 2 Simplified
// ═══════════════════════════════════════════════════════════════════════════════

// Generate current German date string
function getCurrentGermanDate(): string {
  const now = new Date();
  const germanDays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const germanMonths = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return `${germanDays[now.getDay()]}, ${now.getDate()}. ${germanMonths[now.getMonth()]} ${now.getFullYear()}`;
}

// Format conversation history for prompt
function formatConversationHistory(conversations: any[]): string {
  if (!conversations || conversations.length === 0) return '';
  
  // Reverse to get chronological order (oldest first)
  const chronological = [...conversations].reverse();
  
  const formatted = chronological.map(c => {
    const date = new Date(c.created_at).toLocaleString('de-DE', { 
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
    });
    return `[${date}] User: ${c.message}\n[${date}] ARES: ${c.response?.substring(0, 200)}${c.response?.length > 200 ? '...' : ''}`;
  }).join('\n\n');
  
  return formatted;
}

function buildAresPrompt({ persona, context, ragSources, text, images, userMoodContext, conversationHistory }: {
  persona: any;
  context: any;
  ragSources: any;
  text: string;
  images: any;
  userMoodContext?: UserMoodContext;
  conversationHistory?: any[];
}) {
  const dialResult: AresDialResult = decideAresDial(userMoodContext || {}, text);
  const ritualContext = getRitualContext();
  const finalMode = (ritualContext?.mode || dialResult.mode) as AresMode;
  const finalTemperature = ritualContext?.temperature || dialResult.temperature;
  
  console.log(`[ARES] Mode selected: ${finalMode}, Temp: ${finalTemperature}, Reason: ${dialResult.reason}`);
  
  const userName = context.profile?.preferred_name || context.profile?.first_name || null;
  const currentDate = getCurrentGermanDate();
  const timeOfDay = getTimeOfDay();
  
  // Mode-specific style instruction
  const modeStyle = {
    supportive: 'Sei verständnisvoll und ermutigend. Erkenne Herausforderungen an, ohne zu urteilen.',
    balanced: 'Sei freundlich und klar. Balance zwischen Support und konkreten Handlungsschritten.',
    direct: 'Sei direkt und fordernd. Keine Ausreden, klare Erwartungen.'
  };
  
  // Build conversation history section
  const historySection = conversationHistory && conversationHistory.length > 0 
    ? `\n## LETZTE GESPRÄCHE (Kontext)
${formatConversationHistory(conversationHistory)}`
    : '';
  
  // Compact system prompt - natural language, no verbose sections
  const systemPrompt = `Du bist ARES, ein erfahrener Fitness- und Lifestyle-Coach.

**AKTUELLES DATUM: ${currentDate}**
**TAGESZEIT: ${timeOfDay}**

${userName ? `Du sprichst mit ${userName}.` : ''}

## DEIN STIL HEUTE
${modeStyle[finalMode]}

## USER-DATEN
${context.profile?.weight ? `Gewicht: ${context.profile.weight}kg` : ''}${context.profile?.target_weight ? ` → Ziel: ${context.profile.target_weight}kg` : ''}
${context.profile?.tdee ? `TDEE: ${context.profile.tdee} kcal` : ''}
${userMoodContext?.streak ? `🔥 Streak: ${userMoodContext.streak} Tage` : ''}
${userMoodContext?.no_workout_days && userMoodContext.no_workout_days > 0 ? `⚠️ ${userMoodContext.no_workout_days} Tage ohne Training` : ''}

### Letzte Aktivitäten
${context.recent_meals?.length > 0 
  ? `Mahlzeiten: ${context.recent_meals.slice(0, 3).map((m: any) => `${m.title || 'Mahlzeit'} (${m.calories || 0}kcal)`).join(', ')}`
  : 'Keine Mahlzeiten geloggt'}
${context.recent_workouts?.length > 0
  ? `\nWorkouts: ${context.recent_workouts.slice(0, 2).map((w: any) => `${w.workout_type || 'Training'} (${w.duration_minutes || 0}min)`).join(', ')}`
  : ''}
${historySection}
${ragSources?.knowledge_chunks?.length > 0 ? `\n## WISSEN\n${ragSources.knowledge_chunks.slice(0, 2).join('\n')}` : ''}

## TOOLS (bei Bedarf automatisch nutzen)
- get_meta_analysis: Ganzheitliche Analyse
- create_workout_plan / create_nutrition_plan / create_supplement_plan: Pläne erstellen
- get_user_plans / update_plan: Bestehende Pläne

## WICHTIG
- Sprich natürlich, wie ein echter Mensch - keine Coaching-Floskeln
- Antworte prägnant (100-400 Wörter), nicht mehr als nötig
- Nutze das aktuelle Datum wenn nach Zeit gefragt wird
- Beziehe dich auf frühere Gespräche wenn relevant`;

  return { 
    systemPrompt, 
    completePrompt: systemPrompt + "\n\nUser: " + text, 
    dial: { temp: finalTemperature, archetype: finalMode },
    temperature: finalTemperature,
    mode: finalMode
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LLM CALL WITH FUNCTION CALLING
// ═══════════════════════════════════════════════════════════════════════════════

async function callLLMWithTools(
  systemPrompt: string, 
  userMessage: string, 
  temperature: number,
  userId: string,
  supaClient: any,
  context: any
) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];
  
  // First LLM call with tools
  let response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: messages,
      tools: ARES_TOOLS,
      tool_choice: 'auto',
      max_tokens: 4000,
      temperature: temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  let llmResponse = await response.json();
  let assistantMessage = llmResponse.choices[0].message;
  
  // Handle tool calls in a loop
  const toolResults: any[] = [];
  let maxIterations = 5; // Prevent infinite loops
  
  while (assistantMessage.tool_calls && maxIterations > 0) {
    maxIterations--;
    console.log(`[ARES] Tool calls detected:`, assistantMessage.tool_calls.length);
    
    // Add assistant message with tool calls
    messages.push(assistantMessage);
    
    // Execute each tool call
    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
      
      console.log(`[ARES] Executing tool: ${toolName}`, toolArgs);
      
      const result = await executeToolCall(toolName, toolArgs, userId, supaClient, context);
      toolResults.push({ tool: toolName, ...result });
      
      // Add tool result to messages
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
      } as any);
    }
    
    // Call LLM again with tool results
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages,
        tools: ARES_TOOLS,
        tool_choice: 'auto',
        max_tokens: 4000,
        temperature: temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    llmResponse = await response.json();
    assistantMessage = llmResponse.choices[0].message;
  }
  
  return {
    content: assistantMessage.content,
    toolResults: toolResults
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY UPDATE AFTER CONVERSATION
// ═══════════════════════════════════════════════════════════════════════════════

async function updateCoachMemory(
  userId: string, 
  supaClient: any, 
  userMessage: string, 
  assistantResponse: string,
  toolResults: any[]
) {
  try {
    // Get current memory
    const { data: currentMemory } = await supaClient
      .from('coach_memory')
      .select('*')
      .eq('user_id', userId)
      .eq('coach_id', 'ares')
      .single();

    const memory = currentMemory?.memory_data || {
      trust_level: 0,
      relationship_stage: 'new',
      conversation_context: {
        mood_history: [],
        success_moments: [],
        topics_discussed: [],
        struggles_mentioned: []
      }
    };

    // Update conversation context
    const lowercaseMsg = userMessage.toLowerCase();
    
    // Detect topics
    const topicKeywords: Record<string, string[]> = {
      'Training': ['training', 'workout', 'gym', 'übung', 'exercise'],
      'Ernährung': ['essen', 'ernährung', 'kalorien', 'protein', 'diät', 'makros'],
      'Supplements': ['supplement', 'vitamin', 'creatin', 'protein shake'],
      'Peptide': ['peptid', 'bpc', 'ipamorelin', 'gh'],
      'Recovery': ['schlaf', 'regeneration', 'recovery', 'pause'],
      'Mindset': ['motivation', 'mental', 'stress', 'angst', 'überfordert']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(k => lowercaseMsg.includes(k))) {
        if (!memory.conversation_context.topics_discussed.includes(topic)) {
          memory.conversation_context.topics_discussed.push(topic);
        }
      }
    }

    // Detect struggles
    const struggleKeywords = ['schwer', 'problem', 'hilfe', 'nicht geschafft', 'aufgeben', 'überfordert'];
    if (struggleKeywords.some(k => lowercaseMsg.includes(k))) {
      const struggle = userMessage.slice(0, 100);
      if (!memory.conversation_context.struggles_mentioned.includes(struggle)) {
        memory.conversation_context.struggles_mentioned.push(struggle);
        // Keep only last 10
        if (memory.conversation_context.struggles_mentioned.length > 10) {
          memory.conversation_context.struggles_mentioned.shift();
        }
      }
    }

    // Detect success moments
    const successKeywords = ['geschafft', 'erreicht', 'stolz', 'pr', 'personal record', 'durchgehalten'];
    if (successKeywords.some(k => lowercaseMsg.includes(k))) {
      const success = userMessage.slice(0, 100);
      memory.conversation_context.success_moments.push(success);
      // Keep only last 10
      if (memory.conversation_context.success_moments.length > 10) {
        memory.conversation_context.success_moments.shift();
      }
    }

    // Increase trust level based on interaction
    if (toolResults.length > 0) {
      memory.trust_level = Math.min(10, memory.trust_level + 0.5);
    } else {
      memory.trust_level = Math.min(10, memory.trust_level + 0.1);
    }

    // Update relationship stage
    if (memory.trust_level >= 7) {
      memory.relationship_stage = 'trusted';
    } else if (memory.trust_level >= 4) {
      memory.relationship_stage = 'established';
    } else if (memory.trust_level >= 1) {
      memory.relationship_stage = 'developing';
    }

    // Upsert memory
    await supaClient.from('coach_memory').upsert({
      user_id: userId,
      coach_id: 'ares',
      memory_data: memory,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,coach_id' });

    console.log('[ARES-MEMORY] Updated memory:', { trust_level: memory.trust_level, stage: memory.relationship_stage });
  } catch (err) {
    console.warn('[ARES-MEMORY] Failed to update memory:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SERVER
// ═══════════════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  const pre = cors.preflight(req);
  if (pre) return pre;

  const headers = cors.headers();
  const started = performance.now();
  const incomingTrace = req.headers.get('x-trace-id');
  const traceId = incomingTrace || newTraceId();

  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    return new Response(JSON.stringify({ ok: true, env: { svc: !!SVC, openai: !!OPENAI_API_KEY }, traceId, version: '2.0-function-calling' }), {
      status: 200, headers: { ...headers, 'Content-Type': 'application/json', 'X-Trace-Id': traceId }
    });
  }

  // Check secrets early
  if (!SVC || !OPENAI_API_KEY) {
    const code = 'CONFIG_MISSING';
    const msg = !SVC ? 'Server misconfigured (SVC missing)' : 'OpenAI API key not configured';
    return new Response(JSON.stringify({ ok: false, code, message: msg, traceId }), {
      status: 500, headers: { ...headers, 'Content-Type': 'application/json', 'X-Trace-Id': traceId }
    });
  }

  const supaUser = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
  });
  const supaSvc = createClient(SUPABASE_URL, SVC, { auth: { persistSession: false } });

  try {
    // Auth
    const { data: authData } = await supaUser.auth.getUser();
    const user = authData?.user;
    if (!user) {
      return new Response(JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'No user session', traceId }), {
        status: 401, headers: { ...headers, 'Content-Type': 'application/json', 'X-Trace-Id': traceId }
      });
    }

    // Parse payload
    const body = await (async () => {
      const ct = req.headers.get('content-type') || '';
      try {
        if (ct.includes('application/json')) return await req.json();
        if (ct.includes('text/plain')) return { text: await req.text() };
        return {};
      } catch { return {}; }
    })();

    let event = body?.event;
    if (!event && (body?.text || body?.message)) {
      event = { type: 'TEXT', text: body.text ?? body.message ?? '', images: body.images ?? null };
    }

    const text = event?.text ?? '';
    const images = event?.images ?? body?.images ?? null;
    const coachId = body?.coachId || event?.coachId || 'ares';
    const clientEventId = body?.clientEventId ?? event?.clientEventId ?? null;

    if (!event || (event.type === 'TEXT' && !text && (!images || (Array.isArray(images) && images.length === 0)))) {
      return new Response(JSON.stringify({ ok: false, code: 'ARES_E_BAD_INPUT', message: 'Provide text or images', traceId }), {
        status: 400, headers: { ...headers, 'Content-Type': 'application/json', 'X-Trace-Id': traceId }
      });
    }

    // Start trace in DB
    await traceStart(traceId, user.id, coachId, { input_text: text || null, images: images || null });
    await traceUpdate(traceId, { status: 'started' });

    // Load context with memory - CRITICAL: Use supaSvc (service role) to bypass RLS
    const context = await buildUserContext({ userId: user.id, supaClient: supaSvc }).catch((e) => {
      console.error('[ARES-ERROR] buildUserContext', traceId, e);
      throw e;
    });

    const persona = await loadPersona({ coachId }).catch((e) => {
      console.error('[ARES-ERROR] loadPersona', traceId, e);
      throw e;
    });

    const ragSources = await fetchRagSources({ text, context }).catch((e) => {
      console.error('[ARES-ERROR] fetchRagSources', traceId, e);
      throw e;
    });

    // Load user mood context for dynamic dial selection
    const userMoodContext = await loadUserMoodContext(supaUser, user.id).catch((e) => {
      console.warn('[ARES-WARN] loadUserMoodContext failed, using defaults:', e);
      return {} as UserMoodContext;
    });

    // Load conversation history (last 10 messages) for context
    const { data: conversationHistory } = await supaSvc
      .from('coach_conversations')
      .select('message, response, created_at')
      .eq('user_id', user.id)
      .eq('coach_id', 'ares')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`[ARES] Loaded ${conversationHistory?.length || 0} previous conversations`);

    // Store full context in trace for debugging
    await traceUpdate(traceId, { 
      status: 'context_loaded', 
      context, // This will be stored as user_context by trace.ts
      persona, 
      rag_sources: ragSources 
    } as any);

    // Build prompt with memory and conversation history
    const { systemPrompt, completePrompt, dial, temperature } = buildAresPrompt({ 
      persona, context, ragSources, text, images, userMoodContext, conversationHistory 
    });

    // Store system prompt AND user input for full LLM tracing
    await traceUpdate(traceId, { 
      status: 'prompt_built', 
      system_prompt: systemPrompt, 
      complete_prompt: completePrompt,
      llm_input: { user_message: text, temperature, model: 'gpt-4o' }
    } as any);

    // Call LLM with Function Calling
    const { content: llmOutput, toolResults } = await callLLMWithTools(
      systemPrompt, 
      text, 
      temperature,
      user.id,
      supaSvc,
      context
    );

    const duration_ms = Math.round(performance.now() - started);
    
    // Store complete LLM response and tool calls
    await traceUpdate(traceId, { 
      status: 'llm_called', 
      llm_output: llmOutput,
      tool_calls: toolResults.length > 0 ? toolResults : null,
      duration_ms 
    } as any);

    // Update memory based on conversation
    await updateCoachMemory(user.id, supaSvc, text, llmOutput, toolResults);

    // Save response to coach_conversations
    try {
      await supaSvc.from('coach_conversations').insert({
        user_id: user.id,
        coach_id: coachId,
        message: text,
        response: llmOutput,
        trace_id: traceId,
        metadata: { tool_results: toolResults }
      });
    } catch (convError) {
      console.warn('[ARES-WARN] Failed to save conversation:', convError);
    }

    await traceDone(traceId, duration_ms);

    return new Response(JSON.stringify({ 
      reply: llmOutput, 
      traceId,
      toolsUsed: toolResults.length > 0 ? toolResults.map(t => t.tool) : []
    }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json', 'X-Trace-Id': traceId }
    });

  } catch (e) {
    const duration_ms = Math.round(performance.now() - started);
    const err = serializeErr(e);
    await traceFail(traceId, err, duration_ms);

    return new Response(JSON.stringify({ ok: false, code: 'ARES_E_INTERNAL', message: 'Server error occurred', traceId, error: err }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json', 'X-Trace-Id': traceId }
    });
  }
});
