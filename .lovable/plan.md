

# Phase 2: ARES Live Workout Companion

## Zusammenfassung

ARES wird zum interaktiven Workout-Coach, der live durch das Training führt, Übung für Übung mit Progression-Vorschlägen, Zeitstempeln und automatischer Speicherung in Layer 2 + Layer 3.

---

## Architektur-Überblick

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                         USER FLOW (Mobile Chat)                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User: "Start Push Day"                                                      │
│         ↓                                                                    │
│  ARES: [ruft start_live_workout Tool auf]                                    │
│         ↓                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  LiveWorkoutBanner (sticky oben im Chat)                              │   │
│  │  Push Day • 2/6 Übungen • 12:34                                       │   │
│  │  ━━━━━━━━━━━━━○○○○                                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  LiveExerciseCard (aktuelle Übung)                                    │   │
│  │                                                                       │   │
│  │  💪 Bankdrücken                               Übung 1/6              │   │
│  │  ─────────────────────────────────────────────────────────────       │   │
│  │  Letztes Mal: 77.5kg × 10 × 4 Sets                                   │   │
│  │  Ziel heute:  80kg × 10 × 4 Sets (+2.5kg)                            │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐     │   │
│  │  │  [–] [ 80 ] [+] kg    [–] [ 10 ] [+] ×    RPE [ 7 ]        │     │   │
│  │  └─────────────────────────────────────────────────────────────┘     │   │
│  │                                                                       │   │
│  │  [✓ FERTIG]                                      [⏭ Skip]            │   │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ARES: "Stark! 80kg geschafft 💪 Weiter mit Schulterdrücken..."             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Technische Komponenten

### 1. State Management: `useLiveWorkout.ts`

**Datei:** `src/hooks/useLiveWorkout.ts`

**Features:**
- LocalStorage-Persistenz (crash-safe)
- Server-Sync bei Übungswechsel
- Recovery-Dialog bei App-Neustart
- Automatische Progression (+2.5kg wenn RPE < 8)

**State-Struktur:**
```typescript
interface LiveWorkoutState {
  session_id: string;
  status: 'planning' | 'active' | 'paused' | 'completed';
  workout_type: string;                    // push, pull, legs, etc.
  
  exercises: LiveExercise[];               // Geplante Übungen
  current_exercise_index: number;          // Aktueller Index
  
  session_started_at: string;              // ISO timestamp
  current_exercise_started_at: string;     // Für Dauer-Tracking
  
  completed_exercises: CompletedExercise[]; // Ergebnisse
  last_saved_at: string;                   // Für Sync-Check
}

interface LiveExercise {
  name: string;
  normalized_name: string;
  exercise_id?: string;                    // DB-Match
  planned_sets: number;
  planned_reps: number;
  planned_weight_kg: number;
  planned_rpe: number;
  last_performance?: {                     // Aus exercise_sets geladen
    weight_kg: number;
    reps: number;
    rpe: number;
    date: string;
  };
}

interface CompletedExercise {
  exercise_index: number;
  actual_sets: number;
  actual_reps: number;
  actual_weight_kg: number;
  actual_rpe: number;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
}
```

**Hook-API:**
```typescript
export function useLiveWorkout() {
  return {
    state: LiveWorkoutState | null;
    isActive: boolean;
    isRecovered: boolean;           // True wenn von LocalStorage geladen
    currentExercise: LiveExercise | null;
    progress: { current: number; total: number; percent: number };
    
    // Actions
    startSession: (plan: LiveWorkoutPlan) => void;
    completeExercise: (result: ExerciseResult) => Promise<void>;
    skipExercise: () => void;
    pauseSession: () => void;
    resumeSession: () => void;
    finishSession: () => Promise<void>;
    discardSession: () => void;
  };
}
```

**Persistenz-Logik:**
```typescript
// Bei jeder Änderung: Sofort LocalStorage
useEffect(() => {
  if (state) {
    localStorage.setItem('ares_live_workout', JSON.stringify(state));
  }
}, [state]);

// Bei App-Start: Recovery-Check
useEffect(() => {
  const saved = localStorage.getItem('ares_live_workout');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.status === 'active' || parsed.status === 'paused') {
      setIsRecovered(true);
      setState(parsed);
    }
  }
}, []);
```

---

### 2. UI: `LiveExerciseCard.tsx`

**Datei:** `src/components/ares/cards/LiveExerciseCard.tsx`

**Mobile-First Design:**
- Max 200px Höhe
- Touch-optimierte Stepper (min 44px touch targets)
- Große "FERTIG" Button
- Swipe-Gesten (optional in Phase 2b)

**Struktur:**
```typescript
interface LiveExerciseCardProps {
  exercise: LiveExercise;
  exerciseNumber: number;
  totalExercises: number;
  onComplete: (result: ExerciseResult) => void;
  onSkip: () => void;
  disabled?: boolean;
}

// Inline-State für Eingaben
const [weight, setWeight] = useState(exercise.planned_weight_kg);
const [reps, setReps] = useState(exercise.planned_reps);
const [sets, setSets] = useState(exercise.planned_sets);
const [rpe, setRpe] = useState(exercise.planned_rpe);
```

**UI-Komponenten:**
```text
┌─────────────────────────────────────────────────────────┐
│  Header: Übungsname + Badge (1/6)                       │
│  ─────────────────────────────────────────────────────  │
│  Last Performance: "77.5kg × 10 × 4 (RPE 7)"            │
│  Progression Hint: "+2.5kg empfohlen" (grün)            │
│                                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Weight Stepper: [–] [ 80.0 ] [+] kg               │ │
│  │  Reps Stepper:   [–] [  10  ] [+] ×                │ │
│  │  Sets Stepper:   [–] [   4  ] [+] Sets             │ │
│  │  RPE Slider:     ○━━━━━●━━━━○ 7                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  [✓ FERTIG - Nächste Übung]              [⏭ Skip]      │
└─────────────────────────────────────────────────────────┘
```

---

### 3. Progress Banner: `LiveWorkoutBanner.tsx`

**Datei:** `src/components/ares/LiveWorkoutBanner.tsx`

**Sticky am oberen Chat-Rand während aktivem Workout:**

```typescript
interface LiveWorkoutBannerProps {
  workoutType: string;
  progress: { current: number; total: number };
  elapsedTime: string;             // "12:34"
  onPause: () => void;
  onExpand: () => void;            // Zeigt Übungsliste
}
```

**Kompaktes Design:**
```text
┌─────────────────────────────────────────────────────────┐
│  🔥 Push Day • 2/6 • 12:34            [⏸] [≡]          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━○○○○○                      │
└─────────────────────────────────────────────────────────┘
```

---

### 4. ARES Tool: `start_live_workout`

**Erweiterung in `coach-orchestrator-enhanced/index.ts`:**

**Neue Tool-Definition:**
```typescript
{
  type: "function",
  function: {
    name: "start_live_workout",
    description: "Startet eine interaktive Live-Workout-Session. ARES führt den User Übung für Übung durch das Training.",
    parameters: {
      type: "object",
      properties: {
        workout_type: {
          type: "string",
          enum: ["push", "pull", "legs", "upper", "lower", "full_body"],
          description: "Art des Workouts"
        },
        exercise_count: {
          type: "number",
          description: "Anzahl der Übungen (3-8, default: 5)"
        },
        target_duration_minutes: {
          type: "number",
          description: "Zieldauer in Minuten (default: 45)"
        },
        use_last_workout: {
          type: "boolean",
          description: "True = Übungen vom letzten gleichen Workout übernehmen"
        }
      },
      required: ["workout_type"]
    }
  }
}
```

**Tool-Handler:**
```typescript
async function handleStartLiveWorkout(
  userId: string, 
  supaClient: any, 
  args: any
): Promise<{ success: boolean; result: any }> {
  const workoutType = args.workout_type;
  const exerciseCount = args.exercise_count || 5;
  
  // 1. Lade letzte Performance für diesen Workout-Typ
  const { data: lastWorkout } = await supaClient
    .from('exercise_sessions')
    .select(`
      id, date,
      exercise_sets (
        exercise_id, weight_kg, reps, rpe, set_number,
        exercises (name, muscle_groups)
      )
    `)
    .eq('user_id', userId)
    .eq('workout_type', workoutType)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  // 2. Generiere Trainingsplan mit Progression
  const exercises = generateLiveWorkoutPlan(
    workoutType, 
    exerciseCount, 
    lastWorkout?.exercise_sets || []
  );

  // 3. Berechne Progressionen
  for (const exercise of exercises) {
    if (exercise.last_performance) {
      // +2.5kg wenn letztes RPE < 8
      if ((exercise.last_performance.rpe || 7) < 8) {
        exercise.planned_weight_kg = exercise.last_performance.weight_kg + 2.5;
        exercise.progression_hint = "+2.5kg (RPE war " + exercise.last_performance.rpe + ")";
      } else {
        exercise.planned_weight_kg = exercise.last_performance.weight_kg;
        exercise.progression_hint = "Gewicht halten (RPE war " + exercise.last_performance.rpe + ")";
      }
    }
  }

  return {
    success: true,
    result: {
      tool: "start_live_workout",
      workout_type: workoutType,
      session_id: crypto.randomUUID(),
      exercises,
      estimated_duration_minutes: exerciseCount * 7,
      ares_message: "Los geht's mit deinem " + workoutType.toUpperCase() + " Day! " + 
                    "Erste Übung: " + exercises[0].name + ". " +
                    (exercises[0].progression_hint || "")
    }
  };
}

function generateLiveWorkoutPlan(
  workoutType: string, 
  count: number, 
  lastSets: any[]
): LiveExercise[] {
  const templates: Record<string, string[]> = {
    push: ["Bankdrücken", "Schrägbankdrücken", "Schulterdrücken", "Seitheben", "Trizeps Dips", "Trizeps Pushdown"],
    pull: ["Klimmzüge", "Rudern", "Latzug", "Face Pulls", "Bizeps Curls", "Hammer Curls"],
    legs: ["Kniebeugen", "Beinpresse", "Rumänisches Kreuzheben", "Beinstrecker", "Beinbeuger", "Wadenheben"],
    upper: ["Bankdrücken", "Rudern", "Schulterdrücken", "Latzug", "Bizeps Curls", "Trizeps"],
    lower: ["Kniebeugen", "Rumänisches Kreuzheben", "Beinpresse", "Beinbeuger", "Wadenheben", "Hip Thrusts"],
    full_body: ["Kniebeugen", "Bankdrücken", "Rudern", "Schulterdrücken", "Klimmzüge", "Kreuzheben"]
  };

  const exerciseNames = templates[workoutType] || templates.full_body;
  
  return exerciseNames.slice(0, count).map(name => {
    // Suche letzte Performance für diese Übung
    const lastForExercise = lastSets.find(s => 
      s.exercises?.name?.toLowerCase() === name.toLowerCase()
    );
    
    return {
      name,
      normalized_name: name,
      planned_sets: 4,
      planned_reps: 10,
      planned_weight_kg: lastForExercise?.weight_kg || 40,
      planned_rpe: 7,
      last_performance: lastForExercise ? {
        weight_kg: lastForExercise.weight_kg,
        reps: lastForExercise.reps,
        rpe: lastForExercise.rpe,
        date: "Letzte Session"
      } : undefined
    };
  });
}
```

---

### 5. Chat-Integration: `AresChat.tsx`

**Änderungen:**

```typescript
// Import des Live Workout Hooks
import { useLiveWorkout } from '@/hooks/useLiveWorkout';
import { LiveExerciseCard } from './cards/LiveExerciseCard';
import { LiveWorkoutBanner } from './LiveWorkoutBanner';

export default function AresChat({ ... }: AresChatProps) {
  const liveWorkout = useLiveWorkout();
  
  // Tool-Response Detection
  useEffect(() => {
    // Wenn ARES start_live_workout Tool aufruft, Session starten
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant' && lastMsg.toolResult?.tool === 'start_live_workout') {
      liveWorkout.startSession(lastMsg.toolResult);
    }
  }, [messages]);
  
  // Recovery Dialog
  useEffect(() => {
    if (liveWorkout.isRecovered && !hasShownRecovery) {
      // Toast oder Dialog zeigen
      toast.info("Unbeendetes Workout gefunden", {
        description: `${liveWorkout.state?.workout_type} - ${liveWorkout.progress.current}/${liveWorkout.progress.total} Übungen`,
        action: {
          label: "Fortsetzen",
          onClick: () => liveWorkout.resumeSession()
        },
        cancel: {
          label: "Verwerfen",
          onClick: () => liveWorkout.discardSession()
        }
      });
    }
  }, [liveWorkout.isRecovered]);

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Banner während Live Workout */}
      {liveWorkout.isActive && (
        <LiveWorkoutBanner 
          workoutType={liveWorkout.state.workout_type}
          progress={liveWorkout.progress}
          onPause={liveWorkout.pauseSession}
        />
      )}
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.map(msg => ...)}
        
        {/* Live Exercise Card nach ARES Nachrichten */}
        {liveWorkout.isActive && liveWorkout.currentExercise && (
          <LiveExerciseCard
            exercise={liveWorkout.currentExercise}
            exerciseNumber={liveWorkout.progress.current}
            totalExercises={liveWorkout.progress.total}
            onComplete={async (result) => {
              await liveWorkout.completeExercise(result);
              // ARES generiert automatisch Motivations-Nachricht
            }}
            onSkip={liveWorkout.skipExercise}
          />
        )}
      </div>
      
      {/* Input */}
      <EnhancedChatInput ... />
    </div>
  );
}
```

---

### 6. Dual-Write bei Workout-Abschluss

**Wiederverwendung der training-ai-parser Logik:**

```typescript
// In useLiveWorkout.ts -> finishSession()
async function finishSession() {
  const today = new Date().toISOString().split('T')[0];
  
  // Berechne Statistiken
  const totalVolume = state.completed_exercises.reduce((sum, ex) => 
    sum + (ex.actual_weight_kg * ex.actual_reps * ex.actual_sets), 0
  );
  const totalDuration = Math.round(
    (Date.now() - new Date(state.session_started_at).getTime()) / 60000
  );

  // STEP 1: training_sessions (Layer 2)
  const { data: trainingSession } = await supabase
    .from('training_sessions')
    .insert({
      user_id: userId,
      session_date: today,
      training_type: 'rpt',
      split_type: state.workout_type,
      total_duration_minutes: totalDuration,
      total_volume_kg: totalVolume,
      session_data: {
        source: 'ares_live_workout',
        exercises: state.completed_exercises,
        timestamps: {
          started: state.session_started_at,
          completed: new Date().toISOString()
        }
      }
    })
    .select('id')
    .single();

  // STEP 2: exercise_sessions (Layer 3)
  const { data: exerciseSession } = await supabase
    .from('exercise_sessions')
    .insert({
      user_id: userId,
      date: today,
      session_name: `ARES ${state.workout_type} Live Workout`,
      workout_type: 'strength',
      start_time: state.session_started_at,
      end_time: new Date().toISOString(),
      duration_minutes: totalDuration,
      metadata: { 
        source: 'ares_live_workout', 
        training_session_id: trainingSession.id 
      }
    })
    .select('id')
    .single();

  // STEP 3: exercise_sets (Layer 3) mit Timestamps
  for (const completed of state.completed_exercises) {
    const exercise = state.exercises[completed.exercise_index];
    const exerciseId = await findOrCreateExercise(exercise.normalized_name);
    
    // Ein Set pro Übung (vereinfacht) oder aufgeteilt
    for (let i = 0; i < completed.actual_sets; i++) {
      await supabase.from('exercise_sets').insert({
        session_id: exerciseSession.id,
        user_id: userId,
        exercise_id: exerciseId,
        set_number: i + 1,
        weight_kg: completed.actual_weight_kg,
        reps: completed.actual_reps,
        rpe: completed.actual_rpe,
        date: today,
        started_at: completed.started_at,       // Timestamp!
        completed_at: completed.completed_at,   // Timestamp!
        duration_seconds: completed.duration_seconds,
        origin: 'ares_live_workout'
      });
    }
  }

  // Cleanup
  localStorage.removeItem('ares_live_workout');
  setState(null);
  
  // Query Invalidation
  queryClient.invalidateQueries({ queryKey: ['training-session-today'] });
  queryClient.invalidateQueries({ queryKey: ['exercise-sessions'] });
}
```

---

## Datenbank-Änderungen (Optional)

**Migration für Timing-Spalten:**

```sql
-- Optional: Neue Spalten für exercise_sets
ALTER TABLE exercise_sets
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'manual';
```

---

## Recovery-System

**Szenarien:**

| Szenario | Lösung |
|----------|--------|
| App geschlossen | LocalStorage → Recovery-Toast |
| Browser-Crash | LocalStorage bleibt erhalten |
| Tab-Wechsel | State bleibt in React-Context |
| Netzwerk-Ausfall | Lokale Queue → Sync bei Reconnect |

**Recovery-Dialog:**

```text
┌─────────────────────────────────────────┐
│  🏋️ Unbeendetes Training gefunden       │
│                                         │
│  Push Day - 4 von 6 Übungen             │
│  Gestartet vor 23 Minuten               │
│                                         │
│  [Fortsetzen]         [Verwerfen]       │
└─────────────────────────────────────────┘
```

---

## Datei-Änderungen

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/hooks/useLiveWorkout.ts` | **NEU** | State-Management + Persistenz |
| `src/components/ares/cards/LiveExerciseCard.tsx` | **NEU** | Kompakte interaktive Card |
| `src/components/ares/LiveWorkoutBanner.tsx` | **NEU** | Sticky Progress-Banner |
| `src/components/ares/AresChat.tsx` | **EDIT** | Live-Workout Integration |
| `supabase/functions/coach-orchestrator-enhanced/index.ts` | **EDIT** | `start_live_workout` Tool |
| `supabase/migrations/xxx_add_exercise_timing.sql` | **NEU** | Optional: Timing-Spalten |

---

## Beispiel-Konversation

```text
User: "Hey ARES, ich will heute Push machen"

ARES: "Push-Day! 💪 Basierend auf deinem letzten Training:

       • Bankdrücken: Letztes Mal 77.5kg × 10 → Heute 80kg (+2.5kg)
       • Schrägbank: Letztes Mal 50kg × 10 → Heute 52.5kg
       • Schulterdrücken: 40kg × 10 → Halten (RPE war 8)
       
       [▶️ WORKOUT STARTEN]"

User: *klickt "WORKOUT STARTEN"*

[LiveWorkoutBanner erscheint oben]
[LiveExerciseCard für Bankdrücken erscheint]

ARES: "Los geht's mit Bankdrücken. 4 Sets à 10 Wiederholungen bei 80kg. 
       RPE sollte bei 7 liegen. Gib alles!"

User: *stellt 82.5kg ein, 10 Reps, RPE 8, klickt "FERTIG"*

[Card wechselt automatisch zu Schrägbank]

ARES: "BOOM! 82.5kg 🔥 Das war stark! 
       Weiter mit Schrägbankdrücken. 52.5kg, 4 × 10."

[... nach allen Übungen ...]

ARES: "WORKOUT KOMPLETT! 🎉

       📊 Push Day Zusammenfassung:
       ━━━━━━━━━━━━━━━━━━━━━━━━
       • Dauer: 47 Minuten
       • Volumen: 8.450 kg
       • Durchschnitt-RPE: 7.6
       
       💪 PROGRESSION:
       • Bankdrücken: +5kg vs letzte Woche!
       • Schrägbank: +2.5kg
       
       Alles gespeichert. Du bist ein BEAST!"
```

---

## Aufwandsschätzung

| Komponente | Aufwand | Priorität |
|------------|---------|-----------|
| `useLiveWorkout.ts` Hook | ~3h | P0 |
| `LiveExerciseCard.tsx` | ~3h | P0 |
| `LiveWorkoutBanner.tsx` | ~1h | P0 |
| `start_live_workout` Tool | ~2h | P0 |
| AresChat Integration | ~2h | P0 |
| Dual-Write + Queries | ~2h | P0 |
| Recovery-System | ~1h | P1 |
| DB Migration (optional) | ~0.5h | P2 |

**Gesamt Phase 2: ~14-15 Stunden**

---

## Nächste Schritte

1. **Sprint 1 (Core):** useLiveWorkout + LiveExerciseCard + Tool
2. **Sprint 2 (UX):** Banner + AresChat Integration + Recovery
3. **Sprint 3 (Polish):** Gesten, Voice-Input, Animationen

Das Ergebnis: ARES wird zum ultimativen Gym-Buddy, der live durch das Training führt, alles trackt mit Timestamps, und sogar App-Crashes überlebt.

