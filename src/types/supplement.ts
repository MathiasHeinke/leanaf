// Supplement-related TypeScript types for type safety and consistency

export type TimingValue = 
  | 'morning'
  | 'noon' 
  | 'evening'
  | 'pre_workout'
  | 'post_workout'
  | 'before_bed'
  | 'with_meals';

export interface TimingOption {
  value: TimingValue;
  label: string;
  icon: string;
  tip: string;
}

export interface SupplementTiming {
  timing: TimingValue[];
}

// Validation function for timing values
export function isValidTiming(timing: string): timing is TimingValue {
  const validTimings: TimingValue[] = [
    'morning',
    'noon',
    'evening', 
    'pre_workout',
    'post_workout',
    'before_bed',
    'with_meals'
  ];
  return validTimings.includes(timing as TimingValue);
}

// Helper for database constraints
export const VALID_TIMING_VALUES = [
  'morning',
  'noon',
  'evening',
  'pre_workout', 
  'post_workout',
  'before_bed',
  'with_meals'
] as const;

export type ValidTimingValue = typeof VALID_TIMING_VALUES[number];