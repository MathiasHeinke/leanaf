import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleOptions, okJson, errJson } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptions(req);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service key (bypasses RLS)
    const admin = createClient(supabaseUrl, serviceKey);

    // Verify JWT and get user
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    
    const { data: user, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user?.user) {
      console.error("Auth verification failed:", userErr);
      return errJson("Unauthorized", req, 401);
    }

    const { userId } = await req.json().catch(() => ({ userId: null }));
    
    // Security check: user can only access their own profile
    if (!userId || userId !== user.user.id) {
      console.error("User ID mismatch:", { requested: userId, actual: user.user.id });
      return errJson("Forbidden", req, 403);
    }

    console.log(`Loading profile for user: ${userId}`);

    // Use service client to bypass RLS and get profile
    const { data, error } = await admin
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Database error:", error);
      return errJson(error.message, req, 500);
    }

    console.log(`Profile loaded successfully:`, data ? "found" : "not found");

    return okJson({ data }, req);
  } catch (e) {
    console.error("Function error:", e);
    return errJson(String(e), req, 500);
  }
});