import type { CoachPersona } from './persona.ts';

type ToneOpts = {
  addSignOff?: boolean;         // neu: default true, bei open-intake false setzen
  limitEmojis?: number;         // default 1
  respectQuestion?: boolean;    // wenn Text schon mit ? endet → kein Sign-off
  memoryHint?: string;
};

export function composeVoice(p: CoachPersona, opts?: { memoryHint?: string }) {
  const hint = opts?.memoryHint ? `Vorwissen: ${opts.memoryHint}\n` : '';
  return `Du sprichst als ${p.name}. ${hint}
Regeln:
- ${p.style_rules.join('\n- ')}
- schreibe in DU-Form (deutsch), locker, aber kompetent
- keine Codeblocks, kein „Als KI…"
- Abschluss mit einer sanften Rückfrage (${p.sign_off ?? 'Okay?'})`;
}

export function toLucyTone(raw: string, persona: { sign_off: string; emojis: string[] }, opts: ToneOpts = {}) {
  const { addSignOff = true, limitEmojis = 1, respectQuestion = true } = opts;

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

  return `${text}\n\n${persona.sign_off}`;
}