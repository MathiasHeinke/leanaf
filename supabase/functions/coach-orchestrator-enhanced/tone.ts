import type { CoachPersona } from './persona.ts';

export function composeVoice(p: CoachPersona, opts?: { memoryHint?: string }) {
  const hint = opts?.memoryHint ? `Vorwissen: ${opts.memoryHint}\n` : '';
  return `Du sprichst als ${p.name}. ${hint}
Regeln:
- ${p.style_rules.join('\n- ')}
- schreibe in DU-Form (deutsch), locker, aber kompetent
- keine Codeblocks, kein „Als KI…“
- Abschluss mit einer sanften Rückfrage (${p.sign_off ?? 'Okay?'})`;
}

export function toLucyTone(text: string, persona: CoachPersona, opts?: { memoryHint?: string }) {
  const emoji = (persona.emojis && persona.emojis[0]) || '🙂';
  // Clean text: remove code blocks, excessive asterisks, compress newlines
  let t = String(text || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*{2,}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Limit to max 2 paragraphs
  const paras = t.split(/\n\n+/).slice(0, 2);
  t = paras.join('\n\n');

  // Avoid shouting bullet dumps by normalizing leading dashes
  t = t.replace(/^\s*[-•]\s*/gm, '• ');

  // Add gentle closing question only if not already ending with a question
  const endsWithQuestion = /[?]$/.test(t.trim());
  const signOff = persona.sign_off ?? 'Klingt gut?';
  const closing = endsWithQuestion ? '' : `\n\n${emoji} ${signOff}`;

  return `${t}${closing}`.trim();
}
