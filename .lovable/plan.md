

# Fix: ActionCard-Kreise werden nicht aktualisiert nach Supplement-Logging

## Problem-Analyse

Das **SupplementsWidget** zeigt korrekt "Morgens 4/4 ✓", aber die **ActionCard** (Timing-Kreise) zeigt immer noch "0/4". Die Ursache ist eine **dreifache Daten-Inkonsistenz**:

### 1. Cache-Architektur-Problem
| Komponente | Datenquelle | Cache-Typ |
|------------|-------------|-----------|
| SupplementsWidget | React Query (`QUERY_KEYS.SUPPLEMENTS_TODAY`) | React Query Cache |
| SupplementTimingCircles | `useSupplementData` Hook | Eigener In-Memory-Cache (5s TTL) |

**Problem:** `invalidateCategory(queryClient, 'supplements')` invalidiert nur React Query Keys, aber `useSupplementData` nutzt einen **eigenen separaten Cache** der nicht invalidiert wird.

### 2. Event-System nicht getriggert
Der `useSupplementData` Hook hört auf `'supplement-stack-changed'` Events, aber:
- `useQuickLogging.logSupplementsTaken` dispatcht dieses Event **nicht**
- `markTimingGroupTaken` im Hook selbst invalidiert React Query, nicht den eigenen Cache

### 3. Timing-Feld-Inkonsistenz (DB-Design-Problem)
| Funktion | Filtert nach |
|----------|--------------|
| `useQuickLogging.logSupplementsTaken` | `.contains('timing', [timing])` (Array-Feld) |
| `useSupplementData` Gruppierung | `preferred_timing` (Single-Value-Feld) |

**Beispiel aus der DB:**
- Astaxanthin: `timing = [noon]`, `preferred_timing = 'morning'`
- Wird von `useQuickLogging` als Noon gezählt, aber von `useSupplementData` als Morning gruppiert!

---

## Lösung

### Fix 1: Event-Dispatch nach Quick-Logging
**Datei:** `src/hooks/useQuickLogging.ts`

Nach erfolgreichem Logging das `'supplement-stack-changed'` Event dispatchen:

```typescript
// Nach Zeile 111: invalidateCategory(queryClient, 'supplements');
// HINZUFÜGEN:
window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
```

### Fix 2: useSupplementData Cache-Invalidierung bei React Query Invalidation
**Datei:** `src/hooks/useSupplementData.tsx`

Option A: React Query statt eigenem Cache nutzen (bevorzugt)
Option B: Auf React Query Cache-Events hören

**Empfehlung: Option A** - Hook auf React Query migrieren für Konsistenz

### Fix 3: Timing-Feld-Konsistenz
**Datei:** `src/hooks/useQuickLogging.ts`

Die `logSupplementsTaken` Funktion sollte nach `preferred_timing` filtern, nicht nach dem `timing` Array:

```typescript
// VORHER (Zeile 72-77):
const { data: supplements, error: fetchError } = await supabase
  .from('user_supplements')
  .select('id, supplement_id, supplements(name)')
  .eq('user_id', user.id)
  .eq('is_active', true)
  .contains('timing', [timing]);

// NACHHER:
const { data: supplements, error: fetchError } = await supabase
  .from('user_supplements')
  .select('id, supplement_id, name, custom_name, preferred_timing')
  .eq('user_id', user.id)
  .eq('is_active', true)
  .eq('preferred_timing', timing);
```

---

## Technische Details

### Betroffene Dateien
| Datei | Änderung |
|-------|----------|
| `src/hooks/useQuickLogging.ts` | Filter auf `preferred_timing` ändern + Event dispatch |
| `src/hooks/useSupplementData.tsx` | Cache-Sync mit React Query |
| `src/components/home/cards/SupplementTimingCircles.tsx` | Refetch nach Logging triggern |

### Datenbank-Analyse
Aktuelle Supplement-Verteilung:
- 17 Supplements mit `preferred_timing = 'morning'`
- 5 mit `preferred_timing = 'bedtime'`
- 3 mit `preferred_timing = 'noon'`
- 2 mit `preferred_timing = 'pre_workout'`
- 1 mit `preferred_timing = 'post_workout'`

**4 von 17 Morning-Supplements wurden heute geloggt** - daher zeigt das Widget korrekt 4/4 für die *genommenen*, aber die ActionCard zeigt 0/4 weil der Cache stale ist.

### Erwartetes Ergebnis nach Fix
1. Logging über ActionCard-Kreise aktualisiert sofort alle UI-Komponenten
2. Widget und ActionCard zeigen konsistente Zahlen
3. Alle Loggins nutzen `preferred_timing` als Single Source of Truth

