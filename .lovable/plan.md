
# Cache-Synchronisation Fix: Widgets, Cards und Ziele

## Problem-Analyse

Drei kritische Synchronisationsprobleme wurden identifiziert:

### 1. Supplements Card - Keine sofortige Aktualisierung
**Ursache:** `useQuickLogging.logSupplementsTaken()` schreibt direkt in die Datenbank, aber ruft **NICHT** `invalidateCategory()` oder optimistisches Cache-Update auf.

**Betroffener Code:**
```
src/hooks/useQuickLogging.ts (Zeile 54-118)
→ Fehlt: queryClient.invalidateQueries() nach erfolgreichem Insert
```

### 2. Wasserziel - Settings/Profil syncen nicht mit Dashboard
**Ursache:** 
- `Settings.tsx` speichert `fluid_goal_ml`, aber invalidiert **NICHT** den `DAILY_METRICS` Cache
- `Profile.tsx` speichert Goals, invalidiert aber nur via RPC (Server-seitig), nicht den Client-Cache

**Betroffener Code:**
```
src/components/Settings.tsx (Zeile 86-146) → Fehlt: invalidateQueries
src/pages/Profile.tsx (Zeile 604-640) → Fehlt: invalidateQueries
```

### 3. Nutrition Widget - MealInput aktualisiert nicht sofort
**Ursache:** `MealConfirmationDialog` nutzt `triggerDataRefresh()` (altes Event-System), aber invalidiert **NICHT** den React Query Cache `DAILY_METRICS`.

**Betroffener Code:**
```
src/components/MealConfirmationDialog.tsx (Zeile 316)
→ triggerDataRefresh() hat keine Verbindung zu React Query!
```

---

## Loesung: Unified Cache Invalidation

### Schritt 1: useQuickLogging.ts - Cache Invalidation hinzufuegen

```typescript
// Nach erfolgreichem Supplement-Insert (Zeile 102):
import { useQueryClient } from '@tanstack/react-query';
import { invalidateCategory } from '@/constants/queryKeys';

// Im Hook:
const queryClient = useQueryClient();

// Nach Insert-Erfolg:
invalidateCategory(queryClient, 'supplements');
```

### Schritt 2: Settings.tsx - Cache Invalidation nach Speichern

```typescript
// Nach erfolgreichem Speichern (Zeile 115):
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';

// Im Komponenten-Body:
const queryClient = useQueryClient();

// Nach dem Upsert:
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_METRICS });
```

### Schritt 3: Profile.tsx - Cache Invalidation nach Speichern

```typescript
// Nach performSave() (Zeile 621):
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';

// Im Komponenten-Body:
const queryClient = useQueryClient();

// Nach RPC-Aufruf:
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_METRICS });
```

### Schritt 4: MealConfirmationDialog.tsx - React Query statt Event-Bus

```typescript
// Zeile 316 ersetzen:
// ALT: triggerDataRefresh();
// NEU:
import { useQueryClient } from '@tanstack/react-query';
import { invalidateCategory } from '@/constants/queryKeys';

// Im Komponenten-Body:
const queryClient = useQueryClient();

// Nach Meal-Insert:
invalidateCategory(queryClient, 'nutrition');
```

---

## Uebersicht aller Aenderungen

| Datei | Aenderung | Betroffene Widgets |
|-------|-----------|-------------------|
| `src/hooks/useQuickLogging.ts` | `invalidateCategory(queryClient, 'supplements')` nach Insert | SupplementsWidget, SmartFocusCard |
| `src/components/Settings.tsx` | `queryClient.invalidateQueries(DAILY_METRICS)` nach Save | HydrationWidget, NutritionWidget |
| `src/pages/Profile.tsx` | `queryClient.invalidateQueries(DAILY_METRICS)` nach Save | Alle Widgets mit Zielen |
| `src/components/MealConfirmationDialog.tsx` | `invalidateCategory(queryClient, 'nutrition')` statt triggerDataRefresh | NutritionWidget |

---

## Zusaetzliche Pruefung: Alle Widget-Datenquellen

| Widget | Datenquelle | Status |
|--------|-------------|--------|
| HydrationWidget | `useDailyMetrics()` | OK - nutzt zentralen Cache |
| NutritionWidget | `useDailyMetrics()` | OK - nutzt zentralen Cache |
| SupplementsWidget | Eigener `useQuery(SUPPLEMENTS_TODAY)` | OK - wird durch invalidateCategory getriggert |
| TrainingWidget | `useDailyMetrics()` + `useQuery(TRAINING_WEEKLY)` | OK |
| WeightWidget | `useDailyMetrics()` | OK |
| SleepWidget | `useDailyMetrics()` | OK |

---

## Ergebnis nach Fix

1. **Supplements:** Klick auf Morgen/Abends-Button → Widget zeigt sofort Check
2. **Wasserziel:** Aenderung in Settings ODER HydrationDaySheet ODER Profile → Alle zeigen neues Ziel
3. **Nutrition:** Mahlzeit gespeichert → Widget zeigt sofort neue Kalorien

---

## Technische Details

**Warum `triggerDataRefresh()` nicht funktioniert:**
- Altes Event-System (`DataRefreshEventBus`) ist NICHT mit React Query verbunden
- Widgets nutzen `useDailyMetrics()` (React Query), nicht den Event-Bus

**Warum `invalidateQueries` die Loesung ist:**
- Markiert Cache als "stale"
- Triggert sofortigen Background-Refetch
- Alle Komponenten die `useDailyMetrics()` nutzen werden automatisch aktualisiert

