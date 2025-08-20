
import { cors } from '../_shared/ares/cors.ts';
import { admin } from '../_shared/ares/supabase.ts';
import { getUser } from '../_shared/ares/auth.ts';

Deno.serve(async (req) => {
  const pre = cors.preflight(req);
  if (pre) return pre;

  const headers = cors.headers();
  try {
    const user = await getUser(req);
    const { traceId } = await req.json().catch(() => ({}));
    if (!traceId) {
      return new Response(JSON.stringify({ error: 'Bad Request' }), { status: 400, headers });
    }

    // Enable RLS debug read just for this connection/request
    await admin.rpc('set_config', { parameter: 'ares.debug_read', value: 'true', is_local: true as any });

    const { data, error } = await admin
      .from('ares_traces')
      .select('*')
      .eq('trace_id', traceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: 'ARES_E_TRACE_READ' }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ data }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'ARES_E_TRACE_READ' }), { status: 500, headers });
  }
});
