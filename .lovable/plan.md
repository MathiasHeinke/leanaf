
# Supplement Layer 2: Chronologische Sortierung mit Hervorhebung

## Problem

1. **Keine Sortierung**: Timing-Gruppen werden in zufaelliger Object-Key-Reihenfolge angezeigt
2. **Unvollstaendige Zeiterkennung**: `getCurrentTiming()` kennt nur morning/noon/evening, aber nicht `bedtime`
3. **Keine visuelle Hervorhebung** des aktuellen Zeitslots

---

## Loesung

### 1. Chronologische Sortier-Reihenfolge definieren

```typescript
const TIMING_ORDER: string[] = [
  'morning',      // 05:00 - 11:59
  'noon',         // 12:00 - 16:59  
  'evening',      // 17:00 - 20:59
  'bedtime',      // 21:00 - 04:59
  'pre_workout',  // Dynamisch
  'post_workout', // Dynamisch
];
```

### 2. getCurrentTiming() erweitern

```typescript
const getCurrentTiming = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'noon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'bedtime'; // 21:00 - 04:59
};
```

### 3. Timings sortieren vor Anzeige

```typescript
const sortedTimings = Object.keys(groupedSupplements).sort(
  (a, b) => TIMING_ORDER.indexOf(a) - TIMING_ORDER.indexOf(b)
);
```

### 4. Aktuelle Zeit visuell hervorheben

Der aktuelle Zeitslot bekommt einen farbigen Rand und "Jetzt"-Badge:

```typescript
const isCurrent = timing === currentTiming;

// Im JSX:
<div className={cn(
  "...",
  isCurrent && !isComplete && "ring-2 ring-primary/50"
)}>
  {isCurrent && !isComplete && (
    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
      Jetzt
    </span>
  )}
</div>
```

---

## Aenderungen

| Datei | Aenderung |
|-------|-----------|
| `src/components/home/loggers/SupplementsLogger.tsx` | TIMING_ORDER hinzufuegen, getCurrentTiming() erweitern, sortedTimings verwenden, "Jetzt"-Badge hinzufuegen |

---

## Resultat

```text
+----------------------------------+
| [ring] Morgens ← "Jetzt" Badge   |  (wenn 06:00-11:59)
|        2/3                       |
+----------------------------------+
| Mittags                          |
|        0/4                       |
+----------------------------------+
| Abends                           |
|        0/2                       |
+----------------------------------+
| Vor dem Schlafen                 |
|        0/1                       |
+----------------------------------+
```

Die Reihenfolge ist immer chronologisch. Der aktuelle Zeitslot ist visuell hervorgehoben mit einem Ring und "Jetzt"-Badge, sofern er noch nicht komplett erledigt ist.
