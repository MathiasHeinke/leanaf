
# Unified Quick-Log Sheet: Weight, Training, Sleep

## Uebersicht

Ein premium Apple-Health-Style Overlay fuer die drei "Big Three" Tracking-Bereiche, die aktuell fehlen. Das Sheet oeffnet sich vom LiquidDock `+` Button und bietet ein iOS Kontrollzentrum-Feeling mit grossen Touch-Targets und haptischem Feedback.

```text
┌─────────────────────────────────────────┐
│          ═══ (Drag Handle) ═══          │
│                                         │
│   ┌─────────┬─────────┬─────────┐      │
│   │ Gewicht │Training │  Schlaf │ ← iOS Segmented Control
│   │   ●     │         │         │       │
│   └─────────┴─────────┴─────────┘      │
│                                         │
│           ╔═══════════════╗            │
│           ║    85.2       ║  ← Hero Display
│           ║      kg       ║            │
│           ╚═══════════════╝            │
│                                         │
│     [ − 0.1 ]  ○──────●  [ + 0.1 ]     │
│                                         │
│         ┌───────────────────┐          │
│         │    ✓ Speichern    │          │
│         └───────────────────┘          │
└─────────────────────────────────────────┘
```

---

## Datei-Uebersicht

| Aktion | Datei | Beschreibung |
|--------|-------|--------------|
| **CREATE** | `src/components/home/QuickLogSheet.tsx` | Hauptkomponente mit Segmented Control |
| **CREATE** | `src/components/home/loggers/WeightLogger.tsx` | Gewicht-Eingabe mit Stepper |
| **CREATE** | `src/components/home/loggers/TrainingLogger.tsx` | 4-Saeulen Grid + Dauer-Slider |
| **CREATE** | `src/components/home/loggers/SleepLogger.tsx` | Stunden-Slider + Qualitaets-Emojis |
| **MODIFY** | `src/hooks/useAresEvents.ts` | Neue Event-Kategorien: weight, workout, sleep |
| **MODIFY** | `src/hooks/useDailyMetrics.ts` | Erweitern um weight + training + sleep Daten |
| **MODIFY** | `src/pages/AresHome.tsx` | QuickLogSheet Integration + State |
| **MODIFY** | `src/components/home/LiquidDock.tsx` | Props erweitern fuer Sheet-Steuerung |

---

## 1. QuickLogSheet.tsx - Hauptkomponente

### Struktur

```text
QuickLogSheet
├── Backdrop (blur + fade)
├── Sheet Container (slide-up + drag-to-dismiss)
│   ├── Drag Handle
│   ├── Header ("Quick Log")
│   ├── Segmented Control (Weight | Training | Sleep)
│   └── Content Area (AnimatePresence)
│       ├── WeightLogger
│       ├── TrainingLogger
│       └── SleepLogger
```

### Props Interface

```typescript
interface QuickLogSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'weight' | 'training' | 'sleep';
}
```

### Key Features

- **iOS Segmented Control**: Sliding highlight animation mit Framer Motion
- **Drag-to-Dismiss**: `drag="y"` mit `dragConstraints` und `onDragEnd` Threshold
- **AnimatePresence**: Smooth Content-Wechsel zwischen Tabs
- **Height**: `max-h-[70vh]` mit `rounded-t-3xl` fuer Sheet-Feeling

### Segmented Control Animation

```typescript
// Sliding Background berechnung:
const tabWidth = 100 / 3; // 33.33%
const translateX = activeTabIndex * tabWidth;

<motion.div
  className="absolute h-full bg-white dark:bg-zinc-700 rounded-xl shadow-sm"
  style={{ width: `${tabWidth}%` }}
  animate={{ x: `${translateX * 3}%` }}
  transition={{ type: "spring", stiffness: 400, damping: 30 }}
/>
```

---

## 2. WeightLogger.tsx - Gewicht-Eingabe

### Design

```text
┌─────────────────────────────────────────┐
│                                         │
│              ╔═════════════╗            │
│              ║   85.2      ║  ← Riesen-Display
│              ║     kg      ║            │
│              ╚═════════════╝            │
│                                         │
│    ┌───────┐              ┌───────┐    │
│    │ −0.1  │  ○─────────● │ +0.1  │ ← Stepper
│    └───────┘              └───────┘    │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │  Gestern: 84.8 kg               │ ← Last Entry Chip
│    └─────────────────────────────────┘  │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │      ✓  Speichern               │  │
│    └─────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Datenfluss

1. **Initial Value**: Letzte `weight_history.weight` als Default (via `useDailyMetrics`)
2. **Stepper Buttons**: `+/- 0.1 kg` mit `scale(0.95)` auf Tap
3. **Save**: `useAresEvents.trackEvent('weight', { weight_kg, date })`

### DB Schema (weight_history)

```typescript
{
  user_id: string;
  weight: number;        // weight_kg
  date: string;          // YYYY-MM-DD
  // Optional:
  body_fat_percentage?: number;
  notes?: string;
}
```

---

## 3. TrainingLogger.tsx - 4-Saeulen Grid

### Design

```text
┌─────────────────────────────────────────┐
│                                         │
│   ┌─────────────┐  ┌─────────────┐     │
│   │  💪 Kraft   │  │  🏃 Zone 2  │     │
│   │    (RPT)    │  │             │ ← Selected = Blue Border
│   └─────────────┘  └─────────────┘     │
│                                         │
│   ┌─────────────┐  ┌─────────────┐     │
│   │  ❤️ VO2max  │  │  🔥 Sauna   │     │
│   │             │  │             │     │
│   └─────────────┘  └─────────────┘     │
│                                         │
│   Dauer:  [ − ]   45 min   [ + ]       │ ← Nur fuer Cardio/Sauna
│                                         │
│   ┌─────────────────────────────────┐  │
│   │      ✓  Speichern               │  │
│   └─────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Training Types Mapping

```typescript
const trainingTypes = [
  { id: 'rpt',    label: 'Kraft (RPT)', icon: Dumbbell, color: 'bg-indigo-500', needsTime: false },
  { id: 'zone2',  label: 'Zone 2',      icon: Activity, color: 'bg-emerald-500', needsTime: true },
  { id: 'vo2max', label: 'VO2 Max',     icon: HeartPulse, color: 'bg-rose-500', needsTime: true },
  { id: 'sauna',  label: 'Sauna',       icon: Flame,   color: 'bg-orange-500', needsTime: true },
];
```

### DB Schema (training_sessions)

```typescript
{
  user_id: string;
  training_type: 'rpt' | 'zone2' | 'vo2max' | 'sauna';
  total_duration_minutes: number;
  session_date: string;  // YYYY-MM-DD
}
```

---

## 4. SleepLogger.tsx - Schlaf-Tracking

### Design

```text
┌─────────────────────────────────────────┐
│                                         │
│              ╔═════════════╗            │
│              ║    7.5h     ║            │
│              ║  Schlafdauer║            │
│              ╚═════════════╝            │
│                                         │
│     ○────────────────●──────────○       │ ← Range Slider 4-12h
│     4h                           12h    │
│                                         │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│   │   😫    │ │   😐    │ │   🤩    │  │ ← Qualitaets-Auswahl
│   │Schlecht │ │  Okay   │ │  Super  │  │
│   └─────────┘ └─────────┘ └─────────┘  │
│                                         │
│   ┌─────────────────────────────────┐  │
│   │      ✓  Speichern               │  │
│   └─────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Qualitaets-Mapping

```typescript
const qualityLevels = [
  { id: 'low',  label: 'Schlecht', emoji: '😫', value: 1, bg: 'bg-red-100' },
  { id: 'med',  label: 'Okay',     emoji: '😐', value: 3, bg: 'bg-amber-100' },
  { id: 'high', label: 'Super',    emoji: '🤩', value: 5, bg: 'bg-emerald-100' },
];
```

### DB Schema (sleep_tracking)

```typescript
{
  user_id: string;
  date: string;          // YYYY-MM-DD (gestern)
  sleep_hours: number;   // 7.5
  sleep_quality: number; // 1, 3, oder 5
}
```

---

## 5. useAresEvents Erweiterung

### Neue Event-Kategorien

```typescript
// VORHER:
export type EventCategory = 'water' | 'coffee' | 'supplement';

// NACHHER:
export type EventCategory = 'water' | 'coffee' | 'supplement' | 'weight' | 'workout' | 'sleep';
```

### Neues EventPayload Interface

```typescript
export interface EventPayload {
  // Existing
  amount?: number;
  supplementId?: string;
  timing?: 'morning' | 'noon' | 'evening' | 'pre_workout' | 'post_workout';
  customName?: string;
  
  // NEW: Weight
  weight_kg?: number;
  
  // NEW: Workout
  training_type?: 'rpt' | 'zone2' | 'vo2max' | 'sauna';
  duration_minutes?: number;
  
  // NEW: Sleep
  sleep_hours?: number;
  sleep_quality?: number; // 1-5
  
  // Shared
  date?: string;
}
```

### trackEvent Erweiterung

```typescript
// === WEIGHT ===
if (category === 'weight' && payload.weight_kg) {
  const { error } = await supabase.from('weight_history').insert({
    user_id: auth.user.id,
    weight: payload.weight_kg,
    date: payload.date || today
  });
  if (error) throw error;
  console.log(`[AresEvents] ✓ Logged weight ${payload.weight_kg}kg`);
  toast.success(`${payload.weight_kg} kg gespeichert`);
}

// === WORKOUT ===
if (category === 'workout' && payload.training_type) {
  const { error } = await supabase.from('training_sessions').insert({
    user_id: auth.user.id,
    training_type: payload.training_type,
    total_duration_minutes: payload.duration_minutes || null,
    session_date: payload.date || today
  });
  if (error) throw error;
  console.log(`[AresEvents] ✓ Logged ${payload.training_type} workout`);
  toast.success('Training gespeichert');
}

// === SLEEP ===
if (category === 'sleep' && payload.sleep_hours) {
  const { error } = await supabase.from('sleep_tracking').upsert({
    user_id: auth.user.id,
    date: payload.date || today,
    sleep_hours: payload.sleep_hours,
    sleep_quality: payload.sleep_quality || 3
  }, { onConflict: 'user_id,date' });
  if (error) throw error;
  console.log(`[AresEvents] ✓ Logged ${payload.sleep_hours}h sleep`);
  toast.success('Schlaf gespeichert');
}
```

### Neue Helper-Funktionen

```typescript
const logWeight = useCallback((weightKg: number) => {
  return trackEvent('weight', { weight_kg: weightKg });
}, [trackEvent]);

const logWorkout = useCallback((type: string, durationMin?: number) => {
  return trackEvent('workout', { training_type: type as any, duration_minutes: durationMin });
}, [trackEvent]);

const logSleep = useCallback((hours: number, quality: number = 3) => {
  return trackEvent('sleep', { sleep_hours: hours, sleep_quality: quality });
}, [trackEvent]);
```

---

## 6. useDailyMetrics Erweiterung

### Neues Interface

```typescript
export interface DailyMetrics {
  // Existing
  water: { current: number; target: number };
  supplements: { takenIds: string[]; total: number };
  nutrition: { calories: number; protein: number; carbs: number; fats: number };
  goals: { calories: number; protein: number; carbs: number; fats: number; fluid_goal_ml: number };
  
  // NEW
  weight: { latest: number | null; date: string | null };
  training: { todayType: string | null; todayMinutes: number | null };
  sleep: { lastHours: number | null; lastQuality: number | null };
}
```

### Zusaetzliche Queries

```typescript
// Im Promise.all hinzufuegen:

// Latest Weight
supabase
  .from('weight_history')
  .select('weight, date')
  .eq('user_id', userId)
  .order('date', { ascending: false })
  .limit(1)
  .maybeSingle(),

// Today's Training
supabase
  .from('training_sessions')
  .select('training_type, total_duration_minutes')
  .eq('user_id', userId)
  .eq('session_date', todayStr)
  .limit(1)
  .maybeSingle(),

// Last Sleep Entry
supabase
  .from('sleep_tracking')
  .select('sleep_hours, sleep_quality, date')
  .eq('user_id', userId)
  .order('date', { ascending: false })
  .limit(1)
  .maybeSingle(),
```

---

## 7. AresHome Integration

### State Management

```typescript
// Neuer State fuer QuickLogSheet
const [quickLogConfig, setQuickLogConfig] = useState<{
  open: boolean;
  tab: 'weight' | 'training' | 'sleep';
}>({ open: false, tab: 'weight' });

// Handler fuer LiquidDock
const handleQuickAction = useCallback((action: QuickActionType) => {
  switch (action) {
    case 'weight':
      setQuickLogConfig({ open: true, tab: 'weight' });
      break;
    case 'workout':
      setQuickLogConfig({ open: true, tab: 'training' });
      break;
    case 'sleep':
      setQuickLogConfig({ open: true, tab: 'sleep' });
      break;
    // ... existing cases (water, supplements)
  }
}, []);
```

### Render

```tsx
{/* QuickLogSheet */}
<QuickLogSheet
  isOpen={quickLogConfig.open}
  onClose={() => setQuickLogConfig(prev => ({ ...prev, open: false }))}
  initialTab={quickLogConfig.tab}
/>
```

---

## 8. LiquidDock Anpassung

Das LiquidDock aendert sich minimal - es ruft nur `onQuickAction` auf. Die Sheet-Logik liegt in AresHome.

Der einzige Change: Entfernen des direkten Navigierens zu `/profile?tab=measurements` fuer `weight`:

```typescript
// VORHER (AresHome.tsx handleQuickAction):
case 'weight':
  navigate('/profile?tab=measurements');
  break;

// NACHHER:
case 'weight':
  setQuickLogConfig({ open: true, tab: 'weight' });
  break;
```

---

## 9. Animationen und UX-Details

### Spring Config (konsistent mit LiquidDock)

```typescript
const springConfig = { 
  type: "spring", 
  stiffness: 400, 
  damping: 30 
};
```

### Stepper Button Animation

```typescript
<motion.button
  whileTap={{ scale: 0.9 }}
  whileHover={{ scale: 1.05 }}
  transition={springConfig}
  onClick={() => setWeight(w => Number((w - 0.1).toFixed(1)))}
  className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center"
>
  <Minus className="w-6 h-6" />
</motion.button>
```

### Save Button Feedback

```typescript
<motion.button
  whileTap={{ scale: 0.97 }}
  className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg"
  onClick={handleSave}
>
  <Check className="w-5 h-5 inline mr-2" />
  Speichern
</motion.button>
```

---

## 10. Technische Details

### Ordner-Struktur

```text
src/components/home/
├── loggers/                 (NEU)
│   ├── WeightLogger.tsx
│   ├── TrainingLogger.tsx
│   └── SleepLogger.tsx
├── QuickLogSheet.tsx        (NEU)
├── LiquidDock.tsx           (existiert)
├── ActionCardStack.tsx      (existiert)
└── ...
```

### Dependencies

- `framer-motion` (bereits installiert)
- `lucide-react` Icons: `Scale`, `Dumbbell`, `Moon`, `Activity`, `HeartPulse`, `Flame`, `Minus`, `Plus`, `Check`, `X`
- `@radix-ui/react-slider` (bereits via `src/components/ui/slider.tsx`)

### Optimistic UI

Das QuickLogSheet nutzt NICHT optimistische Updates fuer die Hero-Anzeige, da:
1. Weight/Sleep/Training haben keine "Live-Indikatoren" auf dem Home Screen (noch nicht)
2. Der Success-Toast genuegt als Feedback

Falls spaeter Widgets diese Daten anzeigen, kann `useDailyMetrics` mit optimistischen Updates erweitert werden.

---

## Zusammenfassung der Aenderungen

| Datei | Aenderung |
|-------|-----------|
| `src/components/home/QuickLogSheet.tsx` | CREATE - 120 Zeilen |
| `src/components/home/loggers/WeightLogger.tsx` | CREATE - 80 Zeilen |
| `src/components/home/loggers/TrainingLogger.tsx` | CREATE - 100 Zeilen |
| `src/components/home/loggers/SleepLogger.tsx` | CREATE - 90 Zeilen |
| `src/hooks/useAresEvents.ts` | MODIFY - +60 Zeilen (neue Event-Handler) |
| `src/hooks/useDailyMetrics.ts` | MODIFY - +30 Zeilen (neue Queries) |
| `src/pages/AresHome.tsx` | MODIFY - +15 Zeilen (State + Render) |
