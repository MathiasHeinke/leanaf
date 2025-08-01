import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
// Enhanced Coach Chat Edge Function

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

// -------------------------------------------------------------------------
// Tool handlers - import directly to avoid module resolution issues
const trainingsplan = async (conv: any[], userId: string) => {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  return {
    role: 'assistant',
    type: 'card',
    card: 'plan',
    payload: { 
      html: `<div>
        <h3>Trainingsplan für: ${lastUserMsg}</h3>
        <p>Dein individueller Plan wird erstellt...</p>
      </div>`,
      ts: Date.now()
    }
  };
};

const uebung = async (conv: any[], userId: string) => {
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
    }
  };
};

const supplement = async (conv: any[], userId: string) => {
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
    }
  };
};

const gewicht = async (conv: any[], userId: string) => {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  const weight = parseFloat(lastUserMsg.replace(',', '.'));
  
  if (isNaN(weight)) {
    return {
      role: 'assistant',
      content: 'Bitte gib dein Gewicht als Zahl an, z. B. „80,5".',
    };
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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
};

const foto = async (images: string[], userId: string) => {
  return {
    role: 'assistant',
    type: 'card',
    card: 'meal',
    payload: { 
      html: `<div>
        <h3>📸 Bild-Analyse</h3>
        <p>Dein Bild wird analysiert...</p>
        <p>Anzahl Bilder: ${images.length}</p>
      </div>`,
      ts: Date.now()
    },
    meta: { clearTool: true }
  };
};

// Create handlers map
const handlers = { trainingsplan, uebung, supplement, gewicht, foto };
// -------------------------------------------------------------------------

// Enhanced security helpers
const securityHelpers = {
  sanitizeInput: {
    text: (input: string, maxLength: number = 10000): string => {
      if (!input || typeof input !== 'string') return '';
      return input.trim().slice(0, maxLength);
    },
    
    number: (input: any, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number => {
      const num = parseFloat(input);
      if (isNaN(num)) return min;
      return Math.max(min, Math.min(max, num));
    }
  },

  validateInput: {
    uuid: (uuid: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuid);
    },
    
    url: (url: string): boolean => {
      try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
      } catch {
        return false;
      }
    }
  },

  sanitizeErrorMessage: (error: Error | string): string => {
    const message = typeof error === 'string' ? error : error.message;
    
    const sensitivePatterns = [
      /password/gi, /token/gi, /key/gi, /secret/gi, /api[_-]?key/gi,
      /bearer/gi, /authorization/gi, /database/gi, /connection/gi, /internal/gi
    ];
    
    let sanitized = message;
    sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    
    return sanitized.slice(0, 200);
  }
};

// ============= HUMAN-LIKE COACH FEATURES =============

// Sentiment Analysis Function
const analyzeSentiment = async (text: string) => {
  if (!text || text.trim().length === 0) {
    return {
      sentiment: 'neutral',
      emotion: 'neutral',
      confidence: 0,
      intensity: 0
    };
  }

  try {
    const lowerText = text.toLowerCase();
    
    // Emotion keywords mapping
    const emotionPatterns = {
      happy: ['freue', 'glücklich', 'super', 'toll', 'fantastisch', 'klasse', 'perfekt', 'prima', 'großartig'],
      sad: ['traurig', 'deprimiert', 'niedergeschlagen', 'schlecht', 'mies', 'down'],
      angry: ['wütend', 'sauer', 'ärgerlich', 'verärgert', 'genervt', 'kotzt an'],
      frustrated: ['frustriert', 'verzweifelt', 'aufgeben', 'schaffe nicht', 'klappt nicht', 'nervt'],
      excited: ['aufgeregt', 'gespannt', 'motiviert', 'lust', 'energie', 'power'],
      anxious: ['ängstlich', 'sorge', 'unsicher', 'stress', 'nervös', 'beunruhigt'],
      motivated: ['motiviert', 'ziel', 'schaffen', 'durchziehen', 'dranbleiben', 'weiter'],
      tired: ['müde', 'erschöpft', 'kaputt', 'schlapp', 'energie los', 'ausgelaugt']
    };

    // Sentiment patterns
    const positiveWords = ['gut', 'super', 'toll', 'klasse', 'perfekt', 'prima', 'großartig', 'freue', 'glücklich', 'motiviert'];
    const negativeWords = ['schlecht', 'mies', 'traurig', 'frustriert', 'wütend', 'ärgerlich', 'stress', 'problem'];

    let detectedEmotion = 'neutral';
    let maxMatches = 0;
    let intensity = 0;

    // Find dominant emotion
    Object.entries(emotionPatterns).forEach(([emotion, patterns]) => {
      const matches = patterns.filter(pattern => lowerText.includes(pattern)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedEmotion = emotion;
        intensity = Math.min(matches / 3, 1);
      }
    });

    // Determine overall sentiment
    const positiveMatches = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeMatches = negativeWords.filter(word => lowerText.includes(word)).length;
    
    let sentiment = 'neutral';
    if (positiveMatches > negativeMatches) {
      sentiment = 'positive';
    } else if (negativeMatches > positiveMatches) {
      sentiment = 'negative';
    }

    // Calculate confidence
    const totalMatches = positiveMatches + negativeMatches + maxMatches;
    const confidence = Math.min(totalMatches / 5, 1);

    return {
      sentiment,
      emotion: detectedEmotion,
      confidence,
      intensity
    };

  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return {
      sentiment: 'neutral',
      emotion: 'neutral',
      confidence: 0,
      intensity: 0
    };
  }
};

// ============= TOKEN-DIET: SMART INTENT DETECTION =============
const detectIntent = (message: string, images: string[]): string => {
  if (images.length > 0) return 'photo_analysis';
  
  const lowerMsg = message.toLowerCase();
  
  if (/hallo|hi|guten|wie geht|hey|servus/i.test(message)) return 'smalltalk';
  if (/essen|mahlzeit|kalorien|ernährung|lucy|nahrung|diät|abnehmen/i.test(message)) return 'nutrition';
  if (/training|übung|workout|sascha|kai|markus|krafttraining|cardio|fitness/i.test(message)) return 'workout';
  if (/schlaf|müde|regeneration|dr.*vita|gesundheit|erholung/i.test(message)) return 'health';
  if (/supplement|vitamin|mineral|protein|creatin|omega/i.test(message)) return 'supplements';
  
  return 'general_advice';
};

// ============= TOKEN BUDGET MANAGER =============
const TOKEN_BUDGETS = {
  smalltalk: 6_000,
  photo_analysis: 8_000,
  nutrition: 10_000,
  workout: 10_000,
  health: 9_000,
  supplements: 8_000,
  general_advice: 12_000
};

const getTokenBudget = (intent: string): number => {
  return TOKEN_BUDGETS[intent as keyof typeof TOKEN_BUDGETS] || 12_000;
};

// ============= SMART DATA COLLECTION BY INTENT =============
const collectIntentBasedData = async (supabase: any, userId: string, intent: string) => {
  try {
    console.log(`📊 Collecting ${intent} data for user:`, userId);
    
    const basePromise = supabase.from('profiles')
      .select('id, preferred_name, first_name, last_name, display_name, email')
      .eq('id', userId)
      .maybeSingle();

    switch (intent) {
      case 'smalltalk':
        return {
          profile: (await basePromise).data,
          dataCollectionTimestamp: new Date().toISOString()
        };

      case 'nutrition':
        const [mealsData, weightData, dailyGoalsData, profileData] = await Promise.all([
          supabase.from('meal_entries')
            .select('*')
            .eq('user_id', userId)
            .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('date', { ascending: false }),
          
          supabase.from('weight_entries')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(5),
          
          supabase.from('daily_goals').select('*').eq('user_id', userId).single(),
          basePromise
        ]);

        return {
          meals: mealsData.data || [],
          weight: weightData.data || [],
          dailyGoals: dailyGoalsData.data || null,
          profile: profileData.data,
          insights: calculateNutritionInsights(mealsData.data || []),
          dataCollectionTimestamp: new Date().toISOString()
        };

      case 'photo_analysis':
        return {
          profile: (await basePromise).data,
          dataCollectionTimestamp: new Date().toISOString()
        };

      case 'workout':
        const [workoutData, weightDataWorkout, profileDataWorkout] = await Promise.all([
          supabase.from('exercise_sessions')
            .select(`*, exercise_sets (*, exercises (name, category, muscle_groups))`)
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(10),
          
          supabase.from('weight_entries')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(3),
          
          basePromise
        ]);

        return {
          workouts: workoutData.data || [],
          weight: weightDataWorkout.data || [],
          profile: profileDataWorkout.data,
          insights: calculateWorkoutInsights(workoutData.data || []),
          dataCollectionTimestamp: new Date().toISOString()
        };

      case 'health':
        const [sleepData, bodyData, profileDataHealth] = await Promise.all([
          supabase.from('sleep_entries')
            .select('*')
            .eq('user_id', userId)
            .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('date', { ascending: false }),
          
          supabase.from('body_measurements')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(3),
          
          basePromise
        ]);

        return {
          sleep: sleepData.data || [],
          bodyMeasurements: bodyData.data || [],
          profile: profileDataHealth.data,
          insights: calculateHealthInsights(sleepData.data || []),
          dataCollectionTimestamp: new Date().toISOString()
        };

      case 'supplements':
        const [supplementData, mealsDataSup, profileDataSup] = await Promise.all([
          supabase.from('supplement_intake')
            .select('*')
            .eq('user_id', userId)
            .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('date', { ascending: false }),
          
          supabase.from('meal_entries')
            .select('*')
            .eq('user_id', userId)
            .gte('date', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('date', { ascending: false }),
          
          basePromise
        ]);

        return {
          supplements: supplementData.data || [],
          meals: mealsDataSup.data || [],
          profile: profileDataSup.data,
          insights: calculateSupplementInsights(supplementData.data || []),
          dataCollectionTimestamp: new Date().toISOString()
        };

      case 'general_advice':
        const [mealsGen, weightGen, workoutsGen, sleepGen, profileGen] = await Promise.all([
          supabase.from('meal_entries')
            .select('*')
            .eq('user_id', userId)
            .gte('date', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('date', { ascending: false }),
          
          supabase.from('weight_entries')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(3),
          
          supabase.from('exercise_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(5),
          
          supabase.from('sleep_entries')
            .select('*')
            .eq('user_id', userId)
            .gte('date', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('date', { ascending: false }),
          
          basePromise
        ]);

        return {
          meals: mealsGen.data || [],
          weight: weightGen.data || [],
          workouts: workoutsGen.data || [],
          sleep: sleepGen.data || [],
          profile: profileGen.data,
          insights: calculateGeneralInsights(mealsGen.data || [], weightGen.data || []),
          dataCollectionTimestamp: new Date().toISOString()
        };

      default:
        return {
          profile: (await basePromise).data,
          dataCollectionTimestamp: new Date().toISOString()
        };
    }
  } catch (error) {
    console.error(`Error collecting ${intent} data:`, error);
    return {
      profile: null,
      dataCollectionTimestamp: new Date().toISOString()
    };
  }
};

// ============= LIGHTWEIGHT INSIGHT CALCULATORS =============
const calculateNutritionInsights = (meals: any[]) => {
  if (meals.length === 0) return {};
  
  return {
    nutrition: {
      avgCalories: meals.reduce((sum, meal) => sum + (meal.calories || 0), 0) / meals.length,
      avgProtein: meals.reduce((sum, meal) => sum + (meal.protein || 0), 0) / meals.length,
      mealFrequency: meals.length / 7
    }
  };
};

const calculateWorkoutInsights = (workouts: any[]) => {
  if (workouts.length === 0) return {};
  
  return {
    fitness: {
      workoutsPerWeek: workouts.length / 2,
      avgDuration: workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0) / workouts.length
    }
  };
};

const calculateHealthInsights = (sleep: any[]) => {
  if (sleep.length === 0) return {};
  
  return {
    recovery: {
      avgSleepHours: sleep.reduce((sum, s) => sum + (s.hours_slept || 0), 0) / sleep.length,
      avgQuality: sleep.reduce((sum, s) => sum + (s.quality_rating || 0), 0) / sleep.length
    }
  };
};

const calculateSupplementInsights = (supplements: any[]) => {
  return {
    supplements: {
      dailyCount: supplements.length / 7,
      types: [...new Set(supplements.map(s => s.supplement_name))].length
    }
  };
};

const calculateGeneralInsights = (meals: any[], weight: any[]) => {
  const insights: any = {};
  
  if (meals.length > 0) {
    insights.nutrition = {
      avgCalories: meals.reduce((sum, meal) => sum + (meal.calories || 0), 0) / meals.length
    };
  }
  
  if (weight.length > 1) {
    const sorted = weight.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    insights.weight = {
      trend: sorted[sorted.length - 1].weight - sorted[0].weight > 0 ? 'increasing' : 'decreasing'
    };
  }
  
  return insights;
};

// Calculate user insights and analytics
const calculateUserInsights = async (meals: any[], weight: any[], workouts: any[], sleep: any[]) => {
  try {
    const insights: any = {};

    // Nutrition insights
    if (meals.length > 0) {
      const recentMeals = meals.slice(0, 7); // Last 7 days
      insights.nutrition = {
        avgCalories: recentMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0) / recentMeals.length,
        avgProtein: recentMeals.reduce((sum, meal) => sum + (meal.protein || 0), 0) / recentMeals.length,
        mealFrequency: recentMeals.length / 7,
        mostEatenFoods: getMostFrequentFoods(recentMeals)
      };
    }

    // Weight insights
    if (weight.length > 1) {
      const sortedWeight = weight.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const weightChange = sortedWeight[sortedWeight.length - 1].weight - sortedWeight[0].weight;
      insights.weight = {
        trend: weightChange > 0 ? 'increasing' : weightChange < 0 ? 'decreasing' : 'stable',
        changeKg: weightChange,
        currentWeight: sortedWeight[sortedWeight.length - 1].weight
      };
    }

    // Workout insights
    if (workouts.length > 0) {
      insights.fitness = {
        workoutsPerWeek: workouts.length / 4, // Assuming 4 weeks of data
        avgDuration: workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0) / workouts.length,
        muscleGroupsFocus: getMostTrainedMuscleGroups(workouts)
      };
    }

    // Sleep insights
    if (sleep.length > 0) {
      insights.recovery = {
        avgSleepHours: sleep.reduce((sum, s) => sum + (s.hours_slept || 0), 0) / sleep.length,
        avgQuality: sleep.reduce((sum, s) => sum + (s.quality_rating || 0), 0) / sleep.length
      };
    }

    return insights;
  } catch (error) {
    console.error('Error calculating insights:', error);
    return {};
  }
};

const getMostFrequentFoods = (meals: any[]) => {
  const foodCounts = meals.reduce((counts, meal) => {
    const foodName = meal.food_name || meal.name || 'Unbekannt';
    counts[foodName] = (counts[foodName] || 0) + 1;
    return counts;
  }, {});
  
  return Object.entries(foodCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([food, count]) => ({ food, count }));
};

const getMostTrainedMuscleGroups = (workouts: any[]) => {
  const muscleCounts = workouts.reduce((counts, workout) => {
    if (workout.exercise_sets) {
      workout.exercise_sets.forEach((set: any) => {
        if (set.exercises?.muscle_groups) {
          set.exercises.muscle_groups.forEach((muscle: string) => {
            counts[muscle] = (counts[muscle] || 0) + 1;
          });
        }
      });
    }
    return counts;
  }, {});
  
  return Object.entries(muscleCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([muscle, count]) => ({ muscle, count }));
};

// ============= RAG INTEGRATION =============
// Coach ID Mapping: URL handles → Database IDs  
const mapCoachId = (urlCoachId: string): string => {
  const coachMapping = {
    'soft': 'lucy',
    'hart': 'sascha',
    'motivierend': 'kai', 
    'vita': 'dr_vita',
    'dr-vita': 'dr_vita',
    'markus': 'markus'
  };
  return coachMapping[urlCoachId as keyof typeof coachMapping] || urlCoachId;
};

const determineRAGUsage = async (message: string, coachPersonality: string) => {
  const lowerMessage = message.toLowerCase();
  
  // Map coach ID for RAG determination
  const mappedCoachId = mapCoachId(coachPersonality);
  
  // Check if message contains topics that benefit from RAG
  const ragTopics = [
    'wissenschaft', 'studie', 'forschung', 'warum', 'wie funktioniert',
    'evidenz', 'beweis', 'metabolismus', 'hormone', 'biochemie',
    'supplement', 'vitamin', 'mineral', 'nährstoff', 'makronährstoff',
    'training', 'übung', 'technik', 'form', 'biomechanik',
    'ernährung', 'diät', 'abnehmen', 'muskelaufbau', 'regeneration'
  ];
  
  const hasRAGTopic = ragTopics.some(topic => lowerMessage.includes(topic));
  const isSpecializedCoach = ['dr_vita', 'sascha', 'markus', 'kai'].includes(mappedCoachId);
  
  return hasRAGTopic || isSpecializedCoach;
};

// ============= RAG CACHING SYSTEM =============
const getCachedRAGResult = async (message: string, coachId: string) => {
  try {
    const cacheKey = `rag_cache:${coachId}:${hashQuery(message)}`;
    // TODO: Implement Redis or Supabase cache lookup
    // For now, return null to always perform fresh RAG
    return null;
  } catch (error) {
    console.error('Cache lookup error:', error);
    return null;
  }
};

const setCachedRAGResult = async (message: string, coachId: string, result: any) => {
  try {
    const cacheKey = `rag_cache:${coachId}:${hashQuery(message)}`;
    // TODO: Implement Redis or Supabase cache storage with 24h TTL
    console.log('Would cache RAG result for key:', cacheKey);
  } catch (error) {
    console.error('Cache storage error:', error);
  }
};

const hashQuery = (query: string): string => {
  // Simple hash function for cache keys
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

const performRAGSearch = async (supabase: any, message: string, coachPersonality: string, intent: string, budget: number) => {
  try {
    const mappedCoachId = mapCoachId(coachPersonality);
    console.log(`🔍 RAG search for ${intent} (budget: ${budget}):`, message.substring(0, 100));
    
    // Check cache first
    const cachedResult = await getCachedRAGResult(message, mappedCoachId);
    if (cachedResult) {
      console.log('📦 Using cached RAG result');
      return cachedResult;
    }
    
    // Adjust RAG parameters based on budget and intent
    const maxResults = intent === 'smalltalk' ? 2 : intent === 'photo_analysis' ? 1 : 3;
    const contextWindow = Math.min(budget * 0.3, 1500); // 30% of budget for RAG context
    
    const { data, error } = await supabase.functions.invoke('enhanced-coach-rag', {
      body: {
        query: message,
        coachId: mappedCoachId,
        searchMethod: 'hybrid',
        maxResults,
        contextWindow
      }
    });

    if (error) {
      console.error('RAG search error:', error);
      return null;
    }

    console.log('✅ RAG search completed:', {
      contextsFound: data?.context?.length || 0,
      totalTokens: data?.metadata?.totalTokens || 0
    });

    return data;
  } catch (error) {
    console.error('Error in RAG search:', error);
    return null;
  }
};

// Coach Memory Functions
const createDefaultMemory = () => ({
  user_preferences: [],
  conversation_context: {
    topics_discussed: [],
    mood_history: [],
    success_moments: [],
    struggles_mentioned: []
  },
  relationship_stage: 'new',
  trust_level: 0,
  communication_style_preference: 'balanced'
});

const loadCoachMemory = async (supabase: any, userId: string) => {
  try {
    const { data, error } = await supabase
      .from('coach_memory')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading coach memory:', error);
      return createDefaultMemory();
    }

    return data?.memory_data || createDefaultMemory();
  } catch (error) {
    console.error('Error in loadCoachMemory:', error);
    return createDefaultMemory();
  }
};

const saveCoachMemory = async (supabase: any, userId: string, memoryData: any) => {
  try {
    const { error } = await supabase
      .from('coach_memory')
      .upsert({
        user_id: userId,
        memory_data: memoryData,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving coach memory:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveCoachMemory:', error);
    return false;
  }
};

const updateConversationContext = async (supabase: any, userId: string, message: string, sentimentResult: any, coachMemory: any) => {
  try {
    // Add current message topic to discussed topics
    const currentTopic = extractTopic(message);
    if (currentTopic && !coachMemory.conversation_context.topics_discussed.includes(currentTopic)) {
      coachMemory.conversation_context.topics_discussed.push(currentTopic);
      
      // Keep only last 50 topics
      if (coachMemory.conversation_context.topics_discussed.length > 50) {
        coachMemory.conversation_context.topics_discussed = 
          coachMemory.conversation_context.topics_discussed.slice(-50);
      }
    }

    // Add mood entry
    if (sentimentResult.emotion !== 'neutral') {
      coachMemory.conversation_context.mood_history.push({
        timestamp: new Date().toISOString(),
        mood: sentimentResult.emotion,
        intensity: sentimentResult.intensity
      });

      // Keep only last 50 mood entries
      if (coachMemory.conversation_context.mood_history.length > 50) {
        coachMemory.conversation_context.mood_history = 
          coachMemory.conversation_context.mood_history.slice(-50);
      }
    }

    // Detect success moments
    if (detectSuccessInMessage(message)) {
      coachMemory.conversation_context.success_moments.push({
        timestamp: new Date().toISOString(),
        achievement: message.substring(0, 100),
        celebration_given: false
      });

      // Increase trust level
      coachMemory.trust_level = Math.min(100, coachMemory.trust_level + 2);
    }

    // Detect struggles
    if (detectStruggleInMessage(message)) {
      coachMemory.conversation_context.struggles_mentioned.push({
        timestamp: new Date().toISOString(),
        struggle: message.substring(0, 100),
        support_given: false
      });
    }

    // Update relationship stage
    const totalInteractions = coachMemory.conversation_context.topics_discussed.length;
    if (totalInteractions >= 50 && coachMemory.trust_level >= 80) {
      coachMemory.relationship_stage = 'close';
    } else if (totalInteractions >= 20 && coachMemory.trust_level >= 60) {
      coachMemory.relationship_stage = 'established';
    } else if (totalInteractions >= 5) {
      coachMemory.relationship_stage = 'getting_familiar';
    } else {
      coachMemory.relationship_stage = 'new';
    }

    // Save updated memory
    await saveCoachMemory(supabase, userId, coachMemory);

    return coachMemory;
  } catch (error) {
    console.error('Error updating conversation context:', error);
    return coachMemory;
  }
};

// Helper functions for context analysis
const extractTopic = (message: string) => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('essen') || lowerMessage.includes('mahlzeit') || lowerMessage.includes('kochen')) return 'nutrition';
  if (lowerMessage.includes('training') || lowerMessage.includes('sport') || lowerMessage.includes('workout')) return 'training';
  if (lowerMessage.includes('gewicht') || lowerMessage.includes('abnehmen') || lowerMessage.includes('zunehmen')) return 'weight';
  if (lowerMessage.includes('müde') || lowerMessage.includes('schlaf') || lowerMessage.includes('erholen')) return 'sleep';
  if (lowerMessage.includes('motivation') || lowerMessage.includes('durchhalten') || lowerMessage.includes('ziel')) return 'motivation';
  if (lowerMessage.includes('problem') || lowerMessage.includes('schwierig') || lowerMessage.includes('hilfe')) return 'support';
  
  return null;
};

const detectSuccessInMessage = (message: string) => {
  const successWords = ['geschafft', 'erreicht', 'erfolgreich', 'stolz', 'freue mich', 'gelungen', 'geklappt'];
  const lowerMessage = message.toLowerCase();
  return successWords.some(word => lowerMessage.includes(word));
};

const detectStruggleInMessage = (message: string) => {
  const struggleWords = ['schwer', 'schwierig', 'problem', 'schaffe nicht', 'frustriert', 'hilfe', 'verzweifelt'];
  const lowerMessage = message.toLowerCase();
  return struggleWords.some(word => lowerMessage.includes(word));
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= INTELLIGENT MODEL ROUTING =============

/**
 * chooseModel()
 * ──────────────
 * 4o  → Vision-Input  ODER kleiner Kontext (<8k Tok) ohne Heavy-Calc-Flag
 * 4.1 → alles andere (RAG-Long, JSON-Tool, komplexe Berechnungen)
 */
function chooseModel(msgs: any[], opts: {
  hasImage?: boolean,          // wurde ein Bild hochgeladen?
  heavyCalc?: boolean,         // Trainingsdaten-Crunch, RAG etc.
  isRAGQuery?: boolean         // wissenschaftliche/komplexe Fragen
}) {
  const tokenEstimate = JSON.stringify(msgs).length / 4;   // quick & dirty
  
  console.log('🧠 Model Selection:', {
    tokenEstimate: Math.round(tokenEstimate),
    hasImage: opts.hasImage,
    heavyCalc: opts.heavyCalc,
    isRAGQuery: opts.isRAGQuery
  });
  
  // 1. Bild vorhanden? → immer GPT-4o (Vision-Power)
  if (opts.hasImage) {
    console.log('📸 Using GPT-4o for image analysis');
    return 'gpt-4o';
  }
  
  // 2. Heavy-Calc oder RAG? → GPT-4.1 (bessere Reasoning)
  if (opts.heavyCalc || opts.isRAGQuery) {
    console.log('🔬 Using GPT-4.1 for heavy calculations/RAG');
    return 'gpt-4.1-2025-04-14';
  }
  
  // 3. Kleiner Kontext ohne komplexe Aufgaben? → GPT-4o (schneller, günstiger)
  if (tokenEstimate < 8_000) {
    console.log('⚡ Using GPT-4o for simple chat');
    return 'gpt-4o';
  }
  
  // 4. Großer Kontext → GPT-4.1 (besserer Context-Window)
  console.log('📚 Using GPT-4.1 for large context');
  return 'gpt-4.1-2025-04-14';
}

// RAG-Query Detection
function isRAGQuery(message: string): boolean {
  const ragPatterns = [
    /warum|why/i,
    /studie|study|studies/i,
    /evidenz|evidence/i,
    /metabolismus|metabolism/i,
    /biochemie|biochemistry/i,
    /hormone|hormones/i,
    /wissenschaft|science/i,
    /forschung|research/i,
    /wie funktioniert|how does.*work/i,
    /mechanismus|mechanism/i,
    /protein synthesis|proteinsynthese/i,
    /adaptation|anpassung/i
  ];
  
  return ragPatterns.some(pattern => pattern.test(message));
}

// Heavy-Calc Detection
function isHeavyCalc(activeTool: string | null, message: string, hasRAG: boolean): boolean {
  // Tool-basierte Heavy-Calc
  const heavyTools = ['trainingsplan', 'gewicht', 'foto'];
  if (activeTool && heavyTools.includes(activeTool)) {
    return true;
  }
  
  // Content-basierte Heavy-Calc
  const heavyPatterns = [
    /berechne|calculate/i,
    /plan|program/i,
    /analyse|analysis/i,
    /auswertung|evaluation/i,
    /statistik|statistics/i,
    /fortschritt|progress/i,
    /makros|macros/i,
    /kaloriendefizit|calorie.*deficit/i
  ];
  
  const hasHeavyContent = heavyPatterns.some(pattern => pattern.test(message));
  
  return hasRAG || hasHeavyContent;
}

// Input validation and sanitization
const sanitizeText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  return text.trim().slice(0, 10000); // Limit to 10k characters
};

const validateCoachPersonality = (personality: string): string => {
  const validPersonalities = ['motivierend', 'sachlich', 'herausfordernd', 'unterstützend', 'hart', 'soft', 'lucy', 'sascha', 'kai', 'markus', 'integral', 'dr_vita'];
  return validPersonalities.includes(personality) ? personality : 'motivierend';
};

const sanitizeUserData = (userData: any): any => {
  if (!userData || typeof userData !== 'object') return {};
  
  return {
    // Comprehensive meal data
    meals: Array.isArray(userData.meals) ? userData.meals.slice(0, 100) : [],
    fluids: Array.isArray(userData.fluids) ? userData.fluids.slice(0, 50) : [],
    supplements: Array.isArray(userData.supplements) ? userData.supplements.slice(0, 50) : [],
    
    // Physical data
    weight: Array.isArray(userData.weight) ? userData.weight.slice(0, 100) : [],
    bodyMeasurements: Array.isArray(userData.bodyMeasurements) ? userData.bodyMeasurements.slice(0, 50) : [],
    
    // Activity data
    workouts: Array.isArray(userData.workouts) ? userData.workouts.slice(0, 50) : [],
    sleep: Array.isArray(userData.sleep) ? userData.sleep.slice(0, 30) : [],
    
    // Goals and preferences
    dailyGoals: userData.dailyGoals,
    profile: userData.profile,
    
    // Analytics and insights
    insights: userData.insights || {},
    
    // Legacy support
    todaysTotals: userData.todaysTotals,
    averages: userData.averages,
    historyData: userData.historyData,
    trendData: userData.trendData,
    weightHistory: userData.weightHistory,
    sleepData: userData.sleepData,
    workoutData: userData.workoutData,
    profileData: userData.profileData,
    progressPhotos: userData.progressPhotos,
    
    dataCollectionTimestamp: userData.dataCollectionTimestamp
  };
};

function getLastTool(conv: any[]) {
  return [...conv].reverse()
    .find(m => m.role === 'system' && m.type === 'tool')?.tool ?? null;
}

serve(async (req) => {
  console.log('Enhanced Human-Like Coach chat request received at:', new Date().toISOString());
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body = await req.json();

    // -------------------------------------------------- Tool-Abzweig
    // Support both old and new request formats
    let conversation, userId;
    
    if (body.conversation && body.userId) {
      // New format
      conversation = body.conversation;
      userId = body.userId;
    } else if (body.message !== undefined) {
      // Old format - convert to conversation array
      conversation = [{
        role: 'user',
        content: body.message,
        images: body.images || [],
        created_at: new Date().toISOString(),
        coach_personality: body.coach_personality || 'motivierend'
      }];
      userId = req.headers.get('Authorization')?.replace('Bearer ', '') || null;
    } else {
      throw new Error('Invalid request format');
    }
    const lastMsg = conversation?.at(-1) || { content: '', images: [], coach_personality: 'motivierend' };

    // Wichtige Variablen früh definieren
    const coachPersonality = validateCoachPersonality(lastMsg.coach_personality || body.coach_personality || 'motivierend');
    const hasImages = lastMsg.images?.length > 0;
    
    // 🔧 TOOL-HANDLING: Prüfe ob Tool verwendet wird
    const activeTool = getLastTool(conversation);
    
    // 🖼️ BILD-HANDLING: Wenn Bilder ohne Tool → analyzeImage()
    if (!activeTool && hasImages) {
      console.log('🖼️ Images detected without tool - routing to image analysis');
      // Direkt zu Bildanalyse weiterleiten
      const imageUrls = lastMsg.images || [];
      const userMessage = lastMsg.content || '';
      
      try {
        // Route to appropriate image analysis based on classification
        const { data: classificationData, error: classifyError } = await supabase.functions.invoke('image-classifier', {
          body: { imageUrl: imageUrls[0], userId }
        });

        if (classifyError) throw classifyError;
        
        const classification = classificationData.classification;
        
        // Route to specialized analysis based on classification
        let analysisFunction = '';
        let analysisBody = {};
        
        switch (classification.category) {
          case 'exercise':
            analysisFunction = 'extract-exercise-data';
            analysisBody = { 
              userId, 
              mediaUrls: imageUrls, 
              userMessage,
              shouldSave: false 
            };
            break;
          case 'food':
            analysisFunction = 'analyze-meal';
            analysisBody = { 
              text: userMessage,
              images: imageUrls,
              userId
            };
            break;
          case 'supplement':
            analysisFunction = 'supplement-recognition';
            analysisBody = { 
              imageUrl: imageUrls[0],
              userId,
              userQuestion: userMessage
            };
            break;
          case 'body_progress':
            analysisFunction = 'body-analysis';
            analysisBody = { 
              imageUrl: imageUrls[0],
              userId,
              userMessage
            };
            break;
          default:
            // Fallback to general coach response with image
            return await handleRegularChat();
        }
        
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke(analysisFunction, {
          body: analysisBody
        });
        
        if (analysisError) throw analysisError;
        
        return new Response(JSON.stringify({
          role: 'assistant',
          content: analysisData.response || `${classification.description} - ${classification.suggestedAction}`,
          meta: { clearTool: true }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      } catch (error) {
        console.error('Image analysis failed:', error);
        // Fallback to regular chat
      }
    }
    
    // All data collection now handled by Token-Diet section below
    
    // Allow empty messages for image-only requests
    const prompt = lastMsg.content?.trim() || '(kein Text)';
    if (!prompt || prompt === '(kein Text)') {
      console.log('⚠️ Empty message detected, continuing with fallback text');
    }

    // ============= TOKEN-DIET: SMART CONTEXT MANAGEMENT =============
    console.log('🍽️ Token-Diet: Smart context management starting...');
    
    const intent = detectIntent(lastMsg.content || '', lastMsg.images || []);
    const tokenBudget = getTokenBudget(intent);
    
    console.log(`📊 Intent: ${intent}, Budget: ${tokenBudget} tokens`);

    // 1. INTENT-BASED DATA COLLECTION (Token-Diet)
    console.log(`📊 Loading ${intent}-specific data...`);
    const userData = await collectIntentBasedData(supabase, userId, intent);
    
    // 2. SENTIMENT ANALYSIS (only for non-smalltalk)
    let sentimentResult = { sentiment: 'neutral', emotion: 'neutral', confidence: 0, intensity: 0 };
    if (intent !== 'smalltalk' && intent !== 'photo_analysis') {
      sentimentResult = await analyzeSentiment(lastMsg.content || '');
      console.log('😊 Sentiment Analysis:', sentimentResult);
    }

    // 3. LOAD COACH MEMORY (compressed)
    let coachMemory = createDefaultMemory();
    if (intent !== 'smalltalk' && intent !== 'photo_analysis') {
      coachMemory = await loadCoachMemory(supabase, userId);
      console.log('🧠 Coach Memory loaded:', {
        preferences: coachMemory.user_preferences.length,
        relationship_stage: coachMemory.relationship_stage,
        trust_level: coachMemory.trust_level
      });
      
      // Update conversation context
      await updateConversationContext(supabase, userId, lastMsg.content || '', sentimentResult, coachMemory);
    }
    
    // 4. SMART HISTORY SUMMARIZATION (Token-Diet)
    console.log('📚 Processing chat history...');
    let chatHistory = [];
    if (Array.isArray(body.chatHistory)) {
      const rawHistory = body.chatHistory.slice(-20).map((msg: any) => ({
        role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
        content: sanitizeText(msg.content || '')
      })).filter(msg => msg.content);
      
      // Limit history based on intent
      const historyLimits = {
        smalltalk: 5,
        photo_analysis: 3,
        nutrition: 8,
        workout: 6,
        health: 8,
        supplements: 5,
        general_advice: 10
      };
      
      chatHistory = rawHistory.slice(-(historyLimits[intent as keyof typeof historyLimits] || 8));
      console.log(`📝 Chat history limited to ${chatHistory.length} messages for ${intent}`);
    }
    
    // Enhanced image validation using security helpers
    let images = [];
    if (Array.isArray(body.images)) {
      images = body.images.slice(0, 10).filter(url => 
        typeof url === 'string' && securityHelpers.validateInput.url(url)
      );
    }
    
// ============= NAME EXTRACTION =============
    console.log('👤 Extracting user name...');
    
    // Use centralized getDisplayName utility function
    const userName = getDisplayName(userData.profile);
    
    console.log('📛 User name extracted:', userName, {
      hasProfile: !!userData.profile,
      profileData: userData.profile ? {
        preferred_name: userData.profile.preferred_name,
        first_name: userData.profile.first_name,
        last_name: userData.profile.last_name,
        display_name: userData.profile.display_name,
        email: userData.profile.email
      } : null
    });

    // 5. SMART RAG INTEGRATION (Token-Diet with caching)
    const shouldUseRAG = await determineRAGUsage(lastMsg.content || '', coachPersonality);
    let ragContext = null;
    
    if (shouldUseRAG && intent !== 'smalltalk' && intent !== 'photo_analysis') {
      console.log('🔍 Using cached RAG for specialized knowledge...');
      ragContext = await performRAGSearch(supabase, lastMsg.content || '', coachPersonality, intent, tokenBudget);
      
      // Cache the result
      if (ragContext) {
        await setCachedRAGResult(lastMsg.content || '', mapCoachId(coachPersonality), ragContext);
      }
    }
    
    // Log security event
    try {
      await supabase.rpc('log_security_event', {
        p_user_id: userId,
        p_action: 'coach_chat_request',
        p_resource_type: 'ai_service',
        p_metadata: {
          message_length: (lastMsg.content || '').length,
          chat_history_length: chatHistory.length,
          has_images: images.length > 0,
          personality: coachPersonality,
          uses_rag: shouldUseRAG,
          data_sources: Object.keys(userData).filter(key => userData[key]?.length > 0)
        }
      });
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('Processing enhanced human-like coach chat for user:', userId);

    // Check if user has active subscription with improved logging
    let userTier = 'free';
    let subscriptionDetails = null;
    
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('subscribed, subscription_tier, subscription_end')
      .eq('user_id', userId)
      .single();
    
    if (subError && subError.code !== 'PGRST116') {
      console.error('Error checking subscription:', subError);
    }
    
    subscriptionDetails = subscriber;
    
    if (subscriber?.subscribed) {
      userTier = 'pro';
      console.log(`✅ [ENHANCED-COACH-CHAT] User ${userId} has active subscription:`, {
        tier: subscriber.subscription_tier,
        subscribed: subscriber.subscribed,
        expires: subscriber.subscription_end
      });
    } else {
      console.log(`ℹ️ [ENHANCED-COACH-CHAT] User ${userId} on free tier:`, {
        subscribed: subscriber?.subscribed || false,
        tier: subscriber?.subscription_tier || 'none'
      });
    }
    
    // For free users, check usage limits
    if (userTier === 'free') {
      const { data: usageResult, error: usageError } = await supabase.rpc('check_ai_usage_limit', {
        p_user_id: userId,
        p_feature_type: 'coach_chat'
      });
      
      if (usageError) {
        console.error('Error checking usage limit:', usageError);
        // Don't fail completely, just log the error
      }
      
      if (usageResult && !usageResult.can_use) {
        console.log('⛔ [ENHANCED-COACH-CHAT] Usage limit exceeded for user:', userId, {
          dailyCount: usageResult.daily_count,
          dailyLimit: usageResult.daily_limit,
          dailyRemaining: usageResult.daily_remaining
        });
        
        return new Response(JSON.stringify({ 
          error: 'Tägliches Limit für Coach-Chat erreicht. Upgrade zu Pro für unbegrenzte Nutzung.',
          code: 'USAGE_LIMIT_EXCEEDED',
          daily_remaining: usageResult?.daily_remaining || 0,
          monthly_remaining: usageResult?.monthly_remaining || 0,
          subscription_status: {
            tier: userTier,
            subscribed: subscriber?.subscribed || false,
            subscription_tier: subscriber?.subscription_tier || 'none'
          }
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // 6. TOKEN BUDGET VALIDATION & INTELLIGENT SHORTENING
    console.log('🧮 Checking token budget...');
    
    const memoryContext = createMemoryContext(coachMemory, sentimentResult);
    const ragPromptAddition = ragContext ? createRAGPromptAddition(ragContext) : '';
    // userName already declared above at line 1221
    const systemMessage = createEnhancedSystemMessage(coachPersonality, userData, memoryContext, ragPromptAddition, userName);
    
    let messages = [
      { role: 'system', content: systemMessage },
      ...chatHistory,
      { role: 'user', content: lastMsg.content || 'Hello' }
    ];
    
    // Estimate tokens and apply budget
    const estimatedTokens = estimateTokenCount(messages);
    console.log(`📏 Estimated tokens: ${estimatedTokens}, Budget: ${tokenBudget}`);
    
    if (estimatedTokens > tokenBudget) {
      console.log('⚠️ Token budget exceeded, applying intelligent shortening...');
      messages = await intelligentTokenShortening(messages, tokenBudget, intent, supabase);
      console.log(`✂️ Shortened to ~${estimateTokenCount(messages)} tokens`);
    }

    // Check if message contains exercise data and extract it (only for workout intent)
    if (intent === 'workout') {
      const exerciseData = await extractExerciseFromText(lastMsg.content || '');
      if (exerciseData && exerciseData.exerciseName) {
        console.log('💪 Exercise data detected:', exerciseData);
        await saveExerciseData(supabase, userId, exerciseData);
      }
    }

    // ============= INTELLIGENT MODEL SELECTION =============
    
    // 7. INTELLIGENT MODEL SELECTION (Token-Diet optimized)
    const currentTool = getLastTool(conversation);
    const isRAG = shouldUseRAG || !!ragContext;
    const hasImages = (lastMsg.images?.length || 0) > 0;
    const isHeavyCalculation = isHeavyCalc(currentTool, lastMsg.content || '', isRAG);
    
    // Choose optimal model based on context
    const selectedModel = chooseModel(messages, {
      hasImage: hasImages,
      heavyCalc: isHeavyCalculation,
      isRAGQuery: isRAG
    });
    
    console.log('🤖 Model Selection Result:', {
      selectedModel,
      reasons: {
        hasImages,
        isHeavyCalculation,
        isRAG,
        activeTool,
        messageLength: message.length
      }
    });

    console.log('🔄 Token-Diet optimized request to OpenAI...', {
      messageCount: messages.length,
      estimatedTokens: estimateTokenCount(messages),
      tokenBudget,
      intent,
      selectedModel,
      hasRAG: !!ragContext,
      dataSourcesLoaded: Object.keys(userData).filter(key => userData[key]?.length > 0)
    });

    // Add image analysis if images are provided
    if (hasImages && lastMsg.images) {
      const lastMessage = messages[messages.length - 1];
      lastMessage.content = [
        { type: 'text', text: lastMsg.content || 'Analyze this image' },
        ...lastMsg.images.map(url => ({
          type: 'image_url',
          image_url: { url }
        }))
      ];
    }

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,  // 🎯 Dynamic model selection
        messages: messages,
        max_tokens: selectedModel === 'gpt-4o' ? 800 : 1200,  // Adjust tokens based on model
        temperature: selectedModel === 'gpt-4o' ? 0.7 : 0.8,   // Slightly different temps
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
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

    console.log('✅ Token-Diet optimized response generated', {
      responseLength: reply.length,
      tokensUsed: data.usage?.total_tokens || 0,
      tokenBudget,
      intent,
      selectedModel,
      ragUsed: !!ragContext,
      tokenSavings: `~${Math.round((1 - (data.usage?.total_tokens || 0) / 15000) * 100)}%`
    });

    // Save conversation to database
    try {
      const conversationPromises = [
        supabase.from('coach_conversations').insert({
          user_id: userId,
          message_role: 'user',
          message_content: message,
          coach_personality: coachPersonality,
          context_data: {
            sentiment: sentimentResult,
            images_count: images.length,
            rag_used: !!ragContext,
            model_used: selectedModel,
            data_sources: Object.keys(userData).filter(key => userData[key]?.length > 0)
          }
        }),
        supabase.from('coach_conversations').insert({
          user_id: userId,
          message_role: 'assistant',
          message_content: reply,
          coach_personality: coachPersonality,
          context_data: {
            tokens_used: data.usage?.total_tokens || 0,
            model_used: selectedModel,
            rag_context_used: !!ragContext
          }
        })
      ];

      await Promise.all(conversationPromises);
      console.log('💾 Enhanced conversation saved to database');

    } catch (dbError) {
      console.error('Failed to save enhanced conversation:', dbError);
      // Don't fail the request if database save fails
    
    console.log('✅ Response sent successfully');
    return new Response(JSON.stringify({ 
      reply,
      metadata: {
        tokens_used: data.usage?.total_tokens || 0,
        model: selectedModel,  // 🎯 Dynamic model in response
        sentiment_detected: sentimentResult,
        rag_used: !!ragContext,
        memory_stage: coachMemory.relationship_stage,
        trust_level: coachMemory.trust_level,
        model_selection_reason: {
          hasImages,
          isHeavyCalculation,
          isRAG,
          activeTool,
          tokenEstimate: Math.round(JSON.stringify(messages).length / 4)
        },
        data_sources_available: Object.keys(userData).filter(key => userData[key]?.length > 0)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Enhanced coach chat error:', error);
    
    const sanitizedError = securityHelpers.sanitizeErrorMessage(error);
    
    return new Response(JSON.stringify({ 
      error: 'Fehler beim Generieren der Coach-Antwort', 
      details: sanitizedError 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
