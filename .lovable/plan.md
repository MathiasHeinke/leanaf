

# Enhanced Quick-Log Sheet: Mehr Datenpunkte mit Progressive Disclosure

## Uebersicht

Erweiterung der drei Logger mit zusaetzlichen Datenpunkten aus den bestehenden DB-Tabellen. Das Design nutzt **Accordion-Panels** fuer optionale Felder, um die "Quick"-UX beizubehalten.

```text
VORHER:                              NACHHER:
┌───────────────────────┐            ┌───────────────────────┐
│       85.2 kg         │            │       85.2 kg         │
│    [−0.1] [+0.1]      │            │    [−0.1] [+0.1]      │
│                       │            │                       │
│    [✓ Speichern]      │            │  ▼ Mehr Details       │ ← Accordion
└───────────────────────┘            │  ┌─────────────────┐  │
                                     │  │ KFA: [__]%      │  │
                                     │  │ Muskeln: [__]%  │  │
                                     │  └─────────────────┘  │
                                     │    [✓ Speichern]      │
                                     └───────────────────────┘
```

---

## 1. WeightLogger - Erweiterte Koerperkomposition

### Neue Felder

| Feld | UI-Element | DB-Feld |
|------|------------|---------|
| **KFA %** | Numeric Input (0-50%) | `body_fat_percentage` |
| **Muskelmasse %** | Numeric Input (20-60%) | `muscle_percentage` |
| **Notizen** | Text Input (optional) | `notes` |

### UI-Design

```text
┌─────────────────────────────────────────┐
│                                         │
│              ╔═════════════╗            │
│              ║   85.2      ║  ← Core (immer sichtbar)
│              ║     kg      ║            │
│              ╚═════════════╝            │
│                                         │
│    ┌───────┐              ┌───────┐    │
│    │ −0.1  │              │ +0.1  │    │
│    └───────┘              └───────┘    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ▼ Koerperkomposition            │ ← Accordion Trigger
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │ (Expandiert)
│  │  KFA        ┌────────────┐      │   │
│  │             │   18.5  %  │      │   │
│  │             └────────────┘      │   │
│  │  Muskeln    ┌────────────┐      │   │
│  │             │   42.0  %  │      │   │
│  │             └────────────┘      │   │
│  │  Notizen    ┌────────────┐      │   │
│  │             │ Nach Sauna │      │   │
│  │             └────────────┘      │   │
│  └─────────────────────────────────┘   │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │      ✓  Speichern               │  │
│    └─────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Code-Aenderungen WeightLogger.tsx

```typescript
// Neue State-Variablen
const [bodyFat, setBodyFat] = useState<number | null>(null);
const [muscleMass, setMuscleMass] = useState<number | null>(null);
const [notes, setNotes] = useState('');

// Erweitertes Save-Payload
const handleSave = async () => {
  setIsSaving(true);
  const success = await trackEvent('weight', { 
    weight_kg: weight,
    body_fat_percentage: bodyFat,
    muscle_percentage: muscleMass,
    notes: notes || undefined
  });
  // ...
};
```

---

## 2. TrainingLogger - Workout-Subtypen und Details

### Neue Felder je nach Training-Typ

| Training-Typ | Zusaetzliche Felder | DB-Speicherung |
|--------------|---------------------|----------------|
| **RPT (Kraft)** | Split-Typ (Push/Pull/Legs/Upper/Lower/Full), Volumen kg | `split_type`, `total_volume_kg` |
| **Zone 2** | Cardio-Art (Laufen/Radfahren/Schwimmen/Gehen) | `session_data.cardio_type` |
| **VO2 Max** | Protokoll (4x4, Tabata, HIIT), Intensitaet | `session_data.protocol`, `session_data.intensity` |
| **Sauna** | Temperatur, Gaenge | `session_data.temperature`, `session_data.rounds` |

### UI-Design (Nach Typ-Auswahl expandiert)

```text
┌─────────────────────────────────────────┐
│   ┌──────────┐  ┌──────────┐            │
│   │  💪 RPT  │  │ 🏃 Zone2 │ ← Selected │
│   │    ✓     │  │          │            │
│   └──────────┘  └──────────┘            │
│   ┌──────────┐  ┌──────────┐            │
│   │ ❤️ VO2max│  │ 🔥 Sauna │            │
│   └──────────┘  └──────────┘            │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ▼ Training-Details              │ ← Auto-Expand nach Auswahl
│  └─────────────────────────────────┘   │
│                                         │
│  WENN RPT:                              │
│  ┌─────────────────────────────────┐   │
│  │  Split:  [Push] [Pull] [Legs]   │ ← Chip-Auswahl
│  │          [Upper] [Lower] [Full] │   │
│  │                                  │   │
│  │  Volumen: ┌──────┐ kg           │   │
│  │           │ 8500 │              │   │
│  │           └──────┘              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  WENN Zone2:                            │
│  ┌─────────────────────────────────┐   │
│  │  Art:    [🚶Gehen] [🏃Laufen]   │   │
│  │          [🚴Rad] [🏊Schwimmen]  │   │
│  │                                  │   │
│  │  Dauer:  [ − ]   45 min  [ + ]  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  WENN VO2max:                           │
│  ┌─────────────────────────────────┐   │
│  │  Protokoll: [4x4] [Tabata]      │   │
│  │             [HIIT] [Anderes]    │   │
│  │                                  │   │
│  │  Dauer:  [ − ]   20 min  [ + ]  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  WENN Sauna:                            │
│  ┌─────────────────────────────────┐   │
│  │  Temperatur: [80°] [90°] [100°] │   │
│  │                                  │   │
│  │  Gaenge:     [1] [2] [3] [4]    │   │
│  │                                  │   │
│  │  Dauer:  [ − ]   15 min  [ + ]  │   │
│  └─────────────────────────────────┘   │
│                                         │
│    [✓ Training speichern]               │
└─────────────────────────────────────────┘
```

### Neue Types und Constants

```typescript
// src/types/training.ts erweitern
export type CardioType = 'walking' | 'running' | 'cycling' | 'swimming' | 'rowing' | 'other';
export type Vo2Protocol = '4x4' | 'tabata' | 'hiit' | 'other';
export type SaunaTemp = 80 | 90 | 100;

export const CARDIO_TYPE_OPTIONS = [
  { id: 'walking', label: 'Gehen', icon: '🚶' },
  { id: 'running', label: 'Laufen', icon: '🏃' },
  { id: 'cycling', label: 'Radfahren', icon: '🚴' },
  { id: 'swimming', label: 'Schwimmen', icon: '🏊' },
];

export const VO2_PROTOCOL_OPTIONS = [
  { id: '4x4', label: '4x4 Intervalle', description: '4 min high, 3 min low' },
  { id: 'tabata', label: 'Tabata', description: '20s on, 10s off' },
  { id: 'hiit', label: 'HIIT', description: 'High Intensity Intervals' },
];
```

---

## 3. SleepLogger - Umfassende Schlafanalyse

### Neue Felder (alle optional via Accordion)

| Feld | UI-Element | DB-Feld |
|------|------------|---------|
| **Einschlafzeit** | Time Picker | `bedtime` |
| **Aufwachzeit** | Time Picker | `wake_time` |
| **Unterbrechungen** | Stepper (0-10) | `sleep_interruptions` |
| **Bildschirmzeit abends** | Slider (0-180 min) | `screen_time_evening` |
| **Libido am Morgen** | Emoji-Scale (1-5) | `morning_libido` |
| **Motivation** | Emoji-Scale (1-5) | `motivation_level` |

### UI-Design

```text
┌─────────────────────────────────────────┐
│              ╔═════════════╗            │
│              ║    7.5h     ║  ← Core
│              ╚═════════════╝            │
│     ○────────────────●──────────○       │
│     3h                           12h    │
│                                         │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│   │   😫    │ │   😐    │ │   🤩    │  │ ← Qualitaet
│   │Schlecht │ │  Okay   │ │  Super  │  │
│   └─────────┘ └─────────┘ └─────────┘  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ▼ Schlaf-Details                │ ← Accordion
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Eingeschlafen:  [22:30]        │   │
│  │  Aufgewacht:     [06:00]        │   │
│  │                                  │   │
│  │  Unterbrechungen: [−] 2 [+]     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ▼ Morgen-Check                  │ ← Zweites Accordion
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Bildschirmzeit gestern Abend:  │   │
│  │  ○─────●───────────○  45 min    │   │
│  │                                  │   │
│  │  Libido am Morgen:              │   │
│  │  [😴] [😐] [😊] [😍] [🔥]       │ ← 1-5 Scale
│  │                                  │   │
│  │  Motivation:                    │   │
│  │  [😫] [😕] [😐] [💪] [🚀]       │   │
│  └─────────────────────────────────┘   │
│                                         │
│    [✓ Schlaf speichern]                 │
└─────────────────────────────────────────┘
```

### Emoji-Scales fuer Libido und Motivation

```typescript
const LIBIDO_SCALE = [
  { value: 1, emoji: '😴', label: 'Sehr niedrig' },
  { value: 2, emoji: '😐', label: 'Niedrig' },
  { value: 3, emoji: '😊', label: 'Normal' },
  { value: 4, emoji: '😍', label: 'Hoch' },
  { value: 5, emoji: '🔥', label: 'Sehr hoch' },
];

const MOTIVATION_SCALE = [
  { value: 1, emoji: '😫', label: 'Keine' },
  { value: 2, emoji: '😕', label: 'Wenig' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '💪', label: 'Gut' },
  { value: 5, emoji: '🚀', label: 'Top' },
];
```

---

## 4. Datei-Uebersicht

| Aktion | Datei | Beschreibung |
|--------|-------|--------------|
| **MODIFY** | `src/components/home/loggers/WeightLogger.tsx` | +KFA, +Muskeln, +Notes mit Accordion |
| **MODIFY** | `src/components/home/loggers/TrainingLogger.tsx` | +Split-Typ, +Cardio-Art, +VO2-Protokoll, +Sauna-Details |
| **MODIFY** | `src/components/home/loggers/SleepLogger.tsx` | +Zeiten, +Unterbrechungen, +Screentime, +Libido, +Motivation |
| **MODIFY** | `src/types/training.ts` | Neue Types (CardioType, Vo2Protocol) |
| **MODIFY** | `src/hooks/useAresEvents.ts` | Erweiterte Payloads fuer alle Kategorien |

---

## 5. Detaillierte Aenderungen: WeightLogger.tsx

### Neue Imports

```typescript
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
```

### Neue State-Variablen

```typescript
const [bodyFat, setBodyFat] = useState<string>('');
const [muscleMass, setMuscleMass] = useState<string>('');
const [notes, setNotes] = useState('');
const [detailsOpen, setDetailsOpen] = useState(false);
```

### Accordion-Sektion (nach Stepper)

```typescript
<Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
  <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-muted rounded-xl text-sm font-medium">
    <span>Koerperkomposition</span>
    <ChevronDown className={cn(
      "w-4 h-4 transition-transform",
      detailsOpen && "rotate-180"
    )} />
  </CollapsibleTrigger>
  <CollapsibleContent className="pt-3 space-y-3">
    {/* KFA Input */}
    <div className="flex items-center gap-3">
      <label className="text-sm text-muted-foreground w-24">KFA</label>
      <div className="relative flex-1">
        <Input
          type="number"
          step="0.1"
          placeholder="18.5"
          value={bodyFat}
          onChange={(e) => setBodyFat(e.target.value)}
          className="pr-8"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
      </div>
    </div>
    {/* Muskelmasse Input */}
    <div className="flex items-center gap-3">
      <label className="text-sm text-muted-foreground w-24">Muskeln</label>
      <div className="relative flex-1">
        <Input
          type="number"
          step="0.1"
          placeholder="42.0"
          value={muscleMass}
          onChange={(e) => setMuscleMass(e.target.value)}
          className="pr-8"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
      </div>
    </div>
    {/* Notizen */}
    <div className="flex items-center gap-3">
      <label className="text-sm text-muted-foreground w-24">Notizen</label>
      <Input
        placeholder="Optional..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="flex-1"
      />
    </div>
  </CollapsibleContent>
</Collapsible>
```

---

## 6. Detaillierte Aenderungen: TrainingLogger.tsx

### Neue State-Variablen

```typescript
// Nach Typ-Auswahl
const [splitType, setSplitType] = useState<SplitType | null>(null);
const [cardioType, setCardioType] = useState<CardioType | null>(null);
const [vo2Protocol, setVo2Protocol] = useState<Vo2Protocol | null>(null);
const [saunaTemp, setSaunaTemp] = useState<80 | 90 | 100>(80);
const [saunaRounds, setSaunaRounds] = useState(3);
const [totalVolume, setTotalVolume] = useState<string>('');
```

### Neue Konstanten

```typescript
const SPLIT_OPTIONS = [
  { id: 'push', label: 'Push' },
  { id: 'pull', label: 'Pull' },
  { id: 'legs', label: 'Legs' },
  { id: 'upper', label: 'Upper' },
  { id: 'lower', label: 'Lower' },
  { id: 'full', label: 'Full' },
];

const CARDIO_OPTIONS = [
  { id: 'walking', label: 'Gehen', emoji: '🚶' },
  { id: 'running', label: 'Laufen', emoji: '🏃' },
  { id: 'cycling', label: 'Rad', emoji: '🚴' },
  { id: 'swimming', label: 'Schwimmen', emoji: '🏊' },
];

const VO2_OPTIONS = [
  { id: '4x4', label: '4x4' },
  { id: 'tabata', label: 'Tabata' },
  { id: 'hiit', label: 'HIIT' },
];
```

### Detail-Panel (Auto-Expand nach Typ-Auswahl)

```typescript
<AnimatePresence>
  {selectedType && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="pt-4 space-y-4">
        {/* RPT: Split Selection */}
        {selectedType === 'rpt' && (
          <>
            <div className="text-sm font-medium text-muted-foreground">Split</div>
            <div className="flex flex-wrap gap-2">
              {SPLIT_OPTIONS.map((s) => (
                <motion.button
                  key={s.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSplitType(s.id as SplitType)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    splitType === s.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {s.label}
                </motion.button>
              ))}
            </div>
            {/* Volume Input */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground">Volumen</label>
              <Input
                type="number"
                placeholder="8500"
                value={totalVolume}
                onChange={(e) => setTotalVolume(e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">kg</span>
            </div>
          </>
        )}

        {/* Zone2: Cardio Type + Duration */}
        {selectedType === 'zone2' && (
          <>
            <div className="text-sm font-medium text-muted-foreground">Art</div>
            <div className="flex flex-wrap gap-2">
              {CARDIO_OPTIONS.map((c) => (
                <motion.button
                  key={c.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCardioType(c.id as CardioType)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1",
                    cardioType === c.id
                      ? "bg-emerald-500 text-white"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  <span>{c.emoji}</span>
                  {c.label}
                </motion.button>
              ))}
            </div>
            {/* Duration controls (existing) */}
          </>
        )}

        {/* VO2max: Protocol */}
        {selectedType === 'vo2max' && (
          <>
            <div className="text-sm font-medium text-muted-foreground">Protokoll</div>
            <div className="flex flex-wrap gap-2">
              {VO2_OPTIONS.map((v) => (
                <motion.button
                  key={v.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setVo2Protocol(v.id as Vo2Protocol)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    vo2Protocol === v.id
                      ? "bg-rose-500 text-white"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {v.label}
                </motion.button>
              ))}
            </div>
            {/* Duration controls */}
          </>
        )}

        {/* Sauna: Temp + Rounds */}
        {selectedType === 'sauna' && (
          <>
            <div className="text-sm font-medium text-muted-foreground">Temperatur</div>
            <div className="flex gap-2">
              {[80, 90, 100].map((t) => (
                <motion.button
                  key={t}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSaunaTemp(t as 80 | 90 | 100)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    saunaTemp === t
                      ? "bg-orange-500 text-white"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {t}°C
                </motion.button>
              ))}
            </div>
            <div className="text-sm font-medium text-muted-foreground">Gaenge</div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((r) => (
                <motion.button
                  key={r}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSaunaRounds(r)}
                  className={cn(
                    "w-10 h-10 rounded-lg text-sm font-medium transition-colors",
                    saunaRounds === r
                      ? "bg-orange-500 text-white"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {r}
                </motion.button>
              ))}
            </div>
            {/* Duration controls */}
          </>
        )}
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

### Erweitertes Save-Payload

```typescript
const handleSave = async () => {
  if (!selectedType) return;
  
  setIsSaving(true);
  
  // Build session_data based on type
  const sessionData: Record<string, unknown> = {};
  
  if (selectedType === 'zone2' && cardioType) {
    sessionData.cardio_type = cardioType;
  }
  if (selectedType === 'vo2max' && vo2Protocol) {
    sessionData.protocol = vo2Protocol;
  }
  if (selectedType === 'sauna') {
    sessionData.temperature = saunaTemp;
    sessionData.rounds = saunaRounds;
  }
  
  const success = await trackEvent('workout', { 
    training_type: selectedType,
    split_type: selectedType === 'rpt' ? splitType : undefined,
    duration_minutes: selectedTypeConfig?.needsTime ? duration : undefined,
    total_volume_kg: totalVolume ? Number(totalVolume) : undefined,
    session_data: Object.keys(sessionData).length > 0 ? sessionData : undefined
  });
  
  if (success) onClose();
  setIsSaving(false);
};
```

---

## 7. Detaillierte Aenderungen: SleepLogger.tsx

### Neue State-Variablen

```typescript
const [bedtime, setBedtime] = useState<string>('');
const [wakeTime, setWakeTime] = useState<string>('');
const [interruptions, setInterruptions] = useState(0);
const [screenTime, setScreenTime] = useState(30);
const [libido, setLibido] = useState<number | null>(null);
const [motivation, setMotivation] = useState<number | null>(null);
const [detailsOpen, setDetailsOpen] = useState(false);
const [morningCheckOpen, setMorningCheckOpen] = useState(false);
```

### Neue Konstanten

```typescript
const LIBIDO_SCALE = [
  { value: 1, emoji: '😴' },
  { value: 2, emoji: '😐' },
  { value: 3, emoji: '😊' },
  { value: 4, emoji: '😍' },
  { value: 5, emoji: '🔥' },
];

const MOTIVATION_SCALE = [
  { value: 1, emoji: '😫' },
  { value: 2, emoji: '😕' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '💪' },
  { value: 5, emoji: '🚀' },
];
```

### Zwei Accordion-Sektionen

```typescript
{/* Schlaf-Details Accordion */}
<Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
  <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-muted rounded-xl text-sm font-medium">
    <span>Schlaf-Details</span>
    <ChevronDown className={cn("w-4 h-4 transition-transform", detailsOpen && "rotate-180")} />
  </CollapsibleTrigger>
  <CollapsibleContent className="pt-3 space-y-4">
    {/* Time Pickers */}
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Eingeschlafen</label>
        <Input
          type="time"
          value={bedtime}
          onChange={(e) => setBedtime(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Aufgewacht</label>
        <Input
          type="time"
          value={wakeTime}
          onChange={(e) => setWakeTime(e.target.value)}
        />
      </div>
    </div>
    {/* Interruptions Stepper */}
    <div className="flex items-center justify-between">
      <span className="text-sm">Unterbrechungen</span>
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setInterruptions(i => Math.max(0, i - 1))}
          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"
        >
          <Minus className="w-4 h-4" />
        </motion.button>
        <span className="w-6 text-center font-medium">{interruptions}</span>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setInterruptions(i => Math.min(10, i + 1))}
          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"
        >
          <Plus className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  </CollapsibleContent>
</Collapsible>

{/* Morgen-Check Accordion */}
<Collapsible open={morningCheckOpen} onOpenChange={setMorningCheckOpen}>
  <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-muted rounded-xl text-sm font-medium">
    <span>Morgen-Check</span>
    <ChevronDown className={cn("w-4 h-4 transition-transform", morningCheckOpen && "rotate-180")} />
  </CollapsibleTrigger>
  <CollapsibleContent className="pt-3 space-y-4">
    {/* Screen Time Slider */}
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm">Bildschirmzeit gestern Abend</span>
        <span className="text-sm font-medium">{screenTime} min</span>
      </div>
      <Slider
        value={[screenTime]}
        onValueChange={([val]) => setScreenTime(val)}
        min={0}
        max={180}
        step={15}
      />
    </div>
    
    {/* Libido Scale */}
    <div>
      <div className="text-sm mb-2">Libido am Morgen</div>
      <div className="flex gap-2 justify-center">
        {LIBIDO_SCALE.map((l) => (
          <motion.button
            key={l.value}
            whileTap={{ scale: 0.9 }}
            onClick={() => setLibido(l.value)}
            className={cn(
              "w-10 h-10 rounded-xl text-xl transition-colors",
              libido === l.value
                ? "bg-primary/20 ring-2 ring-primary"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {l.emoji}
          </motion.button>
        ))}
      </div>
    </div>
    
    {/* Motivation Scale */}
    <div>
      <div className="text-sm mb-2">Motivation</div>
      <div className="flex gap-2 justify-center">
        {MOTIVATION_SCALE.map((m) => (
          <motion.button
            key={m.value}
            whileTap={{ scale: 0.9 }}
            onClick={() => setMotivation(m.value)}
            className={cn(
              "w-10 h-10 rounded-xl text-xl transition-colors",
              motivation === m.value
                ? "bg-primary/20 ring-2 ring-primary"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {m.emoji}
          </motion.button>
        ))}
      </div>
    </div>
  </CollapsibleContent>
</Collapsible>
```

### Erweitertes Save-Payload

```typescript
const handleSave = async () => {
  setIsSaving(true);
  const success = await trackEvent('sleep', { 
    sleep_hours: hours, 
    sleep_quality: selectedQuality?.value || 3,
    bedtime: bedtime || undefined,
    wake_time: wakeTime || undefined,
    sleep_interruptions: interruptions > 0 ? interruptions : undefined,
    screen_time_evening: screenTime > 0 ? screenTime : undefined,
    morning_libido: libido || undefined,
    motivation_level: motivation || undefined
  });
  if (success) onClose();
  setIsSaving(false);
};
```

---

## 8. useAresEvents.ts Erweiterung

### Erweitertes EventPayload Interface

```typescript
export interface EventPayload {
  // Existing
  amount?: number;
  supplementId?: string;
  timing?: SupplementTiming;
  customName?: string;
  
  // Weight (erweitert)
  weight_kg?: number;
  body_fat_percentage?: number;
  muscle_percentage?: number;
  notes?: string;
  
  // Workout (erweitert)
  training_type?: TrainingType;
  split_type?: SplitType;
  duration_minutes?: number;
  total_volume_kg?: number;
  session_data?: Record<string, unknown>;
  
  // Sleep (erweitert)
  sleep_hours?: number;
  sleep_quality?: number;
  bedtime?: string;
  wake_time?: string;
  sleep_interruptions?: number;
  screen_time_evening?: number;
  morning_libido?: number;
  motivation_level?: number;
  
  // Shared
  date?: string;
}
```

### Erweiterte trackEvent Logik

```typescript
// === WEIGHT (erweitert) ===
if (category === 'weight' && payload.weight_kg) {
  const { error } = await supabase.from('weight_history').insert({
    user_id: auth.user.id,
    weight: payload.weight_kg,
    date: payload.date || today,
    body_fat_percentage: payload.body_fat_percentage || null,
    muscle_percentage: payload.muscle_percentage || null,
    notes: payload.notes || null
  });
  if (error) throw error;
  toast.success(`${payload.weight_kg} kg gespeichert`);
}

// === WORKOUT (erweitert) ===
if (category === 'workout' && payload.training_type) {
  const { error } = await supabase.from('training_sessions').insert({
    user_id: auth.user.id,
    training_type: payload.training_type,
    split_type: payload.split_type || null,
    total_duration_minutes: payload.duration_minutes || null,
    total_volume_kg: payload.total_volume_kg || null,
    session_data: payload.session_data || null,
    session_date: payload.date || today
  });
  if (error) throw error;
  toast.success('Training gespeichert');
}

// === SLEEP (erweitert) ===
if (category === 'sleep' && payload.sleep_hours) {
  const { error } = await supabase.from('sleep_tracking').upsert({
    user_id: auth.user.id,
    date: payload.date || today,
    sleep_hours: payload.sleep_hours,
    sleep_quality: payload.sleep_quality || 3,
    bedtime: payload.bedtime || null,
    wake_time: payload.wake_time || null,
    sleep_interruptions: payload.sleep_interruptions || null,
    screen_time_evening: payload.screen_time_evening || null,
    morning_libido: payload.morning_libido || null,
    motivation_level: payload.motivation_level || null
  }, { onConflict: 'user_id,date' });
  if (error) throw error;
  toast.success('Schlaf gespeichert');
}
```

---

## 9. Zusammenfassung der neuen Datenpunkte

| Kategorie | Core (Quick) | Erweitert (Accordion) |
|-----------|--------------|----------------------|
| **Gewicht** | Gewicht kg | KFA %, Muskelmasse %, Notizen |
| **Training RPT** | Typ | Split (Push/Pull/Legs), Volumen kg |
| **Training Zone2** | Typ, Dauer | Cardio-Art (Gehen/Laufen/Rad/Schwimmen) |
| **Training VO2max** | Typ, Dauer | Protokoll (4x4/Tabata/HIIT) |
| **Training Sauna** | Typ, Dauer | Temperatur, Gaenge |
| **Schlaf** | Stunden, Qualitaet | Zeiten, Unterbrechungen, Screentime, Libido, Motivation |

**Gesamte Datenpunkte: 6 Core + 15 Erweitert = 21 Datenpunkte**

---

## 10. UX-Vorteile des Progressive Disclosure

1. **Quick bleibt Quick**: Core-Eingaben sind in 3-5 Sekunden moeglich
2. **Power User Mode**: Erweiterte Felder fuer detaillierte Analyse
3. **Keine Ueberwaeltigung**: Accordion versteckt Komplexitaet bis benoetigt
4. **Premium Feeling**: Framer Motion Animationen beim Auf-/Zuklappen
5. **Vollstaendige Daten**: Alle DB-Felder werden genutzt fuer spaetere Insights

