// ARES-Only Coach Registry - Single unified coach for all backend functions
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

// ARES is the single unified coach - all legacy coaches consolidated
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
      'Supplements & Stacks',
      'Peptide & GLP-1',
      'Blutbild-Interpretation'
    ],
    access: {
      tools: ['aresMetaCoach', 'aresTotalAssessment', 'ultimateOptimization', 'crossDomainAnalysis', 
              'nutritionAnalysis', 'trainingPlanning', 'peptideProtocols', 'hormonePlanning', 
              'recoveryOptimization', 'bloodworkAnalysis', 'memoryExtraction'],
      datasets: ['all_knowledge', 'performance_research', 'optimization_protocols', 'nutrition_database', 
                 'supplement_database', 'peptide_database', 'hormone_research', 'longevity_protocols',
                 'bloodwork_references', 'female_health'],
      rag: ['search_ares_ultimate_knowledge', 'search_all_coaches', 'search_peptide_knowledge']
    },
    // No legacy aliases - clean ARES-only system
    aliases: ['ares']
  }
};

/**
 * Resolves any coach ID to ARES (single coach system)
 * All legacy coach IDs (lucy, sascha, kai, vita, freya) now resolve to ARES
 */
export function resolveCoach(_inputId?: string): CoachMetadata {
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
