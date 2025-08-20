import { cors } from '../_shared/ares/cors.ts';
import { admin } from '../_shared/ares/supabase.ts';
import { getUser } from '../_shared/ares/auth.ts';

Deno.serve(async (req) => {
  const pre = cors.preflight(req); 
  if (pre) return pre;
  
  try {
    const user = await getUser(req);
    const { events } = await req.json();
    
    if (!Array.isArray(events)) {
      return new Response('Bad Request', { 
        status: 400, 
        headers: cors.headers() 
      });
    }
    
    const rows = events.map((e: any) => ({
      user_id: user.id,
      trace_id: e.traceId ?? null,
      component: e.component,
      event: e.event,
      meta: e.meta ?? null
    }));
    
    if (rows.length) {
      await admin.from('ares_events').insert(rows);
    }
    
    return new Response('ok', { headers: cors.headers() });
  } catch (error) {
    console.error('[ARES-EVENTS] Error:', error);
    // Telemetry should never block UI
    return new Response('ok', { headers: cors.headers() });
  }
});