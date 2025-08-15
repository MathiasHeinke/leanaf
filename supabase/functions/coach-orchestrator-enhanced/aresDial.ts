// ============= ARES Dial Selection System =============
// Phase 1: Core function implementing JSON trigger rules

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

export interface AresDialResult {
  dial: number;
  archetype: string;
  reason: string;
  ritual?: {
    type: 'muster' | 'grind' | 'hearth';
    prompt_key: string;
  };
}

// JSON Trigger Rules (from your specification)
const DIAL_RULES = {
  "dial_selection": {
    "default": 2,
    "rules": [
      {
        "condition": {
          "mood_score": { "lte": 3 },
          "energy_level": { "lte": 4 }
        },
        "set_dial": 3,
        "archetype": "father",
        "reason": "User hat niedrige Stimmung & Energie – beruhigend, erdend"
      },
      {
        "condition": {
          "mood_score": { "lte": 5 },
          "streak": { "gte": 3 }
        },
        "set_dial": 1,
        "archetype": "comrade",
        "reason": "User leicht niedergeschlagen, aber konstant – motivierend"
      },
      {
        "condition": {
          "no_workout_days": { "gte": 3 },
          "mood_score": { "gte": 6 }
        },
        "set_dial": 4,
        "archetype": "commander",
        "reason": "Kein Training trotz guter Stimmung – klarer Rahmen"
      },
      {
        "condition": {
          "missed_tasks": { "gte": 2 },
          "last_dial": { "in": [2, 3, 4] }
        },
        "set_dial": 5,
        "archetype": "drill",
        "reason": "Wiederholte Verfehlungen trotz Support – Eskalation"
      },
      {
        "condition": {
          "recent_binge": true,
          "alcohol_intake": true
        },
        "set_dial": 3,
        "archetype": "father",
        "reason": "Schutzmodus nach Eskalation – Contain & Compress"
      }
    ]
  },
  "ritual_schedule": {
    "muster": {
      "trigger_time": "06:00-09:00",
      "archetype": "smith",
      "dial": 2,
      "prompt_key": "morning_ritual"
    },
    "grind": {
      "trigger_time": "11:30-14:00",
      "archetype": "comrade",
      "dial": 1,
      "prompt_key": "midday_check"
    },
    "hearth": {
      "trigger_time": "20:30-23:00",
      "archetype": "hearthkeeper",
      "dial": 3,
      "prompt_key": "evening_review"
    }
  },
  "fallback_modes": {
    "trigger_words": ["überfordert", "schwach", "aufgeben", "allein", "versagt"],
    "emergency_response": {
      "dial": 3,
      "archetype": "father",
      "playbook": "contain_compress_commit"
    }
  },
  "celebration_triggers": {
    "streaks": [7, 14, 21, 30],
    "milestones": {
      "weight_loss": [-5, -10],
      "lean_mass_gain": [5],
      "protocol_week_success": 0.9
    },
    "response": {
      "dial": 3,
      "archetype": "father",
      "voice_line": "Ich bin stolz auf dich. Nicht wegen des Ergebnisses – wegen deiner Haltung."
    }
  }
};

// Helper: Check if condition matches user state
function evaluateCondition(condition: any, userState: UserMoodContext): boolean {
  for (const [key, constraint] of Object.entries(condition)) {
    const userValue = userState[key as keyof UserMoodContext];
    
    if (typeof constraint === 'object' && constraint !== null) {
      if ('lte' in constraint && (userValue === undefined || userValue > constraint.lte)) return false;
      if ('gte' in constraint && (userValue === undefined || userValue < constraint.gte)) return false;
      if ('in' in constraint && (userValue === undefined || !constraint.in.includes(userValue))) return false;
    } else if (typeof constraint === 'boolean') {
      if (userValue !== constraint) return false;
    }
  }
  return true;
}

// Core: Decide ARES dial based on user state
export function decideAresDial(userState: UserMoodContext, userText?: string): AresDialResult {
  console.log('[ARES-DIAL] Evaluating user state:', userState);
  
  // Check for emergency fallback triggers first
  if (userText) {
    const lowerText = userText.toLowerCase();
    const triggerWords = DIAL_RULES.fallback_modes.trigger_words;
    const hasEmergencyWord = triggerWords.some(word => lowerText.includes(word));
    
    if (hasEmergencyWord) {
      console.log('[ARES-DIAL] Emergency trigger detected');
      return {
        dial: DIAL_RULES.fallback_modes.emergency_response.dial,
        archetype: DIAL_RULES.fallback_modes.emergency_response.archetype,
        reason: "Emergency fallback triggered"
      };
    }
  }
  
  // Check celebration triggers
  if (userState.streak) {
    const celebrationStreaks = DIAL_RULES.celebration_triggers.streaks;
    if (celebrationStreaks.includes(userState.streak)) {
      console.log('[ARES-DIAL] Celebration trigger for streak:', userState.streak);
      return {
        dial: DIAL_RULES.celebration_triggers.response.dial,
        archetype: DIAL_RULES.celebration_triggers.response.archetype,
        reason: `Celebrating ${userState.streak}-day streak`
      };
    }
  }
  
  // Evaluate dial selection rules
  for (const rule of DIAL_RULES.dial_selection.rules) {
    if (evaluateCondition(rule.condition, userState)) {
      console.log('[ARES-DIAL] Rule matched:', rule.reason);
      return {
        dial: rule.set_dial,
        archetype: rule.archetype,
        reason: rule.reason
      };
    }
  }
  
  // Default dial
  console.log('[ARES-DIAL] Using default dial');
  return {
    dial: DIAL_RULES.dial_selection.default,
    archetype: "smith",
    reason: "Default archetype - steady progress focus"
  };
}

// Time-based ritual detection
export function getRitualContext(): AresDialResult | null {
  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 5); // HH:MM format
  const [hours, minutes] = timeStr.split(':').map(Number);
  const currentMinutes = hours * 60 + minutes;
  
  // Check each ritual time window
  for (const [ritualType, config] of Object.entries(DIAL_RULES.ritual_schedule)) {
    const [startTime, endTime] = config.trigger_time.split('-');
    const [startHours, startMins] = startTime.split(':').map(Number);
    const [endHours, endMins] = endTime.split(':').map(Number);
    
    const startMinutes = startHours * 60 + startMins;
    const endMinutes = endHours * 60 + endMins;
    
    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      console.log(`[ARES-DIAL] Ritual time detected: ${ritualType}`);
      return {
        dial: config.dial,
        archetype: config.archetype,
        reason: `Ritual time: ${ritualType}`,
        ritual: {
          type: ritualType as 'muster' | 'grind' | 'hearth',
          prompt_key: config.prompt_key
        }
      };
    }
  }
  
  return null;
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