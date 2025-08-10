// Utility functions for coach orchestrator

export function getToolDescription(toolCandidate?: string): string {
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

export function summarize(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function createSessionId(): string {
  return crypto.randomUUID();
}

// Enhanced error handling for tool calls
export async function safeToolCall(
  supabase: any, 
  functionName: string, 
  payload: any,
  fallbackMessage: string = 'Tool temporarily unavailable, handling manually.'
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload
    });
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Tool call failed for ${functionName}:`, error);
    return { 
      success: false, 
      error,
      fallbackMessage 
    };
  }
}

// Rate limiting helper for learning hooks
export function shouldLearnSynonyms(confidence: number): boolean {
  // Only learn from medium to high confidence misses
  return confidence >= 0.3 && confidence < 0.7;
}

// Generate contextual fallback responses
export function generateContextualFallback(intent: string, userMessage: string): string {
  const templates = {
    training: `Verstanden. Ich löse das jetzt manuell: Hier sind deine nächsten Trainingsschritte für "${userMessage.substring(0, 30)}...". 
Nebenbei habe ich's als Feature markiert, damit das künftig automatisch läuft. Passt das so?`,
    
    meal: `Alles klar, kriegen wir sofort hin – ich analysiere "${userMessage.substring(0, 30)}..." kurz manuell.
Und ich hab's als Wunsch-Feature abgelegt, damit's beim nächsten Mal mit einem Klick geht. Ready?`,
    
    weight: `Verstanden. Ich trage das für "${userMessage.substring(0, 30)}..." ein und berechne deinen Fortschritt.
Das hab ich als Feature-Wunsch notiert für automatische Tracking. Klingt gut?`,
    
    diary: `Danke für deine Gedanken zu "${userMessage.substring(0, 30)}...". Ich speichere das manuell in deinem Tagebuch.
Hab das als Feature markiert für automatische Tagebuch-Erfassung. Passt das?`,
    
    default: `Verstanden. Ich kann "${userMessage.substring(0, 30)}..." jetzt manuell für dich lösen und dir die nächsten Schritte geben.
Klingt das gut? (Nebenbei markiere ich's als Wunsch-Feature.)`
  };
  
  return templates[intent as keyof typeof templates] || templates.default;
}