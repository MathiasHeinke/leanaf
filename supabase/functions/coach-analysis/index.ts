import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const { dailyTotals, dailyGoal, mealsCount, userData } = await req.json();

    const prompt = `Du bist ein persönlicher Ernährungscoach. Analysiere diese Tagesdaten und gib personalisierte Coaching-Tipps.

Tagesdaten:
- Kalorien: ${dailyTotals.calories}/${dailyGoal} (${Math.round((dailyTotals.calories / dailyGoal) * 100)}%)
- Protein: ${dailyTotals.protein}g
- Kohlenhydrate: ${dailyTotals.carbs}g
- Fette: ${dailyTotals.fats}g
- Anzahl Mahlzeiten: ${mealsCount}

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
  "summary": "Kurze Zusammenfassung des Tages"
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
          {
            role: 'system',
            content: 'Du bist ein erfahrener Ernährungscoach, der motivierende und praktische Tipps gibt. Antworte nur mit dem angeforderten JSON-Format.'
          },
          {
            role: 'user',
            content: prompt
          }
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

  } catch (error) {
    console.error('Error in coach-analysis function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});