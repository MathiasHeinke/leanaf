// CoachPersona type inline to avoid import issues
type CoachPersona = {
  name: string;
  style_rules: string[];
  sign_off?: string;
  emojis?: string[];
};

export type ToneOpts = {
  addSignOff?: boolean;         // neu: default true, bei open-intake false setzen
  limitEmojis?: number;         // default 1
  respectQuestion?: boolean;    // wenn Text schon mit ? endet → kein Sign-off
  memoryHint?: string;
  intensityLevel?: 'low' | 'moderate' | 'high';
};

export function composeVoice(p: CoachPersona, opts?: { memoryHint?: string }) {
  const hint = opts?.memoryHint ? `Vorwissen: ${opts.memoryHint}\n` : '';
  return `Du sprichst als ${p.name}. ${hint}
Regeln:
- ${p.style_rules.join('\n- ')}
- schreibe in DU-Form (deutsch), locker, aber kompetent
- keine Codeblocks, kein „Als KI…"`;
}


export function toLucyTone(raw: string, persona: { sign_off?: string; emojis?: string[] }, opts: ToneOpts = {}) {
  const { addSignOff = false, limitEmojis = 1, respectQuestion = true } = opts;

  let text = String(raw || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // max 2 kurze Absätze
  const parts = text.split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 2);
  text = parts.join("\n\n");

  // Emojis auf max limitEmojis drosseln
  if (limitEmojis >= 0) {
    const emojiRegex = /([\p{Emoji_Presentation}\p{Extended_Pictographic}])/gu;
    let count = 0;
    text = text.replace(emojiRegex, m => (++count <= limitEmojis ? m : ""));
  }

  const alreadyQuestion = /\?\s*$/.test(text);
  if (!addSignOff) return text;                           // << wichtig für Open‑Intake
  if (respectQuestion && alreadyQuestion) return text;

  return `${text}\n\n${persona.sign_off || ''}`;
}

/**
 * ARES Voice Generator - Ultimate Performance Tone
 * Phase 4: Enhanced with dial-specific modifications
 */
export function toAresVoice(raw: string, persona: any, opts: ToneOpts & { dial?: number; archetype?: string; progressData?: any } = {}): string {
  const { addSignOff = false, limitEmojis = 1, respectQuestion = true, dial = 2, archetype = 'smith', progressData } = opts;

  let text = String(raw || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Dial-specific modifications
  if (dial <= 2) {
    // Dial 1-2: Less intensity, more empathy
    text = text
      .replace(/\b(ich denke|vielleicht)\b/gi, "")
      .replace(/\b(könntest|könnten)\b/gi, "kannst")
      .replace(/\bsolltest\b/gi, "solltest")
      .replace(/\bkann\b/gi, "kann");
    
    // Add progress acknowledgment for low dials
    if (progressData?.workout_days > 0) {
      const progressNote = `Du hast ${progressData.workout_days}x trainiert diese Woche – stark.`;
      text = `${progressNote}\n\n${text}`;
    }
  } else if (dial >= 4) {
    // Dial 4-5: More commander/drill intensity
    text = text
      .replace(/\b(ich denke|vielleicht|eventuell|möglicherweise)\b/gi, "")
      .replace(/\b(könntest|könnten)\b/gi, "WIRST")
      .replace(/\?\s*$/g, ".")
      .replace(/\bsolltest\b/gi, "MUSST")
      .replace(/\bkann\b/gi, "WIRD")
      .replace(/\bversuch\b/gi, "MACH");
      
    // Add drill-style directness for high dials
    if (dial === 5) {
      text = text.replace(/\./g, ".").toUpperCase();
    }
  } else {
    // Default ARES style for dial 3
    text = text
      .replace(/\b(ich denke|vielleicht|eventuell|möglicherweise)\b/gi, "")
      .replace(/\b(könntest|könnten)\b/gi, "wirst")
      .replace(/\?\s*$/g, ".")
      .replace(/\bsolltest\b/gi, "MUSST")
      .replace(/\bkann\b/gi, "WIRD");
  }

  // Archetype-specific voice adjustments
  if (archetype === 'father') {
    // Father archetype: More supportive, less aggressive
    text = text
      .replace(/MUSST/g, "solltest")
      .replace(/WIRD/g, "kann");
  } else if (archetype === 'commander') {
    // Commander: Clear directives
    text = text.replace(/\bvielleicht\b/gi, "definitiv");
  } else if (archetype === 'drill') {
    // Drill: Maximum intensity (only for dial 5)
    text = text.replace(/\b(gut|ok|okay)\b/gi, "AUSREICHEND");
  }

  // Add intensity markers based on dial level
  if (dial >= 3 && text.length > 50) {
    const marker = dial >= 4 ? " ⚡" : " ⚡";
    text = text.replace(/\./g, `.${marker}`);
  }

  // max 2 kurze Absätze aber kraftvoller
  const parts = text.split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 2);
  text = parts.join("\n\n");

  // Emojis begrenzen
  if (limitEmojis >= 0) {
    const emojiRegex = /([\p{Emoji_Presentation}\p{Extended_Pictographic}])/gu;
    let count = 0;
    text = text.replace(emojiRegex, m => (++count <= limitEmojis ? m : ""));
  }

  const alreadyQuestion = /\?\s*$/.test(text);
  if (!addSignOff) return text;
  if (respectQuestion && alreadyQuestion) return text;

  // Dial-specific sign-offs
  const dialSignOffs = {
    1: "Du schaffst das. Schritt für Schritt.",
    2: "Weiter. Du bist auf dem richtigen Weg.",
    3: "Weiter. Schwer ist korrekt.",
    4: "Keine Ausreden. Jetzt.",
    5: "MACHEN. SOFORT."
  };

  const aresSignOff = dialSignOffs[dial as keyof typeof dialSignOffs] || persona.sign_off || "Weiter. Schwer ist korrekt.";
  return `${text}\n\n${aresSignOff}`;
}