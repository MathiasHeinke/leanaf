
# TapeLogger Morphing Hero - Design Pattern Update

## Problem

Der `TapeLogger` verwendet **nicht** das etablierte "Morphing Hero" Design-Prinzip, das in allen anderen Loggern (Weight, Sleep, Training) implementiert ist. Wenn der Ganzkörper-Maße Accordion geöffnet wird, bleibt die große `108.0 cm` Anzeige statisch und nimmt zu viel Platz ein.

## Lösung: Morphing Hero Pattern implementieren

Das Pattern aus `WeightLogger` auf `TapeLogger` übertragen:

### 1. Animation Variants hinzufügen

```typescript
// Animation variants für morphing hero
const heroContainerVariants = {
  normal: { marginTop: 24, marginBottom: 24 },
  compact: { marginTop: 8, marginBottom: 8 }
};

const numberVariants = {
  normal: { scale: 1 },
  compact: { scale: 0.75 }
};

const stepperVariants = {
  normal: { scale: 1 },
  compact: { scale: 0.85 }
};
```

### 2. Expanded State tracken

```typescript
// isExpanded basiert auf fullBodyOpen State
const isExpanded = fullBodyOpen;
```

### 3. Hero Container mit Motion Variants

```typescript
<motion.div
  variants={heroContainerVariants}
  animate={isExpanded ? 'compact' : 'normal'}
  transition={springConfig}
  className="flex flex-col items-center"
>
  {/* Morphing Number Display */}
  <motion.div
    variants={numberVariants}
    animate={isExpanded ? 'compact' : 'normal'}
    transition={springConfig}
    className="flex items-baseline gap-2"
  >
    <motion.span className="text-6xl font-bold tabular-nums">
      {belly.toFixed(1)}
    </motion.span>
    <span className="text-2xl font-medium">cm</span>
  </motion.div>

  {/* Morphing Stepper */}
  <motion.div
    variants={stepperVariants}
    animate={isExpanded ? 'compact' : 'normal'}
    transition={springConfig}
    className="flex items-center justify-center gap-6 mt-4"
  >
    <StepperButton compact={isExpanded} ... />
  </motion.div>
</motion.div>
```

### 4. StepperButton compact Prop

```typescript
interface StepperButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  label: string;
  compact?: boolean;  // NEU
}

const StepperButton = ({ icon: Icon, onClick, label, compact }) => (
  <div className={cn(
    "rounded-2xl bg-muted flex items-center justify-center",
    compact ? "w-12 h-12" : "w-14 h-14"
  )}>
    <Icon className={cn(compact ? "w-5 h-5" : "w-6 h-6")} />
  </div>
);
```

### 5. Sticky Save Button mit Gradient

```typescript
{/* STICKY SAVE BUTTON */}
<div className="sticky bottom-0 pt-4 mt-4 bg-gradient-to-t from-background via-background to-transparent">
  <motion.button ... >
    Speichern
  </motion.button>
</div>
```

### 6. Scrollable Container Struktur

```typescript
<div className="flex flex-col min-h-[300px]">
  {/* SCROLLABLE CONTENT */}
  <div className="flex-1 space-y-4 overflow-y-auto">
    {/* Morphing Hero */}
    {/* Last Entry Reference */}
    {/* Info Hint */}
    {/* Accordion */}
  </div>

  {/* STICKY SAVE BUTTON */}
  <div className="sticky bottom-0 ...">
    ...
  </div>
</div>
```

## Visueller Effekt

```text
ACCORDION GESCHLOSSEN:          ACCORDION OFFEN:
+-------------------------+     +-------------------------+
|    🎯 Bauchumfang       |     |    🎯 Bauchumfang       |
|                         |     |                         |
|      108.0 cm           |     |      108.0 cm           | ← 75% Scale
|    (text-6xl)           |     |    (kleiner)            |
|                         |     |                         |
|   [-0.5]   [+0.5]       |     |   [-]  [+]              | ← 85% Scale
|   (w-14 h-14)           |     |   (w-12 h-12)           |
|                         |     +-------------------------+
|   Letzter: 108.0 cm     |     |   ▲ Ganzkörper-Maße     |
|                         |     |   Hals:    42 cm        |
|   ▼ Ganzkörper-Maße     |     |   Brust:   112 cm       |
+-------------------------+     |   Taille:  103 cm       |
                                |   ...                   |
                                +-------------------------+
                                | [████ Speichern ████]   | ← Sticky
                                +-------------------------+
```

## Änderungen

| Datei | Aktion |
|-------|--------|
| `src/components/home/loggers/TapeLogger.tsx` | Morphing Hero Pattern hinzufügen |

## Technische Details

- **Spring Config**: `stiffness: 300, damping: 25` (smoother als das aktuelle `400, 30`)
- **Scale Faktoren**: 
  - Number: 0.75 (25% kleiner)
  - Stepper: 0.85 (15% kleiner)
- **Margin Reduction**: von `my-6` auf `my-2` wenn expanded
- **Sticky Button**: Mit `bg-gradient-to-t` für smooth fade
