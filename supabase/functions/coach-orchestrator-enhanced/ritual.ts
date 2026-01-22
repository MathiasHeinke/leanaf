// ============= ARES Ritual Dispatcher =============
// Phase 3: Time-based ritual management

interface RitualConfig {
  type: 'muster' | 'grind' | 'hearth';
  archetype: string;
  dial: number;
  prompt_key: string;
  time_window: string;
}

const RITUAL_PROMPTS = {
  morning_ritual: {
    smith: "Der Tag beginnt. Was steht heute auf deinem Amboss? Zeig mir deinen Plan.",
    father: "Guten Morgen. Wie fühlst du dich heute? Lass uns gemeinsam den Tag angehen.",
    commander: "Morgenreport. Status, Ziele, Bereitschaft. Los."
  },
  midday_check: {
    comrade: "Halbzeit. Wie läuft es? Brauchst du Unterstützung oder Push?",
    smith: "Mittag. Der Amboss ist heiß. Wie weit bist du gekommen?",
    commander: "Zwischenbericht. Stand der Mission. Adjustierungen nötig?"
  },
  evening_review: {
    hearthkeeper: "Der Tag ist fast vorbei. Zeit für Reflexion. Was nimmst du mit?",
    father: "Feierabend. Lass uns den Tag zusammen abschließen. Worauf bist du stolz?",
    sage: "Der Abend bringt Weisheit. Was hast du heute über dich gelernt?"
  }
};

export function getCurrentRitual(): RitualConfig | null {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Morning Muster: 06:00-09:00 (360-540 minutes)
  if (totalMinutes >= 360 && totalMinutes <= 540) {
    return {
      type: 'muster',
      archetype: 'smith',
      dial: 2,
      prompt_key: 'morning_ritual',
      time_window: '06:00-09:00'
    };
  }

  // Grind Check: 11:30-14:00 (690-840 minutes)
  if (totalMinutes >= 690 && totalMinutes <= 840) {
    return {
      type: 'grind',
      archetype: 'comrade',
      dial: 1,
      prompt_key: 'midday_check',
      time_window: '11:30-14:00'
    };
  }

  // Hearth Review: 20:30-23:00 (1230-1380 minutes)
  if (totalMinutes >= 1230 && totalMinutes <= 1380) {
    return {
      type: 'hearth',
      archetype: 'hearthkeeper',
      dial: 3,
      prompt_key: 'evening_review',
      time_window: '20:30-23:00'
    };
  }

  return null;
}

export function getRitualPrompt(ritual: RitualConfig, userState?: any): string {
  const prompts = RITUAL_PROMPTS[ritual.prompt_key as keyof typeof RITUAL_PROMPTS];
  if (!prompts) return '';

  const archetypePrompt = (prompts as Record<string, string>)[ritual.archetype];
  if (!archetypePrompt) return '';

  // Add contextual elements based on user state
  let contextualPrompt: string = archetypePrompt;

  if (userState?.streak >= 7) {
    contextualPrompt += ` Übrigens – ${userState.streak} Tage in Folge. Respekt.`;
  }

  if (userState?.missed_tasks >= 2 && ritual.prompt_key === 'evening_review') {
    contextualPrompt += ` Es gab heute Hindernisse. Was lernen wir daraus?`;
  }

  if (userState?.energy_level <= 3 && ritual.prompt_key === 'morning_ritual') {
    contextualPrompt += ` Du wirkst müde. Was brauchst du für einen guten Start?`;
  }

  return contextualPrompt;
}

// Integrates with existing ARES dial system
export function enhanceDialWithRitual(baseDial: number, baseArchetype: string): { dial: number; archetype: string; ritual?: RitualConfig } {
  const currentRitual = getCurrentRitual();
  
  if (!currentRitual) {
    return { dial: baseDial, archetype: baseArchetype };
  }

  console.log(`[RITUAL] Current ritual detected: ${currentRitual.type} (${currentRitual.time_window})`);
  
  // Ritual time overrides normal dial selection
  return {
    dial: currentRitual.dial,
    archetype: currentRitual.archetype,
    ritual: currentRitual
  };
}

// Generate time-aware coaching context
export function buildRitualContext(userMoodData?: any): string {
  const ritual = getCurrentRitual();
  
  if (!ritual) {
    return ''; // No ritual context outside time windows
  }

  const ritualPrompt = getRitualPrompt(ritual, userMoodData);
  
  return `
RITUAL-KONTEXT: ${ritual.type.toUpperCase()} (${ritual.time_window})
Archetyp: ${ritual.archetype}
Dial: ${ritual.dial}

${ritualPrompt}

[Zeit-basierte Interaktion aktiv - angepasster Tonfall und Fokus]
`.trim();
}