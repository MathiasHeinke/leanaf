/**
 * System Flags Detection for Enhanced Coach Personas
 * Derives contextual flags from user messages and profile data
 */

export interface SystemFlags {
  stressLevel: boolean;
  bodybuildingQuestion: boolean;
  alcoholMention: boolean;
  cyclePhase: string | null;
  supplementMention: boolean;
  berlinLocation: boolean;
}

export function deriveSystemFlags(userMsg: string, profile: any = {}): SystemFlags {
  return {
    stressLevel: /gestresst|stress|überfordert|müde|erschöpft/i.test(userMsg),
    bodybuildingQuestion: /(bankdrücken|1\s?rm|split|pump|masse|bulk)/i.test(userMsg),
    alcoholMention: /wein|bier|alkohol|trinken|party/i.test(userMsg),
    cyclePhase: profile.cyclePhase || null,
    supplementMention: /(supplement|vitamine|protein|creatin|magnesium)/i.test(userMsg),
    berlinLocation: profile.location?.toLowerCase().includes('berlin') || false
  };
}

export function buildSystemFlagsPrompt(flags: SystemFlags): string {
  return `################  SYSTEM_FLAGS  ################
${JSON.stringify(flags, null, 2)}

CYCLE_SUPPORT_RULES:
• luteal phase → Snack-Cravings ↑, empfiehl Magnesium + Tryptophan (Banane + Mandeln)
• menstruation → Fokus Eisen + Omega-3, Sleep-Priority

MINDFUL_MICRO_RULES:
• stressLevel=true → biete 15-Sek Atemübung oder Yoga-Stretch (ohne Om-Klischee)

ESCALATION_RULES:
• bodybuildingQuestion=true → "Markus & Sascha sind dafür die Profis – soll ich sie dazu holen?"
`;
}