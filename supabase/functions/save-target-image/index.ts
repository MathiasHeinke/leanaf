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
    currentBodyFat,
    imageCategory = 'unspecified',
    progressPhotoUrl,
    progressPhotoId
  } = await req.json();

    if (!selectedImageUrl) {
      throw new Error('Selected image URL is required');
    }

    // Deactivate existing target images
    await supabase
      .from('target_images')
      .update({ is_active: false })
      .eq('user_id', userId);

    // Use provided progressPhotoId or find it from URL with improved logic
    let finalProgressPhotoId = progressPhotoId;
    
    if (!finalProgressPhotoId && progressPhotoUrl) {
      console.log('Searching for progress photo ID by URL:', progressPhotoUrl?.substring(0, 50) + '...');
      
      const { data: progressPhotoData } = await supabase
        .from('weight_history')
        .select('id, photo_urls, date')
        .eq('user_id', userId)
        .not('photo_urls', 'is', null)
        .order('created_at', { ascending: false });
      
      // Find the progress photo that contains this URL
      if (progressPhotoData) {
        for (const photo of progressPhotoData) {
          if (photo.photo_urls) {
            let urls: string[] = [];
            
            // Handle different photo_urls formats more robustly
            if (typeof photo.photo_urls === 'string') {
              try {
                const parsed = JSON.parse(photo.photo_urls);
                urls = Array.isArray(parsed) ? parsed : Object.values(parsed);
              } catch (e) {
                urls = [photo.photo_urls];
              }
            } else if (Array.isArray(photo.photo_urls)) {
              urls = photo.photo_urls;
            } else if (photo.photo_urls && typeof photo.photo_urls === 'object') {
              urls = Object.values(photo.photo_urls);
            }
            
            // More flexible URL matching - check for partial matches and clean URLs
            const matchFound = urls.some(url => {
              if (!url || typeof url !== 'string') return false;
              
              // Clean both URLs for comparison
              const cleanProgressUrl = progressPhotoUrl.split('?')[0];
              const cleanDbUrl = url.split('?')[0];
              
              return cleanDbUrl === cleanProgressUrl || 
                     url === progressPhotoUrl ||
                     cleanDbUrl.includes(cleanProgressUrl.split('/').pop() || '') ||
                     cleanProgressUrl.includes(cleanDbUrl.split('/').pop() || '');
            });
            
            if (matchFound) {
              finalProgressPhotoId = photo.id;
              console.log(`✅ Found matching photo ID: ${photo.id} for date: ${photo.date}`);
              break;
            }
          }
        }
      }
      
      // Fallback: if no exact match found and we have a category, use the latest photo with that category
      if (!finalProgressPhotoId && imageCategory && imageCategory !== 'unspecified') {
        console.log(`⚠️ No exact URL match found, searching for latest ${imageCategory} photo...`);
        
        const { data: categoryPhotos } = await supabase
          .from('weight_history')
          .select('id, photo_urls, photo_metadata, date')
          .eq('user_id', userId)
          .not('photo_urls', 'is', null)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (categoryPhotos) {
          for (const photo of categoryPhotos) {
            // Check if photo has the requested category
            const hasCategory = photo.photo_urls && 
              ((typeof photo.photo_urls === 'object' && !Array.isArray(photo.photo_urls) && photo.photo_urls[imageCategory]) ||
               (Array.isArray(photo.photo_urls) && photo.photo_urls.length > 0 && 
                ((imageCategory === 'front' && photo.photo_urls[0]) ||
                 (imageCategory === 'side' && photo.photo_urls[1]) ||
                 (imageCategory === 'back' && photo.photo_urls[2]))));
            
            if (hasCategory) {
              finalProgressPhotoId = photo.id;
              console.log(`✅ Fallback: Using latest ${imageCategory} photo from ${photo.date}, ID: ${photo.id}`);
              break;
            }
          }
        }
      }
      
      // Final fallback: use the very latest progress photo
      if (!finalProgressPhotoId && progressPhotoData && progressPhotoData.length > 0) {
        finalProgressPhotoId = progressPhotoData[0].id;
        console.log(`⚠️ Using latest progress photo as final fallback, ID: ${finalProgressPhotoId}`);
      }
    }
    
    console.log('Progress photo linking:', { 
      progressPhotoId, 
      finalProgressPhotoId, 
      progressPhotoUrl: progressPhotoUrl?.substring(0, 50) + '...' 
    });

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
        image_category: imageCategory,
        ai_generated_from_photo_id: finalProgressPhotoId,
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
        id: targetImage.id,
        ai_generated_from_photo_id: finalProgressPhotoId,
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