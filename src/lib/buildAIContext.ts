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
  memory: { relationship?: string; trust?: number; summary?: string } | null;
  daily: { 
    caloriesLeft?: number; 
    lastWorkout?: string; 
    sleepHours?: number;
    currentWeight?: number;
    recentMeals?: Array<{ name: string; calories: number; protein: number; date: string }>;
    totalCaloriesToday?: number;
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
      return {
        relationship: memoryData.relationshipStage || "aufbauend",
        trust: memoryData.trustLevel || 50,
        summary: memoryData.preferences?.join(', ') || "Neuer Nutzer"
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
    
    // Get today's summary or yesterday's
    const { data: summaryData, error: summaryError } = await supabase
      .from('daily_summaries')
      .select('total_calories, workout_volume, sleep_score, summary_md')
      .eq('user_id', userId)
      .in('date', [today, yesterday])
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Get daily goals for context
    const { data: goalsData } = await supabase
      .from('daily_goals')
      .select('calories, protein')
      .eq('user_id', userId)
      .maybeSingle();
    
    // Get current weight from weight_history
    const { data: weightData } = await supabase
      .from('weight_history')
      .select('weight, date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Get recent meals (today and yesterday)
    const { data: mealsData } = await supabase
      .from('meals')
      .select('text, calories, protein, created_at')
      .eq('user_id', userId)
      .gte('created_at', yesterday + 'T00:00:00.000Z')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (summaryError) {
      console.warn('Daily summary loading failed:', summaryError.message);
    }
    
    const baseData = {
      caloriesLeft: null as number | null,
      lastWorkout: "Kein Training",
      sleepHours: null as number | null,
      currentWeight: null as number | null,
      recentMeals: [] as any[],
      totalCaloriesToday: 0
    };
    
    if (summaryData && goalsData) {
      baseData.caloriesLeft = Math.max(0, (goalsData.calories || 2000) - (summaryData.total_calories || 0));
      baseData.lastWorkout = summaryData.workout_volume > 0 ? "Training absolviert" : "Kein Training";
      baseData.sleepHours = summaryData.sleep_score ? Math.round(summaryData.sleep_score / 10 * 8) : null;
      baseData.totalCaloriesToday = summaryData.total_calories || 0;
    }
    
    if (weightData) {
      baseData.currentWeight = weightData.weight;
    }
    
    if (mealsData && mealsData.length > 0) {
      baseData.recentMeals = mealsData.map(meal => ({
        name: meal.text,
        calories: meal.calories,
        protein: meal.protein,
        date: new Date(meal.created_at).toISOString().split('T')[0]
      }));
    }
    
    return baseData;
  } catch (error) {
    console.warn('Daily summary loading exception:', error);
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