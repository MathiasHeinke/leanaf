import type { PostgrestSingleResponse, PostgrestResponse } from "@supabase/supabase-js";

export async function safeQuery<T>(
  promise: Promise<PostgrestSingleResponse<T>>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await promise;
    if (error) {
      console.error('[Supabase Query Error]', error);
      return { data: null, error: error.message || 'Database query failed' };
    }
    return { data, error: null };
  } catch (e: any) {
    console.error('[Supabase Query Exception]', e);
    return { data: null, error: e.message || 'Query execution failed' };
  }
}

export async function safeQueryMany<T>(
  queryBuilder: any
): Promise<{ data: T[] | null; error: string | null }> {
  try {
    const { data, error } = await queryBuilder;
    if (error) {
      console.error('[Supabase Query Error]', error);
      return { data: null, error: error.message || 'Database query failed' };
    }
    return { data: data || [], error: null };
  } catch (e: any) {
    console.error('[Supabase Query Exception]', e);
    return { data: null, error: e.message || 'Query execution failed' };
  }
}