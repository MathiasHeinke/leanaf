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
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { plan, coupon_code } = await req.json();

    const planPricing: Record<string, { amount: number; name: string; interval: string; interval_count?: number }> = {
      monthly: { amount: 1999, name: "GetLean AI Premium - Monatlich", interval: "month" },
      sixmonths: { amount: 8999, name: "GetLean AI Premium - 6 Monate", interval: "month", interval_count: 6 }
    };

    const selectedPlan = planPricing[plan as string];
    if (!selectedPlan) throw new Error(`Invalid plan: ${plan}`);

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const sessionOptions: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: selectedPlan.name },
            unit_amount: selectedPlan.amount,
            recurring: {
              interval: selectedPlan.interval,
              ...(selectedPlan.interval_count && { interval_count: selectedPlan.interval_count })
            }
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/profile?success=true`,
      cancel_url: `${req.headers.get("origin")}/onboarding`,
    };

    if (coupon_code) {
      try {
        await stripe.coupons.create({
          id: coupon_code,
          percent_off: 100,
          duration: "repeating",
          duration_in_months: 12,
        });
      } catch (e) {
        // Coupon might already exist
      }
      sessionOptions.discounts = [{ coupon: coupon_code }];
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});