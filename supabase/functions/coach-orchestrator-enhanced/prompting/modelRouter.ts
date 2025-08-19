// Model Router: Smart model selection for different tasks
export type ModelChoice = { 
  chat: string; 
  tools: string; 
};

export type ModelFlags = {
  costSensitive?: boolean;
  highFidelity?: boolean;
  requiresReasoning?: boolean;
};

export function chooseModels(flags: ModelFlags = {}): ModelChoice {
  // High fidelity for complex conversations
  if (flags.highFidelity) {
    return { 
      chat: "gpt-4.1-2025-04-14", 
      tools: "gpt-4o-mini" 
    };
  }
  
  // Reasoning model for complex analysis
  if (flags.requiresReasoning) {
    return {
      chat: "o4-mini-2025-04-16",
      tools: "gpt-4o-mini"
    };
  }
  
  // Cost sensitive mode
  if (flags.costSensitive) {
    return { 
      chat: "gpt-4o-mini", 
      tools: "gpt-4o-mini" 
    };
  }
  
  // Default balanced selection
  return { 
    chat: "gpt-4o-mini", 
    tools: "gpt-4o-mini" 
  };
}

export function getModelParameters(model: string) {
  // GPT-5 and newer models
  if (model.includes('gpt-5') || model.includes('o3') || model.includes('o4') || model.includes('gpt-4.1')) {
    return {
      max_completion_tokens: 1000,
      // Note: No temperature parameter for newer models
    };
  }
  
  // Legacy models
  return {
    max_tokens: 1000,
    temperature: 0.7,
  };
}

export function shouldUseHighFidelity(userMsg: string, context: any): boolean {
  const complexTriggers = [
    /(warum|explain|erkläre|begründe|analyse)/i,
    /(komplex|schwierig|detailliert)/i,
    /(plan|strategy|strategie|konzept)/i
  ];
  
  const hasComplexQuery = complexTriggers.some(trigger => trigger.test(userMsg));
  const hasDeepContext = context?.goals?.length > 2 || context?.metrics?.kcalDeviation > 500;
  
  return hasComplexQuery || hasDeepContext;
}