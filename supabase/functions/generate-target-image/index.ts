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
    const bflApiKey = Deno.env.get('BFL_API_KEY');
    const huggingFaceToken = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
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

    // Calculate target improvements
    const currentWeight = latestWeightEntry?.weight || profile?.weight || 70;
    const currentBodyFat = latestWeightEntry?.body_fat_percentage || 20;
    const currentMuscle = latestWeightEntry?.muscle_percentage || 35;
    
    const targetWeightNum = targetWeight || profile?.target_weight || currentWeight;
    const targetBodyFatNum = targetBodyFat || profile?.target_body_fat_percentage || Math.max(currentBodyFat - 5, 8);
    
    const weightChange = targetWeightNum - currentWeight;
    const bodyFatChange = targetBodyFatNum - currentBodyFat;
    
    // Create natural, realistic prompts focused on achievable transformations
    let detailedPrompt;

    if (frontPhotoUrl) {
      // Natural transformation prompt with progress photo
      const weightDirection = weightChange > 5 ? 'gaining healthy weight' : weightChange < -5 ? 'losing excess weight' : 'improving body composition';
      const bodyDescription = targetBodyFatNum <= 12 ? 'lean and athletic' : targetBodyFatNum <= 18 ? 'fit and toned' : 'healthy and strong';
      
      detailedPrompt = `Show this same person after achieving their fitness goal through ${weightDirection}. Same person, same face, same body type, but now ${bodyDescription} at ${targetBodyFatNum}% body fat. Natural progress photo showing realistic, healthy transformation. Good lighting, normal gym clothes or casual wear, confident but natural expression. No extreme changes, just a healthier version of the same person.`;

    } else {
      // Natural person generation for text-only
      const genderDesc = profile?.gender === 'female' ? 'woman' : profile?.gender === 'male' ? 'man' : 'person';
      const ageDesc = profile?.age ? `${profile.age} years old` : 'young adult';
      const bodyDescription = targetBodyFatNum <= 12 ? 'lean and athletic' : targetBodyFatNum <= 18 ? 'fit and toned' : 'healthy and strong';
      
      detailedPrompt = `Natural photo of a ${bodyDescription} ${ageDesc} ${genderDesc} at ${targetBodyFatNum}% body fat. Realistic body proportions, normal gym clothes or athletic wear, natural lighting, confident smile. Not a model or extreme fitness transformation - just a regular person who is ${bodyDescription} and healthy.`;
    }

    console.log('Generated simplified prompt:', detailedPrompt);

    // Helper function to generate images with BFL Direct API first, then fallbacks
    const generateImageWithFallback = async (prompt: string, index: number, maxRetries = 2) => {
      // Try BFL Direct API first if BFL API key is available
      if (bflApiKey) {
        console.log(`Trying image generation ${index + 1} with BFL Direct API`);
        
        for (let retry = 0; retry <= maxRetries; retry++) {
          try {
            // Clean prompt for FLUX - remove technical language
            const fluxPrompt = prompt
              .replace('Show this same person after achieving', 'A person who has achieved')
              .replace('Same person, same face, same body type, but now', 'Now')
              .replace('Natural progress photo showing', 'Photo showing')
              .replace('No extreme changes, just a healthier version of the same person.', 'Subtle, natural improvement.');
            
            // Submit generation request to BFL API
            const generateResponse = await fetch('https://api.bfl.ai/v1/flux-kontext-pro', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${bflApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                prompt: fluxPrompt,
                width: 1024,
                height: 1024,
                safety_tolerance: 2,
                seed: Math.floor(Math.random() * 1000000)
              }),
            });
            
            if (!generateResponse.ok) {
              const errorData = await generateResponse.json();
              throw new Error(`BFL API Error: ${errorData.message || 'Unknown error'}`);
            }
            
            const generateResult = await generateResponse.json();
            const taskId = generateResult.id;
            
            if (!taskId) {
              throw new Error('No task ID received from BFL API');
            }
            
            console.log(`BFL task submitted: ${taskId}, waiting for completion...`);
            
            // Poll for result (BFL API is async)
            let attempts = 0;
            const maxAttempts = 60; // 60 seconds max wait
            
            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
              
              const resultResponse = await fetch(`https://api.bfl.ai/v1/get_result?id=${taskId}`, {
                headers: {
                  'Authorization': `Bearer ${bflApiKey}`,
                },
              });
              
              if (resultResponse.ok) {
                const resultData = await resultResponse.json();
                
                if (resultData.status === 'Ready') {
                  console.log(`Successfully generated image ${index + 1} with BFL Direct API`);
                  return { 
                    data: [{ url: resultData.result.sample }], 
                    model: 'flux-kontext-pro',
                    provider: 'bfl-direct'
                  };
                } else if (resultData.status === 'Error' || resultData.status === 'Request Moderated' || resultData.status === 'Content Moderated') {
                  throw new Error(`BFL generation failed: ${resultData.status} - ${JSON.stringify(resultData.details)}`);
                } else if (resultData.status === 'Pending') {
                  attempts++;
                  console.log(`BFL task ${taskId} still pending (${attempts}/${maxAttempts})...`);
                  continue;
                }
              }
              
              attempts++;
            }
            
            throw new Error(`BFL generation timeout after ${maxAttempts} seconds`);
            
          } catch (error) {
            console.error(`BFL generation ${index + 1} failed (attempt ${retry + 1}):`, error);
            if (retry < maxRetries) {
              const waitTime = Math.pow(2, retry) * 1000;
              console.log(`Waiting ${waitTime}ms before BFL retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }
        console.log(`BFL failed for image ${index + 1}, falling back to HuggingFace...`);
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

    // Generate 4 images with fallback models
    console.log('Generating 4 target images with model fallback...');
    
    const imagePromises = Array.from({ length: 4 }, (_, index) => {
      // Add subtle variation to each image - natural poses
      const variations = ['standing naturally', 'casual pose', 'relaxed stance', 'confident posture'];
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