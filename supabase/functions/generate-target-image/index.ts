import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== Generate Target Image Function Started ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Checking OpenAI API key...');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not found in environment');
      throw new Error('OpenAI API key not configured');
    }
    console.log('OpenAI API key found ✓');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;
    const { targetWeight, targetBodyFat } = await req.json();

    // Get user profile data for better prompting
    const { data: profile } = await supabase
      .from('profiles')
      .select('gender, height, age, goal, target_weight, target_body_fat_percentage, weight, first_name')
      .eq('user_id', userId)
      .single();

    // Get latest progress photo from weight_history
    const { data: latestWeightEntry } = await supabase
      .from('weight_history')
      .select('photo_urls, weight, body_fat_percentage, muscle_percentage, date')
      .eq('user_id', userId)
      .not('photo_urls', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    // Get the middle photo (front view) from the photo_urls array
    let frontPhotoUrl = null;
    if (latestWeightEntry?.photo_urls) {
      let photoUrls = latestWeightEntry.photo_urls;
      if (typeof photoUrls === 'string') {
        try {
          photoUrls = JSON.parse(photoUrls);
        } catch (e) {
          console.error('Failed to parse photo_urls:', e);
        }
      }
      if (Array.isArray(photoUrls) && photoUrls.length > 0) {
        // Take middle photo as front view (index 1 if 3 photos, index 0 if 1 photo)
        const middleIndex = Math.floor(photoUrls.length / 2);
        frontPhotoUrl = photoUrls[middleIndex];
        console.log(`Selected photo ${middleIndex + 1} of ${photoUrls.length} as front view:`, frontPhotoUrl);
      }
    }

    if (!frontPhotoUrl) {
      console.log('No progress photo found, falling back to text-only generation');
    }

    // Calculate target improvements
    const currentWeight = latestWeightEntry?.weight || profile?.weight || 70;
    const currentBodyFat = latestWeightEntry?.body_fat_percentage || 20;
    const currentMuscle = latestWeightEntry?.muscle_percentage || 35;
    
    const targetWeightNum = targetWeight || profile?.target_weight || currentWeight;
    const targetBodyFatNum = targetBodyFat || profile?.target_body_fat_percentage || Math.max(currentBodyFat - 5, 8);
    
    const weightChange = targetWeightNum - currentWeight;
    const bodyFatChange = targetBodyFatNum - currentBodyFat;
    
    // Create simplified, focused prompts for high-quality generation
    let detailedPrompt;

    if (frontPhotoUrl) {
      // Simple, focused prompt for gpt-image-1 with progress photo
      const transformationType = weightChange > 0 ? 'muscle building' : weightChange < 0 ? 'fat loss' : 'body recomposition';
      const bodyFatDescription = targetBodyFatNum <= 12 ? 'very lean and defined' : targetBodyFatNum <= 18 ? 'athletic and toned' : 'fit and healthy';
      
      detailedPrompt = `Transform this person to show their fitness goal: ${transformationType} to ${targetBodyFatNum}% body fat (${bodyFatDescription}). 
      
Show the same person with:
- ${bodyFatDescription} physique
- Natural muscle definition for ${targetBodyFatNum}% body fat
- Confident, healthy appearance
- Good lighting and professional photo quality

Keep the same facial features, skin tone, and body structure. Make it realistic and achievable, not extreme.`;

    } else {
      // Simple, focused prompt for text-only generation
      const genderDesc = profile?.gender === 'female' ? 'athletic woman' : profile?.gender === 'male' ? 'fit man' : 'athletic person';
      const bodyFatDescription = targetBodyFatNum <= 12 ? 'very lean and defined' : targetBodyFatNum <= 18 ? 'athletic and toned' : 'fit and healthy';
      
      detailedPrompt = `Professional fitness photo of a ${bodyFatDescription} ${genderDesc}, age ${profile?.age || 30}. 
      
Show:
- ${bodyFatDescription} physique at ${targetBodyFatNum}% body fat
- Natural muscle definition and healthy appearance
- Confident posture in good lighting
- Clean background, high-quality photography

Realistic fitness goals, not extreme transformations.`;
    }

    console.log('Generated simplified prompt:', detailedPrompt);

    // Generate 4 high-quality images using gpt-image-1
    console.log('Generating 4 target images with gpt-image-1...');
    
    // Generate 4 images in parallel for better user experience
    const imagePromises = Array.from({ length: 4 }, (_, index) => {
      // Add subtle variation to each image
      const variations = ['front pose', 'confident stance', 'athletic pose', 'profile view'];
      const promptVariation = `${detailedPrompt} ${variations[index]}.`;
      
      return fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt: promptVariation,
          size: '1024x1024',
          quality: 'high',
          n: 1
        }),
      }).then(async res => {
        const result = await res.json();
        if (!res.ok) {
          console.error(`Image generation ${index + 1} failed:`, result);
          return null;
        }
        return result;
      }).catch(error => {
        console.error(`Image generation ${index + 1} error:`, error);
        return null;
      });
    });

    const imageResults = await Promise.all(imagePromises);
    const imageUrls = imageResults.map((result, index) => {
      if (result?.data?.[0]?.url) {
        console.log(`Generated image ${index + 1}:`, result.data[0].url);
        return result.data[0].url;
      }
      return null;
    }).filter(Boolean);

    if (imageUrls.length === 0) {
      throw new Error('Failed to generate any images');
    }

    console.log(`Successfully generated ${imageUrls.length} target images`);

    return new Response(
      JSON.stringify({ 
        imageUrls,
        count: imageUrls.length,
        prompt: detailedPrompt,
        hasProgressPhoto: !!frontPhotoUrl,
        currentWeight,
        targetWeight: targetWeightNum,
        currentBodyFat,
        targetBodyFat: targetBodyFatNum
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-target-image function:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    });
    
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