import { cors } from '../_shared/ares/cors.ts';
import { admin } from '../_shared/ares/supabase.ts';
import { getUser } from '../_shared/ares/auth.ts';

Deno.serve(async (req) => {
  const pre = cors.preflight(req); 
  if (pre) return pre;
  
  try {
    const user = await getUser(req);
    const { traceId, stage, data } = await req.json();
    
    if (!traceId || !stage) {
      return new Response('Bad Request: traceId and stage required', { 
        status: 400, 
        headers: cors.headers() 
      });
    }
    
    // Insert trace step
    await admin.from('ares_trace_steps').insert({
      trace_id: traceId,
      user_id: user.id,
      stage,
      data: data || null,
      ts: new Date().toISOString()
    });
    
    return new Response('ok', { headers: cors.headers() });
  } catch (error) {
    console.error('[ARES-TRACE-STEP] Error:', error);
    // Trace logging should never block main operations
    return new Response('ok', { headers: cors.headers() });
  }
});