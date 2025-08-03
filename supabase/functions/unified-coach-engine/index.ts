import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { TASK_CONFIGS, callOpenAIWithRetry, logPerformanceMetrics } from '../_shared/openai-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, message, conversationHistory, coachPersonality, enableStreaming = true } = await req.json();

    if (!userId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Validate API key
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build system message with coach personality
    const systemMessage = `Du bist ein persönlicher AI-Coach mit folgender Persönlichkeit: ${coachPersonality || 'empathisch und motivierend'}.

Antworte hilfreich, persönlich und motivierend. Nutze die Gesprächshistorie für besseren Kontext.`;

    // Prepare messages for OpenAI
    const messages = [];
    
    // Add conversation history if available (last 6 messages for context)
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
    
    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });

    const startTime = Date.now();
    
    // Configure for streaming or regular response
    const config = TASK_CONFIGS['unified-coach-engine'];
    
    if (enableStreaming) {
      console.log('🚀 Starting streaming response...');
      
      // Create streaming response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send initial connection message
            controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-4.1-2025-04-14',
                messages: [
                  { role: 'system', content: systemMessage },
                  ...messages
                ],
                temperature: config.temperature,
                top_p: config.top_p,
                stream: true,
                max_tokens: 1500,
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
                      try {
                        controller.enqueue(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                      } catch (e) {
                        console.log('Stream already closed');
                      }
                      break;
                    }
                    
                    try {
                      const parsed = JSON.parse(data);
                      const content = parsed.choices?.[0]?.delta?.content;
                      
                      if (content) {
                        try {
                          controller.enqueue(`data: ${JSON.stringify({ 
                            type: 'content', 
                            content 
                          })}\n\n`);
                        } catch (e) {
                          console.log('Stream already closed');
                          break;
                        }
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

            // Log performance
            const duration = Date.now() - startTime;
            logPerformanceMetrics('unified-coach-engine-streaming', duration, 0);
            
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.enqueue(`data: ${JSON.stringify({ 
              type: 'error', 
              error: error.message 
            })}\n\n`);
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
    }

    // Fallback to non-streaming response
    console.log('📄 Using non-streaming response...');
    
    // Add 30 second timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
    );

    const chatCompletion = await Promise.race([
      callOpenAIWithRetry({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemMessage },
          ...messages
        ],
        ...config,
        stream: false,
        max_tokens: 1500,
      }),
      timeoutPromise
    ]);

    const content = chatCompletion.choices[0].message.content;
    const duration = Date.now() - startTime;

    // Log performance metrics
    logPerformanceMetrics('unified-coach-engine', duration, chatCompletion.usage?.total_tokens || 0);

    return new Response(JSON.stringify({ 
      response: content,
      type: 'text',
      performance: {
        duration,
        tokens: chatCompletion.usage?.total_tokens || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in unified coach engine:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});