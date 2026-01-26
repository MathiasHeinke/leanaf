
# Masterplan: Unified Quick Log Sheet (7 Tabs)

## 1. Analyse: Was haben wir JETZT?

### Aktuelle Architektur (fragmentiert)

```text
                    ┌─────────────────────────────────────────────────────┐
                    │              QuickAddFAB (Floating Button)          │
                    │          Steuert 6 verschiedene Overlays            │
                    └───────────────────────┬─────────────────────────────┘
                                            │
        ┌───────────────┬───────────────┬───┴───┬───────────────┬─────────────────┐
        ▼               ▼               ▼       ▼               ▼                 ▼
   QuickMealSheet  QuickWorkout   QuickSleep  QuickFluid  ChemistryStack   BodyStackSheet
                      Modal         Modal      Modal        Sheet              Sheet
                                                              │                   │
                                                    ┌─────────┴─────┐    ┌────────┴────────┐
                                                    ▼               ▼    ▼                 ▼
                                              SupplementsLogger PeptideLogger WeightLogger TapeLogger
```

### Das Problem

| Sheet | Tabs | Logger-Komponenten |
|-------|------|--------------------|
| QuickLogSheet | 5 Tabs | Weight, Training, Sleep, Journal, Tape |
| ChemistryStackSheet | 2 Tabs | Supplements, Peptide |
| BodyStackSheet | 2 Tabs | Weight, Tape (Duplikat!) |

**3 kritische Probleme:**

1. **Fragmentierung**: User muss wissen, welches Sheet welche Funktion hat
2. **Duplikate**: `WeightLogger` und `TapeLogger` existieren in ZWEI Sheets (QuickLog + BodyStack)
3. **Inkonsistentes UX**: Chemistry hat anderes Design (Radix Sheet) als QuickLog (Custom Motion Sheet)

---

## 2. Ziel: EINE einheitliche Tracking-Zentrale

### Neue Architektur (vereinheitlicht)

```text
                    ┌─────────────────────────────────────────────────────┐
                    │              QuickAddFAB (Floating Button)          │
                    │        Steuert NUR QuickLogSheet + Meal/Workout     │
                    └───────────────────────┬─────────────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────────┐
                    ▼                                                   ▼
           QuickLogSheet (7 Tabs)                             QuickMealSheet
           ┌─────────────────────────────────────┐           (bleibt separat -
           │ Weight │ Training │ Sleep │ Journal │            Foto-Upload-Flow)
           │ Tape   │  Supps   │ Peptide         │
           └─────────────────────────────────────┘
```

### Warum vereinheitlichen?

| Vorher | Nachher |
|--------|---------|
| 3 verschiedene Sheets merken | 1 Sheet, alles drin |
| 2x Weight/Tape Logger (Wartungsalptraum) | Jeder Logger nur 1x |
| Unterschiedliche Animationen | Einheitliche Premium-UX |
| 6 State-Variablen in QuickAddFAB | 2 State-Variablen |

---

## 3. Technische Umsetzung

### Phase 1: QuickLogSheet erweitern

**Datei:** `src/components/home/QuickLogSheet.tsx`

**Aktuelle Tabs (5):**
```typescript
const tabs = [
  { id: 'weight', icon: Scale, label: 'Gewicht' },
  { id: 'training', icon: Dumbbell, label: 'Training' },
  { id: 'sleep', icon: Moon, label: 'Schlaf' },
  { id: 'journal', icon: BookOpen, label: 'Journal' },
  { id: 'tape', icon: Ruler, label: 'Maße' },
];
```

**Neue Tabs (7):**
```typescript
const tabs = [
  { id: 'weight', icon: Scale, label: 'Gewicht' },
  { id: 'training', icon: Dumbbell, label: 'Training' },
  { id: 'sleep', icon: Moon, label: 'Schlaf' },
  { id: 'journal', icon: BookOpen, label: 'Journal' },
  { id: 'tape', icon: Ruler, label: 'Maße' },
  { id: 'supplements', icon: Pill, label: 'Supps' },    // NEU
  { id: 'peptide', icon: Syringe, label: 'Peptide' },   // NEU
];
```

**Imports hinzufügen:**
```typescript
import { Pill, Syringe } from 'lucide-react';
import { SupplementsLogger } from './loggers/SupplementsLogger';
import { PeptideLogger } from './loggers/PeptideLogger';
```

**Render-Logic erweitern:**
```typescript
{activeTab === 'supplements' && <SupplementsLogger onClose={onClose} />}
{activeTab === 'peptide' && <PeptideLogger onClose={onClose} />}
```

**Type erweitern:**
```typescript
export type QuickLogTab = 'weight' | 'training' | 'sleep' | 'journal' | 'tape' | 'supplements' | 'peptide';
```

---

### Phase 2: Mobile Tab-Bar optimieren (7 Icons)

Bei 7 Tabs wird es auf kleinen Screens eng. Loesung: **Icon-Only auf Mobile**.

**Aktuelle Logik:**
```typescript
<span className="hidden sm:inline">{tab.label}</span>
```

Das ist bereits richtig - Labels werden nur auf Desktop (sm+) angezeigt.

**Zusätzliche Optimierung - Sliding Indicator Breite anpassen:**
```typescript
// Vorher (5 Tabs)
style={{ width: `calc(${100 / 5}% - 4px)` }}

// Nachher (7 Tabs)  
style={{ width: `calc(${100 / 7}% - 4px)` }}
```

---

### Phase 3: QuickAddFAB vereinfachen

**Datei:** `src/components/quick/QuickAddFAB.tsx`

**Zu entfernende State-Variablen:**
```typescript
// LÖSCHEN:
const [chemistryOpen, setChemistryOpen] = useState(false);
const [bodyOpen, setBodyOpen] = useState(false);
```

**Neuer State:**
```typescript
const [quickLogOpen, setQuickLogOpen] = useState(false);
const [quickLogInitialTab, setQuickLogInitialTab] = useState<QuickLogTab>('weight');
```

**handleSelect anpassen:**
```typescript
if (type === "chemistry") {
  setMenuOpen(false);
  setQuickLogInitialTab('supplements');  // Öffnet direkt Supplements-Tab
  setQuickLogOpen(true);
  return;
}
if (type === "body") {
  setMenuOpen(false);
  setQuickLogInitialTab('weight');       // Öffnet direkt Weight-Tab
  setQuickLogOpen(true);
  return;
}
```

**Lazy Imports bereinigen:**
```typescript
// LÖSCHEN:
const ChemistryStackSheet = lazy(() => import("@/components/home/ChemistryStackSheet"));
const BodyStackSheet = lazy(() => import("@/components/home/BodyStackSheet"));

// HINZUFÜGEN:
const QuickLogSheet = lazy(() => import("@/components/home/QuickLogSheet"));
```

---

### Phase 4: quickAddBus erweitern

**Datei:** `src/components/quick/quickAddBus.ts`

```typescript
export type QuickActionType = 
  | 'meal' | 'workout' | 'sleep' | 'supplements' 
  | 'journal' | 'chemistry' | 'body' | 'hydration'
  | 'weight' | 'training' | 'tape' | 'peptide';  // Direkte Tab-Öffner

export const openWeight = () => quickAddBus.emit({ type: 'weight' });
export const openTape = () => quickAddBus.emit({ type: 'tape' });
export const openPeptide = () => quickAddBus.emit({ type: 'peptide' });
```

---

### Phase 5: Obsolete Dateien markieren/löschen

Nach erfolgreicher Migration können diese Dateien entfernt werden:

```text
src/components/home/ChemistryStackSheet.tsx   → LÖSCHEN
src/components/home/BodyStackSheet.tsx        → LÖSCHEN
```

Die Logger-Komponenten bleiben erhalten:
```text
src/components/home/loggers/SupplementsLogger.tsx  ✓ (wird jetzt von QuickLogSheet verwendet)
src/components/home/loggers/PeptideLogger.tsx      ✓ (wird jetzt von QuickLogSheet verwendet)
```

---

## 4. Implementierungs-Reihenfolge

| Schritt | Beschreibung | Risiko |
|---------|--------------|--------|
| 1 | QuickLogSheet: Tabs + Imports + Render erweitern | Niedrig |
| 2 | QuickLogSheet: Sliding Indicator auf 7 Tabs anpassen | Niedrig |
| 3 | QuickAddFAB: State vereinfachen + Routing ändern | Mittel |
| 4 | quickAddBus: Neue Action-Types hinzufügen | Niedrig |
| 5 | Testen: Alle 7 Tabs funktionieren | - |
| 6 | Cleanup: ChemistryStackSheet + BodyStackSheet löschen | Niedrig |

---

## 5. Ergebnis nach Implementation

### User Experience

- **1 Sheet** für alle Tracking-Kategorien
- **Swipe** zwischen Tabs möglich (Framer Motion)
- **Deep-Links** via quickAddBus (z.B. Carousel → öffnet direkt Supplements-Tab)
- **Konsistentes Design** (einheitliche Animation, Drag-to-Close)

### Code Quality

- **-2 Dateien** (ChemistryStackSheet, BodyStackSheet)
- **-4 State-Variablen** in QuickAddFAB
- **0 Duplikate** (WeightLogger/TapeLogger nur noch 1x referenziert)
- **1 zentrale Komponente** für alle Quick-Logs

