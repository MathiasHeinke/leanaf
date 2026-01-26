
# TrainingLogger Erweiterung: Ruhetag + Bewegung

## Aktuelle Situation

Der `TrainingLogger` hat nur 4 Kacheln:
- **RPT** (Kraft)
- **Zone 2** (Cardio)
- **VO2 Max** (HIIT)
- **Sauna**

Es fehlen:
1. **Ruhetag** - Aktive Regeneration ohne Training
2. **Bewegung** - Einfache Aktivität mit Schritten/km (Walking, Alltagsbewegung)

Das **alte `QuickWorkoutModal.tsx`** hat diese bereits:
- `pause` Typ mit `did_workout: false`
- `walking` Typ mit `steps` + `distance_km` Feldern

---

## Lösung: 6-Kachel Grid

### Neue Grid-Struktur (3x2)

```text
+-------------+-------------+
| 🏋️ Kraft    | 🌿 Zone 2   |
| (RPT)       |             |
+-------------+-------------+
| 🏃 VO2 Max  | 🔥 Sauna    |
|             |             |
+-------------+-------------+
| 🚶 Bewegung | 😴 Ruhetag  |
| (Steps/km)  | (Pause)     |
+-------------+-------------+
```

---

## Änderungen

### 1. Types erweitern (`src/types/training.ts`)

```typescript
// VORHER:
export type TrainingType = 'rpt' | 'zone2' | 'vo2max' | 'sauna';

// NACHHER:
export type TrainingType = 'rpt' | 'zone2' | 'vo2max' | 'sauna' | 'movement' | 'rest';

// Neue Labels hinzufügen:
export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  // ... existing
  movement: 'Bewegung',
  rest: 'Ruhetag',
};

export const TRAINING_TYPE_ICONS: Record<TrainingType, string> = {
  // ... existing
  movement: '🚶',
  rest: '😴',
};
```

### 2. TrainingLogger erweitern (`src/components/home/loggers/TrainingLogger.tsx`)

**Neue Imports:**
```typescript
import { Footprints, Moon } from 'lucide-react';
```

**Erweiterte trainingTypes Array:**
```typescript
const trainingTypes = [
  { id: 'rpt', label: 'Kraft (RPT)', icon: Dumbbell, color: 'bg-indigo-500', needsTime: false },
  { id: 'zone2', label: 'Zone 2', icon: Activity, color: 'bg-emerald-500', needsTime: true },
  { id: 'vo2max', label: 'VO2 Max', icon: HeartPulse, color: 'bg-rose-500', needsTime: true },
  { id: 'sauna', label: 'Sauna', icon: Flame, color: 'bg-orange-500', needsTime: true },
  { id: 'movement', label: 'Bewegung', icon: Footprints, color: 'bg-teal-500', needsTime: false },  // NEU
  { id: 'rest', label: 'Ruhetag', icon: Moon, color: 'bg-slate-400', needsTime: false },  // NEU
];
```

**Neue State-Variablen:**
```typescript
const [steps, setSteps] = useState<string>('');
const [distanceKm, setDistanceKm] = useState<string>('');
```

**Neue Detail-Sektion für Movement:**
```typescript
{selectedType === 'movement' && (
  <>
    <div className="text-sm font-medium text-muted-foreground">Schritte (optional)</div>
    <NumericInput
      placeholder="8.500"
      value={steps}
      onChange={setSteps}
      allowDecimals={false}
      className="w-32"
    />
    
    <div className="text-sm font-medium text-muted-foreground mt-4">Distanz (optional)</div>
    <div className="flex items-center gap-2">
      <NumericInput
        placeholder="5,2"
        value={distanceKm}
        onChange={setDistanceKm}
        allowDecimals={true}
        className="w-24"
      />
      <span className="text-sm text-muted-foreground">km</span>
    </div>
  </>
)}
```

**Neue Detail-Sektion für Rest:**
```typescript
{selectedType === 'rest' && (
  <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl text-center">
    <span className="text-4xl">😴</span>
    <p className="text-sm text-muted-foreground mt-2">
      Aktive Regeneration – auch Ruhe ist Training!
    </p>
  </div>
)}
```

**handleSave Anpassung:**
```typescript
const handleSave = async () => {
  if (!selectedType) return;
  setIsSaving(true);
  
  // Build session_data
  const sessionData: Record<string, unknown> = {};
  
  // Movement: steps + distance
  if (selectedType === 'movement') {
    if (steps) sessionData.steps = parseInt(steps);
    if (distanceKm) sessionData.distance_km = parseFloat(distanceKm.replace(',', '.'));
  }
  
  // ... existing zone2, vo2max, sauna logic ...
  
  const success = await trackEvent('workout', { 
    training_type: selectedType,
    split_type: selectedType === 'rpt' ? splitType : undefined,
    duration_minutes: selectedTypeConfig?.needsTime ? duration : undefined,
    total_volume_kg: totalVolume ? parseFloat(totalVolume.replace(',', '.')) : undefined,
    session_data: Object.keys(sessionData).length > 0 ? sessionData : undefined,
    // NEU: Ruhetag-Flag
    did_workout: selectedType !== 'rest'
  });
  
  if (success) onClose();
  setIsSaving(false);
};
```

---

## Visueller Vergleich

```text
VORHER (2x2 Grid):              NACHHER (3x2 Grid):
+-------------+-------------+   +-------------+-------------+
| 🏋️ Kraft    | 🌿 Zone 2   |   | 🏋️ Kraft    | 🌿 Zone 2   |
+-------------+-------------+   +-------------+-------------+
| 🏃 VO2 Max  | 🔥 Sauna    |   | 🏃 VO2 Max  | 🔥 Sauna    |
+-------------+-------------+   +-------------+-------------+
                                | 🚶 Bewegung | 😴 Ruhetag  |
                                +-------------+-------------+
```

---

## Movement Detail-Ansicht

```text
+------------------------------------------+
| 🚶 Bewegung ausgewählt                   |
+------------------------------------------+
|                                          |
|   Schritte (optional)                    |
|   +-----------------------------+        |
|   |  8.500                      |        |
|   +-----------------------------+        |
|                                          |
|   Distanz (optional)                     |
|   +------------------+                   |
|   |  5,2             |  km               |
|   +------------------+                   |
|                                          |
+==========================================+
|   [████ Training speichern ████]         |
+==========================================+
```

---

## Dateien

| Datei | Aktion |
|-------|--------|
| `src/types/training.ts` | TrainingType erweitern + Labels |
| `src/components/home/loggers/TrainingLogger.tsx` | 2 neue Kacheln + Detail-Sektionen |

---

## Technische Details

- **Grid bleibt 2 Spalten** (`grid-cols-2`), jetzt mit 3 Rows
- **Kachelhöhe anpassen** von `h-[100px]` auf `h-[90px]` für bessere 6er-Darstellung
- **Steps Input**: Ganzzahl ohne Dezimalen
- **Distance Input**: Mit Dezimalen (Komma-Support via `replace(',', '.')`)
- **Rest Day**: Minimale UI, setzt `did_workout: false` im Payload
