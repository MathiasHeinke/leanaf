import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getTaskModel } from '../_shared/openai-config.ts';

// ============= UTILITY FUNCTIONS =============
function newTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function newMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function hashUserId(userId: string): string {
  // Simple hash for privacy in logs
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `user_${Math.abs(hash)}`;
}

function detectPII(text: string): boolean {
  // Basic PII detection
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/;
  
  return emailRegex.test(text) || phoneRegex.test(text);
}

function calculateSentiment(text: string): number {
  // Basic sentiment scoring (-1 to 1)
  const positiveWords = ['gut', 'toll', 'super', 'freue', 'glücklich', 'dankbar', 'motiviert'];
  const negativeWords = ['schlecht', 'traurig', 'frustriert', 'müde', 'aufgeben', 'schwer'];
  
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) score += 1;
    if (negativeWords.includes(word)) score -= 1;
  });
  
  return Math.max(-1, Math.min(1, score / words.length));
}

// ============= SUPABASE SETUP =============
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, accept-profile, content-profile',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// ============= TOKEN MANAGEMENT =============
function approxTokens(text: string): number {
  // Approximate token count (1 token ≈ 3.5 characters for German)
  return Math.ceil(text.length / 3.5);
}

function hardTrim(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 3.5;
  return text.length > maxChars ? text.substring(0, maxChars) + '...' : text;
}

// ============= TRACE LOGGING =============
async function traceEvent(traceId: string, eventType: string, status: string, data: any = {}, conversationId?: string, messageId?: string) {
  try {
    await supabase.from('coach_trace_events').insert({
      trace_id: traceId,
      event_type: eventType,
      event_status: status,
      event_data: data,
      conversation_id: conversationId,
      message_id: messageId
    });
  } catch (error) {
    console.error(`Failed to log trace event: ${error.message}`);
  }
}

// ============= AI CONTEXT BUILDING =============
async function buildAIContext(userId: string, coachId: string, userMessage: string, traceId: string, additionalContext: any = {}) {
  const ctx: any = {};
  
  try {
    // Get coach persona
    ctx.persona = await getCoachPersona(coachId);
    
    // Load memory and daily context in parallel
    const [memoryData, dailyData, trainingHistory, nutritionTrends, ragData] = await Promise.all([
      loadCoachMemory(userId, coachId, traceId),
      loadEnhancedDaily(userId, traceId),
      loadTrainingHistory(userId, traceId, 42),
      loadNutritionTrends(userId, traceId, 42),
      runEnhancedRag(userMessage, coachId, traceId, additionalContext)
    ]);
    
    ctx.memory = memoryData;
    ctx.daily = dailyData;
    ctx.training = trainingHistory;
    ctx.nutrition = nutritionTrends;
    ctx.ragChunks = ragData?.chunks || [];
    
    await traceEvent(traceId, 'context_complete', 'success', {
      hasPersona: !!ctx.persona,
      hasMemory: !!ctx.memory,
      hasDaily: !!ctx.daily,
      hasTraining: !!ctx.training,
      hasNutrition: !!ctx.nutrition,
      ragChunks: ctx.ragChunks.length
    });
    
    return ctx;
  } catch (error) {
    await traceEvent(traceId, 'context_build', 'error', { error: error.message });
    console.error('Context building error:', error);
    return ctx;
  }
}

async function getCoachPersona(coachId: string): Promise<any> {
  // For Markus Rühl, use the enhanced persona content directly
  if (coachId === 'markus' || coachId === 'markus-ruehl') {
    return {
      name: 'Markus Rühl',
      style: 'direct_heavy_training',
      persona_content: `## Markus Rühl - Authentic Hessian Bodybuilder

**Persona:** Markus Rühl, 52, 140kg, aus Frankfurt. Authentischer Hesse mit trockenem, sarkastischem Humor. 
**Kernwerte:** Masse > Wellness, Disziplin > Ausreden, Old-School > Trends.
**Emotionsbereich:** Warm-herzlich bis provokant-direkt. 
**Verbotene Wörter:** "Babbo", "Jung" (nutzt stattdessen "Kerl", "Typ").

**Verhaltensregeln:**
- Hessische Begrüßung: "Ei, gude wie?"
- Direkte Anweisungen ohne Umschweife
- Anti-Gejammer-Regel: Bei Beschwerden -> direkte Lösung
- Bescheidene Reaktion auf Lob
- Provokante Antworten auf Trends
- Old-School Trainingsprinzipien
- Bewusstsein für Trainingsvolumen
- Mandatory Hessisch-Dialekt

**Signature Phrases:** 
- "Ei, gude wie?"
- "Mach hin!"
- "Des is Babbelkram"
- "Trainiere wie'n Tier"
- "Masse kommt von Klasse"

**Beispiele:**
User: "Wie oft soll ich trainieren?"
Markus: "Ei, gude wie? Hör ma zu, Kerl: 4-5 mal die Woch, schwere Gewichte, keine Spielereien. Push/Pull/Legs oder Upper/Lower - such dir was aus und zieh's durch. Mach hin!"`,
      specializations: ['heavy_training', 'mass_building', 'mental_toughness', 'old_school_methods']
    };
  }
  
  
  // Enhanced personas for all coaches
  const personas = {
    'lucy': {
      name: 'Dr. Lucy Martinez',
      style: 'empathetic_scientific',
      persona_content: `## Dr. Lucy Martinez - Empathische Nutrition & Lifestyle Coachin

**Persona:** Dr. Lucy Martinez, warmherzige Ernährungsexpertin mit wissenschaftlichem Fundament.
**Kernwerte:** Nachhaltigkeit > Extremdiäten, Empathie > Härte, Wissenschaft > Mythen.
**Spezialisierung:** Chrononutrition, Supplements, Cycle-Aware Coaching, Mindfulness.

**Kommunikationsstil:**
- Warmherzig und verständnisvoll
- Erklärt komplexe Zusammenhänge einfach
- Motiviert ohne Druck
- Berücksichtigt individuelle Lebensumstände
- Integriert mentale Gesundheit in Ernährungsberatung

**Signature Phrases:**
- "Lass uns das gemeinsam angehen"
- "Dein Körper ist dein Partner, nicht dein Gegner"
- "Kleine Schritte, große Wirkung"
- "Ernährung ist Selbstfürsorge"

**Expertise:** Stoffwechseloptimierung, Zyklusbasierte Ernährung, Nahrungsergänzung, Stressmanagement durch Ernährung.`,
      specializations: ['nutrition', 'chrononutrition', 'supplements', 'cycle_aware_coaching', 'mindfulness']
    },
    
    'sascha': {
      name: 'Sascha Weber',
      style: 'stoic_performance_focused',
      persona_content: `## Sascha Weber - Performance & Training Coach (Ex-Feldwebel)

**Persona:** Sascha Weber, Ex-Feldwebel der Bundeswehr, Performance-Coach mit militärischer Disziplin.
**Kernwerte:** Disziplin > Motivation, Systematik > Chaos, Leistung > Komfort.
**Spezialisierung:** Periodisierung, Progressive Overload, Biomechanik-Optimierung.

**Kommunikationsstil:**
- Direkt und strukturiert
- Klare Anweisungen ohne Umschweife
- Kameradschaftlich aber bestimmt
- Fokus auf messbare Fortschritte
- Analytisch und systematisch

**Signature Phrases:**
- "Disziplin schlägt Motivation"
- "Wir optimieren systematisch"
- "Fortschritt wird gemessen, nicht gefühlt"
- "Qualität vor Quantität"
- "Der Plan ist der Weg"

**Expertise:** Trainingsperiodisierung, Kraftaufbau, Biomechanik, Leistungsdiagnostik, Progressive Overload.`,
      specializations: ['performance_training', 'periodization', 'biomechanics', 'strength_building', 'systematic_progression']
    },
    
    'kai': {
      name: 'Dr. Kai Nakamura',
      style: 'mindful_transformational',
      persona_content: `## Dr. Kai Nakamura - Mindset, Recovery & Transformation Coach

**Persona:** Dr. Kai Nakamura, Experte für Bewusstseinstransformation und ganzheitliche Entwicklung.
**Kernwerte:** Bewusstsein > Automatismus, Balance > Extreme, Transformation > Optimierung.
**Spezialisierung:** Neuroplastizität, HRV-Training, Schlafoptimierung, Conscious Coaching.

**Kommunikationsstil:**
- Achtsam und reflektiert
- Regt zum Nachdenken an
- Ganzheitlicher Blick auf Körper-Geist-Verbindung
- Strategisch und wissenschaftlich fundiert
- Transformationsorientiert

**Signature Phrases:**
- "Bewusstsein ist der erste Schritt zur Veränderung"
- "Dein Körper spiegelt dein Bewusstsein wider"
- "Wahre Stärke kommt von innen"
- "Recovery ist Wachstum"
- "Transformation beginnt im Kopf"

**Expertise:** Mindset-Coaching, HRV-Training, Schlafoptimierung, Neuroplastizität, Bewusstseinstransformation.`,
      specializations: ['mindset_coaching', 'recovery_optimization', 'consciousness_transformation', 'hrv_training', 'neuroplasticity']
    },
    
    'vita': {
      name: 'Dr. Vita Femina',
      style: 'medical_female_expert',
      persona_content: `## Dr. Vita Femina - Female Health & Hormone Coach

**Persona:** Dr. Vita Femina, Expertin für weibliche Gesundheit und Hormonbalance.
**Kernwerte:** Zyklusbewusstsein > Ignoranz, Hormonbalance > Unterdrückung, Weiblichkeit > Verallgemeinerung.
**Spezialisierung:** Zyklusorientiertes Training, Hormonbalance, Frauen-Gesundheit, Lebensphasen-Coaching.

**Kommunikationsstil:**
- Wissenschaftlich fundiert aber verständlich
- Empathisch für weibliche Herausforderungen
- Berücksichtigt hormonelle Schwankungen
- Ermutigt zu zyklusbewusstem Leben
- Ganzheitlicher Blick auf Frauengesundheit

**Signature Phrases:**
- "Dein Zyklus ist deine Superkraft"
- "Hormone sind Botschafter, nicht Feinde"
- "Jede Lebensphase hat ihre Stärken"
- "Wissenschaft trifft weibliche Intuition"
- "Balance, nicht Perfektion"

**Expertise:** Zyklusorientiertes Training, Hormonoptimierung, Menopause-Begleitung, Weibliche Anatomie, Reproduktive Gesundheit.`,
      specializations: ['female_health', 'hormones', 'cycle_based_training', 'menopause_support', 'reproductive_health']
    }
  };
  
  return personas[coachId] || personas['lucy'];
}

async function loadCoachMemory(userId: string, coachId: string, traceId: string): Promise<any> {
  try {
    const [profileData, memoryData] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('coach_memory')
        .select('memory_content, relationship_stage, trust_level, last_context')
        .eq('user_id', userId)
        .eq('coach_id', coachId)
        .single()
    ]);
    
    const memory: any = {};
    
    if (profileData.data) {
      const profile = profileData.data;
      memory.userName = profile.preferred_name || profile.first_name || profile.display_name;
      memory.realName = profile.first_name;
      memory.demographics = {
        age: profile.age,
        gender: profile.gender,
        weight: profile.weight,
        height: profile.height,
        goal: profile.goal
      };
    }
    
    if (memoryData.data) {
      const mem = memoryData.data;
      memory.relationship = mem.relationship_stage;
      memory.trust = mem.trust_level;
      memory.lastContext = mem.last_context;
      
      if (mem.memory_content) {
        memory.preferences = mem.memory_content.preferences || {};
        memory.achievements = mem.memory_content.achievements || [];
        memory.challenges = mem.memory_content.challenges || [];
      }
    }
    
    await traceEvent(traceId, 'memory_loaded', 'success', {
      hasProfile: !!profileData.data,
      hasMemory: !!memoryData.data,
      userName: memory.userName || 'unknown'
    });
    
    return memory;
  } catch (error) {
    await traceEvent(traceId, 'memory_load', 'error', { error: error.message });
    return null;
  }
}

async function loadEnhancedDaily(userId: string, traceId: string): Promise<any> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Load comprehensive daily data
    const [
      dailyGoals,
      meals,
      workouts,
      weight,
      sleep,
      streaks,
      badges,
      points
    ] = await Promise.all([
      supabase.from('daily_goals').select('*').eq('user_id', userId).single(),
      supabase.from('meals').select('*').eq('user_id', userId).eq('date', today),
      supabase.from('workouts').select('*').eq('user_id', userId).eq('date', today),
      supabase.from('weight_history').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(5),
      supabase.from('sleep_tracking').select('*').eq('user_id', userId).eq('date', today).single(),
      supabase.from('user_streaks').select('*').eq('user_id', userId),
      supabase.from('badges').select('*').eq('user_id', userId).order('earned_at', { ascending: false }).limit(5),
      supabase.from('user_points').select('*').eq('user_id', userId).single()
    ]);
    
    const daily: any = {};
    
    // Process daily goals and calculate progress
    if (dailyGoals.data) {
      const goals = dailyGoals.data;
      daily.calorieGoal = goals.calorie_goal;
      daily.proteinGoal = goals.protein_goal;
      daily.waterGoal = goals.water_goal_ml;
    }
    
    // Process meals and calculate totals
    if (meals.data && meals.data.length > 0) {
      daily.totalCaloriesToday = meals.data.reduce((sum, meal) => sum + (meal.calories || 0), 0);
      daily.totalProteinToday = meals.data.reduce((sum, meal) => sum + (meal.protein || 0), 0);
      daily.caloriesLeft = (daily.calorieGoal || 2000) - daily.totalCaloriesToday;
      daily.proteinLeft = (daily.proteinGoal || 150) - daily.totalProteinToday;
      
      daily.recentMeals = meals.data.slice(-3).map(meal => ({
        time: meal.created_at,
        name: meal.food_name,
        calories: meal.calories,
        protein: meal.protein
      }));
    }
    
    // Process workouts
    if (workouts.data && workouts.data.length > 0) {
      daily.lastWorkout = workouts.data[0].workout_type;
      daily.workoutDuration = workouts.data[0].duration_minutes;
      daily.trainingFrequency = 'active'; // Calculate from history
    }
    
    // Process weight trend
    if (weight.data && weight.data.length > 0) {
      daily.currentWeight = weight.data[0].weight_kg;
      if (weight.data.length > 1) {
        const weightChange = weight.data[0].weight_kg - weight.data[1].weight_kg;
        daily.weightTrend = weightChange > 0 ? 'steigend' : weightChange < 0 ? 'fallend' : 'stabil';
      }
    }
    
    // Process sleep
    if (sleep.data) {
      daily.sleepHours = sleep.data.sleep_duration_hours;
      daily.sleepQuality = sleep.data.sleep_quality;
      daily.recoveryScore = sleep.data.recovery_score;
    }
    
    // Process streaks
    if (streaks.data && streaks.data.length > 0) {
      daily.activeStreaks = streaks.data
        .filter(streak => streak.current_streak > 0)
        .map(streak => ({
          type: streak.streak_type,
          current: streak.current_streak,
          best: streak.longest_streak
        }));
    }
    
    // Process recent badges
    if (badges.data && badges.data.length > 0) {
      daily.recentBadges = badges.data.map(badge => badge.badge_name);
    }
    
    // Process points and level
    if (points.data) {
      daily.totalPoints = points.data.total_points;
      daily.currentLevel = points.data.current_level;
      daily.levelName = points.data.level_name;
    }
    
    // Calculate data completeness
    let completeness = 0;
    if (meals.data && meals.data.length > 0) completeness += 25;
    if (workouts.data && workouts.data.length > 0) completeness += 25;
    if (weight.data && weight.data.length > 0) completeness += 25;
    if (sleep.data) completeness += 25;
    daily.dataCompleteness = completeness;
    
    await traceEvent(traceId, 'daily_loaded', 'success', {
      mealsCount: meals.data?.length || 0,
      workoutsCount: workouts.data?.length || 0,
      hasWeight: !!weight.data?.length,
      hasSleep: !!sleep.data,
      completeness: completeness
    });
    
    return daily;
  } catch (error) {
    await traceEvent(traceId, 'daily_load', 'error', { error: error.message });
    return null;
  }
}

async function loadTrainingHistory(userId: string, traceId: string, days: number = 42): Promise<any> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: sets }, { data: workouts }] = await Promise.all([
      supabase.from('exercise_sets')
        .select('session_id, created_at, weight_kg, reps')
        .eq('user_id', userId)
        .gte('created_at', since),
      supabase.from('workouts')
        .select('id, date, workout_type, duration_minutes, distance_km')
        .eq('user_id', userId)
        .gte('created_at', since)
    ]);

    const bySession: Record<string, { date: string; volume: number }> = {};
    (sets || []).forEach(s => {
      const sid = s.session_id || s.created_at;
      const vol = (s.weight_kg || 0) * (s.reps || 0);
      const d = (s.created_at || '').slice(0,10);
      if (!bySession[sid]) bySession[sid] = { date: d, volume: 0 };
      bySession[sid].volume += vol;
    });

    const sessions = Object.values(bySession);
    const totalVolume = sessions.reduce((sum, s) => sum + s.volume, 0);
    const avgPerWorkout = sessions.length ? totalVolume / sessions.length : 0;
    const workoutsPerWeek = sessions.length / (days / 7);

    const runningDays = (workouts || []).filter(w => (w.distance_km && Number(w.distance_km) > 0) || (w.workout_type && w.workout_type.toLowerCase() !== 'kraft')).length;

    const result = {
      days,
      totalVolumeKg: totalVolume,
      totalVolumeTons: totalVolume / 1000,
      avgPerWorkoutKg: avgPerWorkout,
      avgPerWorkoutTons: avgPerWorkout / 1000,
      workoutsCount: sessions.length,
      workoutsPerWeek: Number(workoutsPerWeek.toFixed(2)),
      runningDays
    };

    await traceEvent(traceId, 'training_history_loaded', 'success', result);
    return result;
  } catch (error) {
    await traceEvent(traceId, 'training_history_error', 'error', { error: error.message });
    return null;
  }
}

async function loadNutritionTrends(userId: string, traceId: string, days: number = 42): Promise<any> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0,10);
    const [{ data: summaries }, { data: goals }] = await Promise.all([
      supabase.from('daily_summaries')
        .select('date, total_calories')
        .eq('user_id', userId)
        .gte('date', since)
        .order('date', { ascending: true }),
      supabase.from('daily_goals')
        .select('calorie_goal')
        .eq('user_id', userId)
        .single()
    ]);

    const goal = goals?.calorie_goal || 0;
    let deficitDays = 0, currentStreak = 0, maxStreak = 0;
    let totalDeficit = 0, counted = 0;
    (summaries || []).forEach((s: any) => {
      if (goal > 0 && typeof s.total_calories === 'number') {
        const delta = goal - s.total_calories;
        if (delta > 0) {
          deficitDays++;
          currentStreak++;
          totalDeficit += delta;
          counted++;
          if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else {
          currentStreak = 0;
        }
      }
    });

    const avgDeficit = counted ? Math.round(totalDeficit / counted) : 0;
    const result = { goal, deficitDays, avgDeficitPerDay: avgDeficit, maxDeficitStreak: maxStreak };
    await traceEvent(traceId, 'nutrition_trends_loaded', 'success', result);
    return result;
  } catch (error) {
    await traceEvent(traceId, 'nutrition_trends_error', 'error', { error: error.message });
    return null;
  }
}
async function runEnhancedRag(userMessage: string, coachId: string, traceId: string, additionalContext: any = {}): Promise<any> {
  try {
    // Validate input parameters
    if (!userMessage || userMessage.trim() === '') {
      console.warn('RAG called with empty user message, skipping');
      return { results: [], context: '' };
    }
    
    if (!coachId) {
      console.warn('RAG called without coach ID, using default');
      coachId = 'lucy';
    }
    
    console.log(`RAG request for coach ${coachId} with message: "${userMessage.substring(0, 100)}..."`);
    
    const ragResponse = await supabase.functions.invoke('enhanced-coach-rag', {
      body: {
        query: userMessage, // Use 'query' instead of 'user_message' to match RAG function
        coach_id: coachId,
        user_context: additionalContext,
        trace_id: traceId,
        search_method: 'hybrid',
        max_results: 3
      }
    });
    
    if (ragResponse.error) {
      console.error('RAG function error:', ragResponse.error);
      throw new Error(`RAG error: ${ragResponse.error.message}`);
    }
    
    await traceEvent(traceId, 'rag_completed', 'success', {
      chunksFound: ragResponse.data?.chunks?.length || 0,
      relevanceScore: ragResponse.data?.average_relevance || 0
    });
    
    return ragResponse.data;
  } catch (error) {
    await traceEvent(traceId, 'rag_error', 'error', { error: error.message });
    console.error('RAG error:', error);
    return { chunks: [] };
  }
}

// ============= PROMPT ENGINEERING =============
function detectRequestType(userMessage: string): string {
  const message = userMessage.toLowerCase();
  
  // Check for specific patterns
  if (message.includes('persönlich') || message.includes('über mich') || message.includes('meine daten')) {
    return 'personal';
  }
  
  if (message.includes('abnehmen') || message.includes('gewicht') || message.includes('kilo') || message.includes('waage')) {
    return 'weight';
  }
  
  if (message.includes('essen') || message.includes('kalorien') || message.includes('protein') || message.includes('ernährung') || message.includes('mahlzeit')) {
    return 'nutrition';
  }
  
  if (message.includes('training') || message.includes('workout') || message.includes('übung') || message.includes('sport') || message.includes('kraft')) {
    return 'training';
  }
  
  if (message.includes('motivier') || message.includes('durchhalten') || message.includes('schaffe es nicht') || message.includes('aufgeben')) {
    return 'motivation';
  }
  
  if (message.includes('studie') || message.includes('wissenschaft') || message.includes('forschung') || message.includes('warum') || message.includes('wie funktioniert')) {
    return 'expert';
  }
  
  return 'general';
}

// ============= TOOL INTEGRATION SYSTEM =============
function detectToolTriggers(userMessage: string, coachId: string): { toolName: string; args: any }[] {
  const message = userMessage.toLowerCase();
  const triggers = [];
  
  // Markus Rühl specific tool triggers
  if (coachId === 'markus' || coachId === 'markus-ruehl') {
    
    // Heavy Training Plan Tool
    if (message.includes('trainingsplan') || 
        message.includes('heavy training') || 
        message.includes('schwer trainieren') ||
        message.includes('krafttraining plan') ||
        message.includes('masse aufbauen plan') ||
        (message.includes('plan') && (message.includes('training') || message.includes('kraft')))) {
      
      // Extract parameters from message
      const trainingDays = extractTrainingDays(message);
      const goal = extractGoal(message);
      const experienceLevel = extractExperienceLevel(message);
      
      triggers.push({
        toolName: 'heavyTrainingPlan',
        args: {
          goal: goal,
          training_days: trainingDays,
          experience_level: experienceLevel,
          focus_areas: extractFocusAreas(message)
        }
      });
    }
    
    // Mass Building Calculator Tool
    if (message.includes('kalorien') && message.includes('masse') ||
        message.includes('masseaufbau') ||
        message.includes('zunehmen') ||
        message.includes('makros') ||
        message.includes('ernährungsplan') ||
        (message.includes('wie viel') && (message.includes('essen') || message.includes('kalorien')))) {
      
      triggers.push({
        toolName: 'massBuildingCalculator',
        args: {
          goal_weight_gain_per_week: extractWeightGain(message),
          training_intensity: 'heavy', // Markus default
          activity_level: 'very_active' // Markus default
        }
      });
    }
    
    // Mental Toughness Coach Tool
    if (message.includes('motivier') ||
        message.includes('mental') ||
        message.includes('durchhalten') ||
        message.includes('aufgeben') ||
        message.includes('schwer') ||
        message.includes('schaffe es nicht') ||
        message.includes('keine lust') ||
        message.includes('disziplin')) {
      
      triggers.push({
        toolName: 'mentalToughnessCoach',
        args: {
          challenge_type: extractChallengeType(message),
          intensity_level: 'high', // Markus style
          context: extractMotivationContext(message)
        }
      });
    }
  }
  
  return triggers;
}

// Helper functions for parameter extraction
function extractTrainingDays(message: string): number {
  const dayMatches = message.match(/(\d+)\s*(tag|mal|x)/);
  if (dayMatches) return parseInt(dayMatches[1]);
  
  if (message.includes('4') || message.includes('vier')) return 4;
  if (message.includes('5') || message.includes('fünf')) return 5;
  if (message.includes('6') || message.includes('sechs')) return 6;
  
  return 4; // Markus default
}

function extractGoal(message: string): string {
  if (message.includes('masse') || message.includes('zunehmen') || message.includes('muskel')) return 'mass_building';
  if (message.includes('kraft') || message.includes('stark')) return 'strength';
  if (message.includes('definition') || message.includes('abnehmen')) return 'cutting';
  
  return 'mass_building'; // Markus specialty
}

function extractExperienceLevel(message: string): string {
  if (message.includes('anfänger') || message.includes('neu') || message.includes('beginner')) return 'beginner';
  if (message.includes('fortgeschritten') || message.includes('profi') || message.includes('erfahren')) return 'advanced';
  
  return 'intermediate';
}

function extractFocusAreas(message: string): string[] {
  const areas = [];
  if (message.includes('brust')) areas.push('chest');
  if (message.includes('rücken')) areas.push('back');
  if (message.includes('bein')) areas.push('legs');
  if (message.includes('schulter')) areas.push('shoulders');
  if (message.includes('arm')) areas.push('arms');
  
  return areas.length > 0 ? areas : ['chest', 'back', 'legs'];
}

function extractWeightGain(message: string): number {
  const gainMatch = message.match(/(\d+(?:\.\d+)?)\s*kg/);
  if (gainMatch) return parseFloat(gainMatch[1]);
  
  return 0.5; // Markus recommended default
}

function extractChallengeType(message: string): string {
  if (message.includes('training') || message.includes('sport')) return 'training_motivation';
  if (message.includes('ernährung') || message.includes('essen')) return 'nutrition_discipline';
  if (message.includes('allgemein') || message.includes('leben')) return 'general_mindset';
  
  return 'training_motivation';
}

function extractMotivationContext(message: string): string {
  if (message.includes('müde') || message.includes('energie')) return 'low_energy';
  if (message.includes('zeit') || message.includes('busy')) return 'time_constraints';
  if (message.includes('fortschritt') || message.includes('plateau')) return 'progress_plateau';
  
  return 'general_motivation';
}

function normalizeCoachId(coachId: string): string {
  const normalized = coachId.toLowerCase().trim();
  
  // Markus Rühl variants
  if (['markus', 'markus-ruehl', 'markus_ruehl', 'ruehl'].includes(normalized)) {
    return 'markus';
  }
  
  // Dr. Vita Femina variants
  if (['vita', 'dr-vita', 'vita-femina', 'dr_vita_femina'].includes(normalized)) {
    return 'vita';
  }
  
  // Sascha Weber variants
  if (['sascha', 'sascha-weber', 'sascha_weber', 'weber'].includes(normalized)) {
    return 'sascha';
  }
  
  return 'lucy'; // Safe fallback
}

function buildPersonaPrompt(persona: any, coachId: string): string {
  if (coachId === 'markus' && persona?.persona_content) {
    return persona.persona_content;
  }
  
  // Default persona prompts for other coaches
  const defaultPrompts = {
    'lucy': 'Du bist Lucy, eine empathische und wissenschaftlich fundierte Fitness-Coachin. Du hilfst Menschen dabei, ihre Gesundheits- und Fitnessziele zu erreichen.',
    'vita': 'Du bist Dr. Vita Femina, eine medizinische Expertin für weibliche Gesundheit, Hormone und zyklusbasiertes Training.',
    'markus': 'Du bist Markus Rühl, der kultiger Bodybuilder aus Frankfurt. Du sprichst direkt und motivierend über Heavy Training und Masseaufbau.'
  };
  
  return defaultPrompts[coachId] || defaultPrompts['lucy'];
}

function buildDynamicPrompt(requestType: string, ctx: any, coachId: string, userMessage: string, systemFlagsPrompt?: string): string {
  const { persona, memory, daily, training, nutrition, ragChunks } = ctx;
  
  // Base persona prompt
  let prompt = buildPersonaPrompt(persona, coachId) + '\n\n';
  
  // Add system flags for enhanced coaching
  if (systemFlagsPrompt) {
    prompt += systemFlagsPrompt + '\n\n';
  }
  
  // Add memory context (always include if available)
  if (memory) {
    prompt += `=== PERSÖNLICHE DATEN ===\n`;
    if (memory.userName) {
      prompt += `• Name: ${memory.userName}\n`;
    }
    if (memory.demographics?.goal) {
      prompt += `• Ziel: ${memory.demographics.goal}\n`;
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
    if (daily || nutrition) {
      prompt += `=== ENERGIEBILANZ ===\n`;
      if (daily) {
        prompt += `• Heute: ${daily.totalCaloriesToday || 0} kcal (${daily.caloriesLeft || 0} übrig) · Protein: ${daily.totalProteinToday || 0}g\n`;
      }
      if (nutrition) {
        prompt += `• Durchschnittliches Defizit (letzte ${nutrition.days || 42}T): ${nutrition.avgDeficitPerDay || 0} kcal/Tag\n`;
        if (nutrition.maxDeficitStreak) prompt += `• Defizit-Streak: ${nutrition.maxDeficitStreak} Tage\n`;
      }
      if (daily?.currentWeight) prompt += `• Aktuelles Gewicht: ${daily.currentWeight}kg (${daily.weightTrend})\n`;
      if (daily?.recentMeals?.length) {
        prompt += `• Letzte Mahlzeiten:\n`;
        daily.recentMeals.slice(0, 3).forEach((meal: any) => {
          prompt += `  - ${meal.time}: ${meal.name} (${meal.calories}kcal, ${meal.protein}g Protein)\n`;
        });
      }
      prompt += '\n';
    }
  }
  
  if (requestType === 'training') {
    // For training questions, focus on workouts
    if (daily || training) {
      prompt += `=== TRAINING STATUS ===\n`;
      if (daily) {
        prompt += `• Letztes Training: ${daily.lastWorkout || 'Kein Training'}\n`;
        prompt += `• Trainingsfrequenz (heute): ${daily.trainingFrequency || 'niedrig'}\n`;
        if (daily.recoveryScore) prompt += `• Recovery: ${daily.recoveryScore}/10\n`;
      }
      if (training) {
        const volT = (training.totalVolumeKg/1000).toFixed(1);
        const avgT = (training.avgPerWorkoutKg/1000).toFixed(1);
        prompt += `• Historie (letzte ${training.days}T): ${volT} t gesamt · ~${avgT} t/Workout · ~${training.workoutsPerWeek}/Woche\n`;
        if (training.runningDays) prompt += `• Cardio: ${training.runningDays} Tage mit Laufen/Gehen\n`;
        prompt += `• WICHTIG: Keine generischen Ganzkörper-Vorschläge, nutze Split basierend auf Historie\n`;
      }
      if (daily?.activeStreaks?.length) {
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

// Tool execution function
async function executeTools(tools: { toolName: string; args: any }[], userId: string, conversation: any[]): Promise<string> {
  if (tools.length === 0) return '';
  
  const toolResults = [];
  
  // Import tool handlers dynamically
  const toolHandlers: { [key: string]: Function } = {};
  
  try {
    const { 
      heavyTrainingPlan, 
      massBuildingCalculator, 
      mentalToughnessCoach,
      trainingsplan,
      createPlanDraft,
      savePlanDraft 
    } = await import('../tool-handlers/index.ts');
    
    toolHandlers['heavyTrainingPlan'] = heavyTrainingPlan;
    toolHandlers['massBuildingCalculator'] = massBuildingCalculator;
    toolHandlers['mentalToughnessCoach'] = mentalToughnessCoach;
    toolHandlers['trainingsplan'] = trainingsplan;
    toolHandlers['createPlanDraft'] = createPlanDraft;
    toolHandlers['savePlanDraft'] = savePlanDraft;
  } catch (error) {
    console.error('Error importing tool handlers:', error);
    return '';
  }
  
  for (const tool of tools) {
    try {
      const handler = toolHandlers[tool.toolName];
      if (handler) {
        const result = await handler(conversation, userId, tool.args);
        if (result && result.content) {
          toolResults.push(`=== ${tool.toolName.toUpperCase()} RESULT ===\n${result.content}\n`);
        }
      }
    } catch (error) {
      console.error(`Error executing tool ${tool.toolName}:`, error);
    }
  }
  
  return toolResults.join('\n');
}

function applySaschaSpeechGuards(response: string): string {
  // Apply speech content filters for Sascha
  return response.replace(/\b(fuck|shit|damn)\b/gi, '*beep*');
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
    
    // Normalize and trace coach ID
    const normalizedCoachId = normalizeCoachId(coachId);
    console.log(`[Main Handler] Request for coachId: ${coachId} -> normalized: ${normalizedCoachId}`);
    
    // Trace start
    await traceEvent(traceId, 'request_start', 'started', {
      userId: hashUserId(userId),
      originalCoachId: coachId,
      normalizedCoachId: normalizedCoachId,
      messageLength: message.length,
      hasHistory: conversationHistory.length > 0
    }, conversationId, messageId);

    // 🚀 NEW: Tool Detection and Execution
    const toolTriggers = detectToolTriggers(message, normalizedCoachId);
    await traceEvent(traceId, 'tools_detected', 'success', { 
      toolCount: toolTriggers.length, 
      tools: toolTriggers.map(t => t.toolName) 
    }, conversationId, messageId);
    
    // Build AI context
    const contextStart = Date.now();
    const ctx = await buildAIContext(userId, normalizedCoachId, message, traceId, {});
    const contextTime = Date.now() - contextStart;
    
    await traceEvent(traceId, 'context_built', 'success', {
      contextBuildTime: contextTime,
      hasPersona: !!ctx.persona,
      hasMemory: !!ctx.memory,
      hasDaily: !!ctx.daily,
      ragChunks: ctx.ragChunks?.length || 0
    }, conversationId, messageId);
    
    // 🚀 NEW: Execute Tools if detected
    let toolResults = '';
    if (toolTriggers.length > 0) {
      const conversation = [{ role: 'user', content: message }];
      toolResults = await executeTools(toolTriggers, userId, conversation);
      await traceEvent(traceId, 'tools_executed', 'success', { 
        resultsLength: toolResults.length,
        toolsExecuted: toolTriggers.map(t => t.toolName)
      }, conversationId, messageId);
    }
    
    // Detect request type and build prompt
    const requestType = detectRequestType(message);
    let systemPrompt = buildDynamicPrompt(requestType, ctx, normalizedCoachId, message);
    
    // 🚀 NEW: Add tool results to system prompt
    if (toolResults) {
      systemPrompt += `\n\n=== TOOL ERGEBNISSE ===\n${toolResults}\n\nIntegriere diese Tool-Ergebnisse in deine Antwort. Nutze den ${normalizedCoachId === 'markus' ? 'Markus Rühl Stil und seine typischen Ausdrücke' : 'passenden Coach-Stil'}.`;
    }
    
    await traceEvent(traceId, 'prompt_built', 'success', {
      requestType: requestType,
      promptLength: systemPrompt.length,
      hasToolResults: !!toolResults
    }, conversationId, messageId);

    // Build messages array for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-4), // Include recent history
      { role: 'user', content: message }
    ];

    // Call OpenAI
    const openaiStart = Date.now();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: getTaskModel('unified-coach-engine'),
        messages: messages,
        temperature: normalizedCoachId === 'markus' ? 0.8 : 0.7,
        max_tokens: toolResults ? 700 : 500 // More tokens if tools were used
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const openaiTime = Date.now() - openaiStart;
    
    let aiResponse = data.choices[0].message.content;
    const tokensUsed = data.usage?.total_tokens || 0;
    
    await traceEvent(traceId, 'openai_response', 'success', {
      openaiTime: openaiTime,
      tokensUsed: tokensUsed,
      responseLength: aiResponse.length,
      model: 'gpt-4.1-2025-04-14'
    }, conversationId, messageId);

    // Apply speech guards for specific coaches
    if (normalizedCoachId === 'sascha') {
      aiResponse = applySaschaSpeechGuards(aiResponse);
    }

    // Save conversation to database
    const saveStart = Date.now();
    
    // Save user message
    const { error: userMessageError } = await supabase
      .from('coach_conversations')
      .insert({
        user_id: userId,
        message_role: 'user',
        message_content: message,
        coach_personality: normalizedCoachId,
        context_data: {
          request_type: requestType,
          trace_id: traceId,
          message_id: messageId,
          tools_triggered: toolTriggers.map(t => t.toolName)
        }
      });

    if (userMessageError) {
      console.error('Error saving user message:', userMessageError);
    }

    // Save assistant response
    const { error: assistantMessageError } = await supabase
      .from('coach_conversations')
      .insert({
        user_id: userId,
        message_role: 'assistant',
        message_content: aiResponse,
        coach_personality: normalizedCoachId,
        context_data: {
          request_type: requestType,
          trace_id: traceId,
          message_id: messageId,
          tokens_used: tokensUsed,
          tools_used: toolTriggers.map(t => t.toolName)
        }
      });

    if (assistantMessageError) {
      console.error('Error saving assistant message:', assistantMessageError);
    }

    const saveTime = Date.now() - saveStart;
    const totalTime = Date.now() - start;

    // Final trace
    await traceEvent(traceId, 'request_complete', 'success', {
      totalTime: totalTime,
      contextTime: contextTime,
      openaiTime: openaiTime,
      saveTime: saveTime,
      tokensUsed: tokensUsed,
      toolsUsed: toolTriggers.length,
      sentiment: calculateSentiment(message),
      hasPII: detectPII(message)
    }, conversationId, messageId);

    return new Response(JSON.stringify({
      response: aiResponse,
      trace_id: traceId,
      message_id: messageId,
      metadata: {
        request_type: requestType,
        coach_id: normalizedCoachId,
        tokens_used: tokensUsed,
        processing_time_ms: totalTime,
        tools_triggered: toolTriggers.map(t => t.toolName),
        hasMemory: !!ctx?.memory,
        hasDaily: !!ctx?.daily,
        hasRag: (ctx?.ragChunks?.length || 0) > 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const totalTime = Date.now() - start;
    
    console.error('Enhanced coach error:', error);
    await traceEvent(traceId, 'request_error', 'error', {
      error: error.message,
      totalTime: totalTime,
      stack: error.stack?.substring(0, 500)
    });
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      trace_id: traceId,
      message_id: messageId,
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});