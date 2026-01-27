/**
 * Coach Personas System - Prompt Builder
 * Phase 2: Orchestrator Integration
 * 
 * Dieses Modul generiert den Persona-Teil des System-Prompts:
 * - buildPersonaPrompt() - Hauptfunktion für den kompletten Persona-Prompt
 * - getDialDescription() - Übersetzt Dial-Werte in LLM-Anweisungen
 * - selectPhrases() - Wählt Floskeln basierend auf Frequenz
 */

import type { CoachPersona, PersonalityDials, PersonaResolutionContext, ResolvedPersona } from './types.ts';

/**
 * Beschreibungen für jeden Dial-Wert (1-10)
 * Diese werden dem LLM als Anweisungen gegeben
 */
const DIAL_DESCRIPTIONS: Record<keyof PersonalityDials, Record<number, string>> = {
  energy: {
    1: 'Sei ruhig und gelassen.',
    2: 'Bleib zurückhaltend und entspannt.',
    3: 'Sei moderat ruhig.',
    4: 'Halte die Energie niedrig-mittel.',
    5: 'Halte eine ausgewogene Energie.',
    6: 'Zeige moderate Energie.',
    7: 'Sei energetisch und motivierend.',
    8: 'Sei sehr energetisch!',
    9: 'Sei SEHR energetisch und enthusiastisch!',
    10: 'MAXIMALE ENERGIE! Sei extrem enthusiastisch und mitreißend!'
  },
  directness: {
    1: 'Sei sehr einfühlsam und vorsichtig in deiner Kommunikation.',
    2: 'Formuliere sanft und indirekt.',
    3: 'Sei diplomatisch in deiner Wortwahl.',
    4: 'Halte Balance zwischen Sanftheit und Klarheit.',
    5: 'Kommuniziere ausgewogen - weder zu direkt noch zu vorsichtig.',
    6: 'Sei klar und deutlich in deinen Aussagen.',
    7: 'Sei direkt und auf den Punkt.',
    8: 'Keine Umschweife - sag was Sache ist.',
    9: 'Sei sehr direkt. Klartext ohne Beschönigungen.',
    10: 'MAXIMALE DIREKTHEIT. Brutal ehrlich, keine Ausreden akzeptieren.'
  },
  humor: {
    1: 'Bleib sachlich und ernst - kein Humor.',
    2: 'Sehr wenig Humor, fokussiert bleiben.',
    3: 'Gelegentlich leichter Humor ist okay.',
    4: 'Ab und zu ein Schmunzler erlaubt.',
    5: 'Moderater Humor wenn passend.',
    6: 'Humor gerne einsetzen wenn es passt.',
    7: 'Sei humorvoll und locker.',
    8: 'Viel Humor und Witz einbauen!',
    9: 'Sehr humorvoll! Witze und Sprüche gerne.',
    10: 'MAXIMALER HUMOR! Alles mit Witz und Spaß.'
  },
  warmth: {
    1: 'Bleib sachlich und distanziert.',
    2: 'Halte professionelle Distanz.',
    3: 'Etwas Wärme ist okay, aber sachlich bleiben.',
    4: 'Zeige moderate Wärme.',
    5: 'Sei freundlich und zugänglich.',
    6: 'Zeige echte Wärme und Interesse.',
    7: 'Sei warm und empathisch.',
    8: 'Sehr warm und verständnisvoll!',
    9: 'Sei extrem empathisch und fürsorglich.',
    10: 'MAXIMALE WÄRME! Wie ein guter Freund/Vater.'
  },
  depth: {
    1: 'Halte es oberflächlich und einfach.',
    2: 'Nicht zu tief gehen, basics reichen.',
    3: 'Leichte Erklärungen ohne viel Tiefe.',
    4: 'Moderate Tiefe wenn nötig.',
    5: 'Ausgewogene Tiefe - erkläre wenn relevant.',
    6: 'Gehe in die Tiefe wenn es hilft.',
    7: 'Erkläre Hintergründe und Zusammenhänge.',
    8: 'Tiefgründige Antworten mit Kontext.',
    9: 'Sehr tiefgründig - philosophisch und reflektiert.',
    10: 'MAXIMALE TIEFE! Erkläre das "Warum" hinter allem.'
  },
  challenge: {
    1: 'Sei absolut nicht fordernd - nur unterstützen.',
    2: 'Sehr sanft, keine Herausforderungen.',
    3: 'Leichte Ermutigung, aber kein Druck.',
    4: 'Moderate Ermutigung.',
    5: 'Balance zwischen Support und Forderung.',
    6: 'Fordere den User heraus wenn angebracht.',
    7: 'Sei fordernd und pushe zu mehr.',
    8: 'Hohe Erwartungen - keine Ausreden!',
    9: 'Sehr fordernd - pushe an die Grenzen!',
    10: 'MAXIMALE FORDERUNG! Akzeptiere keine Ausreden, erwarte Excellence!'
  },
  opinion: {
    1: 'Bleib völlig neutral - keine eigene Meinung.',
    2: 'Halte dich mit Meinungen zurück.',
    3: 'Sei zurückhaltend mit eigenen Ansichten.',
    4: 'Gelegentlich eigene Einschätzung teilen.',
    5: 'Moderate eigene Meinung wenn gefragt.',
    6: 'Teile deine Einschätzung proaktiv.',
    7: 'Hab klare Meinungen und vertrete sie.',
    8: 'Starke Meinungen - steh dazu!',
    9: 'Sehr meinungsstark - klare Position beziehen.',
    10: 'MAXIMALE MEINUNG! Sage klar was richtig und falsch ist.'
  }
};

/**
 * Übersetzt einen einzelnen Dial-Wert in eine LLM-Anweisung
 */
export function getDialDescription(dialName: keyof PersonalityDials, value: number): string {
  // Clamp value to 1-10
  const clampedValue = Math.max(1, Math.min(10, Math.round(value)));
  return DIAL_DESCRIPTIONS[dialName][clampedValue] || DIAL_DESCRIPTIONS[dialName][5];
}

/**
 * Wählt Floskeln basierend auf der phrase_frequency aus
 * und gibt Anweisungen wie oft diese genutzt werden sollen
 * 
 * @param phrases - Array von charakteristischen Phrasen
 * @param frequency - 0-10, wie oft Phrasen genutzt werden sollen
 * @returns Anweisung für das LLM oder null wenn keine Phrasen
 */
export function selectPhrases(phrases: string[], frequency: number): string | null {
  if (!phrases || phrases.length === 0 || frequency === 0) {
    return null;
  }
  
  // Frequenz-basierte Anweisungen
  let frequencyInstruction: string;
  
  if (frequency <= 2) {
    frequencyInstruction = 'SEHR SELTEN (höchstens 1 von 10 Antworten)';
  } else if (frequency <= 4) {
    frequencyInstruction = 'GELEGENTLICH (ca. 1 von 5 Antworten)';
  } else if (frequency <= 6) {
    frequencyInstruction = 'REGELMÄSSIG (ca. 2 von 5 Antworten)';
  } else if (frequency <= 8) {
    frequencyInstruction = 'HÄUFIG (ca. 2 von 3 Antworten)';
  } else {
    frequencyInstruction = 'SEHR HÄUFIG (fast jede Antwort)';
  }
  
  // Wähle eine Teilmenge der Phrasen (max 5 für Kontext-Fenster)
  const selectedPhrases = phrases.slice(0, 5);
  
  return `Nutze ${frequencyInstruction} diese charakteristischen Ausdrücke:\n${selectedPhrases.map(p => `- "${p}"`).join('\n')}`;
}

/**
 * Formatiert Beispiel-Antworten für das LLM
 */
function formatExampleResponses(examples: Array<{ context: string; response: string }>): string {
  if (!examples || examples.length === 0) return '';
  
  const formatted = examples.slice(0, 3).map(ex => 
    `**Situation: ${ex.context}**\n"${ex.response}"`
  ).join('\n\n');
  
  return `## BEISPIELE WIE DU ANTWORTEST\n${formatted}`;
}

/**
 * Generiert den kompletten Persona-Teil des System-Prompts
 * 
 * @param persona - Die aktive CoachPersona
 * @param context - Optionaler Kontext (Topic, Mood, etc.)
 * @returns Der Persona-Prompt-Block für das System-Prompt
 */
export function buildPersonaPrompt(
  persona: CoachPersona | ResolvedPersona,
  context?: PersonaResolutionContext
): string {
  // Nutze resolvedDials wenn vorhanden, sonst die normalen dials
  const dials = 'resolvedDials' in persona ? persona.resolvedDials : persona.dials;
  
  // Sammle die relevantesten Dial-Anweisungen (nur die extremeren Werte)
  const dialInstructions: string[] = [];
  
  for (const [key, value] of Object.entries(dials)) {
    // Nur Werte außerhalb des "normalen" Bereichs (4-6) explizit erwähnen
    if (value <= 3 || value >= 7) {
      dialInstructions.push(getDialDescription(key as keyof PersonalityDials, value));
    }
  }
  
  // Phrasen-Anweisung
  const phrasesInstruction = selectPhrases(persona.phrases, persona.phraseFrequency);
  
  // Beispiel-Antworten
  const examplesSection = formatExampleResponses(persona.exampleResponses);
  
  // Baue den kompletten Prompt
  let prompt = `## DEINE PERSÖNLICHKEIT HEUTE: ${persona.name}
${persona.description ? `*${persona.description}*\n` : ''}
### DEIN VERHALTEN
${dialInstructions.length > 0 ? dialInstructions.join('\n') : 'Sei ausgewogen und natürlich.'}`;

  // Sprachstil hinzufügen
  if (persona.languageStyle || persona.dialect || phrasesInstruction) {
    prompt += `\n\n### DEIN SPRACHSTIL`;
    
    if (persona.languageStyle) {
      prompt += `\n${persona.languageStyle}`;
    }
    
    if (persona.dialect) {
      prompt += `\n**Dialekt:** Nutze ${persona.dialect}e Sprachfärbung in deinen Antworten.`;
    }
    
    if (phrasesInstruction) {
      prompt += `\n\n${phrasesInstruction}`;
    }
  }
  
  // Beispiele hinzufügen
  if (examplesSection) {
    prompt += `\n\n${examplesSection}`;
  }
  
  // Kontext-spezifische Anpassungen
  if (context) {
    const contextNotes: string[] = [];
    
    if (context.mood === 'frustrated' || context.mood === 'overwhelmed') {
      contextNotes.push('Der User scheint gerade frustriert/überfordert zu sein - zeige extra Verständnis.');
    }
    if (context.mood === 'positive') {
      contextNotes.push('Der User ist gut drauf - nutze das Momentum!');
    }
    if (context.timeOfDay === 'morning') {
      contextNotes.push('Es ist Morgen - starte motivierend in den Tag.');
    }
    if (context.timeOfDay === 'night') {
      contextNotes.push('Es ist spät - halte dich kurz und beende das Gespräch positiv.');
    }
    
    if (contextNotes.length > 0) {
      prompt += `\n\n### AKTUELLER KONTEXT\n${contextNotes.join('\n')}`;
    }
  }
  
  return prompt;
}

/**
 * Wendet Kontext-Modifikationen auf die Dials an
 * (±30% Anpassung basierend auf Topic, Mood, Time)
 */
export function resolvePersonaWithContext(
  persona: CoachPersona,
  context: PersonaResolutionContext
): ResolvedPersona {
  const baseDials = { ...persona.dials };
  const appliedModifiers: string[] = [];
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // AI-NATIVE DETAIL LEVEL MODULATION (Semantic Router Integration)
  // This is the "neuro-link" between AI understanding and persona behavior
  // ═══════════════════════════════════════════════════════════════════════════════
  if (context.detailLevel) {
    switch (context.detailLevel) {
      case 'ultra_short':
        // Bestaetigung: Wissenschafts-Regler stark runter
        // "Ok, danke" → Lester antwortet mit 2-3 Sätzen statt Vorlesung
        baseDials.depth = Math.max(2, Math.round(baseDials.depth * 0.3));
        baseDials.opinion = Math.max(2, Math.round(baseDials.opinion * 0.5));
        appliedModifiers.push('semantic_ultra_short');
        break;
      case 'concise':
        // Kurze Frage: Moderate Reduktion
        // "Was essen?" → Lester gibt praktischen Tipp ohne Studie
        baseDials.depth = Math.max(3, Math.round(baseDials.depth * 0.5));
        baseDials.opinion = Math.max(3, Math.round(baseDials.opinion * 0.6));
        appliedModifiers.push('semantic_concise');
        break;
      case 'moderate':
        // Standard: Leichte Reduktion für Balance
        baseDials.depth = Math.max(4, Math.round(baseDials.depth * 0.7));
        baseDials.opinion = Math.max(4, Math.round(baseDials.opinion * 0.8));
        appliedModifiers.push('semantic_moderate');
        break;
      case 'extensive':
        // Deep Dive: Volle Wissenschafts-Power!
        // "Warum ist Schlaf wichtig?" → Lester darf voll aufdrehen
        appliedModifiers.push('semantic_extensive_full');
        break;
    }
  }
  
  // Topic-basierte Anpassungen
  if (context.topic === 'motivation' || context.topic === 'mindset') {
    baseDials.energy = Math.min(10, Math.round(baseDials.energy * 1.2));
    baseDials.warmth = Math.min(10, Math.round(baseDials.warmth * 1.1));
    appliedModifiers.push('motivation_boost');
  }
  
  if (context.topic === 'training') {
    baseDials.challenge = Math.min(10, Math.round(baseDials.challenge * 1.2));
    baseDials.directness = Math.min(10, Math.round(baseDials.directness * 1.1));
    appliedModifiers.push('training_focus');
  }
  
  if (context.topic === 'nutrition') {
    baseDials.depth = Math.min(10, Math.round(baseDials.depth * 1.15));
    appliedModifiers.push('nutrition_depth');
  }
  
  // Mood-basierte Anpassungen
  if (context.mood === 'frustrated' || context.mood === 'overwhelmed') {
    baseDials.warmth = Math.min(10, Math.round(baseDials.warmth * 1.3));
    baseDials.challenge = Math.max(1, Math.round(baseDials.challenge * 0.7));
    baseDials.directness = Math.max(1, Math.round(baseDials.directness * 0.8));
    appliedModifiers.push('empathy_mode');
  }
  
  if (context.mood === 'positive') {
    baseDials.energy = Math.min(10, Math.round(baseDials.energy * 1.15));
    baseDials.challenge = Math.min(10, Math.round(baseDials.challenge * 1.1));
    appliedModifiers.push('momentum_boost');
  }
  
  // Time-of-day Anpassungen
  if (context.timeOfDay === 'morning') {
    baseDials.energy = Math.min(10, Math.round(baseDials.energy * 1.1));
    appliedModifiers.push('morning_energy');
  }
  
  if (context.timeOfDay === 'night') {
    baseDials.energy = Math.max(1, Math.round(baseDials.energy * 0.8));
    appliedModifiers.push('evening_calm');
  }
  
  // User-Tenure Anpassungen (längere Beziehung = mehr Challenge/Directness)
  if (context.userTenure && context.userTenure > 30) {
    baseDials.challenge = Math.min(10, Math.round(baseDials.challenge * 1.1));
    baseDials.directness = Math.min(10, Math.round(baseDials.directness * 1.1));
    appliedModifiers.push('established_relationship');
  }
  
  return {
    ...persona,
    resolvedDials: baseDials,
    appliedModifiers
  };
}
