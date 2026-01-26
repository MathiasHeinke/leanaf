

# QuickLogSheet Premium Refactor (Final)

## Das Problem

Zeile 83 zeigt das Problem:
```typescript
className="... max-h-[85vh] overflow-hidden"
```

Dieses `overflow-hidden` schneidet langen Content ab und verhindert Scrollen.

---

## Die Lösung: Flex-Architektur (wie NutritionDaySheet)

### Struktur nach Refactor

```text
┌─────────────────────────────────────┐
│ motion.div [drag="y"]               │
│ className="flex flex-col max-h-[85vh]"
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ZONE A: Static Header           │ │
│ │ className="z-10 bg-background"  │ │  ← Bleibt sticky
│ │   ├── Handle Bar                │ │
│ │   ├── Title + Close             │ │
│ │   └── Segmented Tabs            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ZONE B: Scrollable Content      │ │
│ │ className="flex-1 overflow-y-   │ │  ← SCROLLBAR!
│ │   auto overscroll-contain"      │ │
│ │                                 │ │
│ │   └── Logger Component          │ │  ← Kann beliebig lang sein
│ │       (Weight/Training/Journal) │ │
│ │                                 │ │
│ │   [pb-20 für Mobile Safe Area]  │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## Konkrete Änderungen

### 1. Container: `overflow-hidden` → `flex flex-col`

```typescript
// ZEILE 83 - VORHER:
className="fixed bottom-0 left-0 right-0 z-[101] bg-background rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden"

// NACHHER:
className="fixed inset-x-0 bottom-0 z-[101] bg-background rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
```

### 2. Zone A: Header mit z-10 (Zeilen 85-134)

```typescript
{/* ZONE A: Static Header - stays on top */}
<div className="relative z-10 bg-background">
  {/* Handle Bar */}
  <div className="flex justify-center pt-3 pb-2">
    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
  </div>
  
  {/* Header + Tabs */}
  <div className="px-5 pb-4 space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold text-foreground">Quick Log</h2>
      <motion.button ... />
    </div>
    
    {/* iOS Segmented Control */}
    <div className="relative flex bg-muted rounded-2xl p-1">
      {/* Tab buttons - bleiben hier */}
    </div>
  </div>
</div>
```

**Wichtig**: `z-10 bg-background` sorgt dafür, dass der Header über dem scrollenden Content bleibt.

### 3. Zone B: Scrollable Content (Zeilen 136-155)

```typescript
{/* ZONE B: Scrollable Content */}
<div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-20">
  <AnimatePresence mode="wait">
    <motion.div
      key={activeTab}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {activeTab === 'weight' && <WeightLogger onClose={onClose} />}
      {activeTab === 'training' && <TrainingLogger onClose={onClose} />}
      {activeTab === 'sleep' && <SleepLogger onClose={onClose} />}
      {activeTab === 'journal' && <JournalLogger onClose={onClose} />}
      {activeTab === 'tape' && <TapeLogger onClose={onClose} />}
      {activeTab === 'supplements' && <SupplementsLogger onClose={onClose} />}
      {activeTab === 'peptide' && <PeptideLogger onClose={onClose} />}
    </motion.div>
  </AnimatePresence>
</div>
```

**Wichtige Classes**:
- `flex-1`: Nimmt verfügbaren Platz ein
- `overflow-y-auto`: Aktiviert vertikales Scrollen
- `overscroll-contain`: Verhindert Scroll-Chaining (Content-Scroll beeinflusst nicht die Page dahinter)
- `pb-20`: Großzügiger Padding am Ende für Mobile Safe-Area

---

## Was sich NICHT ändert

- `drag="y"` bleibt auf dem `motion.div` Container
- Spring-Animation bleibt identisch (`stiffness: 400, damping: 30`)
- `onDragEnd` Logik für Swipe-to-Close bleibt
- Tab-Switching Logik und AnimatePresence bleiben
- Alle Logger-Komponenten bleiben unverändert

---

## Scroll-vs-Drag Konflikt: Automatisch gelöst

Das neue Layout löst den Konflikt automatisch:
- **Am Handle/Header**: Drag funktioniert → Sheet schließt
- **Im Content**: Scroll funktioniert → Content scrollt
- **Am Scroll-Ende**: Weiteres Ziehen triggert Sheet-Close (optional via CSS `overscroll-behavior`)

---

## Dateiänderungen

| Datei | Änderung |
|-------|----------|
| `src/components/home/QuickLogSheet.tsx` | Layout-Refactor mit Flex + Scroll |

---

## Ergebnis

| Feature | Vorher | Nachher |
|---------|--------|---------|
| Langer Content | Abgeschnitten | Scrollbar |
| Header bei Scroll | Scrollt mit (verdeckt) | Bleibt sticky oben |
| Swipe-to-Close | Ganzes Sheet | Funktioniert weiterhin |
| Scroll-Chaining | Möglich | Verhindert (overscroll-contain) |
| Mobile Safe-Area | pb-8 | pb-20 (mehr Platz) |
| Konsistenz mit NutritionSheet | Unterschiedlich | Identisch |

---

## Zusammenfassung

Die Änderungen sind minimal aber wirkungsvoll:

1. **Container**: `overflow-hidden` entfernen, `flex flex-col` hinzufügen
2. **Header-Zone**: `z-10 bg-background` für Sticky-Header
3. **Content-Zone**: `flex-1 overflow-y-auto overscroll-contain pb-20`

Das Ergebnis: Ein konsistentes "Apple-like" Premium-Gefühl in allen Sheets der App.

