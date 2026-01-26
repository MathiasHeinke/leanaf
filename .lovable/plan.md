

# TrainingLogger Redesign: Round & Grouped

## Das Konzept

Statt des aktuellen 6-Kachel-Grids mit eckigen Elementen wird ein eleganteres, zweistufiges Layout mit runden Icon-Buttons und klarer visueller Hierarchie implementiert.

## Visueller Vergleich

```text
VORHER (3x2 Grid, eckig):           NACHHER (Runde Buttons, gruppiert):
+-------------+-------------+       
| 🏋️ Kraft    | 🌿 Zone 2   |           WORKOUTS
+-------------+-------------+       (●🏋️)    (●🌿)    (●🏃)
| 🏃 VO2 Max  | 🔥 Sauna    |        Kraft    Zone 2   VO2 Max
+-------------+-------------+       
| 🚶 Bewegung | 😴 Ruhetag  |         AKTIVITÄT & ERHOLUNG
+-------------+-------------+       (●🔥)    (●🚶)    (○😴)
                                     Sauna   Bewegung  Ruhetag
```

## Ruhetag-Logik (Grayout-Effekt)

Wenn "Ruhetag" ausgewählt wird:
- Die 3 Workout-Buttons (Kraft, Zone 2, VO2 Max) werden ausgegraut
- Visuelle Merkmale: `opacity-40`, `grayscale`, `cursor-not-allowed`
- Klicks auf Workout-Buttons werden blockiert
- Sauna und Bewegung bleiben aktiv (da Erholung/leichte Aktivität)

## Technische Umsetzung

### 1. Daten-Struktur aufteilen

```typescript
const workoutTypes = [
  { id: 'rpt', label: 'Kraft', icon: Dumbbell, color: 'bg-indigo-500' },
  { id: 'zone2', label: 'Zone 2', icon: Activity, color: 'bg-emerald-500' },
  { id: 'vo2max', label: 'VO2 Max', icon: HeartPulse, color: 'bg-rose-500' },
];

const activityTypes = [
  { id: 'sauna', label: 'Sauna', icon: Flame, color: 'bg-orange-500' },
  { id: 'movement', label: 'Bewegung', icon: Footprints, color: 'bg-teal-500' },
  { id: 'rest', label: 'Ruhetag', icon: Moon, color: 'bg-slate-400' },
];
```

### 2. Reusable Round Button Komponente

```typescript
const RoundTypeButton = ({ 
  type, 
  isSelected, 
  isDisabled, 
  onSelect 
}) => (
  <motion.button
    whileTap={!isDisabled ? { scale: 0.95 } : undefined}
    onClick={() => !isDisabled && onSelect(type.id)}
    disabled={isDisabled}
    className="flex flex-col items-center gap-2"
  >
    {/* Round Icon Button */}
    <div className={cn(
      "w-16 h-16 rounded-full flex items-center justify-center transition-all",
      isSelected && `${type.color} ring-2 ring-offset-2 ring-primary`,
      !isSelected && !isDisabled && "bg-muted hover:bg-muted/80",
      isDisabled && "opacity-40 grayscale cursor-not-allowed bg-muted"
    )}>
      <type.icon className={cn(
        "w-7 h-7",
        isSelected ? "text-white" : "text-foreground"
      )} />
    </div>
    
    {/* Label */}
    <span className={cn(
      "text-xs font-medium",
      isDisabled ? "text-muted-foreground/50" : "text-foreground"
    )}>
      {type.label}
    </span>
  </motion.button>
);
```

### 3. Gruppiertes Layout mit Headers

```typescript
{/* WORKOUTS SECTION */}
<div className="space-y-3">
  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
    Workouts
  </h3>
  <div className="flex justify-around">
    {workoutTypes.map((type) => (
      <RoundTypeButton
        key={type.id}
        type={type}
        isSelected={selectedType === type.id}
        isDisabled={selectedType === 'rest'}  // ← Grayout bei Ruhetag
        onSelect={setSelectedType}
      />
    ))}
  </div>
</div>

{/* ACTIVITY & RECOVERY SECTION */}
<div className="space-y-3 mt-6">
  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
    Aktivität & Erholung
  </h3>
  <div className="flex justify-around">
    {activityTypes.map((type) => (
      <RoundTypeButton
        key={type.id}
        type={type}
        isSelected={selectedType === type.id}
        isDisabled={false}  // Immer aktiv
        onSelect={setSelectedType}
      />
    ))}
  </div>
</div>
```

### 4. Selected State mit Ring-Effekt

```typescript
// Ausgewählter Button:
- Volle Hintergrundfarbe (z.B. bg-indigo-500)
- Ring-Border: ring-2 ring-primary ring-offset-2
- Weißes Icon: text-white

// Nicht ausgewählt:
- Grauer Hintergrund: bg-muted
- Farbiges Icon: text-foreground
- Hover: bg-muted/80
```

### 5. Detail-Sektion mit Layout-Transition

Die existierende Detail-Logik bleibt erhalten, erhält aber einen `layout` Prop für smoothere Übergänge:

```typescript
<AnimatePresence mode="wait">
  {selectedType && (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {/* RPT Details */}
      {/* Zone2 Details */}
      {/* etc. */}
    </motion.div>
  )}
</AnimatePresence>
```

## Styling Details

| Element | Klassen |
|---------|---------|
| Round Button | `w-16 h-16 rounded-full` |
| Selected Ring | `ring-2 ring-offset-2 ring-primary` |
| Disabled State | `opacity-40 grayscale cursor-not-allowed` |
| Section Header | `text-xs font-semibold uppercase tracking-wider text-muted-foreground` |
| Button Row | `flex justify-around` |
| Label | `text-xs font-medium mt-2` |

## Interaktions-Logik

1. **Normal**: Alle 6 Buttons klickbar
2. **Workout gewählt**: Workout-Button highlighted, alle anderen normal
3. **Ruhetag gewählt**: 
   - Rest-Button highlighted 
   - 3 Workout-Buttons ausgegraut (nicht klickbar)
   - Sauna & Bewegung bleiben aktiv
4. **Wechsel von Ruhetag**: Grayout wird aufgehoben

## Änderungen

| Datei | Aktion |
|-------|--------|
| `src/components/home/loggers/TrainingLogger.tsx` | Komplettes UI-Refactoring |

## Vorteile des neuen Designs

- **Visuell cleaner**: Runde Buttons statt eckiger Kacheln
- **Logisch gruppiert**: Workouts vs. Aktivität/Erholung
- **Intuitive Interaktion**: Ruhetag disabelt automatisch Workouts
- **Apple Health Style**: Premium-Look mit Ring-Highlights
- **Bessere Lesbarkeit**: Labels unter den Icons statt daneben

