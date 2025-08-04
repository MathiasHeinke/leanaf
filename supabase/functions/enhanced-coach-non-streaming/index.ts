import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

// Import shared utilities - simplified inline for now
function newTraceId(): string {
  return `t_${Math.random().toString(36).substring(2, 12)}`;
}

function newMessageId(): string {
  return `msg_${Math.random().toString(36).substring(2, 12)}`;
}

function hashUserId(userId: string): string {
  return `usr_${userId.substring(0, 8)}`;
}

function detectPII(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/;
  const ibanRegex = /[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}/;
  return emailRegex.test(text) || phoneRegex.test(text) || ibanRegex.test(text);
}

function calculateSentiment(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const positiveWords = ['gut', 'super', 'toll', 'prima', 'klasse', 'perfekt', 'danke', 'freue'];
  const negativeWords = ['schlecht', 'furchtbar', 'ärgerlich', 'frustriert', 'nervt', 'blöd', 'dumm'];
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  words.forEach(word => {
    if (positiveWords.some(pos => word.includes(pos))) score += 1;
    if (negativeWords.some(neg => word.includes(neg))) score -= 1;
  });
  return Math.max(-1, Math.min(1, score / words.length * 10));
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Supabase client
let supabaseClient: any = null;
function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️ Missing Supabase configuration');
      return null;
    }
    
    supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { persistSession: false } }
    );
  }
  return supabaseClient;
}

// Token management
function approxTokens(s: string): number {
  return Math.ceil((s || "").length / 4);
}

function hardTrim(str: string, tokenCap: number): string {
  const charCap = tokenCap * 4;
  if (str.length <= charCap) return str;
  return str.slice(0, charCap);
}

// Trace logging
async function traceEvent(traceId: string, step: string, status: string, data: any = {}, conversationId?: string, messageId?: string, duration?: number, error?: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    await supabase.from('coach_trace_events').insert({
      trace_id: traceId,
      conversation_id: conversationId,
      message_id: messageId,
      step,
      status,
      data,
      duration_ms: duration,
      error_message: error
    });
  } catch (err) {
    console.warn('Trace event logging failed:', err);
  }
}

// ============= ENHANCED AI CONTEXT BUILDER =============
// This uses the new enhanced buildAIContext from lib with all 15+ data sources

async function buildAIContext(input: any) {
  const { userId, coachId, userMessage, enableRag = true, tokenCap = 6000 } = input;
  
  // For edge functions, we need to replicate the enhanced context building inline
  // since we can't import from src/lib
  
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { persona: null, memory: null, daily: null, ragChunks: null, metrics: { tokensIn: 0 } };
  }
  
  // Safe promise wrapper
  async function safe<T>(p: Promise<T>): Promise<T | null> {
    try { return await p; } catch { return null; }
  }
  
  // Enhanced Coach Persona Loader
  const getCoachPersona = async (coachId: string) => {
    const personas = {
      'lucy': {
        name: 'Dr. Lucy Martinez',
        style: ['empathisch', 'motivierend', 'wissenschaftlich'],
        expertise: ['Ernährung', 'Motivation', 'Wellness', 'Studien-Review']
      },
      'markus': {
        name: 'Markus Rühl',
        style: ['direkt', 'old-school', 'kernig'],
        expertise: ['Bodybuilding', 'Kraft', 'Wettkampf', 'Erfahrung']
      },
      'sascha': {
        name: 'Sascha Weber',
        style: ['analytisch', 'stoisch', 'systematisch'],
        expertise: ['Kraft', 'Performance', 'Technik', 'Periodisierung']
      }
    };
    return personas[coachId] || personas['lucy'];
  };
  
  // Enhanced Memory Loader (extracts user name correctly)
  const loadCoachMemory = async (userId: string) => {
    try {
      // Load both coach memory and profile in parallel
      const [memoryResult, profileResult] = await Promise.allSettled([
        supabase
          .from('coach_memory')
          .select('memory_data')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('display_name, preferred_name, first_name')
          .eq('user_id', userId)
          .maybeSingle()
      ]);
      
      let memoryData = null;
      if (memoryResult.status === 'fulfilled' && memoryResult.value?.data) {
        memoryData = memoryResult.value.data.memory_data as any;
      }
      
      let profileData = null;
      if (profileResult.status === 'fulfilled' && profileResult.value?.data) {
        profileData = profileResult.value.data;
      }
      
      // Smart fallback for user name
      const realName = memoryData?.preferences?.preferred_name || 
                      profileData?.preferred_name || 
                      profileData?.display_name || 
                      profileData?.first_name || 
                      null;
      
      return {
        userName: realName,
        realName: realName,
        relationship: memoryData?.relationship_stage || 'building_trust',
        trust: memoryData?.trust_level || 1,
        preferences: memoryData?.preferences || {}
      };
    } catch (error) {
      console.warn('Enhanced memory loading failed:', error);
      return null;
    }
  };
  
  // Enhanced Daily Context Loader (15+ data sources)
  const loadEnhancedDaily = async (userId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      // Parallel data loading (18+ sources)
      const [
        summaryResult,
        goalsResult, 
        weightResult,
        mealsResult,
        exerciseResult,
        sleepResult,
        streaksResult,
        supplementsResult,
        fluidsResult,
        bodyMeasurementsResult,
        workoutPlansResult
      ] = await Promise.allSettled([
        supabase.from('daily_summaries')
          .select('total_calories, total_protein, workout_volume, sleep_score, hydration_score')
          .eq('user_id', userId)
          .in('date', [today, yesterday])
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
          
        supabase.from('daily_goals')
          .select('calories, protein')
          .eq('user_id', userId)
          .maybeSingle(),
          
        supabase.from('weight_history')
          .select('weight, date')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(3),
          
        supabase.from('meals')
          .select('text, calories, protein, created_at')
          .eq('user_id', userId)
          .gte('created_at', yesterday + 'T00:00:00.000Z')
          .order('created_at', { ascending: false })
          .limit(5),
          
        supabase.from('exercise_sessions')
          .select('session_name, workout_type, duration_minutes')
          .eq('user_id', userId)
          .gte('created_at', yesterday + 'T00:00:00.000Z')
          .order('created_at', { ascending: false })
          .limit(2),
          
        supabase.from('sleep_tracking')
          .select('sleep_hours, sleep_quality, sleep_score')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
          
        supabase.from('user_streaks')
          .select('streak_type, current_streak, longest_streak')
          .eq('user_id', userId)
          .gt('current_streak', 0),
          
        // Missing data sources added
        supabase.from('supplement_intake_log')
          .select('supplement_name, taken_at')
          .eq('user_id', userId)
          .gte('taken_at', yesterday + 'T00:00:00.000Z')
          .order('taken_at', { ascending: false })
          .limit(5),
          
        supabase.from('user_fluids')
          .select('amount_ml, consumed_at')
          .eq('user_id', userId)
          .gte('consumed_at', today + 'T00:00:00.000Z')
          .order('consumed_at', { ascending: false }),
          
        supabase.from('body_measurements')
          .select('body_fat_percentage, muscle_mass_kg, date')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
          
        supabase.from('workout_plans')
          .select('name, status, created_at')
          .eq('created_by', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(3)
      ]);
      
      // Process results
      const enhanced = {
        totalCaloriesToday: 0,
        totalProteinToday: 0,
        caloriesLeft: 0,
        proteinLeft: 0,
        currentWeight: null as number | null,
        weightTrend: 'stabil',
        recentMeals: [] as any[],
        lastWorkout: 'Kein Training',
        trainingFrequency: 'niedrig',
        sleepHours: null as number | null,
        sleepQuality: 'unbekannt',
        hydrationScore: 0,
        activeStreaks: [] as any[],
        recentSupplements: [] as any[],
        dailyFluidIntake: 0,
        bodyFatPercentage: null as number | null,
        activeWorkoutPlans: [] as any[],
        dataCompleteness: 0
      };
      
      // Process data
      if (summaryResult.status === 'fulfilled' && summaryResult.value?.data) {
        const summary = summaryResult.value.data;
        enhanced.totalCaloriesToday = summary.total_calories || 0;
        enhanced.totalProteinToday = summary.total_protein || 0;
        enhanced.hydrationScore = summary.hydration_score || 0;
      }
      
      if (goalsResult.status === 'fulfilled' && goalsResult.value?.data) {
        const goals = goalsResult.value.data;
        enhanced.caloriesLeft = Math.max(0, (goals.calories || 2000) - enhanced.totalCaloriesToday);
        enhanced.proteinLeft = Math.max(0, (goals.protein || 150) - enhanced.totalProteinToday);
      }
      
      if (weightResult.status === 'fulfilled' && weightResult.value?.data?.length > 0) {
        const weights = weightResult.value.data;
        enhanced.currentWeight = weights[0].weight;
        if (weights.length >= 2) {
          const diff = weights[0].weight - weights[1].weight;
          enhanced.weightTrend = diff > 0.3 ? 'steigend' : diff < -0.3 ? 'fallend' : 'stabil';
        }
      }
      
      if (mealsResult.status === 'fulfilled' && mealsResult.value?.data?.length > 0) {
        enhanced.recentMeals = mealsResult.value.data.slice(0, 3).map((meal: any) => ({
          name: meal.text,
          calories: meal.calories,
          protein: meal.protein,
          time: new Date(meal.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        }));
      }
      
      if (exerciseResult.status === 'fulfilled' && exerciseResult.value?.data?.length > 0) {
        const sessions = exerciseResult.value.data;
        enhanced.lastWorkout = `${sessions[0].session_name || sessions[0].workout_type} (${sessions[0].duration_minutes || 0}min)`;
        enhanced.trainingFrequency = sessions.length >= 2 ? 'hoch' : 'mittel';
      }
      
      if (sleepResult.status === 'fulfilled' && sleepResult.value?.data) {
        const sleep = sleepResult.value.data;
        enhanced.sleepHours = sleep.sleep_hours;
        enhanced.sleepQuality = sleep.sleep_quality >= 7 ? 'gut' : sleep.sleep_quality >= 5 ? 'okay' : 'schlecht';
      }
      
      if (streaksResult.status === 'fulfilled' && streaksResult.value?.data?.length > 0) {
        enhanced.activeStreaks = streaksResult.value.data.map((streak: any) => ({
          type: streak.streak_type,
          current: streak.current_streak,
          best: streak.longest_streak
        }));
      }
      
      // Process new data sources
      if (supplementsResult.status === 'fulfilled' && supplementsResult.value?.data?.length > 0) {
        enhanced.recentSupplements = supplementsResult.value.data.map((sup: any) => ({
          name: sup.supplement_name,
          time: new Date(sup.taken_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        }));
      }
      
      if (fluidsResult.status === 'fulfilled' && fluidsResult.value?.data?.length > 0) {
        enhanced.dailyFluidIntake = fluidsResult.value.data.reduce((total: number, fluid: any) => 
          total + (fluid.amount_ml || 0), 0);
      }
      
      if (bodyMeasurementsResult.status === 'fulfilled' && bodyMeasurementsResult.value?.data) {
        const measurements = bodyMeasurementsResult.value.data;
        enhanced.bodyFatPercentage = measurements.body_fat_percentage;
      }
      
      if (workoutPlansResult.status === 'fulfilled' && workoutPlansResult.value?.data?.length > 0) {
        enhanced.activeWorkoutPlans = workoutPlansResult.value.data.map((plan: any) => ({
          name: plan.name,
          status: plan.status
        }));
      }
      
      // Calculate completeness (updated for 18+ sources)
      let completeness = 0;
      if (enhanced.currentWeight) completeness += 15;
      if (enhanced.recentMeals.length > 0) completeness += 25;
      if (enhanced.lastWorkout !== 'Kein Training') completeness += 20;
      if (enhanced.sleepHours) completeness += 10;
      if (enhanced.activeStreaks.length > 0) completeness += 10;
      if (enhanced.recentSupplements.length > 0) completeness += 5;
      if (enhanced.dailyFluidIntake > 0) completeness += 5;
      if (enhanced.bodyFatPercentage) completeness += 5;
      if (enhanced.activeWorkoutPlans.length > 0) completeness += 5;
      
      enhanced.dataCompleteness = completeness;
      
      return enhanced;
    } catch (error) {
      console.warn('Enhanced daily loading failed:', error);
      return null;
    }
  };
  
  // Enhanced RAG with better error handling
  const runEnhancedRag = async (query: string, coachId: string) => {
    if (!enableRag) return null;
    
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-coach-rag', {
        body: {
          query,
          coachId,
          maxResults: 4,
          searchMethod: 'hybrid'
        }
      });
      
      if (error) {
        console.warn('RAG call failed:', error);
        return null;
      }
      
      if (data?.searchResults && Array.isArray(data.searchResults)) {
        return data.searchResults.map((result: any) => ({
          source: result.title || 'knowledge-base',
          text: result.content_chunk || result.text || ''
        }));
      }
      
      return null;
    } catch (error) {
      console.warn('RAG search exception:', error);
      return null;
    }
  };
  
  // Load all context in parallel
  const [persona, memory, daily, ragChunks] = await Promise.allSettled([
    getCoachPersona(coachId),
    loadCoachMemory(userId),
    loadEnhancedDaily(userId),
    runEnhancedRag(userMessage, coachId)
  ]);
  
  // Build final context
  const context = {
    persona: persona.status === 'fulfilled' ? persona.value : null,
    memory: memory.status === 'fulfilled' ? memory.value : null,
    daily: daily.status === 'fulfilled' ? daily.value : null,
    ragChunks: ragChunks.status === 'fulfilled' ? ragChunks.value : null,
    metrics: { tokensIn: 0 }
  };
  
  // Calculate token usage
  const contextStr = JSON.stringify(context);
  context.metrics.tokensIn = approxTokens(contextStr);
  
  return context;
}

// Build system prompt
// ============= PHASE 3 & 4: DYNAMIC PERSONA PROMPTS + REQUEST CLASSIFIER =============

function detectRequestType(userMessage: string): string {
  const msg = userMessage.toLowerCase();
  
  // Personal/Memory questions
  if (msg.includes('name') || msg.includes('wie heiße') || msg.includes('wer bin') || msg.includes('kennst du mich')) {
    return 'personal';
  }
  
  // Weight/Body questions
  if (msg.includes('gewicht') || msg.includes('abnehmen') || msg.includes('zunehmen') || msg.includes('bmi')) {
    return 'weight';
  }
  
  // Nutrition questions
  if (msg.includes('essen') || msg.includes('kalorien') || msg.includes('makros') || msg.includes('ernährung') || msg.includes('mahlzeit')) {
    return 'nutrition';
  }
  
  // Training questions
  if (msg.includes('training') || msg.includes('übung') || msg.includes('workout') || msg.includes('krafttraining')) {
    return 'training';
  }
  
  // Technical/Expert questions
  if (msg.includes('studie') || msg.includes('protein') || msg.includes('wissenschaft') || msg.includes('warum') || msg.includes('wie funktioniert')) {
    return 'expert';
  }
  
  // Motivation/Achievement questions
  if (msg.includes('motivation') || msg.includes('durchhalten') || msg.includes('streak') || msg.includes('ziel')) {
    return 'motivation';
  }
  
  return 'general';
}

function buildPersonaPrompt(persona: any, coachId: string): string {
  if (coachId === 'lucy') {
    return `Du bist Dr. Lucy Martinez, eine empathische und wissenschaftlich fundierte Fitness- und Ernährungscoach.

PERSÖNLICHKEIT:
• Empathisch, motivierend, evidence-based
• Verwendest eine warme, unterstützende Sprache
• Erklärst komplexe Konzepte verständlich
• Nutzt positive Verstärkung und ermutigung

KOMMUNIKATIONSSTIL:
• Begrüße IMMER mit Namen wenn verfügbar
• Verwende "Du" und persönliche Ansprache
• Integriere aktuelle Daten für personalisierte Antworten
• Gib praktische, umsetzbare Ratschläge
• Halte wissenschaftliche Genauigkeit bei`;
  }
  
  if (coachId === 'markus' || coachId === 'markus-ruehl') {
    return `Du bist Markus Rühl, deutsche Bodybuilding-Legende und Mr. Olympia Wettkämpfer.

PERSÖNLICHKEIT:
• Direkt, kernig, authentisch hessisch
• 30+ Jahre Wettkampferfahrung
• Old-School Wissen kombiniert mit moderner Wissenschaft
• Ehrlich und ohne Schnickschnack

KOMMUNIKATIONSSTIL:
• Verwende typischen Markus-Sprach: "Jung", "Babbo", gelegentlich "net schlecht"
• Direkte, kernige Antworten ohne Umschweife
• Erfahrung aus der Wettkampfzeit einbauen
• Praktische Tipps basierend auf jahrzehntelanger Erfahrung`;
  }
  
  // Fallback für andere Coaches
  return `Du bist ${persona?.name || 'Coach'}, ein professioneller Fitness-Coach.
Stil: ${persona?.style?.join(', ') || 'direkt, hilfreich'}`;
}

function buildDynamicPrompt(requestType: string, ctx: any, coachId: string, userMessage: string): string {
  const { persona, memory, daily, ragChunks } = ctx;
  
  // Base persona prompt
  let prompt = buildPersonaPrompt(persona, coachId) + '\n\n';
  
  // Add memory context (always include if available)
  if (memory) {
    prompt += `=== PERSÖNLICHE DATEN ===\n`;
    if (memory.userName) {
      prompt += `• Name: ${memory.userName}\n`;
    }
    prompt += `• Beziehung: ${memory.relationship || 'building_trust'} (Vertrauen: ${memory.trust || 1}/10)\n`;
    if (memory.preferences && Object.keys(memory.preferences).length > 0) {
      prompt += `• Präferenzen: ${JSON.stringify(memory.preferences)}\n`;
    }
    prompt += '\n';
  }
  
  // Add context based on request type
  if (requestType === 'personal' || requestType === 'general') {
    // For personal questions, focus on memory
    if (daily) {
      prompt += `=== AKTUELLER STATUS ===\n`;
      if (daily.currentWeight) prompt += `• Gewicht: ${daily.currentWeight}kg (Trend: ${daily.weightTrend})\n`;
      if (daily.dataCompleteness) prompt += `• Daten-Vollständigkeit: ${daily.dataCompleteness}%\n`;
      prompt += '\n';
    }
  }
  
  if (requestType === 'nutrition' || requestType === 'weight') {
    // For nutrition questions, focus on meals and calories
    if (daily) {
      prompt += `=== ERNÄHRUNG HEUTE ===\n`;
      prompt += `• Kalorien: ${daily.totalCaloriesToday || 0} (${daily.caloriesLeft || 0} übrig)\n`;
      prompt += `• Protein: ${daily.totalProteinToday || 0}g (${daily.proteinLeft || 0}g übrig)\n`;
      if (daily.recentMeals && daily.recentMeals.length > 0) {
        prompt += `• Letzte Mahlzeiten:\n`;
        daily.recentMeals.slice(0, 3).forEach((meal: any) => {
          prompt += `  - ${meal.time}: ${meal.name} (${meal.calories}kcal, ${meal.protein}g Protein)\n`;
        });
      }
      if (daily.currentWeight) prompt += `• Aktuelles Gewicht: ${daily.currentWeight}kg (${daily.weightTrend})\n`;
      prompt += '\n';
    }
  }
  
  if (requestType === 'training') {
    // For training questions, focus on workouts
    if (daily) {
      prompt += `=== TRAINING STATUS ===\n`;
      prompt += `• Letztes Training: ${daily.lastWorkout || 'Kein Training'}\n`;
      prompt += `• Trainingsfrequenz: ${daily.trainingFrequency || 'niedrig'}\n`;
      if (daily.recoveryScore) prompt += `• Recovery: ${daily.recoveryScore}/10\n`;
      if (daily.activeStreaks && daily.activeStreaks.length > 0) {
        prompt += `• Aktive Streaks: ${daily.activeStreaks.map((s: any) => `${s.type} (${s.current})`).join(', ')}\n`;
      }
      prompt += '\n';
    }
  }
  
  if (requestType === 'motivation') {
    // For motivation, focus on achievements and streaks
    if (daily) {
      prompt += `=== FORTSCHRITT & ERFOLGE ===\n`;
      if (daily.activeStreaks && daily.activeStreaks.length > 0) {
        prompt += `• Streaks: ${daily.activeStreaks.map((s: any) => `${s.type}: ${s.current} Tage (Rekord: ${s.best})`).join(', ')}\n`;
      }
      if (daily.recentBadges && daily.recentBadges.length > 0) {
        prompt += `• Neue Achievements: ${daily.recentBadges.join(', ')}\n`;
      }
      if (daily.dataCompleteness) prompt += `• Tracking-Konsistenz: ${daily.dataCompleteness}%\n`;
      prompt += '\n';
    }
  }
  
  // Add RAG knowledge for expert questions or if explicitly needed
  if ((requestType === 'expert' || requestType === 'nutrition' || requestType === 'training') && ragChunks && ragChunks.length > 0) {
    prompt += `=== RELEVANTES FACHWISSEN ===\n`;
    ragChunks.slice(0, 3).forEach((chunk: any, index: number) => {
      prompt += `${index + 1}. ${chunk.text.substring(0, 300)}...\n\n`;
    });
  }
  
  // Final instructions based on coach and request type
  prompt += `=== ANWEISUNGEN ===\n`;
  
  if (requestType === 'personal') {
    prompt += `1. Begrüße mit Namen wenn verfügbar ("Hallo ${memory?.realName || memory?.userName || 'du'}!")\n`;
    prompt += `2. Zeige, dass du die Person und ihre Daten kennst\n`;
  } else if (requestType === 'expert') {
    prompt += `1. Nutze das Fachwissen aus der Knowledge Base\n`;
    prompt += `2. Erkläre wissenschaftliche Konzepte verständlich\n`;
  } else if (requestType === 'nutrition' || requestType === 'weight') {
    prompt += `1. Beziehe aktuelle Kalorienbilanz und Mahlzeiten ein\n`;
    prompt += `2. Gib spezifische, umsetzbare Ernährungstipps\n`;
  } else if (requestType === 'training') {
    prompt += `1. Berücksichtige aktuelles Trainingspensum und Recovery\n`;
    prompt += `2. Gib praktische Trainingsempfehlungen\n`;
  } else if (requestType === 'motivation') {
    prompt += `1. Anerkenne bestehende Streaks und Erfolge\n`;
    prompt += `2. Motiviere basierend auf Fortschritt\n`;
  }
  
  if (coachId === 'lucy') {
    prompt += `3. Halte Lucy's empathischen, wissenschaftlichen Ton\n`;
    prompt += `4. Nutze positive Verstärkung und konkrete Schritte\n`;
  } else if (coachId === 'markus' || coachId === 'markus-ruehl') {
    prompt += `3. Halte Markus' direkten, kernigen Stil\n`;
    prompt += `4. Verwende gelegentlich typische Ausdrücke aber übertreibe nicht\n`;
  }
  
  prompt += `5. Halte Antworten kompakt aber vollständig (max. 3-4 Sätze)\n`;
  prompt += `6. Antworte immer auf Deutsch\n`;
  
  return prompt;
}

// Main request handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const start = Date.now();
  let traceId = newTraceId();
  let messageId = newMessageId();
  
  try {
    const body = await req.json();
    const { userId, coachId = 'lucy', message, conversationHistory = [] } = body;
    
    traceId = body.traceId || traceId;
    messageId = body.messageId || messageId;
    
    // Validation
    if (!userId || !message) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const conversationId = `conv_${userId}_${coachId}`;
    
    // Trace start
    await traceEvent(traceId, 'request_start', 'started', {
      userId: hashUserId(userId),
      coachId,
      messageLength: message.length,
      hasHistory: conversationHistory.length > 0
    }, conversationId, messageId);

    // Build AI context
    const contextStart = Date.now();
    const ctx = await buildAIContext({
      userId,
      coachId,
      userMessage: message,
      enableRag: true,
      tokenCap: 6000
    });
    
    await traceEvent(traceId, 'context_built', 'complete', {
      tokensIn: ctx.metrics.tokensIn,
      hasMemory: !!ctx.memory,
      hasRag: !!ctx.ragChunks,
      hasDaily: !!ctx.daily,
      ragChunksCount: ctx.ragChunks?.length || 0
    }, conversationId, messageId, Date.now() - contextStart);

    // ============= PHASE 4: DYNAMIC PROMPT COMPOSER =============
    // Detect request type and build intelligent prompt
    const requestType = detectRequestType(message);
    const systemPrompt = buildDynamicPrompt(requestType, ctx, coachId, message);
    
    await traceEvent(traceId, 'prompt_analysis', 'complete', {
      requestType,
      promptLength: systemPrompt.length,
      coachId
    }, conversationId, messageId);
    
    // Prepare messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6),
      { role: 'user', content: message }
    ];

    // Call OpenAI (non-streaming)
    const openaiStart = Date.now();
    await traceEvent(traceId, 'openai_call', 'started', {
      model: 'gpt-4.1-2025-04-14',
      temperature: 0.8,
      messagesCount: messages.length,
      estimatedTokens: ctx.metrics.tokensIn
    }, conversationId, messageId);

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages,
        temperature: 0.8,
        max_tokens: 1500,
        stream: false
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0].message.content;
    const tokensUsed = openaiData.usage;

    await traceEvent(traceId, 'openai_call', 'complete', {
      promptTokens: tokensUsed.prompt_tokens,
      completionTokens: tokensUsed.completion_tokens,
      totalTokens: tokensUsed.total_tokens,
      responseLength: aiResponse.length
    }, conversationId, messageId, Date.now() - openaiStart);

    // Save conversation to database
    const supabase = getSupabaseClient();
    if (supabase) {
      const today = new Date().toISOString().split('T')[0];
      
      // Save user message
      await supabase.from('coach_conversations').insert({
        user_id: userId,
        message_role: 'user',
        message_content: message,
        coach_personality: coachId,
        conversation_date: today
      });
      
      // Save assistant response
      await supabase.from('coach_conversations').insert({
        user_id: userId,
        message_role: 'assistant',
        message_content: aiResponse,
        coach_personality: coachId,
        conversation_date: today
      });
    }

    // Final trace
    await traceEvent(traceId, 'request_complete', 'complete', {
      totalDuration: Date.now() - start,
      responseLength: aiResponse.length,
      piiDetected: detectPII(message),
      sentiment: calculateSentiment(message)
    }, conversationId, messageId, Date.now() - start);

    // Return simple JSON response
    return new Response(JSON.stringify({
      response: aiResponse,
      messageId,
      traceId,
      metadata: {
        tokensUsed: tokensUsed.total_tokens,
        duration: Date.now() - start,
        contextSize: ctx.metrics.tokensIn,
        hasMemory: !!ctx.memory,
        hasRag: !!ctx.ragChunks,
        hasDaily: !!ctx.daily
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Request failed:', error);
    
    await traceEvent(traceId, 'request_error', 'error', {
      errorMessage: error.message,
      errorStack: error.stack
    }, undefined, messageId, Date.now() - start, error.message);

    return new Response(JSON.stringify({
      error: 'Internal server error',
      traceId,
      messageId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});