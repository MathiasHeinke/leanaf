
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

// ===== UTILITY FUNCTIONS =====
/**
 * Zentrale Funktion für die Namensauflösung für Coaches (Edge Function Version)
 */
function getDisplayName(profile: any): string {
  if (!profile) return 'mein Schützling';
  
  if (profile.preferred_name?.trim()) return profile.preferred_name.trim();
  if (profile.first_name?.trim()) return profile.first_name.trim();
  
  if (profile.last_name?.trim()) {
    const lastName = profile.last_name.trim();
    if (!lastName.includes(' ') && lastName.length > 1) return lastName;
  }
  
  if (profile.display_name?.trim()) {
    const displayName = profile.display_name.trim();
    const firstName = displayName.includes('-') 
      ? displayName.match(/^([^\s]+)/)?.[1] || displayName.split(' ')[0]
      : displayName.split(' ')[0];
    if (firstName && firstName.length > 1) return firstName;
  }
  
  if (profile.email?.includes('@')) {
    const emailName = profile.email.split('@')[0];
    if (emailName && emailName.length > 2 && !emailName.includes('_') && !emailName.includes('.')) {
      return emailName;
    }
  }
  
  return 'mein Schützling';
}

/**
 * Token Management Functions
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function intelligentTokenShortening(messages: any[], targetTokens: number): any[] {
  if (!messages || messages.length === 0) return [];
  
  const result = [...messages];
  let currentTokens = result.reduce((sum, msg) => sum + estimateTokenCount(msg.content || ''), 0);
  
  while (currentTokens > targetTokens && result.length > 1) {
    result.shift();
    currentTokens = result.reduce((sum, msg) => sum + estimateTokenCount(msg.content || ''), 0);
  }
  
  return result;
}

function summarizeHistory(messages: any[]): string {
  if (!messages || messages.length === 0) return '';
  
  const recentMessages = messages.slice(-10);
  const topics = new Set<string>();
  
  recentMessages.forEach(msg => {
    if (msg.content) {
      const words = msg.content.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 4) topics.add(word);
      });
    }
  });
  
  return Array.from(topics).slice(0, 5).join(', ');
}

// Enhanced system message creation
function createEnhancedSystemMessage(coachPersonality: string, userData: any, memoryContext: string, ragPromptAddition: string, userName: string): string {
  const basePersonality = `Du bist Lucy, eine einfühlsame und motivierende Ernährungsberaterin. Du hilfst ${userName} dabei, ihre/seine Ernährungsziele zu erreichen.

Deine Persönlichkeit:
- Warmherzig und verständnisvoll
- Motivierend ohne zu urteilen  
- Wissenschaftlich fundiert aber einfach erklärt
- Praktische, umsetzbare Ratschläge

Antworte immer auf Deutsch und sprich ${userName} direkt an.`;

  return basePersonality + (ragPromptAddition ? `\n\nZusätzliche Informationen:\n${ragPromptAddition}` : '');
}

function createMemoryContext(coachMemory: any, sentimentResult: any): string {
  return `Beziehungsstand: ${coachMemory.relationship_stage || 'new'}. Vertrauen: ${coachMemory.trust_level || 0}/100.`;
}

function createRAGPromptAddition(ragContext: any): string {
  if (!ragContext || !ragContext.context) return '';
  
  return ragContext.context.map((ctx: any) => ctx.content_chunk).join('\n\n');
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Enhanced Coach chat request received at:', new Date().toISOString());
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body = await req.json();
    const hasImages = !!body.images?.length;
    console.log('Request body received:', { hasMessage: !!body.message, hasImages });

    // Extract user ID from auth header or body
    const authHeader = req.headers.get('authorization');
    let userId = body.userId;
    
    if (!userId && authHeader) {
      const token = authHeader.replace('Bearer ', '');
      // For now, use a placeholder - in production you'd verify the JWT
      userId = token;
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    const message = body.message || '';
    const images = body.images || [];
    const coachPersonality = body.coach_personality || 'lucy';

    console.log('Processing request for user:', userId, 'with message length:', message.length);

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('User profile loaded:', { hasProfile: !!profile });

    const userName = getDisplayName(profile);
    
    // Create system message
    const systemMessage = createEnhancedSystemMessage(coachPersonality, {}, '', '', userName);
    
    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: message || 'Hallo!' }
    ];

    // Add image content if provided
    if (images.length > 0) {
      const lastMessage = messages[messages.length - 1];
      lastMessage.content = [
        { type: 'text', text: message || 'Analyze this image' },
        ...images.map((url: string) => ({
          type: 'image_url',
          image_url: { url }
        }))
      ];
    }

    console.log('Sending request to OpenAI with', messages.length, 'messages');

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', openAIResponse.status, errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const data = await openAIResponse.json();
    const reply = data.choices[0]?.message?.content;

    if (!reply) {
      throw new Error('No response from OpenAI');
    }

    console.log('OpenAI response received, length:', reply.length);

    // Save conversation to database
    try {
      await Promise.all([
        supabase.from('coach_conversations').insert({
          user_id: userId,
          message_role: 'user',
          message_content: message,
          coach_personality: coachPersonality,
        }),
        supabase.from('coach_conversations').insert({
          user_id: userId,
          message_role: 'assistant',
          message_content: reply,
          coach_personality: coachPersonality,
        })
      ]);
      console.log('Conversation saved to database');
    } catch (dbError) {
      console.error('Failed to save conversation:', dbError);
      // Don't fail the request if database save fails
    }

    console.log('Response ready to send');

    return new Response(JSON.stringify({ 
      reply,
      metadata: {
        tokens_used: data.usage?.total_tokens || 0,
        model: 'gpt-4o'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Enhanced coach chat error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Fehler beim Generieren der Coach-Antwort', 
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
