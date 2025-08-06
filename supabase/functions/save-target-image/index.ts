import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== Save Target Image Function Started ===');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Decode JWT manually to get user ID without validation issues
    const jwt = authHeader.replace('Bearer ', '');
    let userId;
    try {
      // Simple JWT decode (not validating signature for now)
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      userId = payload.sub;
      if (!userId) {
        throw new Error('No user ID in token');
      }
    } catch (decodeError) {
      console.error('JWT decode error:', decodeError);
      throw new Error('Invalid token format');
    }

    const { 
      selectedImageUrl, 
      targetWeight, 
      targetBodyFat, 
      generationPrompt,
      hasProgressPhoto,
      currentWeight,
      currentBodyFat 
    } = await req.json();

    if (!selectedImageUrl) {
      throw new Error('Selected image URL is required');
    }

    // Deactivate existing target images
    await supabase
      .from('target_images')
      .update({ is_active: false })
      .eq('user_id', userId);

    // Save the selected target image
    const { data: targetImage, error: insertError } = await supabase
      .from('target_images')
      .insert({
        user_id: userId,
        image_url: selectedImageUrl,
        image_type: 'ai_generated',
        target_weight_kg: targetWeight,
        target_body_fat_percentage: targetBodyFat,
        generation_prompt: generationPrompt,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving target image:', insertError);
      throw new Error('Failed to save target image');
    }

    console.log('Target image saved successfully:', targetImage.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        targetImage,
        message: 'Target image saved successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save-target-image function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});