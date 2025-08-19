// Anti-Repeat Guard: Prevents robotic repetition
const RECENT_WINDOW = 12; // Last 12 responses to check
const SIM_THRESHOLD = 0.85; // Semantic similarity (0-1)

export type HistoryItem = {
  text: string;
  ts: number;
  kind: "short" | "deep" | "goal" | "tip";
};

// Persistent history helpers
export async function loadMessageHistory(
  supabase: any,
  userId: string,
  coachId: string
): Promise<HistoryItem[]> {
  try {
    const { data } = await supabase
      .from('coach_runtime_state')
      .select('state_value')
      .eq('user_id', userId)
      .eq('coach_id', `${coachId}_history`)
      .eq('state_key', 'message_history')
      .single();
    return data?.state_value?.history || [];
  } catch {
    return [];
  }
}

export async function persistMessageHistory(
  supabase: any,
  userId: string,
  coachId: string,
  history: HistoryItem[]
): Promise<void> {
  try {
    await supabase.from('coach_runtime_state').upsert({
      user_id: userId,
      coach_id: `${coachId}_history`,
      state_key: 'message_history',
      state_value: { history }
    });
  } catch (error) {
    console.warn('Failed to persist message history:', error);
  }
}

export function isRedundant(
  candidate: string, 
  history: HistoryItem[], 
  sim: (a: string, b: string) => number = simpleSim
): boolean {
  const recent = history.slice(-RECENT_WINDOW);
  const normalizedCandidate = normalize(candidate);
  
  return recent.some(h => 
    sim(normalizedCandidate, normalize(h.text)) >= SIM_THRESHOLD
  );
}

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Simple Jaccard similarity for strings
function simpleSim(a: string, b: string): number {
  const setA = new Set(a.split(/\s+/));
  const setB = new Set(b.split(/\s+/));
  
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = setA.size + setB.size - intersection;
  
  return union > 0 ? intersection / union : 0;
}

export function generateAlternative(
  originalCandidate: string,
  fallbackTexts: string[] = []
): string {
  // Use fallback texts or truncate original
  for (const fallback of fallbackTexts) {
    if (fallback && fallback !== originalCandidate) {
      return fallback;
    }
  }
  
  // Last resort: truncate and modify
  const truncated = originalCandidate.split('.')[0];
  return truncated.length > 20 ? truncated : originalCandidate;
}