import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

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

    // Get the latest photo URL from the photo_urls array
    let latestPhotoUrl = null;
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
        latestPhotoUrl = photoUrls[0];
      }
    }

    // Calculate target improvements
    const currentWeight = latestWeightEntry?.weight || profile?.weight || 70;
    const currentBodyFat = latestWeightEntry?.body_fat_percentage || 20;
    const currentMuscle = latestWeightEntry?.muscle_percentage || 35;
    
    const targetWeightNum = targetWeight || profile?.target_weight || currentWeight;
    const targetBodyFatNum = targetBodyFat || profile?.target_body_fat_percentage || Math.max(currentBodyFat - 5, 8);
    
    const weightChange = targetWeightNum - currentWeight;
    const bodyFatChange = targetBodyFatNum - currentBodyFat;
    
    // Enhanced prompt based on user data and progress photos
    const detailedPrompt = `Create a realistic fitness transformation target image for ${profile?.first_name || 'a person'}, showing their goal physique.

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

    console.log('Generated enhanced prompt:', detailedPrompt);

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: detailedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        style: 'natural'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const imageUrl = data.data[0].url;

    console.log('Image generated successfully:', imageUrl);

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