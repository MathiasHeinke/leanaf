# Memory: features/training-live-workout-companion-v1
Updated: Now

## ARES Live Workout Companion (Phase 2)

ARES becomes an interactive workout coach that guides users through exercises in real-time within the chat interface.

### Core Components

| Component | Path | Purpose |
|-----------|------|---------|
| `useLiveWorkout` | `src/hooks/useLiveWorkout.ts` | State management with LocalStorage persistence |
| `LiveExerciseCard` | `src/components/ares/cards/LiveExerciseCard.tsx` | Compact, mobile-first interactive exercise card |
| `LiveWorkoutBanner` | `src/components/ares/LiveWorkoutBanner.tsx` | Sticky progress banner during active workout |
| `start_live_workout` | `coach-orchestrator-enhanced` | Edge function tool that generates workout plans |

### State Management

```typescript
interface LiveWorkoutState {
  session_id: string;
  user_id: string;
  status: 'planning' | 'active' | 'paused' | 'completed';
  workout_type: string;  // push, pull, legs, etc.
  exercises: LiveExercise[];
  current_exercise_index: number;
  session_started_at: string;
  completed_exercises: CompletedExercise[];
}
```

### LocalStorage Persistence
- Key: `ares_live_workout`
- Auto-saves on every state change
- Recovery dialog appears when user returns with active session
- Survives app closes, tab switches, browser crashes

### Dual-Write on Completion
When a workout finishes, data is saved to:
1. **Layer 2**: `training_sessions` table (quick stats)
2. **Layer 3**: `exercise_sessions` + `exercise_sets` tables (detailed data)

### Progression Logic
- If last RPE < 8: Suggest +2.5kg
- If last RPE >= 9: Keep same weight
- Historical data loaded from `exercise_sets` via `exercise_sessions`

### Tool Definition
```typescript
{
  name: "start_live_workout",
  parameters: {
    workout_type: ["push", "pull", "legs", "upper", "lower", "full_body"],
    exercise_count: 3-8,
    target_duration_minutes: default 45,
    use_last_workout: boolean
  }
}
```

### Activation Flow
1. User says "Start Push Day" or similar
2. ARES calls `start_live_workout` tool
3. Tool generates plan with progression suggestions
4. Frontend detects tool result and calls `liveWorkout.startSession(plan)`
5. LiveWorkoutBanner appears, LiveExerciseCard shows first exercise
6. User completes exercises one by one
7. On finish: Dual-write to DB, toast success, cleanup localStorage
