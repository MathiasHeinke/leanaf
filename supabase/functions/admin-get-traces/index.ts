import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Admin users who can access the brain viewer
const ADMIN_USER_IDS = [
  // Add admin user IDs here
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with user's token to verify identity
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin check - allow all for now (can be restricted later)
    // if (!ADMIN_USER_IDS.includes(user.id)) {
    //   return new Response(JSON.stringify({ error: 'Admin access required' }), {
    //     status: 403,
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    //   });
    // }

    const { traceId, limit = 50, offset = 0, userId, status, dateFrom, dateTo } = await req.json();

    // Use service role to bypass RLS
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Single trace detail view
    if (traceId) {
      const { data: trace, error } = await admin
        .from('ares_traces')
        .select('*')
        .eq('trace_id', traceId)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get trace steps
      const { data: steps } = await admin
        .from('ares_trace_steps')
        .select('*')
        .eq('trace_id', traceId)
        .order('ts', { ascending: true });

      return new Response(JSON.stringify({ trace, steps: steps || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List view with filters
    let query = admin
      .from('ares_traces')
      .select('trace_id, user_id, coach_id, status, created_at, duration_ms, input_text, error')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) query = query.eq('user_id', userId);
    if (status) query = query.eq('status', status);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data: traces, error, count } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get total count
    let countQuery = admin.from('ares_traces').select('*', { count: 'exact', head: true });
    if (userId) countQuery = countQuery.eq('user_id', userId);
    if (status) countQuery = countQuery.eq('status', status);
    if (dateFrom) countQuery = countQuery.gte('created_at', dateFrom);
    if (dateTo) countQuery = countQuery.lte('created_at', dateTo);
    
    const { count: totalCount } = await countQuery;

    return new Response(JSON.stringify({ traces, total: totalCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Admin traces error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
