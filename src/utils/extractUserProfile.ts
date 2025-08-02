import { UserProfile, UserProfileSchema } from '@/schemas/user-profile';

interface ChatMessage {
  role: string;
  content: string;
}

/** Regex-Snippets zentral sammeln */
const REG = {
  years: /\bseit\s+(\d{1,2})\s+jah?re?n?\b/i,
  yearsVariant: /(\d{1,2})\s+jahre?\s+(training|trainiert|trainiere)/i,
  minutes: /(\d{1,3})\s*(min(uten)?|h(ours?)?|stunden?)/i,
  timeConstraint: /(nur|maximal|höchstens)\s+(\d{1,3})\s*(min|stunden?)/i,
  sessions: /(\d)\s*(tage|mal|x)\s*(pro|\/)\s*woche/i,
  sessionsVariant: /(\d)\s*x\s*(die|pro)\s*woche/i,
  injuries: /(rücken|knie|schulter|ellbogen|hüfte|handgelenk)/gi,
  injuryContext: /(probleme|schmerzen|verletzung|verletzt)\s*(mit|am|im)?\s*(rücken|knie|schulter|ellbogen|hüfte)/gi,
  pump: /\b(pump|pumpen|brennen|feel)\b/i,
  strength: /\b(heavy|kraft|stärke|1rm|powerlifting|stark|maximal)/i,
  cardio: /\b(cardio|laufen|ausdauer|hiit|kondition)/i,
  periodization: /\b(periodisierung|wissenschaftlich|evidenz|studien|progressive|overload)/i,
  hypertrophy: /\b(masse|muskeln|hypertrophie|größer|breiter|volumen)/i,
  beginner: /\b(anfänger|neu|erste?\s*mal|beginn)/i,
  advanced: /\b(fortgeschritten|erfahren|lange|profi|wettkampf)/i,
};

export function extractUserProfile(history: ChatMessage[]): Partial<UserProfile> {
  const text = history.map(m => m.content).join(' ').toLowerCase();
  
  const profile: Partial<UserProfile> = {};

  // 1. Experience Years - multiple patterns
  let yearsMatch = text.match(REG.years);
  if (!yearsMatch) yearsMatch = text.match(REG.yearsVariant);
  if (yearsMatch) {
    const years = Number(yearsMatch[1]);
    if (years >= 0 && years <= 60) profile.experienceYears = years;
  }

  // 2. Time per Session - check for constraints
  let timeMatch = text.match(REG.timeConstraint);
  if (!timeMatch) timeMatch = text.match(REG.minutes);
  if (timeMatch) {
    const value = Number(timeMatch[2] || timeMatch[1]);
    const unit = timeMatch[3] || timeMatch[2];
    const minutes = /h|stunden/.test(unit) ? value * 60 : value;
    if (minutes >= 15 && minutes <= 180) profile.availableMinutes = minutes;
  }

  // 3. Weekly Sessions - multiple patterns
  let sessMatch = text.match(REG.sessions);
  if (!sessMatch) sessMatch = text.match(REG.sessionsVariant);
  if (sessMatch) {
    const sessions = Number(sessMatch[1]);
    if (sessions >= 1 && sessions <= 14) profile.weeklySessions = sessions;
  }

  // 4. Injuries - comprehensive detection
  const injuries: string[] = [];
  
  // Direct injury mentions
  let match;
  const injuryRegex = new RegExp(REG.injuries.source, 'gi');
  while ((match = injuryRegex.exec(text)) !== null) {
    const injury = match[1].toLowerCase();
    // Map to enum values
    const mappedInjury = mapToInjuryEnum(injury);
    if (mappedInjury) injuries.push(mappedInjury);
  }
  
  // Context-based injury detection
  const contextRegex = new RegExp(REG.injuryContext.source, 'gi');
  while ((match = contextRegex.exec(text)) !== null) {
    const bodyPart = match[3]?.toLowerCase();
    if (bodyPart) {
      const mappedInjury = mapToInjuryEnum(bodyPart);
      if (mappedInjury) injuries.push(mappedInjury);
    }
  }
  
  if (injuries.length > 0) {
    profile.injuries = Array.from(new Set(injuries)) as Array<"ruecken" | "knie" | "schulter" | "ellbogen" | "huefte" | "sonstige">;
  }

  // 5. Goal Detection
  if (REG.hypertrophy.test(text)) profile.goal = 'hypertrophy';
  else if (REG.strength.test(text)) profile.goal = 'strength';
  else if (REG.cardio.test(text)) profile.goal = 'endurance';

  // 6. Preferences
  profile.preferences = {};
  
  if (REG.cardio.test(text)) profile.preferences.cardio = true;
  if (REG.pump.test(text)) profile.preferences.pumpStyle = true;
  if (REG.strength.test(text)) profile.preferences.strengthFocus = true;
  if (REG.periodization.test(text)) profile.preferences.periodization = true;

  // Remove empty preferences
  if (Object.keys(profile.preferences).length === 0) {
    delete profile.preferences;
  }

  return profile;
}

function mapToInjuryEnum(injury: string): string | null {
  const mapping: Record<string, string> = {
    'rücken': 'ruecken',
    'knie': 'knie', 
    'schulter': 'schulter',
    'ellbogen': 'ellbogen',
    'hüfte': 'huefte',
    'handgelenk': 'sonstige'
  };
  
  return mapping[injury] || null;
}

// Enhanced extraction with conversation context
export function extractUserProfileEnhanced(
  history: ChatMessage[], 
  existingProfile?: Partial<UserProfile>
): Partial<UserProfile> {
  const newProfile = extractUserProfile(history);
  
  // Merge with existing profile (new data takes precedence)
  const mergedProfile = { ...existingProfile, ...newProfile };
  
  // Validate the merged profile
  const validationResult = UserProfileSchema.partial().safeParse(mergedProfile);
  
  if (!validationResult.success) {
    console.warn('⚠️ Profile validation failed, using basic extraction only:', validationResult.error);
    return newProfile;
  }
  
  return mergedProfile;
}

// Helper function for debugging
export function getExtractionDebugInfo(history: ChatMessage[]): {
  profile: Partial<UserProfile>;
  matches: Record<string, string[]>;
} {
  const text = history.map(m => m.content).join(' ').toLowerCase();
  const profile = extractUserProfile(history);
  
  const matches: Record<string, string[]> = {};
  
  // Track what was matched for debugging
  Object.entries(REG).forEach(([key, regex]) => {
    const found = text.match(new RegExp(regex.source, 'gi'));
    if (found) matches[key] = found;
  });
  
  return { profile, matches };
}