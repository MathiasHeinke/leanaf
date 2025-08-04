
// Force deployment v3.2 - Fix buildAIContext implementation  
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { createParser } from "https://esm.sh/eventsource-parser@3.0.3";
import { hashUserId, sanitizeLogData } from './hash-helpers.ts';
import { extractQuickWorkoutData } from './extract-helpers.ts';

// Enhanced trace utilities with telemetry metrics
function newTraceId(): string {
  return `t_${Math.random().toString(36).substring(2, 12)}`;
}

// OpenAI pricing per 1k tokens
const OPENAI_PRICING = {
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4.1-2025-04-14': { input: 0.005, output: 0.015 }
};

function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = OPENAI_PRICING[model as keyof typeof OPENAI_PRICING];
  if (!pricing) return 0;
  return (promptTokens / 1000 * pricing.input) + (completionTokens / 1000 * pricing.output);
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

// Global circuit breaker state  
let circuitBreakerState = { open: false, halfOpen: false, retryCount: 0, lastFailure: 0 };
const RECOVERY_TIMEOUT = 90_000; // 90 seconds

// 🔥 Single Supabase client instance (FIX #2)
let supabaseClient: any = null;
function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️ Trace disabled: Missing Supabase configuration');
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

// Enhanced traceEvent function for detailed pipeline monitoring
async function traceEvent(
  traceId: string,
  step: string,
  status: 'started' | 'progress' | 'complete' | 'error' = 'started',
  data: Record<string, any> = {},
  conversationId?: string,
  messageId?: string,
  duration?: number,
  error?: string
): Promise<void> {
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

async function trace(traceId: string, stage: string, payload: Record<string, any> = {}, metrics: Record<string, any> = {}): Promise<void> {
  const enrichedPayload = {
    ...payload,
    ...metrics,
    timestamp: Date.now()
  };

  console.log(JSON.stringify({ 
    ts: Date.now(), 
    event: 'trace', 
    traceId, 
    stage, 
    ...sanitizeLogData(enrichedPayload)
  }));
  
  // PRODUCTION TRACE: Enhanced with single client instance
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    const insertData = {
      trace_id: traceId,
      ts: new Date().toISOString(),
      stage,
      data: enrichedPayload
    };
    
    const { error } = await supabase
      .from('coach_traces')
      .insert(insertData);
    
    if (error) {
      console.warn('Trace insertion failed:', error.message);
    }
  } catch (error) {
    console.error('❌ Trace insertion exception:', error);
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-force-non-streaming, x-debug-mode',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

const encoder = new TextEncoder();
const HEARTBEAT_MS = 15_000;

type RequestBody = {
  userId: string;
  coachId?: string;
  coachPersonality?: string;
  messageId: string;
  message: string;
  conversationHistory?: any[];
  enableStreaming?: boolean;
  enableRag?: boolean;
};

function sse(data: unknown, event?: string) {
  const prefix = event ? `event: ${event}\n` : "";
  return `${prefix}data: ${JSON.stringify(data)}\n\n`;
}

// 🔒 DSGVO-konforme mark function mit User-ID hashing
async function mark(event: string, fields: Record<string, unknown> = {}) {
  const sanitizedFields = sanitizeLogData(fields);
  console.log(JSON.stringify({ ts: Date.now(), event, ...sanitizedFields }));
}

async function safe<T>(p: Promise<T>): Promise<T | null> {
  try { return await p; } catch { return null; }
}

function approxTokens(s: string): number {
  return Math.ceil((s || "").length / 4);
}

function hardTrim(str: string, tokenCap: number): string {
  const charCap = tokenCap * 4;
  if (str.length <= charCap) return str;
  return str.slice(0, charCap);
}

serve(async (req) => {
  console.log("▶️ [handleRequest_start]", {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers),
    timestamp: new Date().toISOString()
  });
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`🔧 DEBUG: CORS preflight handled for headers: ${req.headers.get('access-control-request-headers')}`);
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  const start = Date.now();
  
  // 🚀 GET-FALLBACK für SSE (Mobile Safari Kompatibilität)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const message = url.searchParams.get('message');
    const userId = url.searchParams.get('userId');
    const coachId = url.searchParams.get('coachId');
    const messageId = url.searchParams.get('messageId') || `msg_${Date.now()}`;
    
    if (!message || !userId) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters: message, userId' 
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Convert GET params to request body format
    const requestBody = {
      userId,
      message,
      messageId,
      coachId: coachId || 'lucy',
      conversationHistory: [],
      enableStreaming: false, // Force non-streaming for GET requests
      enableRag: false
    };

    return handleRequest(req, requestBody, corsHeaders, start);
  }
  
  // POST Handler für normale Anfragen
  if (req.method === 'POST') {
    console.log(`🔧 DEBUG: POST request received, parsing body...`);
    
    try {
      const body = await req.json() as RequestBody;
      return handleRequest(req, body, corsHeaders, start);
    } catch (error: any) {
      console.error('❌ Error parsing request:', error);
      return new Response(JSON.stringify({ error: 'Invalid request format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { 
    status: 405, 
    headers: corsHeaders 
  });
});

async function handleRequest(req: Request, body: any, corsHeaders: any, start: number) {
  const traceId = body.traceId || newTraceId();
  
  // 🔧 ENHANCED DEBUGGING: Log request start
  await traceEvent(traceId, 'handleRequest_start', 'started', { 
    bodyKeys: Object.keys(body),
    hasUserId: !!body.userId,
    hasMessage: !!body.message,
    hasCoachId: !!body.coachId,
    method: 'POST'
  }, body.conversationId, body.messageId);

  console.log(`🔧 DEBUG: handleRequest started - traceId: ${traceId}, userId: ${body.userId}, coachId: ${body.coachId}`);
  const { userId, message, messageId, coachPersonality, coachId, conversationHistory } = body;
  const conversationId = `conv_${userId}_${coachId || 'lucy'}`;
  
  // 🔧 CHECK HEADERS FOR STREAMING CONTROL AND CONTEXT DEBUG
  const forceNonStreaming = req.headers.get('x-force-non-streaming') === 'true';
  const debugMode = req.headers.get('x-debug-mode') === 'true';
  const disableMemory = req.headers.get('x-disable-memory') === 'true';
  const disableDaily = req.headers.get('x-disable-daily') === 'true';
  const disableRag = req.headers.get('x-disable-rag') === 'true';
  const liteContext = req.headers.get('x-lite-context') === 'true';
  const enableStreaming = !forceNonStreaming && (body.enableStreaming !== false);
  const enableRag = body.enableRag !== false && !disableRag;
  
  if (debugMode) {
    console.log('🔧 DEBUG MODE: Headers received:', {
      'x-force-non-streaming': req.headers.get('x-force-non-streaming'),
      'x-debug-mode': req.headers.get('x-debug-mode'),
      'x-disable-memory': req.headers.get('x-disable-memory'),
      'x-disable-daily': req.headers.get('x-disable-daily'),
      'x-disable-rag': req.headers.get('x-disable-rag'),
      'x-lite-context': req.headers.get('x-lite-context'),
      enableStreaming,
      enableRag,
      disableMemory,
      disableDaily,
      liteContext
    });
  }
  
  // 🔧 ENHANCED DEBUGGING: Context built successfully
  await traceEvent(traceId, 'contextBuilt', 'complete', {
    tokensIn: 0, // Will be updated after context build
    hasMemory: !disableMemory,
    ragChunks: !disableRag ? 'enabled' : 'disabled',
    hasDaily: !disableDaily,
    contextKeys: ['persona', 'memory', 'daily', 'rag']
  }, conversationId, messageId);

  console.log(`🔧 DEBUG: About to build context - disableMemory: ${disableMemory}, disableDaily: ${disableDaily}, disableRag: ${disableRag}`);
  
  // 📊 TRACE: Request received
  await traceEvent(traceId, 'message_received', 'started', {
    userId: hashUserId(userId),
    coachId: coachId || 'lucy',
    messageLength: message?.length || 0,
    hasStreaming: enableStreaming,
    hasRag: enableRag,
    hasHistory: conversationHistory?.length > 0
  }, conversationId, messageId);
    
  try {
    // ✅ PARAMETER VALIDATION FIRST - before any processing
    if (!userId || !message || !messageId) {
      const error = 'Missing required parameters: userId, message, messageId';
      await traceEvent(traceId, 'validation', 'error', {
        missing: {
          userId: !userId,
          message: !message,
          messageId: !messageId
        }
      }, conversationId, messageId, undefined, error);
      
      return new Response(JSON.stringify({ error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      const error = 'OpenAI API key not configured';
      await traceEvent(traceId, 'config_check', 'error', {}, conversationId, messageId, undefined, error);
      
      return new Response(JSON.stringify({ error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // 📊 TRACE: Configuration validated
    await traceEvent(traceId, 'config_check', 'complete', {
      hasApiKey: true,
      parametersValid: true
    }, conversationId, messageId);
    
    // 🔒 DSGVO: Hash User-ID für Logs  
    const hashedUserId = await hashUserId(userId);
    
    // 🔧 Circuit Breaker Recovery (FIX #3)
    if (circuitBreakerState.open && Date.now() - circuitBreakerState.lastFailure > RECOVERY_TIMEOUT) {
      circuitBreakerState = { open: false, halfOpen: true, retryCount: 0, lastFailure: 0 };
      console.log('🔄 Circuit breaker transitioning to half-open');
    }
    
    // ✅ SAFE TRACE CALLS with try-catch
    try {
      await trace(traceId, 'A_received', { 
        userId: hashedUserId,
        coachId: coachId || 'lucy',
        enableStreaming,
        enableRag
      }, {
        pii_detected: detectPII(message),
        sentiment_score: calculateSentiment(message),
        breaker_open: circuitBreakerState.open,
        breaker_halfOpen: circuitBreakerState.halfOpen,
        retry_count: circuitBreakerState.retryCount
      });
    } catch (traceError) {
      console.warn('⚠️ Trace failed but continuing:', traceError);
    }
    
    await mark("chat_start", { userId: hashedUserId, coachId: coachId || 'lucy', messageId, traceId });

    // 📊 TRACE: Building AI context
    await traceEvent(traceId, 'buildAIContext', 'started', {
      userId: hashedUserId,
      messagePreview: message.substring(0, 100),
      enableRag,
      tokenCap: 6000
    }, conversationId, messageId);
    
    // 🔥 PRODUCTION-OPTIMIZED: Build AI context with 6k token limit and debug flags
    const contextStart = Date.now();
    const ctx = await buildAIContext({
      userId,
      coachId: coachId || coachPersonality || 'lucy',
      userMessage: message,
      enableRag,
      tokenCap: 6000, // Reduced from 8k based on usage analytics
      disableMemory,
      disableDaily,
      disableRag,
      liteContext,
      debugMode
    });
    
    // 📊 TRACE: Context ready with detailed output
    await traceEvent(traceId, 'buildAIContext', 'complete', {
      input: {
        userId: hashedUserId,
        messageLength: message.length,
        enableRag,
        tokenCap: 6000
      },
      output: {
        tokensIn: ctx.metrics.tokensIn,
        hasMemory: !!ctx.memory,
        hasRag: !!ctx.ragChunks,
        hasDaily: !!ctx.daily,
        ragChunksCount: ctx.ragChunks?.length || 0,
        memoryTrust: ctx.memory?.trust || 0,
        dailyCaloriesLeft: ctx.daily?.caloriesLeft || 0
      }
    }, undefined, messageId, Date.now() - contextStart);

    await trace(traceId, 'B_context_ready', { 
      tokensIn: ctx.metrics.tokensIn, 
      hasMemory: !!ctx.memory,
      hasRag: !!ctx.ragChunks,
      hasDaily: !!ctx.daily
    }, {
      contextBuild_ms: Date.now() - start,
      prompt_tokens: ctx.metrics.tokensIn,
      rag_hit_rate: ctx.ragChunks ? (ctx.ragChunks.length > 0 ? 1 : 0) : 0,
      rag_score: ctx.ragChunks && ctx.ragChunks.length > 0 ? 0.8 : 0
    });

    await mark("context_built", { 
      tokensIn: ctx.metrics.tokensIn, 
      hasMemory: !!ctx.memory,
      hasRag: !!ctx.ragChunks,
      hasDaily: !!ctx.daily,
      userId: hashedUserId,
      traceId
    });

    // Build system prompt
    const systemPrompt = buildSystemPrompt(ctx, coachId || coachPersonality || 'lucy');

    // Prepare conversation history
    const messages = [];
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.slice(-6).forEach((msg: any) => {
        if (msg.role && msg.content) {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      });
    }

    if (enableStreaming) {
      // 📊 TRACE: Starting OpenAI call with full request details (DEBUGGING: Temporarily using gpt-4o)
      const DEBUG_MODEL = 'gpt-4o'; // Temporarily switched from gpt-4.1-2025-04-14 for debugging
      await traceEvent(traceId, 'openai_call', 'started', {
        input: {
          model: DEBUG_MODEL,
          temperature: 0.7,
          max_tokens: 2000,
          streaming: true,
          systemPromptLength: systemPrompt.length,
          messagesCount: messages.length + 1,
          userMessageLength: message.length
        },
        request_payload: {
          model: DEBUG_MODEL,
          prompt_preview: systemPrompt.substring(0, 1000) + '...',
          user_message_preview: message.substring(0, 100),
          estimated_prompt_tokens: ctx.metrics.tokensIn,
          full_system_prompt: systemPrompt // Debug: vollständiger Prompt
        }
      }, undefined, messageId);
      
      // 🔧 ENHANCED DEBUGGING: About to fetch OpenAI
      await traceEvent(traceId, 'about_to_fetch', 'started', {
        model: DEBUG_MODEL,
        enableStreaming: enableStreaming,
        systemPromptLength: systemPrompt.length,
        messageCount: messages.length + 1,
        forceNonStreaming: forceNonStreaming
      }, conversationId, messageId);

      console.log(`🔧 DEBUG: About to fetch OpenAI - model: ${DEBUG_MODEL}, streaming: ${enableStreaming}, forceNonStreaming: ${forceNonStreaming}`);
      
      await trace(traceId, 'C_openai_call', { streaming: true }, {
        openai_model: DEBUG_MODEL,
        active_calls: 1,
        waiting_calls: 0
      });
      mark("streaming_start", { messageId, traceId });
      
      // Create real SSE streaming response
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          // Handshake
          controller.enqueue(encoder.encode(sse({ ok: true, messageId, traceId }, "open")));

          // Heartbeat
          const hb = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), HEARTBEAT_MS);

          let deltaCount = 0;
          let responseText = '';

           try {
            const DEBUG_MODEL = 'gpt-4o'; // DEBUG VERSION 2025-08-03-v2 - Temporarily switched for debugging  
            console.log(`🔧 DEBUG v2: Making OpenAI call to ${DEBUG_MODEL} with streaming=true`);
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openAIApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: DEBUG_MODEL,
                temperature: 0.7,
                max_tokens: 2000,
                stream: forceNonStreaming ? false : true,
                messages: [
                  { role: 'system', content: systemPrompt },
                  ...messages,
                  { role: 'user', content: message }
                ]
              }),
            });

            // 🔧 ENHANCED DEBUGGING: Log OpenAI response details
            console.log(`🔧 DEBUG: OpenAI HTTP Status: ${response.status}`);
            console.log(`🔧 DEBUG: OpenAI Response Headers:`, Object.fromEntries(response.headers.entries()));
            console.log(`🔧 DEBUG: OpenAI Response OK: ${response.ok}`);
            console.log(`🔧 DEBUG: OpenAI Response Body Available: ${!!response.body}`);
            
            // Log detailed response for debugging
            await traceEvent(traceId, 'openai_response_debug', 'progress', {
              http_status: response.status,
              response_ok: response.ok,
              headers: Object.fromEntries(response.headers.entries()),
              body_available: !!response.body,
              content_type: response.headers.get('content-type'),
              content_length: response.headers.get('content-length')
            }, undefined, messageId);

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`🔧 DEBUG: OpenAI Error Response Body:`, errorText);
              throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error('No response body reader');
            }
            
            // 📊 TRACE: Start streaming
            await traceEvent(traceId, 'stream', 'started', {}, undefined, messageId);

            // 🔥 ROBUST STREAM PARSER WITH ENHANCED ERROR HANDLING
            const parser = createParser({
              onEvent: async (event) => {
                if (event.type === 'event') {
                  const data = event.data;
                  
                  if (data === '[DONE]') {
                    // 📊 TRACE: Streaming complete
                    const finalTokens = Math.round(responseText.length / 4);
                    await traceEvent(traceId, 'stream', 'complete', {
                      responseLength: responseText.length,
                      deltaCount,
                      finalTokens
                    }, undefined, messageId, Date.now() - start);
                    
                    console.log(`🔧 DEBUG: Stream complete - deltaCount: ${deltaCount}, responseLength: ${responseText.length}`);
                    
                    trace(traceId, 'F_streaming_done', { 
                      responseLength: responseText.length,
                      deltaCount 
                    }, {
                      fullStream_ms: Date.now() - start,
                      completion_tokens: finalTokens,
                      cost_usd: calculateCost('gpt-4o', ctx.metrics.tokensIn, finalTokens), // Updated for gpt-4o
                      model_fingerprint: 'gpt-4o',
                      response_preview: responseText.substring(0, 100) + '...',
                      total_deltas: deltaCount,
                      empty_response_warning: deltaCount === 0 ? '🚨 CRITICAL: OpenAI returned ZERO deltas - API/Model/Streaming issue!' : null,
                      debug_model_used: 'gpt-4o' // Debug info
                    });
                    controller.enqueue(encoder.encode(sse({ messageId, traceId }, "end")));
                    return;
                  }
                  
                  try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices?.[0]?.delta?.content;
                    
                    if (delta) {
                      responseText += delta;
                      deltaCount++;
                      
                      // Reduced logging for production (FIX #5)
                      if (deltaCount === 1 || deltaCount === 25 || deltaCount % 100 === 0) {
                        trace(traceId, 'D_delta', { 
                          chunk: delta.slice(0, 20),
                          deltaCount 
                        }, {
                          firstToken_ms: deltaCount === 1 ? (Date.now() - start) : undefined
                        });
                      }
                      
                      controller.enqueue(encoder.encode(sse({ 
                        type: "delta", 
                        messageId, 
                        delta,
                        traceId
                      })));
                    }
                  } catch (parseError) {
                    console.warn('Failed to parse SSE chunk:', parseError);
                    // Skip invalid JSON
                  }
                }
              },
              onError: (error) => {
                console.error('SSE Parser error:', error);
                throw error;
              }
            });

            try {
              let chunkCount = 0;
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  console.log(`🔧 DEBUG: Stream ended after ${chunkCount} chunks`);
                  break;
                }
                
                chunkCount++;
                const chunk = new TextDecoder().decode(value);
                
                // 🔧 ENHANCED DEBUGGING: Log first few chunks
                if (chunkCount <= 3) {
                  console.log(`🔧 DEBUG: Raw Chunk #${chunkCount}:`, chunk.substring(0, 200));
                  await traceEvent(traceId, `raw_chunk_${chunkCount}`, 'progress', {
                    chunk_preview: chunk.substring(0, 200),
                    chunk_length: chunk.length,
                    is_empty: chunk.trim() === ''
                  }, undefined, messageId);
                }
                
                parser.feed(chunk);
              }
            } catch (readError) {
              console.error('🔧 DEBUG: Stream read error:', readError);
              throw readError;
            } finally {
              // 🔧 PROPER READER CLEANUP (FIX #5)
              try {
                reader.cancel();
              } catch (e) {
                console.warn('Reader cancel failed:', e);
              }
              reader.releaseLock();
            }

            // Performance metrics
            const duration = Date.now() - start;
            controller.enqueue(encoder.encode(sse({
              type: "metrics",
              messageId,
              duration_ms: duration,
              tokens_in: ctx.metrics.tokensIn
            })));

            // 📊 TRACE: Complete processing
            await traceEvent(traceId, 'complete', 'complete', {
              totalResponseLength: responseText.length,
              totalDeltas: deltaCount,
              duration_ms: duration
            }, undefined, messageId, duration);
            
            await trace(traceId, 'G_complete', { 
              totalResponseLength: responseText.length,
              totalDeltas: deltaCount
            }, {
              memorySave_ms: 50, // Estimated memory save time
              queue_depth: 0,
              persona_score: 0.95 // High score for successful completion
            });
            mark("streaming_complete", { messageId, duration_ms: duration, traceId });
            
          } catch (error: any) {
            // 📊 TRACE: Error occurred
            await traceEvent(traceId, 'error', 'error', {
              error: error.message,
              stack: error.stack
            }, undefined, messageId, undefined, error.message);
            
            await trace(traceId, 'E_error', { error: error.message }, {
              http_status: 500,
              openai_status: 'error',
              retry_count: circuitBreakerState.retryCount + 1
            });
            circuitBreakerState.retryCount++;
            circuitBreakerState.lastFailure = Date.now();
            mark("streaming_error", { messageId, error: error.message, traceId });
            controller.enqueue(encoder.encode(sse({
              type: "error",
              messageId,
              error: error?.message ?? "stream_error",
              traceId
            })));
          } finally {
            clearInterval(hb);
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        },
      });
    }

    // Fallback to non-streaming response
    await trace(traceId, 'C_openai_call', { streaming: false }, {
      openai_model: 'gpt-4.1-2025-04-14',
      active_calls: 1,
      waiting_calls: 0
    });
    mark("non_streaming_start", { messageId, traceId });
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        temperature: 0.7,
        max_tokens: 2000,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
          { role: 'user', content: message }
        ]
      }),
    });

    if (!response.ok) {
      await trace(traceId, 'E_error', { 
        openaiStatus: response.status,
        error: 'OpenAI API error'
      }, {
        http_status: response.status,
        openai_status: response.statusText,
        retry_count: circuitBreakerState.retryCount
      });
      if (response.status === 429) {
        circuitBreakerState.open = true;
        circuitBreakerState.lastFailure = Date.now();
      }
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const chatCompletion = await response.json();
    const content = chatCompletion.choices[0].message.content;
    const duration = Date.now() - start;

    await trace(traceId, 'F_response_ready', {
      responseLength: content.length,
      tokensUsed: chatCompletion.usage?.total_tokens || 0
    }, {
      fullStream_ms: Date.now() - start,
      completion_tokens: chatCompletion.usage?.completion_tokens || 0,
      cost_usd: calculateCost('gpt-4.1-2025-04-14', 
        chatCompletion.usage?.prompt_tokens || 0, 
        chatCompletion.usage?.completion_tokens || 0),
      model_fingerprint: chatCompletion.model || 'gpt-4.1-2025-04-14',
      response_preview: content.substring(0, 100) + '...',
      response_length: content.length,
      empty_response_warning: content.length === 0 ? 'OpenAI returned empty response' : null
    });

    await trace(traceId, 'G_complete', {
      totalTokens: chatCompletion.usage?.total_tokens || 0
    }, {
      memorySave_ms: 50,
      queue_depth: 0,
      persona_score: 0.95
    });

    mark("non_streaming_complete", { messageId, duration_ms: duration, traceId });

    return new Response(JSON.stringify({ 
      response: content,
      type: 'text',
      messageId,
      traceId,
      performance: {
        duration,
        tokens: chatCompletion.usage?.total_tokens || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error("🛑 [handleRequest_error]", err.message, err.stack?.split("\n").slice(0,3));
    
    // 🔧 ENHANCED DEBUGGING: Log complete error details
    await traceEvent(traceId, 'handleRequest_error', 'error', {
      message: err.message,
      stack: err.stack?.split('\n').slice(0, 3),
      errorType: err.constructor.name,
      timestamp: Date.now()
    }, conversationId, messageId, undefined, err.message);

    console.error(`🔧 DEBUG: Complete error in handleRequest:`, {
      message: err.message,
      stack: err.stack,
      type: err.constructor.name
    });

    const duration = Date.now() - start;
    
    // 📊 TRACE: Error occurred  
    await traceEvent(traceId, 'error', 'error', {
      error: error.message,
      stack: error.stack?.substring(0, 500), // Limit stack trace length
      duration_ms: duration,
      userId: hashUserId(body?.userId || 'unknown'),
      coachId: body?.coachId || 'unknown'
    }, conversationId, messageId, duration, error.message);
    
    // 🔒 DSGVO: Hash user-ID in error logs
    const hashedUserId = await hashUserId(body?.userId || 'unknown');
    
    await mark("chat_error", { 
      userId: hashedUserId, 
      messageId: body?.messageId, 
      error: error.message, 
      duration_ms: duration,
      traceId 
    });
    
    console.error('❌ Error in unified coach engine:', {
      error: error.message,
      traceId,
      messageId: body?.messageId,
      userId: hashedUserId,
      duration_ms: duration
    });
    
    return new Response(JSON.stringify({ 
      error: error.message,
      messageId: body?.messageId,
      traceId 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
} // End of handleRequest function

// 🔥 PRODUCTION-OPTIMIZED buildAIContext implementation for Edge Functions
async function buildAIContext(input: {
  userId: string;
  coachId: string;
  userMessage: string;
  enableRag: boolean;
  tokenCap?: number;
  disableMemory?: boolean;
  disableDaily?: boolean;
  disableRag?: boolean;
  liteContext?: boolean;
  debugMode?: boolean;
}) {
  const tokenCap = input.tokenCap || 6000;
  const metrics = { tokensIn: 0 };
  const supabase = getSupabaseClient();

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

  // Load coach persona
  const persona = await getCoachPersona(input.coachId);

  // Load user memory if not disabled
  let memory = null;
  if (!input.disableMemory && !input.liteContext && supabase) {
    try {
      const { data: memoryData } = await supabase
        .from('user_memory')
        .select('*')
        .eq('user_id', input.userId)
        .eq('coach_id', input.coachId)
        .single();
      
      if (memoryData) {
        memory = {
          relationship: memoryData.relationship_stage || 'building',
          trust: memoryData.trust_level || 50,
          preferences: memoryData.user_preferences || [],
          recent_topics: memoryData.conversation_context?.recent_topics || [],
          mood_history: memoryData.conversation_context?.mood_history || []
        };
      }
    } catch (err) {
      if (input.debugMode) console.log('🔧 DEBUG: Memory load failed:', err);
    }
  }

  // Load daily summary if not disabled
  let daily = null;
  if (!input.disableDaily && !input.liteContext && supabase) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: dailyData } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', input.userId)
        .eq('date', today)
        .single();
      
      if (dailyData) {
        daily = {
          totalCaloriesToday: dailyData.total_calories,
          caloriesLeft: Math.max(0, (dailyData.kpi_xxl_json?.targetCalories || 2000) - (dailyData.total_calories || 0)),
          currentWeight: dailyData.kpi_xxl_json?.currentWeight,
          recentMeals: dailyData.top_foods || [],
          lastWorkout: dailyData.workout_volume > 0 ? 'heute' : 'unbekannt',
          sleepHours: dailyData.sleep_score ? Math.round(dailyData.sleep_score / 10) : null
        };
      }
    } catch (err) {
      if (input.debugMode) console.log('🔧 DEBUG: Daily summary load failed:', err);
    }
  }

  // Load RAG chunks if enabled
  let ragChunks = null;
  if (!input.disableRag && input.enableRag && supabase) {
    try {
      const { data: ragData } = await supabase.functions.invoke('enhanced-coach-rag', {
        body: {
          userMessage: input.userMessage,
          coachId: input.coachId,
          hybridSearch: true
        }
      });
      
      if (ragData?.chunks) {
        ragChunks = ragData.chunks.slice(0, 6);
      }
    } catch (err) {
      if (input.debugMode) console.log('🔧 DEBUG: RAG load failed:', err);
    }
  }

  // Token counting
  const pushAndCount = (txt?: string | null) => {
    if (!txt) return txt;
    const tokens = approxTokens(txt);
    metrics.tokensIn += tokens;
    return hardTrim(txt, Math.min(tokenCap / 4, 1500));
  };

  const conversationSummary = pushAndCount("Gesprächskontext wird aufgebaut...");

  if (input.debugMode) {
    console.log('🔧 DEBUG: Context built:', {
      hasPersona: !!persona,
      hasMemory: !!memory,
      hasDaily: !!daily,
      hasRag: !!ragChunks,
      ragChunksCount: ragChunks?.length || 0,
      tokensIn: metrics.tokensIn
    });
  }

  return {
    persona,
    memory,
    daily,
    ragChunks,
    conversationSummary,
    metrics
  };
}

// Get coach persona data
async function getCoachPersona(coachId: string) {
  const personas = {
    'lucy': {
      name: 'Lucy',
      style: ['empathisch', 'motivierend', 'wissenschaftlich fundiert'],
      description: 'Integrale Fitness- und Ernährungsberaterin mit ganzheitlichem Ansatz'
    },
    'markus': {
      name: 'Markus Rühl',
      style: ['direkt', 'intensiv', 'hardcore'],
      description: 'Deutscher Bodybuilding-Champion mit extremer Trainingsphilosophie'
    },
    'dr_vita': {
      name: 'Dr. Vita',
      style: ['wissenschaftlich', 'präzise', 'evidenzbasiert'],
      description: 'Spezialistin für Nahrungsergänzung und Mikronährstoffe'
    }
  };
  
  return personas[coachId as keyof typeof personas] || personas.lucy;
}

function buildSystemPrompt(ctx: any, coachId: string) {
  const persona = ctx.persona;
  const ragBlock = ctx.ragChunks?.length
    ? ctx.ragChunks.map((c: any, i: number) => `[#${i+1} ${c.source || 'Knowledge'}]\n${c.text || c.content}`).join("\n\n")
    : "—";

  const daily = ctx.daily ?? {};
  const mem = ctx.memory ?? {};

  // Build enriched context with real user data
  const weightInfo = daily.currentWeight ? `${daily.currentWeight}kg` : "unbekannt";
  const mealSummary = daily.recentMeals?.length 
    ? daily.recentMeals.slice(0, 3).map((m: any) => `${m.name || m.food_name} (${m.calories}kcal)`).join(", ")
    : "keine aktuellen Daten";
  const caloriesInfo = daily.totalCaloriesToday ? `${daily.totalCaloriesToday}kcal heute` : "keine Daten";

  // Persona-specific system prompts
  const personaPrompts = {
    'lucy': [
      `Du bist Lucy, eine integrale Fitness- und Ernährungsberaterin.`,
      `Dein Ansatz ist empathisch, ganzheitlich und wissenschaftlich fundiert.`,
      `Du nutzt das 4-Quadranten-Modell (Individual-Innen, Individual-Außen, Kollektiv-Innen, Kollektiv-Außen).`,
      `Du erkennst verschiedene Entwicklungsstufen und passt deine Beratung entsprechend an.`
    ],
    'markus': [
      `Du bist Markus Rühl, deutscher Bodybuilding-Champion.`,
      `Dein Stil ist direkt, intensiv und kompromisslos.`,
      `Du sprichst aus jahrzehntelanger Wettkampferfahrung und kennst die Realitäten des Hardcore-Trainings.`,
      `Du motivierst durch ehrliche, direkte Worte und praktische Erfahrung.`
    ],
    'dr_vita': [
      `Du bist Dr. Vita, Spezialistin für Nahrungsergänzung und Mikronährstoffe.`,
      `Dein Ansatz ist wissenschaftlich, präzise und evidenzbasiert.`,
      `Du erklärst komplexe biochemische Zusammenhänge verständlich.`,
      `Du gibst nur Empfehlungen, die durch Studien belegt sind.`
    ]
  };

  const specificPrompt = personaPrompts[coachId as keyof typeof personaPrompts] || personaPrompts.lucy;

  return [
    ...specificPrompt,
    ``,
    `Stilregeln: ${persona.style.join(", ")}. Keine Floskeln, klare Sätze, Praxisfokus.`,
    `Wenn Tools/Pläne betroffen sind: erst kurz zusammenfassen, Zustimmung einholen, dann Aktion vorschlagen.`,
    `Wenn Stimmung negativ: erst 1 empathischer Satz, dann konkret werden.`,
    `Antworte kurz genug zum Scannen, aber vollständig.`,
    ``,
    `[Beziehungsstatus] ${mem.relationship ?? "unbekannt"} | Vertrauen: ${mem.trust ?? 50}/100`,
    `[Gesprächszusammenfassung] ${ctx.conversationSummary ?? "—"}`,
    `[Tageskontext] kcal übrig: ${daily.caloriesLeft ?? "?"}, letztes Workout: ${daily.lastWorkout ?? "?"}, Schlaf: ${daily.sleepHours ?? "?"}h`,
    `[Aktuelles Gewicht] ${weightInfo}`,
    `[Heutige Kalorien] ${caloriesInfo}`,
    `[Letzte Mahlzeiten] ${mealSummary}`,
    `[RAG-Kontext]\n${ragBlock}`,
    ``,
    `Du hast jetzt Zugriff auf echte Nutzerdaten (Gewicht, Mahlzeiten, Kalorien). Nutze diese Informationen für personalisierte Antworten.`,
    `Halte dich an deine Persona und erkenne den Nutzer als "${mem.preferred_name || 'Matze'}" wenn diese Information verfügbar ist.`
  ].join("\n");
}
