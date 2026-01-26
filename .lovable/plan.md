

# Hydration Buttons: Flaschen-Icon + Rundere Form

## Übersicht

Zwei Quick-Fixes für die Hydration Micro-Buttons:

| Problem | Lösung |
|---------|--------|
| 0.5L zeigt `Droplets` (Wassertropfen) | → `Milk` Icon (Flaschen-Form) |
| Buttons sind `rounded-xl` (eckig) | → `rounded-full` (pill-shape) |

---

## Änderungen in SmartFocusCard.tsx

### 1. Import hinzufügen (Zeile 10)

```typescript
// AKTUELL:
import { Check, X, ChevronRight, Droplets, Coffee, Pill, Camera, BrainCircuit, Moon, Sunrise, Clock, Dumbbell, LucideIcon, GlassWater } from 'lucide-react';

// NACHHER:
import { Check, X, ChevronRight, Droplets, Coffee, Pill, Camera, BrainCircuit, Moon, Sunrise, Clock, Dumbbell, LucideIcon, GlassWater, Milk } from 'lucide-react';
```

### 2. 0.5L Icon ändern (Zeile 170)

```typescript
// AKTUELL:
{ id: '500ml_water', label: '0.5L', icon: Droplets },

// NACHHER:
{ id: '500ml_water', label: '0.5L', icon: Milk },
```

### 3. Button-Styling: rounded-full (Zeile 126)

```typescript
// AKTUELL:
"relative flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border transition-all overflow-hidden min-w-[70px]",

// NACHHER:
"relative flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border transition-all overflow-hidden min-w-[70px]",
```

---

## Visuelles Ergebnis

```text
VORHER:
┌─────────┐  ┌─────────┐  ┌─────────┐
│ 💧 1x   │  │ 💧 0.5L │  │ ☕ 1x   │
└─────────┘  └─────────┘  └─────────┘
  (eckig)      (Tropfen)    (eckig)

NACHHER:
(  💧 1x  )  (  🍼 0.5L )  (  ☕ 1x  )
  (pill)      (Flasche)     (pill)
```

---

## Dateien

| Datei | Änderung |
|-------|----------|
| `SmartFocusCard.tsx` | +Milk Import, Icon-Swap Zeile 170, rounded-full Zeile 126 |

