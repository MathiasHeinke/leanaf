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
    console.log('=== DEBUG: API Keys Check ===');
    const bflApiKey = Deno.env.get('BFL_API_KEY');
    const huggingFaceToken = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('BFL_API_KEY present:', !!bflApiKey);
    console.log('HUGGING_FACE_ACCESS_TOKEN present:', !!huggingFaceToken);
    console.log('OPENAI_API_KEY present:', !!openAIApiKey);
    
    if (!bflApiKey && !huggingFaceToken && !openAIApiKey) {
      throw new Error('No AI API keys configured. Please add BFL_API_KEY, HUGGING_FACE_ACCESS_TOKEN, or OPENAI_API_KEY');
    }
    
    console.log('API keys available:', { 
      bfl: !!bflApiKey,
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
    const { targetWeight, targetBodyFat, progressPhotoUrl } = await req.json();
    
    console.log('=== DEBUG: Request payload ===');
    console.log('targetWeight:', targetWeight);
    console.log('targetBodyFat:', targetBodyFat);
    console.log('progressPhotoUrl:', progressPhotoUrl);

    // Get user profile data for better prompting
    const { data: profile } = await supabase
      .from('profiles')
      .select('gender, height, age, goal, target_weight, target_body_fat_percentage, weight, first_name')
      .eq('user_id', userId)
      .single();

    // Use provided progress photo or get latest from weight_history
    let frontPhotoUrl = progressPhotoUrl;
    let latestWeightEntry = null;
    
    if (!frontPhotoUrl) {
      const { data: weightEntry } = await supabase
        .from('weight_history')
        .select('photo_urls, weight, body_fat_percentage, muscle_percentage, date')
        .eq('user_id', userId)
        .not('photo_urls', 'is', null)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      latestWeightEntry = weightEntry;

      // Get the middle photo (front view) from the photo_urls array
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
    } else {
      console.log('Using provided progress photo:', frontPhotoUrl);
    }

    if (!frontPhotoUrl) {
      console.log('No progress photo found, falling back to text-only generation');
    }
    
    console.log('=== DEBUG: Photo Selection ===');
    console.log('frontPhotoUrl selected:', frontPhotoUrl);
    console.log('latestWeightEntry photo_urls:', latestWeightEntry?.photo_urls);

    // Get user's workout frequency for activity level calculation
    const { data: recentWorkouts } = await supabase
      .from('workouts')
      .select('date, did_workout')
      .eq('user_id', userId)
      .gte('date', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 4 weeks
      .eq('did_workout', true);
    
    const workoutsPerWeek = Math.round((recentWorkouts?.length || 0) / 4);
    
    // Calculate target values
    const currentWeight = latestWeightEntry?.weight || profile?.weight || 70;
    const targetWeightNum = targetWeight || profile?.target_weight || currentWeight;
    const targetBodyFatNum = targetBodyFat || profile?.target_body_fat_percentage || 15;
    
    // Determine activity level based on workout frequency
    let activityLevel = 'sedentary';
    let workoutFrequency = '';
    
    if (workoutsPerWeek >= 6) {
      activityLevel = 'very active';
      workoutFrequency = `${workoutsPerWeek}x week workout`;
    } else if (workoutsPerWeek >= 4) {
      activityLevel = 'active';
      workoutFrequency = `${workoutsPerWeek}x week workout`;
    } else if (workoutsPerWeek >= 2) {
      activityLevel = 'moderate active';
      workoutFrequency = `${workoutsPerWeek}x week workout`;
    }
    
    // Create photorealistic prompt for fitness transformation
    let detailedPrompt;

    if (frontPhotoUrl) {
      // Photorealistic image editing prompt with explicit realism keywords
      detailedPrompt = `Professional fitness photography, photorealistic, high-quality photo. Transform this person to show their fitness goal: ${targetBodyFatNum}% body fat, ${targetWeightNum}kg body weight, ${activityLevel} lifestyle${workoutFrequency ? ' with ' + workoutFrequency : ''}. Realistic human proportions, natural lighting, detailed muscle definition, professional gym photography style. No cartoon, no anime, no illustration, photorealistic only.`;
    } else {
      // Fallback for text-only generation with photorealistic emphasis
      const genderDesc = profile?.gender === 'female' ? 'woman' : profile?.gender === 'male' ? 'man' : 'person';
      const ageDesc = profile?.age ? `${profile.age}-year-old` : 'young adult';
      
      detailedPrompt = `Professional fitness photography, photorealistic portrait of a fit ${ageDesc} ${genderDesc}. Body composition: ${targetBodyFatNum}% body fat, ${targetWeightNum}kg, ${activityLevel} lifestyle${workoutFrequency ? ' with ' + workoutFrequency : ''}. High-quality photo, realistic human proportions, natural lighting, detailed muscle definition, professional gym photography. No cartoon, no anime, no illustration, photorealistic only.`;
    }

    console.log('Generated simplified prompt:', detailedPrompt);
    console.log('=== DEBUG: Prompt Generation ===');
    console.log('targetBodyFatNum:', targetBodyFatNum);
    console.log('targetWeightNum:', targetWeightNum);
    console.log('activityLevel:', activityLevel);
    console.log('workoutFrequency:', workoutFrequency);
    console.log('workoutsPerWeek:', workoutsPerWeek);

    // Test BFL API Key first
    if (bflApiKey) {
      console.log('=== TESTING BFL API KEY ===');
      try {
        const testResponse = await fetch('https://api.bfl.ai/v1/get_balance', {
          headers: {
            'x-key': bflApiKey,
          },
        });
        
        if (testResponse.ok) {
          const balanceData = await testResponse.json();
          console.log('✅ BFL API Key is valid. Balance:', balanceData);
        } else {
          const errorData = await testResponse.text();
          console.error('❌ BFL API Key test failed:', testResponse.status, errorData);
        }
      } catch (testError) {
        console.error('❌ BFL API Key test error:', testError);
      }
    }

    // Helper function to generate images with FLUX Kontext Pro for image editing
    const generateImageWithFallback = async (prompt: string, inputImageUrl: string | null, index: number, maxRetries = 2) => {
      console.log(`=== DEBUG: Starting generation ${index + 1} ===`);
      console.log('Using prompt:', prompt);
      console.log('Input image URL:', inputImageUrl);
      console.log('BFL API key available:', !!bflApiKey);
      
      // Try FLUX Kontext Pro if BFL API key is available and we have an input image
      if (bflApiKey && inputImageUrl) {
        console.log(`Trying image generation ${index + 1} with FLUX Kontext Pro (image editing)`);
        
        for (let retry = 0; retry <= maxRetries; retry++) {
          try {
            // Convert image URL to base64 (without data URL prefix for BFL API)
            let inputImageBase64 = '';
            try {
              console.log(`Fetching input image from: ${inputImageUrl}`);
              const imageResponse = await fetch(inputImageUrl);
              
              if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
              }
              
              const imageBuffer = await imageResponse.arrayBuffer();
              console.log(`Image fetched successfully, size: ${imageBuffer.byteLength} bytes`);
              
              // BFL API expects raw base64 string without data URL prefix
              inputImageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
              console.log(`Base64 conversion successful, length: ${inputImageBase64.length}`);
            } catch (imageError) {
              console.error('❌ Failed to fetch and convert input image:', imageError);
              throw new Error(`Failed to process input image: ${imageError.message}`);
            }
            
            const requestBody = {
              prompt: prompt,
              input_image: inputImageBase64,
              aspect_ratio: "3:4",
              safety_tolerance: 3,
              prompt_upsampling: false,
              seed: Math.floor(Math.random() * 1000000)
            };
            
            console.log(`Sending request to FLUX Kontext Pro API...`);
            console.log('Request details:', {
              prompt: prompt,
              aspect_ratio: requestBody.aspect_ratio,
              safety_tolerance: requestBody.safety_tolerance,
              prompt_upsampling: requestBody.prompt_upsampling,
              seed: requestBody.seed,
              input_image_length: inputImageBase64.length
            });
            
            // Submit generation request to FLUX Kontext Pro
            const generateResponse = await fetch('https://api.bfl.ai/v1/flux-kontext-pro', {
              method: 'POST',
              headers: {
                'x-key': bflApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });
            
            console.log(`FLUX Kontext Pro response status: ${generateResponse.status}`);
            
            let responseText = '';
            try {
              responseText = await generateResponse.text();
              console.log('Raw response:', responseText);
            } catch (textError) {
              console.error('Failed to read response text:', textError);
            }
            
            if (!generateResponse.ok) {
              let errorMessage = `HTTP ${generateResponse.status}: ${generateResponse.statusText}`;
              
              try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.message || errorData.error || errorMessage;
                console.error('Parsed error data:', errorData);
              } catch (parseError) {
                console.error('Failed to parse error response as JSON');
                errorMessage = responseText || errorMessage;
              }
              
              throw new Error(`FLUX Kontext Pro API Error: ${errorMessage}`);
            }
            
            let generateResult;
            try {
              generateResult = JSON.parse(responseText);
              console.log('Parsed generation result:', generateResult);
            } catch (parseError) {
              console.error('Failed to parse success response as JSON:', parseError);
              throw new Error('Invalid JSON response from FLUX Kontext Pro API');
            }
            
            const taskId = generateResult.id;
            
            if (!taskId) {
              console.error('No task ID in response:', generateResult);
              throw new Error('No task ID received from FLUX Kontext Pro API');
            }
            
            console.log(`✅ FLUX Kontext Pro task submitted: ${taskId}, waiting for completion...`);
            
            // Poll for result (BFL API is async)
            let attempts = 0;
            const maxAttempts = 60; // 60 seconds max wait
            
            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
              
              const resultResponse = await fetch(`https://api.bfl.ai/v1/get_result?id=${taskId}`, {
                headers: {
                  'x-key': bflApiKey,
                },
              });
              
              if (resultResponse.ok) {
                const resultData = await resultResponse.json();
                
                if (resultData.status === 'Ready') {
                  console.log(`✅ Successfully generated image ${index + 1} with FLUX Kontext Pro`);
                  return { 
                    data: [{ url: resultData.result.sample }], 
                    model: 'flux-kontext-pro',
                    provider: 'bfl-kontext'
                  };
                } else if (resultData.status === 'Error' || resultData.status === 'Request Moderated' || resultData.status === 'Content Moderated') {
                  console.error('FLUX Kontext Pro failed with status:', resultData.status);
                  console.error('Error details:', resultData);
                  throw new Error(`FLUX Kontext Pro failed: ${resultData.status} - ${JSON.stringify(resultData.details || resultData)}`);
                } else if (resultData.status === 'Pending') {
                  attempts++;
                  console.log(`⏳ FLUX Kontext Pro task ${taskId} still pending (${attempts}/${maxAttempts})...`);
                  continue;
                } else {
                  console.log('Unknown status:', resultData.status, resultData);
                }
              } else {
                console.error(`Failed to check result status: ${resultResponse.status}`);
                const errorText = await resultResponse.text();
                console.error('Result check error:', errorText);
              }
              
              attempts++;
            }
            
            throw new Error(`FLUX Kontext Pro timeout after ${maxAttempts} seconds`);
            
          } catch (error) {
            console.error(`❌ FLUX Kontext Pro generation ${index + 1} failed (attempt ${retry + 1}):`, error);
            if (retry < maxRetries) {
              const waitTime = Math.pow(2, retry) * 1000;
              console.log(`⏳ Waiting ${waitTime}ms before FLUX Kontext Pro retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }
        console.log(`❌ FLUX Kontext Pro failed for image ${index + 1}, falling back to HuggingFace...`);
      }
      
      // Try FLUX.1-schnell via HuggingFace if BFL failed or not available
      if (huggingFaceToken) {
        console.log(`Trying image generation ${index + 1} with FLUX.1-schnell (HuggingFace)`);
        
        for (let retry = 0; retry <= maxRetries; retry++) {
          try {
            const hf = new HfInference(huggingFaceToken);
            
            // Clean prompt for FLUX - remove technical language
            const fluxPrompt = prompt
              .replace('Show this same person after achieving', 'A person who has achieved')
              .replace('Same person, same face, same body type, but now', 'Now')
              .replace('Natural progress photo showing', 'Photo showing')
              .replace('No extreme changes, just a healthier version of the same person.', 'Subtle, natural improvement.');
            
            const image = await hf.textToImage({
              inputs: fluxPrompt,
              model: 'black-forest-labs/FLUX.1-schnell',
            });
            
            // Convert blob to base64
            const arrayBuffer = await image.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            const imageUrl = `data:image/png;base64,${base64}`;
            
            console.log(`Successfully generated image ${index + 1} with FLUX.1-schnell (HuggingFace)`);
            return { 
              data: [{ url: imageUrl }], 
              model: 'flux-1-schnell',
              provider: 'huggingface'
            };
            
          } catch (error) {
            console.error(`HuggingFace FLUX generation ${index + 1} failed (attempt ${retry + 1}):`, error);
            if (retry < maxRetries) {
              const waitTime = Math.pow(2, retry) * 1000;
              console.log(`Waiting ${waitTime}ms before HuggingFace retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }
        console.log(`HuggingFace FLUX failed for image ${index + 1}, falling back to OpenAI...`);
      }
      
      // Fallback to OpenAI models if all FLUX options fail
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

    // Generate 4 images using FLUX Kontext Pro or fallback models
    console.log('Generating 4 target images with FLUX Kontext Pro...');
    
    const imagePromises = Array.from({ length: 4 }, (_, index) => {
      // Use the same simplified prompt for all images when using Kontext Pro
      // The variation will come from different seeds
      return generateImageWithFallback(detailedPrompt, frontPhotoUrl, index);
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
        targetBodyFat: targetBodyFatNum,
        activityLevel,
        workoutFrequency
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