
# Bug Fix: Action Card und Widget zeigen falsche/fehlende Supplements

## Gefundene Probleme

### Problem 1: Action Card zeigt "bedtime" nicht (Screenshot 1)

**Ursache:** Die `SupplementTimingCircles.tsx` verwendet eine veraltete `TIMING_ORDER`:

```typescript
// AKTUELL (falsch):
const TIMING_ORDER = ['morning', 'noon', 'evening', 'pre_workout', 'post_workout', 'before_bed']

// TIMING_CONFIG hat auch nur 'before_bed', nicht 'bedtime'
```

Layer 3 speichert aber `preferred_timing: 'bedtime'` (nicht `before_bed`). Deshalb werden Supplements mit Timing "bedtime" komplett ignoriert.

### Problem 2: Action Card zeigt max. 4-5 Icons

Es gibt kein hartes Limit in der Komponente - das Problem ist, dass nur die Timings angezeigt werden, die in `TIMING_ORDER` und `TIMING_CONFIG` definiert sind. "bedtime" fehlt dort, deshalb erscheint es nicht.

### Problem 3: Widget "1/13" ist falsch berechnet (Screenshot 2)

**Ursache:** In `SupplementsWidget.tsx`:

```typescript
// Zeile 67: Nur die ersten 4 Supplements werden geholt
const items: SupplementItem[] = activeSupps.slice(0, 4).map(supp => ({...}));

// Zeile 72: takenCount wird nur aus diesen 4 berechnet
const takenCount = items.filter(i => i.taken).length;

// Zeile 74-77: Aber total kommt von allen Supplements
return {
  taken: takenCount,  // <- Nur aus 4 Items
  total: activeSupps.length,  // <- Alle 13
};
```

Das bedeutet: Wenn Supplement #5-13 taken sind, zeigt das Widget trotzdem nur den Status der ersten 4.

---

## Loesung

### Fix 1: SupplementTimingCircles.tsx - bedtime hinzufuegen

```typescript
// TIMING_ORDER: bedtime statt before_bed (Layer 3 Standard)
const TIMING_ORDER = ['morning', 'noon', 'evening', 'bedtime', 'pre_workout', 'post_workout'] as const;

// TIMING_CONFIG: bedtime ergaenzen
const TIMING_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  morning: { icon: Sunrise, label: 'Morgens' },
  noon: { icon: Sun, label: 'Mittags' },
  evening: { icon: Moon, label: 'Abends' },
  bedtime: { icon: BedDouble, label: 'Vor Schlaf' },  // NEU
  pre_workout: { icon: Dumbbell, label: 'Pre-WO' },
  post_workout: { icon: Dumbbell, label: 'Post-WO' },
  // Legacy fallback fuer alte Daten
  before_bed: { icon: BedDouble, label: 'Vor Schlaf' },
};
```

Ausserdem muss `getCurrentTimingPhase()` aktualisiert werden:

```typescript
const getCurrentTimingPhase = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 17) return 'pre_workout';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'bedtime';  // 21:00 - 04:59 (statt before_bed)
};
```

### Fix 2: SupplementsWidget.tsx - korrekte Zaehlung

```typescript
// VORHER (falsch):
const items: SupplementItem[] = activeSupps.slice(0, 4).map(supp => ({
  name: supp.custom_name || supp.name || 'Supplement',
  taken: takenMap.has(supp.id)
}));
const takenCount = items.filter(i => i.taken).length;

// NACHHER (korrekt):
// Zuerst korrekte Gesamtzaehlung aus ALLEN Supplements
const takenCount = activeSupps.filter(supp => takenMap.has(supp.id)).length;

// Dann nur Display-Items fuer die UI (max 4)
const items: SupplementItem[] = activeSupps.slice(0, 4).map(supp => ({
  name: supp.custom_name || supp.name || 'Supplement',
  taken: takenMap.has(supp.id)
}));

return {
  taken: takenCount,  // <- Jetzt aus allen Supplements
  total: activeSupps.length,
  items
};
```

---

## Aenderungen

| Datei | Aenderung |
|-------|-----------|
| `src/components/home/cards/SupplementTimingCircles.tsx` | `TIMING_ORDER` auf `bedtime` umstellen, `TIMING_CONFIG` mit `bedtime` ergaenzen, `getCurrentTimingPhase()` fixen |
| `src/components/home/widgets/SupplementsWidget.tsx` | `takenCount` aus allen Supplements berechnen (nicht nur aus slice(0,4)) |

---

## Erwartetes Resultat

**Action Card:**
- Zeigt jetzt alle 6 Timing-Icons: Morgens, Mittags, Abends, Vor Schlaf, Pre-WO, Post-WO
- Um 20:58 Uhr ist "Abends" (evening) als aktuell hervorgehoben
- Ab 21:00 Uhr wechselt die Hervorhebung auf "Vor Schlaf" (bedtime)

**Widget:**
- "X/13" zeigt die korrekte Anzahl eingenommener Supplements
- Die Liste zeigt weiterhin nur 4 Items (UI-Platzersparnis), aber der Zaehler ist akkurat
