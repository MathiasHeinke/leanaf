import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getTaskModel } from '../_shared/openai-config.ts';
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
  let requestedCoachId = 'ares';

  try {
    const { 
      userId, 
      coachId, 
      firstName, 
      isFirstConversation = false,
      contextData = {},
      alreadyGreeted = false 
    } = await req.json();

    requestedCoachId = coachId;

    console.log('🎯 Generating AI greeting for:', { userId, coachId, firstName, isFirstConversation, alreadyGreeted });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Fetch comprehensive user context + profile data
    const [profileData, recentMeals, recentWorkouts, weightData, sleepData, userProfile, recentJournal] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('meals').select('*').eq('user_id', userId).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).order('created_at', { ascending: false }).limit(3),
      supabase.from('workouts').select('*').eq('user_id', userId).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order('created_at', { ascending: false }).limit(3),
      supabase.from('weight_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      supabase.from('sleep_tracking').select('*').eq('user_id', userId).gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).order('date', { ascending: false }).limit(3),
      supabase.from('profiles').select('first_name, preferred_name').eq('user_id', userId).maybeSingle(),
      supabase.from('journal_entries').select('energy_level, mood_score, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
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

    // ARES-Only Coach System - Single unified coach
    const coachPersonalities: Record<string, { name: string; style: string; language: string; focus: string; greeting_style: string }> = {
      'ares': {
        name: 'ARES',
        style: 'dominant, meta-intelligent, ultimativ',
        language: 'Du-Form, kommandierend, direkt, ohne Schmeicheleien',
        focus: 'Cross-domain Optimization, mentale Härte, totale Performance',
        greeting_style: 'Kurz, dominant, herausfordernd, brutal ehrlich'
      }
    };

    // Always resolve to ARES
    const coach = coachPersonalities['ares'];

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

    // Mindset Journey (Tagebuch) – letzte Notiz
    if (recentJournal.data && recentJournal.data.length > 0) {
      const j = recentJournal.data[0];
      const hoursSince = Math.max(0, Math.round((Date.now() - new Date(j.created_at).getTime()) / (1000 * 60 * 60)));
      const moodTxt = typeof j.mood_score === 'number' ? `, Stimmung: ${j.mood_score}` : '';
      const energyTxt = typeof j.energy_level === 'number' ? `, Energie: ${j.energy_level}` : '';
      contextSummary += `\nMindset-Journey: letzte Notiz vor ${hoursSince} Std${moodTxt}${energyTxt}`;
    }

    // ARES-Only Greeting Strategy
    const coachGreetingStrategies: Record<string, { themes: string[]; examples: string[] }> = {
      'ares': {
        themes: ['ultimate', 'dominant', 'meta', 'optimization', 'performance', 'brutal'],
        examples: [
          'Status?',
          'Bereit für Brutalität?',
          'Schwer ist korrekt.',
          'Hantel greifen oder jammern?',
          'Zeit für totale Dominanz.',
          'Performance-Check!'
        ]
      }
    };

    // Create dynamic, contextual system prompt - always ARES
    const strategy = coachGreetingStrategies['ares'];
    const followupRules = alreadyGreeted ? `FOLLOW-UP-MODUS:
- KEINE Begrüßung. Kein "Moin", "Hey", "Hallo", "Servus", "Guten ...".
- Starte direkt mit einer konkreten, menschlichen Nachfrage oder einem kurzen Impuls.
- Maximal 2 kurze Sätze. Keine erneute Anrede.
` : '';
    const systemPrompt = `Du bist ${coach.name}, ein erfahrener Ultimate Performance Coach. Erstelle eine authentische, contextuelle Begrüßung.

DEINE PERSÖNLICHKEIT & STIL:
- ${coach.style}
- ${coach.language}
- Fokus: ${coach.focus}
- Greeting-Stil: ${coach.greeting_style}

VARIANZ-STRATEGIEN für ${coach.name}:
Themes: ${strategy.themes.join(', ')}

    STILRICHTUNGEN (variiere zwischen diesen):
    ${strategy.examples.map(ex => `- ${ex}`).join('\n')}
    
    ${followupRules}
    KONTEXT-REGELN:
- MAXIMAL 2 kurze Sätze! Keine langen Erklärungen!
- Vollständige Sätze (keine Abbrüche!)
- Nutze aktuellen Kontext intelligent
- VERSCHIEDENE Themen je nach Daten:
  * Bei Training-Daten → Training erwähnen
  * Bei Gewichtstrend → darauf eingehen  
  * Bei bestimmter Tageszeit → passend begrüßen
  * Ohne spezielle Daten → allgemeine Themen (Energie, Pläne, Wohlbefinden)
- Authentisch in deinem Stil bleiben
- Echte Varianz zwischen verschiedenen Gesprächen

WICHTIG: MAXIMAL 2 kurze Sätze! Erstelle eine prägnante, natürliche Begrüßung!`;

    // Special ARES handling - use voice generator for authentic experience
    if (coachId === 'ares') {
      console.log('⚡ Generating ARES greeting with voice system');
      
      // Create ProtocolState from user analytics
      const protocolState = {
        training: [],
        nutrition: [],
        dev: [{
          date: new Date().toISOString(),
          sleep_hours: sleepData.data?.[0]?.duration || 7,
          mood: recentJournal.data?.[0]?.mood_score ? 
            Math.round((recentJournal.data[0].mood_score + 5) / 2) + 3 : 6, // Convert -5/+5 to 1-10
          misses: recentWorkouts.data?.length === 0 ? 1 : 0,
          wins: recentWorkouts.data?.length > 0 ? 1 : 0,
          hrv_drop_pct: Math.random() > 0.5 ? 0.2 : -0.3 // Mock HRV data
        }]
      };

      // Generate context tags based on user situation
      const contextTags = [];
      if (timeOfDay.includes('Morgen')) contextTags.push('morning');
      if (timeOfDay.includes('Abend')) contextTags.push('evening');
      if (recentWorkouts.data?.length > 0) contextTags.push('post-workout');
      if (recentWorkouts.data?.length === 0) contextTags.push('missed-session');
      if (sleepData.data?.[0]?.duration && sleepData.data[0].duration < 6) contextTags.push('sleep-deficit');

      // ARES configuration - adaptive archetype blend based on performance
      const runScore = protocolState.dev[0].mood - 5 + 
        (protocolState.dev[0].wins || 0) * 0.5 - 
        (protocolState.dev[0].misses || 0) * 0.5;
      
      const aresConfig = {
        sentenceLength: { scale: 0.3, minWords: 4, maxWords: 8 }, // Short and brutal
        archetypeBlend: runScore < -1 ? 
          { commander: 0.5, drill: 0.3, smith: 0.2 } : // Poor performance = harsh
          runScore > 1 ?
          { father: 0.4, sage: 0.3, smith: 0.3 } : // Good performance = supportive
          { commander: 0.4, smith: 0.4, comrade: 0.2 }, // Balanced
        language: 'de',
        humorHardnessBias: runScore < 0 ? -0.5 : 0.2, // Harder when performing poorly
        allowDrill: runScore < -2 // Only allow drill mode for very poor performance
      };

      try {
        // Call ARES voice generator
        const aresResponse = await fetch(`https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/ares-voice-generator`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
          },
          body: JSON.stringify({
            cfg: aresConfig,
            state: protocolState,
            contextTags: contextTags
          })
        });

        if (aresResponse.ok) {
          const aresData = await aresResponse.json();
          const aresGreeting = aresData.text || 'Status?';
          console.log(`⚡ ARES voice generated: ${aresGreeting}`);
          
          return new Response(
            JSON.stringify({ 
              greeting: aresGreeting,
              coach_name: 'ARES',
              generated_at: new Date().toISOString(),
              ares_meta: {
                archetype: aresData.archetypePicked,
                tone: aresData.tone,
                runScore: aresData.meta?.runScore
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.error('ARES voice generator failed:', await aresResponse.text());
          throw new Error('ARES voice generator failed');
        }
      } catch (aresError) {
        console.error('ARES voice system error:', aresError);
        // Fallback to simple ARES greeting
        return new Response(
          JSON.stringify({ 
            greeting: 'Status?',
            coach_name: 'ARES',
            generated_at: new Date().toISOString(),
            fallback: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Standard OpenAI generation for other coaches
    console.log('🤖 Calling OpenAI with enhanced system prompt');
    console.log('📊 Context Summary sent to AI:', contextSummary);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getTaskModel('generate-intelligent-greeting'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Aktuelle Situation:\n${contextSummary}\n\n${alreadyGreeted ? 'Erstelle eine kurze Follow-up-Nachricht OHNE Begrüßung: direkte Nachfrage oder kurzer Impuls. Max. 2 Sätze.' : 'Erstelle eine authentische, vollständige Begrüßung die zu meiner Situation passt. Nutze deinen individuellen Stil und variiere das Thema.'}` }
        ],
        temperature: 0.9, // Higher creativity for more variance
        max_tokens: 60, // Increased for complete sentences
        presence_penalty: 0.8, // Strong encouragement for contextual language
        frequency_penalty: 0.7 // Reduce repetitive patterns
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
      'sophia': 'Hey! 🌿',
      'ares': 'Status? ⚡'
    };

    const fallback = fallbackGreetings[requestedCoachId] || fallbackGreetings['lucy'];

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