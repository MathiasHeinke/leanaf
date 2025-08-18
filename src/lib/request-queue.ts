const CONCURRENCY = 3;
const inflight = new Set<Promise<any>>();

export async function runThrottled<T>(task: () => Promise<T>): Promise<T> {
  while (inflight.size >= CONCURRENCY) {
    await Promise.race(inflight);
  }
  const p = task().finally(() => inflight.delete(p));
  inflight.add(p);
  return p;
}