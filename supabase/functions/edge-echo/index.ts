import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-trace-id, x-source, x-client-event-id, x-retry, x-chat-mode, x-user-timezone, x-current-date, prefer, accept, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  const startTime = Date.now()
  const origin = req.headers.get('origin') || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  
  console.log(`🔍 Edge-Echo: ${req.method} from ${origin}`)
  console.log(`🔍 User-Agent: ${userAgent.substring(0, 100)}`)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const requestedHeaders = req.headers.get('access-control-request-headers') || 'none'
    const requestedMethod = req.headers.get('access-control-request-method') || 'none'
    
    console.log(`🔍 PREFLIGHT - Requested Headers: ${requestedHeaders}`)
    console.log(`🔍 PREFLIGHT - Requested Method: ${requestedMethod}`)
    console.log(`🔍 PREFLIGHT - Origin: ${origin}`)
    
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    // Echo all headers back
    const allHeaders: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      allHeaders[key] = value
    })

    const hasAuth = req.headers.has('authorization')
    const authStart = hasAuth ? req.headers.get('authorization')?.substring(0, 12) : 'none'
    
    console.log(`🔍 POST Headers received:`)
    console.log(`🔍 - authorization: ${hasAuth ? 'present' : 'missing'} (${authStart})`)
    console.log(`🔍 - content-type: ${req.headers.get('content-type') || 'missing'}`)
    console.log(`🔍 - x-client-info: ${req.headers.get('x-client-info') || 'missing'}`)
    console.log(`🔍 - x-trace-id: ${req.headers.get('x-trace-id') || 'missing'}`)

    let bodyText = ''
    try {
      bodyText = await req.text()
      console.log(`🔍 Body length: ${bodyText.length}`)
    } catch (e) {
      console.log(`🔍 Body read error: ${e}`)
    }

    const response = {
      timestamp: new Date().toISOString(),
      method: req.method,
      origin,
      userAgent: userAgent.substring(0, 100),
      headers: allHeaders,
      bodyLength: bodyText.length,
      processingTime: Date.now() - startTime,
      echo: 'success'
    }

    console.log(`🔍 Echo complete in ${Date.now() - startTime}ms`)

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('🔍 Echo error:', error)
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({
      error: message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
  }
})