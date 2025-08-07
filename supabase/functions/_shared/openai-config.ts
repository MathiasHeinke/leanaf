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
  // GPT-5 Standard – High-level reasoning, RAG, planning
  REASONING: {
    model: 'gpt-5',
    temperature: 0.2,
    top_p: 0.95,
    frequency_penalty: 0.1,
    stream: false
  } as OpenAIConfig,

  // Vision Fast – cheap multimodal for quick feedback (meals, supplements)
  VISION_FAST: {
    model: 'gpt-4o-mini',
    temperature: 0.4,
    top_p: 1,
    stream: false
  } as OpenAIConfig,

  // Vision Precise – best quality for body images and important visuals
  VISION_PRECISE: {
    model: 'gpt-5',
    temperature: 0.2,
    top_p: 0.95,
    stream: false
  } as OpenAIConfig,

  // Bulk/High-throughput – inexpensive default
  BULK: {
    model: 'gpt-5-nano',
    temperature: 0.6,
    top_p: 1,
    stream: false
  } as OpenAIConfig,

  // Verification/Parsing – deterministic JSON/classification
  VERIFICATION: {
    model: 'gpt-5-mini',
    temperature: 0.0,
    top_p: 0,
    frequency_penalty: 0,
    presence_penalty: 0
  } as OpenAIConfig,

  // Creative suggestions and tone-friendly outputs
  CREATIVE: {
    model: 'gpt-5-mini',
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0.5,
    stream: false
  } as OpenAIConfig,

  // Summaries (day summaries etc.)
  SUMMARY: {
    model: 'gpt-5-nano',
    temperature: 0.3,
    top_p: 0.9,
    frequency_penalty: 0.2,
    presence_penalty: 0,
    stream: false
  } as OpenAIConfig,

  // Long-chain analysis (sleep/workout analysis)
  ANALYSIS: {
    model: 'gpt-5',
    temperature: 0.2,
    top_p: 0.95,
    frequency_penalty: 0.1,
    presence_penalty: 0,
    stream: false
  } as OpenAIConfig,

  // Structured outputs – JSON schemas, intent detection
  STRUCTURED: {
    model: 'gpt-5-mini',
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

  // Body & Health Analysis (prefer precise vision)
  'body-analysis': MODEL_CONFIGS.VISION_PRECISE,
  'coach-sleep-analysis': MODEL_CONFIGS.ANALYSIS,
  'coach-weight-analysis': MODEL_CONFIGS.ANALYSIS,

  // Coach Features
  'coach-analysis': MODEL_CONFIGS.REASONING,
  'coach-media-analysis': MODEL_CONFIGS.VISION_PRECISE,
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

export function resolveModel(model: string): string {
  switch (model) {
    case 'gpt-5':
      return 'gpt-4.1-2025-04-14';
    case 'gpt-5-mini':
      return 'gpt-4o-mini';
    case 'gpt-5-nano':
      return 'gpt-4o-mini';
    default:
      return model;
  }
}

export function getTaskModel(task: keyof typeof TASK_CONFIGS): string {
  return resolveModel(TASK_CONFIGS[task].model);
}

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

// Token cost calculation (per 1M tokens, updated pricing)
const TOKEN_COSTS = {
  'gpt-5': { input: 0.00000125, output: 0.00001 },
  'gpt-5-mini': { input: 0.00000025, output: 0.000002 },
  'gpt-5-nano': { input: 0.00000005, output: 0.0000004 },
  'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4.1-2025-04-14': { input: 0.000002, output: 0.000008 },
  'text-embedding-3-small': { input: 0.00002, output: 0 },
  'text-embedding-3-large': { input: 0.00013, output: 0 },
  'whisper-1': { input: 0.006, output: 0 } // per minute
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number = 0): number {
  const costs = TOKEN_COSTS[model as keyof typeof TOKEN_COSTS];
  if (!costs) return 0;
  
  const cost = (inputTokens * costs.input) + (outputTokens * costs.output);
  return Math.round(cost * 100000) / 100000; // Round to 5 decimal places
}

// Enhanced telemetry logging with detailed debug info
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

    console.log(`🔧 Telemetry: ${stage} for trace ${traceId}`, {
      stage,
      dataKeys: Object.keys(data),
      hasUserMessage: !!data.user_message,
      hasSystemMessage: !!data.system_message,
      hasFullPrompt: !!data.full_prompt_preview,
      hasCoachResponse: !!data.coach_response
    });

    const { error } = await supabase
      .from('coach_traces')
      .insert(payload);

    if (error) {
      console.error(`❌ Failed to log telemetry data for ${stage}:`, error);
      console.error('Payload that failed:', JSON.stringify(payload, null, 2));
    } else {
      console.log(`✅ Successfully logged telemetry for ${stage}`);
    }
  } catch (error) {
    console.error(`❌ Error logging telemetry data for ${stage}:`, error);
    console.error('Trace ID:', traceId);
    console.error('Data keys:', Object.keys(data));
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

// Enhanced Circuit Breaker with detailed tracking
let circuitBreakerState = { 
  open: false, 
  halfOpen: false, 
  errorCount: 0, 
  successCount: 0,
  totalRequests: 0,
  lastErrorTime: 0,
  lastResetTime: Date.now()
};

export function getCircuitBreakerStatus() {
  const now = Date.now();
  const RESET_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  const ERROR_THRESHOLD = 5;
  const HALF_OPEN_THRESHOLD = 3;
  
  // Reset after timeout
  if (now - circuitBreakerState.lastErrorTime > RESET_TIMEOUT) {
    circuitBreakerState.errorCount = Math.max(0, circuitBreakerState.errorCount - 1); // Gradual recovery
  }
  
  // Calculate error rate
  const errorRate = circuitBreakerState.totalRequests > 0 ? 
    circuitBreakerState.errorCount / circuitBreakerState.totalRequests : 0;
  
  // State transitions
  const isOpen = circuitBreakerState.errorCount >= ERROR_THRESHOLD;
  const isHalfOpen = circuitBreakerState.errorCount >= HALF_OPEN_THRESHOLD && !isOpen;
  
  circuitBreakerState.open = isOpen;
  circuitBreakerState.halfOpen = isHalfOpen;
  
  return {
    breaker_open: isOpen,
    breaker_halfOpen: isHalfOpen,
    breaker_closed: !isOpen && !isHalfOpen,
    error_count: circuitBreakerState.errorCount,
    success_count: circuitBreakerState.successCount,
    total_requests: circuitBreakerState.totalRequests,
    error_rate: errorRate,
    last_error_time: circuitBreakerState.lastErrorTime
  };
}

export function recordError() {
  circuitBreakerState.errorCount++;
  circuitBreakerState.totalRequests++;
  circuitBreakerState.lastErrorTime = Date.now();
}

export function recordSuccess() {
  circuitBreakerState.successCount++;
  circuitBreakerState.totalRequests++;
  // Gradual error count reduction on success
  if (circuitBreakerState.errorCount > 0) {
    circuitBreakerState.errorCount = Math.max(0, circuitBreakerState.errorCount - 0.1);
  }
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