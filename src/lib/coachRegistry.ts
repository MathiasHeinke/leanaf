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
  lucy: {
    id: 'lucy',
    name: 'Lucy',
    displayName: 'Dr. Lucy Martinez',
    personality: 'empathisch, motivierend, lernorientiert, achtsam, vegan-freundlich',
    role: 'Nutrition, Metabolism & Lifestyle Coach',
    prompt_template_id: 'persona_lucy',
    memory_id: 'lucy_md',
    avatar: '❤️',
    imageUrl: '/coach-images/fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png',
    color: 'green',
    accentColor: 'from-green-500 to-green-600',
    isFree: true,
    expertise: ['Chrononutrition', 'Supplements', 'Cycle-Aware Coaching', 'Mindfulness'],
    access: {
      tools: ['mealplan', 'fat_analysis', 'supplement_advice'],
      datasets: ['meal_history', 'supplement_stack', 'cycle_data'],
      rag: ['rag_nutrition', 'rag_general', 'rag_mindfulness']
    },
    aliases: ['lucy', 'dr lucy', 'dr. lucy', 'dr lucy martinez', 'dr. lucy martinez', 'nutrition coach']
  },
  
  ares: {
    id: 'ares',
    name: 'ARES',
    displayName: 'ARES - Ultimate Male Coach',
    personality: 'intensiv, stoisch, transformativ - vereint Saschas Disziplin mit Kais Ganzheitlichkeit',
    role: 'Ultimate Male Performance Intelligence',
    prompt_template_id: 'ares_ultimate',
    memory_id: 'ares_md',
    avatar: '⚡',
    imageUrl: '/lovable-uploads/90efce37-f808-4894-8ea5-1093f3587aa4.png',
    color: 'red',
    accentColor: 'from-red-500 to-red-600',
    isFree: true,
    expertise: [
      'Ultimate Performance', 'Krafttraining & Progression', 'Mindset & Recovery', 
      'Cross-Domain Mastery', 'Total Male Optimization'
    ],
    access: {
      tools: [
        // ARES Super-Tools
        'aresMetaCoach', 'aresTotalAssessment', 'aresUltimateWorkoutPlan', 'aresSuperNutrition',
        'heavyTrainingPlan', 'massBuildingCalculator', 'mentalToughnessCoach',
        // Sascha's consolidated tools
        'trainingsplan', 'createPlanDraft', 'savePlanDraft', 'uebung', 'gewicht',
        // Kai's consolidated tools  
        'diary', 'goalCheckin', 'supplement', 'mealCapture'
      ],
      datasets: [
        'total_user_profile', 'cross_coach_insights', 'meta_coaching_data',
        'training_history', 'performance_data', 'strength_logs', 
        'sleep_data', 'hrv_data', 'mindset_progress', 'hormone_levels'
      ],
      rag: [
        'rag_total_coaching', 'rag_ares_meta', 'rag_user_journey',
        'rag_training', 'rag_periodization', 'rag_biomechanics',
        'rag_psychology', 'rag_recovery', 'rag_transformation', 'rag_male_health'
      ]
    },
    aliases: [
      'ares', 'ultimate coach', 'total coach', 'meta coach', 'super coach', 'dominator',
      // Sascha legacy aliases - CONSOLIDATED INTO ARES
      'sascha', 'sascha weber', 'performance coach', 'training coach', 'ex-feldwebel',
      // Kai legacy aliases - CONSOLIDATED INTO ARES  
      'kai', 'dr kai', 'kai nakamura', 'mindset coach', 'recovery coach', 'transformation coach',
      // Original ARES aliases
      'markus', 'markus rühl', 'markus ruhl', 'rühl', 'ruhl', 'german beast', 'bodybuilding coach'
    ]
  },
  
  vita: {
    id: 'vita',
    name: 'Dr. Vita',
    displayName: 'Dr. Vita Femina',
    personality: 'wissenschaftlich, empathisch, frauen-fokussiert, hormon-bewusst',
    role: 'Female Health & Hormone Coach',
    prompt_template_id: 'persona_vita',
    memory_id: 'vita_md',
    avatar: '🌺',
    imageUrl: '/lovable-uploads/ad7fe6b6-c176-49df-b275-84345a40c5f5.png',
    color: 'purple',
    accentColor: 'from-purple-500 to-purple-600',
    isPremium: true,
    expertise: ['Zyklusorientiertes Training', 'Hormonbalance', 'Frauen-Gesundheit', 'Lebensphasen-Coaching'],
    access: {
      tools: ['cycleAssessment', 'hormoneTracker', 'femalePeriodization', 'menopauseNavigator'],
      datasets: ['cycle_data', 'hormone_levels', 'female_health_metrics'],
      rag: ['rag_female_health', 'rag_hormones', 'rag_cycle_training']
    },
    aliases: ['vita', 'dr vita', 'dr. vita', 'vita femina', 'dr vita femina', 'female health coach', 'hormone coach', 'women coach']
  }
};

/**
 * Resolves coach ID using fuzzy matching
 * @param inputId Raw coach ID from request
 * @returns Resolved coach metadata or fallback to Lucy
 */
export function resolveCoach(inputId: string): CoachMetadata {
  if (!inputId) {
    return COACH_REGISTRY.lucy; // Default fallback
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
  
  // Legacy ID mappings for backwards compatibility - ALL CONSOLIDATED TO ARES
  const legacyMappings: Record<string, string> = {
    'persona_ruhl': 'ares',
    'persona_ares': 'ares', 
    'markus': 'ares',
    // SASCHA → ARES CONSOLIDATION
    'persona_sascha': 'ares',
    'sascha': 'ares',
    // KAI → ARES CONSOLIDATION  
    'persona_kai': 'ares',
    'kai': 'ares',
    // LUCY & VITA unchanged
    'persona_lucy': 'lucy',
    'dr-vita': 'vita',
    'drvita': 'vita'
  };
  
  if (legacyMappings[normalized]) {
    return COACH_REGISTRY[legacyMappings[normalized]];
  }
  
  // Fallback to Lucy for unknown coaches
  console.warn(`Coach "${inputId}" not found, falling back to Lucy`);
  return COACH_REGISTRY.lucy;
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