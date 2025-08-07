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
  let requestedCoachId = 'lucy';

  try {
    const { 
      userId, 
      coachId, 
      firstName, 
      isFirstConversation = false,
      contextData = {} 
    } = await req.json();

    requestedCoachId = coachId;

    console.log('🎯 Generating AI greeting for:', { userId, coachId, firstName, isFirstConversation });

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

    // Mindset Journey (Tagebuch) – letzte Notiz
    if (recentJournal.data && recentJournal.data.length > 0) {
      const j = recentJournal.data[0];
      const hoursSince = Math.max(0, Math.round((Date.now() - new Date(j.created_at).getTime()) / (1000 * 60 * 60)));
      const moodTxt = typeof j.mood_score === 'number' ? `, Stimmung: ${j.mood_score}` : '';
      const energyTxt = typeof j.energy_level === 'number' ? `, Energie: ${j.energy_level}` : '';
      contextSummary += `\nMindset-Journey: letzte Notiz vor ${hoursSince} Std${moodTxt}${energyTxt}`;
    }

    // Enhanced coach-specific greeting strategies
    const coachGreetingStrategies = {
      'sascha': {
        themes: ['provokant', 'ehrlich', 'training_check', 'direkt', 'norddeutsch'],
        examples: [
          'Moin! Na, wieder Ausreden?',
          'Hey! Bereit für Ehrlichkeit?', 
          'Moin! Heute ohne Wenn und Aber?',
          'Hey! Zeit für klare Ansagen!',
          'Moin! Gut geschlafen oder wieder gegrübelt?'
        ]
      },
      'lucy': {
        themes: ['energetisch', 'motivational', 'ernährung', 'positiv', 'lifestyle'],
        examples: [
          'Hey! ✨ Du strahlst heute!',
          'Hi! Wie ist deine Energie?',
          'Hey! Schön dich zu sehen! 💪',
          'Hi! Bereit für positive Vibes?',
          'Hey! Was Gutes gegessen heute?'
        ]
      },
      'kai': {
        themes: ['mindset', 'achtsamkeit', 'heutige_gefuehlslage', 'erlebnisse', 'selbstfürsorge', 'was_würde_dir_gut_tun', 'flow', 'balance'],
        examples: [
          'Servus! Wie ging\'s dir heute innerlich—was hat dich bewegt?',
          'Hey! Was würde dir jetzt gut tun—eine kurze Atemübung oder einfach Ruhe?',
          'Servus! Welche Erfahrung hat heute deinen Mindset geprägt?',
          'Hey! Magst du teilen, was gerade am meisten Raum in dir braucht?',
          'Servus! Wie kann ich dir heute etwas Gutes tun—Impulse, Struktur oder Mitgefühl?'
        ]
      },
      'markus': {
        themes: ['arbeit', 'schaffen', 'leistung', 'schwäbisch', 'disziplin'],
        examples: [
          'Abend! Was steht morgen an?',
          'Hey! Bereit zum schaffe?',
          'Abend! Zeit für echte Arbeit?',
          'Hey! Packmer\'s richtig an?',
          'Abend! Heute schon was gschafft?'
        ]
      },
      'dr_vita': {
        themes: ['ganzheitlich', 'wohlbefinden', 'hormone', 'medizinisch', 'weiblich'],
        examples: [
          'Guten Abend! Wie fühlen Sie sich heute?',
          'Hallo! Wie ist Ihr Wohlbefinden?',
          'Guten Abend! Alles in Balance?',
          'Hallo! Wie ist Ihre Energie heute?',
          'Guten Abend! Hören Sie auf Ihren Körper?'
        ]
      }
    };

    // Create dynamic, contextual system prompt with expanded variance
    const strategy = coachGreetingStrategies[coachId] || coachGreetingStrategies['lucy'];
    const mindsetKaiRule = coachId === 'kai' ? `SPEZIFISCH FÜR KAI:
- Beziehe dich vorrangig auf die Mindset Journey (Tagebuch) des Tages: Gefühlslage, Erlebnisse, innere Themen
- Stelle 1 einfühlsame Frage und biete 1 Mini-Impuls oder kleine Fürsorge ("Was würde dir jetzt gut tun?")
` : '';
    const systemPrompt = `Du bist ${coach.name}, ein erfahrener Coach. Erstelle eine authentische, contextuelle Begrüßung.

DEINE PERSÖNLICHKEIT & STIL:
- ${coach.style}
- ${coach.language}
- Fokus: ${coach.focus}
- Greeting-Stil: ${coach.greeting_style}

VARIANZ-STRATEGIEN für ${coach.name}:
Themes: ${strategy.themes.join(', ')}

    STILRICHTUNGEN (variiere zwischen diesen):
    ${strategy.examples.map(ex => `- ${ex}`).join('\n')}
    
    ${mindsetKaiRule}
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
          { role: 'user', content: `Aktuelle Situation:\n${contextSummary}\n\nErstelle eine authentische, vollständige Begrüßung die zu meiner Situation passt. Nutze deinen individuellen Stil und variiere das Thema.` }
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
      'sophia': 'Hey! 🌿'
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