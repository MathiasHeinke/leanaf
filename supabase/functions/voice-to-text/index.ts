
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convert base64 to binary safely
function base64ToUint8Array(base64: string): Uint8Array {
  try {
    // Remove data URL prefix if present
    const cleanBase64 = base64.replace(/^data:audio\/[^;]+;base64,/, '');
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
  } catch (error) {
    console.error('Base64 conversion error:', error);
    throw new Error('Invalid base64 audio data');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio, fileId } = await req.json();
    
    console.log('Voice-to-text started, audio type:', typeof audio, 'fileId:', fileId);
    
    if (!audio && !fileId) {
      throw new Error('No audio data or fileId provided');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Convert audio data to binary
    let binaryAudio: Uint8Array;
    
    if (fileId) {
      // Get audio from Supabase Storage
      console.log('Fetching audio from server file:', fileId);
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const { data, error } = await supabase.storage
        .from('coach-media')
        .download(`voice-recordings/${fileId}.webm`);
      
      if (error) {
        console.error('Error downloading file from storage:', error);
        throw new Error(`Failed to download audio file: ${error.message}`);
      }
      
      binaryAudio = new Uint8Array(await data.arrayBuffer());
      console.log('Audio file downloaded from server, size:', binaryAudio.length, 'bytes');
      
    } else if (audio) {
      // Process base64 audio
      if (typeof audio === 'string') {
        // Base64 string
        binaryAudio = base64ToUint8Array(audio);
      } else if (Array.isArray(audio)) {
        // Array of bytes (legacy format)
        binaryAudio = new Uint8Array(audio);
      } else {
        throw new Error('Invalid audio data format');
      }
      
      console.log('Audio data converted, size:', binaryAudio.length, 'bytes');
    } else {
      throw new Error('No audio data or fileId provided');
    }
    
    // Prepare form data
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
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

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in voice-to-text function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
