// ARES Generator - Satzlänge linear, Archetyp linear
import { AresConfig, ProtocolState, Archetype } from './types';
import { VOICE_LINES, ARES_SIGNATURES } from './voicepack';
import { humorHardness, normalizeBlend, mapLinear, computeRunScore } from './tone';

function wordClamp(text: string, cfg: AresConfig) {
  const words = text.split(/\s+/);
  const target = Math.round(mapLinear(cfg.sentenceLength.scale, 0, 1, cfg.sentenceLength.minWords, cfg.sentenceLength.maxWords));
  if (words.length <= target) return text;
  return words.slice(0, target).join(' ').replace(/[.,;:!?]*$/, '.');
}

export interface GenerateInput {
  cfg: AresConfig;
  state: ProtocolState;
  contextTags?: string[]; // 'sleep','missed','push-day','evening',...
}

export interface GenerateOutput {
  text: string;
  archetypePicked: Archetype;
  tone: 'hard'|'warm'|'humor';
  meta: { targetWords: number; runScore: number; humorHardness: number; }
}

export function generateLine({ cfg, state, contextTags = [] }: GenerateInput): GenerateOutput {
  const runScore = computeRunScore(state);
  const hh = humorHardness(runScore, cfg.humorHardnessBias ?? 0);
  const tonePref: 'hard'|'warm'|'humor' = hh > 0.2 ? 'humor' : (hh < -0.2 ? 'hard' : 'warm');

  const blend = normalizeBlend(cfg.archetypeBlend);
  if (cfg.allowDrill === false && blend['drill'] > 0) blend['drill'] = 0;

  const weighted: { line: typeof VOICE_LINES[number]; w: number }[] = [];
  for (const line of VOICE_LINES) {
    const wA = (blend[line.archetype] ?? 0);
    const wT = (tonePref === line.tone ? 1.0 : 0.5);
    const wC = contextTags.length ? (line.tags?.some(t => contextTags.includes(t)) ? 1.1 : 1.0) : 1.0;
    const w = wA * wT * wC;
    if (w > 0) weighted.push({ line, w });
  }

  const pool = weighted.length ? weighted : ARES_SIGNATURES.map(l => ({ line: l, w: 1 }));
  const sum = pool.reduce((s,x)=> s + x.w, 0);
  let r = Math.random()*sum;
  let chosen = pool[0].line;
  for (const x of pool) { r -= x.w; if (r <= 0) { chosen = x.line; break; } }

  const text = wordClamp(chosen.text, cfg);

  return {
    text,
    archetypePicked: chosen.archetype,
    tone: chosen.tone ?? 'warm',
    meta: {
      targetWords: Math.round(mapLinear(cfg.sentenceLength.scale, 0, 1, cfg.sentenceLength.minWords, cfg.sentenceLength.maxWords)),
      runScore,
      humorHardness: hh,
    }
  };
}