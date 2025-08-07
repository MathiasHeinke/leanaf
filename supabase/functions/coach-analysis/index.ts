
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { getTaskModel } from '../_shared/openai-config.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { 
      dailyTotals, 
      dailyGoal, 
      mealsCount, 
      userData,
      voiceMessage,
      chatMessage,
      context,
      history,
      userId,
      timeBasedGreeting,
      timeOfDay
    } = await req.json();

    console.log('🧠 Coach Analysis - Starting analysis with GPT-4.1');

    // Check if user has active subscription for daily analysis limits
    if (userId) {
      let userTier = 'free';
      const { data: subscriber } = await supabase
        .from('subscribers')
        .select('subscribed, subscription_tier')
        .eq('user_id', userId)
        .single();
        
      if (subscriber?.subscribed) {
        userTier = 'pro';
      }
      
      // For free users, check usage limits (1 per week)
      if (userTier === 'free') {
        const { data: usageResult } = await supabase.rpc('check_ai_usage_limit', {
          p_user_id: userId,
          p_feature_type: 'daily_analysis'
        });
        
        if (!usageResult?.can_use) {
          console.log('⛔ [COACH-ANALYSIS] Usage limit exceeded for user:', userId);
          return new Response(JSON.stringify({ 
            error: 'Wöchentliches Limit für tägliche Analyse erreicht. Upgrade zu Pro für unbegrenzte Nutzung.',
            code: 'USAGE_LIMIT_EXCEEDED',
            weekly_remaining: usageResult?.weekly_remaining || 0,
            monthly_remaining: usageResult?.monthly_remaining || 0
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // Get user personality if userId provided
    let personality = 'motivierend';
    let muscleMaintenancePriority = false;
    
    if (userId) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('coach_personality, muscle_maintenance_priority')
          .eq('user_id', userId)
          .single();
        
        if (profile) {
          personality = profile.coach_personality || 'motivierend';
          muscleMaintenancePriority = profile.muscle_maintenance_priority || false;
        }
      } catch (error) {
        console.log('Could not load personality, using default');
      }
    }

    // Personality-based prompts
    const personalityPrompts = {
      hart: "Du bist ein direkter, kompromissloser Fitness-Coach. Du sagst die Wahrheit ohne Umschweife und forderst Disziplin. Keine Ausreden werden akzeptiert.",
      soft: "Du bist ein einfühlsamer, verständnisvoller Coach. Du motivierst sanft, zeigst Empathie und unterstützt mit positiven Worten.",
      lustig: "Du bist ein humorvoller Coach mit guter Laune. Du motivierst mit Witzen, lockeren Sprüchen und bringst die Leute zum Lächeln.",
      ironisch: "Du bist ein ironischer Coach mit sarkastischem Humor. Du nutzt Ironie und Augenzwinkern, aber immer konstruktiv.",
      motivierend: "Du bist ein begeisternder, positiver Coach. Du feuerst an, motivierst mit Energie und siehst immer das Positive."
    };

    const personalityPrompt = personalityPrompts[personality as keyof typeof personalityPrompts] || personalityPrompts.motivierend;
    const muscleString = muscleMaintenancePriority ? " Fokussiere besonders auf Muskelerhalt und Protein-optimierte Tipps." : "";

    let prompt = '';
    let systemMessage = '';

    if (timeBasedGreeting) {
      // Time-based greeting with personalized recommendations
      const timeGreeting = timeOfDay === 'morning' ? 'Guten Morgen' : timeOfDay === 'noon' ? 'Hallo' : 'Guten Abend';
      systemMessage = `${personalityPrompt} Du begrüßt den User zeitbasiert und gibst passende Empfehlungen basierend auf aktuellen Fortschritt, Gewichtsverlauf und Persönlichkeitseinstellung. Sei motivierend aber realistisch. Erwähne konkrete Tipps zu Sport, Ernährung oder Gewichtsveränderungen wenn relevant.${muscleString}`;
      
      prompt = `${timeGreeting}! Erstelle eine personalisierte Begrüßung für den User.

Aktuelle Daten:
- Kalorien heute: ${dailyTotals?.calories || 0}
- Tagesziel: ${dailyGoal || 1323}
- Mahlzeiten heute: ${mealsCount || 0}

User Verlaufsdaten:
- Durchschnittliche Kalorien: ${userData?.averages?.calories || 0}
- Tage mit Daten: ${userData?.historyDays || 0}
- Gewichtsverlauf: ${JSON.stringify(userData?.weightHistory || [])}
- Aktuelle Trends: ${JSON.stringify(userData?.recentProgress || {})}

Gib eine personalisierte, ${personality}e Begrüßung mit konkreten Empfehlungen (max 100 Wörter) basierend auf:
1. Tageszeit
2. Bisherigen Fortschritt heute
3. Gewichtsentwicklung (falls vorhanden)
4. Trends und Verbesserungsvorschläge

Antworte nur mit der Begrüßungsnachricht, kein JSON.`;

      console.log('📋 Generating time-based greeting with GPT-4.1');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: getTaskModel('coach-analysis'),
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt }
          ],
          max_tokens: 400,
          temperature: 0.75,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const greeting = data.choices[0].message.content;

      console.log('✅ Time-based greeting generated successfully');

      return new Response(JSON.stringify({ greeting }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (voiceMessage) {
      // Voice coaching with personality
      systemMessage = `Du bist ${coachName}, ein Coach. Sprich wie ein echter Mensch, nicht wie eine AI. Sei ${personality} und interessiert.`;
      
      prompt = `User sagte: "${voiceMessage}"

Kontext: ${context.todaysTotals?.calories || 0}/${context.dailyGoals?.calories || 2000} kcal heute

Antworte kurz und menschlich (max 30 Wörter).`;

      console.log('🎤 Processing voice message with GPT-4.1');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: getTaskModel('coach-analysis'),
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt }
          ],
          max_tokens: 200,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const voiceResponse = data.choices[0].message.content;

      console.log('✅ Voice response generated successfully');

      return new Response(JSON.stringify({ voiceResponse }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (chatMessage) {
      // Text chat with personality
      systemMessage = `${personalityPrompt} Beantworte Fragen zu Ernährung, Kalorien und Gesundheit im ${personality} Stil.${muscleString}`;
      
      const contextStr = `Aktueller Kontext:
- Heutige Kalorien: ${context.todaysTotals?.calories || 0}
- Tagesziel: ${context.dailyGoals?.calories || 1323}  
- Durchschnitt: ${context.averages?.calories || 0}`;

      const messages = [
        { role: 'system', content: systemMessage + '\n\n' + contextStr }
      ];

      // Add chat history
      if (history && history.length > 0) {
        messages.push(...history.slice(-8)); // More context with GPT-4.1
      }

      messages.push({ role: 'user', content: chatMessage });

      console.log('💬 Processing chat message with GPT-4.1');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
           model: getTaskModel('coach-analysis'),
          messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices[0].message.content;

      console.log('✅ Chat response generated successfully');

      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      // Daily analysis with enhanced prompting for GPT-4.1
      systemMessage = `Du bist ein erfahrener, personalisierter Ernährungscoach mit tiefem Verständnis für Psychologie und Motivation. Analysiere die Tagesdaten und erstelle durchdachte, persönliche Coaching-Tipps im ${personality}en Stil.${muscleString}`;
      
      prompt = `Analysiere diese Tagesdaten und erstelle personalisierte, intelligente Coaching-Tipps:

Tagesdaten:
- Kalorien: ${dailyTotals.calories}/${dailyGoal} (${Math.round((dailyTotals.calories / dailyGoal) * 100)}%)
- Protein: ${dailyTotals.protein}g
- Kohlenhydrate: ${dailyTotals.carbs}g
- Fette: ${dailyTotals.fats}g
- Anzahl Mahlzeiten: ${mealsCount}

Durchschnittswerte & Verlauf:
- Durchschnittliche Kalorien: ${userData.averages.calories}
- Durchschnittliches Protein: ${userData.averages.protein}g
- Durchschnittliche Carbs: ${userData.averages.carbs}g
- Durchschnittliche Fette: ${userData.averages.fats}g
- Verfolgungstage: ${userData.historyDays}

Coach-Persönlichkeit: ${personality}
Muskelerhalt-Priorität: ${muscleMaintenancePriority ? 'Ja (besonderer Fokus auf Protein)' : 'Nein'}

Erstelle intelligente, durchdachte Coaching-Nachrichten mit tieferer Analyse. Berücksichtige Trends, psychologische Aspekte und individuelle Bedürfnisse.

Antworte AUSSCHLIESSLICH im folgenden JSON-Format:

{
  "messages": [
    {
      "type": "motivation" | "tip" | "warning" | "analysis" | "trend",
      "title": "Prägnanter Titel",
      "message": "Durchdachte Coaching-Nachricht (max 3 Sätze, ${personality}er Stil)",
      "priority": "high" | "medium" | "low"
    }
  ],
  "dailyScore": Bewertung von 1-10 mit Begründung,
  "summary": "Intelligente Zusammenfassung mit Trend-Analyse (max 2 Sätze)"
}

Sei ${personality}, analytisch und gib konkrete, umsetzbare Tipps mit psychologischem Verständnis.`;

      console.log('📊 Generating daily analysis with GPT-4.1');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: getTaskModel('coach-analysis'),
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      console.log('✅ Daily analysis generated successfully');
      
      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Content:', content);
        throw new Error('Ungültige Antwort von OpenAI');
      }
    }

  } catch (error) {
    console.error('❌ Error in coach-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: 'Fehler bei der Coach-Analyse',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
