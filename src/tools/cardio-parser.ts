/**
 * Cardio Parser - Extract cardio metrics from free text input
 * Supports: duration, speed, distance, heart rate, incline
 */

import type { CardioType, CardioEntry } from '@/types/training';

// Activity detection patterns (German + English)
const ACTIVITY_PATTERNS: Record<CardioType | 'other', RegExp> = {
  running: /laufband|joggen|laufen|jogging|running|sprint|rennen|run/i,
  cycling: /rad|bike|cycling|ergometer|spinning|fahrrad|cycle/i,
  rowing: /rudern|rowing|ruderger|concept2|c2|row/i,
  swimming: /schwimmen|swimming|bahnen|swim/i,
  walking: /gehen|walking|spazier|walk|marsch/i,
  other: /cardio|ausdauer|hiit|intervall/i,
};

/**
 * Detect if input looks like cardio (vs strength training)
 */
export function isCardioInput(input: string): boolean {
  const lower = input.toLowerCase();
  
  // Check for cardio keywords
  const hasCardioKeyword = Object.values(ACTIVITY_PATTERNS).some(p => p.test(lower));
  
  // Check for duration patterns (e.g., "10min", "30 minuten", "1h")
  const hasDuration = /\d+\s*(min|minuten?|h|stunden?)/i.test(lower);
  
  // Check for speed patterns (e.g., "12kmh", "10 km/h")
  const hasSpeed = /\d+\s*(km\/h|kmh)/i.test(lower);
  
  // Check for distance patterns (e.g., "5km")
  const hasDistance = /\d+(?:\.\d+)?\s*(km|kilometer)\b/i.test(lower);
  
  // Check for heart rate patterns
  const hasHR = /\b(hr|puls|bpm|herzfrequenz)\s*\d+/i.test(lower);
  
  // It's cardio if it has cardio keywords OR duration/speed without strength patterns
  const hasStrengthPattern = /\d+\s*[x×\*]\s*\d+\s+\d+\s*(kg|lb)/i.test(lower);
  
  return hasCardioKeyword || ((hasDuration || hasSpeed || hasDistance || hasHR) && !hasStrengthPattern);
}

/**
 * Detect activity type from text
 */
function detectActivity(input: string): CardioType | 'other' {
  const lower = input.toLowerCase();
  
  for (const [activity, pattern] of Object.entries(ACTIVITY_PATTERNS)) {
    if (activity !== 'other' && pattern.test(lower)) {
      return activity as CardioType;
    }
  }
  
  return 'other';
}

/**
 * Parse cardio entry from free text
 * Examples:
 * - "Laufband 10min bei 9-12kmh"
 * - "30 Minuten Radfahren"
 * - "5km joggen in 28min"
 * - "Rudern 20min HR 145"
 */
export function parseCardioFromText(input: string): CardioEntry | null {
  const text = input.trim();
  if (!text) return null;
  
  // Detect activity
  const activity = detectActivity(text);
  
  // Parse duration: "10min", "30 minuten", "1h", "1.5 stunden", "1:30h"
  let durationMinutes: number | undefined;
  
  // Pattern for HH:MM format (e.g., "1:30h")
  const hhmmMatch = text.match(/(\d+):(\d+)\s*(h|stunden?)/i);
  if (hhmmMatch) {
    durationMinutes = parseInt(hhmmMatch[1]) * 60 + parseInt(hhmmMatch[2]);
  } else {
    // Pattern for simple duration
    const durationMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(min|minuten?|h|stunden?)/i);
    if (durationMatch) {
      const value = parseFloat(durationMatch[1].replace(',', '.'));
      const unit = durationMatch[2].toLowerCase();
      durationMinutes = unit.startsWith('h') ? Math.round(value * 60) : Math.round(value);
    }
  }
  
  // Parse speed: "9-12kmh", "10 km/h", "bei 12kmh"
  let speedKmh: number | undefined;
  let speedMaxKmh: number | undefined;
  
  const speedMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:-\s*(\d+(?:[.,]\d+)?))?\s*(?:km\/h|kmh)/i);
  if (speedMatch) {
    speedKmh = parseFloat(speedMatch[1].replace(',', '.'));
    if (speedMatch[2]) {
      speedMaxKmh = parseFloat(speedMatch[2].replace(',', '.'));
    }
  }
  
  // Parse distance: "5km", "3.2 kilometer", "2000m"
  let distanceKm: number | undefined;
  
  const distanceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(km|kilometer|m|meter)\b/i);
  if (distanceMatch) {
    const value = parseFloat(distanceMatch[1].replace(',', '.'));
    const unit = distanceMatch[2].toLowerCase();
    distanceKm = unit.startsWith('m') && !unit.startsWith('meter') ? value / 1000 : 
                 unit === 'm' || unit === 'meter' ? value / 1000 : value;
  }
  
  // Parse heart rate: "HR 145", "Puls 150", "@140bpm", "bei 140 bpm"
  let avgHr: number | undefined;
  
  const hrMatch = text.match(/(?:hr|puls|bpm|herzfrequenz|@)\s*(\d+)/i) ||
                  text.match(/(\d+)\s*(?:bpm|puls)/i);
  if (hrMatch) {
    avgHr = parseInt(hrMatch[1]);
    // Sanity check for HR values
    if (avgHr < 40 || avgHr > 220) avgHr = undefined;
  }
  
  // Parse incline: "2% steigung", "incline 5%", "5% incline"
  let inclinePercent: number | undefined;
  
  const inclineMatch = text.match(/(\d+(?:[.,]\d+)?)\s*%?\s*(?:steigung|incline|neigung)/i) ||
                       text.match(/(?:steigung|incline|neigung)\s*(\d+(?:[.,]\d+)?)\s*%?/i);
  if (inclineMatch) {
    inclinePercent = parseFloat(inclineMatch[1].replace(',', '.'));
  }
  
  // Parse calories: "150kcal", "150 kalorien"
  let calories: number | undefined;
  
  const calMatch = text.match(/(\d+)\s*(?:kcal|kalorien|cal)/i);
  if (calMatch) {
    calories = parseInt(calMatch[1]);
  }
  
  // Must have at least duration OR distance to be valid cardio
  if (!durationMinutes && !distanceKm) {
    return null;
  }
  
  // Estimate duration from distance if missing (assume ~6 min/km for running, ~3 min/km for cycling)
  if (!durationMinutes && distanceKm) {
    const pacePerKm = activity === 'cycling' ? 3 : activity === 'running' ? 6 : 10;
    durationMinutes = Math.round(distanceKm * pacePerKm);
  }
  
  return {
    activity,
    duration_minutes: durationMinutes || 0,
    distance_km: distanceKm,
    speed_kmh: speedKmh,
    speed_max_kmh: speedMaxKmh,
    avg_hr: avgHr,
    incline_percent: inclinePercent,
    calories,
  };
}

/**
 * Parse multiple cardio entries from multi-line text
 */
export function parseCardioMulti(input: string): CardioEntry[] {
  return input
    .split(/\n|;/)
    .map(line => parseCardioFromText(line))
    .filter((entry): entry is CardioEntry => entry !== null);
}
