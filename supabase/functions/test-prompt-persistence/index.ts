import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { prompt, step = 'test_prompt', traceId = `test_${Date.now()}` } = await req.json();

    // Test saving a prompt to trace events
    const { error } = await supabase.from('coach_trace_events').insert({
      trace_id: traceId,
      step: step,
      status: 'complete',
      data: {
        test: true,
        timestamp: new Date().toISOString()
      },
      full_prompt: prompt
    });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Prompt saved successfully',
      traceId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in test-prompt-persistence:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});