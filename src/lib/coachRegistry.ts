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
  
  sascha: {
    id: 'sascha',
    name: 'Sascha',
    displayName: 'Sascha Weber',
    personality: 'stoisch, direkt, kameradschaftlich, pflichtbewusst, analytisch',
    role: 'Performance & Training Coach',
    prompt_template_id: 'persona_sascha',
    memory_id: 'sascha_md',
    avatar: '🎯',
    imageUrl: '/coach-images/9e4f4475-6b1f-4563-806d-89f78ba853e6.png',
    color: 'blue',
    accentColor: 'from-blue-500 to-blue-600',
    isPremium: true,
    expertise: ['Periodisierung', 'Progressive Overload', 'Biomechanik-Optimierung'],
    access: {
      tools: ['trainingsplan', 'progression_analysis', 'biomechanics'],
      datasets: ['training_history', 'performance_data', 'strength_logs'],
      rag: ['rag_training', 'rag_periodization', 'rag_biomechanics']
    },
    aliases: ['sascha', 'sascha weber', 'performance coach', 'training coach', 'ex-feldwebel']
  },
  
  kai: {
    id: 'kai',
    name: 'Kai',
    displayName: 'Dr. Kai Nakamura',
    personality: 'achtsam, strategisch, wissenschaftlich, ganzheitlich',
    role: 'Mindset, Recovery & Transformation Coach',
    prompt_template_id: 'persona_kai',
    memory_id: 'kai_md',
    avatar: '💪',
    imageUrl: '/coach-images/2c06031d-707a-400d-aaa0-a46decdddfe2.png',
    color: 'purple',
    accentColor: 'from-purple-500 to-purple-600',
    isPremium: true,
    expertise: ['Neuroplastizität', 'HRV-Training', 'Schlafoptimierung', 'Vier-Quadranten-Analyse', 'Conscious Coaching', 'Bewusstseins-Erweiterung', 'Glaubenssatz-Transformation', 'Transformational Breakthrough'],
    access: {
      tools: ['mindset_coaching', 'hrv_analysis', 'sleep_optimization', 'transformation_plan', 'conscious_assessment', 'values_alignment_check', 'belief_system_analysis', 'breakthrough_planning'],
      datasets: ['sleep_data', 'hrv_data', 'stress_levels', 'mindset_progress'],
      rag: ['rag_psychology', 'rag_recovery', 'rag_mindset', 'rag_transformation']
    },
    aliases: ['kai', 'dr kai', 'dr. kai', 'kai nakamura', 'mindset coach', 'recovery coach', 'transformation coach', 'conscious coach', 'breakthrough coach', 'bewusstseins coach']
  },
  
  markus: {
    id: 'markus',
    name: 'Markus',
    displayName: 'Markus Rühl',
    personality: 'direkt, brachial, trocken-humorvoll, ehrlich',
    role: 'The German Beast - Hardcore Bodybuilding',
    prompt_template_id: 'persona_ruhl',
    memory_id: 'markus_md',
    avatar: '🏆',
    imageUrl: '/lovable-uploads/90efce37-f808-4894-8ea5-1093f3587aa4.png',
    color: 'red',
    accentColor: 'from-red-500 to-red-600',
    isPremium: true,
    expertise: ['Heavy+Volume Training', 'Extreme Hypertrophie', 'Mentale Härte', 'Masseaufbau'],
    access: {
      tools: ['heavy_training_plan', 'mass_building', 'mental_toughness'],
      datasets: ['strength_data', 'mass_progress', 'heavy_lifts'],
      rag: ['rag_bodybuilding', 'rag_heavy_training', 'rag_mass_building']
    },
    aliases: ['markus', 'markus rühl', 'markus ruhl', 'rühl', 'ruhl', 'german beast', 'bodybuilding coach', 'massa']
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
      tools: ['cycle_training', 'hormone_analysis', 'female_nutrition', 'menopause_support'],
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
  
  // Legacy ID mappings for backwards compatibility
  const legacyMappings: Record<string, string> = {
    'persona_ruhl': 'markus',
    'persona_sascha': 'sascha', 
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