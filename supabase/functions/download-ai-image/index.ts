import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== Download AI Image Function Started ===');
  
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
    
    // Decode JWT to get user ID
    const jwt = authHeader.replace('Bearer ', '');
    let userId;
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      userId = payload.sub;
      if (!userId) {
        throw new Error('No user ID in token');
      }
    } catch (decodeError) {
      console.error('JWT decode error:', decodeError);
      throw new Error('Invalid token format');
    }

    const { imageUrl, targetImageId, progressPhotoMapping } = await req.json();

    if (!imageUrl || !targetImageId) {
      throw new Error('Image URL and target image ID are required');
    }

    console.log('Downloading AI image:', imageUrl.substring(0, 50) + '...');

    // Download the AI image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    const imageFile = new File([imageBuffer], `ai-target-${targetImageId}.jpg`, { type: 'image/jpeg' });

    // Upload to Supabase Storage
    const storagePath = `${userId}/ai-target-${targetImageId}-${Date.now()}.jpg`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ai-target-images')
      .upload(storagePath, imageFile, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('ai-target-images')
      .getPublicUrl(storagePath);

    // Update target_images record with storage info
    const { error: updateError } = await supabase
      .from('target_images')
      .update({
        original_ai_url: imageUrl,
        supabase_storage_path: storagePath,
        image_url: publicUrl,
        progress_photo_mapping: progressPhotoMapping || {}
      })
      .eq('id', targetImageId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update target image: ${updateError.message}`);
    }

    console.log('Successfully downloaded and stored AI image');

    // Also trigger a database refresh notification
    console.log('Notifying frontend about storage update...');

    return new Response(
      JSON.stringify({ 
        success: true,
        storagePath,
        publicUrl,
        targetImageId,
        message: 'AI image downloaded and stored successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in download-ai-image function:', error);
    
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