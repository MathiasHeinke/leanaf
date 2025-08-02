import safeSupplements from '@/data/safeSupplements.json';

export interface SystemFlags {
  stressLevel: boolean;
  bodybuildingQuestion: boolean;
  alcoholMention: boolean;
  cyclePhase: 'menstruation' | 'follicular' | 'ovulation' | 'luteal' | null;
}

export interface UserProfile {
  cyclePhase?: string;
  supplements?: string[];
  stressLevel?: number;
  location?: string;
}

export interface SpeechStyle {
  emojiMax: number;
  exclamationMax: number;
  sentenceMaxWords: number;
}

export function deriveSystemFlags(userMsg: string, profile: UserProfile): SystemFlags {
  return {
    stressLevel: /gestresst|stress|überfordert|müde|erschöpft/i.test(userMsg),
    bodybuildingQuestion: /(bankdrücken|1\s?rm|split|hypertrophie|masse)/i.test(userMsg),
    alcoholMention: /wein|bier|alkohol|trinken/i.test(userMsg),
    cyclePhase: (profile.cyclePhase as SystemFlags['cyclePhase']) ?? null
  };
}

export function lucyGuard(reply: string, style: SpeechStyle): string {
  // Emoji limit check
  const emojiMatches = reply.match(/\p{Emoji_Presentation}/gu);
  if (emojiMatches && emojiMatches.length > style.emojiMax) {
    // Remove excess emojis
    const emojis = reply.match(/\p{Emoji_Presentation}/gu) || [];
    let count = 0;
    reply = reply.replace(/\p{Emoji_Presentation}/gu, (match) => {
      count++;
      return count <= style.emojiMax ? match : '';
    });
  }

  // Exclamation limit
  reply = reply.replace(/!{3,}/g, '!!');

  // Sentence length check (simplified - just warn, don't truncate)
  const sentences = reply.split(/[.!?]+/);
  const longSentences = sentences.filter(s => s.trim().split(' ').length > style.sentenceMaxWords);
  if (longSentences.length > 0) {
    console.warn(`Lucy: ${longSentences.length} sentences exceed ${style.sentenceMaxWords} words`);
  }

  return reply;
}

export type SupplementCheckResult = 'ok' | 'caution' | 'banned';

export function checkSupplementStack(supplements: string[]): SupplementCheckResult {
  const lowerSupplements = supplements.map(s => s.toLowerCase());
  
  // Check for banned substances
  const bannedFound = safeSupplements.banned.some(banned =>
    lowerSupplements.some(supp => supp.includes(banned.toLowerCase()))
  );
  
  if (bannedFound) return 'banned';
  
  // Check for caution substances
  const cautionFound = safeSupplements.caution.some(caution =>
    lowerSupplements.some(supp => supp.includes(caution.toLowerCase()))
  );
  
  if (cautionFound) return 'caution';
  
  return 'ok';
}

export function getBerlinTip(): string | null {
  // 5% chance to return a Berlin tip
  if (Math.random() < 0.05) {
    const tips = [
      "Hast du schon den Tempeh-Döner an der Warschauer probiert? 🌯",
      "Der vegane Markt am Kollwitzplatz hat die besten Bio-Smoothies! 🥤",
      "Tipp: Zur Goldelse gibt's die knackigsten Buddha Bowls in Charlottenburg 🥗",
      "Geheimtipp: Das Gratitude in Mitte hat hammermäßige Adaptogen-Lattes ☕",
      "Falls du mal in Kreuzberg bist – Veganz hat eine krasse Supplement-Auswahl! 💊"
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }
  return null;
}

export function getCycleNutritionTip(phase: string): string {
  switch (phase) {
    case 'menstruation':
      return "Fokus auf Eisen + Omega-3, Sleep-Priority. Gönn dir warme, nährende Mahlzeiten! 🩸";
    case 'follicular':
      return "Perfekte Zeit für leichte, frische Kost. Viel Grünzeug und komplexe Kohlenhydrate! 🌱";
    case 'ovulation':
      return "Dein Energielevel ist top! Nutze es für intensivere Workouts und proteinreiche Meals! ⚡";
    case 'luteal':
      return "Snack-Cravings normal! Empfehle magnesium- & tryptophanreiche Optionen wie Banane + Mandeln 🍌";
    default:
      return "";
  }
}

export function getStressMindfulnessTip(): string {
  const tips = [
    "Atme 4 Sekunden ein, 4 halten, 4 aus – wiederhole 4x. Das beruhigt dein Nervensystem! 🫁",
    "Kurze Yoga-Flows: Katze-Kuh → Kindhaltung → sanfte Drehung. 2 Minuten reichen! 🧘‍♀️",
    "Grounding: Spüre deine Füße am Boden, nimm 3 tiefe Atemzüge. Du bist hier und jetzt! 🌱"
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}