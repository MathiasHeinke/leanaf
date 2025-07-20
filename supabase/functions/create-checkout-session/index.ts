
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    
    if (!user_id) {
      throw new Error('User ID is required');
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', user_id)
      .single();

    if (profileError || !profile?.email) {
      throw new Error('User profile not found');
    }

    // Create Stripe checkout session for KaloAI Premium - 7€/month
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'success_url': `${req.headers.get('origin')}/subscription?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${req.headers.get('origin')}/subscription`,
        'mode': 'subscription',
        'client_reference_id': user_id,
        'customer_email': profile.email,
        'line_items[0][price_data][currency]': 'eur',
        'line_items[0][price_data][product_data][name]': 'KaloAI Premium',
        'line_items[0][price_data][product_data][description]': 'Unbegrenzte Mahlzeit-Analysen, erweiterte Coach-Features und mehr',
        'line_items[0][price_data][unit_amount]': '700', // 7€ in cents
        'line_items[0][price_data][recurring][interval]': 'month',
        'line_items[0][quantity]': '1',
        'metadata[user_id]': user_id,
        'subscription_data[metadata][user_id]': user_id,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Stripe API error: ${errorText}`);
    }

    const session = await response.json();

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in create-checkout-session function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
