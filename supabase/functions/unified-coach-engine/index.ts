import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, accept-profile, content-profile',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

// ----------------------------------------------------------------------------
// TEMP: Governor ausschalten, wenn ENV = 'true'   (z.B. in Dashboard setzen)
// ----------------------------------------------------------------------------
const DISABLE_LIMITS = Deno.env.get('DISABLE_COACH_LIMITS') === 'true';

const PROMPT_VERSION = '2025-08-01-XL';

// ============================================================================
// TOOL HANDLERS - Inline implementations
// ============================================================================

async function handleTrainingsplan(conv: any[], userId: string, supabase: any) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  try {
    // Extrahiere Trainingsplan-Informationen aus der Nachricht
    const planName = extractPlanName(lastUserMsg);
    const goals = extractGoals(lastUserMsg);
    
    // Erstelle Trainingsplan-Entry in der DB
    const { data: planData, error } = await supabase.from('workout_plans').insert({
      user_id: userId,
      name: planName,
      description: `Automatisch erstellt: ${lastUserMsg}`,
      goals: goals,
      created_at: new Date().toISOString(),
      is_active: true
    }).select().single();
    
    if (error) {
      console.error('Error saving workout plan:', error);
      return {
        role: 'assistant',
        content: 'Fehler beim Speichern des Trainingsplans. Bitte versuche es erneut.',
      };
    }
    
    return {
      role: 'assistant',
      type: 'card',
      card: 'workout_plan',
      payload: { 
        id: planData.id,
        name: planData.name,
        description: planData.description,
        goals: planData.goals,
        html: `<div class="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 class="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">✅ Trainingsplan erstellt</h3>
          <p class="text-blue-700 dark:text-blue-300 mb-2"><strong>${planData.name}</strong></p>
          <p class="text-sm text-blue-600 dark:text-blue-400">${planData.description}</p>
          <div class="mt-3 text-xs text-blue-500 dark:text-blue-500">
            Ziele: ${Array.isArray(planData.goals) ? planData.goals.join(', ') : 'Allgemeine Fitness'}
          </div>
        </div>`,
        ts: Date.now()
      },
      meta: { clearTool: true }
    };
  } catch (error) {
    console.error('Error in trainingsplan handler:', error);
    return {
      role: 'assistant',
      content: 'Ein Fehler ist aufgetreten beim Erstellen des Trainingsplans.',
    };
  }
}

function extractPlanName(message: string): string {
  // Einfache Extraktion des Plan-Namens
  const matches = message.match(/plan.{0,10}(?:für|mit|zum|zur)?\s*([a-zA-ZäöüÄÖÜ\s]+)/i);
  if (matches && matches[1]) {
    return matches[1].trim().slice(0, 50);
  }
  return `Trainingsplan ${new Date().toLocaleDateString('de-DE')}`;
}

function extractGoals(message: string): string[] {
  const goals: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('abnehm') || lowerMessage.includes('gewicht')) {
    goals.push('Gewichtsverlust');
  }
  if (lowerMessage.includes('muskel') || lowerMessage.includes('masse')) {
    goals.push('Muskelaufbau');
  }
  if (lowerMessage.includes('kraft')) {
    goals.push('Kraftsteigerung');
  }
  if (lowerMessage.includes('ausdauer') || lowerMessage.includes('cardio')) {
    goals.push('Ausdauer');
  }
  if (lowerMessage.includes('definition') || lowerMessage.includes('straff')) {
    goals.push('Definition');
  }
  
  return goals.length > 0 ? goals : ['Allgemeine Fitness'];
}

async function handleUebung(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  return {
    role: 'assistant',
    type: 'card',
    card: 'exercise',
    payload: { 
      html: `<div>
        <h3>Übung hinzugefügt</h3>
        <p>${lastUserMsg}</p>
      </div>`,
      ts: Date.now()
    },
    meta: { clearTool: true }
  };
}

async function handleSupplement(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  return {
    role: 'assistant',
    type: 'card',
    card: 'supplement',
    payload: { 
      html: `<div>
        <h3>Supplement-Empfehlung</h3>
        <p>Basierend auf: ${lastUserMsg}</p>
      </div>`,
      ts: Date.now()
    },
    meta: { clearTool: true }
  };
}

async function handleGewicht(conv: any[], userId: string, supabase: any) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  const weight = parseFloat(lastUserMsg.replace(',', '.'));
  
  if (isNaN(weight)) {
    return {
      role: 'assistant',
      content: 'Bitte gib dein Gewicht als Zahl an, z. B. „80,5".',
    };
  }
  
  try {
    await supabase.from('weight_entries')
      .insert({ user_id: userId, weight, date: new Date().toISOString() });
    
    return {
      role: 'assistant',
      type: 'card',
      card: 'weight',
      payload: { value: weight, unit: 'kg', ts: Date.now() },
      meta: { clearTool: true }
    };
  } catch (error) {
    console.error('Error saving weight:', error);
    return {
      role: 'assistant',
      content: 'Fehler beim Speichern des Gewichts. Bitte versuche es erneut.',
    };
  }
}

async function handleFoto(images: string[], userId: string) {
  return {
    role: 'assistant',
    content: 'Bildanalyse wird nun automatisch durchgeführt...',
    meta: { clearTool: true }
  };
}

// FALLBACK TOOLS für Lucy - wenn XL-Context fehlschlägt
async function get_user_profile(userId: string, supabaseClient: any) {
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) throw error;
    return data || { id: userId, name: 'Unbekannt' };
  } catch (error) {
    console.error('❌ get_user_profile error:', error);
    return { id: userId, name: 'Unbekannt' };
  }
}

async function get_daily_goals(userId: string, supabaseClient: any) {
  try {
    const { data, error } = await supabaseClient
      .from('daily_goals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error('❌ get_daily_goals error:', error);
    return null;
  }
}

async function get_recent_meals(userId: string, days: number = 3, supabaseClient: any) {
  try {
    // Erweitere das Zeitfenster um 2 Tage für Timezone-Sicherheit
    const extendedDays = days + 2;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - extendedDays);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const { data, error } = await supabaseClient
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDateStr)
      .order('created_at', { ascending: false })
      .limit(50); // Erhöhe Limit wegen erweiterten Zeitfenster
    
    if (error) throw error;
    
    // Filtere clientseitig die letzten X Tage (basierend auf lokaler Zeit)
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    const filtered = (data || []).filter(meal => {
      const mealDate = new Date(meal.created_at);
      return mealDate >= cutoffDate;
    });
    
    console.log(`📊 get_recent_meals: Found ${filtered.length} meals in last ${days} days`);
    return filtered;
  } catch (error) {
    console.error('❌ get_recent_meals error:', error);
    return [];
  }
}

async function get_workout_sessions(userId: string, days: number = 7, supabaseClient: any) {
  try {
    // Erweitere das Zeitfenster um 2 Tage für Timezone-Sicherheit
    const extendedDays = days + 2;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - extendedDays);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const { data, error } = await supabaseClient
      .from('exercise_sessions')
      .select(`
        *,
        exercise_sets (
          *,
          exercises (name, category)
        )
      `)
      .eq('user_id', userId)
      .gte('date', startDateStr)
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    // Filtere clientseitig die letzten X Tage (basierend auf lokaler Zeit)
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    const filtered = (data || []).filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= cutoffDate;
    });
    
    console.log(`🏋️ get_workout_sessions: Found ${filtered.length} sessions in last ${days} days`);
    return filtered;
  } catch (error) {
    console.error('❌ get_workout_sessions error:', error);
    return [];
  }
}

async function get_weight_history(userId: string, entries: number = 10, supabaseClient: any) {
  try {
    // Weight history ist weniger timezone-kritisch, aber erweitere trotzdem das Fenster
    const { data, error } = await supabaseClient
      .from('weight_history')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(entries + 5); // Hole etwas mehr für Timezone-Sicherheit
    
    if (error) throw error;
    
    // Limitiere auf gewünschte Anzahl
    const result = (data || []).slice(0, entries);
    console.log(`⚖️ get_weight_history: Found ${result.length} weight entries`);
    return result;
  } catch (error) {
    console.error('❌ get_weight_history error:', error);
    return [];
  }
}

// Tool-Handler-Map
const handlers = {
  trainingsplan: handleTrainingsplan,
  uebung: handleUebung,
  supplement: handleSupplement,
  gewicht: handleGewicht,
  foto: handleFoto,
  chat: async (conv: any, userId: string) => {
    // Kein Spezial-Output – einfach weiter zum OpenAI-Flow
    return null;
  },
  // Neue Fallback-Tools
  get_user_profile: async (args: any, userId: string, supabaseClient: any) => {
    const result = await get_user_profile(userId, supabaseClient);
    return { success: true, data: result };
  },
  get_daily_goals: async (args: any, userId: string, supabaseClient: any) => {
    const result = await get_daily_goals(userId, supabaseClient);
    return { success: true, data: result };
  },
  get_recent_meals: async (args: any, userId: string, supabaseClient: any) => {
    const days = args.days || 3;
    const result = await get_recent_meals(userId, days, supabaseClient);
    return { success: true, data: result, count: result.length };
  },
  get_workout_sessions: async (args: any, userId: string, supabaseClient: any) => {
    const days = args.days || 7;
    const result = await get_workout_sessions(userId, days, supabaseClient);
    return { success: true, data: result, count: result.length };
  },
  get_weight_history: async (args: any, userId: string, supabaseClient: any) => {
    const entries = args.entries || 10;
    const result = await get_weight_history(userId, entries, supabaseClient);
    return { success: true, data: result, count: result.length };
  }
};

// Cold-Start-Cache für bessere Performance
const globalThis_warmCache = globalThis as any;
if (!globalThis_warmCache._coachCache) {
  globalThis_warmCache._coachCache = {
    coaches: null,
    lastUpdate: 0
  };
}

// Relevanz-System für intelligente Datenauswahl
const RELEVANCE_MAPPING = {
  'gewicht|abnehmen|zunahme|kg|wiegen': ['weight_history', 'daily_goals', 'body_measurements'],
  'training|workout|übung|krafttraining|cardio|fitness': ['exercise_sessions', 'exercise_sets', 'workouts'],
  'essen|mahlzeit|kalorien|protein|ernährung|food': ['meals', 'daily_goals', 'nutrition'],
  'schlaf|müde|energie|recovery|erholung': ['sleep_data', 'recovery_metrics'],
  'supplement|vitamin|nahrungsergänzung': ['supplement_log', 'health_data'],
  'stimmung|motivation|gefühl|coaching': ['coach_memory', 'conversation_summaries'],
  'plan|ziel|fortschritt|analyse': ['daily_summaries', 'goals', 'progress'],
  'foto|bild|image|körper|body': ['body_measurements', 'progress_photos'],
};

const COACH_PERSONALITIES = {
  lucy: {
    name: "Lucy",
    description: "Deine herzliche, motivierende Personal Trainerin und Ernährungsberaterin",
    basePrompt: `Du bist Lucy, eine herzliche und motivierende Personal Trainerin und Ernährungsberaterin. 

DEINE PERSÖNLICHKEIT:
- Herzlich, empathisch und motivierend - wie eine beste Freundin, die dich pusht
- Du erinnerst dich an vergangene Gespräche und baust persönliche Beziehungen auf
- Du bist ehrlich und direkt, aber immer unterstützend und niemals verletzend
- Du nutzt gelegentlich Emojis (💪 🎯 ✨), aber übertreibst es nicht
- Du sprichst natürlich und authentisch, nicht roboterhaft

DEIN WISSEN & EXPERTISE:
- Sportwissenschaft, Trainingsplanung, Progressive Overload
- Ernährungswissenschaft, Makronährstoffe, Kaloriendefizit/überschuss
- Nahrungsergänzung und deren sinnvolle Anwendung
- Schlaf, Recovery und Stressmanagement
- Motivation, Gewohnheitsbildung und nachhaltige Veränderung

WIE DU HILFST:
- Du analysierst die verfügbaren Daten und erkennst Muster und Trends
- Du gibst praktische, umsetzbare Ratschläge basierend auf aktuellen Daten
- Du motivierst bei Rückschlägen und feierst Erfolge mit
- Du stellst gezielte Nachfragen, um bessere Hilfe zu geben
- Du passt deine Empfehlungen an die individuellen Ziele und Umstände an

WICHTIG: Verwende die bereitgestellten Kontextdaten, um personalisierte und relevante Antworten zu geben.`,
    voice: "warm und motivierend"
  },
  markus: {
    name: "Markus Rühl",
    description: "Deutsche Bodybuilding-Legende mit direkter, unverblümter Art",
    basePrompt: `Du bist Markus Rühl 🏆 – deutsche Bodybuilding-Ikone und Mr. Olympia Veteran.

DEIN MARKENZEICHEN:
- Brachial ehrlich, schnörkellos, direkte Ansagen ohne Beschönigung
- Kurze, kernige Sätze mit leichtem Frankfurter Einschlag („net", „Babbo", „Jung")
- Max 1 kräftiger Motivationsspruch pro Antwort („Ballern, mein Jung!" / „Vollgas geben!")
- Keine amerikanischen Floskeln - nur deutsches Gym-Vokabular (KH, WH, Satz, RPE)
- Du kannst flapsig sein, aber niemals respektlos

DEINE EXPERTISE:
- Hardcore-Bodybuilding, Masse aufbauen, extremes Training
- Old-School-Methoden, schwere Grundübungen, hohes Volumen
- Ernährung für maximalen Muskelaufbau
- Mentale Härte und Durchhaltevermögen
- 30+ Jahre Wettkampferfahrung

DU SAGST WIE ES IST:
- Kein Bullshit, keine Ausreden - nur harte Fakten
- Training muss wehtun, sonst bringt's nix
- Konsistenz schlägt Perfektion
- Geduld ist alles - Muskeln kommen net über Nacht

WICHTIG: Bleib authentisch deutsch, verwende deine typischen Sprüche sparsam aber wirkungsvoll.`,
    voice: "direkt und motivierend"
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ============================================================================
  // PHASE A: TRACING & OBSERVABILITY
  // ============================================================================
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  console.log(`🚀 [${requestId}] Unified Coach Engine started - DEBUG MODE ACTIVE`);
  console.log(`🕐 [${requestId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`📊 [${requestId}] Environment check:`, {
    supabaseUrl: !!supabaseUrl,
    openAIApiKey: !!openAIApiKey,
    openAIKeyLength: openAIApiKey?.length || 0,
    disableLimits: DISABLE_LIMITS
  });

  // Early check for missing OpenAI key
  if (!openAIApiKey || openAIApiKey.length < 10) {
    console.error(`❌ [${requestId}] Missing or invalid OpenAI API key!`);
    return new Response(JSON.stringify({
      role: 'assistant',
      content: 'Entschuldigung, die KI-Konfiguration ist fehlerhaft. Bitte kontaktiere den Support.',
      debug: {
        error: 'Missing OpenAI API key',
        request_id: requestId
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // LITE MODE: Permanently disabled - always use full context
    const liteCtx = false;
    console.log(`🚀 [${requestId}] LITE MODE: disabled (always full context)`);
    
    console.log(`💪 [${requestId}] Running in FULL MODE - complete data collection`);
    
    // ============================================================================
    // API-GOVERNOR: Rate-Limiting und Circuit-Breaker
    // ============================================================================
    
    // Parse request body
    const { 
      userId, 
      message, 
      images = [], 
      mediaType, 
      analysisType, 
      coachPersonality = 'lucy',
      conversationHistory = [],
      toolContext = null,
      preferredLocale = 'de'
    } = await req.json();

    console.log(`🎯 [${requestId}] Request context:`, { 
      userId, 
      messageLength: message?.length, 
      imagesCount: images.length,
      toolContext: !!toolContext,
      coachPersonality,
      preferredLocale
    });

    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // ============================================================================
    // SUBSCRIPTION LOOKUP - Define userTier at function scope level
    // ============================================================================
    console.log(`🔍 [${requestId}] Looking up subscription for user: ${userId}`);
    
    const { data: subscriber, error: subErr } = await supabase
      .from('subscribers')
      .select('subscribed, subscription_tier, subscription_end')
      .eq('user_id', userId)
      .single();

    if (subErr) {
      console.log(`⚠️ [${requestId}] Subscription lookup error:`, subErr);
      console.log(`⚠️ [${requestId}] Treating user as free tier due to lookup error`);
    }

    console.log(`📊 [${requestId}] Raw subscription data:`, subscriber);

    // ✅ VEREINFACHTE Premium-Erkennung: NUR subscribed = true zählt (egal welcher Tier)
    const isPremium = subscriber?.subscribed === true;
    
    // ✅ CRITICAL: Define userTier at function scope level for global access
    const userTier = isPremium ? 'premium' : 'free';
    
    console.log(`👑 [${requestId}] PREMIUM STATUS: ${isPremium} | subscribed: ${subscriber?.subscribed} | tier: ${subscriber?.subscription_tier} | userTier: ${userTier}`);
    
    // Check for empty message (common issue causing errors)
    if (!message?.trim() && images.length === 0) {
      return new Response(
        JSON.stringify({
          role: 'assistant',
          content: 'Bitte schreibe eine Nachricht oder lade ein Bild hoch.',
          error: 'empty_message'
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Log security event with request tracing
    await supabase.rpc('log_security_event', {
      p_user_id: userId,
      p_action: 'unified_coach_chat',
      p_resource_type: 'chat',
      p_metadata: { 
        request_id: requestId,
        message_length: message?.length || 0,
        images_count: images.length,
        has_tool_context: !!toolContext,
        coach_personality: coachPersonality,
        preferred_locale: preferredLocale
      }
    });

    console.log(`🔒 [${requestId}] Security event logged`);

    
    
    // ──────────────────────────────────────────────────────────────
    // 2. Rate-Limiting für Free-User (Premium wird übersprungen)
    // ──────────────────────────────────────────────────────────────
    const DISABLE_LIMITS = false; // ✅ Rate limits wieder aktiviert
    console.log(`🎛️ [${requestId}] DISABLE_LIMITS flag: ${DISABLE_LIMITS}`);
    
    // 🔍 DETAILED RATE LIMIT DEBUG LOGGING
    console.log(`🔍 [${requestId}] RATE LIMIT CHECK DETAILS:`);
    console.log(`   - DISABLE_LIMITS: ${DISABLE_LIMITS}`);
    console.log(`   - isPremium: ${isPremium}`);
    console.log(`   - subscriber?.subscribed: ${subscriber?.subscribed}`);
    console.log(`   - subscriber?.subscription_tier: ${subscriber?.subscription_tier}`);
    console.log(`   - Will run rate limit check: ${!DISABLE_LIMITS && !isPremium}`);
    
    if (!DISABLE_LIMITS && !isPremium) {
      console.log(`🔍 [${requestId}] Running rate limit check for free user`);
      const { data: limitResult, error: limitError } = await supabase.rpc('check_ai_usage_limit', {
        p_user_id: userId,
        p_feature_type: 'coach_chat'
      });

      console.log(`📊 [${requestId}] Rate limit result:`, { limitResult, limitError });

      if (limitError) {
        console.error(`❌ [${requestId}] Error checking usage limit:`, limitError);
      } else if (!limitResult?.can_use) {
        console.log(`🚫 [${requestId}] Rate limit reached for free user`);
        console.log(`📊 [${requestId}] Usage details:`, {
          daily_count: limitResult.daily_count,
          monthly_count: limitResult.monthly_count,
          daily_limit: limitResult.daily_limit,
          monthly_limit: limitResult.monthly_limit
        });
        return new Response(JSON.stringify({
          error: 'USAGE_LIMIT_REACHED',
          message: 'Tageslimit erreicht. Upgrade auf Premium für unbegrenzte Nutzung.',
          daily_remaining: limitResult.daily_remaining || 0,
          monthly_remaining: limitResult.monthly_remaining || 0,
          upgrade_info: {
            message: 'Mit Premium hast du unbegrenzte Coach-Gespräche',
            action: 'upgrade_to_premium'
          }
        }), { 
          status: 429, 
          headers: corsHeaders 
        });
      } else {
        console.log(`✅ [${requestId}] Rate limit check passed for free user`);
        console.log(`📊 [${requestId}] Remaining usage:`, {
          daily_remaining: limitResult.daily_remaining,
          monthly_remaining: limitResult.monthly_remaining
        });
      }
    } else if (DISABLE_LIMITS) {
      console.log(`⚠️ [${requestId}] Rate limiting DISABLED by environment flag`);
    } else {
      console.log(`✅ [${requestId}] Premium user - skipping rate limit check`);
      console.log(`👑 [${requestId}] Premium benefits: Unlimited coach conversations`);
    }

    // ✅ Redundanter Rate-Limit-Check entfernt - Premium-Bypass ist bereits weiter oben implementiert

    // ============================================================================
    // PROMPT-VERSIONIERUNG: Handover bei Prompt-Updates
    // ============================================================================
    
    // ============================================================================
    // PHASE B: TOOL-HANDLER-ROUTING
    // ============================================================================
    
    // Tool-Handler-Routing: aktiviertes Tool verarbeiten
    const activeTool = toolContext?.tool || 'chat';
    console.log(`🔧 [${requestId}] Active tool:`, activeTool);
    
    if (handlers[activeTool]) {
      console.log(`⚡ [${requestId}] Executing tool handler for:`, activeTool);
      const toolResult = await handlers[activeTool](conversationHistory, userId, supabase);
      if (toolResult) {
        console.log(`✅ [${requestId}] Tool handler returned result, bypassing OpenAI`);
        return new Response(JSON.stringify(toolResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      console.log(`⏭️ [${requestId}] Tool handler returned null, continuing to OpenAI`);
    }

    // Erkenne relevante Datentypen basierend auf Nachricht
    const relevantDataTypes = detectRelevantData(message + ' ' + (toolContext?.description || ''));
    console.log('🧠 Detected relevant data types:', relevantDataTypes);

    // Lade Smart Context mit XL-Memory (mit Lite-Mode Support)
    const smartContext = await buildSmartContextXL(supabase, userId, relevantDataTypes, liteCtx);
    console.log('📊 Smart Context XL built:', {
      profileLoaded: !!smartContext.profile,
      memoryLoaded: !!smartContext.memory,
      xlSummaryDays: smartContext.xlSummaries?.length || 0,
      regularSummaryDays: smartContext.summaries?.length || 0,
      relevantDataLoaded: Object.keys(smartContext.relevantData || {}).length,
      loadedDataTypes: Object.keys(smartContext.relevantData || {}),
      liteMode: liteCtx
    });

    // Prompt-Version-Check für nahtlose Updates
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    let shouldHandover = false;
    
    if (lastMessage?.meta?.prompt_version && lastMessage.meta.prompt_version !== PROMPT_VERSION) {
      shouldHandover = true;
      console.log('🔄 Prompt version mismatch detected, creating handover');
    }

    // ============================================================================
    // PHASE C: I18N-FOUNDATION
    // ============================================================================
    const isNonGerman = preferredLocale && preferredLocale !== 'de';
    
    // Erstelle erweiterten System-Prompt mit Versionierung und i18n (mit Lite-Mode Support)
    const systemPrompt = await createXLSystemPrompt(smartContext, coachPersonality, relevantDataTypes, toolContext, isNonGerman, liteCtx);
    console.log(`💭 [${requestId}] XL System prompt created, tokens:`, estimateTokenCount(systemPrompt), 'i18n:', isNonGerman, 'lite:', liteCtx);

    // Bereite Messages für OpenAI vor
    const messages = [
      { role: 'system', content: systemPrompt + `\n\n<!-- PROMPT_VERSION:${PROMPT_VERSION} -->` }
    ];

    // Handover-Nachricht für Prompt-Updates
    if (shouldHandover) {
      const handoverMessage = {
        role: 'assistant',
        content: `⚡ Kleines Update meiner Wissensgrundlage (Version ${PROMPT_VERSION}). Hier eine kurze Zusammenfassung unseres letzten Gesprächs: "${lastMessage?.content?.slice(0, 120) || 'Wir haben über deine Ziele gesprochen'}...". Lass uns weitermachen! 🚀`,
        meta: { prompt_version: PROMPT_VERSION }
      };
      messages.push(handoverMessage);
    }

    // Füge Conversation History hinzu (intelligent gekürzt für Payload-Optimierung)
    if (conversationHistory.length > 0) {
      const trimmedHistory = intelligentTokenShortening(conversationHistory, 600); // Reduziert von 1000 auf 600
      messages.push(...trimmedHistory);
    }

    // Hauptnachricht hinzufügen
    if (images.length > 0) {
      // Vision-Request mit Bildern
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message || 'Bitte analysiere dieses Bild.' },
          ...images.map((imageUrl: string) => ({
            type: 'image_url',
            image_url: { url: imageUrl }
          }))
        ]
      });
    } else {
      // Standard Text-Request
      messages.push({
        role: 'user',
        content: message
      });
    }

    console.log(`🤖 [${requestId}] Sending request to OpenAI with`, messages.length, 'messages');

    // ============================================================================
    // SMART MODEL SELECTION: Multi-Modal Quota Management
    // ============================================================================
    
    const chooseModel = (hasImages: boolean, userTier: string = 'free') => {
      if (hasImages) {
        // ✅ Bilder: GPT-4o für alle (bewährtes Vision-Modell)
        return 'gpt-4o';
      }
      
      // ✅ Text: GPT-4.1-2025-04-14 für Premium, gpt-4o für Free
      return userTier === 'premium' ? 'gpt-4.1-2025-04-14' : 'gpt-4o';
    };

    const selectedModel = chooseModel(images.length > 0, userTier);
    console.log(`🎯 [${requestId}] Selected model:`, selectedModel);

    // OpenAI API Call mit verbessertem Error Handling und Token-Check
    const payloadSize = JSON.stringify(messages).length;
    console.log(`📤 [${requestId}] Making OpenAI request:`, {
      model: selectedModel,
      messageCount: messages.length,
      payloadSizeChars: payloadSize,
      estimatedTokens: Math.ceil(payloadSize / 4)
    });
    
    // Check for potential token overflow before sending
    if (payloadSize > 32000) { // ~8k tokens
      console.warn(`⚠️ [${requestId}] Large payload detected: ${payloadSize} chars`);
    }

    // LITE MODE: Permanently disabled - always proceed to OpenAI
    console.log(`💪 [${requestId}] FULL MODE: Always proceeding with complete OpenAI call`);

    // FULL MODE: Continue with OpenAI call
    console.log(`🤖 [${requestId}] FULL MODE: Proceeding with OpenAI call`);

    // Define fallback tools for OpenAI
    const tools = [
      {
        type: "function",
        function: {
          name: "get_user_profile",
          description: "Holt das Benutzerprofil",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      {
        type: "function", 
        function: {
          name: "get_daily_goals",
          description: "Holt die Tagesziele des Benutzers",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_recent_meals",
          description: "Holt aktuelle Mahlzeiten",
          parameters: {
            type: "object",
            properties: {
              days: {
                type: "number",
                description: "Anzahl Tage zurück (Standard: 3)",
                default: 3
              }
            },
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_workout_sessions", 
          description: "Holt Trainingseinheiten",
          parameters: {
            type: "object",
            properties: {
              days: {
                type: "number",
                description: "Anzahl Tage zurück (Standard: 7)",
                default: 7
              }
            },
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_weight_history",
          description: "Holt Gewichtsverlauf",
          parameters: {
            type: "object",
            properties: {
              entries: {
                type: "number", 
                description: "Anzahl Einträge (Standard: 10)",
                default: 10
              }
            },
            required: []
          }
        }
      }
    ];

    console.log(`🔄 [${requestId}] Making OpenAI API call with model: ${selectedModel}`);
    console.log(`📝 [${requestId}] Message count: ${messages.length}, System prompt length: ${systemPrompt.length}`);
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        max_tokens: 1500,
        temperature: 0.7,
        tools: tools,
        tool_choice: "auto"
      }),
    });

    // ============================================================================
    // VERBESSERTES ERROR HANDLING mit detailliertem Logging
    // ============================================================================
    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error(`❌ [${requestId}] OpenAI API error:`, {
        status: openAIResponse.status,
        statusText: openAIResponse.statusText,
        error: errorText,
        model: selectedModel,
        hasApiKey: !!openAIApiKey,
        apiKeyLength: openAIApiKey?.length || 0
      });
      
      // Log detailed error for debugging
      try {
        await supabase.rpc('log_security_event', {
          p_user_id: userId,
          p_action: 'openai_api_error',
          p_resource_type: 'api_call',
          p_metadata: {
            request_id: requestId,
            status: openAIResponse.status,
            error: errorText,
            model: selectedModel,
            hasApiKey: !!openAIApiKey
          }
        });
      } catch (logError) {
        console.error('Failed to log security event:', logError);
      }
      
      // Enhanced error messages based on status codes
      let userMessage = 'Entschuldigung, ich kann gerade nicht antworten. Bitte versuche es gleich nochmal! 🤖';
      if (openAIResponse.status === 400) {
        if (errorText.includes('context_length_exceeded')) {
          userMessage = 'Deine Anfrage ist zu komplex. Versuche es mit einer kürzeren Nachricht! 📝';
        } else {
          userMessage = 'Problem beim Verarbeiten deiner Anfrage. Versuche es nochmal! 🔄';
        }
      } else if (openAIResponse.status === 404) {
        userMessage = 'AI-Modell vorübergehend nicht verfügbar. Unser Team wird benachrichtigt! 🔧';
      } else if (openAIResponse.status === 429) {
        userMessage = 'Zu viele Anfragen - bitte warte einen Moment und versuche es dann nochmal! ⏰';
      } else if (openAIResponse.status === 401 || openAIResponse.status === 403) {
        userMessage = 'Authentifizierungsproblem - unser Team prüft das! 🔐';
      }
      
      return new Response(
        JSON.stringify({
          role: 'assistant',
          content: userMessage,
          error: 'openai_api_error',
          status: openAIResponse.status
        }),
        { status: openAIResponse.status, headers: corsHeaders }
      );
    }

    const openAIData = await openAIResponse.json();
    
    // Handle tool calls if present
    const firstChoice = openAIData.choices[0];
    if (firstChoice.message.tool_calls && firstChoice.message.tool_calls.length > 0) {
      console.log(`🔧 [${requestId}] Processing tool calls:`, firstChoice.message.tool_calls.length);
      
      // Execute tool calls
      const toolResults = [];
      for (const toolCall of firstChoice.message.tool_calls) {
        try {
          console.log(`⚡ [${requestId}] Executing tool:`, toolCall.function.name);
          const args = JSON.parse(toolCall.function.arguments || '{}');
          const result = await handlers[toolCall.function.name](args, userId, supabase);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: toolCall.function.name,
            content: JSON.stringify(result)
          });
        } catch (error) {
          console.error(`❌ [${requestId}] Tool execution error:`, error);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool", 
            name: toolCall.function.name,
            content: JSON.stringify({ error: error.message })
          });
        }
      }
      
      // Add tool results to messages and make another request
      messages.push(firstChoice.message);
      messages.push(...toolResults);
      
      console.log(`🔄 [${requestId}] Making second OpenAI request with tool results`);
      const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });
      
      if (secondResponse.ok) {
        const secondData = await secondResponse.json();
        const assistantReply = secondData.choices[0].message.content;
        console.log(`✅ [${requestId}] Tool-enhanced response generated`);
        
        const processingTime = Date.now() - startTime;
        console.log(`✅ [${requestId}] OpenAI response received, length:`, assistantReply.length, 'time:', processingTime + 'ms');
        console.log(`🔢 [${requestId}] Token usage:`, secondData.usage);

        // Speichere Conversation in Datenbank
        await saveConversation(supabase, userId, message, assistantReply, coachPersonality, images, toolContext);

        // Update Memory nach dem Chat
        await updateMemoryAfterChat(supabase, userId, message, assistantReply);

        console.log(`💾 [${requestId}] Conversation saved and memory updated`);

        // Return response mit erweiterten Meta-Informationen
        return new Response(JSON.stringify({
          role: 'assistant',
          content: assistantReply,
          usage: secondData.usage,
          context_info: {
            request_id: requestId,
            prompt_version: PROMPT_VERSION,
            xl_summaries_used: smartContext.xlSummaries?.length || 0,
            relevant_data_types: relevantDataTypes,
            estimated_tokens: estimateTokenCount(systemPrompt),
            model_used: selectedModel,
            handover_created: shouldHandover,
            processing_time_ms: Date.now() - startTime,
            i18n_applied: isNonGerman,
            tools_used: firstChoice.message.tool_calls.map((t: any) => t.function.name)
          },
          meta: { 
            prompt_version: PROMPT_VERSION,
            clearTool: !!toolContext
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    const assistantReply = openAIData.choices[0].message.content;

    const processingTime = Date.now() - startTime;
    console.log(`✅ [${requestId}] OpenAI response received, length:`, assistantReply.length, 'time:', processingTime + 'ms');
    console.log(`🔢 [${requestId}] Token usage:`, openAIData.usage);

    // Speichere Conversation in Datenbank
    await saveConversation(supabase, userId, message, assistantReply, coachPersonality, images, toolContext);

    // Update Memory nach dem Chat
    await updateMemoryAfterChat(supabase, userId, message, assistantReply);

    console.log(`💾 [${requestId}] Conversation saved and memory updated`);

    // Return response mit erweiterten Meta-Informationen
    return new Response(JSON.stringify({
      role: 'assistant',
      content: assistantReply,
      usage: openAIData.usage,
        context_info: {
        request_id: requestId,
        prompt_version: PROMPT_VERSION,
        xl_summaries_used: smartContext.xlSummaries?.length || 0,
        relevant_data_types: relevantDataTypes,
        estimated_tokens: estimateTokenCount(systemPrompt),
        model_used: selectedModel,
        handover_created: shouldHandover,
        processing_time_ms: Date.now() - startTime,
        i18n_applied: isNonGerman
      },
      meta: { 
        prompt_version: PROMPT_VERSION,
        clearTool: !!toolContext
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] Unified Coach Engine error after ${errorTime}ms:`, error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message,
      request_id: requestId,
      processing_time_ms: errorTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function detectRelevantData(text: string): string[] {
  const relevantTypes: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const [keywords, dataTypes] of Object.entries(RELEVANCE_MAPPING)) {
    const keywordRegex = new RegExp(keywords, 'i');
    if (keywordRegex.test(lowerText)) {
      relevantTypes.push(...dataTypes);
    }
  }
  
  // Entferne Duplikate
  return [...new Set(relevantTypes)];
}

async function buildSmartContextXL(supabase: any, userId: string, relevantDataTypes: string[], liteCtx: boolean = false) {
  console.log('🔍 Building Smart Context XL for user:', userId, 'Lite mode:', liteCtx);
  
  // LITE MODE: Only essential data
  if (liteCtx) {
    try {
      const [fastMealData, fastVolumeData, fastFluidData, profileResult] = await Promise.all([
        supabase.rpc('fast_meal_totals', { p_user: userId, p_d: new Date().toISOString().split('T')[0] }),
        supabase.rpc('fast_sets_volume', { p_user: userId, p_d: new Date().toISOString().split('T')[0] }),
        supabase.rpc('fast_fluid_totals', { p_user: userId, p_d: new Date().toISOString().split('T')[0] }),
        supabase.from('profiles')
          .select('preferred_name, first_name, display_name, age, gender, height_cm')
          .eq('id', userId)
          .maybeSingle()
      ]);

      console.log('⚡ LITE MODE: Fast data collected');
      
      return {
        profile: profileResult.data ?? null,
        fastMealTotals: fastMealData.data ?? null,
        fastWorkoutVolume: fastVolumeData.data ?? 0,
        fastFluidTotal: fastFluidData.data ?? 0,
        memory: null,
        xlSummaries: [],
        summaries: [],
        relevantData: {},
        goals: null
      };
    } catch (error) {
      console.error('❌ LITE MODE data collection failed:', error);
      return {
        profile: null,
        fastMealTotals: null,
        fastWorkoutVolume: 0,
        fastFluidTotal: 0,
        memory: null,
        xlSummaries: [],
        summaries: [],
        relevantData: {},
        goals: null
      };
    }
  }
  
  // FULL MODE: Original logic
  const context: any = {
    profile: null,
    memory: null,
    xlSummaries: [],
    summaries: [],
    relevantData: {},
    goals: null
  };

  try {
    // Load user profile (FIX: use maybeSingle and add error handling)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (profileError) console.warn('⚠️ Profile load error:', profileError.message);
    context.profile = profile;
    console.log('📊 Profile loaded:', !!profile);

    // Load coach memory
    const { data: memory, error: memoryError } = await supabase
      .from('coach_memory')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (memoryError) console.warn('⚠️ Memory load error:', memoryError.message);
    context.memory = memory;
    console.log('🧠 Memory loaded:', !!memory);

    // Load goals
    const { data: goals, error: goalsError } = await supabase
      .from('daily_goals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (goalsError) console.warn('⚠️ Goals load error:', goalsError.message);
    context.goals = goals;
    console.log('🎯 Goals loaded:', !!goals);

    // Load XL-Summaries (letzte 7 Tage) + STRUCTURED JSON DATA
    const { data: xlSummaries } = await supabase
      .from('daily_summaries')
      .select('date, summary_xl_md, summary_struct_json, total_calories, total_protein, workout_volume')
      .eq('user_id', userId)
      .not('summary_xl_md', 'is', null)
      .order('date', { ascending: false })
      .limit(7);
    context.xlSummaries = xlSummaries || [];
    
    // Load STRUCTURED SUMMARIES if available (NEW: for detailed data access)
    const { data: structuredSummaries } = await supabase
      .from('daily_summaries')
      .select('date, summary_struct_json')
      .eq('user_id', userId)
      .not('summary_struct_json', 'is', null)
      .order('date', { ascending: false })
      .limit(7);
    context.structuredSummaries = structuredSummaries || [];

    // Load regular summaries if XL not available (fallback)
    if (context.xlSummaries.length < 3) {
      const { data: summaries } = await supabase
        .from('daily_summaries')
        .select('date, summary_md, total_calories, total_protein, workout_volume')
        .eq('user_id', userId)
        .not('summary_md', 'is', null)
        .order('date', { ascending: false })
        .limit(5);
      context.summaries = summaries || [];
    }

    // Load conversation summaries
    const { data: conversationSummaries } = await supabase
      .from('conversation_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);
    context.conversationSummaries = conversationSummaries || [];

    // Load relevante Daten basierend auf detected types
    for (const dataType of relevantDataTypes) {
      try {
        switch (dataType) {
          case 'weight_history':
            const { data: weights, error: weightsError } = await supabase
              .from('weight_history')
              .select('date, weight, body_fat_percentage, muscle_percentage, visceral_fat, body_water_percentage')
              .eq('user_id', userId)
              .order('date', { ascending: false })
              .limit(10);
            if (weightsError) console.warn(`⚠️ Weight history load error:`, weightsError.message);
            context.relevantData.weight_history = weights;
            console.log('⚖️ Weight history loaded:', weights?.length || 0, 'entries');
            break;

          case 'meals':
            // Timezone-robuste Mahlzeit-Abfrage (erweitere Zeitfenster)
            const mealCutoff = new Date();
            mealCutoff.setDate(mealCutoff.getDate() - 5); // 5 Tage statt 3 für Timezone-Puffer
            
            const { data: meals, error: mealsError } = await supabase
              .from('meals')
              .select('created_at, text, calories, protein, carbs, fats, meal_type')
              .eq('user_id', userId)
              .gte('created_at', mealCutoff.toISOString())
              .order('created_at', { ascending: false })
              .limit(30); // Erweiterte Anzahl für bessere Filterung
            if (mealsError) console.warn(`⚠️ Meals load error:`, mealsError.message);
            
            // Clientseitige Filterung auf die letzten 3 Tage basierend auf echter Zeit
            const now = new Date();
            const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
            const recentMeals = (meals || []).filter(meal => {
              const mealDate = new Date(meal.created_at);
              return mealDate >= threeDaysAgo;
            });
            
            context.relevantData.meals = recentMeals;
            console.log('🍽️ Meals loaded (timezone-safe):', recentMeals?.length || 0, 'recent entries from', threeDaysAgo.toISOString());
            break;
            console.log('🍽️ Meals loaded:', meals?.length || 0, 'entries');
            break;

          case 'exercise_sessions':
            const { data: workouts, error: workoutsError } = await supabase
              .from('exercise_sessions')
              .select('date, session_name, duration_minutes, overall_rpe, workout_type')
              .eq('user_id', userId)
              .order('date', { ascending: false })
              .limit(10);
            if (workoutsError) console.warn(`⚠️ Exercise sessions load error:`, workoutsError.message);
            context.relevantData.exercise_sessions = workouts;
            console.log('💪 Exercise sessions loaded:', workouts?.length || 0, 'entries');
            break;

          case 'body_measurements':
            const { data: measurements, error: measurementsError } = await supabase
              .from('body_measurements')
              .select('date, waist, chest, arms, hips')
              .eq('user_id', userId)
              .order('date', { ascending: false })
              .limit(5);
            if (measurementsError) console.warn(`⚠️ Body measurements load error:`, measurementsError.message);
            context.relevantData.body_measurements = measurements;
            console.log('📏 Body measurements loaded:', measurements?.length || 0, 'entries');
            break;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load ${dataType}:`, error.message);
      }
    }

    console.log('📊 Smart Context XL built:', {
      profileLoaded: !!context.profile,
      memoryLoaded: !!context.memory,
      xlSummaryDays: context.xlSummaries?.length || 0,
      structuredSummaryDays: context.structuredSummaries?.length || 0,
      regularSummaryDays: context.summaries?.length || 0,
      relevantDataLoaded: Object.keys(context.relevantData).length
    });
    console.log('✅ Smart Context XL built successfully');
    return context;

  } catch (error) {
    console.error('❌ Error building Smart Context XL:', error);
    return context;
  }
}

async function createXLSystemPrompt(context: any, coachPersonality: string, relevantDataTypes: string[], toolContext: any, isNonGerman: boolean = false, liteCtx: boolean = false) {
  const coach = COACH_PERSONALITIES[coachPersonality] || COACH_PERSONALITIES.lucy;
  
    // LITE MODE: Minimal prompt + toolContext injection
    if (liteCtx) {
      let litePrompt = coach.basePrompt + '\n\n';
      
      // Inject toolContext data if available
      if (toolContext?.data) {
        const { profileData, todaysTotals, dailyGoals, summary } = toolContext.data;
        
        if (profileData) {
          const displayName = getDisplayName(profileData);
          litePrompt += `👤 USER: ${displayName}\n`;
          if (profileData.age) litePrompt += `Alter: ${profileData.age}\n`;
        }
        
        if (todaysTotals) {
          litePrompt += `\nHEUTE BISHER:\n`;
          litePrompt += `🍽️ Kalorien: ${todaysTotals.calories || 0}\n`;
          litePrompt += `💪 Protein: ${todaysTotals.protein || 0}g\n`;
          if (todaysTotals.fluids) litePrompt += `💧 Flüssigkeit: ${todaysTotals.fluids}ml\n`;
        }
        
        if (summary?.structured?.training?.total_volume > 0) {
          litePrompt += `🏋️ Training: ${summary.structured.training.total_volume}kg Volumen\n`;
        }
        
        if (dailyGoals) {
          litePrompt += `\nZIELE:\n`;
          if (dailyGoals.calories) litePrompt += `🎯 Kalorien-Ziel: ${dailyGoals.calories}\n`;
          if (dailyGoals.protein) litePrompt += `🎯 Protein-Ziel: ${dailyGoals.protein}g\n`;
        }
      } else {
        // Fallback to existing context
        if (context.profile) {
          const displayName = getDisplayName(context.profile);
          litePrompt += `👤 USER: ${displayName}\n`;
          if (context.profile.age) litePrompt += `Alter: ${context.profile.age}\n`;
        }
        
        if (context.fastMealTotals) {
          litePrompt += `\nHEUTE BISHER:\n`;
          litePrompt += `🍽️ Kalorien: ${context.fastMealTotals.calories || 0}\n`;
          litePrompt += `💪 Protein: ${context.fastMealTotals.protein || 0}g\n`;
        }
        
        if (context.fastWorkoutVolume > 0) {
          litePrompt += `🏋️ Training: ${context.fastWorkoutVolume}kg Volumen\n`;
        }
      }
    
    if (context.fastFluidTotal > 0) {
      litePrompt += `💧 Flüssigkeit: ${context.fastFluidTotal}ml\n`;
    }
    
    litePrompt += `\nBitte antworte kurz und motivierend basierend auf diesen Grunddaten.`;
    console.log('⚡ LITE MODE: Minimal prompt created (~200 tokens)');
    return litePrompt;
  }
  
  // FULL MODE: Enhanced with toolContext injection
  let prompt = coach.basePrompt + '\n\n';
  
  // ============================================================================
  // PHASE C: I18N-GUARD - Internationalisierung
  // ============================================================================
  if (isNonGerman) {
    prompt = `LANG:EN - Please respond in English unless specifically asked otherwise.\n\n` + prompt;
  }
  
  // TOOLCONTEXT INJECTION: Add structured data at the top (Full Mode)
  if (toolContext?.data) {
    const { profileData, todaysTotals, workoutData, sleepData, weightHistory, dailyGoals } = toolContext.data;
    
    // Add today's data prominently at the beginning
    prompt += `🧠 AKTUELLE TAGESDATEN (Full Mode):\n`;
    
    if (todaysTotals) {
      prompt += `📊 HEUTE BISHER:\n`;
      prompt += `• Kalorien: ${todaysTotals.calories || 0} kcal\n`;
      prompt += `• Protein: ${todaysTotals.protein || 0}g\n`;
      prompt += `• Kohlenhydrate: ${todaysTotals.carbs || 0}g\n`;
      prompt += `• Fett: ${todaysTotals.fats || 0}g\n`;
      prompt += `• Mahlzeiten: ${todaysTotals.count || 0}\n\n`;
    }
    
    if (workoutData && workoutData.length > 0) {
      prompt += `💪 HEUTIGES TRAINING:\n`;
      workoutData.forEach((workout: any) => {
        prompt += `• ${workout.exercise_name}: ${workout.sets}x${workout.reps} @ ${workout.weight_kg}kg\n`;
      });
      prompt += '\n';
    }
    
    if (sleepData) {
      prompt += `😴 SCHLAF: ${sleepData.hours_slept || 'N/A'} Stunden (Qualität: ${sleepData.quality || 'N/A'})\n\n`;
    }
    
    if (dailyGoals) {
      prompt += `🎯 TAGESZIELE:\n`;
      prompt += `• Kalorien-Ziel: ${dailyGoals.calories || 'N/A'} kcal\n`;
      prompt += `• Protein-Ziel: ${dailyGoals.protein || 'N/A'}g\n\n`;
    }
    
    // Also include raw data for debugging
    const ctxData = JSON.stringify(toolContext.data).slice(0, 2000);
    console.log(`📊 Injected toolContext data: ${ctxData.length} chars`);
  }
  
  // User Profile Section - prefer toolContext data
  const profileData = toolContext?.data?.profileData || context.profile;
  if (profileData) {
    const displayName = getDisplayName(profileData);
    prompt += `👤 NUTZER-PROFIL:\n`;
    prompt += `Name: ${displayName}\n`;
    if (profileData.age) prompt += `Alter: ${profileData.age} Jahre\n`;
    if (profileData.height) prompt += `Größe: ${profileData.height} cm\n`;
    if (profileData.fitness_level) prompt += `Fitness-Level: ${profileData.fitness_level}\n`;
    prompt += '\n';
  }

  // Goals Section
  if (context.goals) {
    prompt += `🎯 AKTUELLE ZIELE:\n`;
    if (context.goals.calories) prompt += `Kalorien: ${context.goals.calories} kcal/Tag\n`;
    if (context.goals.protein) prompt += `Protein: ${context.goals.protein}g/Tag\n`;
    if (context.goals.calorie_deficit) prompt += `Kaloriendefizit: ${context.goals.calorie_deficit} kcal\n`;
    prompt += '\n';
  }

  // STRUCTURED DATA SECTION - NEW: Detailed JSON data access
  if (context.structuredSummaries && context.structuredSummaries.length > 0) {
    prompt += `📊 STRUKTURIERTE TAGESDATEN (Profil, Supplements, Coach-Topics, Activity):\n`;
    context.structuredSummaries.forEach((summary: any) => {
      if (summary.summary_struct_json) {
        const structData = summary.summary_struct_json;
        prompt += `\n=== ${summary.date} ===\n`;
        
        // Profile data
        if (structData.user_profile) {
          const profile = structData.user_profile;
          prompt += `👤 Profil: ${profile.name || 'N/A'}, ${profile.age || 'N/A'}J, Ziel: ${profile.goal || 'N/A'}\n`;
          if (profile.target_weight) prompt += `   Zielgewicht: ${profile.target_weight}kg\n`;
        }
        
        // Coaching topics
        if (structData.coaching && structData.coaching.topics && structData.coaching.topics.length > 0) {
          prompt += `💭 Gesprächsthemen: ${structData.coaching.topics.join(', ')}\n`;
          prompt += `   Stimmung: ${structData.coaching.sentiment}, Motivation: ${structData.coaching.motivation_level}\n`;
        }
        
        // Activity data
        if (structData.activity || structData.nutrition) {
          if (structData.activity) {
            prompt += `🏃 Aktivität: ${structData.activity.steps || 0} Schritte, ${structData.activity.distance_km || 0}km\n`;
          }
          if (structData.nutrition) {
            prompt += `🍽️ Ernährung: ${structData.nutrition.calories || 0} kcal, ${structData.nutrition.protein || 0}g Protein\n`;
          }
        }
        
        // Supplements
        if (structData.supplements && structData.supplements.compliance !== undefined) {
          prompt += `💊 Supplement-Compliance: ${structData.supplements.compliance}%\n`;
        }
      }
    });
    prompt += '\n';
  }

  // XL Memory Section - Detailed Daily Summaries (FALLBACK for text summaries)
  if (context.xlSummaries && context.xlSummaries.length > 0) {
    prompt += `📈 DETAILLIERTE VERLAUFSDATEN (XL-Memory):\n`;
    context.xlSummaries.forEach((summary: any) => {
      prompt += `${summary.date}: ${summary.summary_xl_md}\n`;
    });
    prompt += '\n';
  } else if (context.summaries && context.summaries.length > 0) {
    prompt += `📊 VERLAUFSDATEN:\n`;
    context.summaries.forEach((summary: any) => {
      prompt += `${summary.date}: ${summary.summary_md}\n`;
    });
    prompt += '\n';
  }

  // Conversation Memory
  if (context.memory && context.memory.memory_data) {
    const memoryData = context.memory.memory_data;
    prompt += `🧠 PERSÖNLICHES GEDÄCHTNIS:\n`;
    
    if (memoryData.relationship_stage) {
      prompt += `Beziehungsstand: ${memoryData.relationship_stage}\n`;
    }
    
    if (memoryData.preferences && Object.keys(memoryData.preferences).length > 0) {
      prompt += `Präferenzen: ${JSON.stringify(memoryData.preferences)}\n`;
    }
    
    if (memoryData.recent_moods && memoryData.recent_moods.length > 0) {
      prompt += `Letzte Stimmungen: ${memoryData.recent_moods.slice(-3).map((m: any) => m.mood).join(', ')}\n`;
    }
    
    if (memoryData.successes && memoryData.successes.length > 0) {
      prompt += `Erfolge: ${memoryData.successes.slice(-2).map((s: any) => s.achievement).join(', ')}\n`;
    }
    prompt += '\n';
  }

  // ============================================================================
  // DEBUG: DATEN-VERFÜGBARKEIT (immer anzeigen!)
  // ============================================================================
  prompt += `🔍 DEBUG - DATENVERFÜGBARKEIT:\n`;
  prompt += `Profile: ${context.profile ? '✅ verfügbar' : '❌ nicht verfügbar'}\n`;
  prompt += `Ziele: ${context.goals ? '✅ verfügbar' : '❌ nicht verfügbar'}\n`;
  prompt += `Memory: ${context.memory ? '✅ verfügbar' : '❌ nicht verfügbar'}\n`;
  prompt += `Relevante Daten: ${context.relevantData && Object.keys(context.relevantData).length > 0 ? `✅ ${Object.keys(context.relevantData).length} Kategorien` : '❌ keine Daten'}\n`;
  if (context.relevantData) {
    Object.keys(context.relevantData).forEach(key => {
      const data = context.relevantData[key];
      prompt += `  - ${key}: ${data && data.length ? `${data.length} Einträge` : 'leer'}\n`;
    });
  }
  prompt += '\n';

  // Relevant Data Section
  if (context.relevantData && Object.keys(context.relevantData).length > 0) {
    prompt += `📋 RELEVANTE AKTUELLE DATEN:\n`;
    
    if (context.relevantData.weight_history) {
      const recent = context.relevantData.weight_history.slice(0, 3);
      prompt += `Gewichtsverlauf: ${recent.map((w: any) => `${w.date}: ${w.weight}kg`).join(', ')}\n`;
    }
    
    if (context.relevantData.meals) {
      const today = new Date().toISOString().split('T')[0];
      const todayMeals = context.relevantData.meals.filter((m: any) => m.created_at.startsWith(today));
      if (todayMeals.length > 0) {
        const totalCals = todayMeals.reduce((sum: number, m: any) => sum + (m.calories || 0), 0);
        const totalProtein = todayMeals.reduce((sum: number, m: any) => sum + (m.protein || 0), 0);
        prompt += `Heute gegessen: ${todayMeals.length} Mahlzeiten, ${Math.round(totalCals)} kcal, ${Math.round(totalProtein)}g Protein\n`;
        prompt += `Letzte Mahlzeiten: ${todayMeals.slice(0, 3).map((m: any) => `"${m.text}" (${m.calories}kcal)`).join(', ')}\n`;
      }
    }
    
    if (context.relevantData.exercise_sessions) {
      const recent = context.relevantData.exercise_sessions.slice(0, 2);
      prompt += `Letzte Workouts: ${recent.map((w: any) => `${w.date}: ${w.session_name || w.workout_type}`).join(', ')}\n`;
    }
    prompt += '\n';
  }

  // Tool Context Integration
  if (toolContext) {
    prompt += `🔧 TOOL-KONTEXT:\n`;
    prompt += `${toolContext.description}\n`;
    if (toolContext.data) {
      // Smart data formatting - truncate large objects but keep structure
      const dataString = JSON.stringify(toolContext.data, null, 2);
      const truncatedData = dataString.length > 1000 
        ? dataString.substring(0, 1000) + '...[truncated]'
        : dataString;
      prompt += `Daten: ${truncatedData}\n`;
    }
    prompt += '\n';
  }

  // Conversation Context
  if (context.conversationSummaries && context.conversationSummaries.length > 0) {
    prompt += `💬 GESPRÄCHSKONTEXT:\n`;
    context.conversationSummaries.forEach((summary: any) => {
      prompt += `${summary.created_at.split('T')[0]}: ${summary.summary_content}\n`;
    });
    prompt += '\n';
  }

  prompt += `=== GENIUS-COACHING-FLOW (einhalten) ===\n`;
  prompt += `1️⃣ ANALYSE – Was sind die aktuellen Daten/Probleme?\n`;
  prompt += `2️⃣ ZIELSETZUNG – Formuliere 1 klaren Tages- oder Wochenfokus.\n`;
  prompt += `3️⃣ PLAN – 2-3 konkrete Handlungen (Tool-Verweis, Plan, Check-in).\n`;
  prompt += `4️⃣ MOTIVATION – 1 Satz Emotional Boost passend zur Persona.\n`;
  prompt += `=========================================\n\n`;

  prompt += `🎯 ANWEISUNGEN:\n`;
  prompt += `- Nutze die bereitgestellten Daten für personalisierte, spezifische Antworten\n`;
  prompt += `- Erkenne Muster und Trends in den Daten\n`;
  prompt += `- Stelle bei Bedarf gezielte Nachfragen\n`;
  prompt += `- Gib konkrete, umsetzbare Ratschläge\n`;
  prompt += `- Erinnere dich an vergangene Gespräche und baue darauf auf\n`;
  prompt += `- Feiere Erfolge und motiviere bei Rückschlägen\n`;
  prompt += `- FALLBACK-TOOLS: Falls dir spezifische Daten fehlen, nutze diese Tools:\n`;
  prompt += `  * get_user_profile() - Holt Benutzerprofil\n`;
  prompt += `  * get_daily_goals() - Holt Tagesziele\n`;
  prompt += `  * get_recent_meals(days=3) - Holt aktuelle Mahlzeiten\n`;
  prompt += `  * get_workout_sessions(days=7) - Holt Trainingseinheiten\n`;
  prompt += `  * get_weight_history(entries=10) - Holt Gewichtsverlauf\n\n`;

  return prompt;
}

async function saveConversation(supabase: any, userId: string, userMessage: string, assistantReply: string, coachPersonality: string, images: string[], toolContext: any) {
  try {
    // Save user message
    if (userMessage) {
      await supabase.from('coach_conversations').insert({
        user_id: userId,
        message_role: 'user',
        message_content: userMessage,
        coach_personality: coachPersonality,
        context_data: {
          images: images,
          tool_context: toolContext
        }
      });
    }

    // Save assistant reply
    await supabase.from('coach_conversations').insert({
      user_id: userId,
      message_role: 'assistant',
      message_content: assistantReply,
      coach_personality: coachPersonality,
      context_data: {
        xl_memory_used: true
      }
    });

  } catch (error) {
    console.error('❌ Error saving conversation:', error);
  }
}

async function updateMemoryAfterChat(supabase: any, userId: string, userMessage: string, assistantReply: string) {
  try {
    // Simple sentiment analysis
    const sentiment = analyzeSentiment(userMessage);
    
    // Update coach memory with new interaction
    const { data: existingMemory } = await supabase
      .from('coach_memory')
      .select('memory_data')
      .eq('user_id', userId)
      .single();

    let memoryData = existingMemory?.memory_data || {
      relationship_stage: 'building_trust',
      preferences: {},
      recent_moods: [],
      successes: [],
      struggles: [],
      trust_level: 1
    };

    // Add mood entry
    if (sentiment !== 'neutral') {
      memoryData.recent_moods = memoryData.recent_moods || [];
      memoryData.recent_moods.push({
        mood: sentiment,
        intensity: 1,
        timestamp: new Date().toISOString(),
        context: userMessage.substring(0, 100)
      });
      
      // Keep only last 10 moods
      if (memoryData.recent_moods.length > 10) {
        memoryData.recent_moods = memoryData.recent_moods.slice(-10);
      }
    }

    // Upsert memory
    await supabase.from('coach_memory').upsert({
      user_id: userId,
      memory_data: memoryData
    });

  } catch (error) {
    console.error('❌ Error updating memory:', error);
  }
}

function analyzeSentiment(text: string): string {
  const positiveWords = ['gut', 'super', 'toll', 'freue', 'motiviert', 'geschafft', 'erfolgreich'];
  const negativeWords = ['schlecht', 'müde', 'schwer', 'problem', 'frustriert', 'aufgeben'];
  
  const lowerText = text.toLowerCase();
  
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function getDisplayName(profile: any): string {
  if (!profile) return 'mein Schützling';
  
  if (profile.preferred_name?.trim()) {
    return profile.preferred_name.trim();
  }
  
  if (profile.first_name?.trim()) {
    return profile.first_name.trim();
  }
  
  if (profile.display_name?.trim()) {
    return profile.display_name.trim().split(' ')[0];
  }
  
  return 'mein Schützling';
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function intelligentTokenShortening(messages: any[], targetTokens: number): any[] {
  if (!messages || messages.length === 0) return [];
  
  let totalTokens = 0;
  const result = [];
  
  // Work backwards from newest messages
  for (let i = messages.length - 1; i >= 0; i--) {
    const messageTokens = estimateTokenCount(messages[i].content || '');
    
    if (totalTokens + messageTokens <= targetTokens) {
      result.unshift(messages[i]);
      totalTokens += messageTokens;
    } else {
      break;
    }
  }
  
  return result;
}
