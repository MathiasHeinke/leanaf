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

    // Create coach-specific context and data filters
    const coachContexts = {
      'lucy': {
        focus: 'Ernährung, Meal-Timing, Intervallfasten, Gewohnheiten, Stoffwechsel',
        style: 'liebevoll, unterstützend, wissenschaftlich fundiert',
        expertise: 'Chrononutrition, metabolische Flexibilität, Anti-inflammatorische Ernährung',
        relevantData: `Kalorien: ${userData.todaysTotals.calories} (${calorieProgress}% des Ziels), Protein: ${userData.todaysTotals.protein}g (${proteinProgress}% des Ziels), Durchschnitt: ${userData.averages.calories} kcal`,
        dataTypes: 'Ernährungsdaten, Kalorienbilanz, Makronährstoffe'
      },
      'sascha': {
        focus: 'Training, Performance, Kraftaufbau, Progression, Biomechanik',
        style: 'direkt, ergebnisorientiert, evidenzbasiert',
        expertise: 'Periodisierung, Progressive Overload, Biomechanik, Performance-Optimierung',
        relevantData: `Trainingsdaten verfügbar: ${userData.historyData.length} Tage, Gewichtsverlauf: ${userData.weightHistory.length} Einträge`,
        dataTypes: 'Trainingsdaten, Leistungsmetriken, Kraftwerte, Progression'
      },
      'kai': {
        focus: 'Mindset, Recovery, Schlaf, Motivation, Stressmanagement',
        style: 'motivierend, energisch, ganzheitlich',
        expertise: 'Mentale Stärke, Regeneration, Stressmanagement, Schlafoptimierung',
        relevantData: `Aktivitätsdaten: ${userData.historyData.length} Tage, Gewichtstrend: ${userData.weightHistory.length} Messungen`,
        dataTypes: 'Regenerationsdaten, Schlafqualität, Stress-Level, Motivationstrends'
      }
    };

    const coachContext = coachContexts[coachId as keyof typeof coachContexts] || coachContexts['lucy'];

    const systemPrompt = `Du bist ein KI-Assistent, der intelligente Anschlussfragen für einen spezialisierten Fitness-Coach generiert.

COACH-KONTEXT:
- Coach: ${coachId} (${coachContext.focus})
- Stil: ${coachContext.style}
- Expertise: ${coachContext.expertise}

RELEVANTE DATEN FÜR DIESEN COACH:
${coachContext.relevantData}

LETZTER GESPRÄCHSKONTEXT:
Benutzer: "${lastUserMessage}"
Coach: "${lastAssistantMessage}"

WICHTIGE EINSCHRÄNKUNGEN:
- Generiere NUR Fragen die zu ${coachId}'s Kerngebiet (${coachContext.focus}) passen
- Ignoriere Daten die nicht zu diesem Coach gehören
- Sascha (Training-Coach): KEINE Ernährungs-/Protein-/Kalorienfragen
- Lucy (Ernährungs-Coach): Fokus auf Ernährung, Timing, Stoffwechsel
- Kai (Mindset-Coach): Fokus auf Regeneration, Mindset, Motivation

AUFGABE:
Generiere 3 intelligente, kontextuelle Anschlussfragen die AUSSCHLIESSLICH zu ${coachId}'s Expertise passen:

WICHTIG - PERSPEKTIVE & FOKUS:
- Alle Fragen MÜSSEN aus der ICH-Perspektive des Benutzers formuliert werden
- Der Benutzer stellt diese Fragen dem Coach
- Verwende "ich", "mein", "meine" anstatt "du", "dein", "deine"
- Nutze NUR Daten die für diesen Coach relevant sind
- Stelle NUR Fragen zu ${coachContext.focus}

REGELN:
- Jede Frage sollte spezifisch und actionable sein
- Berücksichtige nur relevante Daten für diesen Coach
- Kurz und prägnant (max. 8 Wörter für Button-Text)
- Coach-spezifische Expertise beachten

FORMAT:
Antworte nur mit einem JSON-Array von Objekten:
[
  {
    "text": "Kurzer Button-Text",
    "prompt": "Vollständige Frage aus ICH-Perspektive mit relevanten Daten"
  }
]

Coach-spezifische Beispiele:
Lucy (Ernährung): "Ich habe heute nur 20% meiner Kalorien erreicht - wie optimiere ich mein Timing?"
Sascha (Training): "Ich stagniere bei meinen Lifts - welche Progressive Overload-Strategie hilft?"
Kai (Mindset): "Ich fühle mich unmotiviert - wie baue ich mentale Stärke auf?"`;

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
            content: `Generiere jetzt 3 intelligente Anschlussfragen für Coach ${coachId} basierend auf den bereitgestellten Daten und dem Gesprächskontext. WICHTIG: Alle Fragen müssen aus der ICH-Perspektive des Benutzers formuliert werden.` 
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
        { text: 'Meine Ernährung analysieren', prompt: 'Wie kann ich meine heutige Ernährung verbessern?' },
        { text: 'Meinen Fortschritt bewerten', prompt: 'Kannst du meinen aktuellen Fortschritt analysieren und mir Tipps geben?' },
        { text: 'Meine nächsten Schritte', prompt: 'Was sind die wichtigsten nächsten Schritte für mich?' }
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
    })).slice(0, 3); // Limit to 3 suggestions

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
      { text: 'Meinen Tag analysieren', prompt: 'Kannst du meinen heutigen Fortschritt analysieren und mir Feedback geben?' },
      { text: 'Meine Ziele anpassen', prompt: 'Sollte ich meine aktuellen Ziele anpassen?' },
      { text: 'Meine nächsten Schritte', prompt: 'Was sind die wichtigsten nächsten Schritte für mich?' }
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