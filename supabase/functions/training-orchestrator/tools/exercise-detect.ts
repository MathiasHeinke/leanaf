
export type ExerciseGuess = { name: string; confidence: number };

const CATALOG: Record<string, string[]> = {
  "Bankdrücken (liegend)": ["bankdrücken", "flachbank", "bench press", "flat bench", "bd"],
  "Überkopfdrücken (Langhantel)": ["overhead press", "ohp", "shoulder press", "überkopf", "military press"],
  "Rudern Kabel (eng, sitzend)": ["kabelrudern", "rudern eng", "seated row", "row cable", "rudern kabel"],
  "Latzug (weiter Griff)": ["latzug", "lat pull", "pull down", "lats", "breitgriff latzug"],
  "Seitheben (Kurzhanteln)": ["seitheben", "lateral raise", "seitenheben"],
  "Bizepscurls (Kurzhanteln)": ["bizepscurls", "curls", "dumbbell curls", "kurzhantel curls"],
  "Hammercurls (Cross‑Body)": ["hammercurls", "cross-body curl", "über die brust", "hammer curl"],
  "Trizepsdrücken Kabel": ["trizepsdrücken", "trizeps kabel", "tricep pushdown", "pushdown"]
};

function norm(s: string) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}

function distance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function tokenScore(q: string, s: string) {
  const d = distance(norm(q), norm(s));
  const maxLen = Math.max(q.length, s.length);
  return 1 - d / Math.max(1, maxLen);
}

export function detectExerciseFromText(text: string): ExerciseGuess | null {
  const q = norm(text);
  let best: ExerciseGuess | null = null;

  for (const [canonical, syns] of Object.entries(CATALOG)) {
    const scores = syns.map((s) => tokenScore(q, s));
    const score = Math.max(...scores);
    if (!best || score > best.confidence) best = { name: canonical, confidence: +score.toFixed(3) };
  }

  if (best && best.confidence >= 0.55) return best;
  return null;
}
