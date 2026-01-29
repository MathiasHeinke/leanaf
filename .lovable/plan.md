

# Fix: Layer 2 Supplement Sheet Query-Synchronisation

## Problem-Zusammenfassung

| Layer | Datenquelle | Update-Mechanismus | Status |
|-------|-------------|-------------------|--------|
| Layer 1 (Widget) | React Query | `invalidateQueries` | ✅ Funktioniert |
| Layer 2 (Sheet) | Lokaler State + Cache | `supplement-stack-changed` Event | ❌ Nicht synchronisiert |

### Kernproblem

`useSupplementData` nutzt **lokalen State** statt React Query. Die Cache-Invalidierung via Event funktioniert nicht zuverlässig, weil:

1. Der 5-Sekunden TTL-Cache (`SUPP_CACHE_TTL_MS`) alte Daten zurückgibt
2. Die `loadSupplementData` Funktion einen Throttle von 1 Sekunde hat
3. Das Sheet beim Öffnen bereits gemountete, veraltete Daten hat

---

## Lösung: Drei-Schritt-Fix

### Schritt 1: Force Refresh beim Sheet-Öffnen

**Datei: `src/components/home/sheets/SupplementsDaySheet.tsx`**

Das Sheet soll beim Öffnen immer frische Daten laden:

```typescript
// Zeile 54-67 erweitern
export const SupplementsDaySheet: React.FC<SupplementsDaySheetProps> = ({
  isOpen,
  onClose,
  onOpenLogger
}) => {
  const navigate = useNavigate();
  const { 
    groupedSupplements, 
    markSupplementTaken,
    markTimingGroupTaken,
    totalScheduled,
    totalTaken,
    loading,
    refetch  // NEU: refetch Funktion nutzen
  } = useSupplementData();

  // NEU: Force refresh when sheet opens
  useEffect(() => {
    if (isOpen) {
      refetch({ force: true });
    }
  }, [isOpen, refetch]);
  
  // ... rest
```

### Schritt 2: React Query Integration in useSupplementData

**Datei: `src/hooks/useSupplementData.tsx`**

Migration von lokalem State zu React Query für automatische Synchronisation:

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';

// Neuer Query Key für Layer 2 Supplement Data
// In queryKeys.ts: SUPPLEMENTS_SHEET_DATA: ['supplements-sheet-data'] as const

export const useSupplementData = (currentDate?: Date) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dateStr = currentDate ? currentDate.toISOString().split('T')[0] : getCurrentDateString();

  // React Query statt lokalem State
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEYS.SUPPLEMENTS_DATA, dateStr],
    queryFn: async () => {
      if (!user?.id) return { supplements: [], intakes: [] };
      
      // Parallel fetch supplements + intakes
      const [supplementsRes, intakesRes] = await Promise.all([
        supabase
          .from('user_supplements')
          .select(`id, supplement_id, custom_name, dosage, unit, timing, preferred_timing, 
                   goal, rating, notes, frequency_days, is_active, name, 
                   supplement_database(name, category)`)
          .eq('user_id', user.id)
          .eq('is_active', true),
        supabase
          .from('supplement_intake_log')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', dateStr)
      ]);

      const formattedSupplements = (supplementsRes.data || []).map((s: any) => ({
        ...s,
        timing: s.preferred_timing ? [s.preferred_timing] : normalizeTimingArray(s.timing),
        supplement_name: s.custom_name || s.name || s.supplement_database?.name || 'Supplement',
        supplement_category: s.supplement_database?.category || 'Sonstige',
      }));

      return {
        supplements: formattedSupplements,
        intakes: intakesRes.data || []
      };
    },
    enabled: !!user?.id,
    staleTime: 10000,  // 10 Sekunden statt 5 Sekunden
  });

  // Derived state aus Query-Daten berechnen
  const userSupplements = data?.supplements || [];
  const todayIntakes = data?.intakes || [];
  
  // ... groupedSupplements Berechnung bleibt gleich ...

  // Mutation für Supplement-Logging mit Optimistic Update
  const markSupplementTaken = async (supplementId: string, timing: string, taken: boolean = true) => {
    // Optimistic update
    queryClient.setQueryData([...QUERY_KEYS.SUPPLEMENTS_DATA, dateStr], (old: any) => {
      if (!old) return old;
      const newIntakes = old.intakes.filter(
        (i: any) => !(i.user_supplement_id === supplementId && i.timing === timing)
      );
      if (taken) {
        newIntakes.push({
          id: `temp-${Date.now()}`,
          user_supplement_id: supplementId,
          timing,
          taken: true,
          date: dateStr,
        });
      }
      return { ...old, intakes: newIntakes };
    });

    // Supabase write
    await supabase.from('supplement_intake_log').upsert({...});

    // Invalidate ALLE supplement-related queries
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLEMENTS_TODAY });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLEMENTS_DATA });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_METRICS });
  };

  return { ... };
};
```

### Schritt 3: Query Key Registry erweitern

**Datei: `src/constants/queryKeys.ts`**

```typescript
export const QUERY_KEYS = {
  // ... bestehende Keys ...
  SUPPLEMENTS_DATA: ['supplement-data'] as const,  // Bereits vorhanden!
} as const;

// CATEGORY_QUERY_MAP erweitern (bereits vorhanden)
supplements: [QUERY_KEYS.SUPPLEMENTS_TODAY, QUERY_KEYS.SUPPLEMENTS_DATA, QUERY_KEYS.DAILY_METRICS],
```

---

## Vereinfachte Quick-Win Lösung

Falls die komplette Migration zu React Query zu aufwändig ist, hier ein schneller Fix:

**Datei: `src/components/home/sheets/SupplementsDaySheet.tsx`**

```typescript
// Force refetch bei jedem Öffnen
useEffect(() => {
  if (isOpen) {
    // Kleine Verzögerung, um Animation nicht zu blockieren
    const timer = setTimeout(() => {
      refetch({ force: true });
    }, 100);
    return () => clearTimeout(timer);
  }
}, [isOpen, refetch]);
```

**Datei: `src/hooks/useSupplementData.tsx`**

Den TTL-Cache reduzieren und Throttle entfernen:

```typescript
const SUPP_CACHE_TTL_MS = 2000;  // Von 5000 auf 2000 reduzieren

// In loadSupplementData:
// Diese Zeile entfernen oder anpassen:
if (now - lastFetchAtRef.current < 1000) {
  return;  // ← Diese Throttle-Logik blockiert das Refresh
}
```

---

## Technische Details

### Warum der Event-Listener nicht funktioniert

Der `supplement-stack-changed` Event wird korrekt dispatcht, aber:

1. Wenn Layer 2 nicht geöffnet ist, ist der Event-Listener nicht aktiv
2. Beim nächsten Öffnen ist der Cache noch "frisch" (< 5 Sekunden alt)
3. Die Throttle-Logik (`lastFetchAtRef.current < 1000`) blockiert den Force-Fetch

### Datenfluss-Diagramm

```text
┌─────────────────────────────────────────────────────────────────┐
│                    AKTUELLER ZUSTAND                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1 (Widget)          Layer 2 (Sheet)                     │
│  ┌─────────────┐           ┌─────────────┐                     │
│  │ React Query │           │ Local State │                     │
│  │ SUPPLEMENTS │           │ + 5s Cache  │                     │
│  │ _TODAY      │           │ suppCache   │                     │
│  └──────┬──────┘           └──────┬──────┘                     │
│         │                         │                             │
│         ▼                         ▼                             │
│  invalidateQueries()       supplement-stack-changed Event       │
│         │                         │                             │
│         ▼                         │                             │
│  ✅ Refetch                 ❌ Ignored if sheet closed          │
│                                   │                             │
│                                   ▼                             │
│                             ❌ Cache TTL blockiert Refresh      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```text
┌─────────────────────────────────────────────────────────────────┐
│                    NACH DEM FIX                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1 (Widget)          Layer 2 (Sheet)                     │
│  ┌─────────────┐           ┌─────────────┐                     │
│  │ React Query │           │ React Query │                     │
│  │ SUPPLEMENTS │           │ SUPPLEMENTS │                     │
│  │ _TODAY      │           │ _DATA       │                     │
│  └──────┬──────┘           └──────┬──────┘                     │
│         │                         │                             │
│         └────────────┬────────────┘                             │
│                      ▼                                          │
│           invalidateQueries([SUPPLEMENTS_TODAY,                 │
│                              SUPPLEMENTS_DATA,                  │
│                              DAILY_METRICS])                    │
│                      │                                          │
│                      ▼                                          │
│              ✅ Beide Layer refetchen automatisch               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Zusammenfassung der Änderungen

| Datei | Änderung | Priorität |
|-------|----------|-----------|
| `SupplementsDaySheet.tsx` | `useEffect` für force refetch beim Öffnen | Quick-Win |
| `useSupplementData.tsx` | TTL reduzieren, Throttle anpassen | Quick-Win |
| `useSupplementData.tsx` | Migration zu React Query (optional) | Langfristig |
| `queryKeys.ts` | Bereits korrekt konfiguriert | - |

---

## Empfohlene Vorgehensweise

**Phase 1 (Quick-Win):** Force-Refetch beim Sheet-Öffnen + Cache-TTL reduzieren

**Phase 2 (Langfristig):** `useSupplementData` vollständig auf React Query migrieren für konsistente Cache-Verwaltung

