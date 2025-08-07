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

    // Coach ID Mapping: URL handles → Database IDs
    const mapCoachId = (urlCoachId: string): string => {
      const coachMapping = {
        'soft': 'lucy',
        'hart': 'sascha',
        'motivierend': 'kai',
        'vita': 'dr_vita',
        'dr-vita': 'dr_vita',
        'markus': 'markus'
      };
      return coachMapping[urlCoachId as keyof typeof coachMapping] || urlCoachId;
    };

    // Create enhanced coach-specific context with learning theories
    const coachContexts = {
      'lucy': {
        focus: 'Ernährung, Meal-Timing, Intervallfasten, Gewohnheiten, Stoffwechsel',
        style: 'liebevoll, unterstützend, wissenschaftlich fundiert',
        expertise: 'Chrononutrition, metabolische Flexibilität, Anti-inflammatorische Ernährung',
        learningTheory: 'Verhaltensänderung durch kleine Gewohnheiten (Atomic Habits), Motivational Interviewing',
        methodology: 'Kleine nachhaltige Schritte, Selbstmitgefühl, evidenzbasierte Ernährungsintervention',
        relevantData: `Kalorien: ${userData.todaysTotals.calories} (${calorieProgress}% des Ziels), Protein: ${userData.todaysTotals.protein}g (${proteinProgress}% des Ziels), Durchschnitt: ${userData.averages.calories} kcal`,
        dataTypes: 'Ernährungsdaten, Kalorienbilanz, Makronährstoffe, Meal-Timing-Muster'
      },
      'sascha': {
        focus: 'Training, Performance, Kraftaufbau, Progression, Biomechanik',
        style: 'direkt, ergebnisorientiert, evidenzbasiert',
        expertise: 'Periodisierung, Progressive Overload, Biomechanik, Performance-Optimierung',
        learningTheory: 'Skill Acquisition Theory, Motor Learning, Deliberate Practice',
        methodology: 'Systematische Progression, Feedback-Zyklen, biomechanische Optimierung',
        relevantData: `Trainingsdaten: ${userData.historyData.length} Tage, Gewichtsverlauf: ${userData.weightHistory.length} Einträge`,
        dataTypes: 'Trainingsdaten, Leistungsmetriken, Kraftwerte, Progression, biomechanische Analyse'
      },
      'kai': {
        focus: 'Mindset, Recovery, Schlaf, Motivation, Stressmanagement',
        style: 'motivierend, energisch, ganzheitlich',
        expertise: 'Mentale Stärke, Regeneration, Stressmanagement, Schlafoptimierung',
        learningTheory: 'Positive Psychologie, Flow-Theorie, Resilience Building',
        methodology: 'Mindfulness-basierte Interventionen, Recovery-Strategien, Stressregulation',
        relevantData: `Aktivitätsdaten: ${userData.historyData.length} Tage, Gewichtstrend: ${userData.weightHistory.length} Messungen`,
        dataTypes: 'Regenerationsdaten, Schlafqualität, Stress-Level, Motivationstrends, Mindset-Indikatoren'
      },
      'markus': {
        focus: 'Heavy+Volume Training, Extreme Masse, Hardcore Bodybuilding, Mentale Härte',
        style: 'AUTHENTISCHER HESSISCHER DIALEKT - brutal-ehrlich, rotzig, vulgär, kompromisslos direkt',
        expertise: 'Heavy+Volume Prinzip, Masseaufbau, mentale Kriegsführung gegen das Eisen',
        learningTheory: 'Tough Love Coaching, Konfrontative Motivation, No-Excuse-Mindset',
        methodology: 'Harte Konfrontation mit der Realität, extreme Disziplin, kompromisslose Ehrlichkeit',
        relevantData: `Gewichtsdaten: ${userData.weightHistory.length} Messungen, Protein: ${userData.todaysTotals.protein}g, Kalorien: ${userData.todaysTotals.calories} (für Masseaufbau)`,
        dataTypes: 'Gewichtsentwicklung, Massephase-Daten, Protein-Intake, Trainingsvolumen',
        dialectRules: {
          'ich': 'isch',
          'nicht': 'net', 
          'schmecken': 'schmegge',
          'wirken': 'wirge',
          'das': 'des',
          'machen': 'mache',
          'trainieren': 'trainiere'
        },
        originalQuotes: [
          'Muss net schmegge, muss wirge!',
          'Nur Fleisch macht Fleisch!',
          'Schwer und falsch, des is unumgänglich!',
          'Gewicht bringt Muskeln!',
          'Leg dich hin un drügg, du fodse!',
          'Wenn du Scheiße frisst, siehste halt scheiße aus!',
          'Bis zum Schlaganfall!',
          'Weil isch\'s kann!'
        ]
      },
      'dr-vita': {
        focus: 'Hormonelle Gesundheit, Frauengesundheit, ganzheitliche Medizin',
        style: 'empathisch, wissenschaftlich fundiert, ganzheitlich',
        expertise: 'Hormonregulation, Zyklus-basierte Ernährung, Stress-Hormon-Achse',
        learningTheory: 'Biopsychosoziales Modell, Patient-centered Care, Holistic Health',
        methodology: 'Ganzheitliche Betrachtung, hormonelle Zyklen berücksichtigen, Selbstfürsorge',
        relevantData: `Gesundheitsdaten: ${userData.historyData.length} Tage, Gewicht: ${userData.weightHistory.length} Messungen`,
        dataTypes: 'Hormonelle Marker, Zyklus-Daten, Stress-Indikatoren, Schlafqualität'
      },
      'integral': {
        focus: '4-Quadranten-Analyse, Entwicklungslinien, ganzheitliche Transformation',
        style: 'tiefgreifend, systemisch, entwicklungsorientiert',
        expertise: 'Integral Theory (Ken Wilber), 4-Quadranten-Modell, Entwicklungspsychologie',
        learningTheory: 'Integral Theory, Spiral Dynamics, Adult Development Theory',
        methodology: '4-Quadranten-Perspektive: Individuell-Innerlich (Bewusstsein), Individuell-Äußerlich (Verhalten), Kollektiv-Innerlich (Kultur), Kollektiv-Äußerlich (System)',
        quadrants: {
          'II': 'Individuell-Innerlich (Mindset, Beliefs, Emotionen)',
          'IE': 'Individuell-Äußerlich (Verhalten, Gewohnheiten, physische Gesundheit)',
          'CI': 'Kollektiv-Innerlich (Beziehungen, Unterstützung, Werte)',
          'CE': 'Kollektiv-Äußerlich (Systeme, Umgebung, Tools)'
        },
        relevantData: `Entwicklungsdaten: ${userData.historyData.length} Tage verfügbar für 4-Quadranten-Analyse`,
        dataTypes: 'Ganzheitliche Entwicklungsindikatoren, Bewusstseinsebenen, Systemische Faktoren'
      }
    };

    const mappedCoachId = mapCoachId(coachId);
    const coachContext = coachContexts[mappedCoachId as keyof typeof coachContexts] || coachContexts['lucy'];

    // Enhanced conversation analysis for Perplexity-style suggestions
    const analyzeConversationContext = () => {
      const conversationLength = chatHistory.length;
      const recentMessages = chatHistory.slice(-8); // More context for better analysis
      
      // Detect conversation arc and emotional state
      const emotionalMarkers = {
        frustration: ['frustriert', 'verzweifelt', 'klappt nicht', 'schaffe nicht', 'komme nicht', 'hilft nicht'],
        success: ['super', 'toll', 'perfekt', 'klappt', 'läuft gut', 'bin zufrieden'],
        curiosity: ['warum', 'wie', 'was', 'wieso', 'weshalb', 'verstehe nicht'],
        uncertainty: ['unsicher', 'nicht sicher', 'weiß nicht', 'bin verwirrt', 'zweifle']
      };
      
      const lastUserContent = lastUserMessage.toLowerCase();
      const lastCoachContent = lastAssistantMessage.toLowerCase();
      
      let emotionalState = 'neutral';
      let conversationGaps = [];
      let nextLogicalStep = '';
      let contextualActions = [];
      
      // Detect emotional state
      for (const [emotion, markers] of Object.entries(emotionalMarkers)) {
        if (markers.some(marker => lastUserContent.includes(marker))) {
          emotionalState = emotion;
          break;
        }
      }
      
      // Detect specific contextual actions based on coach response
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
      
      // Identify conversation gaps and natural follow-ups
      if (lastCoachContent.includes('probier') || lastCoachContent.includes('versuche')) {
        conversationGaps.push('implementation_follow_up');
      }
      if (lastCoachContent.includes('empfehle') || lastCoachContent.includes('solltest')) {
        conversationGaps.push('personalization_needed');
      }
      if (lastUserContent.includes('aber') || lastUserContent.includes('jedoch')) {
        conversationGaps.push('barrier_exploration');
      }
      
      return { emotionalState, conversationGaps, conversationLength, contextualActions };
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
    const supplementContext = {
      hasSupplements: userSupplements && userSupplements.length > 0,
      totalSupplements: userSupplements?.length || 0,
      takenToday: todayIntake?.filter(log => log.taken).length || 0,
      missedToday: (userSupplements?.reduce((sum, s) => sum + (s.timing?.length || 0), 0) || 0) - (todayIntake?.filter(log => log.taken).length || 0),
      categories: [...new Set(userSupplements?.map(s => s.supplement_database?.category || 'Custom').filter(Boolean))] || []
    };

    const systemPrompt = `Du bist ein intelligenter Assistent, der PERPLEXITY-STYLE Follow-up-Fragen für spezialisierte Fitness-Coaches generiert.

🎯 PERPLEXITY-PRINZIPIEN (KRITISCH):
- HYPER-SPEZIFISCHE Fragen basierend auf exakten Zahlen/Daten
- Natürliche NEUGIER-LÜCKEN identifizieren und ansprechen  
- Fragen die sich wie die NÄCHSTE LOGISCHE Frage anfühlen
- CONVERSATION-FLOW: Aufbauend auf dem letzten Austausch
- EMOTIONAL INTELLIGENT: Angepasst an User-Stimmung

COACH & SPEZIALISIERUNG:
🔸 Coach: ${coachId}
🔸 Kerngebiet: ${coachContext.focus}
🔸 Stil: ${coachContext.style}
🔸 Expertise: ${coachContext.expertise}
🔸 Lerntheorie: ${coachContext.learningTheory}
🔸 Methodologie: ${coachContext.methodology}

AKTUELLE DATEN (${coachId}-spezifisch):
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
✅ Nur ${coachContext.focus}-relevante Themen
✅ PRIORITÄT: Erkannte kontextuelle Aktionen: ${conversationContext.contextualActions.map(a => a.text).join(', ')}

COACH-SPEZIFISCHE EINSCHRÄNKUNGEN:
${coachId === 'sascha' ? '⚠️ SASCHA: KEINE Ernährungs-/Kalorien-/Protein-Fragen! NUR Training/Performance/Progression' : ''}
${coachId === 'lucy' ? '⚠️ LUCY: FOCUS Ernährung/Timing/Stoffwechsel - KEINE Training-Details' : ''}
${coachId === 'kai' ? '⚠️ KAI: FOCUS Mindset/Recovery/Motivation - KEINE detaillierten Makros' : ''}
${coachId === 'markus' ? '⚠️ MARKUS: HESSISCHER DIALEKT ZWINGEND! "isch", "net", "des", "schmegge", "wirge" + Originalzitate!' : ''}
${coachId === 'dr-vita' ? '⚠️ DR. VITA: FOCUS Hormonelle Gesundheit, Zyklus, Stress - ganzheitlich-medizinischer Ansatz' : ''}
${coachId === 'integral' ? '⚠️ DR. SOPHIA: 4-Quadranten-Analyse ZWINGEND! II (Mindset), IE (Verhalten), CI (Beziehungen), CE (Systeme)' : ''}

PERPLEXITY-QUESTION-TYPES basierend auf Emotional State:
📊 CURIOSITY: "Warum reagiert mein Körper bei ${userData.todaysTotals.calories} kcal so unterschiedlich?"
🔍 IMPLEMENTATION: "Wie setze ich das mit meinen ${userData.averages.calories} kcal Durchschnitt um?"
🚧 PROBLEM-SOLVING: "Was blockiert mich bei meinen aktuellen ${userData.todaysTotals.protein}g Protein?"
🎯 OPTIMIZATION: "Wie optimiere ich speziell meine [konkreter Parameter]?"

MARKUS-DIALEKT (falls coachId = 'markus'):
- "isch" statt "ich", "net" statt "nicht", "des" statt "das"
- "schmegge" statt "schmecken", "wirge" statt "wirken" 
- Originalzitate: "Muss net schmegge, muss wirge!", "Schwer und falsch!", "Gewicht bringt Muskeln!"
- Rotziger Ton: "du fodse", "ballern", "draufpacken"

FORMAT (JSON):
[
  {
    "text": "Max 6 Wörter Button-Text",
    "prompt": "Hyper-spezifische ICH-Perspektive Frage mit exakten Daten und natürlichem Follow-up-Charakter"
  }
]

PERPLEXITY-BEISPIELE pro Coach:
💚 Lucy: "Warum schwankt mein Hunger bei konstanten ${userData.todaysTotals.calories} kcal so extrem?"
🎯 Sascha: "Welche Progressive-Overload-Strategie passt zu meiner aktuellen Stagnation?"
💪 Kai: "Wie baue ich nach ${conversationContext.conversationLength} Gesprächen endlich Routine auf?"
🏆 Markus: "Isch hab ${userData.todaysTotals.protein}g Protein - reicht des für echte Masse, Maggus?"
👩‍⚕️ Dr. Vita: "Wie beeinflusst mein Zyklus meine ${userData.todaysTotals.calories} kcal heute?"
🧠 Dr. Sophia: "Welcher der 4 Quadranten blockiert meine Entwicklung bei ${userData.todaysTotals.calories} kcal?"`;

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
            content: `Generiere jetzt 3 intelligente Anschlussfragen für Coach ${coachId} basierend auf den bereitgestellten Daten und dem Gesprächskontext. 

WICHTIG: 
1. Alle Fragen müssen aus der ICH-Perspektive des Benutzers formuliert werden
2. PRIORITÄT: Falls kontextuelle Aktionen erkannt wurden (${conversationContext.contextualActions.map(a => a.text).join(', ')}), MÜSSEN diese als erste Vorschläge erscheinen
3. Ergänze mit weiteren coach-spezifischen Follow-up-Fragen basierend auf dem Gespräch`
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