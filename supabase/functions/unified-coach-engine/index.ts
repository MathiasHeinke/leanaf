import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { hashUserId, sanitizeLogData } from './hash-helpers.ts';

// Trace utilities for request tracking
function newTraceId(): string {
  return `t_${Math.random().toString(36).substring(2, 12)}`;
}

async function trace(traceId: string, stage: string, payload: Record<string, any> = {}): Promise<void> {
  console.log(JSON.stringify({ 
    ts: Date.now(), 
    event: 'trace', 
    traceId, 
    stage, 
    ...sanitizeLogData(payload)
  }));
  
  // Fire-and-forget to Supabase
  try {
    const supabase = createClient(
      'https://gzczjscctgyxjyodhnhk.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc0Nzk4MiwiZXhwIjoyMDY4MzIzOTgyfQ.c1pPZNMFb9TK8x8sfzcnCMgpJaKcVYRBsrBYGHqfvMU'
    );
    
    await supabase.from('coach_traces').insert({
      trace_id: traceId,
      ts: new Date().toISOString(),
      stage,
      data: payload
    });
  } catch (error) {
    // Silent fail - tracing should never break the main flow
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
  // 🔒 Enhanced CORS Headers für alle HTTP-Methoden
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

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
    
  // 🔒 DSGVO: Hash User-ID für Logs
  const hashedUserId = await hashUserId(userId);
  
  await trace(traceId, 'A_received', { 
    userId: hashedUserId,
    coachId: coachId || coachPersonality || 'unknown',
    enableStreaming,
    enableRag
  });
  
  await mark("chat_start", { userId: hashedUserId, coachId: coachId || coachPersonality, messageId, traceId });

  if (!userId || !message || !messageId) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters: userId, message, messageId' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate API key
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 🔥 PRODUCTION-OPTIMIZED: Build AI context with 6k token limit
  const ctx = await buildAIContext({
    userId,
    coachId: coachId || coachPersonality || 'lucy',
    userMessage: message,
    enableRag,
    tokenCap: 6000 // Reduced from 8k based on usage analytics
  });

  await trace(traceId, 'B_context_ready', { 
    tokensIn: ctx.metrics.tokensIn, 
    hasMemory: !!ctx.memory,
    hasRag: !!ctx.ragChunks,
    hasDaily: !!ctx.daily
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
      await trace(traceId, 'C_openai_call', { streaming: true });
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
                'Authorization': `Bearer ${apiKey}`,
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

            const decoder = new TextDecoder();
            let buffer = '';

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    
                    if (data === '[DONE]') {
                      await trace(traceId, 'F_streaming_done', { 
                        responseLength: responseText.length,
                        deltaCount 
                      });
                      controller.enqueue(encoder.encode(sse({ messageId, traceId }, "end")));
                      break;
                    }
                    
                    try {
                      const parsed = JSON.parse(data);
                      const delta = parsed.choices?.[0]?.delta?.content;
                      
                      if (delta) {
                        responseText += delta;
                        deltaCount++;
                        
                        // Log first few deltas for debugging
                        if (deltaCount <= 3) {
                          await trace(traceId, 'D_delta', { 
                            chunk: delta.slice(0, 20),
                            deltaCount 
                          });
                        }
                        
                        controller.enqueue(encoder.encode(sse({ 
                          type: "delta", 
                          messageId, 
                          delta,
                          traceId
                        })));
                      }
                    } catch (e) {
                      // Skip invalid JSON
                    }
                  }
                }
              }
            } finally {
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

            await trace(traceId, 'G_complete', { 
              totalResponseLength: responseText.length,
              totalDeltas: deltaCount
            });
            mark("streaming_complete", { messageId, duration_ms: duration, traceId });
            
          } catch (error: any) {
            await trace(traceId, 'E_error', { error: error.message });
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
    await trace(traceId, 'C_openai_call', { streaming: false });
    mark("non_streaming_start", { messageId, traceId });
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
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
        });
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const chatCompletion = await response.json();
      const content = chatCompletion.choices[0].message.content;
      const duration = Date.now() - start;

      await trace(traceId, 'F_response_ready', {
        responseLength: content.length,
        tokensUsed: chatCompletion.usage?.total_tokens || 0
      });

      await trace(traceId, 'G_complete', {
        totalTokens: chatCompletion.usage?.total_tokens || 0
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
      await trace(traceId, 'E_error', { error: error.message });
      mark("non_streaming_error", { messageId, error: error.message, traceId });
      throw error;
    }

  } catch (error: any) {
    const duration = Date.now() - start;
    
    // 🔒 DSGVO: Hash user-ID in error logs
    const hashedUserId = await hashUserId(body?.userId || 'unknown');
    
    await mark("chat_error", { 
      userId: hashedUserId, 
      messageId: body?.messageId, 
      error: error.message, 
      duration_ms: duration 
    });
    console.error('Error in unified coach engine:', error);
    return new Response(JSON.stringify({ error: error.message }), {
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

  const trim = (txt?: string | null) => {
    if (!txt) return txt;
    metrics.tokensIn += approxTokens(txt);
    return hardTrim(txt, tokenCap);
  };

  return {
    persona,
    memory,
    daily,
    ragChunks: ragChunks?.slice(0, 6) ?? null,
    conversationSummary: trim("Gesprächskontext wird aufgebaut..."),
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