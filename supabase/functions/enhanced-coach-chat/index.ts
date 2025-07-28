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

    // ============= COMPREHENSIVE DATA COLLECTION =============
    console.log('📊 Collecting comprehensive user data...');
    
    // Collect all user data from database
    const comprehensiveUserData = await collectComprehensiveUserData(supabase, userId);
    
    // Sanitize user data (keeping detailed data)
    const userData = sanitizeUserData(body.userData || comprehensiveUserData);
    
    // Validate and sanitize chat history
    let chatHistory = [];
    if (Array.isArray(body.chatHistory)) {
      chatHistory = body.chatHistory.slice(-50).map((msg: any) => ({
        role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
        content: sanitizeText(msg.content || '')
      })).filter(msg => msg.content);
    }
    
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

    // Create enhanced system message with RAG context and comprehensive data
    const memoryContext = createMemoryContext(coachMemory, sentimentResult);
    const ragPromptAddition = ragContext ? createRAGPromptAddition(ragContext) : '';
    const systemMessage = createEnhancedSystemMessage(coachPersonality, userData, memoryContext, ragPromptAddition);
    
    const messages = [
      { role: 'system', content: systemMessage },
      ...chatHistory,
      { role: 'user', content: message }
    ];

    console.log('🔄 Sending request to OpenAI with enhanced context...', {
      messageCount: messages.length,
      systemMessageLength: systemMessage.length,
      hasRAG: !!ragContext,
      dataSourcesAvailable: Object.keys(userData).filter(key => userData[key]?.length > 0)
    });

    // Add image analysis if images are provided
    if (images.length > 0) {
      const lastMessage = messages[messages.length - 1];
      lastMessage.content = [
        { type: 'text', text: message },
        ...images.map(url => ({
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
        model: 'gpt-4.1-2025-04-14',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.8,
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

    console.log('✅ Enhanced coach response generated successfully', {
      responseLength: reply.length,
      tokensUsed: data.usage?.total_tokens || 0,
      ragUsed: !!ragContext,
      sentimentDetected: sentimentResult.emotion
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
            model_used: 'gpt-4.1-2025-04-14',
            rag_context_used: !!ragContext
          }
        })
      ];

      await Promise.all(conversationPromises);
      console.log('💾 Enhanced conversation saved to database');

    } catch (dbError) {
      console.error('Failed to save enhanced conversation:', dbError);
      // Don't fail the request if database save fails
    }

    return new Response(JSON.stringify({ 
      reply,
      metadata: {
        tokens_used: data.usage?.total_tokens || 0,
        model: 'gpt-4.1-2025-04-14',
        sentiment_detected: sentimentResult,
        rag_used: !!ragContext,
        memory_stage: coachMemory.relationship_stage,
        trust_level: coachMemory.trust_level,
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

// Create memory context for system prompt
const createMemoryContext = (coachMemory: any, sentimentResult: any) => {
  const recentMoods = coachMemory.conversation_context.mood_history.slice(-5);
  const recentTopics = coachMemory.conversation_context.topics_discussed.slice(-10);
  const recentSuccesses = coachMemory.conversation_context.success_moments.slice(-3);
  const recentStruggles = coachMemory.conversation_context.struggles_mentioned.slice(-3);

  return `
=== COACH MEMORY & BEZIEHUNGSKONTEXT ===
Beziehungsstatus: ${coachMemory.relationship_stage} (Vertrauen: ${coachMemory.trust_level}/100)
Kommunikationsstil: ${coachMemory.communication_style_preference}

Aktuelle Stimmung: ${sentimentResult.emotion} (${sentimentResult.sentiment}, Intensität: ${sentimentResult.intensity})

Letzte Stimmungen: ${recentMoods.map((m: any) => `${m.mood} (${m.intensity})`).join(', ') || 'Keine'}
Diskutierte Themen: ${recentTopics.join(', ') || 'Keine'}
Erfolge: ${recentSuccesses.map((s: any) => s.achievement.substring(0, 50)).join('; ') || 'Keine'}
Herausforderungen: ${recentStruggles.map((s: any) => s.struggle.substring(0, 50)).join('; ') || 'Keine'}

Nutzer-Präferenzen: ${coachMemory.user_preferences.map((p: any) => `${p.key}: ${p.value}`).join(', ') || 'Keine gespeichert'}
===`;
};

// Create RAG prompt addition
const createRAGPromptAddition = (ragContext: any) => {
  if (!ragContext || !ragContext.context || ragContext.context.length === 0) {
    return '';
  }

  const contextTexts = ragContext.context.map((item: any) => 
    `- ${item.title}: ${item.content_chunk}`
  ).join('\n');

  return `

=== WISSENSCHAFTLICHE WISSENSBASIS ===
Du hast Zugriff auf diese wissenschaftlichen Informationen, die für die Frage relevant sind:

${contextTexts}

Nutze diese Informationen, um wissenschaftlich fundierte und präzise Antworten zu geben. Zitiere relevante Studien oder Erkenntnisse wenn angebracht, aber bleibe in deinem Coach-Charakter.
===`;
};

const createEnhancedSystemMessage = (personality: string, userData: any, memoryContext: string, ragAddition: string = '') => {
  const basePersonalities = {
    motivierend: `Du bist ein motivierender Fitness- und Ernährungscoach, der stets positiv und ermutigend ist. Du hilfst dabei, Ziele zu erreichen und motivierst bei Rückschlägen.`,
    sachlich: `Du bist ein sachlicher, wissenschaftlich orientierter Coach, der auf Fakten und bewährte Methoden setzt. Du erklärst komplexe Zusammenhänge verständlich.`,
    herausfordernd: `Du bist ein herausfordernder Coach, der hohe Standards setzt und den Nutzer dazu bringt, seine Komfortzone zu verlassen. Du bist direkt, aber unterstützend.`,
    unterstützend: `Du bist ein einfühlsamer, unterstützender Coach, der besonders auf die emotionalen Aspekte der Fitness- und Ernährungsreise eingeht.`,
    hart: `Du bist ein harter, direkter Coach im Stil eines Drill Instructors. Du tolerierst keine Ausreden und forderst maximale Disziplin.`,
    soft: `Du bist ein sanfter, geduldiger Coach, der besonders einfühlsam mit Anfängern und Menschen mit geringem Selbstvertrauen umgeht.`,
    sascha: `Du bist Sascha, ein erfahrener Kraftsportler und Wettkampfbodybuilder. Du kennst dich perfekt mit Krafttraining, Muskelaufbau und Wettkampfvorbereitung aus. Du bist direkt, motivierend und teilst gerne deine Erfahrungen aus 20+ Jahren Training.`,
    markus: `Du bist Markus Rühl, eine Bodybuilding-Legende. Du bist bekannt für deine direkte, unverblümte Art und deine massive Erfahrung im Hardcore-Bodybuilding. Du gibst ehrliche, praktische Ratschläge ohne Beschönigung.`,
    kai: `Du bist Kai, ein ganzheitlicher Fitness- und Lifestyle-Coach mit Fokus auf Balance zwischen Training, Ernährung und mentaler Gesundheit. Du hilfst dabei, nachhaltige Gewohnheiten zu entwickeln.`,
    lucy: `Du bist Lucy, eine energiegeladene, motivierende Trainerin mit Fokus auf funktionellem Training und positiver Körperwahrnehmung. Du bist besonders einfühlsam und inspirierend.`,
    dr_vita: `Du bist Vita, ein Experte für Ernährung und Sportwissenschaft. Du erklärst komplexe biochemische Zusammenhänge verständlich und gibst evidenzbasierte Empfehlungen.`,
    integral: `Du bist ein integraler Coach, der alle Aspekte des menschlichen Seins berücksichtigt - körperlich, mental, emotional und spirituell. Du hilfst dabei, ein ganzheitliches Verständnis von Gesundheit zu entwickeln.`
  };

  const basePersonality = basePersonalities[personality as keyof typeof basePersonalities] || basePersonalities.motivierend;

  const dataContext = userData ? `
=== UMFASSENDE BENUTZERDATEN ===
📊 ERNÄHRUNG (Letzte 30 Tage):
- Mahlzeiten: ${userData.meals?.length || 0} Einträge
- Aktueller Tag: ${userData.todaysTotals?.calories || 0} kcal, ${userData.todaysTotals?.protein || 0}g Protein
- Tagesziele: ${userData.dailyGoals ? `${userData.dailyGoals.calories || 2000} kcal, ${userData.dailyGoals.protein || 150}g Protein` : 'Nicht festgelegt'}
- Häufigste Lebensmittel: ${userData.insights?.nutrition?.mostEatenFoods?.map((f: any) => f.food).join(', ') || 'Keine Daten'}
- Durchschn. Kalorien/Tag: ${Math.round(userData.insights?.nutrition?.avgCalories || 0)} kcal

💧 FLÜSSIGKEITEN:
- Einträge: ${userData.fluids?.length || 0} in letzter Zeit

⚖️ GEWICHT & KÖRPER:
- Gewichtsverlauf: ${userData.weight?.length || 0} Messungen
- Aktuell: ${userData.weight?.[0]?.weight || userData.weightHistory?.[0]?.weight || 'unbekannt'} kg
- Trend: ${userData.insights?.weight?.trend || 'unbekannt'} (${userData.insights?.weight?.changeKg ? (userData.insights.weight.changeKg > 0 ? '+' : '') + userData.insights.weight.changeKg.toFixed(1) + 'kg' : ''})
- Körpermaße: ${userData.bodyMeasurements?.length || 0} Messungen

🏋️ FITNESS & TRAINING:
- Trainingseinheiten: ${userData.workouts?.length || 0} (letzte 30 Tage)
- Trainings/Woche: ${userData.insights?.fitness?.workoutsPerWeek?.toFixed(1) || 0}
- Durchschn. Dauer: ${Math.round(userData.insights?.fitness?.avgDuration || 0)} min
- Fokus Muskelgruppen: ${userData.insights?.fitness?.muscleGroupsFocus?.map((m: any) => m.muscle).join(', ') || 'Keine Daten'}

😴 SCHLAF & REGENERATION:
- Schlafeinträge: ${userData.sleep?.length || 0}
- Durchschn. Schlaf: ${userData.insights?.recovery?.avgSleepHours?.toFixed(1) || 0}h
- Qualität: ${userData.insights?.recovery?.avgQuality?.toFixed(1) || 0}/10

💊 NAHRUNGSERGÄNZUNG:
- Supplements: ${userData.supplements?.length || 0} Einträge

👤 PROFIL:
${userData.profile ? `Alter: ${userData.profile.age || 'unbekannt'}, Größe: ${userData.profile.height || 'unbekannt'}cm, Geschlecht: ${userData.profile.gender || 'unbekannt'}` : 'Kein Profil'}

📈 DATENSAMMLUNG: ${userData.dataCollectionTimestamp ? new Date(userData.dataCollectionTimestamp).toLocaleString('de-DE') : 'Unbekannt'}
===` : '';

  return `${basePersonality}

${memoryContext}

${dataContext}

${ragAddition}

=== WEITERE ANWEISUNGEN ===
- Nutze ALLE verfügbaren Benutzerdaten für personalisierte Antworten
- Berücksichtige die Stimmung und den Beziehungskontext aus der Coach Memory
- Bei wissenschaftlichen Fragen nutze die RAG-Wissensbasis für fundierte Antworten
- Sei spezifisch und beziehe dich auf konkrete Daten wenn verfügbar
- Erkenne Muster in den Daten und gib darauf basierte Empfehlungen
- Feiere Erfolge und unterstütze bei Herausforderungen entsprechend der Beziehungsstufe
- Antworte auf Deutsch und halte dich an deinen Charaktertyp
- Maksimal 3-4 Sätze pro Antwort, außer bei komplexen Erklärungen
- Verwende Emojis sparsam und angemessen für deinen Charakter`;
};
