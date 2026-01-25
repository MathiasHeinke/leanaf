/**
 * Mood Analyzer - ARES 3.0 PRO
 * 
 * Erkennt die Stimmung des Users aus der Nachricht und gibt
 * Response-Anpassungen für alle 4 Personas zurück.
 * 
 * Stimmungen:
 * - positive: User ist gut drauf, motiviert
 * - neutral: Normal, keine starke Emotion
 * - negative: Traurig, demotiviert
 * - frustrated: Genervt, "geht nicht", "schon wieder"
 * - stressed: Zeitdruck, Hektik
 * - curious: Wissbegierig, will verstehen
 */

export type MoodType = 'positive' | 'neutral' | 'negative' | 'frustrated' | 'stressed' | 'curious';

export interface MoodResult {
  mood: MoodType;
  confidence: number;  // 0-1
  indicators: string[];
  intensityScore: number;  // 1-10, wie stark die Stimmung ist
}

export interface ResponseGuidelines {
  tone: 'energetic' | 'balanced' | 'empathetic' | 'supportive' | 'concise' | 'educational';
  length: 'normal' | 'shorter' | 'very_short' | 'longer';
  emojiUsage: 'yes' | 'minimal' | 'no';
  proactive: boolean;
  celebration: boolean;
  openingStyle?: string;
  warmthBoost: number;      // Modifier für persona.dial_warmth (-3 bis +3)
  directnessBoost: number;  // Modifier für persona.dial_directness (-3 bis +3)
  challengeBoost: number;   // Modifier für persona.dial_challenge (-3 bis +3)
}

// Mood-Indikatoren für deutsche Texte
const MOOD_INDICATORS: Record<MoodType, { words: string[]; patterns: RegExp[] }> = {
  positive: {
    words: [
      'super', 'mega', 'geil', 'toll', 'danke', 'perfekt', 'geschafft', 'motiviert',
      'cool', 'stark', 'krass', 'nice', 'genial', 'top', 'hammer', 'bombe',
      'freue', 'happy', 'endlich', 'jawoll', 'yeah', 'yes', 'läuft', 'klappt'
    ],
    patterns: [
      /💪|🔥|😊|😁|🎉|✅|👍|🚀|❤️|🙌/,
      /!{2,}/,
      /hab.*geschafft/i,
      /hat.*funktioniert/i,
      /es.*läuft/i
    ]
  },
  negative: {
    words: [
      'traurig', 'schlecht', 'mist', 'scheisse', 'scheiße', 'deprimiert', 'down',
      'aufgegeben', 'hoffnungslos', 'keine ahnung', 'kein bock', 'egal',
      'verloren', 'versagt', 'gescheitert', 'unmöglich', 'sinnlos'
    ],
    patterns: [
      /😔|😢|😭|😞|💔/,
      /keine?\s*(lust|motivation|energie|kraft)/i,
      /schaff.*nicht/i,
      /geht\s*nicht\s*mehr/i,
      /hab.*aufgegeben/i
    ]
  },
  frustrated: {
    words: [
      'frustriert', 'genervt', 'nervig', 'nervt', 'kotzt', 'wütend', 'sauer',
      'verdammt', 'blöd', 'doof', 'ätzend', 'zum kotzen', 'pisst', 'fuck'
    ],
    patterns: [
      /😤|😡|🤬|💢/,
      /schon\s*wieder/i,
      /warum\s*(geht|klappt|funktioniert).*nicht/i,
      /immer\s*(das\s*)?gleiche/i,
      /jedes\s*mal/i,
      /versteh.*nicht/i,
      /kapier.*nicht/i
    ]
  },
  stressed: {
    words: [
      'stress', 'hektik', 'chaos', 'überfordert', 'überlastet', 'zeitdruck',
      'schnell', 'eilig', 'dringend', 'muss', 'deadline', 'keine zeit'
    ],
    patterns: [
      /😰|😓|🥵|⏰|⚡/,
      /keine\s*zeit/i,
      /muss\s*schnell/i,
      /kurz\s*und\s*(knapp|bündig)/i,
      /nur\s*kurz/i,
      /in\s*eile/i,
      /schnelle?\s*(frage|antwort)/i
    ]
  },
  curious: {
    words: [
      'warum', 'wieso', 'weshalb', 'wie', 'was', 'interessant', 'spannend',
      'erkläre', 'erklär', 'verstehen', 'lernen', 'wissen', 'neugierig'
    ],
    patterns: [
      /🤔|🧐|❓|💡/,
      /wie\s*(funktioniert|geht|macht\s*man)/i,
      /was\s*(ist|bedeutet|heißt)/i,
      /kannst\s*du.*erklären/i,
      /würde.*gerne\s*(verstehen|wissen)/i,
      /erzähl.*mehr/i
    ]
  },
  neutral: {
    words: [],
    patterns: []
  }
};

// Intensitäts-Verstärker
const INTENSITY_BOOSTERS = [
  'sehr', 'extrem', 'mega', 'ultra', 'total', 'komplett', 'absolut',
  'richtig', 'echt', 'wirklich', 'so', 'voll', 'krass'
];

/**
 * Analysiert die Stimmung einer User-Nachricht
 */
export function detectMood(text: string): MoodResult {
  if (!text || text.length < 2) {
    return { mood: 'neutral', confidence: 0.5, indicators: [], intensityScore: 5 };
  }

  const lowerText = text.toLowerCase();
  const scores: Record<MoodType, { score: number; indicators: string[] }> = {
    positive: { score: 0, indicators: [] },
    negative: { score: 0, indicators: [] },
    frustrated: { score: 0, indicators: [] },
    stressed: { score: 0, indicators: [] },
    curious: { score: 0, indicators: [] },
    neutral: { score: 0.5, indicators: [] }  // Baseline
  };

  // Check für Intensitäts-Verstärker
  const hasIntensifier = INTENSITY_BOOSTERS.some(b => lowerText.includes(b));
  const intensityMultiplier = hasIntensifier ? 1.3 : 1.0;

  // Analysiere jede Mood-Kategorie
  for (const [mood, indicators] of Object.entries(MOOD_INDICATORS)) {
    if (mood === 'neutral') continue;

    const moodKey = mood as MoodType;

    // Word matches
    for (const word of indicators.words) {
      if (lowerText.includes(word)) {
        scores[moodKey].score += 1 * intensityMultiplier;
        scores[moodKey].indicators.push(word);
      }
    }

    // Pattern matches (stärker gewichtet)
    for (const pattern of indicators.patterns) {
      if (pattern.test(text)) {
        scores[moodKey].score += 1.5 * intensityMultiplier;
        const match = text.match(pattern);
        if (match) scores[moodKey].indicators.push(match[0]);
      }
    }
  }

  // Finde die dominante Stimmung
  let dominantMood: MoodType = 'neutral';
  let maxScore = 0.5;

  for (const [mood, data] of Object.entries(scores)) {
    if (data.score > maxScore) {
      maxScore = data.score;
      dominantMood = mood as MoodType;
    }
  }

  // Berechne Confidence (0-1)
  const confidence = Math.min(1, maxScore / 5);

  // Berechne Intensität (1-10)
  const intensityScore = Math.min(10, Math.max(1, Math.round(maxScore * 2 + 3)));

  return {
    mood: dominantMood,
    confidence,
    indicators: scores[dominantMood].indicators,
    intensityScore
  };
}

/**
 * Generiert Response-Guidelines basierend auf erkannter Stimmung
 * Diese werden auf die Persona-Dials angewendet
 */
export function getResponseGuidelines(moodResult: MoodResult): ResponseGuidelines {
  const { mood, intensityScore } = moodResult;

  switch (mood) {
    case 'positive':
      return {
        tone: 'energetic',
        length: 'normal',
        emojiUsage: 'yes',
        proactive: true,
        celebration: true,
        openingStyle: intensityScore >= 7 ? 'Stark!' : undefined,
        warmthBoost: 1,
        directnessBoost: 1,
        challengeBoost: 1  // Momentum nutzen
      };

    case 'negative':
      return {
        tone: 'supportive',
        length: intensityScore >= 7 ? 'shorter' : 'normal',
        emojiUsage: 'minimal',
        proactive: false,
        celebration: false,
        openingStyle: 'Ich verstehe...',
        warmthBoost: 3,      // Viel mehr Wärme
        directnessBoost: -2, // Weniger direkt
        challengeBoost: -3   // Nicht fordern
      };

    case 'frustrated':
      return {
        tone: 'empathetic',
        length: 'shorter',
        emojiUsage: 'no',
        proactive: false,
        celebration: false,
        openingStyle: 'Das ist echt nervig...',
        warmthBoost: 2,
        directnessBoost: -1,
        challengeBoost: -2
      };

    case 'stressed':
      return {
        tone: 'concise',
        length: 'very_short',  // KRITISCH: Kurz halten!
        emojiUsage: 'no',
        proactive: false,
        celebration: false,
        openingStyle: undefined,  // Direkt zur Sache
        warmthBoost: 0,
        directnessBoost: 2,  // Mehr auf den Punkt
        challengeBoost: -1
      };

    case 'curious':
      return {
        tone: 'educational',
        length: 'longer',  // Darf ausführlicher sein
        emojiUsage: 'minimal',
        proactive: true,
        celebration: false,
        openingStyle: undefined,
        warmthBoost: 0,
        directnessBoost: 0,
        challengeBoost: 0
      };

    case 'neutral':
    default:
      return {
        tone: 'balanced',
        length: 'normal',
        emojiUsage: 'yes',
        proactive: true,
        celebration: false,
        warmthBoost: 0,
        directnessBoost: 0,
        challengeBoost: 0
      };
  }
}

/**
 * Generiert den Mood-Abschnitt für den System-Prompt
 */
export function buildMoodPromptSection(moodResult: MoodResult, guidelines: ResponseGuidelines): string {
  if (moodResult.mood === 'neutral' && moodResult.confidence < 0.6) {
    return '';  // Keine spezielle Anweisung bei neutraler Stimmung
  }

  const sections: string[] = [];

  sections.push('== AKTUELLE USER-STIMMUNG ==');
  sections.push(`Erkannte Stimmung: ${moodResult.mood.toUpperCase()} (Konfidenz: ${Math.round(moodResult.confidence * 100)}%)`);
  
  if (moodResult.indicators.length > 0) {
    sections.push(`Indikatoren: ${moodResult.indicators.slice(0, 3).join(', ')}`);
  }

  sections.push('');
  sections.push('### ANPASSUNGEN FÜR DIESE NACHRICHT:');

  // Ton
  const toneDescriptions: Record<ResponseGuidelines['tone'], string> = {
    'energetic': 'Sei energetisch und feiere mit!',
    'balanced': 'Bleib ausgewogen.',
    'empathetic': 'Zeige Verständnis und Empathie.',
    'supportive': 'Sei unterstützend und aufbauend.',
    'concise': 'Komm auf den Punkt, kein Smalltalk!',
    'educational': 'Erkläre gerne ausführlicher.'
  };
  sections.push(`- Ton: ${toneDescriptions[guidelines.tone]}`);

  // Länge
  const lengthDescriptions: Record<ResponseGuidelines['length'], string> = {
    'very_short': 'SEHR KURZ halten! Max 50 Wörter.',
    'shorter': 'Kürzer als normal, max 100 Wörter.',
    'normal': 'Normale Länge (100-200 Wörter).',
    'longer': 'Darf ausführlicher sein (bis 300 Wörter).'
  };
  sections.push(`- Länge: ${lengthDescriptions[guidelines.length]}`);

  // Emoji
  if (guidelines.emojiUsage === 'no') {
    sections.push('- Emojis: KEINE Emojis in dieser Antwort!');
  } else if (guidelines.emojiUsage === 'minimal') {
    sections.push('- Emojis: Maximal 1 Emoji, wenn überhaupt.');
  }

  // Proaktivität
  if (!guidelines.proactive) {
    sections.push('- Proaktivität: KEINE proaktiven Vorschläge jetzt!');
  }

  // Celebration
  if (guidelines.celebration) {
    sections.push('- Feiere den Erfolg des Users mit!');
  }

  // Opening Style
  if (guidelines.openingStyle) {
    sections.push(`- Starte mit: "${guidelines.openingStyle}"`);
  }

  return sections.join('\n');
}

/**
 * Wendet Mood-basierte Dial-Anpassungen auf Persona-Dials an
 */
export function applyMoodToDials(
  baseDials: { energy: number; directness: number; warmth: number; challenge: number; [key: string]: number },
  guidelines: ResponseGuidelines
): typeof baseDials {
  const adjusted = { ...baseDials };

  // Warmth anpassen
  adjusted.warmth = Math.max(1, Math.min(10, adjusted.warmth + guidelines.warmthBoost));

  // Directness anpassen
  adjusted.directness = Math.max(1, Math.min(10, adjusted.directness + guidelines.directnessBoost));

  // Challenge anpassen
  adjusted.challenge = Math.max(1, Math.min(10, adjusted.challenge + guidelines.challengeBoost));

  return adjusted;
}

export default {
  detectMood,
  getResponseGuidelines,
  buildMoodPromptSection,
  applyMoodToDials
};
