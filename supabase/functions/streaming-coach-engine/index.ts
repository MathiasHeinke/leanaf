import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { TASK_CONFIGS, callOpenAIWithRetry, logPerformanceMetrics } from '../_shared/openai-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, message, coachId, conversationHistory } = await req.json();

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

    // Create response stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Get coach data
          const { data: coach } = await supabase
            .from('coaches')
            .select('*')
            .eq('id', coachId || 'lucy')
            .single();

          // Build context (simplified for streaming)
          const systemMessage = `Du bist ${coach?.name || 'Lucy'}, ein persönlicher Coach.
          
Persönlichkeit: ${coach?.personality || 'empathisch und motivierend'}
Expertise: ${coach?.expertise?.join(', ') || 'Allgemeine Gesundheit'}

Antworte hilfreich und persönlich auf die Nachricht des Nutzers.`;

          const config = TASK_CONFIGS['coach_analysis'];
          
          // Stream response
          const response = await callOpenAIWithRetry({
            model: 'gpt-4.1-2025-04-14',
            messages: [
              { role: 'system', content: systemMessage },
              ...conversationHistory?.slice(-4) || [], // Last 4 messages for context
              { role: 'user', content: message }
            ],
            ...config,
            stream: true
          });

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
                      controller.enqueue(`data: {"type":"done"}\n\n`);
                      controller.close();
                      return;
                    }
                    
                    try {
                      const parsed = JSON.parse(data);
                      const content = parsed.choices?.[0]?.delta?.content;
                      
                      if (content) {
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});