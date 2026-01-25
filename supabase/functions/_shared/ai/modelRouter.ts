// ARES Hybrid AI Model Router
// Intelligente Provider-Auswahl: Lovable AI (Gemini) + Perplexity + OpenAI Fallback

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
  
  // Tool tasks -> OpenAI (better function calling)
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
        model: 'sonar-pro',
        reason: 'Research query detected - using Perplexity for academic search'
      };
    
    case 'tools':
      return {
        provider: 'openai',
        model: 'gpt-4o',
        reason: 'Tool execution required - using OpenAI for reliable function calling'
      };
    
    case 'vision':
      return {
        provider: 'lovable',
        model: 'google/gemini-2.5-pro',
        reason: 'Image analysis - using Gemini Pro for vision capabilities'
      };
    
    case 'analysis':
      return {
        provider: 'lovable',
        model: 'google/gemini-2.5-pro',
        reason: 'Complex analysis - using Gemini Pro for deep reasoning'
      };
    
    case 'chat':
    default:
      // Use Flash for simple chat (faster, cheaper)
      if ((context.messageLength ?? text.length) < 200 && 
          (context.conversationLength ?? 0) < 10) {
        return {
          provider: 'lovable',
          model: 'google/gemini-3-flash-preview',
          reason: 'Simple chat - using Gemini Flash for speed'
        };
      }
      // Pro for longer conversations
      return {
        provider: 'lovable',
        model: 'google/gemini-2.5-flash',
        reason: 'Standard chat - using Gemini 2.5 Flash for balance'
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

// Fallback chain for resilience
export function getFallbackChain(primary: AIProvider): AIProvider[] {
  switch (primary) {
    case 'lovable':
      return ['lovable', 'openai'];
    case 'perplexity':
      return ['perplexity', 'lovable', 'openai'];
    case 'openai':
      return ['openai', 'lovable'];
    default:
      return ['lovable', 'openai'];
  }
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
  const fallbackProviders = getFallbackChain(preferredChoice.provider);
  
  for (const provider of fallbackProviders) {
    const config = getProviderConfig(provider);
    const apiKey = Deno.env.get(config.apiKeyEnv);
    
    if (!apiKey) {
      console.warn(`[ModelRouter] ${provider} API key not found, skipping...`);
      continue;
    }
    
    // Determine model based on provider
    let model = preferredChoice.model;
    if (provider !== preferredChoice.provider) {
      // Fallback model selection
      if (provider === 'lovable') {
        model = 'google/gemini-2.5-flash';
      } else if (provider === 'openai') {
        model = 'gpt-4o-mini';
      }
    }
    
    try {
      const body: any = {
        model,
        messages: options.systemPrompt 
          ? [{ role: 'system', content: options.systemPrompt }, ...messages]
          : messages,
        stream: options.stream ?? false,
      };
      
      // Only add tools for OpenAI (best function calling support)
      if (options.tools && provider === 'openai') {
        body.tools = options.tools;
      }
      
      // Perplexity-specific options
      if (provider === 'perplexity') {
        body.search_mode = 'academic';
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
        console.log(`[ModelRouter] Success with ${provider}/${model}`);
        return { response, usedProvider: provider, usedModel: model };
      }
      
      // Handle rate limits gracefully
      if (response.status === 429 || response.status === 402) {
        console.warn(`[ModelRouter] ${provider} rate limited (${response.status}), trying fallback...`);
        continue;
      }
      
      // Server errors - try fallback
      if (response.status >= 500) {
        console.warn(`[ModelRouter] ${provider} server error (${response.status}), trying fallback...`);
        continue;
      }
      
      // Client errors - don't fallback, throw
      const errorText = await response.text();
      throw new Error(`${provider} error ${response.status}: ${errorText}`);
      
    } catch (error) {
      console.error(`[ModelRouter] ${provider} failed:`, error);
      // Continue to next provider
    }
  }
  
  throw new Error('All AI providers failed');
}
