

# TrainingLogger: Cross-Morphing + Multi-Select Dropdowns

## Das Konzept

### 1. Cross-Morphing zwischen Sektionen
Wenn eine Sektion (Workouts ODER Aktivität) ausgewählt wird, schrumpft die jeweils andere Sektion automatisch - ähnlich wie das "Morphing Hero" Pattern, aber bidirektional:

```text
NICHTS GEWÄHLT:                  WORKOUT GEWÄHLT (z.B. Kraft):
+---------------------------+    +---------------------------+
| WORKOUTS                  |    | WORKOUTS                  |
| (●🏋️)  (●🌿)  (●🏃)       |    | (●🏋️)  (●🌿)  (●🏃)       | ← Normal groß
|  Kraft  Zone 2  VO2 Max   |    |  Kraft  Zone 2  VO2 Max   |
|                           |    |                           |
| AKTIVITÄT & ERHOLUNG      |    | AKTIVITÄT & ERHOLUNG      |
| (●🔥)  (●🚶)  (○😴)       |    | (○)    (○)    (○)         | ← 60% Scale, kein Label
|  Sauna  Bewegung  Ruhetag |    |                           |
+---------------------------+    +---------------------------+

AKTIVITÄT GEWÄHLT (z.B. Sauna):
+---------------------------+
| WORKOUTS                  |
| (○)    (○)    (○)         | ← 60% Scale, kein Label
|                           |
| AKTIVITÄT & ERHOLUNG      |
| (●🔥)  (●🚶)  (○😴)       | ← Normal groß
|  Sauna  Bewegung  Ruhetag |
+---------------------------+
```

### 2. Multi-Select Dropdowns für Workout-Details
Statt einfacher Buttons werden die Workout-Details zu Popover-Dropdowns mit Multi-Select Checkboxen:

- **Kraft**: Split-Typen (Push, Pull, Legs, Upper, Lower, Full) → Multi-Select
- **Zone 2**: Cardio-Typen (Gehen, Laufen, Rad, Schwimmen, Rudern) → Multi-Select
- **VO2 Max**: Protokolle (4x4, Tabata, HIIT) → Single-Select (bleibt)

## Technische Umsetzung

### 1. Animation Variants für Cross-Morphing

```typescript
const springConfig = { type: "spring" as const, stiffness: 300, damping: 25 };

// Section morphing variants
const sectionVariants = {
  normal: { scale: 1, opacity: 1 },
  compact: { scale: 0.85, opacity: 0.6 }
};

// Button morphing variants  
const buttonVariants = {
  normal: { scale: 1 },
  compact: { scale: 0.6 }
};

// Label variants (hide in compact mode)
const labelVariants = {
  normal: { opacity: 1, height: 'auto', marginTop: 8 },
  compact: { opacity: 0, height: 0, marginTop: 0 }
};
```

### 2. Logik für Cross-Morphing State

```typescript
// Bestimme welche Kategorie aktiv ist
const isWorkoutSelected = selectedType && 
  ['rpt', 'zone2', 'vo2max'].includes(selectedType);
const isActivitySelected = selectedType && 
  ['sauna', 'movement', 'rest'].includes(selectedType);

// Workouts-Sektion: compact wenn Activity ausgewählt
const workoutSectionState = isActivitySelected ? 'compact' : 'normal';

// Activity-Sektion: compact wenn Workout ausgewählt (außer bei Rest)
const activitySectionState = isWorkoutSelected ? 'compact' : 'normal';
```

### 3. Aktualisierter RoundTypeButton mit Morphing

```typescript
interface RoundTypeButtonProps {
  // ... existing
  isCompact: boolean;  // NEU: Cross-Morphing State
}

const RoundTypeButton: React.FC<RoundTypeButtonProps> = ({ 
  type, 
  isSelected, 
  isDisabled,
  isCompact,  // NEU
  onSelect 
}) => (
  <motion.button
    variants={buttonVariants}
    animate={isCompact ? 'compact' : 'normal'}
    transition={springConfig}
    // ...
  >
    {/* Round Icon Button - kleiner wenn compact */}
    <motion.div className={cn(
      "rounded-full flex items-center justify-center transition-all",
      isCompact ? "w-10 h-10" : "w-16 h-16",  // ← Dynamische Größe
      // ... colors
    )}>
      <type.icon className={cn(
        isCompact ? "w-4 h-4" : "w-7 h-7"  // ← Dynamische Icon-Größe
      )} />
    </motion.div>
    
    {/* Label - versteckt wenn compact */}
    <AnimatePresence>
      {!isCompact && (
        <motion.span
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="text-xs font-medium mt-2"
        >
          {type.label}
        </motion.span>
      )}
    </AnimatePresence>
  </motion.button>
);
```

### 4. Multi-Select State für Workouts

```typescript
// Statt einzelner Werte: Arrays für Multi-Select
const [selectedSplits, setSelectedSplits] = useState<SplitType[]>([]);
const [selectedCardioTypes, setSelectedCardioTypes] = useState<CardioType[]>([]);

// Toggle-Funktion für Multi-Select
const toggleSplit = (split: SplitType) => {
  setSelectedSplits(prev => 
    prev.includes(split)
      ? prev.filter(s => s !== split)
      : [...prev, split]
  );
};

const toggleCardioType = (type: CardioType) => {
  setSelectedCardioTypes(prev =>
    prev.includes(type)
      ? prev.filter(t => t !== type)
      : [...prev, type]
  );
};
```

### 5. Multi-Select Dropdown UI (mit Popover)

```typescript
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";

{/* KRAFT: Split Multi-Select Dropdown */}
{selectedType === 'rpt' && (
  <>
    <div className="text-sm font-medium text-muted-foreground">Trainierte Splits</div>
    
    <Popover>
      <PopoverTrigger asChild>
        <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
          <span className="text-sm">
            {selectedSplits.length > 0 
              ? selectedSplits.map(s => SPLIT_TYPE_LABELS[s]).join(', ')
              : 'Splits auswählen...'}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      
      <PopoverContent className="w-56 p-2">
        {SPLIT_OPTIONS.map((split) => (
          <label
            key={split.id}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted cursor-pointer"
          >
            <Checkbox 
              checked={selectedSplits.includes(split.id)}
              onCheckedChange={() => toggleSplit(split.id)}
            />
            <span className="text-sm">{split.label}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  </>
)}
```

### 6. Visueller Effekt des Cross-Morphing

```text
PHASE 1: Nichts gewählt          PHASE 2: "Kraft" ausgewählt
┌─────────────────────────┐      ┌─────────────────────────┐
│ WORKOUTS                │      │ WORKOUTS                │
│                         │      │                         │
│ (🏋️)    (🌿)    (🏃)    │      │ (🏋️●)   (🌿)    (🏃)   │ ← Selected
│ Kraft  Zone 2  VO2 Max  │      │ Kraft   Zone 2  VO2 Max │
│ w-16   w-16    w-16     │      │ w-16    w-16    w-16    │
│                         │      │                         │
│ AKTIVITÄT & ERHOLUNG    │      │ AKTIVITÄT & ERHOLUNG    │
│                         │      │                         │
│ (🔥)    (🚶)    (😴)    │      │ (○)  (○)  (○)           │ ← Compact 60%
│ Sauna  Bewegung Ruhetag │      │                         │   Labels weg
│ w-16   w-16     w-16    │      │ w-10 w-10 w-10          │
└─────────────────────────┘      └─────────────────────────┘

PHASE 3: "Sauna" ausgewählt
┌─────────────────────────┐
│ WORKOUTS                │
│                         │
│ (○)  (○)  (○)           │ ← Compact 60%
│ w-10 w-10 w-10          │   Labels weg
│                         │
│ AKTIVITÄT & ERHOLUNG    │
│                         │
│ (🔥●)   (🚶)    (😴)    │ ← Selected
│ Sauna  Bewegung Ruhetag │
│ w-16    w-16    w-16    │
└─────────────────────────┘
```

### 7. Session Data mit Multi-Select

```typescript
const handleSave = async () => {
  const sessionData: Record<string, unknown> = {};
  
  // Kraft: Multiple splits
  if (selectedType === 'rpt' && selectedSplits.length > 0) {
    sessionData.splits = selectedSplits;  // Array statt einzelner Wert
  }
  
  // Zone 2: Multiple cardio types
  if (selectedType === 'zone2' && selectedCardioTypes.length > 0) {
    sessionData.cardio_types = selectedCardioTypes;  // Array
  }
  
  // ... rest of save logic
  
  const success = await trackEvent('workout', { 
    training_type: selectedType,
    split_type: selectedSplits[0],  // Primärer Split für Kompatibilität
    // ...
    session_data: sessionData
  });
};
```

## Dateien

| Datei | Aktion |
|-------|--------|
| `src/components/home/loggers/TrainingLogger.tsx` | Cross-Morphing + Multi-Select Dropdowns |

## UX-Vorteile

1. **Mehr Platz für Details**: Die geschrumpfte Sektion gibt Raum frei
2. **Visueller Fokus**: Klar erkennbar welche Kategorie aktiv ist
3. **Flexibles Training-Logging**: Mehrere Splits/Cardio-Arten pro Session möglich
4. **Premium-Feel**: Smooth Framer-Motion Animationen
5. **Konsistentes Pattern**: Gleiche Morphing-Logik wie Weight/Sleep/Tape Logger

