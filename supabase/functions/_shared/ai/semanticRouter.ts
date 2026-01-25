/**
 * ARES 3.0 Semantic Router - LLM-based Intent Detection
 * 
 * Uses Gemini 2.5 Flash for ultra-fast semantic analysis of user messages
 * to determine appropriate response length and model selection.
 * 
 * @version 1.0.0
 * @date 2026-01-25
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type IntentType = 
  | 'confirmation'   // "ok", "ja", "passt" - just acknowledging
  | 'rejection'      // "nein", "passt nicht", "anders"
  | 'question'       // Direct question expecting info
  | 'deep_dive'      // Wants detailed explanation
  | 'chit_chat'      // Smalltalk, greeting
  | 'emotion'        // Expressing feelings primarily
  | 'command'        // Give instruction (save, create, etc.)
  | 'followup';      // Short follow-up to previous topic

export type DetailLevel = 'ultra_short' | 'concise' | 'moderate' | 'extensive';

export type Sentiment = 'positive' | 'neutral' | 'negative' | 'frustrated';

export interface ConversationAnalysis {
  intent: IntentType;
  user_sentiment: Sentiment;
  required_detail_level: DetailLevel;
  expects_action: boolean;      // Does user expect something to be saved/created?
  references_previous: boolean; // Is this a response to bot's last message?
  reasoning: string;            // Brief explanation for debugging
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAST-PATH DETECTION (No LLM needed)
// ═══════════════════════════════════════════════════════════════════════════════

const INSTANT_CONFIRMATIONS = new Set([
  'ok', 'okay', 'jo', 'ja', 'jep', 'yep', 'klar', 'passt', 'gut', 'top', 
  'nice', 'danke', 'thx', 'merci', 'check', 'erledigt', 'verstanden',
  'alles klar', 'mach ich', 'wird gemacht', 'roger', 'aye', 'genau',
  'stimmt', 'richtig', 'absolut', 'definitiv', 'sicher', 'logo'
]);

const INSTANT_REJECTIONS = new Set([
  'nein', 'nee', 'ne', 'nope', 'nicht', 'lieber nicht', 'eher nicht',
  'passt nicht', 'geht nicht', 'anders'
]);

const GREETING_PATTERNS = /^(hi|hey|hallo|moin|servus|guten\s*(morgen|tag|abend)|was\s*geht|na)[\s!?.]*$/i;

/**
 * Fast-path detection for very short messages
 * Returns null if LLM analysis is needed
 */
export function fastPathAnalysis(text: string): ConversationAnalysis | null {
  const normalized = text.toLowerCase().trim().replace(/[.!?,]+$/, '');
  
  // Very short messages (< 30 chars) - check against known patterns
  if (text.length < 30) {
    // Instant confirmations
    if (INSTANT_CONFIRMATIONS.has(normalized) || 
        normalized.startsWith('ok ') ||
        normalized.includes('passt')) {
      return {
        intent: 'confirmation',
        user_sentiment: 'positive',
        required_detail_level: 'ultra_short',
        expects_action: false,
        references_previous: true,
        reasoning: 'Fast-path: Instant confirmation detected'
      };
    }
    
    // Instant rejections
    if (INSTANT_REJECTIONS.has(normalized) ||
        normalized.includes('nicht') && !normalized.includes('?')) {
      return {
        intent: 'rejection',
        user_sentiment: 'neutral',
        required_detail_level: 'concise',
        expects_action: false,
        references_previous: true,
        reasoning: 'Fast-path: Instant rejection detected'
      };
    }
    
    // Greetings
    if (GREETING_PATTERNS.test(normalized)) {
      return {
        intent: 'chit_chat',
        user_sentiment: 'positive',
        required_detail_level: 'concise',
        expects_action: false,
        references_previous: false,
        reasoning: 'Fast-path: Greeting detected'
      };
    }
  }
  
  // LLM analysis needed
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LLM-BASED SEMANTIC ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

const SEMANTIC_ROUTER_PROMPT = `Du bist ein Konversations-Analyzer für ARES, einen Elite AI Fitness Coach.
Deine EINZIGE Aufgabe: Klassifiziere die User-Absicht basierend auf Kontext.

LETZTE BOT-NACHRICHT:
{lastBotMessage}

USER ANTWORTET:
"{currentMessage}"

ANALYSIERE:
1. Bezieht sich der User auf die letzte Nachricht?
2. Was ist die PRIMÄRE Absicht?
3. Wie ausführlich sollte die Antwort sein?

INTENT-TYPEN:
- confirmation: Bestätigt/akzeptiert ("ok", "ja", "passt", "danke") → ULTRA_SHORT Antwort
- rejection: Lehnt ab/widerspricht ("nein", "passt nicht", "anders") → CONCISE Antwort
- question: Stellt eine einfache Frage → MODERATE Antwort
- deep_dive: Will Details/Erklärung ("erkläre", "warum", "wie funktioniert") → EXTENSIVE Antwort
- chit_chat: Smalltalk/Begrüßung → CONCISE Antwort
- emotion: Drückt primär Gefühle aus ("frustriert", "motiviert") → MODERATE Antwort
- command: Gibt Anweisung (speichern, erstellen, berechnen) → MODERATE Antwort
- followup: Kurze Nachfrage zum vorherigen Thema → CONCISE Antwort

DETAIL_LEVEL:
- ultra_short: Max 1-2 Sätze (~30-50 Wörter) - bei Bestätigungen
- concise: Max 3-4 Sätze (~80-100 Wörter) - bei einfachen Fragen
- moderate: Normale Antwort (~150-200 Wörter)
- extensive: Ausführliche Erklärung (~250-350 Wörter)

WICHTIG:
- "ok ne passt" auf eine Frage = confirmation (NICHT question!)
- Kurze Antworten auf Bot-Fragen = references_previous: true
- Bei Unsicherheit: moderate wählen

Antworte NUR mit validem JSON (kein Markdown, keine Erklärung):
{"intent":"...","user_sentiment":"...","required_detail_level":"...","expects_action":false,"references_previous":true,"reasoning":"..."}`;

export async function analyzeConversationContext(
  currentMessage: string,
  lastBotMessage: string | null,
  options: {
    timeout?: number;
    fallbackOnError?: boolean;
  } = {}
): Promise<ConversationAnalysis> {
  const { timeout = 3000, fallbackOnError = true } = options;
  
  // Try fast-path first (0ms latency)
  const fastResult = fastPathAnalysis(currentMessage);
  if (fastResult) {
    console.log('[SemanticRouter] Fast-path hit:', fastResult.intent);
    return fastResult;
  }
  
  // For longer messages, use LLM
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.warn('[SemanticRouter] No LOVABLE_API_KEY, using fallback');
    return createFallbackAnalysis(currentMessage);
  }
  
  const prompt = SEMANTIC_ROUTER_PROMPT
    .replace('{lastBotMessage}', lastBotMessage || '(Gesprächsstart - keine vorherige Nachricht)')
    .replace('{currentMessage}', currentMessage);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 150
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn('[SemanticRouter] API error:', response.status);
      if (fallbackOnError) return createFallbackAnalysis(currentMessage);
      throw new Error(`Semantic router API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON response
    const parsed = parseAnalysisResponse(content);
    console.log('[SemanticRouter] LLM analysis:', parsed.intent, '-', parsed.required_detail_level);
    return parsed;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[SemanticRouter] Timeout after', timeout, 'ms');
    } else {
      console.error('[SemanticRouter] Error:', error);
    }
    
    if (fallbackOnError) return createFallbackAnalysis(currentMessage);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function parseAnalysisResponse(content: string): ConversationAnalysis {
  try {
    // Try to extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize
      return {
        intent: validateIntent(parsed.intent),
        user_sentiment: validateSentiment(parsed.user_sentiment),
        required_detail_level: validateDetailLevel(parsed.required_detail_level),
        expects_action: Boolean(parsed.expects_action),
        references_previous: Boolean(parsed.references_previous),
        reasoning: String(parsed.reasoning || 'LLM analysis')
      };
    }
  } catch (e) {
    console.warn('[SemanticRouter] Failed to parse response:', content);
  }
  
  // Default fallback
  return {
    intent: 'question',
    user_sentiment: 'neutral',
    required_detail_level: 'moderate',
    expects_action: false,
    references_previous: false,
    reasoning: 'Parse failed, using default'
  };
}

function validateIntent(intent: unknown): IntentType {
  const valid: IntentType[] = ['confirmation', 'rejection', 'question', 'deep_dive', 'chit_chat', 'emotion', 'command', 'followup'];
  return valid.includes(intent as IntentType) ? (intent as IntentType) : 'question';
}

function validateSentiment(sentiment: unknown): Sentiment {
  const valid: Sentiment[] = ['positive', 'neutral', 'negative', 'frustrated'];
  return valid.includes(sentiment as Sentiment) ? (sentiment as Sentiment) : 'neutral';
}

function validateDetailLevel(level: unknown): DetailLevel {
  const valid: DetailLevel[] = ['ultra_short', 'concise', 'moderate', 'extensive'];
  return valid.includes(level as DetailLevel) ? (level as DetailLevel) : 'moderate';
}

function createFallbackAnalysis(text: string): ConversationAnalysis {
  const length = text.length;
  const hasQuestion = text.includes('?');
  
  // Simple heuristics as fallback
  if (length < 20 && !hasQuestion) {
    return {
      intent: 'confirmation',
      user_sentiment: 'neutral',
      required_detail_level: 'concise',
      expects_action: false,
      references_previous: true,
      reasoning: 'Fallback: Short non-question'
    };
  }
  
  if (hasQuestion && length > 50) {
    return {
      intent: 'question',
      user_sentiment: 'neutral',
      required_detail_level: 'moderate',
      expects_action: false,
      references_previous: false,
      reasoning: 'Fallback: Long question'
    };
  }
  
  return {
    intent: 'question',
    user_sentiment: 'neutral',
    required_detail_level: 'moderate',
    expects_action: false,
    references_previous: false,
    reasoning: 'Fallback: Default analysis'
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE LENGTH INSTRUCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function getDetailLevelInstruction(level: DetailLevel, intent: IntentType): string {
  const instructions: Record<DetailLevel, string> = {
    ultra_short: `== ANTWORT-STEUERUNG: ULTRAKURZ ==
Der User hat nur kurz bestätigt/geantwortet.
- MAX 1-2 Sätze (~30-50 Wörter)
- KEINE Wiederholung des vorherigen Themas
- Kurze Überleitung zum nächsten Schritt ODER abschließende Frage
- Kein Vortrag, keine Erklärungen!`,

    concise: `== ANTWORT-STEUERUNG: KURZ ==
Halte dich kurz und prägnant.
- MAX 3-4 Sätze (~80-100 Wörter)
- Fokus auf das Wesentliche
- Eine gezielte Frage oder Handlungsempfehlung`,

    moderate: `== ANTWORT-STEUERUNG: NORMAL ==
Normale Antwortlänge.
- Ca. 150-200 Wörter
- Strukturiert und informativ
- Mit Rückfrage wenn sinnvoll`,

    extensive: `== ANTWORT-STEUERUNG: AUSFÜHRLICH ==
Der User will Details und Tiefe.
- Ca. 250-350 Wörter
- Fundierte Erklärung mit Kontext
- Strukturiert mit klaren Punkten
- Wissenschaftliche Basis wenn relevant`
  };
  
  let instruction = instructions[level];
  
  // Add intent-specific hints
  if (intent === 'confirmation') {
    instruction += '\n- WICHTIG: User hat bestätigt. Kein Nachtreten zum alten Thema!';
  } else if (intent === 'rejection') {
    instruction += '\n- User hat abgelehnt. Frage nach Alternative oder akzeptiere.';
  } else if (intent === 'emotion') {
    instruction += '\n- Zeige Empathie, bevor du Lösungen anbietest.';
  }
  
  return instruction;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL SELECTION BASED ON ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export function getOptimalModelForAnalysis(analysis: ConversationAnalysis): {
  model: string;
  maxTokens: number;
  reason: string;
} {
  // Ultra-short responses don't need Pro reasoning
  if (analysis.required_detail_level === 'ultra_short' || 
      analysis.intent === 'confirmation' ||
      analysis.intent === 'chit_chat') {
    return {
      model: 'google/gemini-2.5-flash-preview',
      maxTokens: 300,
      reason: 'Simple acknowledgment - Flash for speed'
    };
  }
  
  // Concise responses - Flash is sufficient
  if (analysis.required_detail_level === 'concise' && 
      analysis.intent !== 'deep_dive') {
    return {
      model: 'google/gemini-2.5-flash-preview',
      maxTokens: 600,
      reason: 'Concise response - Flash sufficient'
    };
  }
  
  // Extensive/deep-dive needs Pro reasoning
  if (analysis.required_detail_level === 'extensive' || 
      analysis.intent === 'deep_dive') {
    return {
      model: 'google/gemini-3-pro-preview',
      maxTokens: 4000,
      reason: 'Deep analysis required - Pro for quality'
    };
  }
  
  // Default: Pro for general quality
  return {
    model: 'google/gemini-3-pro-preview',
    maxTokens: 2500,
    reason: 'Standard response - Pro for quality'
  };
}
