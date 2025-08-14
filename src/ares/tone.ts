// ARES Tone Engine - Humor ↔ Härte aus Protokoll
import { AresConfig, ProtocolState, ArchetypeBlend } from './types';

export function mapLinear(x: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  const clamped = Math.min(Math.max(x, inMin), inMax);
  return outMin + (outMax - outMin) * ((clamped - inMin) / (inMax - inMin));
}

export function normalizeBlend(blend: ArchetypeBlend): Record<string, number> {
  const keys = Object.keys(blend) as (keyof ArchetypeBlend)[];
  const sum = keys.reduce((s,k)=> s + (blend[k] ?? 0), 0) || 1;
  const norm: Record<string, number> = {};
  keys.forEach(k => norm[k] = (blend[k] ?? 0) / sum);
  return norm;
}

export function computeRunScore(p: ProtocolState) {
  const last = p.dev.at(-1);
  if (!last) return 0;
  let score = 0;

  score += (last.mood ?? 6) - 5;
  score -= (last.misses ?? 0) * 0.5;
  score -= (last.alcohol_units ?? 0) * 0.5;
  if (typeof last.hrv_drop_pct === 'number') score += (last.hrv_drop_pct >= 0 ? 0.5 : -0.5);
  if ((last.sleep_hours ?? 7) >= 7) score += 0.5; else score -= 0.5;
  score += (last.wins ?? 0) * 0.2;

  return Math.max(-3, Math.min(3, score));
}

export function humorHardness(runScore: number, bias = 0) {
  // -1 = sehr hart, +1 = humorvoll/warm
  const base = mapLinear(runScore, -3, 3, -0.7, +0.7);
  return Math.max(-1, Math.min(1, base + bias));
}