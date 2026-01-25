import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OnboardingUser {
  id: string;
  user_id: string;
  sequence_step: number;
  profiles: {
    user_id: string;
    email: string;
    display_name: string;
  };
}

interface InactiveUser {
  user_id: string;
  email: string;
  display_name: string;
  last_activity: string;
  last_activity_type?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[email-automation-cron] Starting...');

    // Get users for onboarding emails
    await processOnboardingEmails();
    
    // Get inactive users for re-engagement
    await processReengagementEmails();
    
    // Update onboarding sequences
    await updateOnboardingSequences();

    console.log('[email-automation-cron] Completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email automation processed successfully' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[email-automation-cron] Error:', message);
    
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

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
    console.error('[email-automation-cron] Error fetching onboarding users:', error);
    return;
  }

  console.log(`[email-automation-cron] Processing ${onboardingUsers?.length || 0} onboarding emails`);

  for (const user of (onboardingUsers || []) as OnboardingUser[]) {
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
        console.error(`[email-automation-cron] Failed to send onboarding email to ${user.profiles.email}:`, emailError);
        continue;
      }

      // Update sequence
      const nextStep = user.sequence_step + 1;
      let nextEmailAt: string | null = null;
      let completed = false;

      if (nextStep <= 3) {
        // Schedule next email
        const daysToAdd = nextStep === 2 ? 3 : 7; // Day 3, then week 1
        const nextDate = new Date(now.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
        nextEmailAt = nextDate.toISOString();
      } else {
        completed = true;
      }

      await supabase
        .from('onboarding_sequences')
        .update({
          sequence_step: nextStep,
          next_email_at: nextEmailAt,
          completed,
          updated_at: now.toISOString()
        })
        .eq('id', user.id);

      console.log(`[email-automation-cron] Onboarding email sent to ${user.profiles.email}, step ${user.sequence_step}`);

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown';
      console.error(`[email-automation-cron] Error processing onboarding for user ${user.user_id}:`, msg);
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
    console.error('[email-automation-cron] Error fetching inactive users:', error);
    return;
  }

  console.log(`[email-automation-cron] Processing ${inactiveUsers?.length || 0} re-engagement emails`);

  for (const user of (inactiveUsers || []) as InactiveUser[]) {
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
        console.error(`[email-automation-cron] Failed to send re-engagement email to ${user.email}:`, emailError);
        continue;
      }

      console.log(`[email-automation-cron] Re-engagement email sent to ${user.email}, ${daysInactive} days inactive`);

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown';
      console.error(`[email-automation-cron] Error processing re-engagement for user ${user.user_id}:`, msg);
    }
  }
}

async function updateOnboardingSequences() {
  // Pause onboarding for active users
  const { error: pauseError } = await supabase
    .rpc('pause_onboarding_for_active_users');

  if (pauseError) {
    console.error('[email-automation-cron] Error pausing onboarding for active users:', pauseError);
  }

  // Create onboarding sequences for new users
  const { error: createError } = await supabase
    .rpc('create_onboarding_sequences_for_new_users');

  if (createError) {
    console.error('[email-automation-cron] Error creating onboarding sequences:', createError);
  }
}
