
# Plan: Unified Widget Cache Synchronization

## Problemanalyse

Die Widget-Cache-Strategie ist fragmentiert:

| Widget | Query Key | StaleTime | Wird invalidiert? |
|--------|-----------|-----------|-------------------|
| HydrationWidget | `['daily-metrics']` | - | JA (via useDailyMetrics) |
| NutritionWidget | `['daily-metrics']` | - | JA (via useDailyMetrics) |
| **SupplementsWidget** | `['supplements-today-widget']` | 30s | NEIN |
| **TrainingWidget** | `['training-sessions-weekly']` | 60s | NEIN |
| **WeightWidget** | `['weight-recent']` | 60s | NEIN |

**Root Cause:** 
- `useAresEvents.ts` invalidiert nur `DAILY_METRICS_KEY` (Zeile 268)
- `useSupplementData.tsx` hat gar keine Query-Invalidation nach dem Logging
- Die Widget-eigenen Query-Keys werden nie invalidiert

---

## Loesung: Zentralisierte Cache-Invalidation

### Phase 1: Query-Key Registry erstellen

**Neue Datei:** `src/constants/queryKeys.ts`

```typescript
export const QUERY_KEYS = {
  DAILY_METRICS: ['daily-metrics'] as const,
  SUPPLEMENTS_TODAY: ['supplements-today-widget'] as const,
  SUPPLEMENTS_DATA: ['supplement-data'] as const,
  TRAINING_WEEKLY: ['training-sessions-weekly'] as const,
  WEIGHT_RECENT: ['weight-recent'] as const,
  SLEEP_RECENT: ['sleep-recent'] as const,
} as const;

// Mapping: Kategorie -> alle zu invalidierenden Keys
export const CATEGORY_QUERY_MAP: Record<string, readonly (readonly string[])[]> = {
  supplements: [QUERY_KEYS.SUPPLEMENTS_TODAY, QUERY_KEYS.SUPPLEMENTS_DATA, QUERY_KEYS.DAILY_METRICS],
  peptide: [QUERY_KEYS.SUPPLEMENTS_TODAY, QUERY_KEYS.DAILY_METRICS],
  water: [QUERY_KEYS.DAILY_METRICS],
  coffee: [QUERY_KEYS.DAILY_METRICS],
  weight: [QUERY_KEYS.WEIGHT_RECENT, QUERY_KEYS.DAILY_METRICS],
  workout: [QUERY_KEYS.TRAINING_WEEKLY, QUERY_KEYS.DAILY_METRICS],
  sleep: [QUERY_KEYS.SLEEP_RECENT, QUERY_KEYS.DAILY_METRICS],
  nutrition: [QUERY_KEYS.DAILY_METRICS],
  journal: [QUERY_KEYS.DAILY_METRICS],
};

// Helper function fuer Batch-Invalidation
export const invalidateCategory = (
  queryClient: any,
  category: string
) => {
  const keys = CATEGORY_QUERY_MAP[category] || [QUERY_KEYS.DAILY_METRICS];
  keys.forEach(key => {
    queryClient.invalidateQueries({ queryKey: key });
  });
};
```

---

### Phase 2: useAresEvents.ts aktualisieren

**Datei:** `src/hooks/useAresEvents.ts`

**Aenderungen:**

1. Import der neuen Konstanten (Zeile 10):
```typescript
import { QUERY_KEYS, invalidateCategory } from '@/constants/queryKeys';
```

2. Zeilen 266-269 ersetzen - Statt 2s Timeout sofortige Invalidation:
```typescript
// === C. IMMEDIATE CACHE INVALIDATION ===
// Invalidiere alle relevanten Queries fuer diese Kategorie
invalidateCategory(queryClient, category);
```

**Vorher:**
```typescript
setTimeout(() => {
  queryClient.invalidateQueries({ queryKey: DAILY_METRICS_KEY });
}, 2000);
```

**Nachher:**
```typescript
invalidateCategory(queryClient, category);
```

---

### Phase 3: useSupplementData.tsx aktualisieren

**Datei:** `src/hooks/useSupplementData.tsx`

**Aenderungen:**

1. Imports hinzufuegen (nach Zeile 5):
```typescript
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
```

2. Im Hook queryClient injizieren (nach Zeile 139):
```typescript
const queryClient = useQueryClient();
```

3. In `markSupplementTaken` nach erfolgreichem upsert (Zeile 347):
```typescript
if (error) throw error;

// === SOFORTIGE WIDGET-SYNC ===
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLEMENTS_TODAY });
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_METRICS });
```

4. In `markTimingGroupTaken` nach erfolgreichem upsert (Zeile 420):
```typescript
if (error) throw error;

// === SOFORTIGE WIDGET-SYNC ===
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLEMENTS_TODAY });
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_METRICS });
```

---

### Phase 4: Widgets auf Konstanten umstellen

**Warum?** Typo-Sicherheit und Konsistenz.

**SupplementsWidget.tsx** (Zeile 24):
```typescript
// VORHER
queryKey: ['supplements-today-widget'],

// NACHHER
import { QUERY_KEYS } from '@/constants/queryKeys';
queryKey: QUERY_KEYS.SUPPLEMENTS_TODAY,
```

**TrainingWidget.tsx** (Zeile 19):
```typescript
// VORHER
queryKey: ['training-sessions-weekly'],

// NACHHER
import { QUERY_KEYS } from '@/constants/queryKeys';
queryKey: QUERY_KEYS.TRAINING_WEEKLY,
```

**WeightWidget.tsx** (Zeile 19):
```typescript
// VORHER
queryKey: ['weight-recent'],

// NACHHER
import { QUERY_KEYS } from '@/constants/queryKeys';
queryKey: QUERY_KEYS.WEIGHT_RECENT,
```

---

### Phase 5: StaleTime reduzieren (optional aber empfohlen)

| Widget | VORHER | NACHHER |
|--------|--------|---------|
| SupplementsWidget | 30000ms | 10000ms |
| TrainingWidget | 60000ms | 10000ms |
| WeightWidget | 60000ms | 10000ms |

Dies ermoeglicht schnellere Hintergrund-Refreshes, falls die Invalidation verpasst wird.

---

## Zusammenfassung der Datei-Aenderungen

| Datei | Aktion | Aenderung |
|-------|--------|-----------|
| `src/constants/queryKeys.ts` | NEU | Zentrale Query-Key Registry + Helper |
| `src/hooks/useAresEvents.ts` | AENDERN | Import + sofortige Invalidation statt 2s Timeout |
| `src/hooks/useSupplementData.tsx` | AENDERN | queryClient + Invalidation nach Logging |
| `src/components/home/widgets/SupplementsWidget.tsx` | AENDERN | Import QUERY_KEYS, staleTime=10000 |
| `src/components/home/widgets/TrainingWidget.tsx` | AENDERN | Import QUERY_KEYS, staleTime=10000 |
| `src/components/home/widgets/WeightWidget.tsx` | AENDERN | Import QUERY_KEYS, staleTime=10000 |

---

## Erwartetes Ergebnis

1. **Supplements Widget:** Aktualisiert sofort nach Klick auf Timing-Kreise
2. **Training Widget:** Aktualisiert sofort nach Workout-Logging
3. **Weight Widget:** Aktualisiert sofort nach Gewichts-Logging
4. **Kein 2-Sekunden-Delay mehr:** Alle Widgets reagieren instant

---

## Technische Details

### Datenfluss nach Implementierung

```text
User klickt "Morning Supplements" Button
         |
         v
SupplementTimingCircles.onLog('morning')
         |
         v
markTimingGroupTaken('morning')
         |
         +---> Optimistisches Update (lokaler State)
         |
         +---> Supabase upsert (async)
         |
         +---> queryClient.invalidateQueries(['supplements-today-widget'])
         |
         v
SupplementsWidget re-rendert mit neuen Daten (< 100ms)
```

### Warum sofortige Invalidation statt Delay?

- **2s Delay war defensiv:** Urspruenglich gedacht als "Warte bis DB-Write sicher durch ist"
- **Problem:** User sieht 2s lang veraltete Daten
- **Loesung:** Invalidierung SOFORT nach erfolgreicher DB-Response
- **Fallback:** Wenn DB-Write fehlschlaegt, wird ebenfalls invalidiert (Rollback)
