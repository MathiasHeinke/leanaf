import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-force-non-streaming, x-debug-mode',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

serve(async (req) => {
  console.log(`🔧 MINIMAL: ${req.method} request received`);
  
  if (req.method === 'OPTIONS') {
    console.log(`🔧 MINIMAL: CORS preflight`);
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log(`🔧 MINIMAL: Received message: "${body.message || 'no message'}"`);
      
      // Simple AI-like response
      const response = {
        response: `Hallo! Ich habe deine Nachricht "${body.message || 'test'}" erhalten. Ich bin derzeit im Test-Modus und kann noch keine echten AI-Antworten generieren, aber die Verbindung funktioniert! 🤖`,
        timestamp: new Date().toISOString(),
        success: true
      };
      
      console.log(`🔧 MINIMAL: Sending response`);
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error(`🔧 MINIMAL: Error:`, error);
      return new Response(JSON.stringify({
        error: `Fehler: ${error.message}`,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { 
    status: 405, 
    headers: corsHeaders 
  });
});