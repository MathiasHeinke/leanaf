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

    const { 
      targetWeight, 
      targetBodyFat, 
      gender, 
      height, 
      currentWeight,
      fitnessGoal 
    } = await req.json();

    // Create a personalized prompt based on user data
    const prompt = `Create a realistic, inspiring fitness transformation image showing a ${gender} person who has achieved their fitness goals. 
    Physical characteristics:
    - Height: ${height}cm
    - Target weight: ${targetWeight}kg
    - Target body fat: ${targetBodyFat}%
    - Fitness goal: ${fitnessGoal}
    
    Style: Professional fitness photography, well-lit, motivational, showing a healthy and fit physique. 
    The person should look confident and strong, representing achievable fitness goals. 
    No face visible, focus on body composition and fitness level.
    High quality, realistic, inspiring fitness transformation result.`;

    console.log('Generating image with prompt:', prompt);

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
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
        prompt: prompt 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-target-image function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});