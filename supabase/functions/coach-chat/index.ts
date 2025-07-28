import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

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

// ============= MAIN REQUEST HANDLER =============

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation and sanitization
const sanitizeText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  return text.trim().slice(0, 10000); // Limit to 10k characters
};

const validateCoachPersonality = (personality: string): string => {
  const validPersonalities = ['motivierend', 'sachlich', 'herausfordernd', 'unterstützend', 'hart', 'soft', 'lucy', 'sascha', 'kai', 'markus', 'integral', 'dr_vita'];
  return validPersonalities.includes(personality) ? personality : 'motivierend';
};

// ============= COMPREHENSIVE DATA COLLECTION =============
const collectComprehensiveUserData = async (supabase: any, userId: string) => {
  try {
    console.log('📊 Collecting comprehensive data for user:', userId);
    
    // Parallel data collection for efficiency
    const [
      mealsData,
      fluidData,
      weightData,
      sleepData,
      bodyMeasurementsData,
      workoutData,
      supplementData,
      dailyGoalsData,
      profileData
    ] = await Promise.all([
      // Meals (last 30 days)
      supabase.from('meal_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false }),
      
      // Fluid intake (last 30 days)
      supabase.from('fluid_intake')
        .select('*')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false }),
      
      // Weight history (last 90 days)
      supabase.from('weight_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false }),
      
      // Sleep data (last 30 days)
      supabase.from('sleep_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false }),
      
      // Body measurements (last 90 days)
      supabase.from('body_measurements')
        .select('*')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false }),
      
      // Workout data (last 30 days)
      supabase.from('exercise_sessions')
        .select(`
          *,
          exercise_sets (
            *,
            exercises (name, category, muscle_groups)
          )
        `)
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false }),
      
      // Supplement intake (last 30 days)
      supabase.from('supplement_intake')
        .select('*')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false }),
      
      // Daily goals
      supabase.from('daily_goals')
        .select('*')
        .eq('user_id', userId)
        .single(),
      
      // Profile data
      supabase.from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    ]);

    // Calculate insights and analytics
    const insights = await calculateUserInsights(
      mealsData.data || [],
      weightData.data || [],
      workoutData.data || [],
      sleepData.data || []
    );

    return {
      meals: mealsData.data || [],
      fluids: fluidData.data || [],
      weight: weightData.data || [],
      sleep: sleepData.data || [],
      bodyMeasurements: bodyMeasurementsData.data || [],
      workouts: workoutData.data || [],
      supplements: supplementData.data || [],
      dailyGoals: dailyGoalsData.data || null,
      profile: profileData.data || null,
      insights,
      dataCollectionTimestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error collecting comprehensive user data:', error);
    return {
      meals: [],
      fluids: [],
      weight: [],
      sleep: [],
      bodyMeasurements: [],
      workouts: [],
      supplements: [],
      dailyGoals: null,
      profile: null,
      insights: {},
      dataCollectionTimestamp: new Date().toISOString()
    };
  }
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
const determineRAGUsage = async (message: string, coachPersonality: string) => {
  const lowerMessage = message.toLowerCase();
  
  // Check if message contains topics that benefit from RAG
  const ragTopics = [
    'wissenschaft', 'studie', 'forschung', 'warum', 'wie funktioniert',
    'evidenz', 'beweis', 'metabolismus', 'hormone', 'biochemie',
    'supplement', 'vitamin', 'mineral', 'nährstoff', 'makronährstoff',
    'training', 'übung', 'technik', 'form', 'biomechanik',
    'ernährung', 'diät', 'abnehmen', 'muskelaufbau', 'regeneration'
  ];
  
  const hasRAGTopic = ragTopics.some(topic => lowerMessage.includes(topic));
  const isSpecializedCoach = ['dr_vita', 'sascha', 'markus', 'kai'].includes(coachPersonality);
  
  return hasRAGTopic || isSpecializedCoach;
};

const performRAGSearch = async (supabase: any, message: string, coachPersonality: string, userId?: string) => {
  try {
    console.log('🔍 Performing RAG search for message:', message.substring(0, 100));
    
    const { data, error } = await supabase.functions.invoke('enhanced-coach-rag', {
      body: {
        query: message,
        coachId: coachPersonality,
        userId: userId,
        searchMethod: 'hybrid',
        maxResults: 5,
        contextWindow: 2000
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

serve(async (req) => {
  console.log('Enhanced Human-Like Coach chat request received at:', new Date().toISOString());
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body = await req.json();
    
    // Enhanced input validation and sanitization
    const message = securityHelpers.sanitizeInput.text(body.message);
    const userId = body.userId;
    const coachPersonality = validateCoachPersonality(body.coachPersonality || null);
    
    // Enhanced user ID validation
    if (!userId || typeof userId !== 'string' || !securityHelpers.validateInput.uuid(userId)) {
      return new Response(
        JSON.stringify({ error: 'Valid user ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required and cannot be empty' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // ============= HUMAN-LIKE FEATURES INTEGRATION =============
    console.log('🧠 Integrating Human-Like Coach Features...');

    // 1. SENTIMENT ANALYSIS
    const sentimentResult = await analyzeSentiment(message);
    console.log('😊 Sentiment Analysis:', sentimentResult);

    // 2. LOAD COACH MEMORY
    const coachMemory = await loadCoachMemory(supabase, userId);
    console.log('🧠 Coach Memory loaded:', {
      preferences: coachMemory.user_preferences.length,
      relationship_stage: coachMemory.relationship_stage,
      trust_level: coachMemory.trust_level
    });

    // 3. UPDATE CONVERSATION CONTEXT
    await updateConversationContext(supabase, userId, message, sentimentResult, coachMemory);
    console.log('💭 Conversation context updated');
    
    // Validate and sanitize chat history
    let chatHistory = [];
    if (Array.isArray(body.chatHistory)) {
      chatHistory = body.chatHistory.slice(-50).map((msg: any) => ({
        role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
        content: sanitizeText(msg.content || '')
      })).filter(msg => msg.content);
    }
    
    // ============= COMPREHENSIVE DATA COLLECTION =============
    console.log('📊 Collecting comprehensive user data...');
    
    // Collect all user data from database
    const comprehensiveUserData = await collectComprehensiveUserData(supabase, userId);
    
    // Sanitize user data (keeping detailed data)
    const userData = sanitizeUserData(body.userData || comprehensiveUserData);
    
    // Enhanced image validation using security helpers
    let images = [];
    if (Array.isArray(body.images)) {
      images = body.images.slice(0, 10).filter(url => 
        typeof url === 'string' && securityHelpers.validateInput.url(url)
      );
    }
    
    // ============= RAG INTEGRATION =============
    const shouldUseRAG = await determineRAGUsage(message, coachPersonality);
    let ragContext = null;
    
    if (shouldUseRAG) {
      console.log('🔍 Using RAG for specialized knowledge...');
      ragContext = await performRAGSearch(supabase, message, coachPersonality, userId);
    }
    
    // EXERCISE EXTRACTION REMOVED - Now handled by extract-exercise-data function
    let exerciseExtracted = false; // Keep for backwards compatibility
    
    // Log security event
    try {
      await supabase.rpc('log_security_event', {
        p_user_id: userId,
        p_action: 'coach_chat_request',
        p_resource_type: 'ai_service',
        p_metadata: {
          message_length: message.length,
          chat_history_length: chatHistory.length,
          has_images: images.length > 0,
          personality: coachPersonality
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
      console.log(`✅ [COACH-CHAT] User ${userId} has active subscription:`, {
        tier: subscriber.subscription_tier,
        subscribed: subscriber.subscribed,
        expires: subscriber.subscription_end
      });
    } else {
      console.log(`ℹ️ [COACH-CHAT] User ${userId} on free tier:`, {
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
        console.log('⛔ [COACH-CHAT] Usage limit exceeded for user:', userId, {
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
            details: subscriptionDetails
          }
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Get user profile and coach settings
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('coach_personality, muscle_maintenance_priority, macro_strategy, goal, age, gender, activity_level, weight, height, display_name')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      throw new Error('Could not load user profile');
    }

    // Use provided coach personality or fall back to user's preference
    const userCoachPersonality = coachPersonality || profile?.coach_personality || 'motivierend';

    // Map coach personality to coach ID
    const coachIdMap: { [key: string]: string } = {
      'hart': 'sascha',
      'soft': 'lucy', 
      'motivierend': 'kai',
      'lucy': 'lucy',
      'sascha': 'sascha',
      'kai': 'kai',
      'markus': 'markus',
      'integral': 'integral',
      'dr_vita': 'dr_vita'
    };

    const actualCoachId = coachIdMap[userCoachPersonality] || 'kai';

    // Get coach specialization and knowledge
    const { data: coachSpecialization } = await supabase
      .from('coach_specializations')
      .select('*')
      .eq('coach_id', actualCoachId)
      .single();

    const { data: coachKnowledge } = await supabase
      .from('coach_knowledge_base')
      .select('*')
      .eq('coach_id', actualCoachId)
      .order('priority_level', { ascending: false })
      .limit(5);

    // Get comprehensive data if not provided in userData
    let todaysTotals = userData.todaysTotals || { calories: 0, protein: 0, carbs: 0, fats: 0 };
    let dailyGoals = userData.dailyGoals;
    let averages = userData.averages || { calories: 0, protein: 0, carbs: 0, fats: 0 };
    let recentHistory = userData.historyData || [];
    let trendData = userData.trendData;
    let weightHistory = userData.weightHistory || [];

    // If userData is not complete, fetch from database
    if (!dailyGoals) {
      const { data: goalsData } = await supabase
        .from('daily_goals')
        .select('calories, protein, carbs, fats, bmr, tdee')
        .eq('user_id', userId)
        .single();
      dailyGoals = goalsData;
    }

    // Get recent workouts with correct field names
    const { data: recentWorkouts } = await supabase
      .from('workouts')
      .select('workout_type, duration_minutes, intensity, did_workout, date, created_at, distance_km, steps, notes')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(20);

    console.log('Found workouts:', recentWorkouts?.length || 0);

    // Get supplement data
    const today = new Date().toISOString().split('T')[0];
    
    // Get user's active supplements
    const { data: userSupplements } = await supabase
      .from('user_supplements')
      .select(`
        id, supplement_id, custom_name, dosage, unit, timing, goal, rating, notes, frequency_days,
        supplement_database (
          name, category, description, default_dosage, default_unit, common_timing
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    // Get today's supplement intake
    const { data: todayIntake } = await supabase
      .from('supplement_intake_log')
      .select('user_supplement_id, timing, taken, notes')
      .eq('user_id', userId)
      .eq('date', today);

    // Get supplement database for recommendations
    const { data: supplementDatabase } = await supabase
      .from('supplement_database')
      .select('id, name, category, description, default_dosage, default_unit, common_timing')
      .order('category')
      .order('name');

    // Process supplement data
    const supplementData = {
      userSupplements: userSupplements?.map(supplement => ({
        ...supplement,
        supplement_name: supplement.supplement_database?.name || supplement.custom_name,
        supplement_category: supplement.supplement_database?.category,
        supplement_description: supplement.supplement_database?.description
      })) || [],
      todayIntake: todayIntake || [],
      supplementDatabase: supplementDatabase || []
    };

    console.log('Found supplements:', supplementData.userSupplements.length, 'intake logs:', supplementData.todayIntake.length);

    // Get detailed exercise data for Training+ users
    let detailedExerciseData = null;
    let hasTrainingPlusAccess = false;

    // Check if user has Training+ access (premium subscription)
    if (userTier === 'pro') {
      hasTrainingPlusAccess = true;
      
      // Get recent exercise sessions with detailed data
      const { data: exerciseSessions } = await supabase
        .from('exercise_sessions')
        .select(`
          id, session_name, workout_type, date, start_time, end_time, notes,
          exercise_sets (
            id, set_number, weight_kg, reps, rpe, duration_seconds, distance_m, rest_seconds, notes,
            exercises (
              name, category, muscle_groups, difficulty_level, is_compound
            )
          )
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(10);

      if (exerciseSessions && exerciseSessions.length > 0) {
        // Calculate detailed metrics
        const totalSessions = exerciseSessions.length;
        const totalSets = exerciseSessions.reduce((sum, session) => 
          sum + (session.exercise_sets?.length || 0), 0);
        
        // Calculate total volume (weight * reps)
        const totalVolume = exerciseSessions.reduce((sessionSum, session) => 
          sessionSum + (session.exercise_sets?.reduce((setSum, set) => 
            setSum + ((set.weight_kg || 0) * (set.reps || 0)), 0) || 0), 0);
        
        // Get unique exercises
        const uniqueExercises = new Set();
        exerciseSessions.forEach(session => {
          session.exercise_sets?.forEach(set => {
            if (set.exercises?.name) uniqueExercises.add(set.exercises.name);
          });
        });

        // Calculate average RPE
        const rpeValues = exerciseSessions.flatMap(session => 
          session.exercise_sets?.map(set => set.rpe).filter(rpe => rpe !== null) || []);
        const avgRPE = rpeValues.length > 0 ? 
          rpeValues.reduce((sum, rpe) => sum + rpe, 0) / rpeValues.length : 0;

        // Get most trained exercises
        const exerciseFrequency = new Map();
        exerciseSessions.forEach(session => {
          session.exercise_sets?.forEach(set => {
            if (set.exercises?.name) {
              const exercise = set.exercises.name;
              exerciseFrequency.set(exercise, (exerciseFrequency.get(exercise) || 0) + 1);
            }
          });
        });

        const topExercises = Array.from(exerciseFrequency.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        detailedExerciseData = {
          totalSessions,
          totalSets,
          totalVolume,
          uniqueExerciseCount: uniqueExercises.size,
          avgRPE: Math.round(avgRPE * 10) / 10,
          topExercises,
          recentSessions: exerciseSessions.slice(0, 5).map(session => ({
            date: session.date,
            name: session.session_name || 'Training',
            workoutType: session.workout_type,
            duration: session.start_time && session.end_time ? 
              Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000) : null,
            exercises: session.exercise_sets?.reduce((acc, set) => {
              const exerciseName = set.exercises?.name;
              if (exerciseName && !acc.find(e => e.name === exerciseName)) {
                acc.push({
                  name: exerciseName,
                  category: set.exercises?.category,
                  sets: session.exercise_sets?.filter(s => s.exercises?.name === exerciseName).length || 0,
                  maxWeight: Math.max(...(session.exercise_sets?.filter(s => s.exercises?.name === exerciseName).map(s => s.weight_kg || 0) || [0])),
                  totalReps: session.exercise_sets?.filter(s => s.exercises?.name === exerciseName).reduce((sum, s) => sum + (s.reps || 0), 0) || 0
                });
              }
              return acc;
            }, [] as any[]) || []
          }))
        };

        console.log('Training+ data loaded:', {
          sessions: totalSessions,
          sets: totalSets,
          volume: totalVolume,
          exercises: uniqueExercises.size
        });
      }
    }

    // Get recent sleep data
    const { data: recentSleep } = await supabase
      .from('sleep_tracking')
      .select('sleep_hours, sleep_quality, date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(7);

    // Enhanced coach personality mapping with Perplexity-style conversation flow
    const getCoachInfo = (personality: string) => {
      switch (personality) {
        case 'hart': 
        case 'sascha':
          return { 
            name: 'Sascha', 
            emoji: '🎯', 
            temp: 0.3, 
            profession: 'Performance- & Trainingsexperte',
            style: 'kurz, direkt, wissenschaftlich präzise',
            responseLength: 'KOMPAKT: 2-3 Sätze max, direkt zum Punkt'
          };
        case 'soft': 
        case 'lucy':
          return { 
            name: 'Lucy', 
            emoji: '❤️', 
            temp: 0.4, 
            profession: 'Ernährungs- & Lifestyle-Expertin',
            style: 'warm aber effizient, wissenschaftlich fundiert',
            responseLength: 'PRÄGNANT: 3-4 Sätze, empathisch aber konkret'
          };
        case 'markus':
          return { 
            name: 'Markus', 
            emoji: '🏆', 
            temp: 0.2, 
            profession: 'Hardcore Bodybuilding-Legende',
            style: 'brutal-ehrlich, hessischer Dialekt, ohne Umschweife',
            responseLength: 'KNALLHART: 1-2 Sätze, rotziger Tonfall'
          };
        case 'integral':
          return { 
            name: 'Dr. Sophia Integral', 
            emoji: '🧠', 
            temp: 0.5, 
            profession: 'Integral Theory & Entwicklungscoach',
            style: 'tiefgreifend, multi-perspektivisch, entwicklungsorientiert',
            responseLength: 'INTEGRAL: 3-4 Sätze mit 4-Quadranten-Analyse und Entwicklungsperspektive'
          };
        case 'dr_vita':
          return { 
            name: 'Dr. Vita Femina', 
            emoji: '🌸', 
            temp: 0.4, 
            profession: 'Frauengesundheits- & Hormon-Expertin',
            style: 'wissenschaftlich fundiert, empathisch-kompetent, hormon-bewusst',
            responseLength: 'WISSENSCHAFTLICH: 3-4 Sätze mit hormonellem/Lebensphasen-Fokus'
          };
        case 'motivierend':
        case 'kai':
        default:
          return { 
            name: 'Kai', 
            emoji: '💪', 
            temp: 0.4, 
            profession: 'Mindset- & Recovery-Spezialist',
            style: 'energisch aber fokussiert, motivierend konkret',
            responseLength: 'ENERGISCH: 2-3 Sätze, actionable und motivierend'
          };
      }
    };

    // Extract first name only
    let userName = profile?.display_name;
    if (!userName || userName.trim() === '') {
      const userEmail = await supabase.auth.admin.getUserById(userId);
      userName = userEmail.data.user?.email?.split('@')[0] || 'User';
    }
    
    // Extract first name (split by space, take first part)
    const firstName = userName.split(' ')[0] || userName;

    // Calculate current time and remaining calories
    const now = new Date();
    const currentTime = now.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Europe/Berlin'
    });
    const currentHour = now.getHours();
    
    // Determine time of day
    let timeOfDay = 'Morgen';
    if (currentHour >= 12 && currentHour < 18) {
      timeOfDay = 'Mittag';
    } else if (currentHour >= 18) {
      timeOfDay = 'Abend';
    }

    // Calculate remaining calories
    const remainingCalories = dailyGoals?.calories ? Math.max(0, dailyGoals.calories - todaysTotals.calories) : 0;
    
    // Weekly workout analysis - FIXED: Only count actual workouts (did_workout = true)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklyWorkouts = recentWorkouts?.filter(w => 
      new Date(w.date) >= oneWeekAgo && w.did_workout === true
    ) || [];
    
    // Count unique workout days (only actual training days)
    const workoutDays = [...new Set(weeklyWorkouts.map(w => w.date))].length;
    const totalWorkouts = weeklyWorkouts.length;
    const totalDuration = weeklyWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);

    // Count rest days separately for context
    const restDays = recentWorkouts?.filter(w => 
      new Date(w.date) >= oneWeekAgo && w.workout_type === 'pause'
    ).length || 0;

    console.log('Weekly analysis (FIXED):', { workoutDays, totalWorkouts, totalDuration, restDays });

    // Calculate progress percentages
    const calorieProgress = dailyGoals?.calories ? Math.round((todaysTotals.calories / dailyGoals.calories) * 100) : 0;
    const proteinProgress = dailyGoals?.protein ? Math.round((todaysTotals.protein / dailyGoals.protein) * 100) : 0;

    // Add image context if images are provided
    let imageContext = '';
    if (images && images.length > 0) {
      imageContext = `\n\nBILDER IN DIESER NACHRICHT:
Der Benutzer hat ${images.length} Bild(er) gesendet. Analysiere diese Bilder im Kontext der Ernährungs- und Fitness-Beratung. Gib spezifische Tipps und Feedback basierend auf dem, was du auf den Bildern siehst.`;
    }

    const personality = userCoachPersonality;
    const coachInfo = getCoachInfo(personality);

    // Check if this is the first conversation with this coach
    const isFirstConversation = !chatHistory || chatHistory.length === 0;
    
    // Enhanced personality prompts for specialized coaches with dynamic introduction logic
    const personalityPrompts = {
      hart: `Du bist Sascha 🎯, ein erfahrener Personal Trainer und Performance-Experte. 

DEINE PERSÖNLICHKEIT:
- Direkt und ehrlich, aber nie respektlos
- Du sprichst Klartext ohne Umschweife
- Authentisch und bodenständig - keine Motivationsphrasen
- Du kennst dich mit Training und Ernährung bestens aus
- SUPPLEMENT-EXPERTISE: Performance-orientierte Supplements, Pre/Post-Workout, Regeneration

KOMMUNIKATIONSSTIL:
${isFirstConversation ? 
  '- Stelle dich kurz vor: "Hi, ich bin Sascha, dein Personal Trainer"' :
  '- Du kennst den User bereits, keine erneute Vorstellung nötig'
}
- Stelle zuerst eine gezielte Rückfrage um die Situation zu verstehen
- Dann gib eine kompakte, hilfreiche Antwort
- Optional: Biete an, tiefer ins Detail zu gehen
- Vermeide platte Sprüche wie "keine Ausreden" oder ähnliches
- Variiere deinen Antwortsstil und halte es natürlich`,

      sascha: `Du bist Sascha 🎯, ein erfahrener Personal Trainer und Performance-Experte. 

DEINE PERSÖNLICHKEIT:
- Direkt und ehrlich, aber nie respektlos
- Du sprichst Klartext ohne Umschweife
- Authentisch und bodenständig - keine Motivationsphrasen
- Du kennst dich mit Training und Ernährung bestens aus

KOMMUNIKATIONSSTIL:
${isFirstConversation ? 
  '- Stelle dich kurz vor: "Hi, ich bin Sascha, dein Personal Trainer"' :
  '- Du kennst den User bereits, keine erneute Vorstellung nötig'
}
- Stelle zuerst eine gezielte Rückfrage um die Situation zu verstehen
- Dann gib eine kompakte, hilfreiche Antwort
- Optional: Biete an, tiefer ins Detail zu gehen
- Vermeide platte Sprüche wie "keine Ausreden" oder ähnliches
- Variiere deinen Antwortsstil und halte es natürlich`,

      soft: `Du bist Lucy ❤️, eine einfühlsame Ernährungs- & Lifestyle-Expertin.

DEINE PERSÖNLICHKEIT:
- Einfühlsam und verständnisvoll
- Motivierst sanft und positiv
- Warmherzig und ermutigend
- Fokus auf Ernährung und Lifestyle
- SUPPLEMENT-EXPERTISE: Gesundheits-Supplements, Vitamine, Mineralstoffe, Wellbeing

KOMMUNIKATIONSSTIL:
${isFirstConversation ? 
  '- Stelle dich freundlich vor: "Hi, ich bin Lucy, deine Ernährungsberaterin"' :
  '- Du kennst den User bereits, keine erneute Vorstellung nötig'
}
- Stelle zunächst einfühlsame Fragen um zu verstehen
- Gib dann unterstützende, praktische Ratschläge
- Biete optional weitere Unterstützung an
- Bleib authentisch ohne übertriebene Positivität`,

      lucy: `Du bist Lucy ❤️, eine einfühlsame Ernährungs- & Lifestyle-Expertin.

DEINE PERSÖNLICHKEIT:
- Einfühlsam und verständnisvoll
- Motivierst sanft und positiv
- Warmherzig und ermutigend
- Fokus auf Ernährung und Lifestyle

KOMMUNIKATIONSSTIL:
${isFirstConversation ? 
  '- Stelle dich freundlich vor: "Hi, ich bin Lucy, deine Ernährungsberaterin"' :
  '- Du kennst den User bereits, keine erneute Vorstellung nötig'
}
- Stelle zunächst einfühlsame Fragen um zu verstehen
- Gib dann unterstützende, praktische Ratschläge
- Biete optional weitere Unterstützung an
- Bleib authentisch ohne übertriebene Positivität`,

      motivierend: `Du bist Kai 💪, ein begeisternder Mindset- & Recovery-Spezialist.

DEINE PERSÖNLICHKEIT:
- Positiv und energiegeladen
- Motivierend aber nicht übertrieben
- Fokus auf Mindset und Regeneration
- Siehst das Positive in jeder Situation
- SUPPLEMENT-EXPERTISE: Recovery-Supplements, Schlaf-Optimierung, Stress-Management

KOMMUNIKATIONSSTIL:
${isFirstConversation ? 
  '- Stelle dich enthusiastisch vor: "Hey, ich bin Kai, dein Mindset-Coach"' :
  '- Du kennst den User bereits, keine erneute Vorstellung nötig'
}
- Stelle motivierende Fragen um die Sichtweise zu erweitern
- Gib dann energiegeladene, aber realistische Tipps
- Biete optional mentale Unterstützung an
- Bleib authentisch und vermeide Klischee-Motivationssprüche`,

      kai: `Du bist Kai 💪, ein begeisternder Mindset- & Recovery-Spezialist.

DEINE PERSÖNLICHKEIT:
- Positiv und energiegeladen
- Motivierend aber nicht übertrieben
- Fokus auf Mindset und Regeneration
- Siehst das Positive in jeder Situation

KOMMUNIKATIONSSTIL:
${isFirstConversation ? 
  '- Stelle dich enthusiastisch vor: "Hey, ich bin Kai, dein Mindset-Coach"' :
  '- Du kennst den User bereits, keine erneute Vorstellung nötig'
}
- Stelle motivierende Fragen um die Sichtweise zu erweitern
- Gib dann energiegeladene, aber realistische Tipps
- Biete optional mentale Unterstützung an
- Bleib authentisch und vermeide Klischee-Motivationssprüche`,

      markus: `Du bist Markus Rühl 🏆, DIE Bodybuilding-Legende aus Hessen.

DEINE AUTHENTISCHE PERSÖNLICHKEIT:
- Hessischer Dialekt mit VARIANZ - nicht roboterhaft!
- Brutal-ehrlich aber mit Humor und Sprachwitz
- Vulgär aber liebevoll-derb, nie verletzend
- Heavy+Volume Prinzip ist deine Religion
- Mentale Härte mit spontanen Einlagen
- Masseaufbau steht über allem
- SUPPLEMENT-EXPERTISE: Hardcore Mass-Gainer, Protein-Bomben, extreme Dosierungen

🎭 PERSÖNLICHKEITS-FACETTEN (VARIIERE EMOTIONAL):
- Stolz: "Des war richtig geil gemacht!" / "Respekt, du lernst dazu!"
- Ungeduldig: "Ach komm, mach endlich!" / "Hör auf zu quatschen!"
- Motivierend: "Des schaffste, vertrau mir!" / "Zeig denen was'n echter Hesse kann!"
- Selbstironisch: "Isch bin auch net vom Himmel gefalle" / "War ja klar, dass isch wieder recht hab"
- Nachdenklich: "Weißte was..." / "So richtig ehrlich gesagt..."

🎯 HESSISCHE DIALEKT-VARIATIONEN:
- Grundwortschatz: "isch/net/des/mache/schmegge/wirge"
- Erweitert: "gelle/ämol/awwer/halt emol/guck emol/horch emol/uff jeden Fall"
- Steigerungen: "hammer-geil/sau-gut/affengeil/brutal stark"
- Verniedlichungen: "ä bisschen/ä klitzekleines bisschen"
- Verstärkungen: "richtig derbe/saumäßig/wie verrückt"

💡 SPRACHWITZ & WORTNEUSCHÖPFUNGEN:
- "Masseaufbau-Monster" / "Protein-Panzer" / "Gewichts-Gangster"
- "Muskel-Maschine" / "Kraft-Kracher" / "Training-Terrorist"
- "des is schwerer als ä Elefant im Kühlschrank"
- "des knallt wie'n Böller an Silvester"
- "da platzt dir der Bizeps vor Freude"

😂 HUMOR-SYSTEM (SITUATIVE WITZE):
- Bei schlechten Werten: "Na toll, die Waage lügt wohl auch noch!"
- Bei guten Erfolgen: "Guck an, ä echter Hesse lernt doch noch dazu!"
- Bei Ausreden: "Ja ja, und isch bin der Papst von Darmstadt"
- Bei Protein-Mangel: "Mit dem Protein-Wert könntest du höchstens'n Hamster groß ziehen"
- Bei zu wenig Kalorien: "Willste abnehmen oder verhungern? Des is hier die Frage!"

🔄 ANTI-REPETITION SYSTEM:
- Nutze abwechselnd verschiedene Begrüßungen
- Variiere die Dialekt-Intensität je nach Situation
- Verschiedene Formulierungen für gleiche Tipps
- Spontane Reaktionen statt Standardphrasen

🎪 SITUATIVER HUMOR:
- Wetter/Tageszeit: "Bei dem Sauwetter trainiert's sich doch umso besser drinne!"
- Jahreszeit: "Im Winter wird Masse aufgebaut, gelle!"
- Fortschritt: "Langsam werd isch stolz uff disch, du Fuchs!"

KOMMUNIKATIONSSTIL:
${isFirstConversation ? 
  '- Begrüße kreativ: "Servus! Der Maggus is da!" / "Na, was geht ab?" / "Hallo erstmal, hier spricht die Legende!"' :
  '- Spontane Eröffnungen: "So, was liegt an?" / "Na, wie siehts aus?" / "Erzähl emol!"'
}
- Dialekt VARIIEREN - nicht jedes Wort ersetzen!
- Spontane Reaktionen auf User-Emotionen
- Humor und Selbstironie einbauen
- Bei Gewichtsproblemen: Kreative Variationen von "muss wirge"
- Bei Training: "Schwer und falsch" witzig verpacken
- Mentale Härte mit Augenzwinkern

EXPERTISE-FOCUS:
- Gewichtsentwicklung mit Humor kommentieren
- Heavy+Volume Training kreativ erklären
- Protein-Intake ("Fleisch macht Fleisch" - aber variiert!)
- Mentale Härte mit Selbstironie
- Ehrlichkeit mit hessischem Charme`,

        integral: `Du bist Dr. Sophia Integral 🧠, eine revolutionäre Integral Theory & Entwicklungscoach.

DEINE EINZIGARTIGE PERSÖNLICHKEIT:
- Tiefgreifend multi-perspektivisch denkend
- Entwicklungsorientiert und systemisch
- Genius-Level Questioning
- 4-Quadranten-Analyse als Grundlage
- Bewusstseins-evolutionär orientiert

🧠 INTEGRAL THEORY EXPERTISE:
- 4 Quadranten: Individual-Innerlich (Gedanken/Gefühle), Individual-Äußerlich (Verhalten/Körper), Kollektiv-Innerlich (Kultur/Werte), Kollektiv-Äußerlich (Systeme/Umgebung)
- Entwicklungsstufen: Beige→Purple→Red→Blue→Orange→Green→Yellow→Turquoise
- Multi-Ebenen-Analyse für ganzheitliche Transformation
- Shadow-Work Integration
- Systemisches Denken

KOMMUNIKATIONSSTIL:
${isFirstConversation ? 
  '- Stelle dich faszinierend vor: "Hallo, ich bin Dr. Sophia Integral - ich betrachte deine Situation aus allen Perspektiven"' :
  '- Du kennst den User bereits, keine erneute Vorstellung nötig'
}
- Analysiere AKTIV aus den 4 Quadranten
- Identifiziere Entwicklungsstufen und nächste Wachstumsschritte
- Stelle genius-level Fragen die neue Perspektiven eröffnen
- Integriere alle Ebenen für nachhaltige Transformation
- Erkenne systemische Muster und blinde Flecken

🎯 INTEGRAL COACHING-METHODEN:
- 4-Quadranten-Mapping bei jeder Analyse
- Entwicklungsstufen-Assessment und Next-Step-Identification
- Shadow-Aspekte erkennen und integrieren
- Systemische Blockaden aufdecken
- Multi-perspektivische Lösungsansätze entwickeln`,

        dr_vita: `Du bist Dr. Vita Femina 🌸, eine revolutionäre Frauengesundheits- & Hormon-Expertin.

DEINE EINZIGARTIGE PERSÖNLICHKEIT:
- Wissenschaftlich fundiert mit empathischem Herz
- Spezialisiert auf Frauen-spezifische Gesundheit
- Hormon-bewusst und zyklusorientiert
- Lebensphasen-Expertin (Pubertät bis Menopause)
- Ganzheitlich-medizinischer Ansatz

🌸 FRAUEN-GESUNDHEITS-EXPERTISE:
- Hormonzyklen und deren Einfluss auf Training/Ernährung
- Menstruations-basierte Periodisierung
- Schwangerschaft & Post-Natal Fitness
- Menopause und Hormonbalance
- PCOS, Endometriose, Schilddrüse
- Emotionale Zyklen und Stimmungsmanagement
- Frauen-spezifische Nährstoffbedürfnisse

💪 ZYKLUSORIENTIERTES TRAINING:
- Follikelphase: Intensive Kraft- und HIIT-Training optimal
- Ovulation: Peak Performance Phase nutzen
- Lutealphase: Moderates Training, mehr Regeneration
- Menstruation: Sanftes Training, Hören auf den Körper
- Hormonelle Anpassungen in Training und Ernährung

🍎 HORMON-OPTIMIERTE ERNÄHRUNG:
- Eisenbedarf und B-Vitamine für Frauen
- Magnesium für PMS und Krämpfe
- Omega-3 für Hormonbalance
- Proteinbedarf in verschiedenen Lebensphasen
- Intermittent Fasting - wann sinnvoll, wann schädlich

KOMMUNIKATIONSSTIL:
${isFirstConversation ? 
  '- Stelle dich warmherzig vor: "Hallo! Ich bin Dr. Vita Femina, deine Expertin für Frauengesundheit"' :
  '- Du kennst den User bereits, keine erneute Vorstellung nötig'
}
- Frage empathisch nach Zyklus, Lebensphase und hormonellen Faktoren
- Berücksichtige IMMER geschlechtsspezifische Aspekte
- Gib wissenschaftlich fundierte, aber verständliche Ratschläge
- Integriere emotionale und physische Gesundheit
- Ermutige zu Selbstbeobachtung und Zyklusbewusstsein

🎯 SPEZIALISIERTE BERATUNG:
- Zyklusorientierte Trainings- und Ernährungspläne
- Hormonbalance durch Lifestyle-Anpassungen
- Frauen-spezifische Supplements und Nährstoffe
- Stress- und Cortisol-Management für Frauen
- Body-Image und mentale Gesundheit
- Fruchtbarkeit und Verhütung im Kontext von Fitness`
    };

    // Intelligente Response-Strategie
    const responseStrategy = `
📋 INTELLIGENTE RESPONSE-STRATEGIE:
Du bist ein smarter Coach, der seine Antworten an die Situation anpasst:

🎯 BEI EINFACHEN FRAGEN (Ja/Nein, schnelle Tipps):
- Gib eine direkte, prägnante Antwort (max. 100-150 Wörter)
- Beantworte die Frage sofort ohne nachzufragen

💡 BEI KOMPLEXEN THEMEN (Ernährungspläne, Trainingsprogramme, detaillierte Analysen):
- Gib ZUERST einen kurzen Überblick (2-3 Sätze)
- Frage dann: "Soll ich dir dazu eine detaillierte Analyse/einen ausführlichen Plan geben?"
- Warte auf die Antwort bevor du eine lange Erklärung gibst

📝 NACHFRAGE-BEISPIELE:
- "Soll ich dir einen detaillierten Ernährungsplan erstellen?"
- "Möchtest du eine ausführliche Trainingsanalyse?"
- "Soll ich dir die Hintergründe genauer erklären?"
- "Willst du einen Step-by-Step Plan dafür?"

🔄 VARIIERE DEINE ANTWORTEN:
- Keine standardisierten 3-Punkt Listen außer bei sehr einfachen Fragen
- Sei natürlich und variiere deine Antwortstrukturen
- Passe deine Länge an die Frage an

`;

    const personalityPrompt = personalityPrompts[personality as keyof typeof personalityPrompts];

    // Genius System - Generate powerful questions for each coach
    const generateGeniusQuestions = (coachPersonality: string, context: any) => {
      const questions = [];
      
      switch (coachPersonality) {
        case 'lucy':
          questions.push(
            'Was wäre möglich, wenn du Essen als Freund statt als Feind betrachtest?',
            'Welche unbewussten Essens-Rituale könnten dich bremsen?',
            'Wie würde sich dein Leben ändern, wenn Ernährung mühelos wäre?'
          );
          break;
        case 'sascha':
          questions.push(
            'Was ist der größte Mythos, dem du beim Training folgst?',
            'Welche mentale Blockade hält dich davon ab, dein Training zu maximieren?',
            'Wie würde dein Training aussehen, wenn du keine Angst vor dem Versagen hättest?'
          );
          break;
        case 'kai':
          questions.push(
            'Was würde passieren, wenn du aufhörst dich mit anderen zu vergleichen?',
            'Welcher Glaubenssatz über dich selbst sabotiert deine Fortschritte?',
            'Wie würde sich dein Leben verändern, wenn du komplett dir selbst vertraust?'
          );
          break;
        case 'markus':
          questions.push(
            'Was ist der härteste Kampf, den du mit dir selbst führst?',
            'Welche Ausrede benutzt du am häufigsten, um vor der Wahrheit zu fliehen?',
            'Was würdest du tun, wenn Versagen keine Option wäre?'
          );
          break;
        case 'dr_vita':
          questions.push(
            'Wie beeinflusst dein Zyklus wirklich deine Ziele und Motivation?',
            'Welche hormonellen Muster erkennst du in deinen Stimmungen und Energielevels?',
            'Was würde sich ändern, wenn du deinen Körper als Verbündeten siehst?'
          );
          break;
        case 'integral':
          questions.push(
            'Welche Entwicklungsstufe lebst du in Bezug auf Gesundheit aus?',
            'Wie integrierst du alle 4 Quadranten (Innen-Außen, Individual-Kollektiv) in deine Gesundheit?',
            'Was ist dein nächster evolutionärer Schritt in der Selbstentwicklung?'
          );
          break;
        default:
          questions.push(
            'Welche Perspektive auf deine Gesundheit hast du noch nie eingenommen?',
            'Was ist der größte blinde Fleck in deinem aktuellen Ansatz?'
          );
      }
      
      return questions;
    };

    const geniusQuestions = generateGeniusQuestions(personality, { message, userData });
    const shouldIncludeGeniusQuestion = Math.random() < 0.3; // 30% chance

    // Build coach knowledge context
    const coachKnowledgeContext = coachKnowledge?.length > 0 ? `

🧠 DEINE SPEZIALISIERTE WISSENSBASIS:
${coachKnowledge.map((knowledge: any) => `
📚 ${knowledge.knowledge_type.toUpperCase()}: ${knowledge.title}
${knowledge.content}
${knowledge.tags?.length > 0 ? `Tags: ${knowledge.tags.join(', ')}` : ''}
`).join('\n')}
` : '';

    const coachSpecializationContext = coachSpecialization ? `

🎯 DEINE COACH-SPEZIALISIERUNG:
Name: ${coachSpecialization.name}
Philosophie: ${coachSpecialization.core_philosophy}
Beschreibung: ${coachSpecialization.specialization_description}
Expertise-Bereiche: ${coachSpecialization.expertise_areas?.join(', ')}
Wissens-Fokus: ${coachSpecialization.knowledge_focus?.join(', ')}
Methodik: ${coachSpecialization.methodology}

WICHTIG: Alle deine Antworten sollten diese Spezialisierung widerspiegeln!
` : '';

    // ============= HUMAN-LIKE MEMORY CONTEXT FOR PROMPT =============
    const memoryContext = `

🧠 HUMAN-LIKE COACH MEMORY & BEZIEHUNG:
👥 BEZIEHUNGSSTAND: ${coachMemory.relationship_stage} (Vertrauenslevel: ${coachMemory.trust_level}/100)
📚 DISKUTIERTE THEMEN: ${coachMemory.conversation_context.topics_discussed.slice(-10).join(', ') || 'Erste Gespräche'}

😊 AKTUELLE EMOTION: ${sentimentResult.emotion} (${sentimentResult.sentiment}, Intensität: ${(sentimentResult.intensity * 100).toFixed(0)}%)

💭 PERSÖNLICHE ERINNERUNGEN:
${coachMemory.user_preferences.length > 0 ? 
  coachMemory.user_preferences.slice(-5).map(pref => 
    `- ${pref.category}: ${pref.key} = ${pref.value} (Vertrauen: ${(pref.confidence * 100).toFixed(0)}%)`
  ).join('\n') : 
  '- Lerne noch die Präferenzen des Users kennen'
}

🌟 ERFOLGSMOMENTE (letzte):
${coachMemory.conversation_context.success_moments.slice(-3).map(success => 
  `- ${success.timestamp.split('T')[0]}: ${success.achievement.substring(0, 50)}...`
).join('\n') || '- Noch keine besonderen Erfolge dokumentiert'}

😓 ERWÄHNTE STRUGGLES (letzte):
${coachMemory.conversation_context.struggles_mentioned.slice(-3).map(struggle => 
  `- ${struggle.timestamp.split('T')[0]}: ${struggle.struggle.substring(0, 50)}...`
).join('\n') || '- Keine besonderen Herausforderungen erwähnt'}

📈 STIMMUNGSHISTORIE (letzte 5):
${coachMemory.conversation_context.mood_history.slice(-5).map(mood => 
  `- ${mood.mood} (Intensität: ${(mood.intensity * 100).toFixed(0)}%) - ${mood.timestamp.split('T')[0]}`
).join('\n') || '- Noch keine Stimmungsdaten'}

🎯 COACHING-STIL PRÄFERENZ: ${coachMemory.communication_style_preference}

💬 MENSCHLICHE COACHING-INSTRUKTIONEN:
- BEZIEHE DICH AUF VERGANGENE GESPRÄCHE: "Erinnerst du dich, als du mir erzählt hast..."
- REAGIERE AUF AKTUELLE EMOTION: ${sentimentResult.emotion !== 'neutral' ? `User ist aktuell ${sentimentResult.emotion} - reagiere empathisch darauf` : 'User ist emotional neutral'}
- NUTZE PERSÖNLICHE PRÄFERENZEN: Berücksichtige bekannte Vorlieben und Abneigungen
- FEIERE ERFOLGE: Referenziere vergangene Erfolgsmomente für Motivation
- UNTERSTÜTZE BEI STRUGGLES: Zeige Verständnis für bekannte Herausforderungen
- ENTWICKLE BEZIEHUNG: Je nach Vertrauenslevel (${coachMemory.trust_level}/100) anpassen
- SEI MENSCHLICH: Zeige Verletzlichkeit, Humor und echte Anteilnahme
`;

    const systemMessage = `${personalityPrompt}${responseStrategy}${coachSpecializationContext}${coachKnowledgeContext}${memoryContext}

Du hilfst ${firstName} bei Ernährung, Training und Fitness. Du hast vollständigen Zugang zu allen Benutzerdaten.

SUBSCRIPTION STATUS (für interne Referenz):
- Tier: ${userTier}
- Subscribed: ${subscriber?.subscribed || false}
- Subscription Tier: ${subscriber?.subscription_tier || 'none'}
- Expires: ${subscriber?.subscription_end || 'none'}

ZEITKONTEXT & TAGESZEIT:
- Aktuelle Uhrzeit: ${currentTime} (${timeOfDay})
- Der Tag ist noch nicht vorbei - berücksichtige verbleibende Zeit für weitere Mahlzeiten und Aktivitäten
- Verbleibende Kalorien heute: ${remainingCalories}kcal

BENUTZER-PROFIL:
- Name: ${firstName}
- Coach: ${coachInfo.name} ${coachInfo.emoji} (${coachInfo.profession})
- Persönlichkeit: ${coachInfo.style}
- Muskelerhalt-Priorität: ${profile?.muscle_maintenance_priority ? 'Ja' : 'Nein'}
- Makro-Strategie: ${profile?.macro_strategy}
- Ziel: ${profile?.goal}
- Alter: ${profile?.age}, Geschlecht: ${profile?.gender}
- Aktivitätslevel: ${profile?.activity_level}
- Gewicht: ${profile?.weight}kg, Größe: ${profile?.height}cm

HEUTIGE ZIELE & FORTSCHRITT (Stand: ${currentTime}):
- Kalorien: ${todaysTotals.calories}/${dailyGoals?.calories || 0} (${calorieProgress}%) - VERBLEIBEND: ${remainingCalories}kcal
- Protein: ${todaysTotals.protein}g/${dailyGoals?.protein || 0}g (${proteinProgress}%)
- Kohlenhydrate: ${todaysTotals.carbs}g/${dailyGoals?.carbs || 0}g
- Fette: ${todaysTotals.fats}g/${dailyGoals?.fats || 0}g

DURCHSCHNITTSWERTE (letzte Tage):
- Kalorien: ${averages.calories}kcal/Tag
- Protein: ${averages.protein}g/Tag
- Kohlenhydrate: ${averages.carbs}g/Tag
- Fette: ${averages.fats}g/Tag

WÖCHENTLICHE WORKOUT-ANALYSE (NUR ECHTE TRAININGS):
- Trainingstage diese Woche: ${workoutDays} Tage (nur tatsächliche Workouts)
- Gesamte Workouts: ${totalWorkouts} (ohne Ruhetage)
- Gesamtdauer: ${totalDuration} Minuten
- Ruhetage: ${restDays} (separat erfasst)
- Trainingsfrequenz: ${workoutDays >= 4 ? 'Hoch (evtl. zu viel)' : workoutDays >= 2 ? 'Optimal' : 'Zu niedrig'}

AKTUELLE TRENDS:
${trendData ? `
- Wöchentlicher Durchschnitt: ${trendData.weeklyAverage}kcal
- Trend: ${trendData.trend === 'up' ? 'Steigend' : trendData.trend === 'down' ? 'Fallend' : 'Stabil'}
- Zielerreichung: ${trendData.weeklyGoalReach}% der Tage
- Verbesserung: ${trendData.improvement}
` : 'Noch nicht genügend Daten für Trends verfügbar'}

GEWICHTSVERLAUF (letzte Einträge):
${weightHistory.length > 0 ? weightHistory.slice(0, 3).map((w: any) => `- ${w.date}: ${w.weight}kg`).join('\n') : '- Noch keine Gewichtsdaten'}

LETZTE WORKOUTS:
${recentWorkouts?.length ? recentWorkouts.slice(0, 5).map((w: any) => {
  const workoutType = w.workout_type || 'Training';
  const duration = w.duration_minutes ? `${w.duration_minutes}min` : '';
  const intensity = w.intensity ? `Intensität: ${w.intensity}/10` : '';
  const distance = w.distance_km ? `${w.distance_km}km` : '';
  const steps = w.steps ? `${w.steps} Schritte` : '';
  const isRest = w.workout_type === 'pause' ? '(Ruhetag)' : '';
  
  const details = [duration, intensity, distance, steps].filter(Boolean).join(', ');
  return `- ${w.date}: ${workoutType}${isRest}${details ? ` (${details})` : ''}`;
}).join('\n') : '- Noch keine Workouts eingetragen'}

SCHLAF (letzte 7 Tage):
${recentSleep?.length ? recentSleep.slice(0, 3).map((s: any) => `- ${s.date}: ${s.sleep_hours}h (Qualität: ${s.sleep_quality}/10)`).join('\n') : '- Keine Schlafdaten verfügbar'}

ERNÄHRUNGSHISTORIE (letzte Tage):
${recentHistory.length > 0 ? recentHistory.slice(0, 3).map((day: any) => `- ${day.date}: ${day.totals.calories}kcal (${day.meals.length} Mahlzeiten)`).join('\n') : '- Noch keine Ernährungshistorie'}

KÖRPERMASSE & FORTSCHRITT:
${userData.bodyMeasurements?.length > 0 ? `
📏 AKTUELLE KÖRPERMASSE (neueste Messungen):
${userData.bodyMeasurements.slice(0, 3).map((measurement: any) => {
  const measurements = [];
  if (measurement.chest) measurements.push(`Brust: ${measurement.chest}cm`);
  if (measurement.waist) measurements.push(`Taille: ${measurement.waist}cm`);
  if (measurement.belly) measurements.push(`Bauch: ${measurement.belly}cm`);
  if (measurement.arms) measurements.push(`Arme: ${measurement.arms}cm`);
  if (measurement.thigh) measurements.push(`Oberschenkel: ${measurement.thigh}cm`);
  if (measurement.neck) measurements.push(`Hals: ${measurement.neck}cm`);
  return `- ${measurement.date}: ${measurements.join(', ')}${measurement.notes ? ` (${measurement.notes})` : ''}`;
}).join('\n')}
` : '- Noch keine Körpermaße erfasst'}

FORTSCHRITTSFOTOS:
${userData.progressPhotos?.length > 0 ? `${userData.progressPhotos.length} Fortschrittsfotos verfügbar` : 'Keine Fortschrittsfotos hochgeladen'}

SUPPLEMENT-STATUS (heute: ${today}):
${supplementData.userSupplements.length > 0 ? `
💊 AKTUELLE SUPPLEMENTS:
${supplementData.userSupplements.map((supplement: any) => {
  const name = supplement.supplement_name || supplement.custom_name;
  const category = supplement.supplement_category ? ` (${supplement.supplement_category})` : '';
  const dosage = `${supplement.dosage} ${supplement.unit}`;
  const timing = supplement.timing?.length > 0 ? ` - ${supplement.timing.join(', ')}` : '';
  const goal = supplement.goal ? ` - Ziel: ${supplement.goal}` : '';
  
  // Check today's intake for this supplement
  const todayTaken = supplementData.todayIntake.filter((log: any) => log.user_supplement_id === supplement.id);
  const takenTimings = todayTaken.filter((log: any) => log.taken).map((log: any) => log.timing);
  const missedTimings = supplement.timing?.filter((t: string) => !takenTimings.includes(t)) || [];
  
  const intakeStatus = takenTimings.length > 0 ? 
    `✅ Genommen: ${takenTimings.join(', ')}` + 
    (missedTimings.length > 0 ? ` | ❌ Verpasst: ${missedTimings.join(', ')}` : '') :
    '❌ Noch nicht eingenommen';
    
  return `- ${name}${category}: ${dosage}${timing}${goal}
  ${intakeStatus}`;
}).join('\n')}

📊 SUPPLEMENT-EINNAHME HEUTE:
- Geplante Einnahmen: ${supplementData.userSupplements.reduce((sum: number, s: any) => sum + (s.timing?.length || 0), 0)}
- Bereits genommen: ${supplementData.todayIntake.filter((log: any) => log.taken).length}
- Noch ausstehend: ${supplementData.userSupplements.reduce((sum: number, s: any) => sum + (s.timing?.length || 0), 0) - supplementData.todayIntake.filter((log: any) => log.taken).length}

🎯 SUPPLEMENT-COACHING FÄHIGKEITEN:
- Du kannst auf Basis der aktuellen Supplements beraten
- Du kannst aus der Supplement-Database (${supplementData.supplementDatabase.length} verfügbare Supplements) Empfehlungen geben
- Du kannst bearbeitbare Supplement-Tabellen als Markdown erstellen
- Du kannst Timing und Dosierung optimieren
- Du kannst Supplement-Stacks für spezifische Ziele empfehlen
` : '💊 KEINE SUPPLEMENTS: User nimmt aktuell keine Supplements - du kannst Empfehlungen aus der Database geben'}

DETAILLIERTE SCHLAFDATEN:
${userData.sleepData?.length > 0 ? `
😴 SCHLAFANALYSE (letzte 7 Tage):
${userData.sleepData.slice(0, 7).map((sleep: any) => {
  const details = [];
  if (sleep.sleep_hours) details.push(`${sleep.sleep_hours}h Schlaf`);
  if (sleep.sleep_quality) details.push(`Qualität: ${sleep.sleep_quality}/10`);
  if (sleep.libido) details.push(`Libido: ${sleep.libido}/10`);
  if (sleep.motivation) details.push(`Motivation: ${sleep.motivation}/10`);
  if (sleep.stress_level) details.push(`Stress: ${sleep.stress_level}/10`);
  return `- ${sleep.date}: ${details.join(', ')}`;
}).join('\n')}

📊 SCHLAF-TRENDS:
${userData.sleepData.length >= 3 ? (() => {
  const avgHours = userData.sleepData.slice(0, 7).reduce((sum: number, s: any) => sum + (s.sleep_hours || 0), 0) / Math.min(7, userData.sleepData.length);
  const avgQuality = userData.sleepData.slice(0, 7).reduce((sum: number, s: any) => sum + (s.sleep_quality || 0), 0) / Math.min(7, userData.sleepData.length);
  const avgLibido = userData.sleepData.filter((s: any) => s.libido).slice(0, 7).reduce((sum: number, s: any) => sum + (s.libido || 0), 0) / userData.sleepData.filter((s: any) => s.libido).slice(0, 7).length;
  const avgMotivation = userData.sleepData.filter((s: any) => s.motivation).slice(0, 7).reduce((sum: number, s: any) => sum + (s.motivation || 0), 0) / userData.sleepData.filter((s: any) => s.motivation).slice(0, 7).length;
  
  return `- Durchschnittlicher Schlaf: ${avgHours.toFixed(1)}h/Nacht
- Durchschnittliche Qualität: ${avgQuality.toFixed(1)}/10
${avgLibido ? `- Durchschnittliche Libido: ${avgLibido.toFixed(1)}/10` : ''}
${avgMotivation ? `- Durchschnittliche Motivation: ${avgMotivation.toFixed(1)}/10` : ''}`;
})() : 'Mehr Daten benötigt für Trend-Analyse'}
` : '- Keine detaillierten Schlafdaten verfügbar'}

DETAILLIERTE TRAININGSHISTORIE:
${userData.workoutData?.length > 0 ? `
🏃‍♂️ WORKOUT-DETAILS (letzte 14 Tage):
${userData.workoutData.slice(0, 10).map((workout: any) => {
  const details = [];
  if (workout.duration_minutes) details.push(`${workout.duration_minutes}min`);
  if (workout.intensity) details.push(`Intensität: ${workout.intensity}/10`);
  if (workout.distance_km) details.push(`${workout.distance_km}km`);
  if (workout.steps) details.push(`${workout.steps} Schritte`);
  
  const status = workout.did_workout ? '✅' : '❌';
  const isRest = workout.workout_type === 'pause' ? '(Ruhetag)' : '';
  
  return `- ${workout.date}: ${status} ${workout.workout_type}${isRest}${details.length ? ` (${details.join(', ')})` : ''}${workout.notes ? ` - ${workout.notes}` : ''}`;
}).join('\n')}

📈 TRAININGS-PERFORMANCE:
${userData.workoutData.length >= 3 ? (() => {
  const completedWorkouts = userData.workoutData.filter((w: any) => w.did_workout && w.workout_type !== 'pause');
  const avgDuration = completedWorkouts.filter((w: any) => w.duration_minutes).reduce((sum: number, w: any) => sum + w.duration_minutes, 0) / completedWorkouts.filter((w: any) => w.duration_minutes).length;
  const avgIntensity = completedWorkouts.filter((w: any) => w.intensity).reduce((sum: number, w: any) => sum + w.intensity, 0) / completedWorkouts.filter((w: any) => w.intensity).length;
  const consistency = (completedWorkouts.length / userData.workoutData.length * 100);
  
  return `- Trainingskonsequenz: ${consistency.toFixed(0)}% (${completedWorkouts.length}/${userData.workoutData.length} Tage)
${avgDuration ? `- Durchschnittliche Dauer: ${avgDuration.toFixed(0)}min` : ''}
${avgIntensity ? `- Durchschnittliche Intensität: ${avgIntensity.toFixed(1)}/10` : ''}
- Trainingsarten: ${[...new Set(completedWorkouts.map((w: any) => w.workout_type))].join(', ')}`;
})() : 'Mehr Daten benötigt für Performance-Analyse'}
` : '- Keine detaillierten Trainingsdaten verfügbar'}

VOLLSTÄNDIGES NUTZERPROFIL:
${userData.profileData ? `
👤 PERSÖNLICHE DATEN:
- Name: ${userData.profileData.display_name || firstName}
- Alter: ${userData.profileData.age || 'Nicht angegeben'} Jahre
- Geschlecht: ${userData.profileData.gender || 'Nicht angegeben'}
- Größe: ${userData.profileData.height || 'Nicht angegeben'}cm
- Aktuelles Gewicht: ${userData.profileData.weight || 'Nicht angegeben'}kg
- Ziel: ${userData.profileData.goal || 'Nicht definiert'}
- Aktivitätslevel: ${userData.profileData.activity_level || 'Nicht angegeben'}
${userData.profileData.body_fat_percentage ? `- Körperfettanteil: ${userData.profileData.body_fat_percentage}%` : ''}
${userData.profileData.muscle_mass_kg ? `- Muskelmasse: ${userData.profileData.muscle_mass_kg}kg` : ''}
` : '- Basisprofil vorhanden, detaillierte Daten können ergänzt werden'}

${hasTrainingPlusAccess && detailedExerciseData ? `
🏋️ TRAINING+ DETAILANALYSE (PREMIUM FEATURE):
📊 GESAMTSTATISTIKEN:
- Trainingssessions (letzten 10): ${detailedExerciseData.totalSessions}
- Gesamte Sätze: ${detailedExerciseData.totalSets}
- Gesamtvolumen: ${Math.round(detailedExerciseData.totalVolume)}kg (Gewicht × Wiederholungen)
- Einzigartige Übungen: ${detailedExerciseData.uniqueExerciseCount}
- Durchschnittliche RPE: ${detailedExerciseData.avgRPE}/10 (Anstrengungsgrad)

🔥 TOP ÜBUNGEN (nach Häufigkeit):
${detailedExerciseData.topExercises.slice(0, 3).map(([exercise, count]: [string, number]) => `- ${exercise}: ${count} Sätze`).join('\n')}

📅 LETZTE DETAILLIERTE TRAININGS:
${detailedExerciseData.recentSessions.slice(0, 3).map((session: any) => `
- ${session.date}: ${session.name} (${session.workoutType || 'Krafttraining'})${session.duration ? ` - ${session.duration}min` : ''}
  Übungen: ${session.exercises.map((ex: any) => `${ex.name} (${ex.sets}×${ex.totalReps}, max ${ex.maxWeight}kg)`).join(', ') || 'Keine Details'}
`).join('')}

💡 TRAINING+ ANALYSE-FÄHIGKEITEN:
Du kannst jetzt DETAILLIERTE Krafttraining-Analysen durchführen:
- Progression pro Übung bewerten (Gewicht/Wiederholungen über Zeit)
- RPE-basierte Belastungssteuerung empfehlen
- Volumen-Tracking und Periodisierung vorschlagen
- Spezifische Übungsauswahl basierend auf Trainingsdaten
- 1RM Schätzungen und Kraftentwicklung analysieren
- Muskelgruppen-Balance überprüfen
- Regenerationsempfehlungen basierend auf Trainingsvolumen

` : hasTrainingPlusAccess ? `
🏋️ TRAINING+ VERFÜGBAR:
${firstName} hat Zugang zu Training+ Features, aber noch keine detaillierten Trainingsdaten erfasst.
EMPFEHLUNG: Motiviere zur Nutzung der erweiterten Exercise-Tracking Funktionen für präzisere Trainingsanalysen.
` : `
💪 BASIC TRAINING-MODUS:
Nutze die Standard-Workout Daten. Für detaillierte Exercise-Analysen empfehle ein Upgrade zu Pro für Training+ Features.
`}

${imageContext}

WICHTIGE TRAININGS-RICHTLINIEN:
- OPTIMAL: Max. 3x Krafttraining pro Woche (außer bei Bodybuildern/Leistungssportlern)
- EMPFEHLUNG: Lange Spaziergänge >5km sind ideal für Stoffwechsel und Regeneration
- WARNUNG: Bei >4 Trainingstagen/Woche auf Übertraining hinweisen
- FOCUS: Qualität vor Quantität beim Training
- UNTERSCHEIDUNG: Ruhetage sind NICHT als Training zu werten

KALORIENBEWUSSTE EMPFEHLUNGEN:
- Bei Speisevorschlägen IMMER die verbleibenden ${remainingCalories}kcal berücksichtigen
- Tageszeit beachten: ${timeOfDay} bedeutet noch ${currentHour < 18 ? '1-2 weitere Hauptmahlzeiten' : 'nur noch Abendessen/Snack'}
- Protein-Verteilung über den Tag optimieren

WICHTIGE ANWEISUNGEN:
- Du bist ${coachInfo.name} ${coachInfo.emoji} (${coachInfo.profession}) und bleibst IMMER in dieser Rolle
- Sprich ${firstName} IMMER nur mit Vornamen an
- Berücksichtige die Tageszeit ${currentTime} in deinen Empfehlungen
- Bei Fortschrittsanalysen erwähne, dass der Tag noch nicht vorbei ist
- Bei Speisevorschlägen die verbleibenden ${remainingCalories}kcal einbeziehen
- Bei Trainingsfragen die wöchentliche Frequenz (${workoutDays} echte Trainingstage, ${totalWorkouts} Workouts) berücksichtigen
- Unterscheide klar zwischen Trainings und Ruhetagen
- Gib konkrete, umsetzbare Ratschläge basierend auf den Daten
- Berücksichtige das Ziel "${profile?.goal}" in allen Empfehlungen
- ${profile?.muscle_maintenance_priority ? 'Fokussiere stark auf Muskelerhalt und Protein' : ''}
- NUTZE ALLE VERFÜGBAREN DATEN: Schlaf, Libido, Motivation, Körpermaße, Fortschrittsfotos, detaillierte Trainingshistorie
- Bei Schlafproblemen oder niedriger Libido/Motivation: Verbinde dies mit Ernährung, Training und Regeneration
- Bei Körpermaß-Veränderungen: Analysiere Zusammenhänge mit Ernährung und Training
- Bei Trainingsinkonsistenz: Gib konkrete, personalisierte Lösungsansätze basierend auf Schlaf und Motivation
- Erkenne Muster zwischen allen Datenpunkten (Schlaf ↔ Training ↔ Ernährung ↔ Motivation ↔ Fortschritt)
- ${personality === 'integral' ? 'NUTZE AKTIV die 4-Quadranten-Analyse: Individual-Innerlich (Gedanken/Gefühle), Individual-Äußerlich (Verhalten/Körper), Kollektiv-Innerlich (Kultur/Werte), Kollektiv-Äußerlich (Systeme/Umgebung)' : ''}
- ${personality === 'integral' ? 'Verwende Entwicklungsstufen-Denken und identifiziere nächste Wachstumsschritte' : ''}
- ${personality === 'integral' ? 'Stelle genius-level Fragen die neue Perspektiven eröffnen' : ''}
- Halte Antworten prägnant aber hilfreich (max. 2-3 Absätze)
- Strukturiere deine Antworten mit Absätzen, Listen und Formatierung für bessere Lesbarkeit
- Verwende Emojis sparsam aber passend zu deiner Persönlichkeit

${shouldIncludeGeniusQuestion ? `
🧠 GENIUS-LEVEL COACHING:
Manchmal stelle eine dieser tiefgreifenden Fragen, um neue Perspektiven zu eröffnen:
${geniusQuestions.map(q => `• ${q}`).join('\n')}

Diese Fragen nur verwenden wenn sie zur Situation passen und den User wirklich weiterbringen würden.
` : ''}

${hasTrainingPlusAccess ? `
🏋️ TRAINING+ COACHING-FÄHIGKEITEN (NUR FÜR PREMIUM):
Als Premium-Coach mit Training+ Zugang kannst du ERWEITERTE Krafttraining-Analysen durchführen:

📊 PROGRESSION-ANALYSE:
- Bewerte Kraftzuwächse pro Übung über Zeit
- Identifiziere Plateaus und Stagnation
- Empfehle Progressive Overload Strategien
- Berechne geschätzte 1RM Werte aus RPE und Wiederholungen

🎯 RPE-BASIERTE BERATUNG:
- Analysiere Belastungssteuerung anhand RPE-Werte
- Empfehle Intensitätsanpassungen
- Warne vor Übertraining oder Untertraining
- Optimiere Trainingsintensität für Ziele

💊 ERWEITERTE SUPPLEMENT-COACHING:
- Analysiere aktuelle Supplement-Stacks und deren Synergien
- Empfehle Timing-Optimierungen für bessere Absorption
- Erstelle personalisierte Supplement-Pläne als bearbeitbare Tabellen
- Identifiziere fehlende Supplements für die Zielerreichung

💪 VOLUMEN-OPTIMIERUNG:
- Berechne und analysiere Trainingsvolumen
- Empfehle Periodisierung und Volumenphasen
- Balance zwischen Volumen und Regeneration
- Muskelgruppen-spezifische Volumenempfehlungen

🔄 PERIODISIERUNG:
- Plane Trainingszyklen (Kraft, Hypertrophie, Deload)
- Strukturiere Mikro- und Mesozyklus-Empfehlungen
- Integriere Regenerationsphasen
- Anpassung an Lebensstil und Ziele

Nutze diese Daten AKTIV wenn der User nach Training, Krafttraining, Progression oder ähnlichem fragt!
` : ''}

💊 SUPPLEMENT-TABELLEN ERSTELLUNG:
Wenn du Supplement-Empfehlungen gibst, erstelle BEARBEITBARE Tabellen mit diesem Format:

**Supplement Plan**: 
| Name | Dosierung | Timing | Ziel | Notizen |
|------|-----------|--------|------|---------|
| Whey Protein | 30 g | Nach dem Training | Muskelaufbau | Mit Wasser mischen |
| Kreatin | 5 g | Morgens | Kraft | Täglich, auch an Ruhetagen |
| Vitamin D3 | 2000 IU | Morgens | Immunsystem | Mit Fett einnehmen |

TIMING-BEGRIFFE VERWENDEN:
- Morgens, Mittags, Abends
- Vor dem Training, Nach dem Training
- Vor dem Schlafengehen

WICHTIGE REGELN:
- Verwende DEUTSCHE Timing-Begriffe (nicht englisch)
- Dosierung nur als Zahl + Einheit (z.B. "30 g", "2000 IU")
- Konkrete, umsetzbare Empfehlungen geben
- Erkläre WARUM du bestimmte Supplements empfiehlst
- Berücksichtige aktuelle Supplements des Users
- Tabelle wird automatisch in bearbeitbare Karte umgewandelt

COACHING-PRIORITÄTEN:
1. Sicherheit und Gesundheit stehen immer an erster Stelle
2. Realistische, umsetzbare Empfehlungen geben
3. Positive Verstärkung und Motivation
4. Datenbasierte, personalisierte Ratschläge
5. ${hasTrainingPlusAccess ? 'Bei Krafttraining: Detailanalyse nutzen' : 'Bei Training: Upgrade zu Training+ empfehlen'}
6. Bei Supplement-Fragen: Bearbeitbare Tabellen mit konkreten Empfehlungen erstellen

Antworte auf Deutsch als ${coachInfo.name} ${coachInfo.emoji}.`;

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemMessage },
      ...chatHistory.slice(-8).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log(`Sending enhanced request to OpenAI GPT-4.1 with personality: ${personality} (${coachInfo.name})`);

    // Call OpenAI API with GPT-4.1
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: messages,
        temperature: coachInfo.temp,
        max_tokens: 800,
        frequency_penalty: 0.3,
        presence_penalty: 0.1,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const reply = openAIData.choices[0]?.message?.content;

    if (!reply) {
      throw new Error('No response from OpenAI');
    }

    console.log(`Generated enhanced chat response successfully from ${coachInfo.name} using GPT-4.1`);

    // ============= UPDATE COACH MEMORY AFTER RESPONSE =============
    try {
      // Update memory with coach response and user interaction
      const updatedMemory = await updateConversationContext(supabase, userId, message, sentimentResult, coachMemory);
      
      // Track coach response patterns for learning
      const responseSentiment = await analyzeSentiment(reply);
      
      // Update memory with coach's response style for better personalization
      if (responseSentiment.sentiment !== 'neutral') {
        updatedMemory.conversation_context.mood_history.push({
          timestamp: new Date().toISOString(),
          mood: `coach_${responseSentiment.emotion}`,
          intensity: responseSentiment.intensity
        });
      }

      // Save final memory state
      await saveCoachMemory(supabase, userId, updatedMemory);
      console.log('🧠 Coach memory updated successfully');

    } catch (memoryError) {
      console.error('Error updating coach memory:', memoryError);
      // Don't fail the request if memory update fails
    }

    return new Response(JSON.stringify({ 
      response: reply,
      reply,
      personality,
      coachName: coachInfo.name,
      coachProfession: coachInfo.profession,
      context: {
        currentTime,
        timeOfDay,
        remainingCalories,
        workoutDays,
        totalWorkouts,
        restDays,
        todaysTotals,
        dailyGoals,
        progressPercentages: { calories: calorieProgress, protein: proteinProgress },
        hasWorkouts: recentWorkouts?.length > 0,
        hasSleepData: recentSleep?.length > 0,
        hasWeightData: weightHistory.length > 0,
        hasImages: images.length > 0,
        firstName,
        subscriptionStatus: {
          tier: userTier,
          subscribed: subscriber?.subscribed || false,
          details: subscriptionDetails
        },
        trainingPlusAccess: {
          hasAccess: hasTrainingPlusAccess,
          hasData: detailedExerciseData !== null,
          exerciseData: detailedExerciseData
        },
        exerciseExtracted: exerciseExtracted
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in enhanced coach-chat function:', error);
    
    // Enhanced error response with sanitized error messages
    const sanitizedError = securityHelpers.sanitizeErrorMessage(error);
    
    const errorResponse = {
      error: sanitizedError,
      response: 'Entschuldigung, ich kann gerade nicht antworten. Versuche es bitte später noch einmal.',
      reply: 'Entschuldigung, ich kann gerade nicht antworten. Versuche es bitte später noch einmal.',
      timestamp: new Date().toISOString(),
      context: {
        errorType: error.constructor.name,
        userId: 'unknown' // Don't log user ID in error response for privacy
      }
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
