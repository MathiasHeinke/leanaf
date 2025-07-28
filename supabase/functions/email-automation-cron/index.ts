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

interface User {
  user_id: string;
  email: string;
  display_name: string;
  created_at: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting email automation cron job...');

    // Get users for onboarding emails
    await processOnboardingEmails();
    
    // Get inactive users for re-engagement
    await processReengagementEmails();
    
    // Update onboarding sequences
    await updateOnboardingSequences();

    console.log('Email automation cron job completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email automation processed successfully' 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in email automation cron:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function processOnboardingEmails() {
  const now = new Date();
  
  // Get users who need onboarding emails
  const { data: onboardingUsers, error } = await supabase
    .from('onboarding_sequences')
    .select(`
      *,
      profiles!inner(user_id, email, display_name)
    `)
    .lte('next_email_at', now.toISOString())
    .eq('completed', false)
    .eq('paused', false);

  if (error) {
    console.error('Error fetching onboarding users:', error);
    return;
  }

  console.log(`Processing ${onboardingUsers?.length || 0} onboarding emails`);

  for (const user of onboardingUsers || []) {
    try {
      // Send onboarding email
      const { error: emailError } = await supabase.functions.invoke('send-marketing-email', {
        body: {
          type: 'onboarding',
          email: user.profiles.email,
          user_name: user.profiles.display_name || 'Fitness-Enthusiast',
          user_id: user.user_id,
          custom_content: {
            personalization: {
              step: user.sequence_step
            }
          },
          ai_generate: true
        }
      });

      if (emailError) {
        console.error(`Failed to send onboarding email to ${user.profiles.email}:`, emailError);
        continue;
      }

      // Update sequence
      const nextStep = user.sequence_step + 1;
      let nextEmailAt = null;
      let completed = false;

      if (nextStep <= 3) {
        // Schedule next email
        const daysToAdd = nextStep === 2 ? 3 : 7; // Day 3, then week 1
        nextEmailAt = new Date(now.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
      } else {
        completed = true;
      }

      await supabase
        .from('onboarding_sequences')
        .update({
          sequence_step: nextStep,
          next_email_at: nextEmailAt?.toISOString(),
          completed,
          updated_at: now.toISOString()
        })
        .eq('id', user.id);

      console.log(`Onboarding email sent to ${user.profiles.email}, step ${user.sequence_step}`);

    } catch (error) {
      console.error(`Error processing onboarding for user ${user.user_id}:`, error);
    }
  }
}

async function processReengagementEmails() {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
  const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));

  // Get users who haven't been active
  const { data: inactiveUsers, error } = await supabase
    .rpc('get_inactive_users_for_reengagement', {
      three_days_ago: threeDaysAgo.toISOString(),
      one_week_ago: oneWeekAgo.toISOString(),
      two_weeks_ago: twoWeeksAgo.toISOString()
    });

  if (error) {
    console.error('Error fetching inactive users:', error);
    return;
  }

  console.log(`Processing ${inactiveUsers?.length || 0} re-engagement emails`);

  for (const user of inactiveUsers || []) {
    try {
      // Determine days inactive and last activity
      const lastActivityDate = new Date(user.last_activity);
      const daysInactive = Math.floor((now.getTime() - lastActivityDate.getTime()) / (24 * 60 * 60 * 1000));

      // Send re-engagement email
      const { error: emailError } = await supabase.functions.invoke('send-marketing-email', {
        body: {
          type: 'engagement',
          email: user.email,
          user_name: user.display_name || 'Fitness-Enthusiast',
          user_id: user.user_id,
          custom_content: {
            personalization: {
              days_inactive: daysInactive,
              last_activity: user.last_activity_type || 'Training'
            }
          },
          ai_generate: true
        }
      });

      if (emailError) {
        console.error(`Failed to send re-engagement email to ${user.email}:`, emailError);
        continue;
      }

      console.log(`Re-engagement email sent to ${user.email}, ${daysInactive} days inactive`);

    } catch (error) {
      console.error(`Error processing re-engagement for user ${user.user_id}:`, error);
    }
  }
}

async function updateOnboardingSequences() {
  const now = new Date();
  
  // Pause onboarding for active users
  const { error: pauseError } = await supabase
    .rpc('pause_onboarding_for_active_users');

  if (pauseError) {
    console.error('Error pausing onboarding for active users:', pauseError);
  }

  // Create onboarding sequences for new users
  const { error: createError } = await supabase
    .rpc('create_onboarding_sequences_for_new_users');

  if (createError) {
    console.error('Error creating onboarding sequences:', createError);
  }
}

serve(handler);