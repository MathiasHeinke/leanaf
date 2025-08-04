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
  sleepDebt: boolean;
  proteinAlert: boolean;
  isYoungUser: boolean;
  militaryContext: boolean;
}

export function deriveSystemFlags(userMsg: string, profile: any = {}, dailyData: any = {}): SystemFlags {
  const userAge = profile.age || profile.birth_year ? new Date().getFullYear() - profile.birth_year : null;
  
  return {
    stressLevel: /gestresst|stress|überfordert|müde|erschöpft/i.test(userMsg),
    bodybuildingQuestion: /(bankdrücken|1\s?rm|split|pump|masse|bulk)/i.test(userMsg),
    alcoholMention: /wein|bier|alkohol|trinken|party/i.test(userMsg),
    cyclePhase: profile.cyclePhase || null,
    supplementMention: /(supplement|vitamine|protein|creatin|magnesium)/i.test(userMsg),
    berlinLocation: profile.location?.toLowerCase().includes('berlin') || false,
    sleepDebt: (dailyData.sleepHours && dailyData.sleepHours < 7) || false,
    proteinAlert: (dailyData.totalProteinToday && profile.weight && (dailyData.totalProteinToday / profile.weight) < 1.6) || false,
    isYoungUser: userAge !== null && userAge < 30,
    militaryContext: /bundeswehr|militär|armee|soldat|truppe|kommando|einsatz/i.test(userMsg)
  };
}

export function buildSystemFlagsPrompt(flags: SystemFlags): string {
  return `################  SYSTEM_FLAGS  ################
${JSON.stringify(flags, null, 2)}

SASCHA_RESPONSE_RULES:
• sleepDebt=true → "Erst Schlaf optimieren, dann Training. Regeneration ist Performance."
• proteinAlert=true → "Protein-Intake ist zu niedrig für deine Ziele. Plan?"
• isYoungUser=false → Militär-Anekdoten erlaubt: "Haben wir bei der Truppe auch so gemacht..."
• militaryContext=true → Direkte Sprache, Kameradschaftston verstärken

MARKUS_RESPONSE_RULES:
• sleepDebt=true → "Schlaf net, wachse net. Ab ins Bett."
• proteinAlert=true → "Ohne Futter wächst nix, Jung."
• bodybuildingQuestion=true → Direkt Old-School Advice, keine Wellness-Spielchen
• alcoholMention=true → "Alkohol stoppt Muskelaufbau. Des bedarfs net."
• supplementMention=true → "Muss net schmecke, muss wirke."

CYCLE_SUPPORT_RULES:
• luteal phase → Snack-Cravings ↑, empfiehl Magnesium + Tryptophan (Banane + Mandeln)
• menstruation → Fokus Eisen + Omega-3, Sleep-Priority

MINDFUL_MICRO_RULES:
• stressLevel=true → biete 15-Sek Atemübung oder Yoga-Stretch (ohne Om-Klischee)

ESCALATION_RULES:
• bodybuildingQuestion=true → "Markus & Sascha sind dafür die Profis – soll ich sie dazu holen?"
`;
}