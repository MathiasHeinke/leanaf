// ARES 3.0 Model Router - Orchestrator Sync
// Premium Model Stack for coach-orchestrator-enhanced

export type ModelChoice = { 
  chat: string; 
  tools: string; 
};

export type ModelFlags = {
  costSensitive?: boolean;
  highFidelity?: boolean;
  requiresReasoning?: boolean;
  isResearch?: boolean;
};

export function chooseModels(flags: ModelFlags = {}): ModelChoice {
  // Research queries go to Perplexity via ares-research function
  if (flags.isResearch) {
    return {
      chat: 'perplexity/sonar-deep-research',
      tools: 'google/gemini-3-pro-preview'
    };
  }
  
  // High fidelity for complex conversations - Gemini 3 Pro
  if (flags.highFidelity) {
    return { 
      chat: 'google/gemini-3-pro-preview', 
      tools: 'google/gemini-3-pro-preview' 
    };
  }
  
  // Reasoning model for complex analysis - Gemini 3 Pro
  if (flags.requiresReasoning) {
    return {
      chat: 'google/gemini-3-pro-preview',
      tools: 'google/gemini-3-pro-preview'
    };
  }
  
  // Cost sensitive mode - Gemini 3 Flash
  if (flags.costSensitive) {
    return { 
      chat: 'google/gemini-3-flash-preview', 
      tools: 'google/gemini-3-flash-preview' 
    };
  }
  
  // Default balanced selection - Gemini 3 Pro for quality
  return { 
    chat: 'google/gemini-3-pro-preview', 
    tools: 'google/gemini-3-pro-preview' 
  };
}

export function getModelParameters(model: string) {
  // Gemini 3 and GPT-5 models
  if (model.includes('gemini-3') || model.includes('gpt-5') || model.includes('gemini-2.5')) {
    return {
      max_completion_tokens: 2000,
      // Note: temperature handled separately for Gemini
    };
  }
  
  // Legacy models fallback
  return {
    max_tokens: 1500,
    temperature: 0.7,
  };
}

export function shouldUseHighFidelity(userMsg: string, context: any): boolean {
  const complexTriggers = [
    /(warum|explain|erkläre|begründe|analyse)/i,
    /(komplex|schwierig|detailliert)/i,
    /(plan|strategy|strategie|konzept)/i,
    /(periodisierung|zyklus|phase)/i,
  ];
  
  const hasComplexQuery = complexTriggers.some(trigger => trigger.test(userMsg));
  const hasDeepContext = context?.goals?.length > 2 || context?.metrics?.kcalDeviation > 500;
  
  return hasComplexQuery || hasDeepContext;
}

// Research keyword detection
const RESEARCH_TRIGGERS = [
  /studie[n]?/i,
  /research/i,
  /pubmed/i,
  /evidenz/i,
  /wissenschaft/i,
  /paper/i,
  /meta-analyse/i,
  /forschung/i,
];

export function isResearchQuery(text: string): boolean {
  return RESEARCH_TRIGGERS.some(trigger => trigger.test(text));
}
