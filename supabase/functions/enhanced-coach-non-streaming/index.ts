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

// Enhanced AI Context Builder (from original unified-coach-engine)
async function buildAIContext(input: any) {
  const startTime = Date.now();
  const { userId, coachId, userMessage, enableRag = true, tokenCap = 6000 } = input;
  
  // Initialize context
  let context = {
    persona: null,
    memory: null,
    daily: null,
    ragChunks: null,
    metrics: { tokensIn: 0 }
  };

  // Safe promise wrapper
  async function safe<T>(p: Promise<T>): Promise<T | null> {
    try { return await p; } catch { return null; }
  }

  // Load coach persona
  const getCoachPersona = async (coachId: string) => {
    const personas = {
      'lucy': {
        name: 'Lucy',
        personality: 'Herzlich, motivierend, immer positiv',
        expertise: ['Ernährung', 'Motivation', 'Wellness'],
        style: 'Du bist Lucy, eine herzliche und motivierende Gesundheitscoach. Du hilfst Menschen dabei, ihre Gesundheitsziele zu erreichen.'
      },
      'sascha': {
        name: 'Sascha',
        personality: 'Kraftvoll, direkt, motivierend',
        expertise: ['Training', 'Kraft', 'Motivation'],
        style: 'Du bist Sascha, ein kraftvoller Fitness-Coach. Du motivierst Menschen zu Höchstleistungen.'
      }
    };
    return personas[coachId] || personas['lucy'];
  };

  // Load conversation memory
  const loadCoachMemory = async (userId: string, coachId: string) => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return null;
      
      const { data, error } = await supabase
        .from('coach_memory')
        .select('*')
        .eq('user_id', userId)
        .eq('coach_id', coachId)
        .single();
      
      if (error || !data) {
        return { preferences: [], recentTopics: [], trust: 0.5, relationshipStage: 'new' };
      }
      
      return data.memory_data;
    } catch (error) {
      console.warn('Failed to load coach memory:', error);
      return null;
    }
  };

  // Load daily summary
  const loadDailySummary = async (userId: string) => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return null;
      
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();
      
      if (error || !data) return null;
      return data.summary_data;
    } catch (error) {
      console.warn('Failed to load daily summary:', error);
      return null;
    }
  };

  // RAG search
  const runRag = async (query: string, coachId: string) => {
    if (!enableRag) return null;
    
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return null;
      
      const { data, error } = await supabase.functions.invoke('enhanced-coach-rag', {
        body: {
          query,
          coach_id: coachId,
          max_results: 3,
          context_window: 1000
        }
      });
      
      if (error) throw error;
      return data?.context || null;
    } catch (error) {
      console.warn('RAG search failed:', error);
      return null;
    }
  };

  // Load all context in parallel
  const [persona, memory, daily, ragChunks] = await Promise.allSettled([
    getCoachPersona(coachId),
    loadCoachMemory(userId, coachId),
    loadDailySummary(userId),
    runRag(userMessage, coachId)
  ]);

  // Extract successful results
  context.persona = persona.status === 'fulfilled' ? persona.value : null;
  context.memory = memory.status === 'fulfilled' ? memory.value : null;
  context.daily = daily.status === 'fulfilled' ? daily.value : null;
  context.ragChunks = ragChunks.status === 'fulfilled' ? ragChunks.value : null;

  // Calculate token usage
  const contextStr = JSON.stringify(context);
  context.metrics.tokensIn = approxTokens(contextStr);
  
  return context;
}

// Build system prompt
function buildSystemPrompt(ctx: any, coachId: string): string {
  const { persona, memory, daily, ragChunks } = ctx;
  
  let prompt = '';
  
  // Base persona
  if (persona) {
    prompt += `${persona.style}\n\nDeine Expertise umfasst: ${persona.expertise.join(', ')}.\n\n`;
  }
  
  // Memory context
  if (memory) {
    prompt += `Kontext über den User:\n`;
    prompt += `- Vertrauenslevel: ${memory.trust || 0.5}\n`;
    prompt += `- Beziehungsstadium: ${memory.relationshipStage || 'new'}\n`;
    if (memory.preferences?.length > 0) {
      prompt += `- Präferenzen: ${memory.preferences.slice(0, 3).map((p: any) => p.key).join(', ')}\n`;
    }
    prompt += '\n';
  }
  
  // Daily summary
  if (daily) {
    prompt += `Heutige Aktivitäten des Users:\n`;
    if (daily.calories) prompt += `- Kalorien: ${daily.calories}\n`;
    if (daily.workouts) prompt += `- Training: ${daily.workouts}\n`;
    if (daily.sleep) prompt += `- Schlaf: ${daily.sleep}\n`;
    prompt += '\n';
  }
  
  // RAG knowledge
  if (ragChunks && ragChunks.length > 0) {
    prompt += `Relevantes Fachwissen:\n`;
    ragChunks.slice(0, 2).forEach((chunk: any, index: number) => {
      prompt += `${index + 1}. ${chunk.content.substring(0, 200)}...\n`;
    });
    prompt += '\n';
  }
  
  prompt += `Antworte immer auf Deutsch, sei hilfsbereit und motivierend. Halte deine Antworten prägnant und persönlich.`;
  
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

    // Build system prompt
    const systemPrompt = buildSystemPrompt(ctx, coachId);
    
    // Prepare messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6),
      { role: 'user', content: message }
    ];

    // Call OpenAI (non-streaming)
    const openaiStart = Date.now();
    await traceEvent(traceId, 'openai_call', 'started', {
      model: 'gpt-4o-mini',
      temperature: 0.7,
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
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
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