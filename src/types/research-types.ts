/* GetleanAI – Forschungs-/Workout-Datenmodell  */

type UID = string;   // z. B. ulid() oder nanoid()

// 1. Grundprinzipien (Volumen, Frequenz, …)
export interface Principle {
  id: UID;
  name: string;                  // "Training Volume"
  param: string;                 // "sets_per_muscle_per_week"
  recommended: {
    min?: number;
    max?: number;
    typical?: string;            // "10-20"
    unit?: string;               // "sets"
  };
  description: string;           // Freitext
  citations: number[];           // Verweis auf Referenz-IDs [1,2,3]
  tags: string[];                // ["hypertrophy","universal"]
}

// 2. Geschlechtsspezifische Anpassungen
export interface SexSpecific {
  id: UID;
  sex: "male" | "female";
  adjustments: Record<string, string | number>; // {"frequency":"higher", ...}
  description: string;
  citations: number[];
  tags: string[];                // ["sex-diff"]
}

// 3. Coach-Programme / Philosophien
export interface CoachProgram {
  id: UID;
  coach: string;                 // "Jeff Nippard"
  alias?: string;                // "Evidence-Based Training"
  corePrinciples: string[];      // ["Training Volume","Frequency"]
  recommendations: Record<string, string | number>; // {"frequency":2.5,"volume":20}
  splitExample?: string;         // "4-Day Split"
  notes?: string;
  citations: number[];
  tags: string[];                // ["coach","evidence-based"]
}

// 4. Ziel-Spezifische Guidelines
export interface GoalGuideline {
  id: UID;
  goal: "hypertrophy" | "strength" | "fat_loss";
  recommended: Record<string, string | number>;
  suitablePrograms: UID[];       // Verweis auf CoachProgram.id
  description?: string;
  citations: number[];
  tags: string[];                // ["goal"]
}

// 5. Coach-Persona Mapping (Coach zu Programmen)
export interface CoachPersona {
  id: UID;
  coachName: string;             // "Markus Rühl"
  primaryProgram: UID;           // "cp_ruhl"
  fallbackPrograms: UID[];       // ["cp_yates","cp_mentzer"]
  selectionRules: string;        // Plain-Text/Markdown oder Funktions-Ref
  tags: string[];                // ["coach-routing"]
}

// *** Union für Type-Narrowing in RAG ***
export type ResearchNode = Principle | SexSpecific | CoachProgram | GoalGuideline | CoachPersona;

// Utility functions for working with research data
export function isPrinciple(node: ResearchNode): node is Principle {
  return 'param' in node;
}

export function isSexSpecific(node: ResearchNode): node is SexSpecific {
  return 'sex' in node;
}

export function isCoachProgram(node: ResearchNode): node is CoachProgram {
  return 'coach' in node;
}

export function isGoalGuideline(node: ResearchNode): node is GoalGuideline {
  return 'goal' in node;
}

export function isCoachPersona(node: ResearchNode): node is CoachPersona {
  return 'coachName' in node;
}

// Query helpers
export function filterByTags(data: ResearchNode[], tags: string[]): ResearchNode[] {
  return data.filter(node => 
    tags.some(tag => node.tags.includes(tag))
  );
}

export function findCoachPrograms(data: ResearchNode[]): CoachProgram[] {
  return data.filter(isCoachProgram);
}

export function findPrinciplesForGoal(data: ResearchNode[], goal: string): Principle[] {
  return data.filter(isPrinciple).filter(p => 
    p.tags.includes(goal) || p.tags.includes('universal')
  );
}

export function findCoachPersonas(data: ResearchNode[]): CoachPersona[] {
  return data.filter(isCoachPersona);
}

export function findPersonaByCoach(data: ResearchNode[], coachName: string): CoachPersona | undefined {
  return data.filter(isCoachPersona).find(p => p.coachName === coachName);
}