

# Plan: Training Widget Timezone & Cache Sync Fix

## Zusammenfassung

Drei Bugs verursachen die falschen Wochen-Bubbles und fehlende UI-Aktualisierung:

1. **Timezone Bug**: `toISOString()` statt lokaler Datumsberechnung für die Wochentage
2. **Query Key Mismatch**: Layer 2 invalidiert `['training-week-overview']`, aber Widget nutzt `['training-sessions-weekly']`
3. **Fehlende Category Invalidierung**: Nach Logging wird `invalidateCategory('workout')` nicht aufgerufen

---

## Problem-Visualisierung

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          AKTUELLER ZUSTAND (FEHLERHAFT)                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  TrainingWidget (Home)                 TrainingDaySheet (Layer 2)               │
│  ──────────────────────                ──────────────────────────               │
│  queryKey: ['training-sessions-weekly'] queryKey: ['training-week-overview']    │
│  dates: toISOString() ← UTC ❌         dates: toISOString() ← UTC ❌            │
│                                                                                 │
│  Nach Logging:                                                                  │
│  → Widget Cache NICHT invalidiert ❌   → Nur lokale Keys invalidiert            │
│  → Zeigt alte Daten                    → Korrekte Daten                         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          ZIELZUSTAND (KORREKT)                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  TrainingWidget (Home)                 TrainingDaySheet (Layer 2)               │
│  ──────────────────────                ──────────────────────────               │
│  queryKey: QUERY_KEYS.TRAINING_WEEKLY  queryKey: QUERY_KEYS.TRAINING_WEEKLY     │
│  dates: getLast7Days() ✅              dates: getLast7Days() ✅                 │
│                                                                                 │
│  Nach Logging:                                                                  │
│  → invalidateCategory('workout') ✅    → Alle Training-Keys invalidiert         │
│  → Widget zeigt sofort neuen Stand     → Home Screen synchronized               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementierung

### 1. Zentralen Helper in `dateHelpers.ts` hinzufügen

Der Helper existiert bereits in `SleepDaySheet.tsx` - er muss nur zentralisiert werden:

```typescript
// In src/utils/dateHelpers.ts

/**
 * Get the last N days as YYYY-MM-DD strings (timezone-aware)
 * Useful for weekly overviews and sparklines
 */
export const getLastNDays = (n: number = 7): string[] => {
  const dates: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(toDateString(d));
  }
  return dates;
};

// Alias for common use case
export const getLast7Days = (): string[] => getLastNDays(7);
```

---

### 2. `TrainingWidget.tsx` korrigieren

**Vorher:**
```typescript
const dates: string[] = [];
const today = new Date();
for (let i = 6; i >= 0; i--) {
  const d = new Date(today);
  d.setDate(d.getDate() - i);
  dates.push(d.toISOString().slice(0, 10));  // ← UTC!
}
```

**Nachher:**
```typescript
import { getLast7Days } from '@/utils/dateHelpers';
// ...
const dates = getLast7Days();  // ← Lokal!
```

---

### 3. `TrainingDaySheet.tsx` korrigieren

#### 3a. Datumsberechnung fixen (Zeile 124-130):

**Vorher:**
```typescript
const dates: string[] = [];
const today = new Date();
for (let i = 6; i >= 0; i--) {
  const d = new Date(today);
  d.setDate(d.getDate() - i);
  dates.push(d.toISOString().slice(0, 10));
}
```

**Nachher:**
```typescript
import { getLast7Days } from '@/utils/dateHelpers';
// ...
const dates = getLast7Days();
```

#### 3b. Query Key vereinheitlichen:

Statt lokaler Keys die zentralen `QUERY_KEYS` verwenden:

```typescript
import { QUERY_KEYS, invalidateCategory } from '@/constants/queryKeys';

// Query: Weekly overview
const { data: weekData } = useQuery({
  queryKey: QUERY_KEYS.TRAINING_WEEKLY,  // ← Einheitlicher Key
  // ...
});
```

#### 3c. Cache-Invalidierung nach Logging verbessern (Zeile 92-95):

**Vorher:**
```typescript
await queryClient.invalidateQueries({ queryKey: ['training-session-today'] });
await queryClient.invalidateQueries({ queryKey: ['training-week-overview'] });
await queryClient.invalidateQueries({ queryKey: ['training-recent-sessions'] });
```

**Nachher:**
```typescript
// Invalidate all workout-related queries (including Home Screen widget)
invalidateCategory(queryClient, 'workout');

// Also invalidate local sheet-specific queries
await queryClient.invalidateQueries({ queryKey: ['training-session-today'] });
await queryClient.invalidateQueries({ queryKey: ['training-recent-sessions'] });
```

---

## Datei-Änderungen

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/utils/dateHelpers.ts` | **EDIT** | `getLastNDays()` und `getLast7Days()` hinzufügen |
| `src/components/home/widgets/TrainingWidget.tsx` | **EDIT** | `getLast7Days()` statt UTC-Berechnung |
| `src/components/home/sheets/TrainingDaySheet.tsx` | **EDIT** | Query Key vereinheitlichen + `invalidateCategory('workout')` |

---

## Vorher/Nachher UI

```text
VORHER (Bug):
┌───────────────────────────────────────┐
│  Training    [Mo][Di][Mi][Do][Fr][Sa][✓]  ← Sonntag grün
│                                       │    (UTC zeigt falschen Tag)
│  0/4 Woche                            │
└───────────────────────────────────────┘

NACHHER (Fix):
┌───────────────────────────────────────┐
│  Training    [Mo][Di][Mi][✓][Fr][Sa][So]  ← Donnerstag grün
│                                       │    (Lokale Zeit korrekt)
│  1/4 Woche                            │
└───────────────────────────────────────┘
```

---

## Bonus: SleepDaySheet aufräumen

Da `getLast7Days()` jetzt zentral ist, kann der lokale Helper in `SleepDaySheet.tsx` entfernt und durch den Import ersetzt werden.

---

## Aufwand

| Task | Zeit |
|------|------|
| `dateHelpers.ts`: Helper hinzufügen | ~5 min |
| `TrainingWidget.tsx`: Fix | ~10 min |
| `TrainingDaySheet.tsx`: Fix + Invalidierung | ~15 min |
| Testen | ~10 min |

**Gesamt: ~40 Minuten**

