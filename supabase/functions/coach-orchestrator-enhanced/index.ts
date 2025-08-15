import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// EMERGENCY ROLLBACK: Minimal function to test basic connectivity
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-chat-mode, x-trace-id, x-source",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log(`[EMERGENCY-ROLLBACK] Request received: ${req.method}`);
  
  if (req.method === "OPTIONS") {
    console.log('[EMERGENCY-ROLLBACK] Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    console.log('[EMERGENCY-ROLLBACK] Body parsed successfully');
    
    const event = body?.event;
    if (!event) {
      console.log('[EMERGENCY-ROLLBACK] Missing event in body');
      return new Response(JSON.stringify({ error: "Missing event" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Simple hardcoded response for testing
    const reply = {
      kind: "message",
      text: "ARES Emergency System Online. Basic functionality restored. Ready for incremental feature restoration.",
      traceId: crypto.randomUUID()
    };

    console.log('[EMERGENCY-ROLLBACK] Returning basic response');
    return new Response(JSON.stringify(reply), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('[EMERGENCY-ROLLBACK] Error:', error);
    return new Response(JSON.stringify({ 
      error: "Emergency rollback error", 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});