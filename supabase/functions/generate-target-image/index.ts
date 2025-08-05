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
    
    // Create prompt based on whether we have a progress photo or not
    let requestBody;
    let detailedPrompt;

    if (frontPhotoUrl) {
      // Use vision API with progress photo
      detailedPrompt = `Based on this progress photo, create a realistic fitness transformation target image showing the same person at their goal physique.

TARGET TRANSFORMATION:
- Current weight: ${currentWeight.toFixed(1)} kg → Goal weight: ${targetWeightNum.toFixed(1)} kg (${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg change)
- Current body fat: ${currentBodyFat.toFixed(1)}% → Target body fat: ${targetBodyFatNum.toFixed(1)}% (${bodyFatChange.toFixed(1)}% change)
- Fitness goal: ${profile?.goal || 'improved fitness'}

TRANSFORMATION DIRECTION:
${weightChange > 0 ? '• Weight gain focused on lean muscle mass' : weightChange < 0 ? '• Weight loss while preserving muscle mass' : '• Body recomposition (maintain weight, change composition)'}
${bodyFatChange < 0 ? '• Reduce body fat for better muscle definition' : '• Maintain healthy body fat levels'}

VISUAL REQUIREMENTS:
Show the SAME person from the progress photo but transformed to the target physique. The person should:
- Maintain the same facial features, skin tone, and general appearance
- Show realistic fitness progress based on the target metrics
- Have appropriate muscle definition for ${targetBodyFatNum.toFixed(1)}% body fat
- Look healthy, fit, and naturally achievable
- Show confident posture and expression
- Be photographed in good lighting with a clean, simple background
- Represent realistic fitness goals, not extreme transformations

Style: High-quality fitness photography, natural lighting, motivational but realistic representation.`;

      requestBody = {
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: detailedPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: frontPhotoUrl
                }
              }
            ]
          }
        ],
        max_tokens: 4096
      };

      console.log('Using vision API with progress photo:', frontPhotoUrl);
    } else {
      // Fallback to text-only generation
      detailedPrompt = `Create a realistic fitness transformation target image for ${profile?.first_name || 'a person'}, showing their goal physique.

PERSON DETAILS:
- Gender: ${profile?.gender || 'not specified'}
- Age: ${profile?.age || 'adult'} years old
- Height: ${profile?.height || 'average'} cm
- Current weight: ${currentWeight.toFixed(1)} kg
- Goal weight: ${targetWeightNum.toFixed(1)} kg (${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg change)

CURRENT BODY COMPOSITION:
- Body fat: ${currentBodyFat.toFixed(1)}%
- Muscle mass: ${currentMuscle.toFixed(1)}%

TARGET BODY COMPOSITION:
- Target body fat: ${targetBodyFatNum.toFixed(1)}% (${bodyFatChange.toFixed(1)}% change)
- Fitness goal: ${profile?.goal || 'improved fitness'}

TRANSFORMATION DIRECTION:
${weightChange > 0 ? '• Weight gain focused on lean muscle mass' : weightChange < 0 ? '• Weight loss while preserving muscle mass' : '• Body recomposition (maintain weight, change composition)'}
${bodyFatChange < 0 ? '• Reduce body fat for better muscle definition' : '• Maintain healthy body fat levels'}

VISUAL REQUIREMENTS:
Create a photorealistic image of ${profile?.gender === 'female' ? 'a woman' : profile?.gender === 'male' ? 'a man' : 'a person'} aged ${profile?.age || '30'}, showing the target physique described above. The person should:
- Look healthy, fit, and naturally achievable
- Have appropriate muscle definition for the target body fat percentage
- Show confident posture and expression
- Be photographed in good lighting with a clean, simple background
- Represent realistic fitness goals, not extreme transformations
- Match the physical characteristics described (age, height proportions)
- Embody the specific fitness goal: ${profile?.goal || 'general fitness improvement'}

Style: High-quality fitness photography, natural lighting, motivational but realistic representation.`;

      requestBody = {
        model: 'dall-e-3',
        prompt: detailedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        style: 'natural'
      };

      console.log('Using text-only generation (no progress photo available)');
    }

    console.log('Generated prompt:', detailedPrompt);

    // Choose the appropriate API endpoint based on whether we're using vision
    const apiEndpoint = frontPhotoUrl 
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://api.openai.com/v1/images/generations';

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    let imageUrl;

    if (frontPhotoUrl) {
      // Vision API returns text response, we need to extract image generation request
      const analysisResult = data.choices[0].message.content;
      console.log('Vision analysis result:', analysisResult);
      
      // For now, fallback to DALL-E generation based on analysis
      // TODO: Implement image-to-image generation or use analysis to create better prompt
      throw new Error('Vision-based image generation not yet fully implemented. Please try without progress photos for now.');
    } else {
      // Image generation API returns direct image URL
      imageUrl = data.data[0].url;
      console.log('Image generated successfully:', imageUrl);
    }

    return new Response(
      JSON.stringify({ 
        imageUrl,
        prompt: detailedPrompt 
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