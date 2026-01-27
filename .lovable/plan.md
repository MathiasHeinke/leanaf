

# Fix: Quick-Input Buttons & Create Supplements Layer 2 Sheet

## Problem-Zusammenfassung

1. **Bug**: Klick auf "Supplements", "Peptides" oder "Hydration" im QuickAddFAB tut auf der AresHome-Seite nichts, weil die Event-Handler im `quickAddBus.subscribe()` fehlen
2. **Fehlende Layer 2**: Das Supplements-Widget navigiert direkt zur `/supplements` Seite statt ein schnelles Dashboard-Overlay zu öffnen

---

## Analyse

### Fehlende Handler in AresHome.tsx (Zeile 178-194)

```typescript
// AKTUELL - Nur diese Handler existieren:
if (action.type === 'journal') → ✅ funktioniert
if (action.type === 'sleep') → ✅ funktioniert  
if (action.type === 'weight' || action.type === 'body') → ✅ funktioniert
if (action.type === 'training') → ✅ funktioniert
if (action.type === 'tape') → ✅ funktioniert

// FEHLEN:
if (action.type === 'supplements' || action.type === 'chemistry') → ❌ FEHLT
if (action.type === 'peptide') → ❌ FEHLT
if (action.type === 'hydration') → ❌ FEHLT
if (action.type === 'meal') → ❌ FEHLT
```

### Layer 2 Sheet Status

| Widget | Sheet | Status |
|--------|-------|--------|
| Nutrition | NutritionDaySheet | ✅ |
| Hydration | HydrationDaySheet | ✅ |
| Training | TrainingDaySheet | ✅ |
| Weight | BodyTrendSheet | ✅ |
| Peptides | PeptidesSheet | ✅ |
| **Supplements** | **Fehlt** | ❌ Navigiert zu /supplements |
| Sleep | Fehlt | Navigiert zu /sleep |

---

## Lösung

### Teil 1: Fehlende Handler in AresHome.tsx ergänzen

**Datei:** `src/pages/AresHome.tsx` (Zeile 178-194)

```typescript
// Subscribe to quickAddBus for events from SmartFocusCard & LiquidDock
useEffect(() => {
  const unsub = quickAddBus.subscribe((action) => {
    // Existing handlers
    if (action.type === 'journal') {
      setQuickLogConfig({ open: true, tab: 'journal' });
    } else if (action.type === 'sleep') {
      setQuickLogConfig({ open: true, tab: 'sleep' });
    } else if (action.type === 'weight' || action.type === 'body') {
      setQuickLogConfig({ open: true, tab: 'weight' });
    } else if (action.type === 'training') {
      setQuickLogConfig({ open: true, tab: 'training' });
    } else if (action.type === 'tape') {
      setQuickLogConfig({ open: true, tab: 'tape' });
    }
    // NEU: Fehlende Handler
    else if (action.type === 'supplements' || action.type === 'chemistry') {
      setSupplementsSheetOpen(true);  // Öffnet Layer 2 Sheet
    }
    else if (action.type === 'peptide') {
      setPeptidesSheetOpen(true);  // Bereits vorhanden als State
    }
    else if (action.type === 'hydration') {
      setHydrationSheetOpen(true);  // Bereits vorhanden
    }
    else if (action.type === 'meal') {
      setMealOpen(true);  // Meal Input Sheet
    }
  });
  return unsub;
}, []);
```

### Teil 2: SupplementsDaySheet erstellen

**Neue Datei:** `src/components/home/sheets/SupplementsDaySheet.tsx`

Folgt dem Muster von TrainingDaySheet mit:

**Structure:**
```text
┌─────────────────────────────────────┐
│ [Handle Bar]                        │
├─────────────────────────────────────┤
│ Supplemente heute         [X]       │
│ Dienstag, 28. Januar 2026           │
├─────────────────────────────────────┤
│ ╔═══════════════════════════════╗   │
│ ║  Morning Stack (3/5)       ●  ║   │
│ ║  ☀️ Aktueller Zeitraum        ║   │
│ ╚═══════════════════════════════╝   │
│                                     │
│ ┌───────────────────────────────┐   │
│ │ ☐ Vitamin D3      5000 IU    │   │
│ │ ☐ Omega-3         2g          │   │
│ │ ☑ Magnesium       400mg       │   │
│ │ ☑ Kreatin         5g          │   │
│ │ ☐ Multivitamin    1 Tab       │   │
│ └───────────────────────────────┘   │
│                                     │
│ ── Weitere Zeiträume ──             │
│ [Mittag 0/2] [Abend 1/3]           │
├─────────────────────────────────────┤
│ [    Quick Log    ]  [⚙️]          │
└─────────────────────────────────────┘
```

**Features:**
- **Hero Section**: Aktuelle Timing-Phase mit Progress (basierend auf Uhrzeit)
- **Supplement Liste**: Checkboxen mit Optimistic UI (wie im SupplementsLogger)
- **Weitere Phasen**: Collapsed anzeigen, expandierbar
- **Footer Actions**: 
  - "Quick Log" → Öffnet QuickLogSheet mit Tab 'supplements'
  - Settings-Icon → Navigiert zu /supplements

**Datenquelle:** `useSupplementData()` Hook (bereits vorhanden)
- `groupedSupplements`: Supplements nach Timing gruppiert
- `markSupplementTaken()`: Toggle für einzelne Supplements
- `markTimingGroupTaken()`: "Alle nehmen" für eine Gruppe

### Teil 3: SupplementsWidget anpassen

**Datei:** `src/components/home/widgets/SupplementsWidget.tsx`

```typescript
interface SupplementsWidgetProps {
  size: WidgetSize;
  onOpenSheet?: () => void;  // NEU
}

// onClick ändern von:
onClick={() => navigate('/supplements')}

// zu:
onClick={() => onOpenSheet ? onOpenSheet() : navigate('/supplements')}
```

### Teil 4: WidgetRenderer anpassen

**Datei:** `src/components/home/widgets/WidgetRenderer.tsx`

```typescript
interface WidgetRendererProps {
  config: WidgetConfig;
  onOpenNutritionSheet?: () => void;
  onOpenHydrationSheet?: () => void;
  onOpenBodySheet?: () => void;
  onOpenPeptidesSheet?: () => void;
  onOpenTrainingSheet?: () => void;
  onOpenSupplementsSheet?: () => void;  // NEU
}

// Im switch case 'supplements':
case 'supplements':
  return <SupplementsWidget size={size} onOpenSheet={onOpenSupplementsSheet} />;
```

### Teil 5: MetricWidgetGrid anpassen

**Datei:** `src/components/home/MetricWidgetGrid.tsx`

```typescript
interface MetricWidgetGridProps {
  // ... bestehende props
  onOpenSupplementsSheet?: () => void;  // NEU
}

// In WidgetRenderer weitergeben:
<WidgetRenderer 
  config={widget} 
  onOpenNutritionSheet={onOpenNutritionSheet}
  onOpenHydrationSheet={onOpenHydrationSheet}
  onOpenBodySheet={onOpenBodySheet}
  onOpenPeptidesSheet={onOpenPeptidesSheet}
  onOpenTrainingSheet={onOpenTrainingSheet}
  onOpenSupplementsSheet={onOpenSupplementsSheet}  // NEU
/>
```

### Teil 6: AresHome Integration

**Datei:** `src/pages/AresHome.tsx`

```typescript
// Neuer State
const [supplementsSheetOpen, setSupplementsSheetOpen] = useState(false);

// MetricWidgetGrid Props erweitern
<MetricWidgetGrid
  onOpenNutritionSheet={() => setNutritionSheetOpen(true)}
  onOpenHydrationSheet={() => setHydrationSheetOpen(true)}
  onOpenBodySheet={() => setBodySheetOpen(true)}
  onOpenPeptidesSheet={() => setPeptidesSheetOpen(true)}
  onOpenTrainingSheet={() => setTrainingSheetOpen(true)}
  onOpenSupplementsSheet={() => setSupplementsSheetOpen(true)}  // NEU
/>

// Sheet rendern
<SupplementsDaySheet
  isOpen={supplementsSheetOpen}
  onClose={() => setSupplementsSheetOpen(false)}
  onOpenLogger={() => {
    setSupplementsSheetOpen(false);
    setQuickLogConfig({ open: true, tab: 'supplements' });
  }}
/>
```

---

## Betroffene Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/pages/AresHome.tsx` | EDIT | Handler für supplements/peptide/hydration/meal hinzufügen, State + Sheet |
| `src/components/home/sheets/SupplementsDaySheet.tsx` | NEU | Layer 2 Sheet mit Timing-Gruppen |
| `src/components/home/widgets/SupplementsWidget.tsx` | EDIT | onOpenSheet prop hinzufügen |
| `src/components/home/widgets/WidgetRenderer.tsx` | EDIT | onOpenSupplementsSheet prop durchreichen |
| `src/components/home/MetricWidgetGrid.tsx` | EDIT | onOpenSupplementsSheet prop hinzufügen |

---

## Erwartetes Ergebnis

1. **Quick-Input Buttons funktionieren:**
   - Klick auf "Supplements" → Öffnet SupplementsDaySheet (Layer 2)
   - Klick auf "Peptide" → Öffnet PeptidesSheet (bereits vorhanden)
   - Klick auf "Hydration" → Öffnet HydrationDaySheet (bereits vorhanden)

2. **Supplements Widget:**
   - Klick auf Widget → Öffnet SupplementsDaySheet (statt /supplements Navigation)
   - Schnelles Abhaken des Morning/Noon/Evening Stacks
   - "Manage Stack" Button für Deep-Dive zu /supplements

3. **UX-Konsistenz:**
   - Alle Widgets folgen dem Three-Layer-Design
   - Schnelle Interaktion ohne Seitenwechsel
   - Optimistic UI für sofortiges Feedback

