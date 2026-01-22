
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WeeklyRequest {
  userId: string;
  weekStart?: string; // ISO date string (Monday)
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

    const { userId, weekStart, force = false }: WeeklyRequest = await req.json();

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

    // Calculate week start (Monday) if not provided
    let targetWeekStart: Date;
    if (weekStart) {
      targetWeekStart = new Date(weekStart);
    } else {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
      targetWeekStart = new Date(now);
      targetWeekStart.setDate(now.getDate() + diff);
    }

    const weekStartStr = targetWeekStart.toISOString().split('T')[0];
    const isoWeek = getISOWeek(targetWeekStart);
    const isoYear = getISOYear(targetWeekStart);

    console.log(`Generating weekly summary for user ${userId}, week ${isoYear}-W${isoWeek}`);

    // Check if summary already exists (unless force = true)
    if (!force) {
      const { data: existing, error: checkError } = await supabase
        .from('weekly_summaries')
        .select('id')
        .eq('user_id', userId)
        .eq('iso_year', isoYear)
        .eq('iso_week', isoWeek)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing weekly summary:', checkError);
      }

      if (existing) {
        console.log(`Weekly summary already exists for ${isoYear}-W${isoWeek}, skipping`);
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

    // Compute weekly summary using database function
    const { data: summaryData, error: computeError } = await supabase.rpc(
      'compute_weekly_summary',
      {
        p_user_id: userId,
        p_week_start: weekStartStr
      }
    );

    if (computeError) {
      console.error('Error computing weekly summary:', computeError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to compute weekly summary', 
          details: computeError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Weekly summary computed successfully:', {
      userId,
      weekStart: weekStartStr,
      isoWeek,
      isoYear,
      calories: summaryData?.nutrition?.total_calories || 0,
      workoutDays: summaryData?.training?.workout_days || 0
    });

    return new Response(
      JSON.stringify({
        status: 'success',
        data: summaryData,
        period: `${isoYear}-W${isoWeek}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in generate-weekly-summary:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions for ISO week calculation
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getISOYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}
