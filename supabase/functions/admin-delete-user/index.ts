import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface PurgeResult {
  table: string;
  deleted?: number | null;
  error?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Extract token and validate caller
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ ok: false, why: "no-token" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    const { data: caller, error: getUserErr } = await adminClient.auth.getUser(token);
    if (getUserErr || !caller?.user?.id) {
      return new Response(JSON.stringify({ ok: false, why: "invalid-token", error: getUserErr?.message }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    // Ensure caller is super admin using DB function
    const { data: isSuperAdmin, error: roleErr } = await adminClient
      .rpc("is_super_admin", { user_uuid: caller.user.id });

    if (roleErr || !isSuperAdmin) {
      return new Response(JSON.stringify({ ok: false, why: "forbidden", error: roleErr?.message || null }), {
        status: 403,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    const body = await req.json().catch(() => ({}));
    const email: string | undefined = body.email;
    const purge: boolean = body.purge !== false; // default true

    if (!email) {
      return new Response(JSON.stringify({ ok: false, why: "missing-email" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    // Locate user by email using admin list (paginate until found or max pages)
    let targetUser: any = null;
    let page = 1;
    const perPage = 200;
    for (let i = 0; i < 50; i++) { // up to 10k users
      const { data: usersPage, error: listErr } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (listErr) {
        return new Response(JSON.stringify({ ok: false, why: "list-users-failed", error: listErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }
      const match = usersPage.users.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase());
      if (match) { targetUser = match; break; }
      if (!usersPage.users.length) break;
      page++;
    }

    if (!targetUser) {
      return new Response(JSON.stringify({ ok: false, why: "user-not-found", email }), {
        status: 404,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    const uid = targetUser.id as string;

    const purgeResults: PurgeResult[] = [];

    if (purge) {
      // Best-effort purge across known tables with user_id columns
      const tables = [
        "saved_items",
        "diary_entries",
        "user_profile_events",
        "user_food_corrections",
        "ai_credits_usage",
        "workouts",
        "user_points",
        "badges",
        "female_periodization_plans",
        "coach_conversation_memory",
        "coach_recommendations",
        "proactive_messages",
        "supplement_recognition_log",
        "monthly_challenges",
        "exercise_sets",
        "user_feature_flags",
        "user_alcohol_abstinence",
        "target_images",
        "daily_summaries",
        // Common app tables that may exist even if not in schema snapshot
        "meals",
        "user_fluids",
        "daily_goals",
        "sleep_tracking",
        "journal_entries",
        "journal_weekly_summaries"
      ];

      for (const table of tables) {
        try {
          const { error } = await adminClient.from(table).delete().eq("user_id", uid);
          purgeResults.push({ table, deleted: null, error: error?.message || null });
        } catch (e) {
          purgeResults.push({ table, deleted: null, error: (e as Error).message });
        }
      }
    }

    // Delete auth user (hard delete)
    const { error: delErr } = await adminClient.auth.admin.deleteUser(uid);
    if (delErr) {
      return new Response(JSON.stringify({ ok: false, why: "delete-auth-failed", error: delErr.message, uid, purgeResults }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true, uid, email, purged: purge, purgeResults }), {
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  } catch (error) {
    console.error("admin-delete-user error:", error);
    return new Response(JSON.stringify({ ok: false, why: "server-error", error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  }
});
