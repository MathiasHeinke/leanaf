import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-trace-id, x-source, x-client-event-id, x-retry, x-chat-mode, x-user-timezone, x-current-date, prefer, accept, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Extract token from Authorization header
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    
    if (!token) {
      return new Response(JSON.stringify({ 
        ok: false, 
        why: "no-token",
        headers: Object.fromEntries(req.headers.entries())
      }), { 
        status: 401, 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      });
    }

    // Verify token and get user
    const { data: user, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user?.user?.id) {
      return new Response(JSON.stringify({ 
        ok: false, 
        why: "invalid-token",
        error: userError?.message 
      }), { 
        status: 401, 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      });
    }

    const uid = user.user.id;

    // Check profile exists
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();

    // Check dashboard data access
    const { data: dailySummaries, error: summaryError } = await supabase
      .from("daily_summaries")
      .select("id, date, total_calories")
      .eq("user_id", uid)
      .order("date", { ascending: false })
      .limit(3);

    const { data: meals, error: mealsError } = await supabase
      .from("meals")
      .select("id, title, calories")
      .eq("user_id", uid)
      .limit(3);

    const { data: workouts, error: workoutsError } = await supabase
      .from("workouts")
      .select("id, date, did_workout")
      .eq("user_id", uid)
      .limit(3);

    const { data: fluids, error: fluidsError } = await supabase
      .from("user_fluids")
      .select("id, amount_ml, date")
      .eq("user_id", uid)
      .limit(3);

    return new Response(JSON.stringify({
      ok: true,
      uid,
      profile: {
        exists: !!profile,
        id: profile?.id || null,
        error: profileError?.message || null
      },
      data_access: {
        daily_summaries: {
          count: dailySummaries?.length || 0,
          error: summaryError?.message || null
        },
        meals: {
          count: meals?.length || 0,
          error: mealsError?.message || null
        },
        workouts: {
          count: workouts?.length || 0,
          error: workoutsError?.message || null
        },
        fluids: {
          count: fluids?.length || 0,
          error: fluidsError?.message || null
        }
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "content-type": "application/json" }
    });

  } catch (error) {
    console.error("Diag-auth error:", error);
    return new Response(JSON.stringify({ 
      ok: false, 
      why: "server-error",
      error: String(error) 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "content-type": "application/json" } 
    });
  }
});