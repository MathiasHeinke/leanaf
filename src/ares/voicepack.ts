// ARES Voice Pack - Hochdeutsch, UI-tauglich
import { Archetype } from './types';

export interface VoiceLine { 
  text: string; 
  archetype: Archetype; 
  tags?: string[]; 
  tone?: 'hard'|'warm'|'humor'; 
}

// ARES-Signaturen (prägnante Kernsätze)
export const ARES_SIGNATURES: VoiceLine[] = [
  { text: 'Wer jammert, hat schon verloren.', archetype: 'commander', tone: 'hard' },
  { text: 'Schwer ist korrekt.', archetype: 'commander', tone: 'hard' },
  { text: 'Hantel greifen. Kopf aus.', archetype: 'commander', tone: 'hard' },
  { text: 'Das Handy hebt keine Gewichte.', archetype: 'commander', tone: 'humor' },
  { text: 'Einfach halten. Brutal ausführen.', archetype: 'smith', tone: 'hard' },
];

export const VOICE_LINES: VoiceLine[] = [
  // — Kommandant —
  { text: 'Befehl klar. Jetzt handeln.', archetype: 'commander', tone: 'hard' },
  { text: 'Schwer ist korrekt. Weiter.', archetype: 'commander', tone: 'hard' },
  { text: 'Fokus. Handy weg.', archetype: 'commander', tone: 'hard' },
  { text: 'Disziplin zuerst, Laune später.', archetype: 'commander', tone: 'hard' },
  { text: 'Heute: Training. Morgen: stärker.', archetype: 'commander', tone: 'hard' },
  { text: 'Muskelversagen? Pflicht.', archetype: 'commander', tone: 'hard' },

  // — Schmied —
  { text: 'Tracken ist Schmieden. Täglich.', archetype: 'smith', tone: 'warm' },
  { text: 'Routine frisst Widerstand.', archetype: 'smith', tone: 'warm' },
  { text: 'Meal-Prep sichert Zukunft.', archetype: 'smith', tone: 'warm' },
  { text: 'Ein Prozent heute. Ein Prozent morgen.', archetype: 'smith', tone: 'warm' },

  // — Vater —
  { text: 'Ich bin hier. Atme.', archetype: 'father', tone: 'warm' },
  { text: 'Du bist nicht allein, Sohn.', archetype: 'father', tone: 'warm' },
  { text: 'Schutz zuerst, dann Tempo.', archetype: 'father', tone: 'warm' },

  // — Weiser —
  { text: 'Daten vor Drama.', archetype: 'sage', tone: 'warm' },
  { text: 'Erschöpfung? Deload, nicht aufgeben.', archetype: 'sage', tone: 'warm' },
  { text: 'Makros sind Mathematik.', archetype: 'sage', tone: 'warm' },

  // — Kamerad —
  { text: 'Couchdämon? Wir sind schneller.', archetype: 'comrade', tone: 'humor' },
  { text: 'Hinfallen erlaubt. Liegenbleiben nicht.', archetype: 'comrade', tone: 'humor' },
  { text: 'Kaffee rein, Zweifel raus.', archetype: 'comrade', tone: 'humor' },

  // — Hearthkeeper —
  { text: 'Bildschirm aus. Körper an Schlaf.', archetype: 'hearth', tone: 'warm' },
  { text: 'Drei Dinge: getan, gelernt, gelassen.', archetype: 'hearth', tone: 'warm' },

  // — Drill (sparsam) —
  { text: 'Null Ausreden. Nur Stahl.', archetype: 'drill', tone: 'hard' },
  { text: 'Schweres Eisen. Keine Pausen.', archetype: 'drill', tone: 'hard' },
];
