export async function supabaseRequest<T>(promise: Promise<{ data: T; error: any }>) {
  const { data, error } = await promise;
  if (error) {
    // Optional: Add telemetry here in the future
    // telemetry('supabase_error', { code: error.code, message: error.message });
    throw error;
  }
  return data!;
}