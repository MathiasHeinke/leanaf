import { cors } from '../_shared/ares/cors.ts';
import { admin } from '../_shared/ares/supabase.ts';
import { getUser } from '../_shared/ares/auth.ts';

Deno.serve(async (req) => {
  const pre = cors.preflight(req); 
  if (pre) return pre;
  
  try {
    const user = await getUser(req);
    const email: string = user.email ?? user.user_metadata?.email ?? '';
    
    const domain = email.includes('@') ? email.split('@')[1] : '';
    const { data } = await admin
      .from('ares_feature_flags')
      .select('flag,enabled,role')
      .or(`email.eq.${email},email_domain.eq.${domain},role.in.(beta,staff,admin)`)
      .eq('enabled', true);
    
    // Konsolidiert zu Set
    const flags = (data || []).map(r => r.flag);
    return new Response(JSON.stringify({ flags }), { 
      headers: { ...cors.headers(), 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error('[ARES-FLAGS] Error:', error);
    return new Response(JSON.stringify({ flags: [] }), { 
      headers: { ...cors.headers(), 'Content-Type': 'application/json' }, 
      status: 200 
    });
  }
});