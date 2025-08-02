import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserWithStaleProfile {
  user_id: string;
  email: string;
  last_update: string;
  days_since_update: number;
  profile: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🔔 Starting periodic profile reminder check...');

    // Find users with profiles older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: staleProfiles, error: queryError } = await supabase
      .from('user_profiles')
      .select(`
        user_id,
        updated_at,
        profile,
        profiles!inner(
          email
        )
      `)
      .lt('updated_at', thirtyDaysAgo.toISOString())
      .order('updated_at', { ascending: true });

    if (queryError) {
      throw new Error(`Query error: ${queryError.message}`);
    }

    console.log(`📊 Found ${staleProfiles?.length || 0} users with stale profiles`);

    if (!staleProfiles || staleProfiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No users found with stale profiles',
          processed: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    let remindersCreated = 0;
    let remindersSkipped = 0;

    for (const profile of staleProfiles) {
      try {
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(profile.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Skip if we've already sent a reminder in the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: recentReminder } = await supabase
          .from('profile_reminder_log')
          .select('id')
          .eq('user_id', profile.user_id)
          .gte('created_at', sevenDaysAgo.toISOString())
          .maybeSingle();

        if (recentReminder) {
          console.log(`⏭️ Skipping user ${profile.user_id} - reminder sent recently`);
          remindersSkipped++;
          continue;
        }

        // Create a reminder notification
        const reminderMessage = generateReminderMessage(daysSinceUpdate, profile.profile);

        // Log the reminder
        const { error: logError } = await supabase
          .from('profile_reminder_log')
          .insert({
            user_id: profile.user_id,
            reminder_type: 'stale_profile',
            days_since_update: daysSinceUpdate,
            message: reminderMessage,
            delivery_method: 'in_app'
          });

        if (logError) {
          console.error(`❌ Failed to log reminder for user ${profile.user_id}:`, logError);
          continue;
        }

        // TODO: Send actual notification (push notification, email, etc.)
        // For now, we just log the reminder which can be picked up by the frontend

        console.log(`✅ Reminder created for user ${profile.user_id} (${daysSinceUpdate} days stale)`);
        remindersCreated++;

      } catch (userError) {
        console.error(`❌ Error processing user ${profile.user_id}:`, userError);
        continue;
      }
    }

    const response = {
      success: true,
      message: `Processed ${staleProfiles.length} users`,
      reminders_created: remindersCreated,
      reminders_skipped: remindersSkipped,
      total_stale_profiles: staleProfiles.length
    };

    console.log('📈 Periodic reminder check completed:', response);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Periodic reminder check failed:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function generateReminderMessage(daysSinceUpdate: number, profile: any): string {
  const baseMessages = [
    `Hey! Dein Trainingsprofil ist seit ${daysSinceUpdate} Tagen nicht mehr aktualisiert worden. Wie wär's mit einem kurzen Update?`,
    `Zeit für ein Profil-Update! 💪 Deine Daten sind ${daysSinceUpdate} Tage alt - lass uns das ändern!`,
    `Quick Check-in benötigt! 🎯 Dein Profil wartet seit ${daysSinceUpdate} Tagen auf ein Update.`
  ];

  // Add context based on profile data
  let contextHint = '';
  if (profile?.goal === 'hypertrophy') {
    contextHint = ' Perfekte Gains brauchen aktuelle Daten! 🔥';
  } else if (profile?.goal === 'strength') {
    contextHint = ' Starke Updates für starke Lifts! 💪';
  } else if (profile?.goal === 'endurance') {
    contextHint = ' Keep the momentum going! 🏃‍♂️';
  }

  const baseMessage = baseMessages[Math.floor(Math.random() * baseMessages.length)];
  return baseMessage + contextHint;
}

// Migration SQL to create the reminder log table
/*
CREATE TABLE IF NOT EXISTS profile_reminder_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL DEFAULT 'stale_profile',
  days_since_update INTEGER NOT NULL,
  message TEXT NOT NULL,
  delivery_method TEXT NOT NULL DEFAULT 'in_app',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE profile_reminder_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own reminders
CREATE POLICY "Users can view their own reminders" 
ON profile_reminder_log FOR SELECT 
USING (auth.uid() = user_id);

-- System can insert reminders
CREATE POLICY "System can insert reminders" 
ON profile_reminder_log FOR INSERT 
WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX idx_profile_reminder_log_user_created 
ON profile_reminder_log(user_id, created_at DESC);
*/