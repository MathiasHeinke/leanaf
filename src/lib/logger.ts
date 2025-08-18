const buckets = new Map<string, { n: number; last: number; sample?: string }>();
const WINDOW = 60_000;

export function warnOnce(cat: string, msg: string, data?: any) {
  const b = buckets.get(cat) ?? { n: 0, last: 0 };
  b.n++;
  const now = Date.now();
  if (now - b.last > WINDOW) {
    console.warn(`[${cat}] ${msg}${b.n > 1 ? ` (${b.n}x)` : ''}`, data ?? '');
    b.last = now;
    b.sample = msg;
  }
  buckets.set(cat, b);
}

export function flushSummary() {
  console.group('🧾 Error Summary');
  for (const [cat, b] of buckets) {
    console.info(`${cat}: ${b.n}x  — sample: ${b.sample}`);
  }
  console.groupEnd();
  buckets.clear();
}