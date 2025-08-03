import { serve } from 'std/server';
import { corsHeaders } from '../_shared/cors.ts';
import { OpenAI } from "openai";
import { SupabaseClient, createClient } from '@supabase/supabase-js'
import { Database } from '../_shared/database.types.ts'

// ============================================================================
// START OF UNIFIED COACH ENGINE
// ============================================================================

// Env variables
const apiKey = Deno.env.get("OPENAI_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: apiKey,
});

// Type definition for Coach
type Coach = {
  id: string;
  name: string;
  personality: string;
  expertise: string[];
  imageUrl: string;
  color: string;
  accentColor: string;
  description: string;
  personaId: string | null;
};

serve(async (req) => {
  // Handle CORS pre-flight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Initialize Supabase client
  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  try {
    const { messages, coach, userId, sessionId } = await req.json();

    // Validate request body
    if (!messages || !coach || !userId || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if coach is a valid Coach type
    const selectedCoach: Coach = coach as Coach;

    // Check if user has sufficient training data
    const hasSufficientData = await checkTrainingDataSufficiency(supabase, userId);

    // If user doesn't have enough data, respond accordingly
    if (!hasSufficientData) {
      return new Response(
        JSON.stringify({
          response: "Bitte trage zuerst mehr Daten ein, damit ich dir besser helfen kann."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context for the OpenAI API call
    // const context = `Du bist ${selectedCoach.name}. ${selectedCoach.description}
    //   Deine Expertise umfasst: ${selectedCoach.expertise.join(', ')}.
    //   Nutze dein Wissen, um personalisierte und hilfreiche Antworten zu geben.`;

    // Enhanced context building with comprehensive user data
    const contextSections = await buildComprehensiveContext(supabase, userId, coach);
    
    const prompt = [
      {
        role: 'system',
        content: `
        Du bist ein persönlicher KI-Coach namens ${selectedCoach.name}. ${selectedCoach.description}
        Deine Expertise umfasst: ${selectedCoach.expertise.join(', ')}.
        Nutze dein Wissen, um personalisierte und hilfreiche Antworten zu geben.
        Sei immer freundlich, motivierend und unterstützend. Gib präzise und wissenschaftlich fundierte Antworten.
        In den Fällen, in denen du keine klare Antwort geben kannst, bitte den Benutzer, seine Frage umzuformulieren oder mehr Informationen zu geben.
        Du hast Zugriff auf die folgenden Informationen über den Benutzer:
        ${contextSections.map(section => `
        === ${section.title} ===
        ${section.content}
        `).join('\n')}
        `
      },
      ...messages,
    ];

    // Call the OpenAI API
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: prompt,
    });

    const assistantMessage = chatCompletion.choices[0].message.content;
    const usage = chatCompletion.usage;

    // Log the interaction to Supabase
    const { error: logError } = await supabase
      .from('coach_interactions')
      .insert({
        user_id: userId,
        coach_id: selectedCoach.id,
        session_id: sessionId,
        user_message: messages[messages.length - 1].content,
        assistant_message: assistantMessage,
        context: contextSections.map(section => `=== ${section.title} ===\n${section.content}`).join('\n'),
        prompt_tokens: usage?.prompt_tokens,
        completion_tokens: usage?.completion_tokens,
        total_tokens: usage?.total_tokens,
      });

    if (logError) {
      console.error('Failed to log interaction:', logError);
    }

    return new Response(
      JSON.stringify({ 
        response: assistantMessage,
        usage: usage || null
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in unified coach engine:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
}); // This closing brace and parenthesis was missing

// Helper function to check if user has sufficient training data
async function checkTrainingDataSufficiency(supabase: any, userId: string): Promise<boolean> {
  const TRAINING_DATA_THRESHOLD = 3;

  // Fetch the count of training logs for the user
  const { data, error } = await supabase
    .from('training_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching training logs count:', error);
    return false; // Assume insufficient data in case of an error
  }

  const trainingLogCount = data?.length || 0;

  // Return whether the user has sufficient training data
  return trainingLogCount >= TRAINING_DATA_THRESHOLD;
}

// Helper function to build comprehensive context
async function buildComprehensiveContext(supabase: any, userId: string, coach: any) {
  const sections = [];

  // Fetch the latest training logs
  const { data: trainingLogs, error: trainingLogsError } = await supabase
    .from('training_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (trainingLogsError) {
    console.error('Error fetching training logs:', trainingLogsError);
  } else if (trainingLogs && trainingLogs.length > 0) {
    sections.push({
      title: 'Letzte Trainingseinheiten',
      content: trainingLogs.map(log => `
        Datum: ${log.created_at},
        Typ: ${log.training_type},
        Dauer: ${log.duration_minutes} Minuten,
        Intensität: ${log.intensity},
        Notizen: ${log.notes || 'Keine'}
      `).join('\n')
    });
  }

  // Fetch the latest food logs
  const { data: foodLogs, error: foodLogsError } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (foodLogsError) {
    console.error('Error fetching food logs:', foodLogsError);
  } else if (foodLogs && foodLogs.length > 0) {
    sections.push({
      title: 'Letzte Mahlzeiten',
      content: foodLogs.map(log => `
        Datum: ${log.created_at},
        Mahlzeit: ${log.meal_type},
        Beschreibung: ${log.description},
        Kalorien: ${log.calories || 'Nicht angegeben'},
        Protein: ${log.protein || 'Nicht angegeben'}g,
        Kohlenhydrate: ${log.carbohydrates || 'Nicht angegeben'}g,
        Fett: ${log.fat || 'Nicht angegeben'}g
      `).join('\n')
    });
  }

  // Fetch user profile information
  const { data: userProfile, error: userProfileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (userProfileError) {
    console.error('Error fetching user profile:', userProfileError);
  } else if (userProfile) {
    sections.push({
      title: 'Benutzerprofil',
      content: `
        Alter: ${userProfile.age || 'Nicht angegeben'},
        Geschlecht: ${userProfile.gender || 'Nicht angegeben'},
        Größe: ${userProfile.height_cm || 'Nicht angegeben'} cm,
        Gewicht: ${userProfile.weight_kg || 'Nicht angegeben'} kg,
        Aktivitätslevel: ${userProfile.activity_level || 'Nicht angegeben'},
        Ziele: ${userProfile.goals || 'Nicht angegeben'}
      `
    });
  }
  
  return sections;
}

// ============================================================================
// END OF UNIFIED COACH ENGINE
// ============================================================================
