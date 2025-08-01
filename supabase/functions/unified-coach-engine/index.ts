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

// Prompt Version für Handover-Nachrichten
const PROMPT_VERSION = '2025-08-01-XL';

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
  
  console.log(`🚀 [${requestId}] Unified Coach Engine started`);

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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

    // Check subscription and usage limits
    const { data: limitCheck, error: limitError } = await supabase.rpc('check_ai_usage_limit', {
      p_user_id: userId,
      p_feature_type: 'coach_chat'
    });

    if (limitError) {
      console.error('❌ Usage limit check failed:', limitError);
      throw new Error('Failed to check usage limits');
    }

    if (!limitCheck.can_use) {
      return new Response(JSON.stringify({
        role: 'assistant',
        content: 'Du hast dein tägliches Chat-Limit erreicht. Upgrade auf Premium für unbegrenzte Gespräche! 💫',
        usage_limit_reached: true,
        limits: limitCheck
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429
      });
    }

    // ============================================================================
    // PROMPT-VERSIONIERUNG: Handover bei Prompt-Updates
    // ============================================================================
    
    // Erkenne relevante Datentypen basierend auf Nachricht
    const relevantDataTypes = detectRelevantData(message + ' ' + (toolContext?.description || ''));
    console.log('🧠 Detected relevant data types:', relevantDataTypes);

    // Lade Smart Context mit XL-Memory
    const smartContext = await buildSmartContextXL(supabase, userId, relevantDataTypes);
    console.log('📊 Smart Context XL built:', {
      profileLoaded: !!smartContext.profile,
      memoryLoaded: !!smartContext.memory,
      xlSummaryDays: smartContext.xlSummaries?.length || 0,
      regularSummaryDays: smartContext.summaries?.length || 0,
      relevantDataLoaded: Object.keys(smartContext.relevantData || {}).length
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
    
    // Erstelle erweiterten System-Prompt mit Versionierung und i18n
    const systemPrompt = await createXLSystemPrompt(smartContext, coachPersonality, relevantDataTypes, toolContext, isNonGerman);
    console.log(`💭 [${requestId}] XL System prompt created, tokens:`, estimateTokenCount(systemPrompt), 'i18n:', isNonGerman);

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

    // Füge Conversation History hinzu (intelligent gekürzt)
    if (conversationHistory.length > 0) {
      const trimmedHistory = intelligentTokenShortening(conversationHistory, 1000);
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
        // Für Vision: gpt-4o ist erforderlich
        if (userTier === 'free') {
          console.log('⚠️ Vision request from free user - consider cost warning');
        }
        return 'gpt-4o';
      }
      // Für Text: verwende das neueste und schnellste Modell
      return 'gpt-4.1-2025-04-14';
    };

    const selectedModel = chooseModel(images.length > 0, 'free'); // TODO: echte Tier-Erkennung
    console.log(`🎯 [${requestId}] Selected model:`, selectedModel);

    // OpenAI API Call
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
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
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

async function buildSmartContextXL(supabase: any, userId: string, relevantDataTypes: string[]) {
  console.log('🔍 Building Smart Context XL for user:', userId);
  
  const context: any = {
    profile: null,
    memory: null,
    xlSummaries: [],
    summaries: [],
    relevantData: {},
    goals: null
  };

  try {
    // Load user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    context.profile = profile;

    // Load coach memory
    const { data: memory } = await supabase
      .from('coach_memory')
      .select('*')
      .eq('user_id', userId)
      .single();
    context.memory = memory;

    // Load goals
    const { data: goals } = await supabase
      .from('daily_goals')
      .select('*')
      .eq('user_id', userId)
      .single();
    context.goals = goals;

    // Load XL-Summaries (letzte 7 Tage)
    const { data: xlSummaries } = await supabase
      .from('daily_summaries')
      .select('date, summary_xl_md, total_calories, total_protein, workout_volume')
      .eq('user_id', userId)
      .not('summary_xl_md', 'is', null)
      .order('date', { ascending: false })
      .limit(7);
    context.xlSummaries = xlSummaries || [];

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
            const { data: weights } = await supabase
              .from('weight_history')
              .select('date, weight, body_fat_percentage')
              .eq('user_id', userId)
              .order('date', { ascending: false })
              .limit(10);
            context.relevantData.weight_history = weights;
            break;

          case 'meals':
            const { data: meals } = await supabase
              .from('meals')
              .select('created_at, food_name, calories, protein, carbs, fats')
              .eq('user_id', userId)
              .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
              .order('created_at', { ascending: false })
              .limit(20);
            context.relevantData.meals = meals;
            break;

          case 'exercise_sessions':
            const { data: workouts } = await supabase
              .from('exercise_sessions')
              .select('date, session_name, duration_minutes, overall_rpe, workout_type')
              .eq('user_id', userId)
              .order('date', { ascending: false })
              .limit(10);
            context.relevantData.exercise_sessions = workouts;
            break;

          case 'body_measurements':
            const { data: measurements } = await supabase
              .from('body_measurements')
              .select('date, waist, chest, arms, hips')
              .eq('user_id', userId)
              .order('date', { ascending: false })
              .limit(5);
            context.relevantData.body_measurements = measurements;
            break;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load ${dataType}:`, error.message);
      }
    }

    console.log('✅ Smart Context XL built successfully');
    return context;

  } catch (error) {
    console.error('❌ Error building Smart Context XL:', error);
    return context;
  }
}

async function createXLSystemPrompt(context: any, coachPersonality: string, relevantDataTypes: string[], toolContext: any, isNonGerman: boolean = false) {
  const coach = COACH_PERSONALITIES[coachPersonality] || COACH_PERSONALITIES.lucy;
  
  let prompt = coach.basePrompt + '\n\n';
  
  // ============================================================================
  // PHASE C: I18N-GUARD - Internationalisierung
  // ============================================================================
  if (isNonGerman) {
    prompt = `LANG:EN - Please respond in English unless specifically asked otherwise.\n\n` + prompt;
  }
  
  // User Profile Section
  if (context.profile) {
    const displayName = getDisplayName(context.profile);
    prompt += `👤 NUTZER-PROFIL:\n`;
    prompt += `Name: ${displayName}\n`;
    if (context.profile.age) prompt += `Alter: ${context.profile.age} Jahre\n`;
    if (context.profile.height) prompt += `Größe: ${context.profile.height} cm\n`;
    if (context.profile.fitness_level) prompt += `Fitness-Level: ${context.profile.fitness_level}\n`;
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

  // XL Memory Section - Detailed Daily Summaries
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
        prompt += `Heute gegessen: ${todayMeals.length} Mahlzeiten, ${Math.round(totalCals)} kcal\n`;
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
      prompt += `Daten: ${JSON.stringify(toolContext.data)}\n`;
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

  prompt += `🎯 ANWEISUNGEN:\n`;
  prompt += `- Nutze die bereitgestellten Daten für personalisierte, spezifische Antworten\n`;
  prompt += `- Erkenne Muster und Trends in den Daten\n`;
  prompt += `- Stelle bei Bedarf gezielte Nachfragen\n`;
  prompt += `- Gib konkrete, umsetzbare Ratschläge\n`;
  prompt += `- Erinnere dich an vergangene Gespräche und baue darauf auf\n`;
  prompt += `- Feiere Erfolge und motiviere bei Rückschlägen\n\n`;

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
