// Message History: Separate from name resolver for anti-repeat functionality
export type MessageHistoryItem = { 
  text: string; 
  ts: number; 
  kind: "short" | "deep" | "goal" | "tip"; 
};

export async function loadMessageHistory(
  supabase: any,
  userId: string,
  coachId: string = 'ares'
): Promise<MessageHistoryItem[]> {
  try {
    const { data } = await supabase
      .from('coach_runtime_state')
      .select('state_value')
      .eq('user_id', userId)
      .eq('coach_id', coachId)
      .eq('state_key', 'message_history')
      .single();
    
    return data?.state_value?.history || [];
  } catch {
    return [];
  }
}

export async function saveMessageHistory(
  supabase: any,
  userId: string,
  history: MessageHistoryItem[],
  coachId: string = 'ares'
): Promise<void> {
  try {
    await supabase
      .from('coach_runtime_state')
      .upsert({
        user_id: userId,
        coach_id: coachId,
        state_key: 'message_history',
        state_value: { history: history.slice(-12) } // Keep last 12 messages
      });
  } catch (error) {
    console.warn('Failed to save message history:', error);
  }
}