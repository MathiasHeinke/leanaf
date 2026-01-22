// ============= ARES Mode Selection System =============
// Phase 2: Simplified 3-mode system (supportive, balanced, direct)

export interface UserMoodContext {
  mood_score?: number;
  energy_level?: number;
  streak?: number;
  no_workout_days?: number;
  missed_tasks?: number;
  recent_binge?: boolean;
  alcohol_intake?: boolean;
}

export type AresMode = 'supportive' | 'balanced' | 'direct';

export interface AresDialResult {
  mode: AresMode;
  reason: string;
  temperature: number;
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
  'müde', 'erschöpft', 'demotiviert', 'traurig', 'frustriert'
];

// Trigger words for direct mode
const DIRECT_TRIGGERS = [
  'push', 'hart', 'motivier', 'kick', 'streng',
  'antreiben', 'fordern', 'challenge'
];

// Core: Decide ARES mode based on user state and message
export function decideAresDial(userState: UserMoodContext, userText?: string): AresDialResult {
  console.log('[ARES-MODE] Evaluating user state:', userState);
  
  // 1. Check message for explicit mood signals
  if (userText) {
    const lowerText = userText.toLowerCase();
    
    // Check for supportive triggers (frustrated, tired, struggling)
    if (SUPPORTIVE_TRIGGERS.some(word => lowerText.includes(word))) {
      console.log('[ARES-MODE] Supportive trigger detected in text');
      return {
        mode: 'supportive',
        reason: 'User braucht Unterstützung (Textanalyse)',
        temperature: MODE_CONFIG.supportive.temp
      };
    }
    
    // Check for direct triggers (wants to be pushed)
    if (DIRECT_TRIGGERS.some(word => lowerText.includes(word))) {
      console.log('[ARES-MODE] Direct trigger detected in text');
      return {
        mode: 'direct',
        reason: 'User will gepusht werden (Textanalyse)',
        temperature: MODE_CONFIG.direct.temp
      };
    }
  }
  
  // 2. Check mood/energy levels
  const mood = userState.mood_score ?? 5;
  const energy = userState.energy_level ?? 5;
  
  // Low mood or energy → supportive
  if (mood <= 3 || energy <= 3) {
    console.log('[ARES-MODE] Low mood/energy detected');
    return {
      mode: 'supportive',
      reason: `Niedrige Stimmung (${mood}) oder Energie (${energy})`,
      temperature: MODE_CONFIG.supportive.temp
    };
  }
  
  // Recent struggles → supportive
  if (userState.recent_binge || userState.alcohol_intake) {
    console.log('[ARES-MODE] Recent struggle detected');
    return {
      mode: 'supportive',
      reason: 'Kürzliche Herausforderung - braucht Verständnis',
      temperature: MODE_CONFIG.supportive.temp
    };
  }
  
  // High mood + good streak → direct (push harder)
  if (mood >= 7 && energy >= 7 && (userState.streak ?? 0) >= 3) {
    console.log('[ARES-MODE] High motivation detected');
    return {
      mode: 'direct',
      reason: `Hohe Motivation (Mood: ${mood}, Streak: ${userState.streak})`,
      temperature: MODE_CONFIG.direct.temp
    };
  }
  
  // No workout but good mood → direct (gentle push)
  if ((userState.no_workout_days ?? 0) >= 3 && mood >= 6) {
    console.log('[ARES-MODE] No workout but good mood - time to push');
    return {
      mode: 'direct',
      reason: `${userState.no_workout_days} Tage ohne Training, gute Stimmung`,
      temperature: MODE_CONFIG.direct.temp
    };
  }
  
  // Default: balanced
  console.log('[ARES-MODE] Using balanced mode');
  return {
    mode: 'balanced',
    reason: 'Standard-Modus',
    temperature: MODE_CONFIG.balanced.temp
  };
}

// Time-based context (simplified - no forced archetypes)
export function getRitualContext(): { timeOfDay: string; greeting?: string } {
  const now = new Date();
  const hours = now.getHours();
  
  if (hours >= 5 && hours < 10) {
    return { timeOfDay: 'morgen', greeting: 'Guten Morgen' };
  } else if (hours >= 10 && hours < 14) {
    return { timeOfDay: 'mittag' };
  } else if (hours >= 14 && hours < 18) {
    return { timeOfDay: 'nachmittag' };
  } else if (hours >= 18 && hours < 22) {
    return { timeOfDay: 'abend', greeting: 'Guten Abend' };
  } else {
    return { timeOfDay: 'nacht' };
  }
}

// Get mode configuration
export function getModeConfig(mode: AresMode) {
  return MODE_CONFIG[mode];
}

// Load user mood context from database
export async function loadUserMoodContext(supabase: any, userId: string): Promise<UserMoodContext> {
  try {
    console.log('[ARES-DIAL] Loading mood context for user:', userId);
    
    // Get recent mood data from journal entries and cycle assessments
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
    
    // Get workout streak and missed days from daily summaries
    const { data: workoutData } = await supabase
      .from('daily_summaries')
      .select('date, workout_volume')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(7);
    
    // Calculate mood and energy averages
    let mood_score: number | undefined;
    let energy_level: number | undefined;
    
    if (journalData?.length) {
      mood_score = journalData.reduce((sum: number, entry: any) => sum + (entry.mood_score || 5), 0) / journalData.length;
      energy_level = journalData.reduce((sum: number, entry: any) => sum + (entry.energy_level || 5), 0) / journalData.length;
    }
    
    if (cycleData?.length && !energy_level) {
      energy_level = cycleData[0].energy_level || 5;
    }
    
    // Calculate workout streak and missed days
    let streak = 0;
    let no_workout_days = 0;
    
    if (workoutData?.length) {
      let consecutiveDays = 0;
      let missedDays = 0;
      
      for (const day of workoutData) {
        if (day.workout_volume > 0) {
          consecutiveDays++;
          missedDays = 0; // Reset missed days on workout
        } else {
          if (consecutiveDays === 0) missedDays++; // Only count recent misses
          break; // Break streak on first miss
        }
      }
      
      streak = consecutiveDays;
      no_workout_days = missedDays;
    }
    
    const context: UserMoodContext = {
      mood_score,
      energy_level,
      streak,
      no_workout_days,
      missed_tasks: 0, // Could be calculated from task completion data
      recent_binge: false, // Could be detected from meal data
      alcohol_intake: false // Could be detected from nutrition data
    };
    
    console.log('[ARES-DIAL] Mood context loaded:', context);
    return context;
  } catch (error) {
    console.error('[ARES-DIAL] Error loading mood context:', error);
    return {};
  }
}