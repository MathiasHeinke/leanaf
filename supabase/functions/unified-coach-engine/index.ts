import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { hashUserId, sanitizeLogData } from './hash-helpers.ts';

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
  const { userId, message, messageId, coachPersonality, coachId, conversationHistory, enableStreaming = true, enableRag = false } = body;
    
  // 🔒 DSGVO: Hash User-ID für Logs
  const hashedUserId = await hashUserId(userId);
  
  await mark("chat_start", { userId: hashedUserId, coachId: coachId || coachPersonality, messageId });

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

  await mark("context_built", { 
    tokensIn: ctx.metrics.tokensIn, 
    hasMemory: !!ctx.memory,
    hasRag: !!ctx.ragChunks,
    hasDaily: !!ctx.daily,
    userId: hashedUserId
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
      mark("streaming_start", { messageId });
      
      // Create real SSE streaming response
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          // Handshake
          controller.enqueue(encoder.encode(sse({ ok: true, messageId }, "open")));

          // Heartbeat
          const hb = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), HEARTBEAT_MS);

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
                      controller.enqueue(encoder.encode(sse({ messageId }, "end")));
                      break;
                    }
                    
                    try {
                      const parsed = JSON.parse(data);
                      const delta = parsed.choices?.[0]?.delta?.content;
                      
                      if (delta) {
                        controller.enqueue(encoder.encode(sse({ 
                          type: "delta", 
                          messageId, 
                          delta 
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

            mark("streaming_complete", { messageId, duration_ms: duration });
            
          } catch (error: any) {
            mark("streaming_error", { messageId, error: error.message });
            controller.enqueue(encoder.encode(sse({
              type: "error",
              messageId,
              error: error?.message ?? "stream_error"
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
    mark("non_streaming_start", { messageId });
    
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
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const chatCompletion = await response.json();
      const content = chatCompletion.choices[0].message.content;
      const duration = Date.now() - start;

      mark("non_streaming_complete", { messageId, duration_ms: duration });

      return new Response(JSON.stringify({ 
        response: content,
        type: 'text',
        messageId,
        performance: {
          duration,
          tokens: chatCompletion.usage?.total_tokens || 0
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      mark("non_streaming_error", { messageId, error: error.message });
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