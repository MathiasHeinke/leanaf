import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MonthlyRequest {
  userId: string;
  year?: number;
  month?: number;
  force?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, year, month, force = false }: MonthlyRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization') || '';
    const isInternal = req.headers.get('x-internal-call') === 'true';

    if (!isInternal) {
      // Verify JWT and user match
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authError } = await authClient.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (user.id !== userId) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: user mismatch' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Default to previous month if not specified
    const now = new Date();
    const targetYear = year || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
    const targetMonth = month || (now.getMonth() === 0 ? 12 : now.getMonth());

    console.log(`Generating monthly summary for user ${userId}, ${targetYear}-${targetMonth}`);

    // Check if summary already exists (unless force = true)
    if (!force) {
      const { data: existing, error: checkError } = await supabase
        .from('monthly_summaries')
        .select('id')
        .eq('user_id', userId)
        .eq('year', targetYear)
        .eq('month', targetMonth)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing summary:', checkError);
      }

      if (existing) {
        console.log(`Monthly summary already exists for ${targetYear}-${targetMonth}, skipping`);
        return new Response(
          JSON.stringify({ 
            status: 'skipped', 
            reason: 'already_exists',
            summary_id: existing.id 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Compute monthly summary using database function
    const { data: summaryData, error: computeError } = await supabase.rpc(
      'compute_monthly_summary',
      {
        p_user_id: userId,
        p_year: targetYear,
        p_month: targetMonth
      }
    );

    if (computeError) {
      console.error('Error computing monthly summary:', computeError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to compute monthly summary', 
          details: computeError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Monthly summary computed successfully:', {
      userId,
      year: targetYear,
      month: targetMonth,
      calories: summaryData?.nutrition?.total_calories || 0,
      workoutDays: summaryData?.training?.workout_days || 0
    });

    return new Response(
      JSON.stringify({
        status: 'success',
        data: summaryData,
        period: `${targetYear}-${String(targetMonth).padStart(2, '0')}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in generate-monthly-summary:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});