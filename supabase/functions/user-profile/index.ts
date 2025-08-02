import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserProfileData {
  experienceYears?: number;
  availableMinutes?: number;
  weeklySessions?: number;
  injuries?: string[];
  goal?: string;
  preferences?: {
    cardio?: boolean;
    pumpStyle?: boolean;
    strengthFocus?: boolean;
    periodization?: boolean;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the session
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (req.method === 'GET') {
      // Fetch user profile
      const { data, error } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch profile' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (req.method === 'POST') {
      const body: UserProfileData = await req.json();

      // Validate required fields
      if (!body.experienceYears || !body.availableMinutes || !body.weeklySessions || !body.goal) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const profileData = {
        ...body,
        userId: user.id,
      };

      // Upsert user profile
      const { error: profileError } = await supabaseClient
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          profile: profileData,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Error saving profile:', profileError);
        return new Response(
          JSON.stringify({ error: 'Failed to save profile' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Log profile event
      const { error: eventError } = await supabaseClient
        .from('user_profile_events')
        .insert({
          user_id: user.id,
          profile_delta: profileData,
          event_type: 'profile_update'
        });

      if (eventError) {
        console.error('Error logging profile event:', eventError);
        // Don't fail the request for event logging errors
      }

      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});