// Anti-Repeat Guard: Prevents robotic repetition
const RECENT_WINDOW = 12; // Last 12 responses to check
const SIM_THRESHOLD = 0.85; // Semantic similarity (0-1)

export type HistoryItem = { 
  text: string; 
  ts: number; 
  kind: "short" | "deep" | "goal" | "tip"; 
};

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