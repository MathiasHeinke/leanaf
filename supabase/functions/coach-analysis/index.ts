import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

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
      userId
    } = await req.json();

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

    if (voiceMessage) {
      // Voice coaching with personality
      systemMessage = `${personalityPrompt} Antworte kurz und ermutigend auf Sprachnachrichten im ${personality} Stil.${muscleString}`;
      
      prompt = `Benutzer sagte: "${voiceMessage}"
      
Kontext:
- Heutige Kalorien: ${context.todaysTotals?.calories || 0}
- Tagesziel: ${context.dailyGoals?.calories || 1323}
- Durchschnitt: ${context.averages?.calories || 0}

Gib eine kurze, ${personality}e Antwort (max 50 Wörter) auf Deutsch.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt }
          ],
          max_tokens: 150,
          temperature: 0.8,
        }),
      });

      const data = await response.json();
      const voiceResponse = data.choices[0].message.content;

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
        messages.push(...history.slice(-6)); // Last 6 messages for context
      }

      messages.push({ role: 'user', content: chatMessage });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const reply = data.choices[0].message.content;

      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      // Daily analysis
      systemMessage = 'Du bist ein persönlicher Ernährungscoach. Analysiere die Tagesdaten und gib personalisierte Coaching-Tipps.';
      
      prompt = `Analysiere diese Tagesdaten und gib personalisierte Coaching-Tipps:

Tagesdaten:
- Kalorien: ${dailyTotals.calories}/${dailyGoal} (${Math.round((dailyTotals.calories / dailyGoal) * 100)}%)
- Protein: ${dailyTotals.protein}g
- Kohlenhydrate: ${dailyTotals.carbs}g
- Fette: ${dailyTotals.fats}g
- Anzahl Mahlzeiten: ${mealsCount}

Durchschnittswerte:
- Kalorien: ${userData.averages.calories}
- Protein: ${userData.averages.protein}g
- Carbs: ${userData.averages.carbs}g
- Fette: ${userData.averages.fats}g
- Verfolgungstage: ${userData.historyDays}

Erstelle 3-5 kurze, motivierende Coaching-Nachrichten auf Deutsch. Antworte AUSSCHLIESSLICH im folgenden JSON-Format:

{
  "messages": [
    {
      "type": "motivation" | "tip" | "warning" | "analysis",
      "title": "Kurzer Titel",
      "message": "Coaching-Nachricht (max 2 Sätze)",
      "priority": "high" | "medium" | "low"
    }
  ],
  "dailyScore": Bewertung von 1-10,
  "summary": "Kurze Zusammenfassung des Tages (1 Satz)"
}

Sei motivierend, hilfsreich und konkret. Gib praktische Tipps.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'OpenAI API Fehler');
      }

      const content = data.choices[0].message.content;
      
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
    console.error('Error in coach-analysis function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});