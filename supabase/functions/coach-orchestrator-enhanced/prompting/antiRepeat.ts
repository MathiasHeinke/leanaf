// Anti-Repeat Guard: Prevents robotic repetition (TUNED FOR MORE VARIABILITY)
const RECENT_WINDOW = 8; // Last 8 responses to check (reduced for more freshness)
const SIM_THRESHOLD = 0.75; // Semantic similarity (0-1) - lowered for more variation

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
  // Expanded fallback pool for more variety
  const defaultAlternatives = [
    "Was ist dein nächster konkreter Schritt?",
    "Erzähl mir mehr über deine aktuelle Situation.",
    "Worauf legst du heute den Fokus?",
    "Wie fühlst du dich mit dem bisherigen Fortschritt?",
    "Was brauchst du als nächstes von mir?",
    "Lass uns spezifischer werden - welcher Bereich?",
    "Womit kann ich dir am besten helfen?",
    "Was steht heute auf deiner Prioritätenliste?"
  ];
  
  // Use provided fallbacks first
  for (const fallback of fallbackTexts) {
    if (fallback && fallback !== originalCandidate) {
      return fallback;
    }
  }
  
  // Use random alternative from expanded pool
  const randomAlt = defaultAlternatives[Math.floor(Math.random() * defaultAlternatives.length)];
  
  // Last resort: truncate and modify
  const truncated = originalCandidate.split('.')[0];
  return randomAlt || (truncated.length > 20 ? truncated : originalCandidate);
}