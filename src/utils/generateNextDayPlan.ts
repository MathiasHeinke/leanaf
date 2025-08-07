import { supabase } from '@/integrations/supabase/client';

export interface NextDayPlanData {
  name: string;
  goal: string;
  daysPerWeek: number;
  structure: {
    weekly_structure: Array<{
      day: string;
      focus: string;
      exercises: Array<{
        name: string;
        sets: number;
        reps: string;
        weight?: string;
        rpe?: number;
        rest_seconds?: number;
      }>;
    }>;
    principles?: string[];
  };
  analysis?: string;
}

// Heuristics to classify exercises into split types
function classifyExercise(name: string): 'push' | 'pull' | 'legs' | 'other' {
  const n = name.toLowerCase();
  if (/(bankdr|bench|schrägbank|dips|trizeps|overhead|schulterdr)/.test(n)) return 'push';
  if (/(klimm|pull|rudern|row|lat|bizeps|curl)/.test(n)) return 'pull';
  if (/(kniebeug|squat|beinpresse|kreuzheb|deadlift|hamstring|ausfallschritt|lunge|waden)/.test(n)) return 'legs';
  return 'other';
}

function nextSplit(after: 'push' | 'pull' | 'legs' | 'other'): 'push' | 'pull' | 'legs' {
  if (after === 'push') return 'pull';
  if (after === 'pull') return 'legs';
  return 'push';
}

const DEFAULTS = {
  push: {
    focus: 'Brust/Schultern/Trizeps',
    exercises: ['Bankdrücken', 'Schrägbankdrücken', 'Dips', 'Schulterdrücken', 'Seitheben']
  },
  pull: {
    focus: 'Rücken/Bizeps',
    exercises: ['Klimmzüge', 'Langhantelrudern', 'T-Bar Rudern', 'Face Pulls', 'Langhantel-Curls']
  },
  legs: {
    focus: 'Beine',
    exercises: ['Kniebeugen', 'Beinpresse', 'Rumänisches Kreuzheben', 'Ausfallschritte', 'Wadenheben']
  }
} as const;

export async function generateNextDayPlan(userId: string, lookbackDays = 28): Promise<NextDayPlanData> {
  // Load recent exercise sets with exercise names
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);

  const { data: sets } = await supabase
    .from('exercise_sets')
    .select('created_at, weight_kg, reps, rpe, exercises(name)')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });

  // Determine last session split type and gather favorite exercises
  let lastType: 'push' | 'pull' | 'legs' | 'other' = 'other';
  const counts: Record<'push' | 'pull' | 'legs', Record<string, number>> = {
    push: {}, pull: {}, legs: {}
  };

  for (const s of sets || []) {
    const exName = s.exercises?.name || '';
    if (!exName) continue;
    const type = classifyExercise(exName);
    if (type !== 'other') {
      counts[type][exName] = (counts[type][exName] || 0) + 1;
    }
  }

  // Guess last type from most recent day window
  if (sets && sets.length > 0) {
    // take first 12 sets as last session sample
    const sample = sets.slice(0, 12);
    const c = { push: 0, pull: 0, legs: 0 } as Record<'push'|'pull'|'legs', number>;
    for (const s of sample) {
      const t = classifyExercise(s.exercises?.name || '');
      if (t !== 'other') c[t]++;
    }
    const ordered = Object.entries(c).sort((a,b)=>b[1]-a[1]);
    lastType = (ordered[0]?.[1] ?? 0) > 0 ? (ordered[0][0] as any) : 'other';
  }

  const target = nextSplit(lastType);

  // Build exercise list prioritizing user-used ones
  const usedSorted = Object.entries(counts[target])
    .sort((a,b)=>b[1]-a[1])
    .map(([name]) => name);
  const base = DEFAULTS[target];
  const chosen = Array.from(new Set([...usedSorted, ...base.exercises])).slice(0, 5);

  const exercises = chosen.map((name) => ({
    name,
    sets: 3,
    reps: name.toLowerCase().includes('kniebeugen') || name.toLowerCase().includes('kreuz') ? '5-8' : '8-12',
    weight: '',
    rpe: name.toLowerCase().includes('bank') || name.toLowerCase().includes('kniebeugen') || name.toLowerCase().includes('kreuz') ? 8 : 7,
    rest_seconds: name.toLowerCase().includes('kniebeugen') || name.toLowerCase().includes('kreuz') ? 180 : 120
  }));

  const analysis = `Erkannt: Letzter Tag vermutlich ${lastType.toUpperCase()} → Nächster Tag: ${target.toUpperCase()}.`;

  return {
    name: `PPL – ${target.charAt(0).toUpperCase()+target.slice(1)} (Nächster Tag)`,
    goal: 'hypertrophy',
    daysPerWeek: 1,
    structure: {
      weekly_structure: [
        {
          day: `${target.charAt(0).toUpperCase()+target.slice(1)} Tag`,
          focus: base.focus,
          exercises
        }
      ],
      principles: [
        'Saubere Technik vor Gewicht',
        'Progressiv steigern, wenn RPE ≤ 8',
        'Aufwärmen vor der ersten schweren Übung'
      ]
    },
    analysis
  };
}
