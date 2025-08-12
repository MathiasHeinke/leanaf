
export type CoachPersona = {
  id: string;
  name: string;
  voice: 'warm'|'pragmatisch'|'locker';
  style_rules: string[];
  sign_off?: string;
  emojis?: string[];
  catchphrase?: string;
};

function normalizeVoice(v?: string): CoachPersona['voice'] {
  const allowed: CoachPersona['voice'][] = ['warm', 'pragmatisch', 'locker'];
  if (v && allowed.includes(v as any)) return v as CoachPersona['voice'];
  return 'warm';
}

export function personaPreset(coachId: string) {
  if (coachId === "lucy") {
    return {
      id: "lucy",
      name: "Dr. Lucy Martinez",
      voice: "warm" as const,
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
  return { id: coachId, sign_off: "Okay?", emojis: ["🙂"], style_rules: [], catchphrase: "", voice: "warm" as const, name: coachId.charAt(0).toUpperCase() + coachId.slice(1) };
}

// Minimal preset; later can be loaded from DB
export async function loadCoachPersona(_supabase: any, coachId?: string): Promise<CoachPersona> {
  const id = coachId || 'lucy';
  // Feature-Flag: enable DB personas for selected coaches (comma-separated list). Defaults to 'lucy'.
  let preferDb = true;
  try {
    // Deno.env is only available in Edge Function runtime
    // Example: PERSONA_FROM_DB_ENABLED="lucy,kai"
    // If not set, default to lucy-only rollout
    // @ts-ignore
    const raw = typeof Deno !== 'undefined' ? (Deno.env.get('PERSONA_FROM_DB_ENABLED') || '') : '';
    const list = raw ? raw.split(',').map(s => s.trim().toLowerCase()) : ['lucy'];
    preferDb = list.includes(id.toLowerCase());
  } catch { /* ignore */ }

  // Try DB first
  try {
    const { data, error } = await _supabase
      .from('coach_personas')
      .select('id, name, title, bio_short, style_rules, catchphrase, sign_off, emojis, voice')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      // Normalize and coerce types
      const style_rules = Array.isArray(data.style_rules) ? data.style_rules as string[] : [];
      const emojis = Array.isArray(data.emojis) ? data.emojis as string[] : [];
      const persona: CoachPersona = {
        id: data.id,
        name: data.name || (id.charAt(0).toUpperCase() + id.slice(1)),
        voice: normalizeVoice(data.voice),
        style_rules,
        sign_off: data.sign_off || undefined,
        emojis,
        catchphrase: data.catchphrase || undefined
      };
      return persona;
    }
  } catch (e) {
    // Swallow and fallback to preset
    console.warn('[persona] DB lookup failed; falling back to preset', { coachId: id, error: String(e) });
  }

  // Fallback to preset (even when preferDb is true, for safety)
  const preset = personaPreset(id);
  return {
    id: preset.id,
    name: preset.name || preset.id.charAt(0).toUpperCase() + preset.id.slice(1),
    voice: normalizeVoice((preset as any).voice),
    style_rules: preset.style_rules,
    sign_off: preset.sign_off,
    emojis: preset.emojis,
    catchphrase: preset.catchphrase
  };
}
