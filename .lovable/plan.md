

# Unified Card Architecture - Finales Refactoring (Phase 1-3)

## Aktuelle Situation

Nach der letzten Aenderung ist **nur der DismissButton exportiert** und wird in EpiphanyCard genutzt. Der Grossteile der Arbeit steht noch aus.

### Status-Matrix

| Komponente | Status | Problem |
|------------|--------|---------|
| DismissButton Export | DONE | - |
| SnoozeHint | DUPLIZIERT | SmartFocusCard Z.196-212 + EpiphanyCard Z.104-120 - identischer Code! |
| SmartActions | MONOLITHISCH | 190 Zeilen inline in SmartFocusCard (Z.385-576) |
| shared/ Ordner | FEHLT | Ordner existiert nicht |
| DynamicFocusCard | OBSOLET | 146 Zeilen, keine Referenzen |
| useDailyFocus | OBSOLET | 96 Zeilen, nur fuer DynamicFocusCard |

---

## Phase 1: Shared Components Ordner + Extraktion

### 1.1 Ordnerstruktur erstellen

```
src/components/home/cards/shared/
├── DismissButton.tsx    (NEU)
├── SnoozeHint.tsx       (NEU)
└── index.ts             (NEU - Re-exports)
```

### 1.2 DismissButton.tsx erstellen

Extrahiere aus `SmartFocusCard.tsx` Zeilen 49-93:

```typescript
// src/components/home/cards/shared/DismissButton.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LucideIcon } from 'lucide-react';

interface DismissButtonProps {
  icon: LucideIcon;
  onDismiss: () => void;
}

export const DismissButton: React.FC<DismissButtonProps> = ({ icon: Icon, onDismiss }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); onDismiss(); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setTimeout(() => setIsHovered(false), 300)}
      whileTap={{ scale: 0.9 }}
      className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/10 
                 flex items-center justify-center transition-colors hover:bg-white/30 flex-shrink-0"
    >
      <AnimatePresence mode="wait">
        {isHovered ? (
          <motion.div
            key="close"
            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.15 }}
          >
            <X size={22} className="text-white" />
          </motion.div>
        ) : (
          <motion.div
            key="icon"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Icon size={22} className="text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};
```

### 1.3 SnoozeHint.tsx erstellen

Extrahiere aus `SmartFocusCard.tsx` Zeilen 192-212:

```typescript
// src/components/home/cards/shared/SnoozeHint.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Clock, ChevronRight } from 'lucide-react';

interface SnoozeHintProps {
  onSnooze: () => void;
}

export const SnoozeHint: React.FC<SnoozeHintProps> = ({ onSnooze }) => (
  <motion.button
    onClick={(e) => { 
      e.stopPropagation(); 
      onSnooze(); 
    }}
    whileTap={{ scale: 0.9 }}
    className="absolute bottom-3 right-3 z-20 flex items-center gap-1 px-2 py-1 
               rounded-full bg-white/10 backdrop-blur-sm border border-white/10
               text-white/40 text-[10px] font-medium hover:bg-white/20 hover:text-white/60 
               transition-all"
  >
    <Clock size={10} />
    <span>2h</span>
    <ChevronRight size={10} className="opacity-60" />
  </motion.button>
);
```

### 1.4 index.ts fuer saubere Re-Exports

```typescript
// src/components/home/cards/shared/index.ts
export { DismissButton } from './DismissButton';
export { SnoozeHint } from './SnoozeHint';
```

---

## Phase 2: SmartFocusCard Modularisieren

### 2.1 SmartActions.tsx erstellen

Extrahiere aus `SmartFocusCard.tsx` Zeilen 375-604 (~230 Zeilen):

```
src/components/home/cards/SmartActions.tsx
```

Diese Datei enthaelt:
- `SmartActions` (Hauptkomponente mit if/switch fuer alle Task-Typen)
- `MicroActionButton` (Bounce & Reset Pattern)
- `HydrationMicroActions` (3 Wasser-Buttons)
- `ActionButton` (Generischer Button)

### 2.2 SmartFocusCard.tsx aktualisieren

**Vorher: 604 Zeilen**
**Nachher: ~180 Zeilen**

Aenderungen:
- Entferne inline `DismissButton` (Zeile 49-93) - Import aus shared/
- Entferne inline `SnoozeHint` (Zeile 192-212) - Import aus shared/
- Entferne inline `MicroActionButton` (Zeile 96-164) - nach SmartActions
- Entferne inline `HydrationMicroActions` (Zeile 166-189) - nach SmartActions
- Entferne inline `SmartActions` (Zeile 375-576) - eigene Datei
- Entferne inline `ActionButton` (Zeile 580-604) - nach SmartActions

Neue Imports:

```typescript
import { DismissButton, SnoozeHint } from './cards/shared';
import { SmartActions } from './cards/SmartActions';
```

### 2.3 EpiphanyCard.tsx aktualisieren

- Entferne lokale `SnoozeHint` Definition (Zeile 104-120)
- Aendere Import von DismissButton:

```typescript
// ALT:
import { DismissButton } from './SmartFocusCard';

// NEU:
import { DismissButton, SnoozeHint } from './cards/shared';
```

---

## Phase 3: Cleanup (Obsolete Dateien loeschen)

### 3.1 DynamicFocusCard.tsx loeschen

Datei: `src/components/home/DynamicFocusCard.tsx` (146 Zeilen)
Grund: Keine aktiven Imports, komplett ersetzt durch ActionCardStack + SmartFocusCard

### 3.2 useDailyFocus.ts loeschen

Datei: `src/hooks/useDailyFocus.ts` (96 Zeilen)
Grund: Nur von DynamicFocusCard genutzt (via Type-Import Zeile 11)

### 3.3 useActionCards.ts bereinigen

Entferne ungenutzte Zeilen:

```typescript
// ENTFERNEN (Zeile 13):
import { useDailyFocus } from './useDailyFocus';

// ENTFERNEN (Zeile 46):
const { focusTask } = useDailyFocus();
```

---

## Resultierende Struktur

```
src/components/home/
├── cards/
│   ├── shared/
│   │   ├── DismissButton.tsx     (45 Zeilen) NEU
│   │   ├── SnoozeHint.tsx        (25 Zeilen) NEU
│   │   └── index.ts              (3 Zeilen)  NEU
│   ├── SmartActions.tsx          (230 Zeilen) NEU
│   ├── SupplementTimingCircles.tsx (existiert)
│   └── PeptideFocusCard.tsx        (existiert)
├── SmartFocusCard.tsx            (~180 Zeilen, vorher 604)
├── EpiphanyCard.tsx              (~310 Zeilen, bereinigt)
├── ActionCardStack.tsx           (unveraendert)
└── [DynamicFocusCard.tsx]        GELOESCHT

src/hooks/
├── [useDailyFocus.ts]            GELOESCHT
└── useActionCards.ts             (bereinigt)
```

---

## Metriken

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| SmartFocusCard.tsx | 604 Zeilen | ~180 Zeilen (-70%) |
| Code-Duplikation (SnoozeHint) | 2x | 1x (shared) |
| Obsolete Dateien | 2 | 0 |
| Neue shared/ Komponenten | 0 | 2 (DismissButton, SnoozeHint) |
| Ordnerstruktur | Flach | Modular |

---

## Reihenfolge der Aenderungen

1. Erstelle `src/components/home/cards/shared/` Ordner
2. Erstelle `DismissButton.tsx` in shared/
3. Erstelle `SnoozeHint.tsx` in shared/
4. Erstelle `index.ts` in shared/
5. Erstelle `SmartActions.tsx` (mit allen extrahierten Komponenten)
6. Aktualisiere `SmartFocusCard.tsx` (entferne inline Code, neue Imports)
7. Aktualisiere `EpiphanyCard.tsx` (entferne SnoozeHint, neuer Import)
8. Loesche `DynamicFocusCard.tsx`
9. Loesche `useDailyFocus.ts`
10. Bereinige `useActionCards.ts`

Dieser Plan macht das System modular, eliminiert Duplikation und bereitet es fuer zukuenftige Card-Typen vor (z.B. BaseActionCard in Phase 4).

