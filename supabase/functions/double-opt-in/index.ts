import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DoubleOptInRequest {
  action: 'send_confirmation' | 'confirm' | 'unsubscribe';
  user_id?: string;
  email?: string;
  token?: string;
  unsubscribe_token?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, user_id, email, token, unsubscribe_token }: DoubleOptInRequest = await req.json();

    switch (action) {
      case 'send_confirmation':
        return await sendDoubleOptInConfirmation(user_id!, email!);
      
      case 'confirm':
        return await confirmDoubleOptIn(token!);
      
      case 'unsubscribe':
        return await handleUnsubscribe(unsubscribe_token!);
      
      default:
        throw new Error('Invalid action');
    }

  } catch (error: any) {
    console.error("Error in double-opt-in function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function sendDoubleOptInConfirmation(userId: string, email: string): Promise<Response> {
  // Generate confirmation token
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Update or create email preferences
  const { error: prefError } = await supabase
    .from('user_email_preferences')
    .upsert({
      user_id: userId,
      double_opt_in_token: token,
      double_opt_in_expires_at: expiresAt.toISOString(),
      double_opt_in_confirmed: false
    });

  if (prefError) throw prefError;

  // Get user name
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', userId)
    .single();

  // Send confirmation email
  const confirmationUrl = `https://gzczjscctgyxjyodhnhk.lovableproject.com/confirm-email?token=${token}`;
  
  const { error: emailError } = await supabase.functions.invoke('send-auth-email', {
    body: {
      type: 'confirmation',
      email,
      user_name: profile?.display_name || 'Fitness-Enthusiast',
      confirmation_url: confirmationUrl,
      user_id: userId
    }
  });

  if (emailError) throw emailError;

  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Bestätigungsmail gesendet' 
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function confirmDoubleOptIn(token: string): Promise<Response> {
  // Find user with this token
  const { data: preferences, error: findError } = await supabase
    .from('user_email_preferences')
    .select('*, profiles!inner(user_id, email, display_name)')
    .eq('double_opt_in_token', token)
    .eq('double_opt_in_confirmed', false)
    .gt('double_opt_in_expires_at', new Date().toISOString())
    .single();

  if (findError || !preferences) {
    return new Response(JSON.stringify({ 
      error: 'Ungültiger oder abgelaufener Token' 
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Confirm opt-in
  const { error: confirmError } = await supabase
    .from('user_email_preferences')
    .update({
      double_opt_in_confirmed: true,
      double_opt_in_token: null,
      double_opt_in_expires_at: null
    })
    .eq('id', preferences.id);

  if (confirmError) throw confirmError;

  // Create onboarding sequence
  const { error: onboardingError } = await supabase
    .from('onboarding_sequences')
    .upsert({
      user_id: preferences.user_id,
      sequence_step: 1,
      next_email_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days
    });

  if (onboardingError) {
    console.error('Error creating onboarding sequence:', onboardingError);
  }

  // Send welcome email
  await supabase.functions.invoke('send-auth-email', {
    body: {
      type: 'welcome',
      email: preferences.profiles.email,
      user_name: preferences.profiles.display_name || 'Fitness-Enthusiast',
      user_id: preferences.user_id
    }
  });

  return new Response(JSON.stringify({ 
    success: true, 
    message: 'E-Mail erfolgreich bestätigt! Willkommen bei GetleanAI!' 
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function handleUnsubscribe(unsubscribeToken: string): Promise<Response> {
  // Find user with this unsubscribe token
  const { data: preferences, error: findError } = await supabase
    .from('user_email_preferences')
    .select('*')
    .eq('unsubscribe_token', unsubscribeToken)
    .single();

  if (findError || !preferences) {
    return new Response(JSON.stringify({ 
      error: 'Ungültiger Abmelde-Token' 
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Update preferences to disable all marketing emails
  const { error: updateError } = await supabase
    .from('user_email_preferences')
    .update({
      newsletter_enabled: false,
      onboarding_emails: false,
      activity_reminders: false,
      marketing_emails: false
    })
    .eq('id', preferences.id);

  if (updateError) throw updateError;

  // Pause onboarding sequence
  await supabase
    .from('onboarding_sequences')
    .update({ paused: true })
    .eq('user_id', preferences.user_id);

  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Sie wurden erfolgreich von allen Marketing-E-Mails abgemeldet.' 
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(handler);