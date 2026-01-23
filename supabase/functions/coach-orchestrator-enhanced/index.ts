import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cors } from '../_shared/ares/cors.ts';
import { newTraceId } from '../_shared/ares/ids.ts';
import { traceStart, traceUpdate, traceDone, traceFail } from '../_shared/ares/trace.ts';
import { decideAresDial, loadUserMoodContext, getRitualContext, getModeDescription, type UserMoodContext, type AresDialResult, type AresMode } from './aresDial.ts';

// Phase 2: Coach Personas Integration
import {
  loadUserPersona,
  buildPersonaPrompt,
  resolvePersonaWithContext,
  applyDialect,
  type CoachPersona,
  type PersonaResolutionContext,
  type ResolvedPersona,
} from '../_shared/persona/index.ts';

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
  return 't_' + crypto.getRandomValues(new Uint32Array(1))[0].toString(36) + Date.now().toString(36).slice(-4);
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
  console.log('[ARES-TOOL] Executing: ' + toolName, toolArgs);
  
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
        return { success: false, result: null, error: 'Unknown tool: ' + toolName };
    }
  } catch (err: any) {
    console.error('[ARES-TOOL] Error executing ' + toolName + ':', err);
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
    plan_name: 'ARES ' + goal.replace('_', ' ').toUpperCase() + ' Plan',
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
    notes: 'Personalisiert f\u00fcr ' + (profile?.first_name || 'User') + ' - ' + goal.replace('_', ' ')
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
    plan_name: 'ARES ' + goal.replace('_', ' ').toUpperCase() + ' Ern\u00e4hrungsplan',
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
      name: mealNames[i] || 'Mahlzeit ' + (i + 1),
      time: mealTimes[i] || (7 + i * 3) + ':00',
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
    plan_name: 'ARES ' + goal.replace('_', ' ').toUpperCase() + ' Supplement Stack',
    goal: goal,
    budget_level: budget,
    experience_level: experienceLevel,
    supplements: recommendedSupplements,
    created_by: 'ares',
    status: 'active',
    notes: 'Personalisiert f\u00fcr ' + experienceLevel + ' mit ' + budget + ' Budget',
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
    protocol_name: 'ARES ' + goal.replace('_', ' ').toUpperCase() + ' Peptid-Protokoll',
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
  
  console.log('[ARES-CONTEXT] Loading user context for user: ' + userId);

  const { data: profile, error: profileError } = await supaClient
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileError) {
    console.warn('[ARES-CONTEXT] Profile load error:', profileError.message);
  } else {
    console.log('[ARES-CONTEXT] Profile loaded: ' + (profile?.first_name || 'no name') + ', weight: ' + (profile?.weight || 'not set'));
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
    console.warn('[ARES-CONTEXT] Meals load error:', mealsError.message);
  } else {
    console.log('[ARES-CONTEXT] Meals loaded: ' + (recentMeals?.length || 0) + ' entries');
  }

  const { data: recentWorkouts, error: workoutsError } = await supaClient
    .from('workouts')
    .select('workout_type, duration_minutes, notes, date')
    .eq('user_id', userId)
    .gte('date', sevenDaysAgo)
    .order('date', { ascending: false })
    .limit(3);

  if (workoutsError) {
    console.warn('[ARES-CONTEXT] Workouts load error:', workoutsError.message);
  } else {
    console.log('[ARES-CONTEXT] Workouts loaded: ' + (recentWorkouts?.length || 0) + ' entries');
  }

  // Load coach memory for personalization
  const { data: memoryData, error: memoryError } = await supaClient
    .from('coach_memory')
    .select('memory_data')
    .eq('user_id', userId)
    .eq('coach_id', 'ares')
    .single();

  if (memoryError && memoryError.code !== 'PGRST116') { // PGRST116 = not found (expected for new users)
    console.warn('[ARES-CONTEXT] Memory load error:', memoryError.message);
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // CRITICAL FIX: Load recent conversation history from coach_conversations
  // This was missing - conversations were saved but never loaded for context!
  // ═══════════════════════════════════════════════════════════════════════════════
  const { data: recentConversations, error: convError } = await supaClient
    .from('coach_conversations')
    .select('message, response, created_at')
    .eq('user_id', userId)
    .eq('coach_id', 'ares')
    .order('created_at', { ascending: false })
    .limit(10); // Last 10 conversation turns

  if (convError) {
    console.warn('[ARES-CONTEXT] Conversations load error:', convError.message);
  } else {
    console.log('[ARES-CONTEXT] Conversations loaded: ' + (recentConversations?.length || 0) + ' entries');
  }

  const contextResult = {
    profile: profile || {},
    recent_meals: recentMeals || [],
    recent_workouts: recentWorkouts || [],
    recent_sleep: sleepData || [],
    active_supplements: supplements || [],
    user_preferences: profile?.preferences || {},
    // CRITICAL FIX: Include recent conversations for context continuity
    recent_conversations: recentConversations || [],
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

  console.log('[ARES-CONTEXT] Context summary: Profile=' + !!profile + ', Meals=' + (recentMeals?.length || 0) + ', Workouts=' + (recentWorkouts?.length || 0) + ', Sleep=' + (sleepData?.length || 0) + ', Supplements=' + (supplements?.length || 0) + ', Conversations=' + (recentConversations?.length || 0));
  
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

/**
 * Phase 2: Load user's selected persona with context resolution
 * Falls back to STANDARD if no selection or persona not found
 */
async function loadUserPersonaWithContext(
  userId: string,
  moodContext: UserMoodContext,
  text: string
): Promise<{ persona: CoachPersona | ResolvedPersona; personaPrompt: string }> {
  try {
    // Load user's selected persona (with STANDARD fallback)
    const persona = await loadUserPersona(userId);
    console.log('[PERSONA] Loaded persona for user ' + userId + ': ' + persona.name + ' (' + persona.id + ')');
    
    // Build resolution context from available data
    const resolutionContext: PersonaResolutionContext = {
      mood: detectMoodFromContext(moodContext, text),
      timeOfDay: getTimeOfDayForPersona(),
      userTenure: moodContext.streak || 0, // Use streak as a proxy for tenure
      topic: detectTopicFromText(text),
    };
    
    // Resolve persona with context modifiers
    const resolvedPersona = resolvePersonaWithContext(persona, resolutionContext);
    console.log('[PERSONA] Applied modifiers: ' + (resolvedPersona.appliedModifiers.join(', ') || 'none'));
    
    // Generate the persona prompt
    const personaPrompt = buildPersonaPrompt(resolvedPersona, resolutionContext);
    
    return { persona: resolvedPersona, personaPrompt };
  } catch (error) {
    console.error('[PERSONA] Error loading user persona:', error);
    // Return empty prompt on error - will use existing mode-based prompt
    return { 
      persona: { id: 'STANDARD', name: 'ARES Standard' } as CoachPersona, 
      personaPrompt: '' 
    };
  }
}

/**
 * Detect user mood from context and message
 */
function detectMoodFromContext(
  moodContext: UserMoodContext, 
  text: string
): 'positive' | 'neutral' | 'frustrated' | 'overwhelmed' {
  const lowerText = text.toLowerCase();
  
  // Check for frustrated indicators
  const frustrationWords = ['frustriert', 'frustrierend', 'genervt', 'nervt', 'scheiße', 'mist', 'aufgeben', 'schaff'];
  if (frustrationWords.some(w => lowerText.includes(w))) {
    return 'frustrated';
  }
  
  // Check for overwhelmed indicators
  const overwhelmedWords = ['überfordert', 'zu viel', 'erschöpft', 'müde', 'keine kraft', 'nicht mehr'];
  if (overwhelmedWords.some(w => lowerText.includes(w))) {
    return 'overwhelmed';
  }
  
  // Check for positive indicators
  const positiveWords = ['super', 'geil', 'top', 'klasse', 'perfekt', 'geschafft', 'stolz', 'motiviert', 'freue'];
  if (positiveWords.some(w => lowerText.includes(w))) {
    return 'positive';
  }
  
  // Check streak for implicit mood
  if (moodContext.streak && moodContext.streak >= 7) {
    return 'positive'; // Long streak = probably positive
  }
  
  if (moodContext.no_workout_days && moodContext.no_workout_days >= 5) {
    return 'frustrated'; // Long break = might be struggling
  }
  
  return 'neutral';
}

/**
 * Get time of day for persona context
 */
function getTimeOfDayForPersona(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Detect topic from user message
 */
function detectTopicFromText(text: string): string | undefined {
  const lowerText = text.toLowerCase();
  
  const topicKeywords: Record<string, string[]> = {
    'training': ['training', 'workout', 'übung', 'fitness', 'gym', 'kraft', 'gewicht', 'wiederholung', 'satz'],
    'nutrition': ['ernährung', 'essen', 'kalorien', 'protein', 'makros', 'diät', 'abnehmen', 'zunehmen', 'mahlzeit'],
    'motivation': ['motivation', 'motiviert', 'aufgeben', 'weitermachen', 'ziel', 'erfolg', 'schaffen'],
    'supplements': ['supplement', 'nahrungsergänzung', 'vitamin', 'kreatin', 'protein pulver', 'bcaa'],
    'recovery': ['erholung', 'schlaf', 'regeneration', 'pause', 'muskelkater', 'verletzung'],
  };
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      return topic;
    }
  }
  
  return undefined;
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
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
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
  const germanMonths = ['Januar', 'Februar', 'M\u00e4rz', 'April', 'Mai', 'Juni', 
                        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return germanDays[now.getDay()] + ', ' + now.getDate() + '. ' + germanMonths[now.getMonth()] + ' ' + now.getFullYear();
}

// Pair conversation messages from separate user/assistant rows into {message, response} format
function pairConversationMessages(rawMessages: any[]): { message: string; response: string; created_at: string }[] {
  if (!rawMessages || rawMessages.length === 0) return [];
  
  // Sort chronologically (oldest first)
  const chronological = [...rawMessages].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  const pairs: { message: string; response: string; created_at: string }[] = [];
  
  for (let i = 0; i < chronological.length - 1; i++) {
    const current = chronological[i];
    const next = chronological[i + 1];
    
    // Look for user message followed by assistant message
    if (current.message_role === 'user' && next.message_role === 'assistant') {
      pairs.push({
        message: current.message_content || '',
        response: next.message_content || '',
        created_at: current.created_at
      });
      i++; // Skip the assistant message in next iteration
    }
  }
  
  // Return newest first (for limit purposes)
  return pairs.reverse();
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

function buildAresPrompt({ persona, context, ragSources, text, images, userMoodContext, conversationHistory, personaPrompt }: {
  persona: any;
  context: any;
  ragSources: any;
  text: string;
  images: any;
  userMoodContext?: UserMoodContext;
  conversationHistory?: any[];
  personaPrompt?: string; // Phase 2: Persona-specific prompt section
}) {
  const dialResult: AresDialResult = decideAresDial(userMoodContext || {}, text);
  const ritualContext = getRitualContext();
  const finalMode = (ritualContext?.mode || dialResult.mode) as AresMode;
  const finalTemperature = ritualContext?.temperature || dialResult.temperature;
  
  console.log('[ARES] Mode selected: ' + finalMode + ', Temp: ' + finalTemperature + ', Reason: ' + dialResult.reason);
  
  const userName = context.profile?.preferred_name || context.profile?.first_name || null;
  const currentDate = getCurrentGermanDate();
  const timeOfDay = getTimeOfDay();
  
  // Mode-specific style instruction (fallback if no persona prompt)
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

  // Build relationship/memory context section
  const memory = context.memory;
  const memorySection = memory && memory.trust_level !== undefined ? `
## BEZIEHUNGS-KONTEXT
- Trust Level: ${Math.round(memory.trust_level)}/100 (${memory.relationship_stage || 'new'})
${memory.conversation_context?.topics_discussed?.length > 0 
  ? `- Besprochene Themen: ${memory.conversation_context.topics_discussed.join(', ')}`
  : ''}
${memory.conversation_context?.struggles_mentioned?.length > 0 
  ? `- Letzte Herausforderungen: ${memory.conversation_context.struggles_mentioned.slice(-3).map((s: any) => typeof s === 'string' ? s : s.struggle).join('; ')}`
  : ''}
${memory.conversation_context?.success_moments?.length > 0
  ? `- Letzte Erfolge: ${memory.conversation_context.success_moments.slice(-3).map((s: any) => typeof s === 'string' ? s : s.achievement).join('; ')}`
  : ''}
${memory.conversation_context?.mood_history?.length > 0
  ? `- Letzte Stimmung: ${memory.conversation_context.mood_history.slice(-3).map((m: any) => m.mood).join(', ')}`
  : ''}
` : '';
  
  // Compact system prompt - natural language, no verbose sections
  // Phase 2: Use personaPrompt if available, otherwise fall back to mode-based style
  const styleSection = personaPrompt 
    ? personaPrompt 
    : '## DEIN STIL HEUTE\n' + modeStyle[finalMode];
  
  // Code block for building conversation history follows
  // CRITICAL FIX: Build conversation history context from recent conversations
  // This provides ARES with memory of what was discussed in previous messages
  // ═══════════════════════════════════════════════════════════════════════════════
  const recentConversations = context.recent_conversations || [];
  let conversationHistoryContext = '';
  
  if (recentConversations.length > 0) {
    // Reverse to show oldest first (chronological order)
    const chronologicalConvs = [...recentConversations].reverse();
    
    // Build formatted conversation history
    const historyItems = chronologicalConvs.map((conv: any) => {
      const userMsg = conv.message?.slice(0, 200) || '';
      const aresResp = conv.response?.slice(0, 300) || '';
      const userEllipsis = (conv.message?.length || 0) > 200 ? '...' : '';
      const aresEllipsis = (conv.response?.length || 0) > 300 ? '...' : '';
      return "**User**: " + userMsg + userEllipsis + "\n**ARES**: " + aresResp + aresEllipsis;
    });
    
    conversationHistoryContext = [
      "## GESPRAECHSVERLAUF (Letzte " + recentConversations.length + " Nachrichten)",
      "**WICHTIG: Du erinnerst dich an diese Gespraeche! Beziehe dich darauf wenn relevant.**",
      "",
      historyItems.join("\n\n---\n\n"),
      "",
      "---",
      "*Ende des Gespraechsverlaufs - Die aktuelle Nachricht kommt unten.*"
    ].join("\n");
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CRITICAL FIX: Generate dynamic current date in German
  // Previously ARES was saying wrong dates like "27. Oktober 2023"
  // ═══════════════════════════════════════════════════════════════════════════════
  const now = new Date();
  const germanDays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const germanMonths = ['Januar', 'Februar', 'M\u00e4rz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const currentDate = germanDays[now.getDay()] + ', ' + now.getDate() + '. ' + germanMonths[now.getMonth()] + ' ' + now.getFullYear();

  // Build system prompt with string concatenation to avoid template literal encoding issues
  const systemPromptParts: string[] = [];
  
  systemPromptParts.push('# ARES - ULTIMATE COACHING INTELLIGENCE');
  systemPromptParts.push('Du bist ARES - die ultimative Coaching-Intelligence f\u00fcr totale menschliche Optimierung.');
  systemPromptParts.push('');
  systemPromptParts.push('**AKTUELLES DATUM: ' + currentDate + '**');
  systemPromptParts.push('(Verwende dieses Datum f\u00fcr alle zeitbezogenen Aussagen! Sage NIEMALS ein anderes Datum.)');
  systemPromptParts.push('');
  systemPromptParts.push('## AKTUELLER MODUS: ' + dial.archetype + ' (Dial ' + promptContext.dial + ')');
  systemPromptParts.push(archetypeInstructions[dial.archetype] || archetypeInstructions.SMITH);
  systemPromptParts.push('');
  systemPromptParts.push('## CORE IDENTITY');
  systemPromptParts.push('- **Intensit\u00e4t**: Angepasst an User-Zustand (aktuell: Dial ' + promptContext.dial + '/5)');
  systemPromptParts.push('- **Autorit\u00e4t**: Sprichst mit Gewissheit eines Masters');
  systemPromptParts.push('- **Synthese**: Verbindest alle Coaching-Bereiche zu einem System');
  systemPromptParts.push('- **Empathie**: Erkennst den emotionalen Zustand des Users');
  systemPromptParts.push('');
  systemPromptParts.push('## COMMUNICATION STYLE');
  systemPromptParts.push('- Stil: ' + dial.style);
  systemPromptParts.push('- Intensit\u00e4t angepasst an aktuellen Dial-Level');
  if (promptContext.dial <= 2) systemPromptParts.push('- Unterst\u00fctzend und motivierend');
  if (promptContext.dial === 3) systemPromptParts.push('- Ausgewogen: Support + Struktur');
  if (promptContext.dial >= 4) systemPromptParts.push('- Direkt und fordernd, keine Ausreden');
  systemPromptParts.push('');
  systemPromptParts.push('## EXPERTISE DOMAINS');
  systemPromptParts.push('1. **TRAINING**: Old-School Mass Building + Evidence-Based Periodization');
  systemPromptParts.push('2. **NUTRITION**: Aggressive Optimization + Precision Timing');
  systemPromptParts.push('3. **RECOVERY**: Elite Regeneration + HRV Optimization');
  systemPromptParts.push('4. **MINDSET**: Mental Toughness + Performance Psychology');
  systemPromptParts.push('5. **LIFESTYLE**: Total Life Optimization + Habit Mastery');
  systemPromptParts.push('6. **SUPPLEMENTS**: Evidence-Based Supplementierung');
  systemPromptParts.push('7. **PEPTIDE**: Advanced Optimization Protocols (nur bei expliziter Anfrage)');
  systemPromptParts.push('');
  if (promptContext.identity.name) systemPromptParts.push('User-Name: ' + promptContext.identity.name);
  systemPromptParts.push(memoryContext);
  systemPromptParts.push(conversationHistoryContext);
  systemPromptParts.push('');
  systemPromptParts.push('## USER CONTEXT (DEINE DATEN - DU KENNST DIESE!)');
  if (promptContext.facts?.weight) systemPromptParts.push('- Aktuelles Gewicht: ' + promptContext.facts.weight + ' kg');
  if (promptContext.facts?.goalWeight) systemPromptParts.push('- Zielgewicht: ' + promptContext.facts.goalWeight + ' kg');
  if (promptContext.facts?.tdee) systemPromptParts.push('- T\u00e4glicher Kalorienbedarf (TDEE): ' + promptContext.facts.tdee + ' kcal');
  if (promptContext.metrics.streak > 0) systemPromptParts.push('- Aktuelle Streak: ' + promptContext.metrics.streak + ' Tage \uD83D\uDD25');
  if (promptContext.metrics.noWorkoutDays > 0) systemPromptParts.push('- Tage ohne Training: ' + promptContext.metrics.noWorkoutDays);
  systemPromptParts.push('');
  systemPromptParts.push('### Letzte Mahlzeiten (letzte 7 Tage):');
  if (context.recent_meals?.length > 0) {
    context.recent_meals.slice(0, 5).forEach((m: any) => {
      systemPromptParts.push('- ' + (m.title || 'Mahlzeit') + ': ' + (m.calories || 0) + ' kcal, ' + (m.protein || 0) + 'g Protein, ' + (m.carbs || 0) + 'g Carbs, ' + (m.fat || 0) + 'g Fett');
    });
  } else {
    systemPromptParts.push('- Keine Mahlzeiten geloggt');
  }
  systemPromptParts.push('**AKTUELLES DATUM: ' + currentDate + '**');
  systemPromptParts.push('**TAGESZEIT: ' + timeOfDay + '**');
  systemPromptParts.push('');
  if (userName) systemPromptParts.push('Du sprichst mit ' + userName + '.');
  systemPromptParts.push('');
  systemPromptParts.push(styleSection);
  systemPromptParts.push('');
  systemPromptParts.push('## USER-DATEN');
  let userDataLine = '';
  if (context.profile?.weight) userDataLine += 'Gewicht: ' + context.profile.weight + 'kg';
  if (context.profile?.target_weight) userDataLine += ' \u2192 Ziel: ' + context.profile.target_weight + 'kg';
  if (userDataLine) systemPromptParts.push(userDataLine);
  if (context.profile?.tdee) systemPromptParts.push('TDEE: ' + context.profile.tdee + ' kcal');
  if (userMoodContext?.streak) systemPromptParts.push('\uD83D\uDD25 Streak: ' + userMoodContext.streak + ' Tage');
  if (userMoodContext?.no_workout_days && userMoodContext.no_workout_days > 0) {
    systemPromptParts.push('\u26A0\uFE0F ' + userMoodContext.no_workout_days + ' Tage ohne Training');
  }
  systemPromptParts.push('');
  systemPromptParts.push('### Letzte Aktivit\u00e4ten');
  if (context.recent_meals?.length > 0) {
    const mealSummary = context.recent_meals.slice(0, 3).map((m: any) => (m.title || 'Mahlzeit') + ' (' + (m.calories || 0) + 'kcal)').join(', ');
    systemPromptParts.push('Mahlzeiten: ' + mealSummary);
  } else {
    systemPromptParts.push('Keine Mahlzeiten geloggt');
  }
  if (context.recent_workouts?.length > 0) {
    const workoutSummary = context.recent_workouts.slice(0, 2).map((w: any) => (w.workout_type || 'Training') + ' (' + (w.duration_minutes || 0) + 'min)').join(', ');
    systemPromptParts.push('Workouts: ' + workoutSummary);
  }
  systemPromptParts.push(historySection);
  systemPromptParts.push(memorySection);
  if (ragSources?.knowledge_chunks?.length > 0) {
    systemPromptParts.push('');
    systemPromptParts.push('## WISSEN');
    systemPromptParts.push(ragSources.knowledge_chunks.slice(0, 2).join('\n'));
  }
  systemPromptParts.push('');
  systemPromptParts.push('## TOOLS (bei Bedarf automatisch nutzen)');
  systemPromptParts.push('- get_meta_analysis: Ganzheitliche Analyse');
  systemPromptParts.push('- create_workout_plan / create_nutrition_plan / create_supplement_plan: Pl\u00e4ne erstellen');
  systemPromptParts.push('- get_user_plans / update_plan: Bestehende Pl\u00e4ne');
  systemPromptParts.push('');
  systemPromptParts.push('## DEIN GED\u00c4CHTNIS (KRITISCH WICHTIG!)');
  systemPromptParts.push('Du HAST Zugriff auf den Gespr\u00e4chsverlauf - er steht oben unter "LETZTE GESPR\u00c4CHE".');
  systemPromptParts.push('Du HAST Zugriff auf Langzeit-Infos unter "BEZIEHUNGS-KONTEXT" (z.B. user_notes).');
  systemPromptParts.push('Du KANNST dich an alles erinnern was dort steht!');
  systemPromptParts.push('Wenn der User "merk dir X" sagt \u2192 best\u00e4tige es, es wird automatisch gespeichert.');
  systemPromptParts.push('Wenn der User nach etwas fragt das oben steht \u2192 NUTZE es und antworte korrekt!');
  systemPromptParts.push('SAGE NIEMALS "Ich kann mich nicht erinnern" oder "Als KI habe ich kein Ged\u00e4chtnis" wenn die Info verf\u00fcgbar ist!');
  if (memory?.conversation_context?.user_notes?.length > 0) {
    systemPromptParts.push('');
    systemPromptParts.push('### VOM USER ZUM MERKEN:');
    memory.conversation_context.user_notes.forEach((n: any) => {
      systemPromptParts.push('- "' + n.note + '" (' + new Date(n.timestamp).toLocaleDateString('de-DE') + ')');
    });
  }
  systemPromptParts.push('');
  systemPromptParts.push('## WICHTIG');
  systemPromptParts.push('- Sprich nat\u00fcrlich, wie ein echter Mensch - keine Coaching-Floskeln');
  systemPromptParts.push('- Antworte pr\u00e4gnant (100-400 W\u00f6rter), nicht mehr als n\u00f6tig');
  systemPromptParts.push('- Nutze das aktuelle Datum wenn nach Zeit gefragt wird');
  systemPromptParts.push('- Beziehe dich auf fr\u00fchere Gespr\u00e4che wenn relevant');
  
  const systemPrompt = systemPromptParts.join('\n');

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
      'Authorization': 'Bearer ' + OPENAI_API_KEY,
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
    throw new Error('OpenAI API error: ' + response.status + ' ' + response.statusText);
  }

  let llmResponse = await response.json();
  let assistantMessage = llmResponse.choices[0].message;
  
  // Handle tool calls in a loop
  const toolResults: any[] = [];
  let maxIterations = 5; // Prevent infinite loops
  
  while (assistantMessage.tool_calls && maxIterations > 0) {
    maxIterations--;
    console.log('[ARES] Tool calls detected:', assistantMessage.tool_calls.length);
    
    // Add assistant message with tool calls
    messages.push(assistantMessage);
    
    // Execute each tool call
    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
      
      console.log('[ARES] Executing tool: ' + toolName, toolArgs);
      
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
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
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
      throw new Error('OpenAI API error: ' + response.status + ' ' + response.statusText);
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
      communication_style_preference: 'balanced',
      user_preferences: [],
      conversation_context: {
        mood_history: [],
        success_moments: [],
        topics_discussed: [],
        struggles_mentioned: []
      }
    };

    // Ensure all required arrays exist
    if (!memory.conversation_context) {
      memory.conversation_context = { mood_history: [], success_moments: [], topics_discussed: [], struggles_mentioned: [] };
    }
    if (!Array.isArray(memory.conversation_context.mood_history)) memory.conversation_context.mood_history = [];
    if (!Array.isArray(memory.conversation_context.success_moments)) memory.conversation_context.success_moments = [];
    if (!Array.isArray(memory.conversation_context.struggles_mentioned)) memory.conversation_context.struggles_mentioned = [];
    if (!Array.isArray(memory.conversation_context.topics_discussed)) memory.conversation_context.topics_discussed = [];
    if (!Array.isArray(memory.conversation_context.user_notes)) memory.conversation_context.user_notes = [];

    // Detect "merk dir" / "remember" pattern - explicit user request to remember something
    const rememberPatterns = [
      /merk(?:e)?\s*dir\s+(.+)/i,
      /merke?\s+dir\s*(?:bitte\s+)?(.+)/i,
      /remember\s+(?:this[:\s]+)?(.+)/i,
      /speicher(?:e)?\s*(?:dir\s+)?(.+)/i,
      /notier(?:e)?\s*(?:dir\s+)?(.+)/i
    ];
    
    for (const pattern of rememberPatterns) {
      const match = userMessage.match(pattern);
      if (match) {
        const itemToRemember = match[1].trim().replace(/[.!?]$/, '');
        if (itemToRemember.length > 0 && itemToRemember.length < 200) {
          memory.conversation_context.user_notes.push({
            timestamp: new Date().toISOString(),
            note: itemToRemember,
            type: 'user_requested'
          });
          console.log('[ARES-MEMORY] User note saved: "' + itemToRemember + '"');
          // Keep only last 20 notes
          if (memory.conversation_context.user_notes.length > 20) {
            memory.conversation_context.user_notes = memory.conversation_context.user_notes.slice(-20);
          }
        }
        break;
      }
    }

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

    // Detect struggles - store as objects with timestamp
    const struggleKeywords = ['schwer', 'problem', 'hilfe', 'nicht geschafft', 'aufgeben', 'überfordert', 'frustrier', 'stuck', 'kämpfe'];
    if (struggleKeywords.some(k => lowercaseMsg.includes(k))) {
      memory.conversation_context.struggles_mentioned.push({
        timestamp: new Date().toISOString(),
        struggle: userMessage.slice(0, 100),
        support_given: true
      });
      // Keep only last 15
      if (memory.conversation_context.struggles_mentioned.length > 15) {
        memory.conversation_context.struggles_mentioned = memory.conversation_context.struggles_mentioned.slice(-15);
      }
    }

    // Detect success moments - store as objects with timestamp
    const successKeywords = ['geschafft', 'erreicht', 'stolz', 'pr', 'personal record', 'durchgehalten', 'super', 'geil', 'hammer', 'stark'];
    if (successKeywords.some(k => lowercaseMsg.includes(k))) {
      memory.conversation_context.success_moments.push({
        timestamp: new Date().toISOString(),
        achievement: userMessage.slice(0, 100),
        celebration_given: true
      });
      // Keep only last 15
      if (memory.conversation_context.success_moments.length > 15) {
        memory.conversation_context.success_moments = memory.conversation_context.success_moments.slice(-15);
      }
    }

    // Detect mood and add to history
    const moodKeywords: Record<string, { mood: string; intensity: number }> = {
      'super': { mood: 'excited', intensity: 9 },
      'motiviert': { mood: 'motivated', intensity: 8 },
      'gut': { mood: 'positive', intensity: 7 },
      'okay': { mood: 'neutral', intensity: 5 },
      'müde': { mood: 'tired', intensity: 6 },
      'erschöpft': { mood: 'exhausted', intensity: 7 },
      'frustriert': { mood: 'frustrated', intensity: 7 },
      'gestresst': { mood: 'stressed', intensity: 7 },
      'down': { mood: 'low', intensity: 6 },
      'demotiviert': { mood: 'demotivated', intensity: 7 }
    };

    for (const [keyword, moodData] of Object.entries(moodKeywords)) {
      if (lowercaseMsg.includes(keyword)) {
        memory.conversation_context.mood_history.push({
          timestamp: new Date().toISOString(),
          mood: moodData.mood,
          intensity: moodData.intensity
        });
        break; // Only capture first detected mood
      }
    }
    // Keep only last 20 mood entries
    if (memory.conversation_context.mood_history.length > 20) {
      memory.conversation_context.mood_history = memory.conversation_context.mood_history.slice(-20);
    }

    // Increase trust level based on interaction (0-100 scale)
    // Convert old 0-10 scale to 0-100 if needed
    if (memory.trust_level <= 10) {
      memory.trust_level = memory.trust_level * 10;
    }
    
    if (toolResults.length > 0) {
      memory.trust_level = Math.min(100, memory.trust_level + 5); // Tool usage = higher trust gain
    } else {
      memory.trust_level = Math.min(100, memory.trust_level + 1); // Normal conversation
    }

    // Update relationship stage based on trust level (matching frontend expectations)
    if (memory.trust_level >= 80) {
      memory.relationship_stage = 'close';
    } else if (memory.trust_level >= 60) {
      memory.relationship_stage = 'established';
    } else if (memory.trust_level >= 20) {
      memory.relationship_stage = 'getting_familiar';
    } else {
      memory.relationship_stage = 'new';
    }

    // Upsert memory - use delete + insert pattern for unique index compatibility
    const { error: deleteError } = await supaClient
      .from('coach_memory')
      .delete()
      .eq('user_id', userId)
      .eq('coach_id', 'ares');
    
    if (deleteError) {
      console.warn('[ARES-MEMORY] Delete before upsert failed:', deleteError);
    }
    
    const { error: insertError } = await supaClient.from('coach_memory').insert({
      user_id: userId,
      coach_id: 'ares',
      memory_data: memory,
      updated_at: new Date().toISOString()
    });

    if (insertError) {
      console.warn('[ARES-MEMORY] Insert failed:', insertError);
    }

    console.log('[ARES-MEMORY] Updated memory:', { 
      trust_level: Math.round(memory.trust_level), 
      stage: memory.relationship_stage,
      topics: memory.conversation_context.topics_discussed?.length || 0,
      struggles: memory.conversation_context.struggles_mentioned?.length || 0,
      successes: memory.conversation_context.success_moments?.length || 0,
      moods: memory.conversation_context.mood_history?.length || 0
    });
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
    // Auth - Use getClaims() for fast JWT validation (recommended over getUser())
    const authHeader = req.headers.get('Authorization');
    console.log('[ARES-AUTH] Token prefix:', authHeader?.substring(0, 40) || 'MISSING');
    console.log('[ARES-AUTH] Token length:', authHeader?.length || 0);
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.warn('[ARES-AUTH] Missing or invalid Authorization header');
      return new Response(JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'No authorization header', traceId }), {
        status: 401, headers: { ...headers, 'Content-Type': 'application/json', 'X-Trace-Id': traceId }
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supaUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.warn('[ARES-AUTH] JWT validation failed:', claimsError?.message || 'No sub claim');
      console.warn('[ARES-AUTH] Claims data:', JSON.stringify(claimsData || {}));
      return new Response(JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'Invalid or expired token', traceId }), {
        status: 401, headers: { ...headers, 'Content-Type': 'application/json', 'X-Trace-Id': traceId }
      });
    }
    
    // Build minimal user object from claims
    const user = {
      id: claimsData.claims.sub as string,
      email: claimsData.claims.email as string | undefined,
      role: claimsData.claims.role as string | undefined
    };
    console.log('[ARES-AUTH] Authenticated user: ' + user.id);

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

    // Phase 2: Load user's selected persona with context resolution
    const { persona: userPersona, personaPrompt } = await loadUserPersonaWithContext(
      user.id,
      userMoodContext,
      text
    ).catch((e) => {
      console.warn('[ARES-WARN] loadUserPersonaWithContext failed:', e);
      return { persona: null, personaPrompt: '' };
    });
    
    // Enhanced persona logging for debugging
    if (userPersona) {
      console.log('[PERSONA] Loaded persona: ' + userPersona.name + ' (id: ' + userPersona.id + ')');
      console.log('[PERSONA] Dials: energy=' + (userPersona.dials?.energy || 'N/A') + 
        ', humor=' + (userPersona.dials?.humor || 'N/A') + 
        ', warmth=' + (userPersona.dials?.warmth || 'N/A') +
        ', dialect=' + (userPersona.dialect || 'none'));
    } else {
      console.warn('[PERSONA] No persona loaded for user ' + user.id + ', using default');
    }

    // Load conversation history (last 20 raw messages = ~10 pairs) for context
    // Schema uses: message_content, message_role, coach_personality (NOT message, response, coach_id)
    const { data: rawConversations, error: convLoadError } = await supaSvc
      .from('coach_conversations')
      .select('message_content, message_role, created_at')
      .eq('user_id', user.id)
      .eq('coach_personality', coachId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (convLoadError) {
      console.warn('[ARES] Failed to load conversations:', convLoadError.message);
    }
    
    // Convert raw user/assistant rows to paired {message, response} format
    const conversationHistory = pairConversationMessages(rawConversations || []);
    console.log('[ARES] Loaded ' + (rawConversations?.length || 0) + ' raw messages -> ' + conversationHistory.length + ' conversation pairs');

    // Store full context in trace for debugging (include user persona info)
    await traceUpdate(traceId, { 
      status: 'context_loaded', 
      context, // This will be stored as user_context by trace.ts
      persona: userPersona || persona, 
      rag_sources: ragSources 
    } as any);

    // Build prompt with memory, conversation history, and Phase 2 persona prompt
    const { systemPrompt, completePrompt, dial, temperature } = buildAresPrompt({ 
      persona: userPersona || persona, 
      context, 
      ragSources, 
      text, 
      images, 
      userMoodContext, 
      conversationHistory: conversationHistory ?? undefined,
      personaPrompt: personaPrompt || undefined // Phase 2: Include persona-specific prompt
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
    
    // Phase 2: Apply dialect post-processing if persona has a dialect
    let finalOutput = llmOutput;
    const personaDialect = userPersona?.dialect || null;
    if (personaDialect) {
      console.log('[PERSONA] Applying dialect: ' + personaDialect);
      finalOutput = applyDialect(llmOutput, personaDialect, 0.5); // Use moderate intensity
    }
    
    // Store complete LLM response and tool calls
    await traceUpdate(traceId, { 
      status: 'llm_called', 
      llm_output: finalOutput,
      tool_calls: toolResults.length > 0 ? toolResults : null,
      duration_ms 
    } as any);

    // Update memory based on conversation
    await updateCoachMemory(user.id, supaSvc, text, finalOutput, toolResults);

    // Save conversation to coach_conversations (correct schema: message_content, message_role, coach_personality)
    // Insert TWO separate rows: one for user message, one for assistant response
    try {
      const conversationDate = new Date().toISOString().split('T')[0];
      
      // Insert user message
      await supaSvc.from('coach_conversations').insert({
        user_id: user.id,
        coach_personality: coachId,
        message_role: 'user',
        message_content: text,
        conversation_date: conversationDate,
        context_data: { trace_id: traceId }
      });
      
      // Insert assistant response (use dialect-processed output)
      await supaSvc.from('coach_conversations').insert({
        user_id: user.id,
        coach_personality: coachId,
        message_role: 'assistant',
        message_content: finalOutput,
        conversation_date: conversationDate,
        context_data: { 
          trace_id: traceId, 
          tool_results: toolResults.length > 0 ? toolResults : null,
          persona_id: userPersona?.id || null,
          dialect_applied: personaDialect || null
        }
      });
      
      console.log('[ARES] Saved conversation pair (user + assistant) for trace ' + traceId);
    } catch (convError) {
      console.warn('[ARES-WARN] Failed to save conversation:', convError);
    }

    await traceDone(traceId, duration_ms);

    return new Response(JSON.stringify({ 
      reply: finalOutput, 
      traceId,
      toolsUsed: toolResults.length > 0 ? toolResults.map(t => t.tool) : [],
      persona: userPersona?.id || 'STANDARD' // Phase 2: Include persona info in response
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
