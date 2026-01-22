// ARES-Only Coach Registry - Single unified coach system
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

// ARES is the single unified coach combining all expertise domains
export const COACH_REGISTRY: Record<string, CoachMetadata> = {
  ares: {
    id: 'ares',
    name: 'ARES',
    displayName: 'ARES',
    personality: 'Ultimate Performance Coach - Cross-domain mastery, meta-intelligence, supremely effective',
    role: 'Ultimate Performance & Transformation Coach',
    prompt_template_id: 'persona_ares',
    memory_id: 'ares_memory_v1',
    avatar: '⚡',
    imageUrl: '/lovable-uploads/1b6ddc34-604a-4356-a46f-07208c77c35f.png',
    color: 'hsl(0, 80%, 60%)',
    accentColor: 'hsl(20, 70%, 65%)',
    isPremium: false,
    isFree: true,
    expertise: [
      'Ernährung & Makros',
      'Training & Periodisierung',
      'Mindset & Motivation',
      'Recovery & Regeneration',
      'Hormone & Zyklus',
      'Biohacking & Optimierung',
      'Supplements & Stacks'
    ],
    access: {
      tools: ['aresMetaCoach', 'aresTotalAssessment', 'ultimateOptimization', 'crossDomainAnalysis', 'nutritionAnalysis', 'trainingPlanning'],
      datasets: ['all_knowledge', 'performance_research', 'optimization_protocols', 'nutrition_database', 'supplement_database'],
      rag: ['search_ares_ultimate_knowledge']
    },
    aliases: ['ares', 'ultimate', 'performance', 'meta', 'optimization', 'sascha', 'kai', 'lucy', 'freya', 'vita', 'markus', 'ruhl']
  }
};

/**
 * Resolves any coach ID to ARES (single coach system)
 * @param inputId Raw coach ID from request (ignored, always returns ARES)
 * @returns ARES coach metadata
 */
export function resolveCoach(_inputId?: string): CoachMetadata {
  // ARES-Only: Always return ARES regardless of input
  return COACH_REGISTRY.ares;
}

/**
 * Get all available coach IDs (only ARES)
 */
export function getAllCoachIds(): string[] {
  return ['ares'];
}

/**
 * Get coach by ID (always returns ARES)
 */
export function getCoachById(_id?: string): CoachMetadata {
  return COACH_REGISTRY.ares;
}

/**
 * Check if coach ID is valid (always true for single coach)
 */
export function isValidCoachId(_id?: string): boolean {
  return true;
}

/**
 * Get the default coach (ARES)
 */
export function getDefaultCoach(): CoachMetadata {
  return COACH_REGISTRY.ares;
}
