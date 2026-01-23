/**
 * Coach Personas System - TypeScript Types
 * Phase 1 Foundation
 * 
 * Dieses Modul definiert alle Typen für das Coach-Personas System:
 * - CoachPersona: Die Hauptdefinition einer Persona mit allen 7 Dials
 * - UserPersonaSelection: Die Persona-Auswahl eines Users
 * - PersonalityDials: Die 7 Persönlichkeitsdimensionen
 */

/**
 * Die 7 Personality Dials (jeweils 1-10)
 * 
 * Jeder Dial steuert einen Aspekt der Coach-Persönlichkeit:
 * - 1 = Minimum (sehr zurückhaltend/wenig)
 * - 5 = Neutral (ausgewogen)
 * - 10 = Maximum (sehr ausgeprägt/viel)
 */
export interface PersonalityDials {
  /** Energielevel: 1=ruhig, 10=sehr energetisch */
  energy: number;
  /** Direktheit: 1=sehr indirekt, 10=sehr direkt */
  directness: number;
  /** Humor: 1=sehr ernst, 10=sehr humorvoll */
  humor: number;
  /** Wärme: 1=sachlich/distanziert, 10=sehr warm/empathisch */
  warmth: number;
  /** Tiefe: 1=oberflächlich, 10=tiefgründig/philosophisch */
  depth: number;
  /** Challenge: 1=sehr sanft, 10=sehr fordernd */
  challenge: number;
  /** Meinung: 1=neutral, 10=starke eigene Meinung */
  opinion: number;
}

/**
 * Beispiel-Antwort für eine Persona
 * Wird dem LLM als Kontext gegeben
 */
export interface PersonaExampleResponse {
  /** Kontext/Situation (z.B. "motivation", "frustration", "greeting") */
  context: string;
  /** Beispiel-Antwort in dieser Situation */
  response: string;
}

/**
 * Coach Persona - Vollständige Definition
 * 
 * Eine Persona definiert den kompletten Charakter des Coaches:
 * - Grundlegende Infos (Name, Beschreibung, Icon)
 * - 7 Personality Dials für die Persönlichkeit
 * - Floskeln-Frequenz für charakteristische Phrasen
 * - Sprachstil und Dialekt
 * - Beispiel-Antworten für das LLM
 */
export interface CoachPersona {
  /** Eindeutige ID (z.B. 'STANDARD', 'KRIEGER', 'RÜHL', 'SANFT') */
  id: string;
  /** Anzeigename */
  name: string;
  /** Beschreibung für den User */
  description: string | null;
  /** Emoji-Icon */
  icon: string | null;
  
  // Die 7 Personality Dials
  dials: PersonalityDials;
  
  /**
   * Floskeln-Frequenz (0-10)
   * 
   * Steuert wie oft charakteristische Phrasen in Antworten eingestreut werden:
   * - 0 = keine Floskeln (100% neutral, keine charakteristischen Phrasen)
   * - 5 = gelegentlich (Standard, natürlich wirkend)
   * - 10 = sehr häufig (kann bei >7 "holzig" wirken)
   * 
   * WICHTIG: Bei hohen Werten (7-10) werden Floskeln häufiger verwendet,
   * was den Charakter stärker hervorhebt, aber auch übertrieben wirken kann.
   * Für natürliche Gespräche wird 3-6 empfohlen.
   */
  phraseFrequency: number;
  
  /** Anweisungen für den Sprachstil */
  languageStyle: string | null;
  /** Dialekt (z.B. 'hessisch' für RÜHL) */
  dialect: string | null;
  /** Array von typischen Floskeln/Redewendungen */
  phrases: string[];
  /** Beispiel-Antworten für verschiedene Kontexte */
  exampleResponses: PersonaExampleResponse[];
  
  // Meta
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Persona Selection
 * Speichert welche Persona ein User ausgewählt hat
 */
export interface UserPersonaSelection {
  userId: string;
  personaId: string | null;
  selectedAt: Date;
}

/**
 * Persona mit aufgelösten Kontext-Modifiern
 * Nach Anwendung von Topic, Mood, Time-of-Day Adjustments
 */
export interface ResolvedPersona extends CoachPersona {
  /** Die modifizierten Dials nach Kontext-Anpassung */
  resolvedDials: PersonalityDials;
  /** Welche Modifier angewendet wurden */
  appliedModifiers: string[];
}

/**
 * Kontext für Persona-Resolution
 */
export interface PersonaResolutionContext {
  /** Erkanntes Topic (z.B. 'training', 'nutrition', 'motivation') */
  topic?: string;
  /** Erkannte Stimmung des Users */
  mood?: 'positive' | 'neutral' | 'frustrated' | 'overwhelmed';
  /** Tageszeit */
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  /** Wie lange ist der User schon dabei (in Tagen) */
  userTenure?: number;
}

/**
 * Persona für UI-Auswahl (vereinfacht)
 */
export interface PersonaPreview {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  /** Kurzbeschreibung der Persönlichkeit basierend auf Dials */
  personalitySummary: string;
}

/**
 * DB Row Type (wie es aus Supabase kommt)
 */
export interface CoachPersonaRow {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  dial_energy: number;
  dial_directness: number;
  dial_humor: number;
  dial_warmth: number;
  dial_depth: number;
  dial_challenge: number;
  dial_opinion: number;
  phrase_frequency: number;
  language_style: string | null;
  dialect: string | null;
  phrases: string[] | null;
  example_responses: PersonaExampleResponse[] | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Persona IDs als Konstanten
 */
export const PERSONA_IDS = {
  LESTER: 'lester',
  ARES: 'ares',
  MARKUS: 'markus',
  FREYA: 'freya',
} as const;

export type PersonaId = typeof PERSONA_IDS[keyof typeof PERSONA_IDS];

/**
 * Default Persona wenn keine ausgewählt
 */
export const DEFAULT_PERSONA_ID: PersonaId = 'lester';
