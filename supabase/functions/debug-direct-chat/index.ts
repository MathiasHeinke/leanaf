import { serve } from "https://deno.land/std@0.205.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts"; // fetch-polyfill
import { 
  logTelemetryData, 
  calculateCost, 
  analyzeSentiment, 
  detectPII, 
  getCircuitBreakerStatus,
  recordError,
  recordSuccess
} from '../_shared/openai-config.ts';

// Debug Direct Chat v2.1 - Force Deployment
const supaUrl = Deno.env.get("SUPABASE_URL")!;
const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openKey = Deno.env.get("OPENAI_API_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, authorization, x-client-info, accept, accept-profile, content-profile",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { userId, message, coachId = "lucy", model = "gpt-4.1-2025-04-14" } = await req.json();
    if (!userId || !message) {
      return json(400, { error: "`userId` und `message` sind Pflicht." });
    }

    // Generate trace ID and start timer
    const traceId = `debug_${userId}_${Date.now()}`;
    const startTime = Date.now();

    console.log(`🔧 Debug-Direct-Chat: User ${userId}, Coach ${coachId}, Model ${model}, Message: ${message.substring(0, 50)}...`);

    const supa = createClient(supaUrl, supaKey, { auth: { persistSession: false } });
    
    // Log request start
    await logTelemetryData(supa, traceId, 'T_request_start', {
      user_id: userId,
      coach_id: coachId,
      model: model,
      message_length: message.length,
      function_name: 'debug-direct-chat',
      ...getCircuitBreakerStatus()
    });
    
    // Simplified coach personas for debugging
    const coachPersonas: Record<string, string> = {
      lucy: "Du bist Lucy, ein empathischer Ernährungs-Coach. Antworte freundlich und hilfreich.",
      sascha: "Du bist Sascha, ein motivierender Fitness-Coach. Antworte energisch und ermutigend.",
      sophia: "Du bist Dr. Sophia, eine integrale Gesundheitsexpertin. Antworte wissenschaftlich fundiert aber verständlich.",
      vita: "Du bist Dr. Vita Femina, Spezialistin für Frauengesundheit. Antworte einfühlsam und kompetent."
    };

    const systemPrompt = coachPersonas[coachId] ?? coachPersonas.lucy;

    // OpenAI API call with timing
    const apiStartTime = Date.now();
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${openKey}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`🔧 OpenAI-Error ${res.status}:`, errorText);
      
      // Log error
      await logTelemetryData(supa, traceId, 'E_error', {
        error_message: errorText,
        error_status: res.status,
        duration_ms: Date.now() - startTime,
        ...getCircuitBreakerStatus()
      });
      
      recordError(); // Track error for circuit breaker
      throw new Error(`OpenAI-Error ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content ?? "";
    const firstTokenTime = Date.now() - apiStartTime;
    const fullStreamTime = Date.now() - startTime;

    console.log(`🔧 OpenAI Response: ${answer.substring(0, 100)}... (${data.usage?.total_tokens} tokens)`);

    // Calculate telemetry metrics
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    const cost = calculateCost(model, inputTokens, outputTokens);
    const sentiment = analyzeSentiment(answer);
    const hasPII = detectPII(answer + message);
    const tokensPerSecond = outputTokens > 0 ? (outputTokens / (fullStreamTime / 1000)) : 0;
    const breaker = getCircuitBreakerStatus();

    // Log completion telemetry
    await logTelemetryData(supa, traceId, 'T_completion', {
      firstToken_ms: firstTokenTime,
      fullStream_ms: fullStreamTime,
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: data.usage?.total_tokens || 0,
      cost_usd: cost,
      sentiment_score: sentiment,
      pii_detected: hasPII,
      response_length: answer.length,
      tokens_per_second: tokensPerSecond,
      model: model,
      coach_id: coachId,
      user_id: userId,
      performance_grade: firstTokenTime < 1000 ? 'A' : firstTokenTime < 2000 ? 'B' : 'C',
      debug_mode: true,
      ...breaker
    });

    recordSuccess(); // Track successful completion

    // Legacy debug log
    try {
      await supa.from("debug_logs").insert({
        user_id: userId,
        coach_id: coachId,
        user_msg: message,
        assistant_msg: answer,
        tokens: data.usage?.total_tokens,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.warn("🔧 Debug log insert failed:", logError);
    }

    return json(200, {
      role: "assistant",
      content: answer,
      debug: { 
        tokens: data.usage?.total_tokens,
        model: model,
        firstToken_ms: firstTokenTime,
        fullStream_ms: fullStreamTime,
        cost_usd: cost,
        sentiment: sentiment,
        timestamp: new Date().toISOString()
      },
    });
  } catch (e) {
    console.error("🔧 DBG-Direct-Chat ❌", e);
    recordError(); // Track error for circuit breaker
    return json(500, { error: e.message ?? e });
  }
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}