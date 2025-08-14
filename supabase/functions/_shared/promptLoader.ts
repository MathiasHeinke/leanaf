import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PromptConfig {
  coachId: string;
  filePath: string;
  fallback: string;
}

const PROMPT_CONFIGS: Record<string, PromptConfig> = {
  lucy: {
    coachId: 'lucy',
    filePath: 'supabase/functions/_shared/prompts/lucy_holistic.md',
    fallback: 'Du bist Lucy, eine ganzheitliche Ernährungs- und Lifestyle-Coachin mit Fokus auf pflanzenbasierte Ernährung und Nachhaltigkeit.'
  },
  sascha: {
    coachId: 'sascha',
    filePath: 'supabase/functions/_shared/prompts/sascha_evidence.md',
    fallback: 'Du bist Sascha, ein evidenzbasierter Fitness- und Leistungscoach mit Fokus auf wissenschaftlich fundierte Trainingsmethoden.'
  },
  kai: {
    coachId: 'kai',
    filePath: 'supabase/functions/_shared/prompts/kai_recovery.md',
    fallback: 'Du bist Kai, ein Stress- und Recovery-Coach mit Fokus auf mentale Gesundheit und Regeneration.'
  },
  vita: {
    coachId: 'vita',
    filePath: 'supabase/functions/_shared/prompts/vita_female.md',
    fallback: 'Du bist Dr. Vita Femina, eine Spezialistin für weibliche Gesundheit und zyklusbasiertes Training.'
  },
  ares: {
    coachId: 'ares',
    filePath: 'supabase/functions/_shared/prompts/ares_ultimate.md',
    fallback: 'Du bist ARES - die ultimative Coaching-Intelligence für totale Optimierung und maximale Performance.'
  }
};

/**
 * Load coach base prompt from file system or fallback
 */
export async function loadCoachPrompt(coachId: string): Promise<string> {
  const config = PROMPT_CONFIGS[coachId];
  
  if (!config) {
    console.warn(`No prompt config found for coach: ${coachId}`);
    return `Du bist ein ${coachId} Coach. Hilf dem User bei seinen Zielen.`;
  }

  try {
    // Try to read the prompt file
    const promptContent = await Deno.readTextFile(config.filePath);
    console.log(`✅ Loaded prompt for ${coachId} from ${config.filePath}`);
    return promptContent;
  } catch (error) {
    console.warn(`⚠️ Could not load prompt file for ${coachId}: ${error.message}`);
    console.log(`📝 Using fallback prompt for ${coachId}`);
    return config.fallback;
  }
}

/**
 * Enhanced prompt loading with coach-specific personality injection
 */
export async function getEnhancedCoachPrompt(coachId: string, userContext?: any): Promise<string> {
  const basePrompt = await loadCoachPrompt(coachId);
  
  // ARES gets enhanced cross-domain context
  if (coachId === 'ares') {
    const ultimateContext = `
${basePrompt}

**CURRENT SESSION ENHANCEMENT:**
- Du hast Zugriff auf ALLE Tools und Kenntnisse aller Coaches
- Analysiere den User ganzheitlich über alle Domänen hinweg
- Identifiziere Synergien zwischen Training, Ernährung, Recovery und Mindset
- Erstelle aggressive aber umsetzbare Optimierungspläne
- Nutze Meta-Coaching für maximale Effizienz

**USER CONTEXT:** ${JSON.stringify(userContext || {}, null, 2)}

ZEIT FÜR TOTALE DOMINANZ! Analysiere alle verfügbaren Daten und erstelle einen ultimativen Optimierungsplan.`;
    
    return ultimateContext;
  }
  
  return basePrompt;
}

/**
 * Get available coach prompt files
 */
export function getAvailableCoaches(): string[] {
  return Object.keys(PROMPT_CONFIGS);
}

/**
 * Validate coach ID
 */
export function isValidCoachId(coachId: string): boolean {
  return coachId in PROMPT_CONFIGS;
}