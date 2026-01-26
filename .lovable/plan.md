

# Icon-Änderungen: Wasser → Journal, Aperture → Essen

## Übersicht

Zwei Icon-Änderungen in zwei verschiedenen Komponenten:

```text
QUICKACTIONSMENU (oben, fächert auf beim + Klick):
┌─────────────────────────────────────┐
│  🍽️ Mahlzeit                        │
│  💪 Workout                          │
│  🌙 Schlaf                           │
│  🧪 Chemie                           │
│  📏 Körper                           │
│  💧 Getränke  → 📓 Journal (NEU)    │  ← ÄNDERUNG 1
│  🧬 Blutwerte                        │
│  💬 Coach                            │
└─────────────────────────────────────┘

LIQUIDDOCK (unten, 3 Buttons):
┌─────────────────────────────────────┐
│                                     │
│   [⌘] Vision   [⚔️] ARES   [+/-]    │
│    ↓                                │
│   [🍴] Essen (NEU)                  │  ← ÄNDERUNG 2
│                                     │
└─────────────────────────────────────┘
```

---

## Änderung 1: QuickActionsMenu - Wasser → Journal

### Datei: `src/components/quick/QuickActionsMenu.tsx`

**Zeile 3 (Imports):**
```typescript
// VORHER:
import { Dumbbell, Moon, FlaskConical, MessageCircle, Utensils, Droplets, TestTube, Ruler } from "lucide-react";

// NACHHER:
import { Dumbbell, Moon, FlaskConical, MessageCircle, Utensils, BookOpen, TestTube, Ruler } from "lucide-react";
```

**Zeile 4 (ActionType):**
```typescript
// VORHER:
export type ActionType = "meal" | "workout" | "sleep" | "chemistry" | "fluid" | "bloodwork" | "coach" | "body";

// NACHHER:
export type ActionType = "meal" | "workout" | "sleep" | "chemistry" | "journal" | "bloodwork" | "coach" | "body";
```

**Zeile 19 (Actions Array):**
```typescript
// VORHER:
{ key: "fluid", label: "Getränke", Icon: Droplets },

// NACHHER:
{ key: "journal", label: "Journal", Icon: BookOpen },
```

---

## Änderung 2: LiquidDock - Aperture → Essen

### Datei: `src/components/home/LiquidDock.tsx`

**Zeile 8 (Imports):**
```typescript
// VORHER:
import { Aperture, Plus, X, Droplets, Dumbbell, Scale, Pill, Moon } from 'lucide-react';

// NACHHER:
import { UtensilsCrossed, Plus, X, Droplets, Dumbbell, Scale, Pill, Moon } from 'lucide-react';
```

**Zeile 102-106 (Vision Button):**
```typescript
// VORHER:
<DockButton 
  icon={Aperture} 
  onClick={onVisionScan}
  label="Mahlzeit scannen"
/>

// NACHHER:
<DockButton 
  icon={UtensilsCrossed} 
  onClick={onVisionScan}
  label="Mahlzeit scannen"
/>
```

---

## Icon-Auswahl

| Position | Vorher | Nachher | Lucide Icon |
|----------|--------|---------|-------------|
| QuickActionsMenu | 💧 Droplets | 📓 BookOpen | `BookOpen` |
| LiquidDock Links | ⌘ Aperture | 🍴 UtensilsCrossed | `UtensilsCrossed` |

**Alternativen für Essen:**
- `UtensilsCrossed` - Messer + Gabel gekreuzt (empfohlen)
- `Utensils` - Messer + Gabel parallel
- `Soup` - Suppenschüssel
- `Salad` - Salat

**Für Journal:**
- `BookOpen` - Offenes Buch (empfohlen)
- `NotebookPen` - Notizbuch mit Stift
- `Brain` - Falls es das Mindset Journal ist

---

## Zusammenfassung

| Datei | Änderungen |
|-------|------------|
| `QuickActionsMenu.tsx` | Import ändern, ActionType anpassen, Action-Eintrag ändern |
| `LiquidDock.tsx` | Import ändern, Icon-Prop im DockButton ändern |

**Ergebnis:** Das Wasser-Icon wird durch ein Journal-Icon ersetzt, und das Aperture-Logo wird durch ein Essen-Symbol (gekreuztes Besteck) ersetzt.

