import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { getTaskModel } from '../_shared/openai-config.ts';
import { logTraceEvent } from "../telemetry.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trace-id, x-source, x-chat-mode',
};

serve(async (req) => {
  console.log('Coach media analysis request received at:', new Date().toISOString());
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseLog = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const t0 = Date.now();
    
    const body = await req.json();
    
    const {
      userId,
      mediaUrls,
      mediaType, // 'image' or 'video'
      analysisType, // 'exercise_form', 'meal_analysis', 'progress_photo', etc.
      coachPersonality = 'sascha',
      userQuestion = '',
      userProfile = {},
      conversationHistory = []
    } = body;

    // Validate inputs
    if (!userId || !mediaUrls || !Array.isArray(mediaUrls) || mediaUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'User ID and media URLs are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    await logTraceEvent(supabaseLog, {
      traceId,
      stage: 'received',
      handler: 'coach-media-analysis',
      status: 'RUNNING',
      payload: { mediaCount: mediaUrls.length, mediaType }
    });

    // Log security event
    try {
      await supabase.rpc('log_security_event', {
        p_user_id: userId,
        p_action: 'coach_media_analysis',
        p_resource_type: 'ai_vision',
        p_metadata: {
          media_count: mediaUrls.length,
          media_type: mediaType,
          analysis_type: analysisType
        }
      });
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }

    // Check user subscription and usage limits
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('subscribed, subscription_tier')
      .eq('user_id', userId)
      .single();

    let userTier = 'free';
    if (subscriber?.subscribed) {
      userTier = 'pro';
    }

    // For free users, check usage limits
    if (userTier === 'free') {
      const { data: usageResult, error: usageError } = await supabase.rpc('check_ai_usage_limit', {
        p_user_id: userId,
        p_feature_type: 'coach_media_analysis'
      });
      
      if (usageResult && !usageResult.can_use) {
        return new Response(JSON.stringify({ 
          error: 'Tägliches Limit für Medien-Analyse erreicht. Upgrade zu Pro für unbegrenzte Nutzung.',
          code: 'USAGE_LIMIT_EXCEEDED',
          daily_remaining: usageResult?.daily_remaining || 0
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Get coach personality info
    const getCoachInfo = (personality: string) => {
      switch (personality) {
        case 'sascha':
          return { 
            name: 'Sascha', 
            style: 'direkt und analytisch',
            expertise: 'Krafttraining und Bewegungsanalyse'
          };
        case 'lucy':
          return { 
            name: 'Lucy', 
            style: 'wie eine beste Freundin - herzlich, persönlich und ermutigend',
            expertise: 'Ernährung und Lifestyle'
          };
        case 'kai':
        default:
          return { 
            name: 'Kai', 
            style: 'motivierend und positiv',
            expertise: 'Mindset und ganzheitliche Betreuung'
          };
      }
    };

    const coachInfo = getCoachInfo(coachPersonality);

    // ✅ NEU: Load comprehensive user data for personalized image analysis
    const userData = await loadUserContextData(supabase, userId);
    console.log('User context loaded for image analysis:', { 
      hasGoals: !!userData.dailyGoals, 
      mealsToday: userData.todaysMeals?.length || 0,
      currentWeight: userData.currentWeight
    });
    
    // Load coach memory for relationship context
    const { data: coachMemory } = await supabase
      .from('coach_memory')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    // Create analysis prompt based on type
    let analysisPrompt = '';
    
    switch (analysisType) {
      case 'exercise_form':
        analysisPrompt = `Du bist ${coachInfo.name}, ein Experte für ${coachInfo.expertise}. 
        Analysiere die Übungsausführung auf dem Bild/Video:
        
        ANALYSIERE FOLGENDE ASPEKTE:
        - Körperhaltung und Alignment
        - Bewegungsqualität
        - Mögliche Fehler oder Risiken
        - Verbesserungsvorschläge
        
        ANTWORTE ${coachInfo.style} und gib konkrete, umsetzbare Tipps.
        ${userQuestion ? `\n\nSpezielle Frage des Users: ${userQuestion}` : ''}`;
        break;
        
      case 'meal_analysis':
        if (coachPersonality === 'lucy') {
          const userStatus = buildUserStatusForLucy(userData);
          const memoryContext = buildMemoryContextForLucy(coachMemory?.memory_data);
          
          analysisPrompt = `Du bist Lucy, die beste Freundin des Users. Ihr habt eine vertraute Beziehung und du kennst ihre Ziele und Herausforderungen.
          
          📊 DEIN WISSEN ÜBER DEN USER:
          ${userStatus}
          
          💭 EURE BEZIEHUNG:
          ${memoryContext}
          
          Das Bild zeigt ein Essen - reagiere darauf wie eine unterstützende, stolze beste Freundin:
          
          - Sei emotional und herzlich, beziehe dich auf ihre aktuellen Ziele
          - Zeige Stolz und Ermutigung basierend auf ihrem Fortschritt
          - Verwende warme, persönliche Sprache und ihren Namen
          - Beziehe dich auf konkrete Daten wenn relevant (Kalorien heute, Gewicht, etc.)
          - Mehr Emotionen und Emojis, weniger reine Nährwert-Analyse
          - Fokus auf Motivation und positive Verstärkung
          
          Antworte natürlich und fließend - wie in einer WhatsApp-Nachricht zwischen besten Freundinnen! 💕
          ${userQuestion ? `\n\nWas sie dich gefragt hat: ${userQuestion}` : ''}`;
        } else {
          analysisPrompt = `Du bist ${coachInfo.name}, ein Experte für ${coachInfo.expertise}.
          Analysiere das Essen auf dem Bild:
          
          BEWERTE:
          - Nährstoffzusammensetzung
          - Portionsgröße
          - Qualität der Zutaten
          - Fit zu Fitnesszielen
          
          ANTWORTE ${coachInfo.style} und gib praktische Ernährungstipps.
          ${userQuestion ? `\n\nSpezielle Frage des Users: ${userQuestion}` : ''}`;
        }
        break;
        
      case 'progress_photo':
        analysisPrompt = `Du bist ${coachInfo.name}, ein Experte für ${coachInfo.expertise}.
        Analysiere das Fortschrittsfoto:
        
        BEACHTE:
        - Sichtbare Veränderungen
        - Körperzusammensetzung
        - Motivation und Ermutigung
        - Nächste Schritte
        
        ANTWORTE ${coachInfo.style} und motiviere den User.
        ${userQuestion ? `\n\nSpezielle Frage des Users: ${userQuestion}` : ''}`;
        break;
        
      default:
        if (coachPersonality === 'lucy') {
          const userStatus = buildUserStatusForLucy(userData);
          const memoryContext = buildMemoryContextForLucy(coachMemory?.memory_data);
          
          analysisPrompt = `Du bist Lucy, die beste Freundin des Users. 
          
          📊 DEIN WISSEN ÜBER DEN USER:
          ${userStatus}
          
          💭 EURE BEZIEHUNG:
          ${memoryContext}
          
          Reagiere auf das Bild wie eine unterstützende, liebevolle beste Freundin:
          
          - Sei herzlich und persönlich, beziehe dich auf ihre Situation
          - Zeige echte Anteilnahme und Freude
          - Verwende warme, emotionale Sprache und ihren Namen
          - Fokus auf Ermutigung und positive Verstärkung
          - Beziehe dich auf konkrete Daten wenn relevant
          - Antworte natürlich wie in einer WhatsApp zwischen Freundinnen! 💕
          ${userQuestion ? `\n\nWas sie dich gefragt hat: ${userQuestion}` : ''}`;
        } else {
          analysisPrompt = `Du bist ${coachInfo.name}, ein Experte für ${coachInfo.expertise}.
          Analysiere das Bild/Video im Kontext von Fitness und Gesundheit.
          ANTWORTE ${coachInfo.style} und gib hilfreiche Insights.
          ${userQuestion ? `\n\nFrage des Users: ${userQuestion}` : ''}`;
        }
    }

    // Helper functions to build user context for Lucy
    function buildUserStatusForLucy(userData: any): string {
      const parts = [];
      
      if (userData.currentWeight) {
        parts.push(`🏋️ Aktuelles Gewicht: ${userData.currentWeight}kg`);
      }
      
      if (userData.todaysMeals?.length > 0) {
        const totalCals = userData.todaysMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
        parts.push(`🍽️ Heute: ${userData.todaysMeals.length} Mahlzeiten, ${totalCals} kcal`);
      }
      
      if (userData.dailyGoals) {
        parts.push(`🎯 Tagesziele: ${userData.dailyGoals.calories} kcal, ${userData.dailyGoals.protein}g Protein`);
      }
      
      if (userData.weightTrend) {
        parts.push(`📈 Gewichtstrend: ${userData.weightTrend}`);
      }
      
      return parts.length > 0 ? parts.join('\n') : 'Lernt sich gerade kennen';
    }

    function buildMemoryContextForLucy(memory: any): string {
      if (!memory) return 'Neue Freundschaft - ihr lernt euch gerade kennen! 😊';
      
      const parts = [];
      if (memory.relationship_stage) parts.push(`Beziehung: ${memory.relationship_stage}`);
      if (memory.trust_level) parts.push(`Vertrauen: ${memory.trust_level}/100`);
      
      const struggles = memory.conversation_context?.struggles_mentioned || [];
      const successes = memory.conversation_context?.success_moments || [];
      
      if (struggles.length > 0) {
        parts.push(`💭 Bekannte Herausforderungen: ${struggles.slice(-1).map((s: any) => s.struggle).join('')}`);
      }
      
      if (successes.length > 0) {
        parts.push(`🎉 Letzte Erfolge: ${successes.slice(-1).map((s: any) => s.achievement).join('')}`);
      }
      
      return parts.join(' | ');
    }

    // Comprehensive user data loading function (copied from enhanced-coach-chat)
    async function loadUserContextData(supabase: any, userId: string) {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      try {
        const [dailyGoalsResult, todaysMealsResult, currentWeightResult] = await Promise.all([
          supabase.from('daily_goals').select('*').eq('user_id', userId).single(),
          supabase.from('meals')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', `${today}T00:00:00`)
            .lt('created_at', `${today}T23:59:59`)
            .order('created_at', { ascending: false }),
          supabase.from('weight_history')
            .select('weight, date')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(7)
        ]);
        
        const userData: any = {
          dailyGoals: dailyGoalsResult.data,
          todaysMeals: todaysMealsResult.data || []
        };
        
        if (currentWeightResult.data?.length > 0) {
          userData.currentWeight = currentWeightResult.data[0].weight;
          
          if (currentWeightResult.data.length >= 2) {
            const recent = currentWeightResult.data[0].weight;
            const older = currentWeightResult.data[currentWeightResult.data.length - 1].weight;
            const diff = recent - older;
            userData.weightTrend = diff > 0 ? `+${diff.toFixed(1)}kg` : `${diff.toFixed(1)}kg`;
          }
        }
        
        return userData;
  } catch (error) {
        console.error('Error loading user context:', error);
        return {};
      }
    }

    // Build conversation context for personalized responses
    let contextPrompt = analysisPrompt;
    if (conversationHistory && conversationHistory.length > 0) {
      const recentConversation = conversationHistory.slice(-3).map((msg: any) => 
        `${msg.role === 'user' ? 'User' : 'Du'}: ${msg.content}`
      ).join('\n');
      
      contextPrompt += `\n\nVORHERIGE UNTERHALTUNG (für persönliche Ansprache):\n${recentConversation}\n\nBEACHTE: Nutze diese Informationen, um persönlich und im Kontext zu antworten.`;
    }

    // Prepare messages for OpenAI Vision API
    const messages = [
      {
        role: 'system',
        content: contextPrompt
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userQuestion || `Bitte analysiere ${mediaType === 'video' ? 'das Video' : 'das Bild'} und gib mir dein Feedback.`
          },
          ...mediaUrls.map((url: string) => ({
            type: 'image_url',
            image_url: {
              url: url,
              detail: 'high'
            }
          }))
        ]
      }
    ];

    console.log(`Sending vision analysis request to OpenAI for ${mediaUrls.length} media items`);

    await logTraceEvent(supabaseLog, {
      traceId,
      stage: 'tool_exec',
      handler: 'coach-media-analysis',
      status: 'RUNNING',
      payload: { mediaCount: mediaUrls.length, mediaType }
    });

    // Call OpenAI Vision API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getTaskModel('coach-media-analysis'),
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI Vision API error:', errorText);
      await logTraceEvent(supabaseLog, { traceId, stage: 'error', handler: 'coach-media-analysis', status: 'ERROR', errorMessage: errorText });
      throw new Error(`OpenAI Vision API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const analysis = openAIData.choices[0]?.message?.content;

    if (!analysis) {
      await logTraceEvent(supabaseLog, { traceId, stage: 'error', handler: 'coach-media-analysis', status: 'ERROR', errorMessage: 'No analysis from OpenAI Vision API' });
      throw new Error('No analysis from OpenAI Vision API');
    }

    console.log(`Generated media analysis successfully from ${coachInfo.name}`);

    await logTraceEvent(supabaseLog, {
      traceId,
      stage: 'tool_result',
      handler: 'coach-media-analysis',
      status: 'OK',
      latencyMs: Date.now() - t0,
      payload: { mediaCount: mediaUrls.length, mediaType }
    });

    await logTraceEvent(supabaseLog, {
      traceId,
      stage: 'reply_send',
      handler: 'coach-media-analysis',
      status: 'OK',
      latencyMs: Date.now() - t0
    });
    return new Response(JSON.stringify({ 
      response: analysis, // ... keep existing code (rest of response fields)
      analysis,
      coachName: coachInfo.name,
      coachStyle: coachInfo.style,
      analysisType,
      mediaCount: mediaUrls.length,
      context: {
        userTier,
        hasSubscription: subscriber?.subscribed || false
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in coach-media-analysis function:', error);
    try {
      const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
      const authHeader = req.headers.get('Authorization') ?? '';
      const supabaseLog = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
      await logTraceEvent(supabaseLog, {
        traceId,
        stage: 'error',
        handler: 'coach-media-analysis',
        status: 'ERROR',
        errorMessage: String(error)
      });
    } catch (_) { /* ignore */ }
    
    const errorResponse = {
      error: error.message || 'Internal server error',
      analysis: 'Entschuldigung, ich kann das Bild/Video gerade nicht analysieren. Versuche es bitte später noch einmal.',
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});