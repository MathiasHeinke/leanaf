import { z } from 'zod';

export const InjuryEnum = z.enum([
  'ruecken', 'knie', 'schulter', 'ellbogen', 'huefte', 'sonstige',
]);

export const UserProfileSchema = z.object({
  /** User ID from Supabase */
  userId: z.string(),
  experienceYears: z.number().min(0).max(60).optional(),      // "trainiere seit 5 Jahren"
  availableMinutes: z.number().min(15).max(180).optional(),   // "habe nur 45 Minuten"
  weeklySessions: z.number().min(1).max(14).optional(),       // "mache 4 Tage die Woche"
  injuries: z.array(InjuryEnum).optional(),
  preferences: z.object({
    cardio: z.boolean().optional(),
    pumpStyle: z.boolean().optional(),          // "liebe den Pump"
    strengthFocus: z.boolean().optional(),
    periodization: z.boolean().optional(),      // "mag wissenschaftliche Periodisierung"
  }).partial(),
  goal: z.enum(['hypertrophy', 'strength', 'endurance', 'general']).optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// Legacy interface for backward compatibility
export interface LegacyUserProfile {
  goal?: string;
  experience?: string;
  experienceYears?: number;
  timePerSessionMin?: number;
  injury?: boolean;
  likesPump?: boolean;
  likesPeriodization?: boolean;
}

// Conversion function from new to legacy format
export function toLegacyProfile(profile: Partial<UserProfile>): LegacyUserProfile {
  return {
    goal: profile.goal,
    experienceYears: profile.experienceYears,
    timePerSessionMin: profile.availableMinutes,
    injury: profile.injuries && profile.injuries.length > 0,
    likesPump: profile.preferences?.pumpStyle,
    likesPeriodization: profile.preferences?.periodization,
    experience: profile.experienceYears 
      ? (profile.experienceYears >= 3 ? 'advanced' : profile.experienceYears >= 1 ? 'intermediate' : 'beginner')
      : undefined
  };
}