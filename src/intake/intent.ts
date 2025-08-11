// src/intake/intent.ts

import { ACTION_TOKENS, DOMAIN_TOKENS } from './lexicon';
import { norm, approxTokenMatch, trigramScore } from './fuzzy';

export type Intent = {
  domain: keyof typeof DOMAIN_TOKENS | 'unknown';
  action: 'analyze' | 'recognize' | 'save' | 'update' | 'plan' | 'compare' | 'remind' | 'unknown';
  conf: number;
  text: string;
};

const ACTION_MAP: Record<string, Intent['action']> = {
  analyse: 'analyze',
  analysier: 'analyze',
  analysiere: 'analyze',
  bewertung: 'analyze',
  bewerte: 'analyze',
  check: 'analyze',
  checke: 'analyze',
  checken: 'analyze',
  prüf: 'analyze',
  pruef: 'analyze',
  überprüfen: 'analyze',
  ueberpruefen: 'analyze',
  speicher: 'save',
  speichern: 'save',
  hinzufügen: 'save',
  hinzufuegen: 'save',
  add: 'save',
  log: 'save',
  eintragen: 'save',
  aktualisiere: 'update',
  update: 'update',
  anpassen: 'update',
  ändern: 'update',
  aendere: 'update',
  edit: 'update',
  plan: 'plan',
  plane: 'plan',
  erstelle: 'plan',
  generiere: 'plan',
  recommend: 'plan',
  empfehle: 'plan',
  vorschlag: 'plan',
  vergleiche: 'compare',
  vergleich: 'compare',
  trend: 'compare',
  verlauf: 'compare',
  warum: 'compare',
  wieso: 'compare',
  explain: 'compare',
  erinnern: 'remind',
  reminder: 'remind',
  notify: 'remind',
  benachrichtige: 'remind',
};

export function intentFromText(raw: string): Intent {
  const text = norm(raw).slice(0, 240);
  const tokens = text.split(/\s+/).filter(Boolean);

  const hasActExact = tokens.some((t) => ACTION_TOKENS.includes(t));
  const domainExact = Object.entries(DOMAIN_TOKENS).find(([_, list]) => tokens.some((t) => list.includes(t)))?.[0] as Intent['domain'] | undefined;
  if (hasActExact && domainExact) {
    const actTok = tokens.find((t) => ACTION_TOKENS.includes(t))!;
    return { domain: domainExact, action: ACTION_MAP[actTok] ?? 'analyze', conf: 0.95, text };
  }

  const hasActFuzzy = tokens.some((t) => approxTokenMatch(t, ACTION_TOKENS, 2) || ACTION_TOKENS.some((a) => trigramScore(t, a) >= 0.5));
  let bestDomain: Intent['domain'] = 'unknown',
    bestScore = 0;
  for (const [domain, list] of Object.entries(DOMAIN_TOKENS)) {
    const score = Math.max(
      ...tokens.map((t) =>
        Math.max(list.some((w) => approxTokenMatch(t, [w], 2)) ? 0.8 : 0, ...list.map((w) => trigramScore(t, w)))
      )
    );
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain as Intent['domain'];
    }
  }

  if (hasActFuzzy && bestScore >= 0.55) {
    const actTok = tokens.find((t) => ACTION_TOKENS.includes(t)) ?? 'analyse';
    return { domain: bestDomain, action: ACTION_MAP[actTok] ?? 'analyze', conf: Math.min(0.9, 0.6 + bestScore / 2), text };
  }

  return { domain: 'unknown', action: 'unknown', conf: 0, text };
}
