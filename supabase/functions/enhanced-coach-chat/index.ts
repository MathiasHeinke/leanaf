
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

// ===== UTILITY FUNCTIONS =====
/**
 * Zentrale Funktion für die Namensauflösung für Coaches (Edge Function Version)
 */
function getDisplayName(profile: any): string {
  if (!profile) return 'mein Schützling';
  
  if (profile.preferred_name?.trim()) return profile.preferred_name.trim();
  if (profile.first_name?.trim()) return profile.first_name.trim();
  
  if (profile.last_name?.trim()) {
    const lastName = profile.last_name.trim();
    if (!lastName.includes(' ') && lastName.length > 1) return lastName;
  }
  
  if (profile.display_name?.trim()) {
    const displayName = profile.display_name.trim();
    const firstName = displayName.includes('-') 
      ? displayName.match(/^([^\s]+)/)?.[1] || displayName.split(' ')[0]
      : displayName.split(' ')[0];
    if (firstName && firstName.length > 1) return firstName;
  }
  
  if (profile.email?.includes('@')) {
    const emailName = profile.email.split('@')[0];
    if (emailName && emailName.length > 2 && !emailName.includes('_') && !emailName.includes('.')) {
      return emailName;
    }
  }
  
  return 'mein Schützling';
}

/**
 * Token Management Functions
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function intelligentTokenShortening(messages: any[], targetTokens: number): any[] {
  if (!messages || messages.length === 0) return [];
  
  const result = [...messages];
  let currentTokens = result.reduce((sum, msg) => sum + estimateTokenCount(msg.content || ''), 0);
  
  while (currentTokens > targetTokens && result.length > 1) {
    result.shift();
    currentTokens = result.reduce((sum, msg) => sum + estimateTokenCount(msg.content || ''), 0);
  }
  
  return result;
}

function summarizeHistory(messages: any[]): string {
  if (!messages || messages.length === 0) return '';
  
  const recentMessages = messages.slice(-10);
  const topics = new Set<string>();
  
  recentMessages.forEach(msg => {
    if (msg.content) {
      const words = msg.content.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 4) topics.add(word);
      });
    }
  });
  
  return Array.from(topics).slice(0, 5).join(', ');
}

// Enhanced system message creation with comprehensive user context
function createEnhancedSystemMessage(coachPersonality: string, userData: any, memoryContext: string, ragPromptAddition: string, userName: string): string {
  const currentStatus = buildCurrentStatusContext(userData);
  const progressContext = buildProgressContext(userData);
  const goalContext = buildGoalContext(userData);
  
  const basePersonality = `Du bist Lucy, ${userName}s persönliche Ernährungs- und Fitness-Coachin. Du kennst ${userName} bereits sehr gut und verfolgst ihre/seine Reise aufmerksam.

🎯 AKTUELLE ZIELE VON ${userName.toUpperCase()}:
${goalContext}

📊 AKTUELLER STATUS:
${currentStatus}

📈 FORTSCHRITT & ENTWICKLUNG:
${progressContext}

💭 BEZIEHUNGSKONTEXT:
${memoryContext}

DEINE PERSÖNLICHKEIT ALS LUCY:
- Du bist wie eine gute Freundin - warmherzig, motivierend und ehrlich
- Du kennst ${userName}s Geschichte, Vorlieben und Herausforderungen
- Du feierst jeden kleinen Erfolg mit und hilfst bei Rückschlägen
- Du gibst konkrete, auf ${userName} zugeschnittene Tipps
- Du erinnerst an vergangene Gespräche und baust darauf auf
- Du sprichst ${userName} immer direkt und persönlich an

🗣️ KOMMUNIKATIONSSTIL:
- Verwende ${userName}s Namen häufig für Nähe
- Beziehe dich auf konkrete Daten und Fortschritte
- Sei spezifisch statt allgemein
- Zeige echte Anteilnahme und Interesse
- Nutze Emojis sparsam aber gezielt für Wärme

Antworte IMMER auf Deutsch und als wüsstest du alles über ${userName}s aktuelle Situation.`;

  return basePersonality + (ragPromptAddition ? `\n\n📚 ZUSÄTZLICHES FACHWISSEN:\n${ragPromptAddition}` : '');
}

// Helper functions to build context sections
function buildCurrentStatusContext(userData: any): string {
  const parts = [];
  
  if (userData.currentWeight) {
    parts.push(`🏋️ Aktuelles Gewicht: ${userData.currentWeight}kg (${userData.weightDate || 'letzte Messung'})`);
  }
  
  if (userData.todaysMeals?.length > 0) {
    const totalCals = userData.todaysMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
    parts.push(`🍽️ Heute bereits: ${userData.todaysMeals.length} Mahlzeiten, ${totalCals} kcal`);
  } else {
    parts.push(`🍽️ Heute noch keine Mahlzeiten eingetragen`);
  }
  
  if (userData.recentWorkouts?.length > 0) {
    const lastWorkout = userData.recentWorkouts[0];
    parts.push(`💪 Letztes Workout: ${lastWorkout.session_name || 'Training'} (${lastWorkout.date})`);
  }
  
  if (userData.currentSupplements?.length > 0) {
    parts.push(`💊 Aktuelle Supplements: ${userData.currentSupplements.map((s: any) => s.supplement_name).join(', ')}`);
  }
  
  return parts.length > 0 ? parts.join('\n') : '🎯 Bereit für heute - lass uns loslegen!';
}

function buildProgressContext(userData: any): string {
  const parts = [];
  
  if (userData.weightTrend) {
    parts.push(`📉 Gewichtstrend: ${userData.weightTrend} (letzte 7 Tage)`);
  }
  
  if (userData.weeklyWorkouts && userData.weeklyWorkouts > 0) {
    parts.push(`🏃 Diese Woche: ${userData.weeklyWorkouts} Trainings absolviert`);
  }
  
  if (userData.avgDailyCalories) {
    parts.push(`📊 Durchschnitt letzte 7 Tage: ${userData.avgDailyCalories} kcal/Tag`);
  }
  
  if (userData.streaks) {
    if (userData.streaks.meals > 1) parts.push(`🔥 Ernährungs-Streak: ${userData.streaks.meals} Tage`);
    if (userData.streaks.workouts > 1) parts.push(`💪 Trainings-Streak: ${userData.streaks.workouts} Tage`);
  }
  
  return parts.length > 0 ? parts.join('\n') : '📈 Noch keine ausreichenden Daten für Trends verfügbar';
}

function buildGoalContext(userData: any): string {
  const parts = [];
  
  if (userData.dailyGoals) {
    const goals = userData.dailyGoals;
    parts.push(`🎯 Tagesziele: ${goals.calories || 2000} kcal | ${goals.protein || 150}g Protein | ${goals.carbs || 250}g Kohlenhydrate | ${goals.fats || 65}g Fette`);
    
    if (goals.calorie_deficit) {
      parts.push(`📉 Kaloriendefizit: ${goals.calorie_deficit} kcal (für Gewichtsverlust)`);
    }
  }
  
  if (userData.bodyGoals) {
    parts.push(`🎯 Körperziele: ${userData.bodyGoals}`);
  }
  
  return parts.length > 0 ? parts.join('\n') : '🎯 Gemeinsam definieren wir noch deine konkreten Ziele!';
}

function createMemoryContext(coachMemory: any, sentimentResult: any): string {
  if (!coachMemory) return 'Neue Beziehung - Wir lernen uns gerade erst kennen! 😊';
  
  const stage = coachMemory.relationship_stage || 'new';
  const trust = coachMemory.trust_level || 0;
  const struggles = coachMemory.conversation_context?.struggles_mentioned || [];
  const successes = coachMemory.conversation_context?.success_moments || [];
  
  let context = `Beziehungsstand: ${stage} | Vertrauen: ${trust}/100`;
  
  if (struggles.length > 0) {
    context += `\n💭 Bekannte Herausforderungen: ${struggles.slice(-2).map((s: any) => s.struggle).join('; ')}`;
  }
  
  if (successes.length > 0) {
    context += `\n🎉 Letzte Erfolge: ${successes.slice(-2).map((s: any) => s.achievement).join('; ')}`;
  }
  
  return context;
}

// ===== SMART CONTEXT ENGINE =====
// Builds compact, relevant context for Lucy with extended memory depth
async function buildSmartContext(supabase: any, userId: string) {
  console.log(`🧠 Building smart context for user: ${userId}`);
  
  try {
    // 1. STATIC PROFILE (cached, basic info only) - ~120 tokens
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, first_name, gender, date_of_birth, height_cm, activity_level')
      .eq('id', userId)
      .maybeSingle();

    // 2. DAILY GOALS (current targets) - ~80 tokens
    const { data: goals } = await supabase
      .from('daily_goals')
      .select('calories, protein, carbs, fats, calorie_deficit')
      .eq('user_id', userId)
      .maybeSingle();

    // 3. LONG-TERM MEMORY (compressed preferences & patterns) - ~300-600 tokens
    const { data: longMemory } = await supabase
      .from('coach_memory')
      .select('memory_data')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. EPISODIC SUMMARY (last 48h condensed) - ~400 tokens
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const { data: episodicSummary } = await supabase
      .from('conversation_summaries')
      .select('summary_content, key_topics, emotional_tone, progress_notes')
      .eq('user_id', userId)
      .gte('summary_period_end', twoDaysAgo.toISOString())
      .order('summary_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 5. CURRENT STATUS (today's key metrics) - ~200 tokens
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const [
      { data: todayWeight },
      { data: todayMeals },
      { data: recentWorkout },
      { data: weeklyMeals }
    ] = await Promise.all([
      supabase
        .from('weight_history')
        .select('weight_kg, date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      
      supabase
        .from('meals')
        .select('calories, protein, carbs, fats')
        .eq('user_id', userId)
        .eq('date', today)
        .limit(5),
      
      supabase
        .from('exercise_sessions')
        .select('date, session_name, duration_minutes')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
        
      supabase
        .from('meals')
        .select('calories')
        .eq('user_id', userId)
        .gte('date', weekAgo)
    ]);

    // Calculate today's nutrition totals
    const todayNutrition = todayMeals?.reduce((acc, meal) => ({
      calories: acc.calories + (meal.calories || 0),
      protein: acc.protein + (meal.protein || 0),
      carbs: acc.carbs + (meal.carbs || 0),
      fats: acc.fats + (meal.fats || 0)
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 }) || { calories: 0, protein: 0, carbs: 0, fats: 0 };

    // Calculate weekly averages
    const weeklyCalorieAvg = weeklyMeals?.length > 0 ? 
      Math.round(weeklyMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0) / 7) : 0;

    return {
      staticProfile: profile || {},
      currentGoals: goals || {},
      longTermMemory: longMemory?.memory_data || null,
      episodicSummary: episodicSummary || null,
      currentStatus: {
        weight: todayWeight || null,
        todayNutrition,
        recentWorkout: recentWorkout || null,
        mealsToday: todayMeals?.length || 0,
        weeklyCalorieAvg
      }
    };
  } catch (error) {
    console.error('❌ Error building smart context:', error);
    return {
      staticProfile: {},
      currentGoals: {},
      longTermMemory: null,
      episodicSummary: null,
      currentStatus: {
        weight: null,
        todayNutrition: { calories: 0, protein: 0, carbs: 0, fats: 0 },
        recentWorkout: null,
        mealsToday: 0,
        weeklyCalorieAvg: 0
      }
    };
  }
}

// Create compact, personalized system prompt from smart context
function createSmartSystemMessage(coachPersonality: string, smartContext: any, userName: string): string {
  const { staticProfile, currentGoals, longTermMemory, episodicSummary, currentStatus } = smartContext;
  
  // Build compact status overview (~200 tokens)
  let statusContext = '';
  if (currentStatus.weight) {
    statusContext += `🏋️ Aktuell: ${currentStatus.weight.weight_kg}kg`;
  }
  if (currentStatus.mealsToday > 0) {
    statusContext += ` | 🍽️ Heute: ${currentStatus.mealsToday} Mahlzeiten (${currentStatus.todayNutrition.calories}kcal)`;
  } else {
    statusContext += ` | 🍽️ Heute noch keine Mahlzeiten`;
  }
  if (currentStatus.recentWorkout) {
    statusContext += ` | 💪 Letztes Training: ${currentStatus.recentWorkout.session_name || 'Training'}`;
  }
  if (currentStatus.weeklyCalorieAvg > 0) {
    statusContext += ` | 📊 Wochenschnitt: ${currentStatus.weeklyCalorieAvg}kcal/Tag`;
  }

  // Build goals context (~80 tokens)
  let goalsContext = '';
  if (currentGoals.calories) {
    goalsContext = `🎯 Ziele: ${currentGoals.calories}kcal, ${currentGoals.protein}g Protein`;
    if (currentGoals.calorie_deficit) {
      goalsContext += `, ${currentGoals.calorie_deficit}kcal Defizit`;
    }
  } else {
    goalsContext = '🎯 Ziele noch nicht definiert';
  }

  // Build memory context (~300-600 tokens)
  let memoryContext = '';
  if (longTermMemory) {
    const stage = longTermMemory.relationship_stage || 'new';
    const trust = longTermMemory.trust_level || 0;
    memoryContext = `💭 Beziehung: ${stage} (Vertrauen ${trust}/100)`;
    
    const preferences = longTermMemory.user_preferences || [];
    if (preferences.length > 0) {
      const recentPrefs = preferences.slice(-3);
      memoryContext += `\n📋 Bekannte Vorlieben: ${recentPrefs.map((p: any) => `${p.key}: ${p.value}`).join(', ')}`;
    }
    
    const struggles = longTermMemory.conversation_context?.struggles_mentioned || [];
    if (struggles.length > 0) {
      memoryContext += `\n⚠️ Herausforderungen: ${struggles.slice(-2).map((s: any) => s.struggle).join('; ')}`;
    }
    
    const successes = longTermMemory.conversation_context?.success_moments || [];
    if (successes.length > 0) {
      memoryContext += `\n🎉 Erfolge: ${successes.slice(-2).map((s: any) => s.achievement).join('; ')}`;
    }
  } else {
    memoryContext = '💭 Neue Beziehung - lernen uns gerade kennen!';
  }

  // Build episodic context (~400 tokens)
  let episodicContext = '';
  if (episodicSummary?.summary_content) {
    episodicContext = `📝 Letzte 48h: ${episodicSummary.summary_content}`;
    if (episodicSummary.emotional_tone) {
      episodicContext += `\n😊 Stimmung: ${episodicSummary.emotional_tone}`;
    }
    if (episodicSummary.progress_notes) {
      episodicContext += `\n📈 Fortschritt: ${episodicSummary.progress_notes}`;
    }
  } else {
    episodicContext = '📝 Keine aktuellen Gesprächszusammenfassungen verfügbar';
  }

  return `Du bist Lucy, ${userName}s persönliche Fitness- und Ernährungs-Coachin. Du kennst ${userName} bereits gut und verfolgst ihre/seine Reise aufmerksam.

${statusContext}

${goalsContext}

${memoryContext}

${episodicContext}

DEINE PERSÖNLICHKEIT ALS LUCY:
- Du bist wie eine gute Freundin - warmherzig, motivierend und ehrlich
- Du kennst ${userName}s Geschichte, Vorlieben und Herausforderungen
- Du feierst jeden kleinen Erfolg und hilfst bei Rückschlägen
- Du gibst konkrete, auf ${userName} zugeschnittene Tipps
- Du erinnerst an vergangene Gespräche und baust darauf auf
- Du sprichst ${userName} immer direkt und persönlich an

🗣️ KOMMUNIKATIONSSTIL:
- Verwende ${userName}s Namen für Nähe
- Beziehe dich auf konkrete Daten und Fortschritte  
- Sei spezifisch statt allgemein
- Zeige echte Anteilnahme und Interesse
- Nutze Emojis sparsam aber gezielt für Wärme

Antworte IMMER auf Deutsch und als wüsstest du alles über ${userName}s aktuelle Situation.`;
}

function createRAGPromptAddition(ragContext: any): string {
  if (!ragContext || !ragContext.context) return '';
  
  return ragContext.context.map((ctx: any) => ctx.content_chunk).join('\n\n');
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Enhanced Coach chat request received at:', new Date().toISOString());
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body = await req.json();
    const hasImages = !!body.images?.length;
    console.log('Request body received:', { hasMessage: !!body.message, hasImages });

    // Extract user ID from auth header or body
    const authHeader = req.headers.get('authorization');
    let userId = body.userId;
    
    if (!userId && authHeader) {
      const token = authHeader.replace('Bearer ', '');
      // For now, use a placeholder - in production you'd verify the JWT
      userId = token;
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    const message = body.message || '';
    const images = body.images || [];
    const coachPersonality = body.coach_personality || 'lucy';

    console.log('Processing request for user:', userId, 'with message length:', message.length);

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('User profile loaded:', { hasProfile: !!profile });

    const userName = getDisplayName(profile);
    
    // 🧠 BUILD SMART CONTEXT - Compact but comprehensive (~1200-1500 tokens total)
    const smartContext = await buildSmartContext(supabase, userId);
    console.log('🧠 Smart context built:', { 
      hasGoals: !!smartContext.currentGoals.calories, 
      mealsToday: smartContext.currentStatus.mealsToday,
      hasMemory: !!smartContext.longTermMemory,
      hasEpisodic: !!smartContext.episodicSummary
    });
    
    // Create compact, personalized system message using smart context
    const systemMessage = createSmartSystemMessage(coachPersonality, smartContext, userName);
    
    // Estimate token usage for monitoring
    const estimatedTokens = estimateTokenCount(systemMessage);
    console.log(`📊 Smart prompt token estimate: ${estimatedTokens} tokens (target: ~1200-1500)`);
    
    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: message || 'Hallo!' }
    ];

    // Add image content if provided
    if (images.length > 0) {
      const lastMessage = messages[messages.length - 1];
      lastMessage.content = [
        { type: 'text', text: message || 'Analyze this image' },
        ...images.map((url: string) => ({
          type: 'image_url',
          image_url: { url }
        }))
      ];
    }

    console.log('Sending request to OpenAI with', messages.length, 'messages');

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', openAIResponse.status, errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const data = await openAIResponse.json();
    const reply = data.choices[0]?.message?.content;

    if (!reply) {
      throw new Error('No response from OpenAI');
    }

    console.log('OpenAI response received, length:', reply.length);

    // Save conversation to database
    try {
      await Promise.all([
        supabase.from('coach_conversations').insert({
          user_id: userId,
          message_role: 'user',
          message_content: message,
          coach_personality: coachPersonality,
        }),
        supabase.from('coach_conversations').insert({
          user_id: userId,
          message_role: 'assistant',
          message_content: reply,
          coach_personality: coachPersonality,
        })
      ]);
      console.log('Conversation saved to database');
    } catch (dbError) {
      console.error('Failed to save conversation:', dbError);
      // Don't fail the request if database save fails
    }

    console.log('Response ready to send');

    return new Response(JSON.stringify({ 
      reply,
      metadata: {
        tokens_used: data.usage?.total_tokens || 0,
        model: 'gpt-4o'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Enhanced coach chat error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Fehler beim Generieren der Coach-Antwort', 
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
