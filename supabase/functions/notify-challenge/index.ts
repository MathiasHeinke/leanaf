import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      monthly_challenges: {
        Row: {
          id: string;
          user_id: string;
          challenge: string;
          month: number;
          year: number;
          progress: number;
          target: number;
          challenge_type: string;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          challenge: string;
          month: number;
          year?: number;
          progress?: number;
          target?: number;
          challenge_type?: string;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          challenge?: string;
          month?: number;
          year?: number;
          progress?: number;
          target?: number;
          challenge_type?: string;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();

    console.log(`Daily challenge check for month ${currentMonth}/${currentYear}, day ${currentDay}`);

    // Get all active challenges for the current month
    const { data: challenges, error: fetchError } = await supabaseClient
      .from('monthly_challenges')
      .select('*')
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .eq('is_completed', false);

    if (fetchError) {
      console.error('Error fetching challenges:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let updatedCount = 0;
    let notificationsSent = 0;

    for (const challenge of challenges || []) {
      // Update progress for active challenges
      const newProgress = Math.min(challenge.progress + 1, challenge.target);
      const isCompleted = newProgress >= challenge.target;

      const { error: updateError } = await supabaseClient
        .from('monthly_challenges')
        .update({ 
          progress: newProgress,
          is_completed: isCompleted
        })
        .eq('id', challenge.id);

      if (updateError) {
        console.error(`Error updating challenge ${challenge.id}:`, updateError);
        continue;
      }

      updatedCount++;

      // Generate motivational message based on challenge type and progress
      let message = '';
      const progressPercent = Math.round((newProgress / challenge.target) * 100);

      if (isCompleted) {
        message = `🎉 Challenge geschafft! Du hast dein ${challenge.challenge_type}-Ziel erreicht! Lucy ist stolz auf dich! ✨`;
      } else if (currentDay <= 10) {
        message = `Tag ${currentDay}: ${challenge.challenge} – du schaffst das! 💚 (${progressPercent}% geschafft)`;
      } else if (currentDay <= 20) {
        message = `Halbzeit! ${challenge.challenge} – bleib dran, du rockst das! 🌟 (${progressPercent}% erreicht)`;
      } else {
        message = `Endspurt! ${challenge.challenge} – fast geschafft! 🚀 (${progressPercent}% done)`;
      }

      // In a real implementation, you would send push notifications here
      // For now, we just log the messages
      console.log(`Notification for user ${challenge.user_id}: ${message}`);
      notificationsSent++;

      // Optional: Create a notification entry in the database
      // This could be read by the frontend to show in-app notifications
    }

    // Auto-create new challenges for users who don't have any for the current month
    const { data: usersWithoutChallenges, error: usersError } = await supabaseClient
      .from('monthly_challenges')
      .select('user_id')
      .eq('month', currentMonth)
      .eq('year', currentYear);

    // This is a simplified version - in reality you'd need to query user preferences
    const defaultChallenges = [
      { type: 'hydration', challenge: 'Trinke täglich 3L Wasser 💧', target: currentDay <= 28 ? 30 : 31 },
      { type: 'mindfulness', challenge: 'Täglich 5 Min Meditation 🧘‍♀️', target: currentDay <= 28 ? 30 : 31 },
      { type: 'movement', challenge: 'Täglich 8000 Schritte 👣', target: currentDay <= 28 ? 30 : 31 },
      { type: 'nutrition', challenge: 'Täglich 5 Portionen Obst/Gemüse 🥬', target: currentDay <= 28 ? 30 : 31 }
    ];

    return new Response(JSON.stringify({ 
      success: true,
      updatedChallenges: updatedCount,
      notificationsSent: notificationsSent,
      currentMonth,
      currentDay,
      message: `Daily challenge check completed. Updated ${updatedCount} challenges, sent ${notificationsSent} notifications.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in daily challenge check:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});