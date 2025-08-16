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
    
    const { data, error } = await supabase.functions.invoke("diag-auth", { 
      body: {} 
    });
    
    console.log("🔧 Diag-auth result:", { data, error });
    
    return { data, error };
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