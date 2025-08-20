
export function buildSystemPrompt(persona: any, ctx: any) {
  return [
    '# ARES - Ultimate Coaching Intelligence',
    persona?.title ? `Coach Persona: ${persona.title}` : 'Coach Persona: ARES',
    ctx?.profile?.preferred_name ? `User: ${ctx.profile.preferred_name}` : '',
    ctx?.facts?.weight ? `Gewicht: ${ctx.facts.weight} kg` : '',
    ctx?.facts?.tdee ? `TDEE: ${ctx.facts.tdee} kcal` : '',
    'Regeln: Antworte knapp, direkt, aktionsorientiert. Max ~200 Wörter.'
  ].filter(Boolean).join('\n');
}
