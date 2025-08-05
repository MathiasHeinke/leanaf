import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2';

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
    console.log('Checking API keys...');
    const huggingFaceToken = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!huggingFaceToken && !openAIApiKey) {
      throw new Error('No AI API keys configured. Please add HUGGING_FACE_ACCESS_TOKEN or OPENAI_API_KEY');
    }
    
    console.log('API keys available:', { 
      huggingFace: !!huggingFaceToken, 
      openAI: !!openAIApiKey 
    });

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

    // Helper function to generate images with FLUX first, then OpenAI fallback
    const generateImageWithFallback = async (prompt: string, index: number, maxRetries = 2) => {
      // Try FLUX.1-schnell first if HuggingFace token is available
      if (huggingFaceToken) {
        console.log(`Trying image generation ${index + 1} with FLUX.1-schnell`);
        
        for (let retry = 0; retry <= maxRetries; retry++) {
          try {
            const hf = new HfInference(huggingFaceToken);
            
            // Optimize prompt for FLUX - more natural, less technical
            const fluxPrompt = prompt
              .replace('Professional fitness photo', 'A realistic photograph')
              .replace('Show:', '')
              .replace(/- /g, '')
              .replace('Realistic fitness goals, not extreme transformations.', 'Natural looking, achievable fitness transformation.');
            
            const image = await hf.textToImage({
              inputs: fluxPrompt,
              model: 'black-forest-labs/FLUX.1-schnell',
            });
            
            // Convert blob to base64
            const arrayBuffer = await image.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            const imageUrl = `data:image/png;base64,${base64}`;
            
            console.log(`Successfully generated image ${index + 1} with FLUX.1-schnell`);
            return { 
              data: [{ url: imageUrl }], 
              model: 'flux-1-schnell',
              provider: 'huggingface'
            };
            
          } catch (error) {
            console.error(`FLUX generation ${index + 1} failed (attempt ${retry + 1}):`, error);
            if (retry < maxRetries) {
              const waitTime = Math.pow(2, retry) * 1000;
              console.log(`Waiting ${waitTime}ms before FLUX retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }
        console.log(`FLUX failed for image ${index + 1}, falling back to OpenAI...`);
      }
      
      // Fallback to OpenAI models if FLUX fails or no HuggingFace token
      if (!openAIApiKey) {
        console.error(`No OpenAI API key available for fallback`);
        return null;
      }
      
      const openAIModels = ['dall-e-3', 'dall-e-2'];
      
      for (let modelIndex = 0; modelIndex < openAIModels.length; modelIndex++) {
        const model = openAIModels[modelIndex];
        console.log(`Trying image generation ${index + 1} with OpenAI ${model}`);
        
        for (let retry = 0; retry <= maxRetries; retry++) {
          try {
            const requestBody: any = {
              model,
              prompt,
              n: 1
            };

            // Configure based on model capabilities
            if (model === 'dall-e-3') {
              requestBody.size = '1024x1024';
              requestBody.quality = 'hd';
              requestBody.style = 'vivid';
            } else {
              requestBody.size = '1024x1024';
            }

            const response = await fetch('https://api.openai.com/v1/images/generations', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openAIApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });

            const result = await response.json();
            
            if (!response.ok) {
              const errorMsg = result.error?.message || 'Unknown error';
              console.error(`Image generation ${index + 1} failed with ${model} (attempt ${retry + 1}):`, errorMsg);
              
              // If organization not verified, skip to next model immediately
              if (errorMsg.includes('organization must be verified') || errorMsg.includes('not available')) {
                console.log(`Model ${model} not available, trying next model...`);
                break;
              }
              
              // Rate limit error - wait and retry
              if (errorMsg.includes('rate limit') && retry < maxRetries) {
                const waitTime = Math.pow(2, retry) * 1000; // Exponential backoff
                console.log(`Rate limited, waiting ${waitTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
              }
              
              // If last retry with this model failed, try next model
              if (retry === maxRetries) {
                break;
              }
            } else {
              console.log(`Successfully generated image ${index + 1} with OpenAI ${model}`);
              return { ...result, model, provider: 'openai' };
            }
          } catch (error) {
            console.error(`Network error for image ${index + 1} with ${model} (attempt ${retry + 1}):`, error);
            if (retry === maxRetries) {
              break;
            }
          }
        }
      }
      
      console.error(`Failed to generate image ${index + 1} with all available models`);
      return null;
    };

    // Generate 4 images with fallback models
    console.log('Generating 4 target images with model fallback...');
    
    const imagePromises = Array.from({ length: 4 }, (_, index) => {
      // Add subtle variation to each image
      const variations = ['front pose', 'confident stance', 'athletic pose', 'profile view'];
      const promptVariation = `${detailedPrompt} ${variations[index]}.`;
      
      return generateImageWithFallback(promptVariation, index);
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
      throw new Error('Failed to generate any images with all available models. Please check your OpenAI organization verification status.');
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