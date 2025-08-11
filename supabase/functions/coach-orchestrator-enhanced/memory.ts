export async function loadRollingSummary(supabase: any, userId: string, coachId: string) {
  try {
    const { data, error } = await supabase
      .from('coach_conversation_memory')
      .select('rolling_summary')
      .eq('user_id', userId)
      .eq('coach_id', coachId)
      .maybeSingle();
    if (error) return '';
    return data?.rolling_summary || '';
  } catch (_e) {
    return '';
  }
}
