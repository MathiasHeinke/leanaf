import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { 
  TASK_CONFIGS, 
  logTelemetryData, 
  calculateCost, 
  analyzeSentiment, 
  detectPII, 
  getCircuitBreakerStatus, 
  recordError,
  recordSuccess
} from '../_shared/openai-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const { userId, message, coachId, conversationHistory } = await req.json();

    if (!userId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate trace ID for telemetry
    const traceId = `coach_${userId}_${Date.now()}`;
    const requestStartTime = Date.now();
    
    // Log request start with user message
    await logTelemetryData(supabase, traceId, 'T_request_start', {
      user_id: userId,
      coach_id: coachId,
      user_message: message.substring(0, 200), // First 200 chars for privacy
      message_length: message.length,
      has_conversation_history: !!conversationHistory?.length,
      conversation_length: conversationHistory?.length || 0,
      conversation_history: conversationHistory ? JSON.stringify(conversationHistory.slice(-2)) : null, // Last 2 messages
      timestamp: new Date().toISOString(),
      ...getCircuitBreakerStatus()
    });

    // Create response stream with telemetry
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(`event: open\ndata: {"ok":true}\n\n`);
        
        let fullResponseText = '';
        let firstTokenTime: number | null = null;
        let inputTokens = 0;
        let outputTokens = 0;
        
        try {
          // Get coach data
          const { data: coach } = await supabase
            .from('coaches')
            .select('*')
            .eq('id', coachId || 'lucy')
            .single();

          // Log coach context retrieval
          await logTelemetryData(supabase, traceId, 'T_context_built', {
            coach_data: coach ? {
              name: coach.name,
              personality: coach.personality,
              expertise: coach.expertise
            } : null,
            context_source: 'coaches_table',
            context_size: JSON.stringify(coach || {}).length
          });

          // Build context
          const systemMessage = `Du bist ${coach?.name || 'Lucy'}, ein persönlicher Coach.
          
Persönlichkeit: ${coach?.personality || 'empathisch und motivierend'}
Expertise: ${coach?.expertise?.join(', ') || 'Allgemeine Gesundheit'}

Antworte hilfreich und persönlich auf die Nachricht des Nutzers.`;

          const messages = [
            { role: 'system', content: systemMessage },
            ...conversationHistory?.slice(-4) || [],
            { role: 'user', content: message }
          ];

          // Log complete prompt analysis
          await logTelemetryData(supabase, traceId, 'T_prompt_analysis', {
            system_message: systemMessage.substring(0, 300), // First 300 chars
            messages_count: messages.length,
            full_prompt_preview: JSON.stringify(messages).substring(0, 500),
            estimated_prompt_tokens: messages.reduce((sum, msg) => sum + (msg.content.length / 4), 0)
          });

          // Estimate input tokens
          inputTokens = messages.reduce((sum, msg) => sum + (msg.content.length / 4), 0);

          const config = TASK_CONFIGS['coach_analysis'];
          
          // Log OpenAI request details
          await logTelemetryData(supabase, traceId, 'T_openai_request', {
            model: 'gpt-4.1-2025-04-14',
            config: config,
            openai_request_body: JSON.stringify({
              model: 'gpt-4.1-2025-04-14',
              messages,
              ...config,
              stream: true
            }).substring(0, 1000), // First 1000 chars of request
            request_timestamp: new Date().toISOString()
          });
          
          // Make streaming request to OpenAI
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4.1-2025-04-14',
              messages,
              ...config,
              stream: true
            }),
          });

          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
          }

          if (response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            try {
              while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    
                    if (data === '[DONE]') {
                      // Stream complete - log final metrics and response content
                      const fullStreamTime = Date.now() - requestStartTime;
                      const cost = calculateCost('gpt-4.1-2025-04-14', inputTokens, outputTokens);
                      const sentiment = analyzeSentiment(fullResponseText);
                      const hasPII = detectPII(fullResponseText + message);
                      const tokensPerSecond = outputTokens > 0 ? (outputTokens / (fullStreamTime / 1000)) : 0;
                      const breaker = getCircuitBreakerStatus();

                      await logTelemetryData(supabase, traceId, 'T_stream_complete', {
                        fullStream_ms: fullStreamTime,
                        firstToken_ms: firstTokenTime,
                        prompt_tokens: inputTokens,
                        completion_tokens: outputTokens,
                        total_tokens: inputTokens + outputTokens,
                        cost_usd: cost,
                        sentiment_score: sentiment,
                        pii_detected: hasPII,
                        response_length: fullResponseText.length,
                        tokens_per_second: tokensPerSecond,
                        model: 'gpt-4.1-2025-04-14',
                        coach_id: coachId,
                        user_id: userId,
                        conversation_length: conversationHistory?.length || 0,
                        performance_grade: firstTokenTime < 1000 ? 'A' : firstTokenTime < 2000 ? 'B' : 'C',
                        coach_response: fullResponseText.substring(0, 300), // First 300 chars of response
                        response_preview: fullResponseText.length > 100 ? fullResponseText.substring(0, 100) + '...' : fullResponseText,
                        session_complete: true,
                        ...breaker
                      });

                      recordSuccess(); // Track successful completion
                      controller.enqueue(`data: {"type":"stream_done"}\n\n`);
                      controller.close();
                      return;
                    }
                    
                    try {
                      const parsed = JSON.parse(data);
                      const content = parsed.choices?.[0]?.delta?.content;
                      
                      if (content) {
                        // Track first token timing
                        if (firstTokenTime === null) {
                          firstTokenTime = Date.now() - requestStartTime;
                          await logTelemetryData(supabase, traceId, 'T_first_token', {
                            firstToken_ms: firstTokenTime,
                            model: 'gpt-4.1-2025-04-14',
                            coach_id: coachId,
                            user_id: userId,
                            ...getCircuitBreakerStatus()
                          });
                        }
                        
                        fullResponseText += content;
                        outputTokens += content.length / 4; // Rough token estimation
                        
                        controller.enqueue(`data: {"type":"content","content":${JSON.stringify(content)}}\n\n`);
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
          }
        } catch (error) {
          console.error('Streaming error:', error);
          recordError();
          
          // Log error
          await logTelemetryData(supabase, traceId, 'E_error', {
            error_message: error.message,
            error_type: 'streaming_error',
            duration_ms: Date.now() - requestStartTime,
            ...getCircuitBreakerStatus()
          });
          
          controller.enqueue(`data: {"type":"error","error":"${error.message}"}\n\n`);
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Request error:', error);
    recordError();
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});