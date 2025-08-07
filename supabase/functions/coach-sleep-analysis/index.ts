import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getTaskModel } from '../_shared/openai-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, sleepData } = await req.json();
    
    console.log('Received sleep data:', sleepData);

    if (!userId || !sleepData) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or sleepData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get historical sleep data (last 14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const { data: historicalSleep, error: sleepError } = await supabase
      .from('sleep_tracking')
      .select('*')
      .eq('user_id', userId)
      .gte('date', twoWeeksAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (sleepError) {
      console.error('Error fetching sleep data:', sleepError);
    }

    // Get user profile for context
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('goal, age, activity_level')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    // Analyze sleep patterns
    const avgSleepDuration = historicalSleep?.reduce((sum, entry) => sum + (entry.sleep_hours || 0), 0) / (historicalSleep?.length || 1);
    const avgSleepQuality = historicalSleep?.reduce((sum, entry) => sum + (entry.sleep_quality || 0), 0) / (historicalSleep?.length || 1);
    const avgInterruptions = historicalSleep?.reduce((sum, entry) => sum + (entry.sleep_interruptions || 0), 0) / (historicalSleep?.length || 1);

    // Identify patterns and concerns
    const currentSleepHours = sleepData.sleep_hours || 0;
    const currentQuality = sleepData.sleep_quality || 0;
    const currentInterruptions = sleepData.sleep_interruptions || 0;

    // Check for outliers
    const isShortSleep = currentSleepHours < 6;
    const isLongSleep = currentSleepHours > 10;
    const isPoorQuality = currentQuality < 5;
    const highInterruptions = currentInterruptions > 3;

    // Create context for AI analysis
    const sleepContext = {
      currentSleep: sleepData,
      historical: {
        avgDuration: Number(avgSleepDuration.toFixed(1)),
        avgQuality: Number(avgSleepQuality.toFixed(1)),
        avgInterruptions: Number(avgInterruptions.toFixed(1)),
        dataPoints: historicalSleep?.length || 0
      },
      patterns: {
        isShortSleep,
        isLongSleep,
        isPoorQuality,
        highInterruptions
      },
      user: {
        goal: profile?.goal || 'maintain',
        age: profile?.age,
        activityLevel: profile?.activity_level
      }
    };

    // Generate AI feedback from Kai
    const systemPrompt = `Du bist Kai, ein achtsamer und ruhiger Schlaf- und Regenerationscoach. 

Deine Persönlichkeit:
- Ruhig, bedacht und einfühlsam
- Fokus auf ganzheitliche Regeneration und Wohlbefinden
- Wissenschaftlich fundiert aber verständlich
- Natürlich und authentisch, nie übertrieben
- Ermutigend aber ehrlich bei Problemen

Dein Stil:
- Sprichst den User direkt an ("Du hast...", "Dein Schlaf...")
- Verwendest 1-2 passende Emojis pro Nachricht (🌙 😴 🌅 ⭐ 🧘‍♂️)
- Kurze, prägnante Sätze
- Bei Problemen: Konstruktive Lösungsvorschläge
- Bei guten Werten: Anerkennung und Motivation

Analysiere die Schlafdaten und gib eine personalisierte Bewertung ab. Berücksichtige:
- Aktuelle vs. historische Werte
- Ausreißer und Trends
- Benutzerkontext (Ziel, Alter, Aktivitätslevel)
- Schlafqualität, Dauer und Unterbrechungen

Antwort in 3-4 kurzen Sätzen. Sei spezifisch und hilfreich.`;

    const userPrompt = `Hier sind die Schlafdaten zur Analyse:

Aktueller Schlaf:
- Dauer: ${currentSleepHours} Stunden
- Qualität: ${currentQuality}/10
- Unterbrechungen: ${currentInterruptions}x
- Zubettgehen: ${sleepData.bedtime || 'nicht angegeben'}
- Aufwachen: ${sleepData.wake_time || 'nicht angegeben'}

Historische Durchschnitte (${historicalSleep?.length || 0} Einträge):
- Durchschnittliche Dauer: ${avgSleepDuration.toFixed(1)} Stunden
- Durchschnittliche Qualität: ${avgSleepQuality.toFixed(1)}/10
- Durchschnittliche Unterbrechungen: ${avgInterruptions.toFixed(1)}x

Benutzerkontext:
- Ziel: ${profile?.goal || 'maintain'}
- Alter: ${profile?.age || 'nicht angegeben'}
- Aktivitätslevel: ${profile?.activity_level || 'nicht angegeben'}

Besonderheiten:
${isShortSleep ? '⚠️ Sehr wenig Schlaf (unter 6h)' : ''}
${isLongSleep ? '⚠️ Sehr viel Schlaf (über 10h)' : ''}
${isPoorQuality ? '⚠️ Niedrige Schlafqualität (unter 5/10)' : ''}
${highInterruptions ? '⚠️ Viele Unterbrechungen (über 3x)' : ''}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getTaskModel('coach-sleep-analysis'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const coachFeedback = aiResponse.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        coachFeedback,
        context: sleepContext
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in coach-sleep-analysis:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});