import { nanoid } from 'nanoid';
import { mark } from '@/lib/metrics';
import { supabase } from '@/integrations/supabase/client';

export function newTraceId(): string {
  const id = `t_${nanoid(10)}`;
  console.log(`🆔 Generated new trace ID: ${id}`);
  return id;
}

export function newMessageId(): string {
  return `msg_${nanoid(8)}`;
}

// Enhanced telemetry metrics interface
export interface TelemetryMetrics {
  firstToken_ms?: number;
  fullStream_ms?: number;
  contextBuild_ms?: number;
  rag_ms?: number;
  openai_ms?: number;
  memorySave_ms?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  cost_usd?: number;
  rag_hit_rate?: number;
  rag_score?: number;
  breaker_open?: boolean;
  breaker_halfOpen?: boolean;
  retry_count?: number;
  http_status?: number;
  openai_status?: string;
  active_calls?: number;
  waiting_calls?: number;
  sentiment_score?: number;
  persona_score?: number;
  pii_detected?: boolean;
  model_fingerprint?: string;
  openai_model?: string;
  queue_depth?: number;
}

// Enhanced trace event logging for detailed pipeline monitoring
export async function traceEvent(
  traceId: string,
  step: string,
  status: 'started' | 'progress' | 'complete' | 'error' = 'started',
  data: Record<string, any> = {},
  conversationId?: string,
  messageId?: string,
  duration?: number,
  error?: string,
  fullPrompt?: string
): Promise<void> {
  try {
    // Log to new detailed trace events table
    await supabase.from('coach_trace_events').insert({
      trace_id: traceId,
      conversation_id: conversationId,
      message_id: messageId,
      step,
      status,
      data,
      duration_ms: duration,
      error_message: error,
      full_prompt: fullPrompt
    });
  } catch (err) {
    console.warn('Trace event logging failed:', err);
  }
}

export async function trace(
  traceId: string,
  stage: string,
  payload: Record<string, any> = {},
  metrics: TelemetryMetrics = {}
): Promise<void> {
  // Combine payload with telemetry metrics
  const enrichedPayload = {
    ...payload,
    ...metrics,
    timestamp: Date.now()
  };

  // Log locally first
  await mark('trace', { traceId, stage, ...enrichedPayload });
  
  // SECURITY FIX: Use secure database function instead of hardcoded service role token
  try {
    await supabase.rpc('log_trace_event', {
      p_trace_id: traceId,
      p_stage: stage,
      p_data: enrichedPayload
    });
  } catch (error) {
    // Silent fail - tracing should never break the main flow
    console.warn('Trace logging failed:', error);
  }
}

// Helper functions for cost calculation
const OPENAI_PRICING = {
  'gpt-4o': { input: 0.005, output: 0.015 }, // per 1k tokens
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4.1-2025-04-14': { input: 0.005, output: 0.015 }
};

export function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = OPENAI_PRICING[model as keyof typeof OPENAI_PRICING];
  if (!pricing) return 0;
  
  return (promptTokens / 1000 * pricing.input) + (completionTokens / 1000 * pricing.output);
}

// PII Detection
export function detectPII(text: string): boolean {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/;
  const ibanRegex = /[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}/;
  
  return emailRegex.test(text) || phoneRegex.test(text) || ibanRegex.test(text);
}

// Simple sentiment analysis
export function calculateSentiment(text: string): number {
  const positiveWords = ['gut', 'super', 'toll', 'prima', 'klasse', 'perfekt', 'danke', 'freue'];
  const negativeWords = ['schlecht', 'furchtbar', 'ärgerlich', 'frustriert', 'nervt', 'blöd', 'dumm'];
  
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.some(pos => word.includes(pos))) score += 1;
    if (negativeWords.some(neg => word.includes(neg))) score -= 1;
  });
  
  return Math.max(-1, Math.min(1, score / words.length * 10)); // Normalize to -1 to 1
}