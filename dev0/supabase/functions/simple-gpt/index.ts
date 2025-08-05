import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

serve(async (req) => {
  console.log(`🚀 SIMPLE GPT: ${req.method} request received`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const message = body.message || 'Hallo';
      
      console.log(`🚀 SIMPLE GPT: Calling OpenAI with message: "${message.substring(0, 50)}..."`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: 'Du bist Lucy, ein freundlicher Fitness-Coach. Antworte kurz und hilfsbereit auf Deutsch.' 
            },
            { role: 'user', content: message }
          ],
          max_tokens: 500,
          temperature: 0.7
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      console.log(`🚀 SIMPLE GPT: Got response from OpenAI: "${aiResponse.substring(0, 50)}..."`);

      return new Response(JSON.stringify({ 
        response: aiResponse,
        success: true,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } catch (error) {
      console.error('🚀 SIMPLE GPT: Error:', error);
      return new Response(JSON.stringify({ 
        error: error.message,
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method not allowed', { 
    status: 405, 
    headers: corsHeaders 
  });
});