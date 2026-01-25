/**
 * Mood Module - Central export point
 * 
 * Das Mood-System erkennt die Stimmung des Users und passt
 * die Response-Strategie entsprechend an.
 */

export {
  detectMood,
  getResponseGuidelines,
  buildMoodPromptSection,
  applyMoodToDials
} from './moodAnalyzer.ts';

export type {
  MoodType,
  MoodResult,
  ResponseGuidelines
} from './moodAnalyzer.ts';
