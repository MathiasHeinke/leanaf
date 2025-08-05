// OpenAI Performance Configuration
// Optimized for maximum speed + quality (costs ignored)

export interface OpenAIConfig {
  model: string;
  temperature: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  max_tokens?: number;
}

// Modell-Routing nach Qualitätsbedarf
export const MODEL_CONFIGS = {
  // GPT-4.1 für tiefes Schlussfolgern, beste Instruktions-Treue
  REASONING: {
    model: 'gpt-4.1-2025-04-14',
    temperature: 0.2,
    top_p: 0.95,
    frequency_penalty: 0.1,
    stream: false
  } as OpenAIConfig,

  // GPT-4.1 für Vision + rasches Feedback (≤3s)
  VISION_FAST: {
    model: 'gpt-4.1-2025-04-14', 
    temperature: 0.4,
    top_p: 1,
    stream: false
  } as OpenAIConfig,

  // GPT-4o-mini für Massendurchsatz, unkritisch
  BULK: {
    model: 'gpt-4o-mini',
    temperature: 0.6,
    top_p: 1,
    stream: false
  } as OpenAIConfig,

  // Verifikation / Parsing (Verify Meal, Extract Exercise)
  VERIFICATION: {
    model: 'gpt-4.1-2025-04-14',
    temperature: 0.0,
    top_p: 0,
    frequency_penalty: 0,
    presence_penalty: 0
  } as OpenAIConfig,

  // Kreative Vorschläge (Generate Coach Suggestion)
  CREATIVE: {
    model: 'gpt-4.1-2025-04-14',
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0.5,
    stream: false
  } as OpenAIConfig,

  // Zusammenfassen (Day Summary)
  SUMMARY: {
    model: 'gpt-4o-mini', // Optimiert für Durchsatz
    temperature: 0.3,
    top_p: 0.9,
    frequency_penalty: 0.2,
    presence_penalty: 0,
    stream: false
  } as OpenAIConfig,

  // Langketten-Analyse (Sleep/Workout Analysis)  
  ANALYSIS: {
    model: 'gpt-4.1-2025-04-14',
    temperature: 0.2,
    top_p: 0.95,
    frequency_penalty: 0.1,
    presence_penalty: 0,
    stream: false
  } as OpenAIConfig,

  // Emotions-/Intent-Klassen, JSON-Output
  STRUCTURED: {
    model: 'gpt-4.1-2025-04-14',
    temperature: 0.1,
    top_p: 0.9,
    frequency_penalty: 0,
    presence_penalty: 0
  } as OpenAIConfig
};

// Task-spezifische Konfigurationen
export const TASK_CONFIGS = {
  // Meal Analysis & Verification
  'analyze-meal': MODEL_CONFIGS.VISION_FAST,
  'verify-meal': MODEL_CONFIGS.VERIFICATION,
  'enhanced-meal-analysis': MODEL_CONFIGS.VISION_FAST,
  'evaluate-meal': MODEL_CONFIGS.REASONING,

  // Exercise & Workout
  'extract-exercise-data': MODEL_CONFIGS.VERIFICATION,
  'coach-workout-analysis': MODEL_CONFIGS.ANALYSIS,

  // Body & Health Analysis
  'body-analysis': MODEL_CONFIGS.VISION_FAST,
  'coach-sleep-analysis': MODEL_CONFIGS.ANALYSIS,
  'coach-weight-analysis': MODEL_CONFIGS.ANALYSIS,

  // Coach Features
  'coach-analysis': MODEL_CONFIGS.VISION_FAST,
  'coach-media-analysis': MODEL_CONFIGS.REASONING,
  'coach-recipes': MODEL_CONFIGS.REASONING,
  'generate-coach-suggestions': MODEL_CONFIGS.CREATIVE,
  'unified-coach-engine': MODEL_CONFIGS.REASONING,

  // Summaries & Reports
  'day-summary': MODEL_CONFIGS.SUMMARY,
  'generate-day-summaries': MODEL_CONFIGS.BULK,
  'generate-day-summary-v2': MODEL_CONFIGS.SUMMARY,

  // Utilities
  'supplement-recognition': MODEL_CONFIGS.VERIFICATION,
  'image-classifier': MODEL_CONFIGS.VERIFICATION,
  'debug-direct-chat': MODEL_CONFIGS.REASONING,
  
  // Marketing & Communication
  'generate-intelligent-greeting': MODEL_CONFIGS.CREATIVE,
  'send-marketing-email': MODEL_CONFIGS.BULK
};

// Retry-Policy: Exponentielles Backoff
export async function callOpenAIWithRetry(
  apiCall: () => Promise<any>,
  maxRetries: number = 3,
  baseDelay: number = 200
): Promise<any> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) break;
      
      // Exponentielles Backoff: 200ms, 400ms, 800ms, 1600ms (max 2s)
      const delay = Math.min(baseDelay * Math.pow(2, attempt), 2000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`🔄 OpenAI retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
    }
  }
  
  throw lastError;
}

// Embedding-Konfiguration: text-embedding-3-small 
export const EMBEDDING_CONFIG = {
  model: 'text-embedding-3-small', // ~30% bessere MRR als Ada-002
  dimensions: 1536,
  chunk_size: 256, // Sweet-Spot zwischen Recall & Index-Größe
  overlap: 32 // Kontext-Kleber
};

// Whisper-Optimierung
export const WHISPER_CONFIG = {
  model: 'whisper-1',
  temperature: 0, // Konsistentes Wording
  response_format: 'json',
  language: 'de', // Für deutsche Sprache optimiert
  // Chunk-Größe 30s, Overlap 3s im Frontend
};

// Token cost calculation (per 1K tokens)
const TOKEN_COSTS = {
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4.1-2025-04-14': { input: 0.0025, output: 0.01 },
  'text-embedding-3-small': { input: 0.00002, output: 0 }
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number = 0): number {
  const costs = TOKEN_COSTS[model as keyof typeof TOKEN_COSTS];
  if (!costs) return 0;
  
  return (inputTokens / 1000 * costs.input) + (outputTokens / 1000 * costs.output);
}

// Enhanced telemetry logging
export async function logTelemetryData(
  supabase: any,
  traceId: string,
  stage: string,
  data: Record<string, any>,
  startTime?: number
) {
  try {
    const payload = {
      trace_id: traceId,
      stage,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        ...(startTime ? { duration_ms: Date.now() - startTime } : {})
      },
      ts: new Date().toISOString()
    };

    const { error } = await supabase
      .from('coach_traces')
      .insert(payload);

    if (error) {
      console.error('Failed to log telemetry data:', error);
    }
  } catch (error) {
    console.error('Error logging telemetry data:', error);
  }
}

// Sentiment analysis helper
export function analyzeSentiment(text: string): number {
  const positiveWords = ['gut', 'toll', 'super', 'fantastisch', 'perfekt', 'liebe', 'freue', 'glücklich', 'danke', 'hilft'];
  const negativeWords = ['schlecht', 'schrecklich', 'hasse', 'furchtbar', 'traurig', 'müde', 'stress', 'problem', 'schwer'];
  
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.some(pos => word.includes(pos))) score += 0.1;
    if (negativeWords.some(neg => word.includes(neg))) score -= 0.1;
  });
  
  return Math.max(-1, Math.min(1, score));
}

// PII detection helper
export function detectPII(text: string): boolean {
  const piiPatterns = [
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
    /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/, // SSN
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone
  ];
  
  return piiPatterns.some(pattern => pattern.test(text));
}

// Circuit breaker simulation (in production, use Redis)
let circuitBreakerState = { open: false, halfOpen: false, errorCount: 0, lastErrorTime: 0 };

export function getCircuitBreakerStatus() {
  const now = Date.now();
  
  // Reset after 5 minutes
  if (now - circuitBreakerState.lastErrorTime > 5 * 60 * 1000) {
    circuitBreakerState = { open: false, halfOpen: false, errorCount: 0, lastErrorTime: 0 };
  }
  
  // Open circuit if too many errors
  if (circuitBreakerState.errorCount >= 5) {
    circuitBreakerState.open = true;
    circuitBreakerState.halfOpen = false;
  }
  
  return {
    breaker_open: circuitBreakerState.open,
    breaker_halfOpen: circuitBreakerState.halfOpen,
    breaker_closed: !circuitBreakerState.open && !circuitBreakerState.halfOpen
  };
}

export function recordError() {
  circuitBreakerState.errorCount++;
  circuitBreakerState.lastErrorTime = Date.now();
}

// Performance-Monitoring
export function logPerformanceMetrics(
  functionName: string,
  model: string,
  startTime: number,
  tokenCount?: number
) {
  const duration = Date.now() - startTime;
  console.log(`📊 ${functionName}[${model}]: ${duration}ms${tokenCount ? ` | ${tokenCount} tokens` : ''}`);
  
  // Alert bei p95 > 8s
  if (duration > 8000) {
    console.warn(`⚠️ High latency detected: ${functionName} took ${duration}ms`);
  }
}