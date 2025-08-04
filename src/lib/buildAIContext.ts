import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import coachPersonasData from "@/data/coach-personas.json";

export const CtxInput = z.object({
  userId: z.string().uuid(),
  coachId: z.string(),
  userMessage: z.string(),
  enableRag: z.boolean().optional().default(false),
  tokenCap: z.number().optional().default(8_000),
  // Debug headers
  disableMemory: z.boolean().optional().default(false),
  disableDaily: z.boolean().optional().default(false),
  disableRag: z.boolean().optional().default(false),
  liteContext: z.boolean().optional().default(false),
  debugMode: z.boolean().optional().default(false)
});
export type CtxInput = z.infer<typeof CtxInput>;

export type BuiltCtx = {
  persona: { name: string; style: string[] };
  memory: { 
    userName?: string; 
    relationship?: string; 
    trust?: number; 
    summary?: string;
    preferences?: any;
  } | null;
  daily: { 
    // Basic Metrics
    totalCaloriesToday?: number;
    totalProteinToday?: number;
    caloriesLeft?: number;
    proteinLeft?: number;
    
    // Weight & Body
    currentWeight?: number;
    weightTrend?: string;
    bodyFat?: number;
    
    // Nutrition
    recentMeals?: Array<{ name: string; calories: number; protein: number; time: string }>;
    macroBalance?: string;
    
    // Training
    lastWorkout?: string;
    weeklyVolume?: number;
    trainingFrequency?: string;
    
    // Recovery
    sleepHours?: number;
    sleepQuality?: string;
    recoveryScore?: number;
    
    // Lifestyle
    hydrationScore?: number;
    supplementCompliance?: number;
    
    // Achievements
    activeStreaks?: Array<{ type: string; current: number; best: number }>;
    recentBadges?: string[];
    challengeProgress?: any[];
    
    // Meta
    dataCompleteness?: number;
  } | null;
  ragChunks: { source: string; text: string }[] | null;
  conversationSummary: string | null;
  metrics: { tokensIn: number };
};

function approxTokens(s: string): number {
  return Math.ceil((s || "").length / 4);
}

function hardTrim(str: string, tokenCap: number): string {
  const charCap = tokenCap * 4;
  if (str.length <= charCap) return str;
  return str.slice(0, charCap);
}

async function safe<T>(p: Promise<T>): Promise<T | null> {
  try { 
    return await p; 
  } catch (error) {
    console.warn('Context loader failed:', error);
    return null; 
  }
}

// Real coach persona loader using actual JSON data
async function getCoachPersona(coachId: string) {
  try {
    const persona = coachPersonasData.find(p => 
      p.id === `persona_${coachId}` || 
      p.coachName.toLowerCase().includes(coachId.toLowerCase())
    );
    
    if (persona) {
      return {
        name: persona.coachName,
        style: persona.personality.coreTraits || ["direkt", "lösungsorientiert"]
      };
    }
    
    // Fallback mapping for compatibility
    const fallbackPersonas: Record<string, any> = {
      lucy: { name: "Dr. Lucy Martinez", style: ["empathisch", "motivierend", "lernorientiert"] },
      markus: { name: "Markus Rühl", style: ["direkt", "brachial", "old-school"] },
      sascha: { name: "Sascha Weber", style: ["stoisch", "direkt", "analytisch"] }
    };
    
    return fallbackPersonas[coachId] || { name: "Coach", style: ["direkt", "lösungsorientiert"] };
  } catch (error) {
    console.warn('Failed to load coach persona:', error);
    return { name: "Coach", style: ["direkt", "lösungsorientiert"] };
  }
}

async function loadCoachMemory(userId: string, coachId: string) {
  try {
    const { data, error } = await supabase
      .from('coach_memory')
      .select('memory_data')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.warn('Coach memory loading failed:', error.message);
      return null;
    }
    
    if (data && data.memory_data) {
      const memoryData = data.memory_data as any;
      
      // ============= PHASE 2: ENHANCED MEMORY EXTRACTION =============
      // Extract user name from preferences
      const userName = memoryData.preferences?.preferred_name || 
                      memoryData.preferences?.name || 
                      memoryData.userName ||
                      null;
      
      return {
        userName: userName,
        relationship: memoryData.relationship_stage || memoryData.relationshipStage || "building_trust",
        trust: memoryData.trust_level || memoryData.trustLevel || 1,
        summary: memoryData.preferences ? `Beziehung: ${memoryData.relationship_stage}, Vertrauen: ${memoryData.trust_level}` : "Neuer Nutzer",
        preferences: memoryData.preferences || {}
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Coach memory loading exception:', error);
    return null;
  }
}

async function loadConversationSummary(userId: string, coachId: string) {
  try {
    const { data, error } = await supabase
      .from('conversation_summaries')
      .select('summary_content, key_topics')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.warn('Conversation summary loading failed:', error.message);
      return null;
    }
    
    return data?.summary_content || null;
  } catch (error) {
    console.warn('Conversation summary loading exception:', error);
    return null;
  }
}

async function loadDailySummary(userId: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // ============= PHASE 2: ENHANCED CONTEXT BUILDER =============
    // 15+ Data Sources - Parallel Loading für maximum Performance
    const [
      summaryResult,
      goalsResult,
      weightResult,
      mealsResult,
      exerciseResult,
      sleepResult,
      supplementResult,
      streaksResult,
      badgesResult,
      challengesResult,
      fluidResult,
      bodyMeasResult
    ] = await Promise.allSettled([
      // Core daily summary
      supabase
        .from('daily_summaries')
        .select('total_calories, total_protein, total_carbs, total_fats, workout_volume, sleep_score, summary_md, hydration_score')
        .eq('user_id', userId)
        .in('date', [today, yesterday])
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      
      // Daily goals
      supabase
        .from('daily_goals')
        .select('calories, protein, carbs, fats')
        .eq('user_id', userId)
        .maybeSingle(),
      
      // Weight trend (last 5 entries)
      supabase
        .from('weight_history')
        .select('weight, date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(5),
      
      // Recent meals (last 10 for better context)
      supabase
        .from('meals')
        .select('text, calories, protein, carbs, fats, created_at')
        .eq('user_id', userId)
        .gte('created_at', yesterday + 'T00:00:00.000Z')
        .order('created_at', { ascending: false })
        .limit(10),
      
      // Recent exercise sessions & volume
      supabase
        .from('exercise_sessions')
        .select('session_name, workout_type, duration_minutes, overall_rpe, created_at')
        .eq('user_id', userId)
        .gte('created_at', yesterday + 'T00:00:00.000Z')
        .order('created_at', { ascending: false })
        .limit(3),
      
      // Sleep tracking
      supabase
        .from('sleep_tracking')
        .select('sleep_hours, sleep_quality, sleep_score, date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(3),
      
      // Supplement compliance
      supabase
        .from('supplement_intake_log')
        .select('supplement_name, taken, created_at')
        .eq('user_id', userId)
        .gte('created_at', today + 'T00:00:00.000Z')
        .order('created_at', { ascending: false }),
      
      // Active streaks
      supabase
        .from('user_streaks')
        .select('streak_type, current_streak, longest_streak')
        .eq('user_id', userId)
        .gt('current_streak', 0),
      
      // Recent badges/achievements
      supabase
        .from('badges')
        .select('badge_type, badge_name, earned_at')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
        .limit(3),
      
      // Monthly challenges
      supabase
        .from('monthly_challenges')
        .select('challenge_type, progress, target, is_completed')
        .eq('user_id', userId)
        .eq('month', new Date().getMonth() + 1)
        .eq('year', new Date().getFullYear()),
      
      // Fluid intake
      supabase
        .from('user_fluids')
        .select('amount_ml, created_at')
        .eq('user_id', userId)
        .gte('created_at', today + 'T00:00:00.000Z')
        .order('created_at', { ascending: false }),
      
      // Body measurements
      supabase
        .from('body_measurements')
        .select('body_fat, muscle_mass, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
    ]);
    
    // ============= ENHANCED DATA PROCESSING =============
    const contextData = {
      // Basic metrics
      totalCaloriesToday: 0,
      totalProteinToday: 0,
      caloriesLeft: 0,
      proteinLeft: 0,
      
      // Weight & Body
      currentWeight: null as number | null,
      weightTrend: "stabil" as string,
      bodyFat: null as number | null,
      
      // Nutrition
      recentMeals: [] as any[],
      macroBalance: "ausgeglichen" as string,
      
      // Training
      lastWorkout: "Kein Training" as string,
      weeklyVolume: 0,
      trainingFrequency: "niedrig" as string,
      
      // Recovery
      sleepHours: null as number | null,
      sleepQuality: "unbekannt" as string,
      recoveryScore: 0,
      
      // Lifestyle
      hydrationScore: 0,
      supplementCompliance: 0,
      
      // Achievements
      activeStreaks: [] as any[],
      recentBadges: [] as any[],
      challengeProgress: [] as any[],
      
      // Meta
      dataCompleteness: 0
    };
    
    // Process each data source
    if (summaryResult.status === 'fulfilled' && summaryResult.value?.data) {
      const summary = summaryResult.value.data;
      contextData.totalCaloriesToday = summary.total_calories || 0;
      contextData.totalProteinToday = summary.total_protein || 0;
      contextData.hydrationScore = summary.hydration_score || 0;
      contextData.sleepHours = summary.sleep_score ? Math.round(summary.sleep_score / 10 * 8) : null;
    }
    
    if (goalsResult.status === 'fulfilled' && goalsResult.value?.data) {
      const goals = goalsResult.value.data;
      contextData.caloriesLeft = Math.max(0, (goals.calories || 2000) - contextData.totalCaloriesToday);
      contextData.proteinLeft = Math.max(0, (goals.protein || 150) - contextData.totalProteinToday);
    }
    
    if (weightResult.status === 'fulfilled' && weightResult.value?.data?.length > 0) {
      const weights = weightResult.value.data;
      contextData.currentWeight = weights[0].weight;
      
      // Calculate weight trend
      if (weights.length >= 3) {
        const recent = weights[0].weight;
        const older = weights[2].weight;
        const diff = recent - older;
        contextData.weightTrend = diff > 0.5 ? "steigend" : diff < -0.5 ? "fallend" : "stabil";
      }
    }
    
    if (mealsResult.status === 'fulfilled' && mealsResult.value?.data?.length > 0) {
      contextData.recentMeals = mealsResult.value.data.slice(0, 5).map((meal: any) => ({
        name: meal.text,
        calories: meal.calories,
        protein: meal.protein,
        time: new Date(meal.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      }));
    }
    
    if (exerciseResult.status === 'fulfilled' && exerciseResult.value?.data?.length > 0) {
      const sessions = exerciseResult.value.data;
      contextData.lastWorkout = `${sessions[0].session_name || sessions[0].workout_type} (${sessions[0].duration_minutes || 0}min)`;
      contextData.trainingFrequency = sessions.length >= 3 ? "hoch" : sessions.length >= 2 ? "mittel" : "niedrig";
    }
    
    if (sleepResult.status === 'fulfilled' && sleepResult.value?.data?.length > 0) {
      const sleep = sleepResult.value.data[0];
      contextData.sleepHours = sleep.sleep_hours;
      contextData.sleepQuality = sleep.sleep_quality >= 7 ? "gut" : sleep.sleep_quality >= 5 ? "okay" : "schlecht";
      contextData.recoveryScore = sleep.sleep_score || 0;
    }
    
    if (streaksResult.status === 'fulfilled' && streaksResult.value?.data?.length > 0) {
      contextData.activeStreaks = streaksResult.value.data.map((streak: any) => ({
        type: streak.streak_type,
        current: streak.current_streak,
        best: streak.longest_streak
      }));
    }
    
    if (badgesResult.status === 'fulfilled' && badgesResult.value?.data?.length > 0) {
      contextData.recentBadges = badgesResult.value.data.map((badge: any) => badge.badge_name);
    }
    
    // Calculate data completeness score
    let completeness = 0;
    if (contextData.currentWeight) completeness += 15;
    if (contextData.recentMeals.length > 0) completeness += 25;
    if (contextData.lastWorkout !== "Kein Training") completeness += 20;
    if (contextData.sleepHours) completeness += 15;
    if (contextData.activeStreaks.length > 0) completeness += 10;
    if (contextData.hydrationScore > 0) completeness += 15;
    
    contextData.dataCompleteness = completeness;
    
    return contextData;
  } catch (error) {
    console.warn('Enhanced context loading exception:', error);
    return null;
  }
}

async function runRag(query: string, coachId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('enhanced-coach-rag', {
      body: {
        query,
        coachId,
        maxResults: 3
      }
    });
    
    if (error) {
      console.warn('RAG system failed:', error.message);
      return { chunks: [] };
    }
    
    if (data?.chunks && Array.isArray(data.chunks)) {
      return {
        chunks: data.chunks.map((chunk: any) => ({
          source: chunk.source || 'knowledge-base',
          text: chunk.content || chunk.text || ''
        }))
      };
    }
    
    return { chunks: [] };
  } catch (error) {
    console.warn('RAG system exception:', error);
    return { chunks: [] };
  }
}

/**  
 * Builds comprehensive AI context with fail-soft pattern
 * - Promise.allSettled ⇒ no 500s if subsystems fail
 * - Token HardCap ⇒ protection against >32k inputs
 */
export async function buildAIContext(rawInput: CtxInput): Promise<BuiltCtx> {
  const input = CtxInput.parse(rawInput);

  if (input.debugMode) {
    console.log('🔧 DEBUG: buildAIContext called with:', {
      userId: input.userId.substring(0, 8) + '...',
      coachId: input.coachId,
      enableRag: input.enableRag,
      disableMemory: input.disableMemory,
      disableDaily: input.disableDaily,
      disableRag: input.disableRag,
      liteContext: input.liteContext
    });
  }

  // 1) Load everything in parallel with debug flags - individual failures allowed
  const contextLoaders = [
    { name: 'persona', loader: () => getCoachPersona(input.coachId), skip: false },
    { name: 'memory', loader: () => loadCoachMemory(input.userId, input.coachId), skip: input.disableMemory || input.liteContext },
    { name: 'conversation', loader: () => loadConversationSummary(input.userId, input.coachId), skip: input.liteContext },
    { name: 'daily', loader: () => loadDailySummary(input.userId), skip: input.disableDaily || input.liteContext },
    { name: 'rag', loader: () => runRag(input.userMessage, input.coachId), skip: input.disableRag || !input.enableRag }
  ];

  const promises = contextLoaders.map(loader => 
    loader.skip ? Promise.resolve(null) : loader.loader()
  );

  const [
    personaRes,
    memoryRes,
    convoRes,
    dailyRes,
    ragRes
  ] = await Promise.allSettled(promises);

  if (input.debugMode) {
    console.log('🔧 DEBUG: Context loading results:', {
      persona: personaRes.status,
      memory: input.disableMemory ? 'skipped' : memoryRes.status,
      conversation: input.liteContext ? 'skipped' : convoRes.status,
      daily: input.disableDaily ? 'skipped' : dailyRes.status,
      rag: (input.disableRag || !input.enableRag) ? 'skipped' : ragRes.status
    });
  }

  // 2) Fail-soft ⇢ null instead of throwing
  const persona = personaRes.status === "fulfilled"
    ? personaRes.value
    : { name: "Coach", style: ["direkt", "lösungsorientiert"] };

  const memory = memoryRes.status === "fulfilled" ? memoryRes.value : null;
  const conversationSummary = convoRes.status === "fulfilled" ? convoRes.value : null;
  const daily = dailyRes.status === "fulfilled" ? dailyRes.value : null;
  const ragChunks = ragRes?.status === "fulfilled" ? ragRes.value?.chunks : null;

  // 3) Token budget enforcement (≈4 chars/token rule of thumb)
  const budget = input.tokenCap;
  const metrics = { tokensIn: 0 };

  const trim = (txt?: string | null) => {
    if (!txt) return txt;
    metrics.tokensIn += approxTokens(txt);
    return hardTrim(txt, budget);
  };

  return {
    persona,
    memory,
    daily,
    ragChunks: ragChunks?.slice(0, 6) ?? null,   // max 6 chunks
    conversationSummary: trim(conversationSummary),
    metrics
  };
}