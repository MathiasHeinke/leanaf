// ARES Core Types - Archetypen und Protokoll-System
export type Archetype =
  | 'commander'   // Kommandant
  | 'smith'       // Schmied
  | 'father'      // Vater
  | 'sage'        // Weiser
  | 'comrade'     // Kamerad
  | 'hearth'      // Hearthkeeper
  | 'drill';      // Drill (sparsam einsetzen)

export interface TrainingEntry {
  date: string; // ISO
  session: 'push'|'pull'|'legs'|'full'|'rest';
  lifts: Array<{ name: string; sets: number; reps: number; weight: number }>;
  rpe_avg?: number;
  notes?: string;
}

export interface NutritionEntry {
  date: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meals: number;
  notes?: string;
}

export interface DevEntry {
  date: string;
  sleep_hours?: number;
  hrv_drop_pct?: number;   // + = besser, - = Drop
  mood?: number;           // 1..10
  stress_keywords?: string[];
  misses?: number;         // verpasste Sessions in 7d
  alcohol_units?: number;
  wins?: number;           // „kleine Siege"
}

export interface ProtocolState {
  training: TrainingEntry[];
  nutrition: NutritionEntry[];
  dev: DevEntry[];         // Entwicklung/Status
}

export interface ArchetypeBlend {
  // Linear einstellbar: 0..1 je Archetyp (wird normalisiert)
  commander?: number; 
  smith?: number; 
  father?: number; 
  sage?: number;
  comrade?: number; 
  hearth?: number; 
  drill?: number;
}

export interface AresConfig {
  sentenceLength: {          // linear einstellbar: 0..1 → Wortanzahl
    scale: number;           // 0..1
    minWords: number;        // z.B. 4
    maxWords: number;        // z.B. 12
  };
  archetypeBlend: ArchetypeBlend; // linear je Archetyp
  language: 'de'|'en';       // Hochdeutsch in DE-Modus
  humorHardnessBias?: number;// -1 = hart, +1 = humor
  allowDrill?: boolean;      // Drill-Limitierung
}