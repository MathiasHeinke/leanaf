export interface CoachMetadata {
  id: string;
  name: string;
  displayName: string;
  personality: string;
  role: string;
  prompt_template_id: string;
  memory_id: string;
  avatar: string;
  imageUrl?: string;
  color: string;
  accentColor: string;
  isPremium?: boolean;
  isFree?: boolean;
  expertise: string[];
  access: {
    tools: string[];
    datasets: string[];
    rag: string[];
  };
  aliases: string[];
}

export const COACH_REGISTRY: Record<string, CoachMetadata> = {
  freya: {
    id: 'freya',
    name: 'FREYA',
    displayName: 'FREYA',
    personality: 'Ultimate Female Intelligence - vereint Ernährungswissen mit Hormonexpertise',
    role: 'Ultimate Female Health & Performance Coach',
    prompt_template_id: 'freya_ultimate',
    memory_id: 'freya_memory_v2',
    avatar: '👑',
    imageUrl: '/lovable-uploads/4b8ee7ce-3bfe-4f9d-8a58-e6b50b29d78c.png',
    color: 'hsl(320, 70%, 65%)',
    accentColor: 'hsl(280, 60%, 70%)',
    isPremium: false,
    isFree: true,
    expertise: [
      'Female Hormone Optimization',
      'Cycle-Based Training', 
      'Nutrition & Metabolism',
      'Recovery & Wellness',
      'Life Phase Coaching',
      'Mindful Nutrition',
      'Supplement Safety'
    ],
    access: {
      tools: ['cycleAssessment', 'femaleTraining', 'hormonalInsights', 'nutritionAnalysis', 'recoveryOptimization'],
      datasets: ['hormone_research', 'cycle_data', 'nutrition_database', 'supplement_database'],
      rag: ['vita_knowledge_semantic']
    },
    aliases: ['freya', 'female', 'women', 'frau', 'frauen', 'hormone', 'cycle', 'zyklus', 'lucy', 'vita', 'nutrition']
  },
  ares: {
    id: 'ares',
    name: 'ARES',
    displayName: 'ARES',
    personality: 'Ultimate Performance Coach - Cross-domain mastery, meta-intelligence, supremely effective',
    role: 'Ultimate Performance & Transformation Coach',
    prompt_template_id: 'persona_ares',
    memory_id: 'ares_memory_v1',
    avatar: '⚡',
    imageUrl: '/lovable-uploads/b4563c95-6bd0-4a46-8bb8-4c8c5e69b29e.png',
    color: 'hsl(0, 80%, 60%)',
    accentColor: 'hsl(20, 70%, 65%)',
    isPremium: true,
    isFree: false,
    expertise: [
      'Cross-Domain Optimization',
      'Ultimate Performance',
      'Meta-Intelligence Coaching',
      'Total Life Mastery',
      'Advanced Periodization',
      'Peak Performance Psychology',
      'Biohacking & Optimization'
    ],
    access: {
      tools: ['aresMetaCoach', 'aresTotalAssessment', 'ultimateOptimization', 'crossDomainAnalysis'],
      datasets: ['all_knowledge', 'performance_research', 'optimization_protocols'],
      rag: ['search_ares_ultimate_knowledge']
    },
    aliases: ['ares', 'ultimate', 'performance', 'meta', 'optimization', 'sascha', 'kai', 'male', 'markus', 'ruhl']
  }
};

/**
 * Resolves coach ID using fuzzy matching
 * @param inputId Raw coach ID from request
 * @returns Resolved coach metadata or fallback to FREYA
 */
export function resolveCoach(inputId: string): CoachMetadata {
  if (!inputId) {
    return COACH_REGISTRY.freya; // Default fallback
  }

  const normalized = inputId.trim().toLowerCase().replace(/[_-\s]/g, '');
  
  // Exact match first
  if (COACH_REGISTRY[normalized]) {
    return COACH_REGISTRY[normalized];
  }
  
  // Fuzzy matching through aliases
  for (const [coachId, coach] of Object.entries(COACH_REGISTRY)) {
    if (coach.aliases.some(alias => 
      alias.toLowerCase().replace(/[_-\s]/g, '').includes(normalized) ||
      normalized.includes(alias.toLowerCase().replace(/[_-\s]/g, ''))
    )) {
      return coach;
    }
  }
  
  // Legacy redirects for old coaches
  const legacyMappings: Record<string, string> = {
    'lucy': 'freya',
    'vita': 'freya',
    'sascha': 'ares',
    'kai': 'ares',
    'markus': 'ares',
    'ruhl': 'ares',
    'persona_lucy': 'freya',
    'persona_vita': 'freya',
    'persona_sascha': 'ares',
    'persona_kai': 'ares',
    'persona_ares': 'ares',
    'persona_ruhl': 'ares'
  };
  
  if (legacyMappings[normalized]) {
    return COACH_REGISTRY[legacyMappings[normalized]];
  }
  
  // Fallback to FREYA
  return COACH_REGISTRY.freya;
}

/**
 * Get all available coach IDs
 */
export function getAllCoachIds(): string[] {
  return Object.keys(COACH_REGISTRY);
}

/**
 * Get coach by ID with error handling
 */
export function getCoachById(id: string): CoachMetadata | null {
  return COACH_REGISTRY[id] || null;
}

/**
 * Check if coach ID is valid
 */
export function isValidCoachId(id: string): boolean {
  return id in COACH_REGISTRY;
}