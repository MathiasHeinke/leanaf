
# Implementation: Protocol-Driven Goal Configurator

## Zusammenfassung

Die "Ziele"-Sektion wird von 5+ unzusammenhängenden Inputs zu einem **protokollbasierten 3-Slider-System** refaktoriert:

1. **Weight Delta Slider** (-20kg bis +15kg)
2. **Muscle Goal Toggle** (Erhalt vs. Aufbau)
3. **Protocol Tempo Selector** (12M / 6M / 4M)

Das System berechnet automatisch `targetWeight`, `targetDate` und den `realismScore`.

## Neue Komponente

### `src/components/profile/GoalConfigurator.tsx`

```text
Props:
- currentWeight: number
- weightDelta: number / setWeightDelta
- muscleGoal: 'maintain' | 'build' / setMuscleGoal
- protocolTempo: 'sustainable' | 'standard' | 'aggressive' / setProtocolTempo
- realismScore: number (computed)
```

**UI-Struktur:**

```text
+---------------------------------------------------+
| GEWICHTS-ZIEL                                     |
|                                                   |
|   -20kg ────────⚫───────────── +15kg             |
|   85 kg → 78 kg  (-7 kg)                          |
+---------------------------------------------------+
| MODUS                                             |
|                                                   |
|  [Rekomposition]  [Aufbau]                        |
|   (Erhalt)        (Lean Bulk)                     |
+---------------------------------------------------+
| PROTOKOLL-TEMPO                                   |
|                                                   |
|  [ Nachhaltig ]  [ Standard ]  [ Aggressiv ]     |
|     12 Monate      6 Monate      4 Monate         |
|                                                   |
|   → Zieldatum: 27.07.2027                         |
+---------------------------------------------------+
| ERFOLGSWAHRSCHEINLICHKEIT                         |
|                                                   |
|   ████████████████░░░░░░░░  78%                   |
|   Ambitioniert aber machbar                       |
|                                                   |
|   = 0.27 kg/Woche, -290 kcal/Tag                  |
+---------------------------------------------------+
```

## Änderungen in Profile.tsx

### States zu entfernen

| State | Zeile | Grund |
|-------|-------|-------|
| `goalType` | 53 | Immer 'weight' (simplifiziert) |
| `targetBodyFat` | 54 | KFA wird aus body_measurements abgeleitet |
| `targetWeight` | 51 | Wird berechnet: `weight + weightDelta` |
| `targetDate` | 52 | Wird berechnet aus `protocolTempo` |

### Neue States

```typescript
const [weightDelta, setWeightDelta] = useState(0); // -20 bis +15
const [muscleGoal, setMuscleGoal] = useState<'maintain' | 'build'>('maintain');
const [protocolTempo, setProtocolTempo] = useState<'sustainable' | 'standard' | 'aggressive'>('standard');
```

### Computed Values

```typescript
// Berechnung aus weightDelta
const computedTargetWeight = useMemo(() => {
  const currentW = parseFloat(weight) || 80;
  return currentW + weightDelta;
}, [weight, weightDelta]);

// Berechnung aus protocolTempo
const computedTargetDate = useMemo(() => {
  const months = { sustainable: 12, standard: 6, aggressive: 4 };
  return addMonths(new Date(), months[protocolTempo]);
}, [protocolTempo]);

// Goal ableiten aus weightDelta
const computedGoal = useMemo(() => {
  if (weightDelta < -1) return 'lose';
  if (weightDelta > 1) return 'gain';
  return 'maintain';
}, [weightDelta]);
```

## UI-Änderungen in Profile.tsx

### Zu entfernender Code (Zeilen 850-1029)

Die gesamte "Ziele" Card wird ersetzt durch:

```tsx
<GoalConfigurator
  currentWeight={parseFloat(weight) || 80}
  weightDelta={weightDelta}
  setWeightDelta={setWeightDelta}
  muscleGoal={muscleGoal}
  setMuscleGoal={setMuscleGoal}
  protocolTempo={protocolTempo}
  setProtocolTempo={setProtocolTempo}
  realismScore={realismScore}
  tdee={tdee || 2000}
/>

{/* Water Goal bleibt separat */}
<Card className="mt-4">
  <CardContent className="pt-5">
    <FluidGoalSlider value={fluidGoalMl} onChange={setFluidGoalMl} />
  </CardContent>
</Card>
```

## Database Save Logic

In `performSave()` (Zeile 489):

```typescript
const profileData = {
  // ... andere Felder
  goal: computedGoal,                              // 'lose'|'maintain'|'gain'
  target_weight: computedTargetWeight,             // berechnet
  target_date: format(computedTargetDate, 'yyyy-MM-dd'),
  goal_type: 'weight',                             // immer 'weight'
  muscle_maintenance_priority: muscleGoal === 'maintain',
  // NEU: Protocol Tempo speichern
  protocol_tempo: protocolTempo,                   // 'sustainable'|'standard'|'aggressive'
};
```

## Realismus Calculator Update

### `src/utils/realismCalculator.ts`

Erweiterung um Tempo-Awareness:

```typescript
export interface TransformationGoals {
  currentWeight: number;
  targetWeight: number;
  currentBodyFat?: number;
  targetBodyFat?: number;
  targetDate: Date;
  protocolTempo?: 'sustainable' | 'standard' | 'aggressive'; // NEU
}

// Tempo-spezifische Labels
export function getTempoAwareLabel(score: number, tempo: string): string {
  if (tempo === 'aggressive' && score < 60) {
    return "Aggressives Tempo - Hohes Risiko, erfordert strikte Disziplin";
  }
  // ... bestehende Logik
}
```

## Dateien

| Datei | Aktion |
|-------|--------|
| `src/components/profile/GoalConfigurator.tsx` | NEU erstellen |
| `src/pages/Profile.tsx` | States ändern, UI ersetzen |
| `src/utils/realismCalculator.ts` | Tempo-Parameter hinzufügen |

## Migrations-Logik (beim Laden)

Für bestehende Profile mit `target_weight` und `target_date`:

```typescript
// In loadProfile():
if (data.target_weight && data.weight) {
  setWeightDelta(data.target_weight - data.weight);
}
if (data.target_date) {
  // Ermittle Tempo aus Datum
  const weeksToTarget = differenceInWeeks(new Date(data.target_date), new Date());
  if (weeksToTarget >= 48) setProtocolTempo('sustainable');
  else if (weeksToTarget >= 20) setProtocolTempo('standard');
  else setProtocolTempo('aggressive');
}
```

## Erwartetes Ergebnis

| Vorher | Nachher |
|--------|---------|
| 5 separate Inputs | 3 intuitive Controls |
| Manuelle Datumsauswahl | Protokoll-Tempo wählt Timeline |
| Keine Muskel-Option | Klarer Maintain/Build Toggle |
| Abstrakte Datumswahl | "Aggressiv/Standard/Nachhaltig" |
| ~180 Zeilen Goal-Code | ~40 Zeilen + Komponente |
