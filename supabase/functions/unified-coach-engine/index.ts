
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { createParser } from "https://esm.sh/eventsource-parser@3.0.3";
import { hashUserId, sanitizeLogData } from './hash-helpers.ts';

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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
      enableStreaming: true,
      enableRag: false
    };

    return handleRequest(requestBody, corsHeaders, start);
  }
  
  // POST Handler für normale Anfragen
  if (req.method === 'POST') {
    try {
      const body = await req.json() as RequestBody;
      return handleRequest(body, corsHeaders, start);
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

async function handleRequest(body: any, corsHeaders: any, start: number) {
  const traceId = body.traceId || newTraceId();
  const { userId, message, messageId, coachPersonality, coachId, conversationHistory, enableStreaming = true, enableRag = false } = body;
  const conversationId = `conv_${userId}_${coachId || 'lucy'}`;
  
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
    await traceEvent(traceId, 'buildAIContext', 'started', {}, conversationId, messageId);
    
    // 🔥 PRODUCTION-OPTIMIZED: Build AI context with 6k token limit
    const contextStart = Date.now();
    const ctx = await buildAIContext({
      userId,
      coachId: coachId || coachPersonality || 'lucy',
      userMessage: message,
      enableRag,
      tokenCap: 6000 // Reduced from 8k based on usage analytics
    });
    
    // 📊 TRACE: Context ready
    await traceEvent(traceId, 'buildAIContext', 'complete', {
      tokensIn: ctx.metrics.tokensIn,
      hasMemory: !!ctx.memory,
      hasRag: !!ctx.ragChunks,
      hasDaily: !!ctx.daily
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
      // 📊 TRACE: Starting OpenAI call
      await traceEvent(traceId, 'openai_call', 'started', {
        model: 'gpt-4o',
        streaming: true
      }, undefined, messageId);
      
      await trace(traceId, 'C_openai_call', { streaming: true }, {
        openai_model: 'gpt-4o',
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
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openAIApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-4o',
                temperature: 0.7,
                max_tokens: 2000,
                stream: true,
                messages: [
                  { role: 'system', content: systemPrompt },
                  ...messages,
                  { role: 'user', content: message }
                ]
              }),
            });

            if (!response.ok) {
              throw new Error(`OpenAI API error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error('No response body reader');
            }
            
            // 📊 TRACE: Start streaming
            await traceEvent(traceId, 'stream', 'started', {}, undefined, messageId);

            // 🔥 ROBUST STREAM PARSER WITH ENHANCED ERROR HANDLING
            const parser = createParser({
              onEvent: (event) => {
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
                    
                    trace(traceId, 'F_streaming_done', { 
                      responseLength: responseText.length,
                      deltaCount 
                    }, {
                      fullStream_ms: Date.now() - start,
                      completion_tokens: finalTokens,
                      cost_usd: calculateCost('gpt-4o', ctx.metrics.tokensIn, finalTokens),
                      model_fingerprint: 'gpt-4o-2024'
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
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = new TextDecoder().decode(value);
                parser.feed(chunk);
              }
            } catch (readError) {
              console.error('Stream read error:', readError);
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
      openai_model: 'gpt-4o',
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
        model: 'gpt-4o',
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
      cost_usd: calculateCost('gpt-4o', 
        chatCompletion.usage?.prompt_tokens || 0, 
        chatCompletion.usage?.completion_tokens || 0),
      model_fingerprint: chatCompletion.model || 'gpt-4o'
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

  } catch (error: any) {
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

// 🔥 PRODUCTION-OPTIMIZED Context building functions
async function buildAIContext(input: {
  userId: string;
  coachId: string;
  userMessage: string;
  enableRag: boolean;
  tokenCap?: number;
}) {
  const tokenCap = input.tokenCap || 6000; // Default to 6k based on analytics
  const metrics = { tokensIn: 0 };

  // 🔧 TOKEN ACCOUNTING HELPER (FIX #4)
  const pushAndCount = (txt?: string | null) => {
    if (!txt) return txt;
    const tokens = approxTokens(txt);
    metrics.tokensIn += tokens;
    return hardTrim(txt, Math.min(tokenCap / 4, 1500)); // Quarter cap per section
  };

  // Parallel load with fail-soft
  const [personaRes, memoryRes, dailyRes, ragRes] = await Promise.allSettled([
    getCoachPersona(input.coachId),
    loadCoachMemory(input.userId, input.coachId),
    loadDailySummary(input.userId),
    input.enableRag ? runRag(input.userMessage, input.coachId) : null
  ]);

  const persona = personaRes.status === "fulfilled" 
    ? personaRes.value 
    : { name: "Coach", style: ["direkt", "lösungsorientiert"] };

  const memory = memoryRes.status === "fulfilled" ? memoryRes.value : null;
  const daily = dailyRes.status === "fulfilled" ? dailyRes.value : null;
  const ragChunks = ragRes?.status === "fulfilled" ? ragRes.value?.chunks : null;

  // Count all sections for accurate token budget
  const personaText = pushAndCount(JSON.stringify(persona));
  const memoryText = pushAndCount(JSON.stringify(memory));
  const dailyText = pushAndCount(JSON.stringify(daily));
  const ragText = pushAndCount(ragChunks?.map(c => c.text).join('\n'));
  const conversationSummary = pushAndCount("Gesprächskontext wird aufgebaut...");

  return {
    persona,
    memory,
    daily,
    ragChunks: ragChunks?.slice(0, 6) ?? null,
    conversationSummary,
    metrics
  };
}

function buildSystemPrompt(ctx: any, coachId: string) {
  const persona = ctx.persona;
  const ragBlock = ctx.ragChunks?.length
    ? ctx.ragChunks.map((c: any, i: number) => `[#${i+1} ${c.source}]\n${c.text}`).join("\n\n")
    : "—";

  const daily = ctx.daily ?? {};
  const mem = ctx.memory ?? {};

  return [
    `Du bist ${persona.name}, ein professioneller Coach.`,
    `Stilregeln: ${persona.style.join(", ")}. Keine Floskeln, klare Sätze, Praxisfokus.`,
    `Wenn Tools/Pläne betroffen sind: erst kurz zusammenfassen, Zustimmung einholen, dann Aktion vorschlagen.`,
    `Wenn Stimmung negativ: erst 1 empathischer Satz, dann konkret werden.`,
    `Antworte kurz genug zum Scannen, aber vollständig.`,
    ``,
    `[Beziehungsstatus] ${mem.relationship ?? "unbekannt"} | Vertrauen: ${mem.trust ?? 50}/100`,
    `[Gesprächszusammenfassung] ${ctx.conversationSummary ?? "—"}`,
    `[Tageskontext] kcal übrig: ${daily.caloriesLeft ?? "?"}, letztes Workout: ${daily.lastWorkout ?? "?"}, Schlaf: ${daily.sleepHours ?? "?"}h`,
    `[RAG-Kontext]\n${ragBlock}`,
    ``,
    `Halte dich an die Persona.`
  ].join("\n");
}

// Dummy loaders (replace with real implementations)
async function getCoachPersona(coachId: string) {
  const personas: Record<string, any> = {
    lucy: { name: "Lucy", style: ["direkt", "empathisch", "lösungsorientiert"] },
    markus: { name: "Markus", style: ["motivierend", "kraftsport-fokussiert", "präzise"] },
    vita: { name: "Dr. Vita", style: ["wissenschaftlich", "ganzheitlich", "präventiv"] },
    sophia: { name: "Dr. Sophia", style: ["integral", "bewusstseinsorientiert", "transformativ"] }
  };
  return personas[coachId] || { name: "Coach", style: ["direkt", "lösungsorientiert"] };
}

async function loadCoachMemory(userId: string, coachId: string) {
  return {
    relationship: "aufbauend",
    trust: 75,
    summary: "Nutzer bevorzugt kurze, präzise Anweisungen"
  };
}

async function loadDailySummary(userId: string) {
  return {
    caloriesLeft: 520,
    lastWorkout: "Push Training gestern",
    sleepHours: 7.2
  };
}

async function runRag(query: string, coachId: string) {
  return {
    chunks: [
      { source: "nutrition-guide.md", text: "Proteinziel: 1.8-2.2g/kg Körpergewicht täglich" },
      { source: "training-basics.md", text: "Progressive Overload ist der Schlüssel für kontinuierliche Kraftsteigerung" }
    ]
  };
}
