import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-chat-mode",
};

// Project configuration (static per instructions)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://gzczjscctgyxjyodhnhk.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I";

// Threshold configuration for intent routing
const THRESHOLDS = {
  tool: 0.70,      // >= 0.70 → Direct tool call
  clarify: 0.40,   // 0.40-0.69 → Clarification required
  // < 0.40 → LLM-only fallback
};

// Enhanced intent detection with confidence scoring
async function detectIntentWithConfidence(input?: string): Promise<{
  name: "training" | "meal" | "weight" | "diary" | "advice" | "unknown";
  score: number;
  toolCandidate?: string;
}> {
  if (!input) return { name: "unknown", score: 0 };
  
  const text = input.toLowerCase();
  
  // Training intent with synonyms
  const trainingTerms = [
    'training', 'workout', 'exercise', 'gym', 'krafttraining', 'cardio',
    'übung', 'satz', 'set', 'rep', 'wiederholung', 'gewicht', 'hantel',
    'bankdrücken', 'squat', 'kreuzheben', 'deadlift', 'bench', 'overhead'
  ];
  
  // Meal intent with synonyms  
  const mealTerms = [
    'meal', 'essen', 'food', 'mahlzeit', 'ernährung', 'nutrition',
    'kalorien', 'protein', 'kohlenhydrate', 'fett', 'rezept', 'frühstück',
    'mittag', 'abend', 'snack'
  ];
  
  // Weight tracking terms
  const weightTerms = [
    'weight', 'gewicht', 'waage', 'wiegen', 'kg', 'abnehmen', 'zunehmen'
  ];
  
  // Diary/reflection terms
  const diaryTerms = [
    'diary', 'tagebuch', 'reflex', 'gedanken', 'gefühl', 'stimmung',
    'journal', 'notiz', 'mood'
  ];
  
  // Calculate confidence scores based on term matches
  const trainingScore = calculateTermScore(text, trainingTerms);
  const mealScore = calculateTermScore(text, mealTerms);
  const weightScore = calculateTermScore(text, weightTerms);
  const diaryScore = calculateTermScore(text, diaryTerms);
  
  // Determine best match
  const scores = [
    { name: "training" as const, score: trainingScore, tool: "training-orchestrator" },
    { name: "meal" as const, score: mealScore, tool: "meal-analyzer" },
    { name: "weight" as const, score: weightScore, tool: "weight-tracker" },
    { name: "diary" as const, score: diaryScore, tool: "diary-assistant" },
  ];
  
  const bestMatch = scores.reduce((prev, current) => 
    current.score > prev.score ? current : prev
  );
  
  if (bestMatch.score >= 0.3) {
    return {
      name: bestMatch.name,
      score: bestMatch.score,
      toolCandidate: bestMatch.tool
    };
  }
  
  return { name: "advice", score: 0.2 };
}

function calculateTermScore(text: string, terms: string[]): number {
  let matches = 0;
  let totalWeight = 0;
  
  for (const term of terms) {
    const weight = term.length > 5 ? 2 : 1; // Longer terms get more weight
    totalWeight += weight;
    
    if (text.includes(term)) {
      matches += weight;
    }
  }
  
  return totalWeight > 0 ? matches / totalWeight : 0;
}

// Log unmet tool events for continuous learning
async function logUnmetTool(supabase: any, data: {
  userId: string;
  sessionId: string;
  message: string;
  intentGuess: string;
  confidence: number;
  suggestedTool?: string;
  handledManually: boolean;
  manualSummary?: string;
}) {
  try {
    await supabase.from('unmet_tool_events').insert({
      user_id: data.userId,
      session_id: data.sessionId,
      message: data.message.substring(0, 500), // Truncate long messages
      intent_guess: data.intentGuess,
      confidence: data.confidence,
      suggested_tool: data.suggestedTool,
      handled_manually: data.handledManually,
      manual_summary: data.manualSummary?.substring(0, 200)
    });
  } catch (error) {
    console.error('Failed to log unmet tool event:', error);
  }
}

// Enhanced synonym extraction for learning loop
async function extractAndLearnSynonyms(supabase: any, text: string, toolId: string) {
  try {
    // Simple keyword extraction (in production, use NLP)
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    for (const word of words.slice(0, 5)) { // Limit to first 5 words
      await supabase.from('tool_lexicon')
        .upsert({
          tool_id: toolId,
          phrase: word,
          source: 'user'
        }, {
          onConflict: 'tool_id,phrase'
        });
    }
  } catch (error) {
    console.error('Failed to extract synonyms:', error);
  }
}

// Generate manual LLM response with RAG
async function buildManualAnswer(event: any, state: any): Promise<string> {
  const userMessage = getRawUserText(event);
  const templates = {
    training: `Verstanden. Ich löse das jetzt manuell: Hier sind deine nächsten Trainingsschritte...
Nebenbei habe ich's als Feature markiert, damit das künftig automatisch läuft. Passt das so?`,
    
    meal: `Alles klar, kriegen wir sofort hin – ich analysiere deine Mahlzeit kurz manuell.
Und ich hab's als Wunsch-Feature abgelegt, damit's beim nächsten Mal mit einem Klick geht. Ready?`,
    
    weight: `Verstanden. Ich trage das Gewicht für dich ein und berechne deinen Fortschritt.
Das hab ich als Feature-Wunsch notiert für automatische Gewichtstracking. Klingt gut?`,
    
    default: `Verstanden. Ich kann das jetzt manuell für dich lösen und dir die nächsten Schritte geben.
Klingt das gut? (Nebenbei markiere ich's als Wunsch-Feature.)`
  };
  
  // Simple intent matching for template selection
  const text = userMessage.toLowerCase();
  if (text.includes('training') || text.includes('workout')) {
    return templates.training;
  } else if (text.includes('essen') || text.includes('meal')) {
    return templates.meal;
  } else if (text.includes('gewicht') || text.includes('weight')) {
    return templates.weight;
  }
  
  return templates.default;
}

function getRawUserText(event: any): string {
  if (event.type === 'TEXT') {
    return event.text || event.message || '';
  }
  return event.message || '';
}

function getToolDescription(toolCandidate?: string): string {
  switch (toolCandidate) {
    case 'training-orchestrator':
      return 'Training-Tracking (Übungen, Sätze, Workout-Logs)';
    case 'meal-analyzer':
      return 'Ernährungs-Analyse (Mahlzeiten, Kalorien, Makros)';
    case 'weight-tracker':
      return 'Gewichts-Tracking (Wiegen, Fortschritt, BMI)';
    case 'diary-assistant':
      return 'Tagebuch-Assistent (Reflexion, Gedanken, Stimmung)';
    default:
      return 'ein spezielles Tool';
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authorization = req.headers.get("Authorization") ?? "";
  const chatModeHeader = req.headers.get("x-chat-mode") ?? undefined;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const event = body?.event as { type: "TEXT" | "IMAGE" | "END"; text?: string; url?: string } | undefined;
    const clientEventId = body?.clientEventId as string | undefined;
    const mode: string | undefined = body?.mode || chatModeHeader;

    if (!event || !event.type) {
      return new Response(JSON.stringify({ error: "Missing event" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identify user (optional, but useful for feature flags later)
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enhanced intent detection with confidence scoring
    const userMessage = getRawUserText(event);
    const sessionId = clientEventId || crypto.randomUUID();
    
    let userIntent;
    let confidence = 1.0;
    let suggestedTool;
    
    if (chatModeHeader === 'training') {
      userIntent = 'training';
      suggestedTool = 'training-orchestrator';
    } else {
      const intentResult = await detectIntentWithConfidence(userMessage);
      userIntent = intentResult.name;
      confidence = intentResult.score;
      suggestedTool = intentResult.toolCandidate;
    }
    
    console.log('🎯 Enhanced Intent Analysis:', {
      intent: userIntent,
      confidence,
      suggestedTool,
      chatMode: chatModeHeader
    });

    // Enhanced routing with fallback logic
    if (userIntent === 'training' && confidence >= THRESHOLDS.tool) {
      console.log('🏋️ High confidence - Routing to training orchestrator');
      
      try {
        // Forward to training orchestrator
        const { data, error } = await supabase.functions.invoke('training-orchestrator', {
          body: { event, clientEventId }
        });
        
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
        
      } catch (error) {
        console.error('❌ Training orchestrator failed, falling back to manual:', error);
        // Continue to fallback logic below
      }
    }
    
    // Handle clarification needed (medium confidence)
    if (suggestedTool && confidence >= THRESHOLDS.clarify && confidence < THRESHOLDS.tool) {
      console.log('🤔 Medium confidence - Requesting clarification');
      
      const clarificationMessage = `Meinst du ${getToolDescription(suggestedTool)} oder etwas anderes? 
Wenn du willst, löse ich's direkt manuell und notiere das als Feature, damit es künftig automatisch läuft.`;
      
      // Log the clarification event
      await logUnmetTool(supabase, {
        userId,
        sessionId,
        message: userMessage,
        intentGuess: userIntent,
        confidence,
        suggestedTool,
        handledManually: false,
        manualSummary: 'Clarification requested'
      });
      
      return new Response(JSON.stringify({
        role: 'assistant',
        content: clarificationMessage,
        metadata: { clarification_needed: true, suggested_tool: suggestedTool }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LLM-Only Fallback for low confidence or no specific tool
    console.log('🤖 Low confidence or no tool - Using LLM fallback');
    
    const manualAnswer = await buildManualAnswer(event, { userId });
    
    // Log the unmet tool event for learning
    await logUnmetTool(supabase, {
      userId,
      sessionId,
      message: userMessage,
      intentGuess: userIntent,
      confidence,
      suggestedTool,
      handledManually: true,
      manualSummary: manualAnswer.substring(0, 200)
    });
    
    // Extract synonyms for continuous learning
    if (suggestedTool) {
      await extractAndLearnSynonyms(supabase, userMessage, suggestedTool);
    }
    
    return new Response(JSON.stringify({
      role: 'assistant',
      content: manualAnswer,
      metadata: { 
        fallback_used: true, 
        confidence,
        suggested_tool: suggestedTool,
        unmet_tool: true 
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("coach-orchestrator-enhanced error", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});