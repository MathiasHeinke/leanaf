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
    const url = new URL(req.url);
    const fileId = url.searchParams.get('fileId');
    
    if (!fileId) {
      throw new Error('No fileId provided');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Download audio file from storage
    const fileName = `voice-recordings/${fileId}.webm`;
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('coach-media')
      .download(fileName);

    if (downloadError) {
      console.error('Storage download error:', downloadError);
      throw new Error(`Failed to retrieve audio: ${downloadError.message}`);
    }

    if (!audioData) {
      throw new Error('Audio file not found');
    }

    // Convert blob to array buffer
    const arrayBuffer = await audioData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Prepare form data for OpenAI with better format handling
    const formData = new FormData();
    
    // Try different audio formats to avoid OpenAI format errors
    const supportedFormats = [
      { type: 'audio/webm', ext: 'webm' },
      { type: 'audio/wav', ext: 'wav' },
      { type: 'audio/mp3', ext: 'mp3' },
      { type: 'audio/ogg', ext: 'ogg' }
    ];
    
    // Use first format (webm) by default
    const format = supportedFormats[0];
    const blob = new Blob([uint8Array], { type: format.type });
    formData.append('file', blob, `audio.${format.ext}`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'de');

    // Send to OpenAI Whisper
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Whisper API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Transcription successful:', result.text?.substring(0, 100) + '...');

    // Clean up: delete the audio file after transcription
    await supabase.storage
      .from('coach-media')
      .remove([fileName]);

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in transcribe-audio function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});