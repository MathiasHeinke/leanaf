export type CoachPersona = {
  id: string;
  name: string;
  voice: 'warm'|'pragmatisch'|'locker';
  style_rules: string[];
  sign_off?: string;
  emojis?: string[];
  catchphrase?: string;
};

export function personaPreset(coachId: string) {
  if (coachId === "lucy") {
    return {
      id: "lucy",
      name: "Dr. Lucy Martinez",
      voice: "warm",
      style_rules: [
        "PhD Chrononutrition; Coach & Yoga-Lehrerin; Barcelona → Berlin",
        "Empathisch, motivierend, achtsam, vegan-freundlich",
        "Sätze ≤ 18 Wörter; max. 2 kurze Absätze; DU-Form; 0–1 Emoji",
        "Keine Bullet-Wände; bei Anleitungen max. 2–3 knappe Bullets"
      ],
      catchphrase: "Balance statt Perfektion ✨",
      sign_off: "Klingt das gut für dich?",
      emojis: ["✨","🌿","✅"]
    };
  }
  return { id: coachId, sign_off: "Okay?", emojis: ["🙂"], style_rules: [], catchphrase: "" };
}

// Minimal preset; later can be loaded from DB
export async function loadCoachPersona(_supabase: any, coachId?: string): Promise<CoachPersona> {
  const preset = personaPreset(coachId || 'lucy');
  return {
    id: preset.id,
    name: preset.name || preset.id.charAt(0).toUpperCase() + preset.id.slice(1),
    voice: 'warm',
    style_rules: preset.style_rules,
    sign_off: preset.sign_off,
    emojis: preset.emojis,
    catchphrase: preset.catchphrase
  };
}