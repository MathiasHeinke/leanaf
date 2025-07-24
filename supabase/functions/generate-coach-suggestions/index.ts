import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserData {
  todaysTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  dailyGoals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null;
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  historyData: any[];
  trendData: any;
  weightHistory: any[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface GenerateSuggestionsRequest {
  coachId: string;
  chatHistory: ChatMessage[];
  userData: UserData;
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing coach suggestions request...');
    
    const { coachId, chatHistory, userData, userId }: GenerateSuggestionsRequest = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Analyze user data for context
    const calorieProgress = userData.dailyGoals ? 
      Math.round((userData.todaysTotals.calories / userData.dailyGoals.calories) * 100) : 0;
    
    const proteinProgress = userData.dailyGoals ? 
      Math.round((userData.todaysTotals.protein / userData.dailyGoals.protein) * 100) : 0;

    // Get recent conversation context
    const recentMessages = chatHistory.slice(-6); // Last 3 exchanges
    const lastUserMessage = recentMessages.filter(m => m.role === 'user').pop()?.content || '';
    const lastAssistantMessage = recentMessages.filter(m => m.role === 'assistant').pop()?.content || '';

    // Create coach-specific context
    const coachContexts = {
      'lucy': {
        focus: 'Ernährung, Meal-Timing, Intervallfasten, Gewohnheiten',
        style: 'liebevoll, unterstützend, wissenschaftlich fundiert',
        expertise: 'Chrononutrition, metabolische Flexibilität, Anti-inflammatorische Ernährung'
      },
      'sascha': {
        focus: 'Training, Performance, Kraftaufbau, Progression',
        style: 'direkt, ergebnisorientiert, evidenzbasiert',
        expertise: 'Periodisierung, Progressive Overload, Biomechanik, Performance-Optimierung'
      },
      'kai': {
        focus: 'Mindset, Recovery, Schlaf, Motivation',
        style: 'motivierend, energisch, ganzheitlich',
        expertise: 'Mentale Stärke, Regeneration, Stressmanagement, Schlafoptimierung'
      }
    };

    const coachContext = coachContexts[coachId as keyof typeof coachContexts] || coachContexts['lucy'];

    const systemPrompt = `Du bist ein KI-Assistent, der intelligente Anschlussfragen für einen Fitness-Coach generiert.

COACH-KONTEXT:
- Coach: ${coachId}
- Fokus: ${coachContext.focus}
- Stil: ${coachContext.style}
- Expertise: ${coachContext.expertise}

BENUTZER-DATEN:
- Heutige Kalorien: ${userData.todaysTotals.calories} (${calorieProgress}% des Ziels)
- Heutiges Protein: ${userData.todaysTotals.protein}g (${proteinProgress}% des Ziels)
- Durchschnittliche Kalorien: ${userData.averages.calories}
- Gewichtsverlauf: ${userData.weightHistory.length} Einträge

LETZTER GESPRÄCHSKONTEXT:
Benutzer: "${lastUserMessage}"
Coach: "${lastAssistantMessage}"

AUFGABE:
Generiere 4 intelligente, kontextuelle Anschlussfragen basierend auf:
1. Den aktuellen Daten des Benutzers
2. Dem Gesprächsverlauf
3. Der Expertise des Coaches
4. Erkennbaren Problemen oder Optimierungsmöglichkeiten

REGELN:
- Jede Frage sollte spezifisch und actionable sein
- Berücksichtige die aktuellen Fortschritte und Herausforderungen
- Stelle clevere Verbindungen zwischen den Daten her
- Fragen sollten zur Coach-Expertise passen
- Kurz und prägnant (max. 8 Wörter für Button-Text)
- Nutze echte Daten-Insights

FORMAT:
Antworte nur mit einem JSON-Array von Objekten:
[
  {
    "text": "Kurzer Button-Text",
    "prompt": "Vollständige Frage mit Kontext und Daten"
  }
]

Beispiele für datenbasierte Fragen:
- "Warum nur ${calorieProgress}% der Kalorien heute?"
- "Protein-Timing bei ${userData.todaysTotals.protein}g optimieren?"
- "Plateau bei ${userData.weightHistory[userData.weightHistory.length-1]?.weight}kg durchbrechen?"`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Generiere jetzt 4 intelligente Anschlussfragen für Coach ${coachId} basierend auf den bereitgestellten Daten und dem Gesprächskontext.` 
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API request failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    
    if (!aiResponse.choices || !aiResponse.choices[0]) {
      throw new Error('Invalid response from OpenAI API');
    }

    const suggestionsText = aiResponse.choices[0].message.content;
    console.log('Generated suggestions:', suggestionsText);

    // Parse the JSON response
    let suggestions;
    try {
      suggestions = JSON.parse(suggestionsText);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback to default suggestions if parsing fails
      suggestions = [
        { text: 'Ernährung optimieren', prompt: 'Wie kann ich meine heutige Ernährung verbessern?' },
        { text: 'Fortschritt analysieren', prompt: 'Analysiere meinen aktuellen Fortschritt und gib mir Tipps.' },
        { text: 'Nächste Schritte', prompt: 'Was sind die wichtigsten nächsten Schritte für mich?' },
        { text: 'Motivation steigern', prompt: 'Wie kann ich meine Motivation aufrechterhalten?' }
      ];
    }

    // Validate the structure
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error('Invalid suggestions format from AI');
    }

    // Ensure each suggestion has the required fields
    const validatedSuggestions = suggestions.map((suggestion, index) => ({
      text: suggestion.text || `Frage ${index + 1}`,
      prompt: suggestion.prompt || `Hilf mir mit meiner Frage ${index + 1}.`
    })).slice(0, 4); // Limit to 4 suggestions

    console.log('Successfully generated coach suggestions:', validatedSuggestions);

    return new Response(JSON.stringify({ 
      suggestions: validatedSuggestions,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-coach-suggestions function:', error);
    
    // Return fallback suggestions in case of error
    const fallbackSuggestions = [
      { text: 'Heutigen Tag analysieren', prompt: 'Analysiere meinen heutigen Fortschritt und gib mir Feedback.' },
      { text: 'Ziele anpassen', prompt: 'Sollte ich meine aktuellen Ziele anpassen?' },
      { text: 'Motivation steigern', prompt: 'Wie kann ich meine Motivation aufrechterhalten?' },
      { text: 'Nächste Schritte', prompt: 'Was sind die wichtigsten nächsten Schritte für mich?' }
    ];

    return new Response(JSON.stringify({ 
      suggestions: fallbackSuggestions,
      success: false,
      error: error.message 
    }), {
      status: 200, // Return 200 to provide fallback suggestions
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});