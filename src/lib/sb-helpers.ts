export async function safeSingle<T>(q: any, fallback: T | null = null)
: Promise<{ data: T | null, error: any | null }> {
  try {
    const { data, error } = await q.maybeSingle();
    if (error?.code === 'PGRST116') {
      const { data: arr } = await q.limit(1);
      return { data: (arr?.[0] ?? fallback) as T | null, error: null };
    }
    return { data: (data ?? fallback) as T | null, error };
  } catch (e) { return { data: fallback, error: e }; }
}