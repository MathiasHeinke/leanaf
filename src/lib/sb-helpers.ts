export async function safeSingle<T = any>(
  q: any,
  orderBy = 'created_at',
): Promise<{ data: T | null; error: any }> {
  // 1) defensiv: immer auf 1 Zeile reduzieren
  const q1 = q.order(orderBy as any, { ascending: false }).limit(1);
  const r1 = await q1.maybeSingle();
  if (!r1.error || r1.error?.code !== 'PGRST116') return r1 as any;

  // 2) Fallback für "multiple rows"
  const { data, error } = await q1;
  return { data: Array.isArray(data) ? (data[0] ?? null) : null, error };
}