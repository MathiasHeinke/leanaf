import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Coach media analysis request received at:', new Date().toISOString());
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
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
            style: 'einfühlsam und unterstützend',
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
        analysisPrompt = `Du bist ${coachInfo.name}, ein Experte für ${coachInfo.expertise}.
        Analysiere das Essen auf dem Bild:
        
        BEWERTE:
        - Nährstoffzusammensetzung
        - Portionsgröße
        - Qualität der Zutaten
        - Fit zu Fitnesszielen
        
        ANTWORTE ${coachInfo.style} und gib praktische Ernährungstipps.
        ${userQuestion ? `\n\nSpezielle Frage des Users: ${userQuestion}` : ''}`;
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
        analysisPrompt = `Du bist ${coachInfo.name}, ein Experte für ${coachInfo.expertise}.
        Analysiere das Bild/Video im Kontext von Fitness und Gesundheit.
        ANTWORTE ${coachInfo.style} und gib hilfreiche Insights.
        ${userQuestion ? `\n\nFrage des Users: ${userQuestion}` : ''}`;
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

    // Call OpenAI Vision API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI Vision API error:', errorText);
      throw new Error(`OpenAI Vision API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const analysis = openAIData.choices[0]?.message?.content;

    if (!analysis) {
      throw new Error('No analysis from OpenAI Vision API');
    }

    console.log(`Generated media analysis successfully from ${coachInfo.name}`);

    return new Response(JSON.stringify({ 
      response: analysis, // Use 'response' key for consistency with enhanced-coach-chat
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