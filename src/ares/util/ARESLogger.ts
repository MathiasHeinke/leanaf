const buckets = new Map<string, { n: number; t: number; sample?: any }>();
const WINDOW = 60_000;

export function logOnce(cat: string, msg: string, sample?: any) {
  const now = Date.now();
  const b = buckets.get(cat) ?? { n: 0, t: 0 };
  b.n++;
  if (now - b.t > WINDOW) {
    console.warn(`[ARES:${cat}] ${msg}${b.n>1 ? ` (${b.n}x)` : ''}`, sample);
    b.t = now; b.sample = sample; b.n = 0;
  }
  buckets.set(cat, b);
}