import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    // Authenticated user (used to verify caller)
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;

    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session || session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ error: 'Payment not completed' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Read metadata
    const metadata = session.metadata || {};
    const metaUserId = metadata.user_id as string | undefined;
    const credits = parseInt((metadata.credits as string) || '0', 10);
    const pack = (metadata.pack as string) || 'unknown';
    const amount_cents = parseInt((metadata.amount_cents as string) || '0', 10);

    // Verify the session belongs to the caller
    if (!metaUserId || metaUserId !== user.id) {
      return new Response(JSON.stringify({ error: 'Mismatched user/session' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Use service role for DB writes
    const serviceClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Idempotency: check if already applied
    const { data: existing } = await serviceClient
      .from('credit_payments_log')
      .select('session_id')
      .eq('session_id', session_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: true, already_applied: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Apply credits
    const { data: addRes, error: addErr } = await serviceClient.rpc('add_credits', {
      p_user_id: user.id,
      p_credits: credits,
    });
    if (addErr) throw addErr;

    // Log application
    await serviceClient.from('credit_payments_log').insert({
      session_id,
      user_id: user.id,
      pack,
      credits,
      amount_cents,
      status: 'applied',
    });

    return new Response(JSON.stringify({ success: true, credits_added: credits, credits_remaining: addRes?.credits_remaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
