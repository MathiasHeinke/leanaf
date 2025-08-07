import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userId, 
      coachId, 
      firstName, 
      isFirstConversation = false,
      contextData = {} 
    } = await req.json();

    console.log('🎯 Generating AI greeting for:', { userId, coachId, firstName, isFirstConversation });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Fetch comprehensive user context + profile data
    const [profileData, recentMeals, recentWorkouts, weightData, sleepData, userProfile] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('meals').select('*').eq('user_id', userId).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).order('created_at', { ascending: false }).limit(3),
      supabase.from('workouts').select('*').eq('user_id', userId).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order('created_at', { ascending: false }).limit(3),
      supabase.from('weights').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      supabase.from('sleep_data').select('*').eq('user_id', userId).gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).order('date', { ascending: false }).limit(3),
      supabase.from('profiles').select('first_name, preferred_name').eq('user_id', userId).maybeSingle()
    ]);

    // Build comprehensive context with precise timing (German timezone)
    const now = new Date();
    const germanTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Berlin"}));
    const hour = germanTime.getHours();
    const minute = germanTime.getMinutes();
    const timeOfDay = hour < 6 ? 'früher Morgen' : 
                      hour < 12 ? 'Morgen' : 
                      hour < 14 ? 'Mittag' :
                      hour < 18 ? 'Nachmittag' : 
                      hour < 22 ? 'Abend' : 'späte Abend';
    const exactTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const dayOfWeek = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][germanTime.getDay()];
    const isWeekend = germanTime.getDay() === 0 || germanTime.getDay() === 6;

    // Coach personalities with deep character details
    const coachPersonalities = {
      'lucy': {
        name: 'Lucy',
        style: 'motivierend, positiv, energiegeladen',
        language: 'Du-Form, herzlich, mit Emojis',
        focus: 'Ernährung, Motivation, positive Energie',
        greeting_style: 'Kurz und energisch, manchmal mit Ernährungstipps'
      },
      'sascha': {
        name: 'Sascha',
        style: 'direkt, ehrlich, norddeutsch',
        language: 'Du-Form, "Moin", authentisch norddeutsch',
        focus: 'Training, ehrliche Analyse, Durchhaltevermögen',
        greeting_style: 'Knackig, manchmal provokant, immer ehrlich'
      },
      'kai': {
        name: 'Kai',
        style: 'mental stark, philosophisch, Flow-orientiert',
        language: 'Du-Form, "Servus", mentale Stärke fokussiert',
        focus: 'Mentale Stärke, Flow-Zustand, Achtsamkeit',
        greeting_style: 'Auf mentalen Zustand fokussiert, energetisch'
      },
      'markus': {
        name: 'Markus',
        style: 'schwäbisch, arbeitsorientiert, bodenständig',
        language: 'Du-Form, "schaffe", schwäbische Ausdrücke',
        focus: 'Harte Arbeit, Disziplin, Grenzen überschreiten',
        greeting_style: 'Arbeits- und leistungsorientiert, motivierend'
      },
      'dr_vita': {
        name: 'Dr. Vita Femina',
        style: 'medizinisch, ganzheitlich, weiblich',
        language: 'Sie-Form, professionell aber warm',
        focus: 'Ganzheitliche Gesundheit, hormonelle Balance',
        greeting_style: 'Professionell, auf Wohlbefinden fokussiert'
      },
      'sophia': {
        name: 'Sophia',
        style: 'integral, achtsam, spirituell',
        language: 'Du-Form, "Namaste", achtsam',
        focus: 'Ganzheitliches Wachstum, Achtsamkeit, Balance',
        greeting_style: 'Achtsam, auf innere Balance fokussiert'
      }
    };

    const coach = coachPersonalities[coachId] || coachPersonalities['lucy'];

    // Determine the display name (preferred_name takes priority over first_name)
    let displayName = 'mein Schützling'; // fallback
    if (userProfile.data) {
      displayName = userProfile.data.preferred_name || userProfile.data.first_name || displayName;
    }
    console.log('👤 Display name resolved:', { preferred_name: userProfile.data?.preferred_name, first_name: userProfile.data?.first_name, final: displayName });

    // Build context summary with precise timing
    let contextSummary = `Benutzer: ${displayName}\nUhrzeit: ${exactTime} Uhr (${timeOfDay})\nWochentag: ${dayOfWeek}\nWochenende: ${isWeekend ? 'Ja' : 'Nein'}`;
    
    if (profileData.data) {
      const profile = profileData.data;
      contextSummary += `\nZiele: ${profile.goals || 'Nicht angegeben'}`;
      contextSummary += `\nAktivitätslevel: ${profile.activity_level || 'Nicht angegeben'}`;
    }

    if (recentMeals.data && recentMeals.data.length > 0) {
      contextSummary += `\nLetztes Essen: ${recentMeals.data[0].name} (vor ${Math.round((Date.now() - new Date(recentMeals.data[0].created_at).getTime()) / (1000 * 60 * 60))} Stunden)`;
    }

    if (recentWorkouts.data && recentWorkouts.data.length > 0) {
      contextSummary += `\nLetztes Training: ${recentWorkouts.data[0].name || 'Training'} (vor ${Math.round((Date.now() - new Date(recentWorkouts.data[0].created_at).getTime()) / (1000 * 60 * 60 * 24))} Tagen)`;
    }

    if (weightData.data && weightData.data.length > 1) {
      const currentWeight = weightData.data[0].weight;
      const previousWeight = weightData.data[1].weight;
      const trend = currentWeight > previousWeight ? 'gestiegen' : currentWeight < previousWeight ? 'gesunken' : 'stabil';
      contextSummary += `\nGewichtstrend: ${trend} (${currentWeight}kg)`;
    }

    if (contextData.calLeft) {
      contextSummary += `\nKalorien übrig heute: ${contextData.calLeft}`;
    }

    // Create dynamic system prompt for CONTEXTUAL, VARIED greetings
    const systemPrompt = `Du bist ${coach.name}, ein erfahrener Coach. Wir kennen uns gut und haben schon viele Gespräche geführt.

DEINE PERSÖNLICHKEIT:
- ${coach.style}
- ${coach.language}
- Fokus: ${coach.focus}

BEGRÜSSUNGSREGELN:
- Kurz und knackig (2-4 Sätze max)
- Nutze den aktuellen Kontext (Tageszeit, letzte Aktivitäten, Trends)
- Variiere deine Begrüßungen je nach Situation
- Sei persönlich und authentisch, nicht oberflächlich
- Beziehe dich auf relevante Daten wenn sinnvoll
- Bleib in deinem Stil aber sei flexibel

GUTE BEISPIELE für kontextuelle Begrüßungen:
- Morgens: "Moin! Gut geschlafen? Lass uns den Tag rocken!"
- Nach Training: "Hey! Wie war das Training gestern? Schon wieder bereit?"
- Bei Gewichtstrend: "Servus! Die 2kg weniger sehen gut aus!"
- Abends: "Hi! Schon Pläne für morgen?"
- Bei wenig Kalorien übrig: "Hey! Heute schon gut gegessen?"

Erstelle eine passende, kontextuelle Begrüßung:`;

    console.log('🤖 Calling OpenAI with system prompt');
    console.log('📊 Context Summary sent to AI:', contextSummary);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Kontext für die Begrüßung:\n${contextSummary}\n\nErstelle eine passende, persönliche Begrüßung die zu meiner aktuellen Situation passt.` }
        ],
        temperature: 0.8, // More creative and varied
        max_tokens: 28, // Allow for 2-3 sentences
        presence_penalty: 0.7, // Encourage contextual language
        frequency_penalty: 0.6 // Some repetition ok for personality
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiGreeting = data.choices[0]?.message?.content?.trim();

    if (!aiGreeting) {
      throw new Error('No greeting generated by AI');
    }

    console.log('✨ AI generated greeting:', aiGreeting);

    return new Response(
      JSON.stringify({ 
        greeting: aiGreeting,
        coach_name: coach.name,
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating intelligent greeting:', error);
    
    // Short, human fallback greetings
    const fallbackGreetings = {
      'lucy': 'Hey! ✨',
      'sascha': 'Moin!',
      'kai': 'Hey! 🙏',
      'markus': 'Ei gude!',
      'dr_vita': 'Hey! 🌸',
      'sophia': 'Hey! 🌿'
    };

    const fallback = fallbackGreetings[req.body?.coachId] || fallbackGreetings['lucy'];

    return new Response(
      JSON.stringify({ 
        greeting: fallback,
        coach_name: 'Coach',
        fallback: true,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});