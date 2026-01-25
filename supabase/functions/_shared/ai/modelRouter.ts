// ARES 3.0 Hybrid AI Model Router
// Premium Model Stack: Gemini 3 Pro + Perplexity Deep Research + GPT-5 Fallback

export type AIProvider = 'lovable' | 'perplexity' | 'openai';

export type ModelChoice = {
  provider: AIProvider;
  model: string;
  reason: string;
};

export type TaskType = 'chat' | 'research' | 'tools' | 'analysis' | 'vision';

export interface RoutingContext {
  hasImages?: boolean;
  complexity?: number;
  requiresTools?: boolean;
  messageLength?: number;
  conversationLength?: number;
}

// Research-Trigger Keywords (German + English)
const RESEARCH_TRIGGERS = [
  /studie[n]?/i,
  /research/i,
  /pubmed/i,
  /evidenz/i,
  /wissenschaft/i,
  /paper/i,
  /meta-analyse/i,
  /clinical trial/i,
  /peptid.*forschung/i,
  /laut.*forschung/i,
  /was sagt die wissenschaft/i,
  /gibt es studien/i,
  /aktuell.*erkenntnisse/i,
  /forschungslage/i,
  /wissenschaftliche.*grundlage/i,
];

// Tool-Trigger Keywords
const TOOL_TRIGGERS = [
  /\b(erstell|generier|berechn|analys|zeig|plan)\b.*\b(plan|workout|ern.hrung|rezept|blutwert)/i,
  /mein.*(gewicht|kalorien|makros|fortschritt)/i,
  /tracke?|logge?|speicher/i,
  /wie viel.*(protein|kcal|kalorien)/i,
];

// Complex analysis triggers
const COMPLEX_TRIGGERS = [
  /erkl.r.*detail/i,
  /warum.*genau/i,
  /vergleich/i,
  /unterschied.*zwischen/i,
  /optimier/i,
  /strategie/i,
  /langfristig/i,
  /periodisierung/i,
];

export function detectTaskType(text: string, context: RoutingContext = {}): TaskType {
  // Vision tasks
  if (context.hasImages) {
    return 'vision';
  }
  
  // Research tasks -> Perplexity
  if (RESEARCH_TRIGGERS.some(trigger => trigger.test(text))) {
    return 'research';
  }
  
  // Tool tasks -> Still use Gemini 3 Pro (good function calling)
  if (context.requiresTools || TOOL_TRIGGERS.some(trigger => trigger.test(text))) {
    return 'tools';
  }
  
  // Complex analysis
  if (COMPLEX_TRIGGERS.some(trigger => trigger.test(text)) || 
      (context.complexity && context.complexity > 0.7)) {
    return 'analysis';
  }
  
  return 'chat';
}

export function routeMessage(text: string, context: RoutingContext = {}): ModelChoice {
  const taskType = detectTaskType(text, context);
  
  switch (taskType) {
    case 'research':
      return {
        provider: 'perplexity',
        model: 'sonar-deep-research',
        reason: 'Research query detected - using Perplexity Deep Research for academic analysis'
      };
    
    case 'tools':
      return {
        provider: 'lovable',
        model: 'google/gemini-3-pro-preview',
        reason: 'Tool execution required - using Gemini 3 Pro for function calling'
      };
    
    case 'vision':
      return {
        provider: 'lovable',
        model: 'google/gemini-3-pro-preview',
        reason: 'Image analysis - using Gemini 3 Pro for vision capabilities'
      };
    
    case 'analysis':
      return {
        provider: 'lovable',
        model: 'google/gemini-3-pro-preview',
        reason: 'Complex analysis - using Gemini 3 Pro for deep reasoning'
      };
    
    case 'chat':
    default:
      // Use Flash for simple chat (faster, cheaper)
      if ((context.messageLength ?? text.length) < 150 && 
          (context.conversationLength ?? 0) < 5) {
        return {
          provider: 'lovable',
          model: 'google/gemini-3-flash-preview',
          reason: 'Simple chat - using Gemini 3 Flash for speed'
        };
      }
      // Pro for longer conversations
      return {
        provider: 'lovable',
        model: 'google/gemini-3-pro-preview',
        reason: 'Standard chat - using Gemini 3 Pro for quality'
      };
  }
}

export function getProviderConfig(provider: AIProvider): {
  baseUrl: string;
  apiKeyEnv: string;
} {
  switch (provider) {
    case 'lovable':
      return {
        baseUrl: 'https://ai.gateway.lovable.dev/v1/chat/completions',
        apiKeyEnv: 'LOVABLE_API_KEY'
      };
    case 'perplexity':
      return {
        baseUrl: 'https://api.perplexity.ai/chat/completions',
        apiKeyEnv: 'PERPLEXITY_API_KEY'
      };
    case 'openai':
      return {
        baseUrl: 'https://api.openai.com/v1/chat/completions',
        apiKeyEnv: 'OPENAI_API_KEY'
      };
  }
}

// Fallback chain for resilience - Lovable first, then GPT-5 via Lovable
export function getFallbackChain(primary: AIProvider): AIProvider[] {
  switch (primary) {
    case 'lovable':
      return ['lovable']; // GPT-5 fallback handled internally via Lovable gateway
    case 'perplexity':
      return ['perplexity', 'lovable'];
    case 'openai':
      return ['openai', 'lovable'];
    default:
      return ['lovable'];
  }
}

// Get fallback model when primary fails
export function getFallbackModel(failedModel: string): string {
  // If Gemini fails, fallback to GPT-5 via Lovable gateway
  if (failedModel.includes('gemini')) {
    return 'openai/gpt-5';
  }
  // If GPT-5 fails, try Gemini
  if (failedModel.includes('gpt-5') || failedModel.includes('openai')) {
    return 'google/gemini-3-pro-preview';
  }
  // Default fallback
  return 'openai/gpt-5';
}

export async function callWithFallback(
  messages: any[],
  preferredChoice: ModelChoice,
  options: {
    stream?: boolean;
    tools?: any[];
    systemPrompt?: string;
  } = {}
): Promise<{ response: Response; usedProvider: AIProvider; usedModel: string }> {
  const config = getProviderConfig('lovable'); // Always use Lovable gateway
  const apiKey = Deno.env.get(config.apiKeyEnv);
  
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY not configured');
  }
  
  // For Perplexity, use direct API
  if (preferredChoice.provider === 'perplexity') {
    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (perplexityKey) {
      try {
        const perplexityConfig = getProviderConfig('perplexity');
        const body: any = {
          model: preferredChoice.model,
          messages: options.systemPrompt 
            ? [{ role: 'system', content: options.systemPrompt }, ...messages]
            : messages,
          stream: options.stream ?? false,
          search_mode: 'academic',
        };
        
        const response = await fetch(perplexityConfig.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        
        if (response.ok) {
          console.log(`[ModelRouter] Success with perplexity/${preferredChoice.model}`);
          return { response, usedProvider: 'perplexity', usedModel: preferredChoice.model };
        }
        
        // Perplexity failed, fall through to Lovable
        console.warn(`[ModelRouter] Perplexity failed (${response.status}), falling back to Lovable AI`);
      } catch (error) {
        console.error('[ModelRouter] Perplexity error:', error);
      }
    }
  }
  
  // Use Lovable AI Gateway (supports both Gemini and GPT-5)
  let currentModel = preferredChoice.provider === 'perplexity' 
    ? 'google/gemini-3-pro-preview' // Fallback from Perplexity
    : preferredChoice.model;
  
  const maxRetries = 2;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const body: any = {
        model: currentModel,
        messages: options.systemPrompt 
          ? [{ role: 'system', content: options.systemPrompt }, ...messages]
          : messages,
        stream: options.stream ?? false,
      };
      
      // Add tools if provided
      if (options.tools && options.tools.length > 0) {
        body.tools = options.tools;
      }
      
      const response = await fetch(config.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        console.log(`[ModelRouter] Success with lovable/${currentModel}`);
        return { response, usedProvider: 'lovable', usedModel: currentModel };
      }
      
      // Handle rate limits - try fallback model
      if (response.status === 429 || response.status >= 500) {
        console.warn(`[ModelRouter] ${currentModel} error (${response.status}), trying fallback...`);
        currentModel = getFallbackModel(currentModel);
        continue;
      }
      
      // 402 - Payment required, surface to user
      if (response.status === 402) {
        const errorText = await response.text();
        throw new Error(`Payment required: ${errorText}`);
      }
      
      // Other client errors - don't retry
      const errorText = await response.text();
      throw new Error(`Lovable AI error ${response.status}: ${errorText}`);
      
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }
      console.error(`[ModelRouter] Attempt ${attempt + 1} failed:`, error);
      currentModel = getFallbackModel(currentModel);
    }
  }
  
  throw new Error('All AI providers failed');
}

// Check if query is a research query
export function isResearchQuery(text: string): boolean {
  return RESEARCH_TRIGGERS.some(trigger => trigger.test(text));
}

// Check if query requires tools
export function requiresToolExecution(text: string): boolean {
  return TOOL_TRIGGERS.some(trigger => trigger.test(text));
}
