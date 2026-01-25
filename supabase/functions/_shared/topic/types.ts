/**
 * Topic State Machine Types
 * ARES 3.0: Fluider Themenwechsel mit Kontext-Archivierung
 */

export type TopicStatus = 'active' | 'paused' | 'resolved' | 'archived';

export interface Topic {
  id: string;
  name: string;
  category: TopicCategory;
  status: TopicStatus;
  depth: number; // 0-3: surface → deep discussion
  startedAt: string;
  lastActiveAt: string;
  resolvedAt?: string;
  keyPoints: string[];
  userQuestions: string[];
  pendingFollowups: string[];
}

export type TopicCategory = 
  | 'training'
  | 'nutrition'
  | 'supplements'
  | 'sleep'
  | 'hormones'
  | 'bloodwork'
  | 'mindset'
  | 'recovery'
  | 'lifestyle'
  | 'protocol'
  | 'general';

export interface TopicState {
  primary: Topic | null;
  secondary: Topic[];
  archived: Topic[];
  lastShiftAt: string | null;
  shiftCount: number;
}

export interface TopicShiftSignal {
  type: 'explicit' | 'implicit' | 'question' | 'tangent';
  confidence: number;
  detectedPhrase?: string;
  suggestedTopic?: string;
}

export interface TopicTransition {
  from: Topic | null;
  to: Topic;
  reason: 'user_initiated' | 'natural_flow' | 'coach_suggested' | 'timeout';
  timestamp: string;
}

export const TOPIC_SHIFT_PHRASES: Record<string, TopicShiftSignal['type']> = {
  // Explicit shifts
  'übrigens': 'explicit',
  'apropos': 'explicit',
  'nebenbei': 'explicit',
  'anderes thema': 'explicit',
  'kurze frage': 'explicit',
  'noch was': 'explicit',
  'ach ja': 'explicit',
  'bevor ich es vergesse': 'explicit',
  
  // Implicit shifts
  'was ist mit': 'implicit',
  'wie sieht es aus mit': 'implicit',
  'und was': 'implicit',
  
  // Questions that might shift
  'kann ich dich was fragen': 'question',
  'darf ich fragen': 'question',
  'eine frage': 'question',
};

export const CATEGORY_KEYWORDS: Record<TopicCategory, string[]> = {
  training: ['training', 'workout', 'übung', 'gym', 'kraft', 'cardio', 'muskel', 'gewicht', 'satz', 'rep', 'volumen'],
  nutrition: ['essen', 'ernährung', 'kalorien', 'makros', 'protein', 'kohlenhydrate', 'fett', 'mahlzeit', 'diät'],
  supplements: ['supplement', 'vitamin', 'kreatin', 'omega', 'magnesium', 'zink', 'ashwagandha', 'nahrungsergänzung'],
  sleep: ['schlaf', 'schlafen', 'müde', 'energie', 'aufwachen', 'einschlafen', 'tiefschlaf', 'rem'],
  hormones: ['hormon', 'testosteron', 'cortisol', 'östrogen', 'insulin', 'wachstumshormon', 'schilddrüse'],
  bloodwork: ['blutwert', 'blutbild', 'labor', 'marker', 'referenz', 'wert', 'test'],
  mindset: ['mental', 'motivation', 'stress', 'fokus', 'disziplin', 'gewohnheit', 'mindset'],
  recovery: ['regeneration', 'erholung', 'pause', 'deload', 'stretching', 'massage', 'sauna'],
  lifestyle: ['alltag', 'arbeit', 'zeit', 'routine', 'balance', 'lifestyle'],
  protocol: ['protokoll', 'plan', 'phase', 'zyklus', 'stack', 'dosierung'],
  general: [],
};
