/**
 * ARES Streaming Edge Function - Hybrid AI Version
 * Lovable AI (Gemini) as Primary + Perplexity for Research + OpenAI Fallback
 * 
 * True SSE streaming with full ARES context (Persona, Memory, Knowledge, Bloodwork)
 * 
 * @version 2.0.0 - Hybrid AI
 * @date 2026-01-24
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cors } from '../_shared/ares/cors.ts';
import { newTraceId } from '../_shared/ares/ids.ts';
import { traceStart, traceUpdate, traceDone, traceFail } from '../_shared/ares/trace.ts';

// Hybrid AI Model Router
import {
  routeMessage,
  detectTaskType,
  getProviderConfig,
  getFallbackChain,
  type AIProvider,
  type ModelChoice,
  type RoutingContext,
} from '../_shared/ai/modelRouter.ts';

// ARES 3.0 Semantic Router - LLM-based Intent Detection
import {
  analyzeConversationContext,
  getDetailLevelInstruction,
  getOptimalModelForAnalysis,
  type ConversationAnalysis,
  type DetailLevel,
} from '../_shared/ai/semanticRouter.ts';

// Phase 2: Coach Personas Integration
import {
  loadUserPersona,
  buildPersonaPrompt,
  resolvePersonaWithContext,
  applyDialect,
  type CoachPersona,
  type PersonaResolutionContext,
  type ResolvedPersona,
} from '../_shared/persona/index.ts';

// Phase 3: Intelligent Context Loading
import {
  loadUserHealthContext,
  buildIntelligentSystemPrompt,
  convertConversationHistory,
  type UserHealthContext,
  type ConversationMessage,
} from '../_shared/context/index.ts';

// Phase 4: Memory System
import {
  extractInsightsFromMessage,
  saveInsights,
  saveInsightsWithUpdates,
  loadRelevantInsights,
  getExistingInsightStrings,
  detectPatterns,
  loadUnaddressedPatterns,
  getAllUserInsights,
  buildTimeAwareMemorySection,
  type UserInsight,
  type UserPattern,
  type ExtractedInsightWithUpdate,
} from '../_shared/memory/index.ts';

// Phase 5: Knowledge + Bloodwork Integration
import {
  loadRelevantKnowledge,
  formatKnowledgeForPrompt,
  type KnowledgeContext,
} from '../_shared/knowledge/index.ts';

import {
  loadBloodworkContext,
  formatBloodworkForPrompt,
  type BloodworkContext,
} from '../_shared/bloodwork/index.ts';

// Phase 9: ARES Protocol Deep Knowledge
import {
  ARES_PROTOCOL_KNOWLEDGE,
  getPhaseCoachingRules,
} from '../_shared/prompts/ares_protocol_knowledge.ts';

// Environment - Multiple AI Providers
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// AI Providers (Hybrid Setup)
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');

// ═══════════════════════════════════════════════════════════════════════════════
// ARES 3.0 HIGH-IQ TOKEN MANAGEMENT FOR REASONING MODELS
// ═══════════════════════════════════════════════════════════════════════════════

// Gemini 3 Pro is a Reasoning Model - needs more tokens for internal thinking
// KRITISCH: Minimum 2500 um abgeschnittene Antworten zu verhindern!
const ARES_MIN_TOKENS = 2500;

function detectQuestionComplexity(text: string): { level: 'simple' | 'moderate' | 'complex'; maxTokens: number } {
  const lowerText = text.toLowerCase();
  
  const complexKeywords = [
    'erkläre', 'analyse', 'studie', 'forschung', 'wissenschaft',
    'vergleich', 'unterschied', 'zusammenhang', 'mechanismus',
    'strategie', 'plan', 'protokoll', 'optimier', 'detailliert',
    'warum genau', 'wie funktioniert', 'step by step'
  ];
  
  const complexMatches = complexKeywords.filter(k => lowerText.includes(k)).length;
  const isLongQuestion = text.length > 150;
  
  // Gemini 3 Pro Reasoning Model needs MUCH more room than standard models
  if (complexMatches >= 2 || (complexMatches >= 1 && isLongQuestion)) {
    return { level: 'complex', maxTokens: 5000 }; // Full power for research/analysis
  }
  if (complexMatches >= 1 || isLongQuestion) {
    return { level: 'moderate', maxTokens: 4000 }; // Detailed explanations
  }
  return { level: 'simple', maxTokens: ARES_MIN_TOKENS }; // Minimum 2500 für alle
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface StreamEvent {
  type: 'thinking' | 'context_ready' | 'content' | 'error' | 'done';
  content?: string;
  delta?: string;
  traceId?: string;
  error?: string;
  step?: string;
  message?: string;
  done?: boolean;
  metrics?: {
    firstTokenMs?: number;
    totalTokens?: number;
    durationMs?: number;
  };
  loadedModules?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function sseEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Check if user message likely requires tool execution
 * These messages should be redirected to the non-streaming orchestrator
 */
function requiresToolExecution(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  const toolTriggers = [
    // Plan creation triggers
    'erstell', 'erstelle', 'mach mir', 'gib mir',
    'trainingsplan', 'ernährungsplan', 'supplement plan',
    'workout plan', 'makros berechnen',
    // Meta analysis triggers
    'analyse', 'analysiere', 'überblick', 'zusammenfassung',
    'wie stehe ich', 'mein fortschritt',
    // Peptide protocol triggers
    'peptid protokoll', 'peptide protocol', 'titration',
    // Research triggers -> Perplexity API
    'studie', 'studien', 'evidenz', 'wissenschaft',
    'laut forschung', 'pubmed', 'peer-reviewed',
    'meta-analyse', 'forschung zeigt', 'belegt',
    'wissenschaftlich', 'klinische', 'rct',
    'was sagt die wissenschaft', 'gibt es studien',
    'forschungsergebnisse', 'beweise', 'nachgewiesen',
    'laut wissenschaft', 'research', 'clinical trial',
  ];
  
  // Protocol-specific keywords should NOT trigger tool execution
  // ARES has protocol context in system prompt and can answer directly
  const protocolKeywords = [
    'protokoll', 'phase 0', 'phase 1', 'phase 2', 'phase 3',
    'fundament', 'rekomposition', 'longevity', 'checklist',
    'was fehlt mir', 'naechste phase', 'ares protokoll',
    'wie weit bin ich', 'mein fortschritt im protokoll'
  ];
  
  // If message is about protocol, let ARES handle it with context
  if (protocolKeywords.some(kw => lowerText.includes(kw))) {
    console.log('[ARES-STREAM] Protocol question detected - using context, not tools');
    return false;
  }
  
  return toolTriggers.some(trigger => lowerText.includes(trigger));
}

/**
 * Get specific reason for tool execution redirect
 * This helps frontend show appropriate thinking steps
 */
function getToolExecutionReason(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Research keywords - highest priority
  const researchTriggers = ['studie', 'studien', 'evidenz', 'wissenschaft', 'pubmed', 
    'meta-analyse', 'forschung', 'wissenschaftlich', 'klinische', 'rct', 
    'peer-reviewed', 'research', 'clinical trial', 'beweise', 'nachgewiesen'];
  if (researchTriggers.some(t => lowerText.includes(t))) {
    return 'research_scientific_evidence';
  }
  
  // Plan creation
  if (lowerText.includes('trainingsplan') || lowerText.includes('workout plan')) {
    return 'create_workout_plan';
  }
  if (lowerText.includes('ernährungsplan') || lowerText.includes('nutrition plan')) {
    return 'create_nutrition_plan';
  }
  if (lowerText.includes('peptid protokoll') || lowerText.includes('peptide protocol') || lowerText.includes('titration')) {
    return 'create_peptide_protocol';
  }
  
  // Meta analysis
  if (lowerText.includes('analyse') || lowerText.includes('fortschritt') || lowerText.includes('überblick')) {
    return 'meta_analysis';
  }
  
  return 'tool_execution';
}

/**
 * Detect mood from user message
 */
function detectMoodFromText(text: string): 'positive' | 'neutral' | 'frustrated' | 'overwhelmed' {
  const lowerText = text.toLowerCase();
  
  const frustrationWords = ['frustriert', 'genervt', 'nervt', 'mist', 'aufgeben'];
  if (frustrationWords.some(w => lowerText.includes(w))) return 'frustrated';
  
  const overwhelmedWords = ['überfordert', 'zu viel', 'erschöpft', 'keine kraft'];
  if (overwhelmedWords.some(w => lowerText.includes(w))) return 'overwhelmed';
  
  const positiveWords = ['super', 'geil', 'top', 'klasse', 'geschafft', 'motiviert'];
  if (positiveWords.some(w => lowerText.includes(w))) return 'positive';
  
  return 'neutral';
}

/**
 * Get time of day for persona context
 */
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Detect topic from user message
 */
function detectTopic(text: string): string | undefined {
  const lowerText = text.toLowerCase();
  
  const topicKeywords: Record<string, string[]> = {
    'training': ['training', 'workout', 'übung', 'gym', 'kraft', 'wiederholung'],
    'nutrition': ['ernährung', 'essen', 'kalorien', 'protein', 'makros', 'diät'],
    'motivation': ['motivation', 'aufgeben', 'ziel', 'erfolg'],
    'supplements': ['supplement', 'vitamin', 'kreatin'],
    'recovery': ['erholung', 'schlaf', 'regeneration', 'pause'],
    'peptides': ['peptid', 'semaglutid', 'tirzepatid', 'glp-1', 'retatrutide'],
  };
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => lowerText.includes(kw))) return topic;
  }
  return undefined;
}

/**
 * Build system prompt for streaming (simplified version)
 */
function buildStreamingSystemPrompt(
  persona: CoachPersona | ResolvedPersona,
  personaPrompt: string,
  healthContext: UserHealthContext | null,
  knowledgeContext: KnowledgeContext | null,
  bloodworkContext: BloodworkContext | null,
  userInsights: UserInsight[],
  conversationHistory: ConversationMessage[]
): string {
  const parts: string[] = [];
  
  // Identity
  parts.push('Du bist ARES - Elite AI Fitness & Health Coach.');
  parts.push('');
  
  // ARES Protocol Deep Knowledge - Full Understanding
  parts.push(ARES_PROTOCOL_KNOWLEDGE);
  parts.push('');
  // Persona
  if (personaPrompt) {
    parts.push(personaPrompt);
    parts.push('');
  }
  
  // User context from health system
  if (healthContext?.summaryForPrompt) {
    parts.push('== USER-KONTEXT ==');
    parts.push(healthContext.summaryForPrompt);
    parts.push('');
  }
  
  // Phase-specific coaching rules based on user's protocol status
  if (healthContext?.protocolStatus) {
    const phaseRules = getPhaseCoachingRules(
      healthContext.protocolStatus.currentPhase,
      healthContext.protocolStatus.missingItems || []
    );
    if (phaseRules) {
      parts.push(phaseRules);
      parts.push('');
    }
  }
  
  // User insights from memory - ENHANCED with time-aware formatting
  if (userInsights.length > 0) {
    const memorySection = buildTimeAwareMemorySection(userInsights);
    if (memorySection) {
      parts.push(memorySection);
    }
  }
  
  // Knowledge context
  if (knowledgeContext?.topics && knowledgeContext.topics.length > 0) {
    const knowledgePrompt = formatKnowledgeForPrompt(knowledgeContext);
    if (knowledgePrompt) {
      parts.push(knowledgePrompt);
      parts.push('');
    }
  }
  
  // Bloodwork context
  if (bloodworkContext?.hasData) {
    const bloodworkPrompt = formatBloodworkForPrompt(bloodworkContext);
    if (bloodworkPrompt) {
      parts.push(bloodworkPrompt);
      parts.push('');
    }
  }
  
  // Conversation history
  if (conversationHistory.length > 0) {
    parts.push('== LETZTE KONVERSATION ==');
    conversationHistory.slice(-6).forEach(msg => {
      const role = msg.role === 'user' ? 'USER' : 'DU';
      const content = msg.content.length > 200 ? msg.content.slice(0, 200) + '...' : msg.content;
      parts.push(`${role}: ${content}`);
    });
    parts.push('');
    
    // Critical style override
    parts.push('== KRITISCH: STIL-ANWEISUNG ==');
    parts.push('Nutze AUSSCHLIESSLICH den Stil aus deiner Persona-Definition.');
    parts.push('Kopiere NIEMALS den Sprachstil aus frueheren Nachrichten.');
    parts.push('');
  }
  
  // Response rules
  parts.push('== ANTWORT-REGELN ==');
  parts.push('- Antworte auf DEUTSCH');
  parts.push('- Sei KONKRET mit Zahlen und Daten');
  parts.push('- Beziehe dich auf User-Daten wenn vorhanden');
  parts.push('- 100-300 Woerter, je nach Komplexitaet');
  parts.push('- Beende mit einer Rueckfrage wenn sinnvoll');
  parts.push('');
  
  // Current date
  const now = new Date();
  const germanDays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const germanMonths = ['Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  parts.push(`Heute ist ${germanDays[now.getDay()]}, ${now.getDate()}. ${germanMonths[now.getMonth()]} ${now.getFullYear()}.`);
  
  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SERVER
// ═══════════════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  const pre = cors.preflight(req);
  if (pre) return pre;

  const headers = cors.headers();
  const started = performance.now();
  const traceId = req.headers.get('x-trace-id') || newTraceId();

  // Check if client wants SSE
  const acceptsSSE = req.headers.get('Accept')?.includes('text/event-stream');
  
  // Health check
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    return new Response(JSON.stringify({ 
      ok: true, 
      version: '2.0-hybrid',
      streaming: true,
      providers: {
        lovable: !!LOVABLE_API_KEY,
        openai: !!OPENAI_API_KEY,
        perplexity: !!PERPLEXITY_API_KEY
      },
      traceId 
    }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json', 'X-Trace-Id': traceId }
    });
  }

  // Validate secrets - need at least one AI provider
  if (!SVC) {
    return new Response(JSON.stringify({ ok: false, error: 'SVC missing', traceId }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
  
  if (!LOVABLE_API_KEY && !OPENAI_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'No AI provider configured (need LOVABLE_API_KEY or OPENAI_API_KEY)', traceId }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  // Auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized', traceId }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  const supaUser = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } }
  });
  const supaSvc = createClient(SUPABASE_URL, SVC, { auth: { persistSession: false } });

  try {
    // Validate token
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supaUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid token', traceId }), {
        status: 401,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
    
    const userId = claimsData.claims.sub as string;
    console.log('[ARES-STREAM] User authenticated:', userId);

    // Parse body
    const body = await req.json().catch(() => ({}));
    const text = body.message || body.text || '';
    const coachId = body.coachId || 'ares';
    const researchPlus = body.researchPlus === true;
    
    if (!text) {
      return new Response(JSON.stringify({ ok: false, error: 'No message provided', traceId }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Check if message requires tools OR researchPlus mode is active
    if (requiresToolExecution(text) || researchPlus) {
      const toolReason = researchPlus ? 'research_scientific_evidence' : getToolExecutionReason(text);
      console.log('[ARES-STREAM] Message requires tools. Reason:', toolReason, 'ResearchPlus:', researchPlus);
      
      // RESEARCH: Call ares-research directly and pipe SSE stream through
      if (toolReason === 'research_scientific_evidence') {
        console.log('[ARES-STREAM] Research detected - piping ares-research SSE directly');
        
        try {
          const researchResponse = await fetch(`${SUPABASE_URL}/functions/v1/ares-research`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'Accept': 'text/event-stream',
              'X-Trace-Id': traceId,
            },
            body: JSON.stringify({
              query: text,
              language: 'de',
              maxResults: 5,
              userId: userId,
              deepResearch: researchPlus, // Pass research level flag
            }),
          });
          
          if (!researchResponse.ok) {
            console.error('[ARES-STREAM] Research call failed:', researchResponse.status);
            return new Response(JSON.stringify({ 
              error: `Research failed: ${researchResponse.status}`,
              traceId 
            }), {
              status: researchResponse.status,
              headers: { ...headers, 'Content-Type': 'application/json' }
            });
          }
          
          // Pipe the SSE stream directly to client
          return new Response(researchResponse.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'X-Trace-Id': traceId,
              ...headers
            }
          });
        } catch (researchError) {
          console.error('[ARES-STREAM] Research error:', researchError);
          return new Response(JSON.stringify({ 
            error: researchError instanceof Error ? researchError.message : 'Research failed',
            traceId 
          }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
      }
      
      // OTHER TOOLS: Redirect to blocking endpoint
      console.log('[ARES-STREAM] Non-research tool, redirecting to blocking');
      return new Response(JSON.stringify({ 
        redirect: 'blocking', 
        reason: toolReason,
        traceId 
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Start trace
    await traceStart(traceId, userId, coachId, { input_text: text });

    // If client doesn't want SSE, fall back to JSON
    if (!acceptsSSE) {
      console.log('[ARES-STREAM] Client doesnt accept SSE, using JSON response');
      // Handle non-streaming request (simplified)
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Streaming required. Set Accept: text/event-stream',
        traceId 
      }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    let firstTokenTime: number | null = null;
    let totalTokens = 0;
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (event: StreamEvent) => {
          try {
            controller.enqueue(encoder.encode(sseEvent(event)));
          } catch (e) {
            console.warn('[ARES-STREAM] Enqueue error:', e);
          }
        };

        try {
          // ═══════════════════════════════════════════════════════════════════
          // PHASE 1: Load all context in parallel with thinking events
          // ═══════════════════════════════════════════════════════════════════
          console.log('[ARES-STREAM] Loading context...');
          const contextStart = performance.now();

          // Send initial thinking event
          enqueue({ type: 'thinking', step: 'start', message: 'Denke nach...', done: false });

          // Load all in parallel, but send thinking events as each completes
          const results = await Promise.allSettled([
            // Persona
            loadUserPersona(userId).then(r => {
              enqueue({ type: 'thinking', step: 'persona', message: 'Persona geladen', done: true });
              return r;
            }).catch(e => {
              console.warn('[ARES-STREAM] Persona load failed:', e);
              return null;
            }),
            // Health context
            loadUserHealthContext(userId, supaSvc).then(r => {
              if (r) enqueue({ type: 'thinking', step: 'health', message: 'Gesundheitsdaten analysiert', done: true });
              return r;
            }).catch(e => {
              console.warn('[ARES-STREAM] Health context failed:', e);
              return null;
            }),
            // Knowledge
            loadRelevantKnowledge(text, supaSvc, { maxTopics: 5 }).then(r => {
              if (r?.topics?.length) enqueue({ type: 'thinking', step: 'knowledge', message: `${r.topics.length} Wissensquellen gefunden`, done: true });
              return r;
            }).catch(e => {
              console.warn('[ARES-STREAM] Knowledge load failed:', e);
              return null;
            }),
            // Bloodwork
            loadBloodworkContext(userId, supaSvc).then(r => {
              if (r?.hasData) enqueue({ type: 'thinking', step: 'bloodwork', message: 'Blutwerte geprüft', done: true });
              return r;
            }).catch(e => {
              console.warn('[ARES-STREAM] Bloodwork load failed:', e);
              return null;
            }),
            // Insights - ERHÖHT von 10 auf 30 für mehr Kontext
            loadRelevantInsights(userId, text, 30, supaSvc).then(r => {
              if (r.length > 0) enqueue({ type: 'thinking', step: 'memory', message: `${r.length} Erinnerungen geladen`, done: true });
              return r;
            }).catch(e => {
              console.warn('[ARES-STREAM] Insights load failed:', e);
              return [] as UserInsight[];
            }),
            // Conversation history
            supaSvc
              .from('coach_conversations')
              .select('message_content, message_role, created_at')
              .eq('user_id', userId)
              .eq('coach_personality', coachId)
              .order('created_at', { ascending: false })
              .limit(12)
              .then(r => {
                if (r.data?.length) enqueue({ type: 'thinking', step: 'history', message: 'Gesprächsverlauf geladen', done: true });
                return r.data || [];
              })
              .catch(() => [])
          ]);

          // Extract results
          const personaResult = results[0].status === 'fulfilled' ? results[0].value : null;
          const healthContext = results[1].status === 'fulfilled' ? results[1].value : null;
          const knowledgeContext = results[2].status === 'fulfilled' ? results[2].value : null;
          const bloodworkContext = results[3].status === 'fulfilled' ? results[3].value : null;
          const insightsResult = results[4].status === 'fulfilled' ? results[4].value : [];
          const conversationsResult = results[5].status === 'fulfilled' ? results[5].value : [];

          // Mark thinking complete
          enqueue({ type: 'thinking', step: 'start', message: 'Formuliere Antwort...', done: true });

          // Convert conversations to proper format
          const conversationHistory: ConversationMessage[] = [];
          const rawConvs = (conversationsResult as any[]).reverse(); // Chronological order
          for (const msg of rawConvs) {
            conversationHistory.push({
              role: msg.message_role as 'user' | 'assistant',
              content: msg.message_content || '',
              timestamp: msg.created_at
            });
          }

          // Resolve persona with context
          let persona = personaResult || { id: 'ares', name: 'ARES' } as CoachPersona;
          let personaPrompt = '';
          
          if (personaResult) {
            const resolutionContext: PersonaResolutionContext = {
              mood: detectMoodFromText(text),
              timeOfDay: getTimeOfDay(),
              topic: detectTopic(text),
            };
            const resolved = resolvePersonaWithContext(personaResult, resolutionContext);
            persona = resolved;
            personaPrompt = buildPersonaPrompt(resolved, resolutionContext);
          }

          const loadedModules: string[] = [];
          if (personaResult) loadedModules.push('persona');
          if (healthContext) loadedModules.push('health');
          if (knowledgeContext?.topics?.length) loadedModules.push('knowledge');
          if (bloodworkContext?.hasData) loadedModules.push('bloodwork');
          if ((insightsResult as UserInsight[]).length > 0) loadedModules.push('memory');

          const contextTime = Math.round(performance.now() - contextStart);
          console.log('[ARES-STREAM] Context loaded in', contextTime, 'ms. Modules:', loadedModules.join(', '));

          // Send context ready event
          enqueue({
            type: 'context_ready',
            loadedModules,
            traceId
          });

          await traceUpdate(traceId, { status: 'context_loaded' });

          // ═══════════════════════════════════════════════════════════════════
          // PHASE 2: Semantic Analysis - LLM-based Intent Detection
          // ═══════════════════════════════════════════════════════════════════
          
          // Get last bot message for context-aware analysis
          const lastBotMessage = conversationHistory.length > 0 
            ? conversationHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content || null
            : null;
          
          let semanticAnalysis: ConversationAnalysis | null = null;
          
          // Only run semantic analysis for shorter messages (cost-efficient)
          if (text.length < 150) {
            try {
              enqueue({ type: 'thinking', step: 'analyze', message: 'Analysiere Intent...', done: false });
              const analyzeStart = performance.now();
              
              semanticAnalysis = await analyzeConversationContext(text, lastBotMessage, { 
                timeout: 2500,
                fallbackOnError: true 
              });
              
              const analyzeDuration = Math.round(performance.now() - analyzeStart);
              console.log('[ARES-STREAM] Semantic Analysis:', {
                intent: semanticAnalysis.intent,
                detail: semanticAnalysis.required_detail_level,
                reasoning: semanticAnalysis.reasoning,
                duration: analyzeDuration + 'ms'
              });
              
              enqueue({ type: 'thinking', step: 'analyze', message: `Intent: ${semanticAnalysis.intent}`, done: true });
            } catch (e) {
              console.warn('[ARES-STREAM] Semantic analysis failed, continuing without:', e);
            }
          }
          
          // ═══════════════════════════════════════════════════════════════════
          // PHASE 2b: Build system prompt with dynamic instructions
          // ═══════════════════════════════════════════════════════════════════
          let baseSystemPrompt = buildStreamingSystemPrompt(
            persona,
            personaPrompt,
            healthContext as UserHealthContext | null,
            knowledgeContext as KnowledgeContext | null,
            bloodworkContext as BloodworkContext | null,
            insightsResult as UserInsight[],
            conversationHistory
          );
          
          // Inject dynamic response length instructions based on semantic analysis
          let dynamicInstructions = '';
          if (semanticAnalysis) {
            dynamicInstructions = getDetailLevelInstruction(
              semanticAnalysis.required_detail_level,
              semanticAnalysis.intent
            );
          }
          
          const systemPrompt = dynamicInstructions 
            ? baseSystemPrompt + '\n\n' + dynamicInstructions
            : baseSystemPrompt;

          await traceUpdate(traceId, { 
            status: 'prompt_built',
            system_prompt: systemPrompt.slice(0, 5000), // Truncate for trace
            llm_input: semanticAnalysis ? { 
              semantic_intent: semanticAnalysis.intent,
              semantic_detail: semanticAnalysis.required_detail_level,
              semantic_reasoning: semanticAnalysis.reasoning
            } : undefined
          });

          // ═══════════════════════════════════════════════════════════════════
          // PHASE 3: Call AI with Semantic-Aware Model Selection
          // ═══════════════════════════════════════════════════════════════════
          
          // Determine routing based on message content AND semantic analysis
          const routingContext: RoutingContext = {
            hasImages: false,
            messageLength: text.length,
            conversationLength: conversationHistory.length,
          };
          
          let modelChoice = routeMessage(text, routingContext);
          
          // Override with semantic analysis if available (more intelligent)
          let semanticMaxTokens: number | null = null;
          if (semanticAnalysis) {
            const optimalModel = getOptimalModelForAnalysis(semanticAnalysis);
            
            // Use semantic router's recommendation
            if (semanticAnalysis.intent === 'confirmation' || 
                semanticAnalysis.intent === 'chit_chat' ||
                semanticAnalysis.required_detail_level === 'ultra_short') {
              modelChoice = {
                provider: 'lovable',
                model: optimalModel.model,
                reason: `Semantic: ${optimalModel.reason}`
              };
              semanticMaxTokens = optimalModel.maxTokens;
            } else if (semanticAnalysis.intent === 'deep_dive' ||
                       semanticAnalysis.required_detail_level === 'extensive') {
              modelChoice = {
                provider: 'lovable',
                model: optimalModel.model,
                reason: `Semantic: ${optimalModel.reason}`
              };
              semanticMaxTokens = optimalModel.maxTokens;
            }
          }
          
          console.log('[ARES-STREAM] Model routing:', modelChoice.provider, modelChoice.model, '-', modelChoice.reason);
          
          // Get fallback chain
          const fallbackProviders = getFallbackChain(modelChoice.provider);
          let aiResponse: Response | null = null;
          let usedProvider: AIProvider = modelChoice.provider;
          let usedModel = modelChoice.model;
          
          // Try providers in fallback order
          for (const provider of fallbackProviders) {
            const config = getProviderConfig(provider);
            const apiKey = Deno.env.get(config.apiKeyEnv);
            
            if (!apiKey) {
              console.warn(`[ARES-STREAM] ${provider} API key not found, skipping...`);
              continue;
            }
            
            // Adjust model for fallback provider
            let model = modelChoice.model;
            if (provider !== modelChoice.provider) {
              if (provider === 'lovable') {
                model = 'google/gemini-2.5-flash';
              } else if (provider === 'openai') {
                model = 'gpt-4o-mini';
              }
            }
            
            console.log(`[ARES-STREAM] Trying ${provider}/${model}...`);
            
            try {
              const response = await fetch(config.baseUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
              body: JSON.stringify({
                  model,
                  stream: true,
                  temperature: 0.7,
                  // KRITISCH: Minimum 2500 tokens für ALLE Antworten um Abschneiden zu verhindern
                  max_tokens: Math.max(semanticMaxTokens || detectQuestionComplexity(text).maxTokens, 2500),
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                  ]
                })
              });
              
              if (response.ok) {
                aiResponse = response;
                usedProvider = provider;
                usedModel = model;
                console.log(`[ARES-STREAM] Success with ${provider}/${model}`);
                break;
              }
              
              // Handle rate limits
              if (response.status === 429 || response.status === 402) {
                console.warn(`[ARES-STREAM] ${provider} rate limited (${response.status}), trying fallback...`);
                continue;
              }
              
              // Server errors
              if (response.status >= 500) {
                console.warn(`[ARES-STREAM] ${provider} server error (${response.status}), trying fallback...`);
                continue;
              }
              
              // Client error - log but continue to fallback
              const errorText = await response.text();
              console.error(`[ARES-STREAM] ${provider} error:`, response.status, errorText);
              
            } catch (fetchError) {
              console.error(`[ARES-STREAM] ${provider} fetch failed:`, fetchError);
            }
          }
          
          if (!aiResponse) {
            enqueue({ type: 'error', error: 'All AI providers failed' });
            await traceFail(traceId, { error: 'All AI providers failed' });
            controller.close();
            return;
          }
          
          // Log which provider was used for analytics
          // Fix: 'streaming' is not allowed in DB constraint, use 'prompt_built'
          await traceUpdate(traceId, {
            status: 'prompt_built',
            llm_input: { provider: usedProvider, model: usedModel, routing: modelChoice.reason }
          });

          const reader = aiResponse.body?.getReader();
          if (!reader) {
            enqueue({ type: 'error', error: 'No response stream' });
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let buffer = '';

          // ═══════════════════════════════════════════════════════════════════
          // PHASE 4: Stream chunks to client
          // ═══════════════════════════════════════════════════════════════════
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                
                // ROBUST: Reasoning Models send empty strings while thinking - don't abort
                if (delta !== undefined && delta !== null) {
                  if (delta.length > 0) {
                    if (firstTokenTime === null) {
                      firstTokenTime = Math.round(performance.now() - started);
                      console.log('[ARES-STREAM] First token at', firstTokenTime, 'ms');
                    }
                    
                    totalTokens++;
                    fullResponse += delta;
                    
                    // Send content chunk
                    enqueue({ type: 'content', delta });
                  }
                  // Empty string = model is still reasoning, not an abort
                }
                
                // Log reasoning output if present (some models send this)
                const reasoning = parsed.choices?.[0]?.delta?.reasoning;
                if (reasoning) {
                  console.log('[ARES-STREAM] Reasoning chunk:', reasoning.substring(0, 100));
                }
              } catch (e) {
                // Ignore JSON parse errors for incomplete chunks
              }
            }
          }

          // ═══════════════════════════════════════════════════════════════════
          // PHASE 5: Finalize
          // ═══════════════════════════════════════════════════════════════════
          const durationMs = Math.round(performance.now() - started);
          console.log('[ARES-STREAM] Stream complete. Tokens:', totalTokens, 'Duration:', durationMs, 'ms');

          // Apply dialect if persona has one
          let finalResponse = fullResponse;
          const personaDialect = (persona as any).dialect;
          if (personaDialect && typeof applyDialect === 'function') {
            finalResponse = applyDialect(fullResponse, personaDialect, 0.5);
          }

          // Send done event
          enqueue({
            type: 'done',
            traceId,
            metrics: {
              firstTokenMs: firstTokenTime || undefined,
              totalTokens,
              durationMs
            }
          });

          await traceUpdate(traceId, {
            status: 'completed',
            llm_output: finalResponse.slice(0, 10000),
            duration_ms: durationMs
          });
          await traceDone(traceId, durationMs);

          // ═══════════════════════════════════════════════════════════════════
          // PHASE 6: Post-stream tasks (via waitUntil to not block)
          // ═══════════════════════════════════════════════════════════════════
          const postStreamTasks = async () => {
            try {
              // Save conversation
              const conversationDate = new Date().toISOString().split('T')[0];
              
              await supaSvc.from('coach_conversations').insert([
                {
                  user_id: userId,
                  coach_personality: coachId,
                  message_role: 'user',
                  message_content: text,
                  conversation_date: conversationDate,
                  context_data: { trace_id: traceId }
                },
                {
                  user_id: userId,
                  coach_personality: coachId,
                  message_role: 'assistant',
                  message_content: finalResponse,
                  conversation_date: conversationDate,
                  context_data: { trace_id: traceId, streaming: true }
                }
              ]);
              console.log('[ARES-STREAM] Conversation saved');

              // Extract and save insights WITH UPDATE DETECTION
              const existingInsights = await getExistingInsightStrings(userId, supaSvc);
              const newInsights = await extractInsightsFromMessage(text, userId, 'chat', existingInsights);
              
              if (newInsights.length > 0) {
                // Use enhanced save with update detection
                const result = await saveInsightsWithUpdates(
                  userId, 
                  newInsights as ExtractedInsightWithUpdate[], 
                  'chat', 
                  traceId, 
                  supaSvc
                );
                console.log('[ARES-STREAM] Insights saved:', result.saved, 'new,', result.superseded, 'superseded');
                
                // Pattern detection
                const allInsights = await getAllUserInsights(userId, supaSvc);
                await detectPatterns(userId, newInsights, allInsights, supaSvc);
              }
            } catch (postError) {
              console.error('[ARES-STREAM] Post-stream tasks failed:', postError);
            }
          };

          // Use EdgeRuntime.waitUntil if available, otherwise await
          if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
            EdgeRuntime.waitUntil(postStreamTasks());
          } else {
            await postStreamTasks();
          }

          controller.close();

        } catch (error) {
          console.error('[ARES-STREAM] Stream error:', error);
          enqueue({ 
            type: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          await traceFail(traceId, error);
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...headers,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Trace-Id': traceId
      }
    });

  } catch (error) {
    console.error('[ARES-STREAM] Fatal error:', error);
    await traceFail(traceId, error);
    
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : 'Server error',
      traceId
    }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json', 'X-Trace-Id': traceId }
    });
  }
});

// Declare EdgeRuntime for TypeScript
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<any>) => void;
} | undefined;
