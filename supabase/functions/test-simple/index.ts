import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

serve(async (req) => {
  console.log(`🔧 SIMPLE TEST: ${req.method} request received`);
  
  if (req.method === 'OPTIONS') {
    console.log(`🔧 SIMPLE TEST: CORS preflight`);
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`🔧 SIMPLE TEST: Returning success response`);
  return new Response(JSON.stringify({
    success: true,
    message: "SIMPLE TEST: Function works!",
    timestamp: new Date().toISOString(),
    method: req.method
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});