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

// Phase 3: Intelligent Context Loading
import {
  loadUserHealthContext,
  buildIntelligentSystemPrompt,
  convertConversationHistory,
  type UserHealthContext,
  type ConversationMessage,
} from '../_shared/context/index.ts';

// Phase 4: Memory Extraction System
import {
  extractInsightsFromMessage,
  saveInsights,
  loadRelevantInsights,
  getExistingInsightStrings,
  detectPatterns,
  loadUnaddressedPatterns,
  getAllUserInsights,
  type UserInsight,
  type UserPattern,
} from '../_shared/memory/index.ts';

// Phase 5: Knowledge + Bloodwork Integration
import {
  loadRelevantKnowledge,
  formatKnowledgeForPrompt,
  type KnowledgeContext,
} from '../_shared/knowledge/index.ts';

import {
  loadBloodworkContext,
  formatBloodworkForPrompt,
  type BloodworkContext,
} from '../_shared/bloodwork/index.ts';

// Phase 6: Hybrid AI Model Router (Lovable AI + Perplexity + OpenAI)
import {
  routeMessage,
  callWithFallback,
  getProviderConfig,
  type ModelChoice,
  type AIProvider,
} from '../_shared/ai/modelRouter.ts';

// Phase 7: Topic State Machine
import {
  createInitialTopicState,
  processMessage as processTopicMessage,
  getPausedTopicsForFollowup,
  generateReturnPrompt,
  buildTopicContextPrompt,
  type TopicState,
} from '../_shared/topic/index.ts';

// Phase 8: Gamification System
import {
  awardInteractionXP,
  ensureDailyQuests,
  type XPResult,
} from '../_shared/gamification/index.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

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
  },
  {
    type: "function",
    function: {
      name: "search_scientific_evidence",
      description: "Durchsucht aktuelle wissenschaftliche Studien und PubMed. Nutze bei Fragen zu Evidenz, Studien, Peptid-Forschung, 'laut Wissenschaft' oder wenn der User nach Belegen fragt.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Suchanfrage (wird automatisch auf Englisch uebersetzt fuer bessere Ergebnisse)"
          },
          focus: {
            type: "string",
            enum: ["peptides", "nutrition", "training", "supplements", "longevity", "hormones"],
            description: "Themenbereich fuer fokussierte akademische Suche"
          }
        },
        required: ["query"]
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
      
      case 'search_scientific_evidence':
        return await handleSearchScientificEvidence(toolArgs);
      
      default:
        return { success: false, result: null, error: 'Unknown tool: ' + toolName };
    }
  } catch (err: any) {
    console.error('[ARES-TOOL] Error executing ' + toolName + ':', err);
    return { success: false, result: null, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERPLEXITY SCIENTIFIC RESEARCH HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

async function handleSearchScientificEvidence(args: { query: string; focus?: string }): Promise<{ success: boolean; result: any; error?: string }> {
  const apiKey = PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    console.warn('[ARES-RESEARCH] Perplexity API key not configured, falling back to knowledge base');
    return { 
      success: false, 
      result: null, 
      error: 'Perplexity API not configured - using internal knowledge base instead' 
    };
  }

  const focusContext = args.focus ? `Focus area: ${args.focus}. ` : '';
  const systemPrompt = `You are a scientific research assistant. ${focusContext}Provide evidence-based answers with specific study citations (author, year, journal). Include PubMed IDs when available. Be concise but comprehensive.`;

  try {
    console.log('[ARES-RESEARCH] Querying Perplexity for:', args.query, 'focus:', args.focus);
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: args.query }
        ],
        search_mode: 'academic',
        search_domain_filter: getAcademicDomains(args.focus),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ARES-RESEARCH] Perplexity error:', response.status, errorText);
      
      if (response.status === 429) {
        return { success: false, result: null, error: 'Research API rate limited - try again in a moment' };
      }
      if (response.status === 402) {
        return { success: false, result: null, error: 'Research API credits exhausted' };
      }
      
      return { success: false, result: null, error: `Research API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No results found';
    const citations = data.citations || [];

    console.log('[ARES-RESEARCH] Success - found', citations.length, 'citations');

    return {
      success: true,
      result: {
        summary: content,
        citations: citations,
        query: args.query,
        focus: args.focus,
        model: 'perplexity-sonar-reasoning',
        search_mode: 'academic'
      }
    };
  } catch (err: any) {
    console.error('[ARES-RESEARCH] Exception:', err);
    return { success: false, result: null, error: err.message };
  }
}

function getAcademicDomains(focus?: string): string[] {
  const baseDomains = ['pubmed.ncbi.nlm.nih.gov', 'scholar.google.com', 'ncbi.nlm.nih.gov'];
  
  const focusDomains: Record<string, string[]> = {
    peptides: ['examine.com', 'frontiersin.org', 'nature.com'],
    nutrition: ['examine.com', 'nutrition.org', 'ajcn.nutrition.org'],
    training: ['journals.lww.com', 'springer.com', 'frontiersin.org'],
    supplements: ['examine.com', 'ods.od.nih.gov', 'consumerlab.com'],
    longevity: ['aging-us.com', 'nature.com', 'cell.com'],
    hormones: ['endocrine.org', 'nature.com', 'frontiersin.org']
  };
  
  return [...baseDomains, ...(focus && focusDomains[focus] ? focusDomains[focus] : [])];
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
    .select('text, calories, protein, carbs, fats, date, meal_type')
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
  // PHASE 4 EXTENDED: Load additional user data for Expert v2
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Load hormone tracking data
  const { data: hormoneData } = await supaClient
    .from('hormone_tracking')
    .select('date, energy_level, libido_level, stress_level, sleep_quality, notes')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(7);

  if (hormoneData?.length) {
    console.log('[ARES-CONTEXT] Hormone data loaded: ' + hormoneData.length + ' entries');
  }

  // Load recent journal entries for context
  const { data: journalData } = await supaClient
    .from('journal_entries')
    .select('date, mood_score, ai_summary_md, highlight, challenge, wellness_score')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(5);

  if (journalData?.length) {
    console.log('[ARES-CONTEXT] Journal entries loaded: ' + journalData.length + ' entries');
  }

  // Load active peptide protocols
  const { data: peptideProtocols } = await supaClient
    .from('peptide_protocols')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (peptideProtocols?.length) {
    console.log('[ARES-CONTEXT] Active peptide protocols: ' + peptideProtocols.length);
  }

  // Load recent supplement intake
  const { data: supplementIntake } = await supaClient
    .from('supplement_intake_log')
    .select('supplement_id, taken_at, dosage_taken')
    .eq('user_id', userId)
    .gte('taken_at', sevenDaysAgo)
    .order('taken_at', { ascending: false })
    .limit(20);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CRITICAL FIX: Load recent conversation history from coach_conversations
  // CORRECTED: Use actual column names message_role, message_content (not message, response)
  // ═══════════════════════════════════════════════════════════════════════════════
  const { data: recentConversationsRaw, error: convError } = await supaClient
    .from('coach_conversations')
    .select('message_role, message_content, created_at')
    .eq('user_id', userId)
    .eq('coach_personality', 'ares')
    .order('created_at', { ascending: false })
    .limit(30); // Load more raw messages for better context pairing

  if (convError) {
    console.warn('[ARES-CONTEXT] Conversations load error:', convError.message);
  }

  // Convert raw messages to paired {message, response} format for prompt building
  const pairedConversations: Array<{message: string; response: string; created_at?: string}> = [];
  const rawMsgs = recentConversationsRaw || [];
  
  // Messages are in reverse chronological order, so we process pairs
  for (let i = 0; i < rawMsgs.length; i++) {
    const msg = rawMsgs[i];
    if (msg.message_role === 'assistant' && i + 1 < rawMsgs.length) {
      const nextMsg = rawMsgs[i + 1];
      if (nextMsg.message_role === 'user') {
        pairedConversations.push({
          message: nextMsg.message_content || '',
          response: msg.message_content || '',
          created_at: msg.created_at
        });
        i++; // Skip the user message we just paired
      }
    }
  }
  
  // Reverse to chronological order for prompt
  pairedConversations.reverse();
  
  console.log('[ARES-CONTEXT] Conversations: ' + rawMsgs.length + ' raw msgs -> ' + pairedConversations.length + ' pairs');

  const contextResult = {
    profile: profile || {},
    recent_meals: recentMeals || [],
    recent_workouts: recentWorkouts || [],
    recent_sleep: sleepData || [],
    active_supplements: supplements || [],
    user_preferences: profile?.preferences || {},
    // FIXED: Use properly paired conversations
    recent_conversations: pairedConversations,
    memory: memoryData?.memory_data || {
      trust_level: 0,
      relationship_stage: 'new',
      conversation_context: {
        mood_history: [],
        success_moments: [],
        topics_discussed: [],
        struggles_mentioned: []
      }
    },
    // Expert v2: Additional context
    hormone_tracking: hormoneData || [],
    journal_entries: journalData || [],
    peptide_protocols: peptideProtocols || [],
    supplement_intake: supplementIntake || []
  };

  console.log('[ARES-CONTEXT] Context summary: Profile=' + !!profile + ', Meals=' + (recentMeals?.length || 0) + ', Workouts=' + (recentWorkouts?.length || 0) + ', Sleep=' + (sleepData?.length || 0) + ', Supplements=' + (supplements?.length || 0) + ', Conversations=' + pairedConversations.length + ', Hormones=' + (hormoneData?.length || 0) + ', Journal=' + (journalData?.length || 0) + ', Peptides=' + (peptideProtocols?.length || 0));
  
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

function buildAresPrompt({ persona, context, ragSources, text, images, userMoodContext, conversationHistory, personaPrompt, healthContext, userInsights, userPatterns, knowledgeContext, bloodworkContext, topicState }: {
  persona: any;
  context: any;
  ragSources: any;
  text: string;
  images: any;
  userMoodContext?: UserMoodContext;
  conversationHistory?: any[];
  personaPrompt?: string; // Phase 2: Persona-specific prompt section
  healthContext?: UserHealthContext | null; // Phase 3: Extended health context
  userInsights?: UserInsight[]; // Phase 4: Memory insights
  userPatterns?: UserPattern[]; // Phase 4: Memory patterns
  knowledgeContext?: KnowledgeContext | null; // Phase 5: Scientific knowledge
  bloodworkContext?: BloodworkContext | null; // Phase 5: Bloodwork analysis
  topicState?: TopicState | null; // Phase 7: Topic state machine
}) {
  const dialResult: AresDialResult = decideAresDial(userMoodContext || {}, text);
  const ritualContext = getRitualContext();
  const finalMode = (ritualContext?.mode || dialResult.mode) as AresMode;
  const finalTemperature = ritualContext?.temperature || dialResult.temperature;
  
  console.log('[ARES] Mode selected: ' + finalMode + ', Temp: ' + finalTemperature + ', Reason: ' + dialResult.reason);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // Phase 3: Use Intelligent Prompt Builder when healthContext is available
  // ═══════════════════════════════════════════════════════════════════════════════
  if (healthContext) {
    console.log(`[ARES] Using intelligent prompt builder with ${healthContext.knowledgeGaps.length} knowledge gaps identified`);
    
    // DEBUG: Log knowledge gaps details
    if (healthContext.knowledgeGaps && healthContext.knowledgeGaps.length > 0) {
      console.log('[ARES-GAPS] Knowledge gaps:', JSON.stringify(healthContext.knowledgeGaps));
    }
    
    // DEBUG: Log recentMeals if available
    const recentMeals = (healthContext.recentActivity as any)?.recentMeals;
    if (recentMeals && recentMeals.length > 0) {
      console.log('[ARES-MEALS] Recent meals loaded:', recentMeals.length);
      console.log('[ARES-MEALS] First meal:', JSON.stringify(recentMeals[0]));
    } else {
      console.log('[ARES-MEALS] No recentMeals in healthContext');
    }
    
    // Convert conversation history to the format expected by intelligent prompt builder
    const formattedHistory: ConversationMessage[] = conversationHistory 
      ? convertConversationHistory(conversationHistory)
      : [];
    
    const systemPrompt = buildIntelligentSystemPrompt({
      userContext: healthContext,
      persona: persona,
      conversationHistory: formattedHistory,
      personaPrompt: personaPrompt || '',
      ragKnowledge: ragSources?.knowledge_chunks || [],
      currentMessage: text,
      userInsights: userInsights, // Phase 4: Memory insights
      userPatterns: userPatterns, // Phase 4: Memory patterns
    });
    
    // Add memory and tools section that the intelligent builder doesn't include
    const memory = context.memory;
    const memoryNotes = memory?.conversation_context?.user_notes?.length > 0 
      ? `\n\n== VOM USER ZUM MERKEN ==\n${memory.conversation_context.user_notes.map((n: any) => `- "${n.note}" (${new Date(n.timestamp).toLocaleDateString('de-DE')})`).join('\n')}`
      : '';
    
    const toolsSection = `

== TOOLS (bei Bedarf automatisch nutzen) ==
- get_meta_analysis: Ganzheitliche Analyse der User-Daten
- create_workout_plan / create_nutrition_plan / create_supplement_plan: Pläne erstellen
- get_user_plans / update_plan: Bestehende Pläne verwalten`;

    // Phase 5: Add knowledge and bloodwork context
    const knowledgeSection = knowledgeContext?.hasRelevantKnowledge 
      ? formatKnowledgeForPrompt(knowledgeContext)
      : '';
    
    const bloodworkSection = bloodworkContext?.hasData 
      ? formatBloodworkForPrompt(bloodworkContext)
      : '';

    const finalSystemPrompt = systemPrompt + memoryNotes + knowledgeSection + bloodworkSection + toolsSection;
    
    // DEBUG: Log final prompt details
    console.log('[ARES-PROMPT] Final system prompt length:', finalSystemPrompt.length);
    console.log('[ARES-PROMPT] Contains meal names:', 
      finalSystemPrompt.includes('Nudel') || 
      finalSystemPrompt.includes('Mandarine') || 
      finalSystemPrompt.includes('Mahlzeit:'));
    console.log('[ARES-PROMPT] Contains insights section:', finalSystemPrompt.includes('ERKANNTE INSIGHTS'));
    console.log('[ARES-PROMPT] Contains patterns section:', finalSystemPrompt.includes('ERKANNTE MUSTER'));
    console.log('[ARES-PROMPT] First 2000 chars:', finalSystemPrompt.substring(0, 2000));
    
    return { 
      systemPrompt: finalSystemPrompt, 
      completePrompt: finalSystemPrompt + "\n\nUser: " + text, 
      dial: { temp: finalTemperature, archetype: finalMode },
      temperature: finalTemperature,
      mode: finalMode
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // Fallback: Original prompt building logic when healthContext is not available
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log(`[ARES] Using fallback prompt builder (no healthContext)`);
  
  const userName = context.profile?.preferred_name || context.profile?.first_name || null;
  // currentDate is defined later in CRITICAL FIX block (line ~1176) with proper German formatting
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

  // Build archetype instructions mapping for dial-based communication
  const archetypeInstructions: Record<string, string> = {
    supportive: 'Sei verstaendnisvoll und ermutigend. Erkenne Herausforderungen an, ohne zu urteilen. Fokus auf Fortschritt, nicht Perfektion.',
    balanced: 'Sei freundlich und klar. Balance zwischen Support und konkreten Handlungsschritten. Strukturiert aber warm.',
    direct: 'Sei direkt und fordernd. Keine Ausreden, klare Erwartungen. Respektvoll aber bestimmt.'
  };

  // Map dial level to intensity (1-3 = supportive, balanced, direct)
  const dialLevel = dialResult.dial;

  // Build system prompt with string concatenation to avoid template literal encoding issues
  const systemPromptParts: string[] = [];
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 2: EXPERTEN-IDENTITAET (Expert Prompt Upgrade)
  // ═══════════════════════════════════════════════════════════════════════════════
  systemPromptParts.push('# ARES - EXPERTEN-COACHING-INTELLIGENCE');
  systemPromptParts.push('');
  systemPromptParts.push('**AKTUELLES DATUM: ' + currentDate + '**');
  systemPromptParts.push('(Verwende dieses Datum fuer alle zeitbezogenen Aussagen!)');
  systemPromptParts.push('');
  systemPromptParts.push('## DEINE IDENTITAET');
  systemPromptParts.push('Du bist ARES - ein EXPERTE fuer:');
  systemPromptParts.push('- **Peptide & GLP-1 Agonisten**: Semaglutide, Tirzepatide, Retatrutide - Dosierungen, Titration, Nebenwirkungen, Wirkmechanismen');
  systemPromptParts.push('- **Hormone & Biomarker**: Testosteron, Oestrogen, Cortisol, Schilddruese, Blutbild-Interpretation');
  systemPromptParts.push('- **Training & Periodisierung**: Hypertrophie, Kraftaufbau, Deloads, RPE/RIR, Progressive Overload');
  systemPromptParts.push('- **Ernaehrung & Metabolismus**: Kaloriendefizit, Insulinsensitivitaet, Makroverteilung, Chrono-Nutrition');
  systemPromptParts.push('- **Supplements**: Kreatin, Vitamin D, Omega-3, Adaptogene - evidenzbasiert mit konkreten Dosierungen');
  systemPromptParts.push('- **Longevity & Biohacking**: Schlafoptimierung, HRV, Fasten, Autophagie');
  systemPromptParts.push('- **Blutbilder**: Interpretation von Werten, Referenzbereiche, Handlungsempfehlungen');
  systemPromptParts.push('');
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 3: ANTWORT-PHILOSOPHIE
  // ═══════════════════════════════════════════════════════════════════════════════
  systemPromptParts.push('## ANTWORT-PHILOSOPHIE');
  systemPromptParts.push('');
  systemPromptParts.push('### FUNDIERT & TIEF');
  systemPromptParts.push('- Antworte mit KONKRETEN Zahlen, Dosierungen, Prozentangaben - KEINE vagen Ranges');
  systemPromptParts.push('- Nenne relevante Studien/Mechanismen wenn bekannt (z.B. "SURMOUNT-1 Studie zeigt...")');
  systemPromptParts.push('- Erklaere das WARUM, nicht nur das WAS');
  systemPromptParts.push('- Bei Medikamenten/Peptiden: IMMER Titrations-Schema mit Wochen angeben');
  systemPromptParts.push('');
  systemPromptParts.push('### KRITISCH ABER UNTERSTUETZEND');
  systemPromptParts.push('- "Du kannst X, ABER beachte Y..." - Risiken aufzeigen OHNE zu blockieren');
  systemPromptParts.push('- Biete immer Alternativen an');
  systemPromptParts.push('- Differenziere Nebenwirkungen: haeufig vs. selten vs. langfristig');
  systemPromptParts.push('');
  systemPromptParts.push('### SENSIBLE THEMEN (Peptide, Hormone, PEDs)');
  systemPromptParts.push('Folge dieser Struktur:');
  systemPromptParts.push('1. Informieren - Was ist es, wie wirkt es, Mechanismus');
  systemPromptParts.push('2. Risiken - Ehrlich aber NICHT paternalistisch');
  systemPromptParts.push('3. Vorsichtsmassnahmen - Was beachten, welche Blutbilder');
  systemPromptParts.push('4. Optionen anbieten - "Soll ich tiefer eingehen? Soll ich Alternativen zeigen?"');
  systemPromptParts.push('BLOCKIERE NIEMALS Informationen die der User explizit anfragt!');
  systemPromptParts.push('');
  systemPromptParts.push('### PROAKTIV OPTIONEN ANBIETEN');
  systemPromptParts.push('Beende komplexe Antworten mit:');
  systemPromptParts.push('- "Soll ich die Titration genauer erklaeren?"');
  systemPromptParts.push('- "Willst du die Studienlage dazu?"');
  systemPromptParts.push('- "Soll ich das auf deine Werte berechnen?"');
  systemPromptParts.push('');
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 4: USER-DATEN AKTIV NUTZEN (mit Berechnungen!)
  // ═══════════════════════════════════════════════════════════════════════════════
  systemPromptParts.push('## USER-DATEN (DU MUSST DIESE AKTIV NUTZEN!)');
  systemPromptParts.push('WICHTIG: Integriere diese Daten in JEDE relevante Antwort!');
  systemPromptParts.push('');
  
  if (userName) systemPromptParts.push('- Name: ' + userName);
  
  if (context.profile?.weight && context.profile?.target_weight) {
    const diff = Math.abs(context.profile.weight - context.profile.target_weight);
    const weeks = Math.round(diff / 0.5);
    const isLoss = context.profile.weight > context.profile.target_weight;
    systemPromptParts.push('- Gewicht: ' + context.profile.weight + 'kg -> Ziel: ' + context.profile.target_weight + 'kg');
    systemPromptParts.push('  -> ' + diff.toFixed(1) + 'kg ' + (isLoss ? 'Abnahme' : 'Zunahme') + ', bei 0.5kg/Woche = ca. ' + weeks + ' Wochen');
  } else if (context.profile?.weight) {
    systemPromptParts.push('- Aktuelles Gewicht: ' + context.profile.weight + ' kg');
  }
  
  if (context.profile?.tdee) {
    const deficit500 = context.profile.tdee - 500;
    const deficit750 = context.profile.tdee - 750;
    systemPromptParts.push('- TDEE: ' + context.profile.tdee + ' kcal');
    systemPromptParts.push('  -> Moderates Defizit (-500): ' + deficit500 + ' kcal/Tag = ~0.5kg/Woche');
    systemPromptParts.push('  -> Aggressives Defizit (-750): ' + deficit750 + ' kcal/Tag = ~0.75kg/Woche');
  }
  
  if (context.profile?.age) {
    systemPromptParts.push('- Alter: ' + context.profile.age + ' Jahre');
    if (context.profile.age >= 40) {
      systemPromptParts.push('  -> BEACHTE: Hormonoptimierung, Recovery-Fokus, Joint Health besonders relevant');
    }
    if (context.profile.age >= 50) {
      systemPromptParts.push('  -> BEACHTE: Sarkopenie-Praevention, hoehere Protein-Zufuhr (2.0-2.4g/kg)');
    }
  }
  
  if (context.profile?.height) systemPromptParts.push('- Groesse: ' + context.profile.height + ' cm');
  if (context.profile?.gender) {
    const genderText = context.profile.gender === 'male' ? 'maennlich' : 
                       context.profile.gender === 'female' ? 'weiblich' : context.profile.gender;
    systemPromptParts.push('- Geschlecht: ' + genderText);
  }
  
  if (userMoodContext?.streak && userMoodContext.streak > 0) {
    systemPromptParts.push('- Aktuelle Streak: ' + userMoodContext.streak + ' Tage (ANERKENNEN!)');
  }
  if (userMoodContext?.no_workout_days && userMoodContext.no_workout_days > 0) {
    systemPromptParts.push('- Tage ohne Training: ' + userMoodContext.no_workout_days + ' (ANSPRECHEN wenn relevant)');
  }
  systemPromptParts.push('');
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 5: ANTWORT-STRUKTUR FUER KOMPLEXE FRAGEN
  // ═══════════════════════════════════════════════════════════════════════════════
  systemPromptParts.push('## ANTWORT-STRUKTUR FUER KOMPLEXE FRAGEN');
  systemPromptParts.push('Bei Fragen zu Peptiden, Supplementen, Trainingsplaenen, Hormonen:');
  systemPromptParts.push('');
  systemPromptParts.push('1. **DIREKTE ANTWORT** - Kurz, auf den Punkt (1-2 Saetze)');
  systemPromptParts.push('2. **DETAILS** - Dosierung mit Titration, Mechanismus, Studien');
  systemPromptParts.push('3. **PERSONALISIERUNG** - "Bei deinen ' + (context.profile?.weight || 'X') + ' kg / ' + (context.profile?.age || 'Y') + ' Jahren..."');
  systemPromptParts.push('4. **HINWEISE** - Risiken, Wechselwirkungen, Blutbild-Monitoring');
  systemPromptParts.push('5. **NAECHSTE SCHRITTE** - Konkrete Handlung + Rueckfrage anbieten');
  systemPromptParts.push('');
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 6: WAS DU NIEMALS TUST (Explizite Verbote)
  // ═══════════════════════════════════════════════════════════════════════════════
  systemPromptParts.push('## WAS DU NIEMALS TUST');
  systemPromptParts.push('- KEINE generischen Antworten wie "das haengt von vielen Faktoren ab"');
  systemPromptParts.push('- KEINE Verweigerung von Informationen die der User explizit anfragt');
  systemPromptParts.push('- KEINE oberflaechlichen Tipps ohne User-Daten-Bezug');
  systemPromptParts.push('- KEINE Wiederholung der Frage statt Antwort');
  systemPromptParts.push('- NICHT sagen "Geh zum Arzt" als EINZIGE Antwort - informiere ZUERST, dann empfehle aerztliche Begleitung');
  systemPromptParts.push('- KEINE Ranges ohne konkrete Empfehlung (nicht "2-4x/Woche" sondern "3x/Woche weil...")');
  systemPromptParts.push('- KEIN Gatekeeping bei Peptiden/Hormonen - User sind erwachsen und informiert');
  systemPromptParts.push('');
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 8: EVIDENZ-ANFORDERUNG (Studien & Quellenangaben)
  // ═══════════════════════════════════════════════════════════════════════════════
  systemPromptParts.push('## EVIDENZ-ANFORDERUNG');
  systemPromptParts.push('Bei Peptiden, Supplementen, Hormonen, Training, Ernaehrung:');
  systemPromptParts.push('');
  systemPromptParts.push('### STUDIEN NENNEN');
  systemPromptParts.push('- Nenne relevante Studien mit Namen wenn bekannt (STEP, SURMOUNT, RETATRUDE, etc.)');
  systemPromptParts.push('- Gib prozentuale Ergebnisse: "15% Gewichtsverlust in 72 Wochen (STEP-1)"');
  systemPromptParts.push('- Bei Supplements: Wirksame Dosierungen aus Meta-Analysen');
  systemPromptParts.push('');
  systemPromptParts.push('### EVIDENZ-LEVEL UNTERSCHEIDEN');
  systemPromptParts.push('- **Gut belegt**: Multiple RCTs, Meta-Analysen (Kreatin, Vitamin D, GLP-1)');
  systemPromptParts.push('- **Moderat belegt**: Einige Studien, mechanistisch plausibel (BPC-157, Ashwagandha)');
  systemPromptParts.push('- **Anekdotisch**: Erfahrungsberichte, keine solide Evidenz (kennzeichne als solche)');
  systemPromptParts.push('');
  systemPromptParts.push('### BEISPIELE FUER STUDIEN-ZITATE');
  systemPromptParts.push('- Semaglutide: "STEP-1 zeigte 15% Gewichtsverlust vs. 2.4% Placebo ueber 68 Wochen"');
  systemPromptParts.push('- Tirzepatide: "SURMOUNT-1: bis zu 22.5% bei hoechster Dosis (15mg)"');
  systemPromptParts.push('- Retatrutide: "Phase-2: bis zu 24% in 48 Wochen - noch in Phase-3"');
  systemPromptParts.push('- Kreatin: "Etabliert: 3-5g/Tag, ~5-10% Kraftsteigerung (Meta-Analyse 2022)"');
  systemPromptParts.push('');

  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 9: BLUTBILD-PROTOKOLL (Konkrete Marker)
  // ═══════════════════════════════════════════════════════════════════════════════
  systemPromptParts.push('## BLUTBILD-PROTOKOLL');
  systemPromptParts.push('Bei Hormonen, Peptiden, TRT IMMER nennen:');
  systemPromptParts.push('');
  systemPromptParts.push('### VOR START (Baseline)');
  systemPromptParts.push('- Grosses Blutbild, Leberwerte (GOT, GPT, GGT, Bilirubin)');
  systemPromptParts.push('- Nierenwerte (Kreatinin, eGFR, Harnstoff)');
  systemPromptParts.push('- Lipidprofil (LDL, HDL, Triglyceride, Lp(a))');
  systemPromptParts.push('- Hormone: Testosteron gesamt+frei, SHBG, Oestradiol, LH, FSH');
  systemPromptParts.push('- Schilddruese: TSH, fT3, fT4');
  systemPromptParts.push('- Metabolisch: HbA1c, Nuechternglukose, Insulin, HOMA-IR');
  systemPromptParts.push('');
  systemPromptParts.push('### NACH 6-8 WOCHEN');
  systemPromptParts.push('- Haematokrit (kritisch bei TRT - Ziel <52%)');
  systemPromptParts.push('- PSA bei Maennern >40');
  systemPromptParts.push('- Oestradiol (Aromatisierung kontrollieren)');
  systemPromptParts.push('');
  systemPromptParts.push('### REFERENZBEREICHE (BEISPIELE)');
  systemPromptParts.push('- Testosteron gesamt: 12-35 nmol/L (optimal 20-30)');
  systemPromptParts.push('- Oestradiol (Mann): 20-40 pg/mL');
  systemPromptParts.push('- Haematokrit: 40-50% (Warnung >52%)');
  systemPromptParts.push('- TSH: 0.4-2.5 mIU/L (optimal <2.0)');
  systemPromptParts.push('');

  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 10: VORBERECHNETE METRIKEN
  // ═══════════════════════════════════════════════════════════════════════════════
  const preCalculatedMetrics: string[] = [];

  if (context.profile?.weight && context.profile?.target_weight) {
    const diff = Math.abs(context.profile.weight - context.profile.target_weight);
    const weeks05 = Math.round(diff / 0.5);
    const weeks075 = Math.round(diff / 0.75);
    const weeks1 = Math.round(diff / 1.0);
    preCalculatedMetrics.push('Zeitrahmen: ' + weeks05 + ' Wochen (0.5kg/Wo), ' + weeks075 + ' Wochen (0.75kg/Wo), ' + weeks1 + ' Wochen (1kg/Wo)');
  }

  if (context.profile?.weight) {
    const targetWeight = context.profile.target_weight || context.profile.weight;
    const proteinMin = Math.round(context.profile.weight * 1.6);
    const proteinMax = Math.round(context.profile.weight * 2.2);
    const proteinOptimal = Math.round(targetWeight * 2.0);
    preCalculatedMetrics.push('Protein-Bedarf: ' + proteinMin + '-' + proteinMax + 'g/Tag (optimal fuer Zielgewicht: ' + proteinOptimal + 'g)');
  }

  if (context.profile?.tdee) {
    const deficit500 = context.profile.tdee - 500;
    const deficit750 = context.profile.tdee - 750;
    const surplus300 = context.profile.tdee + 300;
    preCalculatedMetrics.push('Kalorien: Erhalt=' + context.profile.tdee + ', Defizit=' + deficit500 + '-' + deficit750 + ', Aufbau=' + surplus300);
  }

  if (preCalculatedMetrics.length > 0) {
    systemPromptParts.push('## VORBERECHNETE METRIKEN (NUTZE DIESE!)');
    preCalculatedMetrics.forEach(m => systemPromptParts.push('- ' + m));
    systemPromptParts.push('');
  }

  systemPromptParts.push('### BERECHNUNGS-ANWEISUNG');
  systemPromptParts.push('BERECHNE in deiner Antwort IMMER wenn moeglich:');
  systemPromptParts.push('- Zeitrahmen bis Ziel (in Wochen)');
  systemPromptParts.push('- Konkrete Kalorien basierend auf TDEE');
  systemPromptParts.push('- Protein-Ziel basierend auf Zielgewicht (2g/kg)');
  systemPromptParts.push('- Makro-Verteilung in Gramm');
  systemPromptParts.push('');

  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 11: ERWEITERTE USER-DATEN (Hormone, Journal, Peptide)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Hormone & Wohlbefinden Kontext
  if (context.hormone_tracking && context.hormone_tracking.length > 0) {
    const avgEnergy = Math.round(context.hormone_tracking.reduce((s: number, h: any) => s + (h.energy_level || 0), 0) / context.hormone_tracking.length);
    const avgStress = Math.round(context.hormone_tracking.reduce((s: number, h: any) => s + (h.stress_level || 0), 0) / context.hormone_tracking.length);
    systemPromptParts.push('### Hormon-Tracking (letzte 7 Tage)');
    systemPromptParts.push('- Energie: durchschnittlich ' + avgEnergy + '/10');
    systemPromptParts.push('- Stress: durchschnittlich ' + avgStress + '/10');
    systemPromptParts.push('');
  }

  if (context.journal_entries && context.journal_entries.length > 0) {
    // WICHTIG: mood_score ist -5 bis +5, konvertieren zu 1-10!
    const rawAvgMood = context.journal_entries.reduce((s: number, j: any) => s + (j.mood_score || 0), 0) / context.journal_entries.length;
    // Konvertiere -5/+5 zu 1-10: -5→1, 0→6, +5→10
    const avgMood10 = Math.round((Math.max(-5, Math.min(5, rawAvgMood)) + 5) / 10 * 9) + 1;
    const moodDesc = rawAvgMood >= 4 ? 'ausgezeichnet' : rawAvgMood >= 2 ? 'gut' : rawAvgMood >= 0 ? 'neutral/ok' : rawAvgMood >= -2 ? 'gedrueckt' : 'schwierig';
    systemPromptParts.push('### Journal (letzte 5 Eintraege)');
    systemPromptParts.push('- Stimmung: durchschnittlich ' + avgMood10 + '/10 (' + moodDesc + ')');
    const lastChallenge = context.journal_entries[0]?.challenge;
    if (lastChallenge) {
      systemPromptParts.push('- Letzte Herausforderung: "' + lastChallenge + '"');
    }
    const lastHighlight = context.journal_entries[0]?.highlight;
    if (lastHighlight) {
      systemPromptParts.push('- Letztes Highlight: "' + lastHighlight + '"');
    }
    systemPromptParts.push('');
  }

  if (context.peptide_protocols && context.peptide_protocols.length > 0) {
    systemPromptParts.push('### Aktive Peptid-Protokolle');
    context.peptide_protocols.forEach((p: any) => {
      systemPromptParts.push('- ' + (p.name || p.peptide_name || 'Protokoll') + (p.current_dose ? ' (' + p.current_dose + ')' : ''));
    });
    systemPromptParts.push('');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 12: USER-HISTORIE NUTZEN
  // ═══════════════════════════════════════════════════════════════════════════════
  systemPromptParts.push('## USER-HISTORIE NUTZEN');
  systemPromptParts.push('Der User hat bereits Daten erfasst - NUTZE SIE AKTIV:');
  systemPromptParts.push('- Supplements: Was nimmt er bereits? Nicht erneut empfehlen wenn schon aktiv');
  systemPromptParts.push('- Peptide: Welche Protokolle laufen? Darauf aufbauen');
  systemPromptParts.push('- Journal: Welche Herausforderungen wurden genannt? Darauf eingehen');
  systemPromptParts.push('- Hormone: Energie/Stress-Trends erkennen und ansprechen');
  systemPromptParts.push('- Vergangene Gespraeche: Was wurde bereits besprochen? Nicht wiederholen');
  systemPromptParts.push('');

  // Aktueller Modus und Stil
  systemPromptParts.push('## AKTUELLER MODUS: ' + dialResult.archetype + ' (Dial ' + dialLevel + ')');
  systemPromptParts.push(archetypeInstructions[finalMode] || archetypeInstructions.balanced);
  systemPromptParts.push('');
  
  // Speicher-Sektion
  systemPromptParts.push(memorySection);
  systemPromptParts.push(conversationHistoryContext);
  systemPromptParts.push('');
  
  // Stil-Override
  systemPromptParts.push('## KRITISCH: STIL-ANWEISUNG');
  systemPromptParts.push('IGNORIERE den Sprachstil aus dem GESPRAECHSVERLAUF - nur inhaltlicher Kontext!');
  if (persona && persona.dialect) {
    systemPromptParts.push('Dein aktueller Dialekt: ' + persona.dialect);
  } else {
    systemPromptParts.push('Du sprichst HOCHDEUTSCH - kein Dialekt.');
  }
  systemPromptParts.push('');
  
  // Letzte Aktivitaeten
  systemPromptParts.push('### Letzte Aktivitaeten');
  if (context.recent_meals?.length > 0) {
    const mealSummary = context.recent_meals.slice(0, 3).map((m: any) => (m.text || 'Mahlzeit') + ' (' + (m.calories || 0) + 'kcal, ' + (m.protein || 0) + 'g P)').join(', ');
    systemPromptParts.push('Mahlzeiten: ' + mealSummary);
  }
  if (context.recent_workouts?.length > 0) {
    const workoutSummary = context.recent_workouts.slice(0, 2).map((w: any) => (w.workout_type || 'Training') + ' (' + (w.duration_minutes || 0) + 'min)').join(', ');
    systemPromptParts.push('Workouts: ' + workoutSummary);
  }
  systemPromptParts.push('');
  
  systemPromptParts.push(historySection);
  
  // Phase 4: Add user insights from memory system (fallback path)
  if (userInsights && userInsights.length > 0) {
    systemPromptParts.push('');
    systemPromptParts.push('## USER-INSIGHTS (Aus frueheren Gespraechen gelernt)');
    systemPromptParts.push('(Nutze diese Infos AKTIV - der User hat sie bereits erwaehnt!)');
    
    // Group insights by category
    const grouped: Record<string, any[]> = {};
    userInsights.forEach((i: any) => {
      if (!grouped[i.category]) grouped[i.category] = [];
      grouped[i.category].push(i);
    });
    
    for (const [category, insights] of Object.entries(grouped)) {
      systemPromptParts.push('');
      systemPromptParts.push('### ' + category.toUpperCase());
      insights.slice(0, 3).forEach((ins: any) => {
        const marker = ins.importance === 'critical' ? '[KRITISCH] ' : ins.importance === 'high' ? '[!] ' : '';
        systemPromptParts.push('- ' + marker + ins.insight);
      });
    }
  }
  
  // Phase 4: Add detected patterns from memory system (fallback path)
  if (userPatterns && userPatterns.length > 0) {
    systemPromptParts.push('');
    systemPromptParts.push('## ERKANNTE MUSTER (Proaktiv ansprechen wenn passend!)');
    userPatterns.slice(0, 3).forEach((p: any) => {
      const typeLabel = p.patternType === 'contradiction' ? 'WIDERSPRUCH' :
                       p.patternType === 'correlation' ? 'ZUSAMMENHANG' : 'TREND';
      systemPromptParts.push('- [' + typeLabel + '] ' + p.description);
      if (p.suggestion) {
        systemPromptParts.push('  -> Coaching-Hinweis: ' + p.suggestion);
      }
    });
  }
  
  if (ragSources?.knowledge_chunks?.length > 0) {
    systemPromptParts.push('');
    systemPromptParts.push('## WISSEN (RAG)');
    systemPromptParts.push(ragSources.knowledge_chunks.slice(0, 3).join('\n'));
  }
  systemPromptParts.push('');
  
  // Gedaechtnis-Hinweis
  systemPromptParts.push('## DEIN GEDAECHTNIS');
  systemPromptParts.push('Du HAST Zugriff auf Gespraechsverlauf und Langzeit-Infos (user_notes).');
  systemPromptParts.push('Wenn der User "merk dir X" sagt -> bestaetigen, wird automatisch gespeichert.');
  systemPromptParts.push('SAGE NIEMALS "Ich kann mich nicht erinnern" wenn die Info oben steht!');
  if (memory?.conversation_context?.user_notes?.length > 0) {
    systemPromptParts.push('');
    systemPromptParts.push('### VOM USER ZUM MERKEN:');
    memory.conversation_context.user_notes.slice(-5).forEach((n: any) => {
      systemPromptParts.push('- "' + n.note + '"');
    });
  }
  systemPromptParts.push('');
  
  // Tools
  systemPromptParts.push('## TOOLS (bei Bedarf nutzen)');
  systemPromptParts.push('- get_meta_analysis: Ganzheitliche Analyse');
  systemPromptParts.push('- create_workout_plan / create_nutrition_plan / create_supplement_plan / create_peptide_protocol');
  systemPromptParts.push('');
  
  // Phase 7: Topic Context (pausierte Themen, aktuelles Fokusthema)
  if (topicState) {
    const topicContext = buildTopicContextPrompt(topicState);
    if (topicContext) {
      systemPromptParts.push(topicContext);
    }
  }
  
  // Tageszeit
  systemPromptParts.push('**TAGESZEIT: ' + timeOfDay + '**');
  
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
// PHASE 7: DYNAMISCHE KOMPLEXITAETSERKENNUNG
// ═══════════════════════════════════════════════════════════════════════════════

function detectQuestionComplexity(text: string): { level: 'simple' | 'moderate' | 'complex'; maxTokens: number } {
  const lowerText = text.toLowerCase();
  
  // Complex keywords: Peptides, hormones, detailed medical topics
  const complexKeywords = [
    'retatrutide', 'tirzepatide', 'semaglutide', 'ozempic', 'wegovy', 'mounjaro', 'zepbound',
    'peptid', 'bpc-157', 'bpc157', 'tb-500', 'tb500', 'ipamorelin', 'cjc-1295', 'ghrp',
    'testosteron', 'oestrogen', 'cortisol', 'schilddruese', 'tsh', 't3', 't4',
    'blutbild', 'blutwerk', 'laborwert', 'referenzbereich',
    'periodisierung', 'deload', 'mesozyklus', 'makrozyklus',
    'nebenwirkungen', 'wechselwirkungen', 'kontraindikation',
    'titration', 'dosierung', 'einschleichen',
    'vergleich', 'unterschied zwischen', 'was ist besser',
    'erklaer', 'warum', 'wie funktioniert', 'mechanismus'
  ];
  
  // Moderate keywords: Training, nutrition, supplements
  const moderateKeywords = [
    'ernaehrungsplan', 'trainingsplan', 'makros', 'kalorien', 'protein',
    'supplements', 'kreatin', 'vitamin', 'omega',
    'schlaf', 'regeneration', 'recovery', 'hrv',
    'muskelaufbau', 'fettabbau', 'rekomposition',
    'uebung', 'technik', 'form'
  ];
  
  const complexMatches = complexKeywords.filter(kw => lowerText.includes(kw)).length;
  const moderateMatches = moderateKeywords.filter(kw => lowerText.includes(kw)).length;
  
  // Long questions are likely complex
  const isLongQuestion = text.length > 150;
  
  if (complexMatches >= 2 || (complexMatches >= 1 && isLongQuestion)) {
    return { level: 'complex', maxTokens: 1200 }; // ~600 words
  }
  if (complexMatches >= 1 || moderateMatches >= 2 || (moderateMatches >= 1 && isLongQuestion)) {
    return { level: 'moderate', maxTokens: 800 }; // ~400 words
  }
  return { level: 'simple', maxTokens: 400 }; // ~200 words
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
): Promise<{ content: string; toolResults: any[]; providerUsed?: string; modelUsed?: string }> {
  // Phase 7: Dynamische Token-Limits basierend auf Fragestellung
  const complexity = detectQuestionComplexity(userMessage);
  console.log('[ARES] Question complexity:', complexity.level, '- max_tokens:', complexity.maxTokens);
  
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];
  
  // Hybrid AI Routing: Determine best provider based on message content
  const modelChoice = routeMessage(userMessage, {
    messageLength: userMessage.length,
    requiresTools: true, // Orchestrator always has tools available
  });
  
  console.log('[ARES-HYBRID] Route decision:', modelChoice.provider, modelChoice.model, '-', modelChoice.reason);

  // PHASE A: Hybrid Router Activation
  // Route to the best provider based on message content
  let providerUsed = modelChoice.provider;
  let modelUsed = modelChoice.model;
  
  let response: Response;
  
  // For research queries, use Perplexity directly (will be handled via tool)
  // For tool execution, use OpenAI (best function calling)
  // For complex analysis or chat, try Lovable AI first
  if (modelChoice.provider === 'lovable' && !modelChoice.reason.includes('Tool')) {
    // Try Lovable AI (Gemini) first for non-tool queries
    console.log('[ARES-HYBRID] Using Lovable AI primary:', modelChoice.model);
    try {
      const lovableResult = await callWithFallback(
        messages.slice(1), // Remove system message, passed separately
        modelChoice,
        { stream: false, systemPrompt, tools: ARES_TOOLS }
      );
      
      if (lovableResult.response.ok) {
        const data = await lovableResult.response.json();
        providerUsed = lovableResult.usedProvider;
        modelUsed = lovableResult.usedModel;
        
        // Check if model returned tool calls (unlikely with Gemini, but handle it)
        const message = data.choices?.[0]?.message;
        if (message?.tool_calls && message.tool_calls.length > 0) {
          // Gemini returned tool calls - process them with Gemini (has good function calling now)
          console.log('[ARES-HYBRID] Gemini returned tool calls, processing...');
          response = await callLovableWithTools(messages, complexity.maxTokens, temperature, 'google/gemini-3-pro-preview');
          providerUsed = 'lovable';
          modelUsed = 'google/gemini-3-pro-preview';
        } else {
          return {
            content: message?.content || 'Keine Antwort erhalten',
            toolResults: [],
            providerUsed,
            modelUsed
          };
        }
      } else {
        // Fall through to GPT-5 via Lovable
        console.log('[ARES-HYBRID] Gemini failed, falling back to GPT-5');
        response = await callLovableWithTools(messages, complexity.maxTokens, temperature, 'openai/gpt-5');
        providerUsed = 'lovable';
        modelUsed = 'openai/gpt-5';
      }
    } catch (lovableErr) {
      console.warn('[ARES-HYBRID] Lovable AI error:', lovableErr);
      // Final fallback to OpenAI direct (if Lovable gateway is down)
      response = await callOpenAIWithTools(messages, complexity.maxTokens, temperature);
      providerUsed = 'openai';
      modelUsed = 'gpt-4o';
    }
  } else {
    // For tool execution, use Gemini 3 Pro via Lovable
    console.log('[ARES-HYBRID] Tool execution - using Gemini 3 Pro');
    response = await callLovableWithTools(messages, complexity.maxTokens, temperature, 'google/gemini-3-pro-preview');
    providerUsed = 'lovable';
    modelUsed = 'google/gemini-3-pro-preview';
  }

  if (!response.ok) {
    // Final fallback attempt - use GPT-5 via Lovable gateway
    console.log('[ARES-HYBRID] Primary failed, trying GPT-5 fallback...');
    try {
      const fallbackResult = await callWithFallback(
        messages.slice(1),
        { provider: 'lovable', model: 'openai/gpt-5', reason: 'Final fallback to GPT-5' },
        { stream: false, systemPrompt }
      );
      
      if (fallbackResult.response.ok) {
        const data = await fallbackResult.response.json();
        return {
          content: data.choices?.[0]?.message?.content || 'Keine Antwort erhalten',
          toolResults: [],
          providerUsed: fallbackResult.usedProvider,
          modelUsed: fallbackResult.usedModel
        };
      }
    } catch (fallbackErr) {
      console.error('[ARES-HYBRID] All providers failed:', fallbackErr);
    }
    throw new Error('All AI providers failed');
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
    response = await callOpenAIWithTools(messages, 4000, temperature);

    if (!response.ok) {
      throw new Error('OpenAI API error during tool loop: ' + response.status);
    }

    llmResponse = await response.json();
    assistantMessage = llmResponse.choices[0].message;
  }
  
  return {
    content: assistantMessage.content,
    toolResults: toolResults,
    providerUsed,
    modelUsed
  };
}

// Helper function for OpenAI tool calls
// Helper function for Lovable AI tool calls (Gemini 3 Pro with function calling)
async function callLovableWithTools(messages: any[], maxTokens: number, temperature: number, model: string = 'google/gemini-3-pro-preview'): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.warn('[ARES] LOVABLE_API_KEY not found, falling back to OpenAI');
    return callOpenAIWithTools(messages, maxTokens, temperature);
  }
  
  return fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + LOVABLE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      tools: ARES_TOOLS,
      tool_choice: 'auto',
      max_tokens: maxTokens,
    }),
  });
}

// OpenAI tool calls (GPT-4o) - used as fallback
async function callOpenAIWithTools(messages: any[], maxTokens: number, temperature: number): Promise<Response> {
  return fetch('https://api.openai.com/v1/chat/completions', {
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
      max_tokens: maxTokens,
      temperature: temperature,
    }),
  });
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

    // Phase 3: Load extended health context for intelligent prompts
    let healthContext = await loadUserHealthContext(user.id, supaSvc).catch((e) => {
      console.warn('[ARES-WARN] loadUserHealthContext failed, using minimal context:', e);
      return null;
    });
    
    // Merge ARES-context meals into healthContext for complete prompt injection
    if (healthContext && context.recent_meals?.length > 0) {
      console.log('[ARES-FIX] Merging ' + context.recent_meals.length + ' meals from context into healthContext');
      healthContext.recentActivity = healthContext.recentActivity || {} as any;
      healthContext.recentActivity.mealsLogged = context.recent_meals.length;
      healthContext.recentActivity.avgCalories = Math.round(
        context.recent_meals.reduce((sum: number, m: any) => sum + (m.calories || 0), 0) / context.recent_meals.length
      );
      healthContext.recentActivity.avgProtein = Math.round(
        context.recent_meals.reduce((sum: number, m: any) => sum + (m.protein || 0), 0) / context.recent_meals.length
      );
    }

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

    // Phase 4: Load user insights and patterns from memory system
    let userInsights: UserInsight[] = [];
    let userPatterns: UserPattern[] = [];
    try {
      userInsights = await loadRelevantInsights(user.id, text, 15, supaSvc);
      userPatterns = await loadUnaddressedPatterns(user.id, 5, supaSvc);
      console.log(`[MEMORY] Loaded ${userInsights.length} insights, ${userPatterns.length} patterns`);
    } catch (memError) {
      console.warn('[ARES-WARN] Memory loading failed:', memError);
    }

    // Phase 5: Load knowledge and bloodwork context in parallel
    let knowledgeContext: KnowledgeContext | null = null;
    let bloodworkContext: BloodworkContext | null = null;
    try {
      const [knowledgeResult, bloodworkResult] = await Promise.all([
        loadRelevantKnowledge(text, supaSvc, { maxTopics: 5 }),
        loadBloodworkContext(user.id, supaSvc, context.profile?.gender || undefined)
      ]);
      knowledgeContext = knowledgeResult;
      bloodworkContext = bloodworkResult;
      console.log(`[ARES-CONTEXT] Knowledge topics: ${knowledgeContext?.topics?.length || 0}, Bloodwork: ${bloodworkContext?.hasData ? 'available' : 'none'}`);
    } catch (phase5Error) {
      console.warn('[ARES-WARN] Phase 5 context loading failed:', phase5Error);
    }

    // Phase 7: Topic State Machine - Process message for topic detection
    // PHASE B FIX: Load persistent topic state from DB
    let topicState: TopicState | null = null;
    let topicTransition = null;
    try {
      // Load existing topic state from user_conversation_state table
      const { data: savedState, error: stateError } = await supaSvc
        .from('user_conversation_state')
        .select('topic_state')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (stateError) {
        console.warn('[TOPIC] Failed to load saved state:', stateError.message);
      }
      
      // Use saved state or create initial
      topicState = (savedState?.topic_state as TopicState) || createInitialTopicState();
      console.log('[TOPIC] Loaded state - primary:', topicState.primary?.name || 'none', 'shifts:', topicState.shiftCount);
      
      // Process user message for topic detection
      const topicResult = processTopicMessage(topicState, text, true);
      topicState = topicResult.newState;
      topicTransition = topicResult.transition;
      
      if (topicResult.shiftDetected) {
        console.log(`[TOPIC] Shift detected: ${topicResult.shiftDetected.type} (${topicResult.shiftDetected.confidence})`);
      }
      if (topicTransition) {
        console.log(`[TOPIC] Topic transition: ${topicTransition.from?.name || 'none'} -> ${topicTransition.to.name}`);
      }
      if (topicState.primary) {
        console.log(`[TOPIC] Current: ${topicState.primary.name} (depth: ${topicState.primary.depth})`);
      }
      
      // Check for paused topics that could be followed up
      const pausedForFollowup = getPausedTopicsForFollowup(topicState);
      if (pausedForFollowup.length > 0) {
        console.log(`[TOPIC] Paused topics ready for followup: ${pausedForFollowup.map(t => t.name).join(', ')}`);
      }
      
      // PHASE B: Save updated topic state to DB (non-blocking upsert)
      supaSvc
        .from('user_conversation_state')
        .upsert({
          user_id: user.id,
          topic_state: topicState,
          last_coach_id: coachId,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        .then(({ error: saveError }) => {
          if (saveError) {
            console.warn('[TOPIC] Failed to save state:', saveError.message);
          } else {
            console.log('[TOPIC] State saved successfully');
          }
        });
    } catch (topicError) {
      console.warn('[ARES-WARN] Topic state machine failed:', topicError);
    }

    // Store full context in trace for debugging (include user persona info)
    await traceUpdate(traceId, { 
      status: 'context_loaded', 
      context, // This will be stored as user_context by trace.ts
      persona: userPersona || persona, 
      rag_sources: ragSources,
      insights_loaded: userInsights.length,
      patterns_loaded: userPatterns.length
    } as any);

    // Build prompt with memory, conversation history, and Phase 2 persona prompt
    // Phase 3: Pass healthContext for intelligent prompts
    // Phase 4: Pass userInsights and userPatterns for memory context
    // Phase 7: Pass topicState for conversation flow management
    const { systemPrompt, completePrompt, dial, temperature } = buildAresPrompt({ 
      persona: userPersona || persona, 
      context, 
      ragSources, 
      text, 
      images, 
      userMoodContext, 
      conversationHistory: conversationHistory ?? undefined,
      personaPrompt: personaPrompt || undefined, // Phase 2: Include persona-specific prompt
      healthContext: healthContext || undefined, // Phase 3: Include health context
      userInsights: userInsights.length > 0 ? userInsights : undefined, // Phase 4: Memory insights
      userPatterns: userPatterns.length > 0 ? userPatterns : undefined, // Phase 4: Memory patterns
      knowledgeContext: knowledgeContext || undefined, // Phase 5: Scientific knowledge
      bloodworkContext: bloodworkContext || undefined, // Phase 5: Bloodwork analysis
      topicState: topicState || undefined, // Phase 7: Topic state machine
    });

    // Store system prompt AND user input for full LLM tracing
    await traceUpdate(traceId, { 
      status: 'prompt_built', 
      system_prompt: systemPrompt, 
      complete_prompt: completePrompt,
      llm_input: { user_message: text, temperature }
    } as any);

    // Phase 6: Hybrid Model Routing - Select optimal provider based on query type
    const hasImages = images && images.length > 0;
    const routingContext = {
      hasImages,
      messageLength: text.length,
      conversationLength: conversationHistory?.length || 0,
    };
    
    const modelChoice = routeMessage(text, routingContext);
    console.log(`[ARES] Routing decision: ${modelChoice.provider}/${modelChoice.model} - ${modelChoice.reason}`);
    
    let llmOutput: string;
    let toolResults: any[] = [];
    
    // Research queries - delegate to ares-research edge function
    if (modelChoice.provider === 'perplexity') {
      console.log('[ARES] Research query detected - calling ares-research function');
      try {
        const researchResponse = await fetch(`${SUPABASE_URL}/functions/v1/ares-research`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader || '',
            'Content-Type': 'application/json',
            'x-trace-id': traceId,
          },
          body: JSON.stringify({
            query: text,
            language: 'de',
            maxResults: 5,
          }),
        });
        
        if (researchResponse.ok) {
          const researchData = await researchResponse.json();
          llmOutput = researchData.answer || 'Keine Forschungsergebnisse gefunden.';
          if (researchData.citations && researchData.citations.length > 0) {
            llmOutput += '\n\n**Quellen:**\n' + researchData.citations.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n');
          }
          console.log(`[ARES] Research complete - ${researchData.citations?.length || 0} citations`);
        } else {
          console.warn('[ARES] Research function failed, falling back to Gemini');
          const fallbackResult = await callLLMWithTools(
            systemPrompt, 
            text, 
            temperature,
            user.id,
            supaSvc,
            context
          );
          llmOutput = fallbackResult.content;
          toolResults = fallbackResult.toolResults;
        }
      } catch (researchError) {
        console.error('[ARES] Research error:', researchError);
        const fallbackResult = await callLLMWithTools(
          systemPrompt, 
          text, 
          temperature,
          user.id,
          supaSvc,
          context
        );
        llmOutput = fallbackResult.content;
        toolResults = fallbackResult.toolResults;
      }
    } else {
      // Non-research queries - use Gemini via Lovable AI with tool support
      console.log(`[ARES] Using ${modelChoice.model} for ${modelChoice.reason}`);
      const { content, toolResults: results } = await callLLMWithTools(
        systemPrompt, 
        text, 
        temperature,
        user.id,
        supaSvc,
        context,
        modelChoice.model // Pass the selected model
      );
      llmOutput = content;
      toolResults = results;
    }

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

    // Phase 4: Extract and store insights from user message
    // CRITICAL FIX: Execute memory extraction BEFORE returning response to ensure DB save completes
    // This fixes BUG-001 where Edge Function terminated before async save finished
    const memoryExtractionPromise = (async () => {
      try {
        console.log('[MEMORY] ========== INSIGHT EXTRACTION START ==========');
        console.log('[MEMORY] User ID:', user.id);
        console.log('[MEMORY] Message length:', text?.length || 0);
        console.log('[MEMORY] Message preview:', text?.substring(0, 100) || 'empty');
        
        // Get existing insights to avoid duplicates
        const existingInsightStrings = await getExistingInsightStrings(user.id, supaSvc);
        console.log('[MEMORY] Existing insights count:', existingInsightStrings.length);
        
        // Extract new insights from user message
        const newInsights = await extractInsightsFromMessage(
          text,
          user.id,
          'chat',
          existingInsightStrings
        );
        console.log('[MEMORY] New insights extracted:', newInsights.length);
        
        if (newInsights.length > 0) {
          console.log('[MEMORY] Insights to save:', JSON.stringify(newInsights.map(i => ({ category: i.category, insight: i.insight.substring(0, 50) }))));
          
          // Save new insights - AWAIT to ensure completion
          await saveInsights(user.id, newInsights, 'chat', traceId, supaSvc);
          console.log('[MEMORY] SUCCESS: Saved', newInsights.length, 'new insights');

          // Detect patterns with new insights
          const allInsights = await getAllUserInsights(user.id, supaSvc);
          console.log('[MEMORY] Total user insights after save:', allInsights.length);
          
          const detectedPatterns = await detectPatterns(user.id, newInsights, allInsights, supaSvc);
          
          if (detectedPatterns.length > 0) {
            console.log('[MEMORY] SUCCESS: Detected', detectedPatterns.length, 'new patterns');
            detectedPatterns.forEach(p => console.log('[MEMORY] Pattern:', p.patternType, '-', p.description));
          }
        } else {
          console.log('[MEMORY] No new insights extracted from message');
        }

        // Phase 4.1: Mark patterns as addressed if mentioned in response
        if (userPatterns && userPatterns.length > 0 && finalOutput && finalOutput.length > 50) {
          console.log('[MEMORY] Checking', userPatterns.length, 'patterns for addressed status');
          for (const pattern of userPatterns) {
            // Check if the AI response addresses this pattern's topic
            const patternKeywords = extractPatternKeywordsLocal(pattern.description);
            const responseAddressesPattern = patternKeywords.some(kw => 
              finalOutput.toLowerCase().includes(kw.toLowerCase())
            );
            
            if (responseAddressesPattern) {
              await markPatternAddressed(pattern.id, supaSvc);
              console.log('[MEMORY] Marked pattern as addressed:', pattern.description);
            }
          }
        }
        
        console.log('[MEMORY] ========== INSIGHT EXTRACTION END ==========');
        return { success: true };
      } catch (memError) {
        console.error('[MEMORY-ERROR] ========== EXTRACTION FAILED ==========');
        console.error('[MEMORY-ERROR] Error:', memError);
        console.error('[MEMORY-ERROR] Stack:', (memError as Error).stack);
        console.error('[MEMORY-ERROR] User ID:', user.id);
        console.error('[MEMORY-ERROR] Message:', text?.substring(0, 100));
        return { success: false, error: memError };
      }
    })();

    // Helper to extract keywords from pattern description (local scope to avoid hoisting issues)
    function extractPatternKeywordsLocal(description: string): string[] {
      const cleanDesc = description
        .replace(/Möglicher (Zusammenhang|Widerspruch):/i, '')
        .replace(/Häufiges Thema:/i, '')
        .replace(/[↔→vs]/g, ' ');
      
      return cleanDesc
        .split(/[\s_]+/)
        .filter(w => w.length > 3)
        .slice(0, 4);
    }

    // CRITICAL: Wait for memory extraction to complete BEFORE returning response
    // This ensures the Edge Function doesn't terminate before DB writes finish
    const memoryResult = await memoryExtractionPromise;
    console.log('[MEMORY] Extraction completed with result:', memoryResult.success ? 'SUCCESS' : 'FAILED');

    // Phase 8: Award XP for this interaction (non-blocking but awaited)
    let xpResult: XPResult | null = null;
    try {
      // Ensure user has daily quests
      await ensureDailyQuests(supaSvc, user.id);
      
      // Get user streak for multiplier
      const { data: streakData } = await supaSvc
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const streakDays = streakData?.current_streak || 0;
      
      // Award XP based on interaction
      xpResult = await awardInteractionXP(supaSvc, user.id, {
        toolsUsed: toolResults.map(t => t.tool),
        messageText: text,
        streakDays,
      });
      
      if (xpResult) {
        console.log('[GAMIFICATION] Awarded', xpResult.totalXP, 'XP to user', user.id);
      }
    } catch (gamError) {
      console.error('[GAMIFICATION] Error awarding XP:', gamError);
      // Non-blocking - don't fail the request
    }

    await traceDone(traceId, duration_ms);

    return new Response(JSON.stringify({ 
      reply: finalOutput, 
      traceId,
      toolsUsed: toolResults.length > 0 ? toolResults.map(t => t.tool) : [],
      persona: userPersona?.id || 'STANDARD',
      xpAwarded: xpResult?.totalXP || 0, // Phase 8: Include XP in response
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
