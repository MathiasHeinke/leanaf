import { supabase } from "@/integrations/supabase/client";

interface AuthDiagResult {
  ok: boolean;
  uid?: string;
  why?: string;
  profile?: {
    exists: boolean;
    id: string | null;
    error: string | null;
  };
  data_access?: {
    daily_summaries: { count: number; error: string | null };
    meals: { count: number; error: string | null };
    workouts: { count: number; error: string | null };
    fluids: { count: number; error: string | null };
  };
  timestamp?: string;
  error?: string;
}

export async function pingAuth(): Promise<{ data: AuthDiagResult | null; error: any }> {
  try {
    console.log("🔧 Pinging diag-auth...");
    
    // Check if user is authenticated first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("🔧 No session found");
      return { 
        data: { ok: false, why: "no-session" }, 
        error: null 
      };
    }

    console.log("🔧 Session exists, token:", !!session.access_token, session.access_token?.slice(0, 12));

    // Bypass edge function: perform direct client-side checks with RLS
    const uid = session.user?.id;
    if (!uid) {
      console.log("🔧 No user id in session");
      return {
        data: { ok: false, why: "no-user", timestamp: new Date().toISOString() },
        error: null,
      };
    }

    const [profileRes, dailyRes, mealsRes, workoutsRes, fluidsRes] = await Promise.all([
      supabase.from("profiles").select("id").eq("user_id", uid).maybeSingle(),
      supabase.from("daily_summaries").select("id", { count: "exact", head: true }).eq("user_id", uid),
      supabase.from("meals").select("id", { count: "exact", head: true }).eq("user_id", uid),
      supabase.from("workouts").select("id", { count: "exact", head: true }).eq("user_id", uid),
      supabase.from("user_fluids").select("id", { count: "exact", head: true }).eq("user_id", uid),
    ] as const);

    const result: AuthDiagResult = {
      ok: true,
      uid,
      profile: {
        exists: !!profileRes.data,
        id: profileRes.data?.id ?? null,
        error: profileRes.error?.message ?? null,
      },
      data_access: {
        daily_summaries: { count: dailyRes.count ?? 0, error: (dailyRes as any).error?.message ?? null },
        meals: { count: mealsRes.count ?? 0, error: (mealsRes as any).error?.message ?? null },
        workouts: { count: workoutsRes.count ?? 0, error: (workoutsRes as any).error?.message ?? null },
        fluids: { count: fluidsRes.count ?? 0, error: (fluidsRes as any).error?.message ?? null },
      },
      timestamp: new Date().toISOString(),
    };

    console.log("🔧 Direct auth diag result:", result);
    return { data: result, error: null };
  } catch (err) {
    console.error("🔧 Ping auth failed:", err);
    return { data: null, error: err };
  }
}

// Quick debugging helper for token status
export async function debugAuthStatus() {
  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();
  
  console.log("🔧 Auth Debug:", {
    hasSession: !!session,
    hasUser: !!user,
    userId: user?.id,
    tokenPresent: !!session?.access_token,
    tokenStart: session?.access_token?.slice(0, 12)
  });
  
  return {
    hasSession: !!session,
    hasUser: !!user,
    userId: user?.id,
    tokenPresent: !!session?.access_token
  };
}