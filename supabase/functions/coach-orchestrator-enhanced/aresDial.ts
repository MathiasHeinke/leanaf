// ============= ARES Dial Selection System - Phase 2 Simplified =============
// Vereinfachtes 3-Modi System: supportive, balanced, direct

export interface UserMoodContext {
  mood_score?: number;
  energy_level?: number;
  streak?: number;
  no_workout_days?: number;
  missed_tasks?: number;
  last_dial?: number;
  recent_binge?: boolean;
  alcohol_intake?: boolean;
}

// Simplified result type
export type AresMode = 'supportive' | 'balanced' | 'direct';

export interface AresDialResult {
  dial: number;  // For backwards compatibility: 1=supportive, 2=balanced, 3=direct
  mode: AresMode;
  archetype: string;  // Legacy field
  reason: string;
  temperature: number;
  ritual?: {
    type: 'muster' | 'grind' | 'hearth';
    prompt_key: string;
  };
}

// Mode configuration - simple and clear
const MODE_CONFIG: Record<AresMode, { temp: number; description: string }> = {
  supportive: {
    temp: 0.7,
    description: 'Sanft, verständnisvoll, ermutigend'
  },
  balanced: {
    temp: 0.8,
    description: 'Normal, freundlich, ausgewogen'
  },
  direct: {
    temp: 0.85,
    description: 'Direkt, pushend, fordernd'
  }
};

// Trigger words for supportive mode
const SUPPORTIVE_TRIGGERS = [
  'überfordert', 'schwach', 'aufgeben', 'allein', 'versagt',
  'schaffe es nicht', 'zu viel', 'müde', 'erschöpft', 'traurig',
  'frustriert', 'demotiviert', 'hilfe', 'keine kraft'
];

// Trigger words for direct mode
const DIRECT_TRIGGERS = [
  'los gehts', 'bin bereit', 'push me', 'gib mir alles',
  'keine ausreden', 'vollgas', 'härter', 'mehr intensität',
  'kick ass', 'let\'s go', 'motiviert', 'ready'
];

// Celebration triggers for mode adjustment
const CELEBRATION_STREAKS = [7, 14, 21, 30];

/**
 * Core function: Detect mode based on user text and context
 */
export function detectMode(userText: string, userState: UserMoodContext): AresMode {
  const lowerText = userText.toLowerCase();
  
  // Check for supportive triggers first (user struggling)
  const hasSupportiveTrigger = SUPPORTIVE_TRIGGERS.some(word => lowerText.includes(word));
  if (hasSupportiveTrigger) {
    console.log('[ARES-MODE] Supportive trigger detected in text');
    return 'supportive';
  }
  
  // Check for direct triggers (user motivated)
  const hasDirectTrigger = DIRECT_TRIGGERS.some(word => lowerText.includes(word));
  if (hasDirectTrigger) {
    console.log('[ARES-MODE] Direct trigger detected in text');
    return 'direct';
  }
  
  // Context-based detection
  if (userState.mood_score !== undefined && userState.mood_score <= 4) {
    console.log('[ARES-MODE] Low mood detected, going supportive');
    return 'supportive';
  }
  
  if (userState.energy_level !== undefined && userState.energy_level <= 3) {
    console.log('[ARES-MODE] Low energy detected, going supportive');
    return 'supportive';
  }
  
  // Direct if no workout for 3+ days but good mood
  if (userState.no_workout_days && userState.no_workout_days >= 3 && 
      (userState.mood_score === undefined || userState.mood_score >= 6)) {
    console.log('[ARES-MODE] No workout + good mood, going direct');
    return 'direct';
  }
  
  // Default: balanced
  return 'balanced';
}

/**
 * Main function: Decide ARES dial based on user state and text
 */
export function decideAresDial(userState: UserMoodContext, userText?: string): AresDialResult {
  console.log('[ARES-DIAL] Evaluating user state:', userState);
  
  const mode = userText ? detectMode(userText, userState) : 'balanced';
  const config = MODE_CONFIG[mode];
  
  // Map mode to legacy dial number for backwards compatibility
  const dialNumber = mode === 'supportive' ? 1 : mode === 'balanced' ? 2 : 3;
  
  // Check for celebration
  let reason = `Mode: ${mode}`;
  if (userState.streak && CELEBRATION_STREAKS.includes(userState.streak)) {
    reason = `${userState.streak}-day streak! 🔥 ${reason}`;
    console.log(`[ARES-DIAL] Celebrating ${userState.streak}-day streak`);
  }
  
  console.log(`[ARES-DIAL] Selected mode: ${mode} (dial ${dialNumber}), temp: ${config.temp}`);
  
  return {
    dial: dialNumber,
    mode: mode,
    archetype: mode,  // Legacy field, just use mode name
    reason: reason,
    temperature: config.temp
  };
}

/**
 * Time-based ritual detection (unchanged from Phase 1)
 */
export function getRitualContext(): AresDialResult | null {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  
  const rituals: { name: string; start: number; end: number; mode: AresMode; prompt: string }[] = [
    { name: 'muster', start: 6*60, end: 9*60, mode: 'balanced', prompt: 'morning_ritual' },
    { name: 'grind', start: 11*60+30, end: 14*60, mode: 'balanced', prompt: 'midday_check' },
    { name: 'hearth', start: 20*60+30, end: 23*60, mode: 'supportive', prompt: 'evening_review' }
  ];
  
  for (const ritual of rituals) {
    if (currentMinutes >= ritual.start && currentMinutes <= ritual.end) {
      console.log(`[ARES-DIAL] Ritual time detected: ${ritual.name}`);
      const config = MODE_CONFIG[ritual.mode];
      return {
        dial: ritual.mode === 'supportive' ? 1 : ritual.mode === 'balanced' ? 2 : 3,
        mode: ritual.mode,
        archetype: ritual.mode,
        reason: `Ritual: ${ritual.name}`,
        temperature: config.temp,
        ritual: {
          type: ritual.name as 'muster' | 'grind' | 'hearth',
          prompt_key: ritual.prompt
        }
      };
    }
  }
  
  return null;
}

/**
 * Load user mood context from database
 */
export async function loadUserMoodContext(supabase: any, userId: string): Promise<UserMoodContext> {
  try {
    console.log('[ARES-DIAL] Loading mood context for user:', userId);
    
    // Get recent mood data
    const { data: journalData } = await supabase
      .from('journal_entries')
      .select('mood_score, energy_level, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);
    
    const { data: cycleData } = await supabase
      .from('cycle_assessments')
      .select('energy_level, mood_assessment, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    // Get workout streak and missed days
    const { data: workoutData } = await supabase
      .from('daily_summaries')
      .select('date, workout_volume')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(7);
    
    // Calculate averages
    const avgMood = journalData?.length > 0
      ? journalData.reduce((sum: number, j: any) => sum + (j.mood_score || 5), 0) / journalData.length
      : undefined;
    
    const avgEnergy = journalData?.length > 0
      ? journalData.reduce((sum: number, j: any) => sum + (j.energy_level || 5), 0) / journalData.length
      : cycleData?.[0]?.energy_level;
    
    // Calculate streak and no workout days
    let streak = 0;
    let noWorkoutDays = 0;
    
    if (workoutData?.length > 0) {
      for (const day of workoutData) {
        if (day.workout_volume > 0) {
          streak++;
        } else {
          noWorkoutDays++;
          break;
        }
      }
    }
    
    return {
      mood_score: avgMood ? Math.round(avgMood) : undefined,
      energy_level: avgEnergy ? Math.round(avgEnergy) : undefined,
      streak: streak,
      no_workout_days: noWorkoutDays,
      missed_tasks: 0
    };
  } catch (error) {
    console.error('[ARES-DIAL] Error loading mood context:', error);
    return {};
  }
}

/**
 * Get mode description for prompt
 */
export function getModeDescription(mode: AresMode): string {
  return MODE_CONFIG[mode].description;
}
