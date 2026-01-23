import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { getTaskModel } from '../_shared/openai-config.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserData {
  userId: string;
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

    // ARES-Only System - No legacy coach mapping needed
    const mapCoachId = (_urlCoachId: string): string => {
      return 'ares'; // Always resolve to ARES
    };

    // ARES-Only Coach Context - Single unified coach with cross-domain expertise
    const coachContexts: Record<string, {
      focus: string;
      style: string;
      expertise: string;
      learningTheory: string;
      methodology: string;
      relevantData: string;
      dataTypes: string;
    }> = {
      'ares': {
        focus: 'Cross-domain: Ernährung, Training, Mindset, Recovery, Performance-Optimierung',
        style: 'direkt, meta-intelligent, evidenzbasiert, brutal ehrlich',
        expertise: 'Ultimate Performance Optimization, Cross-Domain Synergies, Biohacking',
        learningTheory: 'Meta-Learning, Deliberate Practice, Cross-Domain Transfer',
        methodology: 'Holistische Analyse, Synergien erkennen, aggressive aber umsetzbare Pläne',
        relevantData: `Kalorien: ${userData.todaysTotals.calories} (${calorieProgress}% des Ziels), Protein: ${userData.todaysTotals.protein}g (${proteinProgress}% des Ziels), Trainingsdaten: ${userData.historyData.length} Tage`,
        dataTypes: 'Alle Datentypen: Ernährung, Training, Recovery, Mindset, Biometrics'
      }
    };

    const mappedCoachId = mapCoachId(coachId);
    const coachContext = coachContexts['ares']; // Always use ARES context

    // ARES Conversation Analysis - Cross-domain focus
    const analyzeConversationContext = () => {
      const conversationLength = chatHistory.length;
      const recentMessages = chatHistory.slice(-8);
      
      const emotionalMarkers = {
        frustration: ['frustriert', 'verzweifelt', 'klappt nicht', 'schaffe nicht', 'komme nicht', 'hilft nicht'],
        success: ['super', 'toll', 'perfekt', 'klappt', 'läuft gut', 'bin zufrieden'],
        curiosity: ['warum', 'wie', 'was', 'wieso', 'weshalb', 'verstehe nicht'],
        uncertainty: ['unsicher', 'nicht sicher', 'weiß nicht', 'bin verwirrt', 'zweifle']
      };
      
      const lastUserContent = lastUserMessage.toLowerCase();
      const lastCoachContent = lastAssistantMessage.toLowerCase();
      
      let emotionalState = 'neutral';
      let contextualActions: Array<{ type: string; text: string; urgency: string }> = [];
      
      for (const [emotion, markers] of Object.entries(emotionalMarkers)) {
        if (markers.some(marker => lastUserContent.includes(marker))) {
          emotionalState = emotion;
          break;
        }
      }
      
      // ARES cross-domain action detection
      if (lastCoachContent.includes('supplement') && 
          (lastCoachContent.includes('empfehle') || lastCoachContent.includes('plan') || lastCoachContent.includes('sinnvoll'))) {
        contextualActions.push({
          type: 'supplement_plan',
          text: 'Ja, Supplement-Plan erstellen',
          urgency: 'high'
        });
      }
      
      if (lastCoachContent.includes('analysier') && 
          (lastCoachContent.includes('soll ich') || lastCoachContent.includes('detailliert'))) {
        contextualActions.push({
          type: 'detailed_analysis',
          text: 'Ja, bitte analysieren',
          urgency: 'high'
        });
      }
      
      if (lastCoachContent.includes('training') && 
          (lastCoachContent.includes('plan') || lastCoachContent.includes('programm'))) {
        contextualActions.push({
          type: 'training_plan',
          text: 'Ja, Trainingsplan erstellen',
          urgency: 'high'
        });
      }
      
      return { emotionalState, conversationGaps: [], conversationLength, contextualActions };
    };

    const conversationContext = analyzeConversationContext();

    // Fetch supplement data for context
    const today = new Date().toISOString().split('T')[0];
    const { data: userSupplements } = await supabase
      .from('user_supplements')
      .select(`
        id, supplement_id, custom_name, dosage, unit, timing, goal,
        supplement_database (name, category, description)
      `)
      .eq('user_id', userData.userId)
      .eq('is_active', true);

    const { data: todayIntake } = await supabase
      .from('supplement_intake_log')
      .select('user_supplement_id, timing, taken')
      .eq('user_id', userData.userId)
      .eq('date', today);

    // Process supplement data for context
    const categories = userSupplements?.map(s => (s.supplement_database as any)?.category || 'Custom').filter(Boolean) || [];
    const supplementContext = {
      hasSupplements: userSupplements && userSupplements.length > 0,
      totalSupplements: userSupplements?.length || 0,
      takenToday: todayIntake?.filter(log => log.taken).length || 0,
      missedToday: (userSupplements?.reduce((sum, s) => sum + (s.timing?.length || 0), 0) || 0) - (todayIntake?.filter(log => log.taken).length || 0),
      categories: [...new Set(categories)]
    };

    const systemPrompt = `Du bist ein intelligenter Assistent, der PERPLEXITY-STYLE Follow-up-Fragen für ARES, den Ultimate Performance Coach, generiert.

🎯 PERPLEXITY-PRINZIPIEN (KRITISCH):
- HYPER-SPEZIFISCHE Fragen basierend auf exakten Zahlen/Daten
- Natürliche NEUGIER-LÜCKEN identifizieren und ansprechen  
- Fragen die sich wie die NÄCHSTE LOGISCHE Frage anfühlen
- CONVERSATION-FLOW: Aufbauend auf dem letzten Austausch
- EMOTIONAL INTELLIGENT: Angepasst an User-Stimmung

ARES - ULTIMATE PERFORMANCE COACH:
🔸 Kerngebiet: ${coachContext.focus}
🔸 Stil: ${coachContext.style}
🔸 Expertise: ${coachContext.expertise}
🔸 Methodologie: ${coachContext.methodology}

AKTUELLE DATEN:
${coachContext.relevantData}

💊 SUPPLEMENT-DATEN:
${supplementContext.hasSupplements ? `
- Aktive Supplements: ${supplementContext.totalSupplements}
- Heute genommen: ${supplementContext.takenToday}/${supplementContext.takenToday + supplementContext.missedToday}
- Kategorien: ${supplementContext.categories.join(', ')}
- Fehlende Einnahmen heute: ${supplementContext.missedToday}
` : '- Keine aktiven Supplements - perfekt für Empfehlungen!'}

CONVERSATION-ANALYSE:
📍 Letzter User: "${lastUserMessage}"
📍 Letzter Coach: "${lastAssistantMessage}"
📍 Emotional State: ${conversationContext.emotionalState}
📍 Conversation Length: ${conversationContext.conversationLength} Nachrichten
📍 Kontextuelle Aktionen: ${conversationContext.contextualActions.map(a => a.text).join(', ') || 'Keine erkannt'}

PERPLEXITY-REGELN (ZWINGEND):
✅ Nutze EXAKTE Zahlen aus den Daten (${userData.todaysTotals.calories} kcal, ${userData.todaysTotals.protein}g Protein)
✅ Adressiere UNGELÖSTE Fragen aus dem letzten Austausch
✅ Erkenne NATÜRLICHE NEUGIER-GAPS im Gespräch
✅ Berücksichtige ${conversationContext.emotionalState}-Zustand für Frage-Typ
✅ Cross-domain Themen: Ernährung, Training, Mindset, Recovery
✅ PRIORITÄT: Erkannte kontextuelle Aktionen: ${conversationContext.contextualActions.map(a => a.text).join(', ')}

PERPLEXITY-QUESTION-TYPES basierend auf Emotional State:
📊 CURIOSITY: "Warum reagiert mein Körper bei ${userData.todaysTotals.calories} kcal so unterschiedlich?"
🔍 IMPLEMENTATION: "Wie setze ich das mit meinen ${userData.averages.calories} kcal Durchschnitt um?"
🚧 PROBLEM-SOLVING: "Was blockiert mich bei meinen aktuellen ${userData.todaysTotals.protein}g Protein?"
🎯 OPTIMIZATION: "Wie optimiere ich speziell meine [konkreter Parameter]?"

FORMAT (JSON):
[
  {
    "text": "Max 6 Wörter Button-Text",
    "prompt": "Hyper-spezifische ICH-Perspektive Frage mit exakten Daten und natürlichem Follow-up-Charakter"
  }
]

ARES-BEISPIELE:
⚡ "Wie optimiere ich mit ${userData.todaysTotals.calories} kcal Training UND Recovery gleichzeitig?"
⚡ "Welche Synergien nutze ich zwischen meinen ${userData.todaysTotals.protein}g Protein und meinem Schlaf?"
⚡ "Was ist der größte Hebel bei meiner aktuellen Performance?"`;


    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getTaskModel('generate-coach-suggestions'),
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Generiere jetzt 3 intelligente Anschlussfragen für ARES basierend auf den bereitgestellten Daten und dem Gesprächskontext. 

WICHTIG: 
1. Alle Fragen müssen aus der ICH-Perspektive des Benutzers formuliert werden
2. PRIORITÄT: Falls kontextuelle Aktionen erkannt wurden (${conversationContext.contextualActions.map(a => a.text).join(', ')}), MÜSSEN diese als erste Vorschläge erscheinen
3. Nutze Cross-domain Synergien (Ernährung + Training + Mindset + Recovery)`
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

    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ 
      suggestions: fallbackSuggestions,
      success: false,
      error: message 
    }), {
      status: 200, // Return 200 to provide fallback suggestions
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});