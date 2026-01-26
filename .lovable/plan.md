
# ARES High-Performance Event System: Optimistic UI

## Übersicht

Wir bauen ein **Zero-Latency** Event-System mit React Query. Der User sieht sofortiges Feedback (10ms), während die Datenbank im Hintergrund aktualisiert wird.

```text
USER KLICK
    │
    ├──> A. OPTIMISTIC (0ms): UI sofort aktualisiert
    │         └── Widget springt von 0.5L → 0.75L
    │
    └──> B. ASYNC (Background): Supabase Insert
              └── Bei Fehler: Rollback
```

---

## Architektur

### Single Source of Truth: `useDailyMetrics`

Ein React Query Hook, den **alle** Widgets nutzen. Wenn wir den Cache manipulieren, aktualisieren sich alle Widgets automatisch.

```text
┌─────────────────────────────────────────┐
│           React Query Cache             │
│     queryKey: ['daily-metrics']         │
│                                         │
│   { water: { current: 750, target: 3000 } }
│   { supplements: { takenIds: [...] } }  │
└─────────────────────────────────────────┘
         ▲                    ▲
         │                    │
  ┌──────┴──────┐      ┌──────┴──────┐
  │ SmartCard   │      │ HydrationWidget │
  │ (oben)      │      │ (unten)     │
  └─────────────┘      └─────────────┘
```

### Event Controller: `useAresEvents`

Ein zentraler Hook für alle Tracking-Actions. Keine direkten Supabase-Calls mehr in Components!

---

## Neue Dateien

### 1. `src/hooks/useDailyMetrics.ts` (Single Source of Truth)

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DailyMetrics {
  water: { current: number; target: number };
  supplements: { takenIds: string[]; total: number };
  nutrition: { calories: number; protein: number; carbs: number; fats: number };
  goals: { calories: number; protein: number; carbs: number; fats: number; fluid_goal_ml: number };
}

export const DAILY_METRICS_KEY = ['daily-metrics'];

export const useDailyMetrics = () => {
  return useQuery({
    queryKey: DAILY_METRICS_KEY,
    queryFn: async (): Promise<DailyMetrics> => {
      // Fetch all daily data in parallel
      // ... (aggregation logic from usePlusData)
    },
    staleTime: 1000 * 60 * 5, // 5 min fresh
    gcTime: 1000 * 60 * 30,   // 30 min cache
  });
};

// Hook for optimistic updates
export const useOptimisticMetrics = () => {
  const queryClient = useQueryClient();
  
  const addWater = (amount: number) => {
    queryClient.setQueryData<DailyMetrics>(DAILY_METRICS_KEY, (old) => {
      if (!old) return old;
      return {
        ...old,
        water: { ...old.water, current: old.water.current + amount }
      };
    });
  };
  
  const rollback = () => {
    queryClient.invalidateQueries({ queryKey: DAILY_METRICS_KEY });
  };
  
  return { addWater, rollback };
};
```

### 2. `src/hooks/useAresEvents.ts` (Event Controller)

```typescript
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DAILY_METRICS_KEY, DailyMetrics } from './useDailyMetrics';

type EventCategory = 'water' | 'coffee' | 'supplement' | 'meal';

interface EventPayload {
  amount?: number;
  supplementId?: string;
  timing?: string;
}

export const useAresEvents = () => {
  const queryClient = useQueryClient();

  const trackEvent = useCallback(async (
    category: EventCategory, 
    payload: EventPayload
  ): Promise<boolean> => {
    
    // === A. OPTIMISTIC UPDATE (SOFORT) ===
    queryClient.setQueryData<DailyMetrics>(DAILY_METRICS_KEY, (old) => {
      if (!old) return old;
      
      if (category === 'water' || category === 'coffee') {
        return {
          ...old,
          water: { 
            ...old.water, 
            current: old.water.current + (payload.amount || 0) 
          }
        };
      }
      
      if (category === 'supplement' && payload.supplementId) {
        return {
          ...old,
          supplements: {
            ...old.supplements,
            takenIds: [...old.supplements.takenIds, payload.supplementId]
          }
        };
      }
      
      return old;
    });

    // === B. ASYNC DB WRITE (Background) ===
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');
      
      const today = new Date().toISOString().slice(0, 10);
      
      if (category === 'water' || category === 'coffee') {
        const { error } = await supabase.from('user_fluids').insert({
          user_id: auth.user.id,
          amount_ml: payload.amount,
          date: today,
          consumed_at: new Date().toISOString(),
          custom_name: category === 'coffee' ? 'Kaffee' : null
        });
        if (error) throw error;
      }
      
      // Silent revalidate nach 2s
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: DAILY_METRICS_KEY });
      }, 2000);
      
      return true;
    } catch (err) {
      console.error('[AresEvents] Tracking failed:', err);
      // === ROLLBACK ===
      queryClient.invalidateQueries({ queryKey: DAILY_METRICS_KEY });
      toast.error('Speichern fehlgeschlagen');
      return false;
    }
  }, [queryClient]);

  return { trackEvent };
};
```

---

## Änderungen an bestehenden Dateien

### 1. `ActionCardStack.tsx` - Hydration Handler

```typescript
// VORHER (Zeile 79-105):
const handleHydrationAction = useCallback(async (card: ActionCard, action: string) => {
  let success = true;
  switch (action) {
    case '250ml_water':
      success = await logWater(250, 'water');
      if (success) toast.success('+250ml', { icon: '💧' });
      break;
    // ...
  }
  // ...
}, [logWater]);

// NACHHER:
import { useAresEvents } from '@/hooks/useAresEvents';

const { trackEvent } = useAresEvents();

const handleHydrationAction = useCallback(async (card: ActionCard, action: string) => {
  let amount = 0;
  let category: 'water' | 'coffee' = 'water';
  let icon = '💧';
  let label = '';
  
  switch (action) {
    case '250ml_water':
      amount = 250; label = '+250ml'; break;
    case '500ml_water':
      amount = 500; label = '+500ml'; break;
    case 'coffee':
      amount = 150; category = 'coffee'; icon = '☕'; label = '+Kaffee'; break;
  }
  
  // Optimistic Toast (sofort)
  toast.success(label, { icon });
  
  // Optimistic UI + Background Sync
  const success = await trackEvent(category, { amount });
  
  if (success) {
    window.dispatchEvent(new CustomEvent('ares-xp-awarded', { 
      detail: { amount: card.xp, reason: action }
    }));
  }
}, [trackEvent]);
```

### 2. `HydrationWidget.tsx` - React Query Consumer

```typescript
// VORHER:
import { usePlusData } from '@/hooks/usePlusData';
const { hydrationMlToday, goals } = usePlusData();

// NACHHER:
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
const { data } = useDailyMetrics();
const hydrationMlToday = data?.water.current ?? 0;
const target = data?.goals.fluid_goal_ml ?? 2500;
```

---

## Flow: User Experience

1. User ist auf Home Screen
2. Oben: **Smart Card "Mehr Trinken"** mit Buttons
3. Unten: **Hydration Widget** zeigt 0.5L

**Klick auf [💧 1x]:**
```text
T+0ms:   Button wird grün ✅
T+0ms:   Widget springt von 0.5L → 0.75L (optimistic)
T+0ms:   Toast "+250ml 💧"
T+50ms:  Supabase Insert (background)
T+2000ms: Silent Revalidate (prüft DB)
```

**Bei Netzwerkfehler:**
```text
T+0ms:   UI zeigt 0.75L (optimistic)
T+500ms: Supabase Insert fails
T+500ms: Rollback: Widget zeigt wieder 0.5L
T+500ms: Toast "Speichern fehlgeschlagen"
```

---

## Dateien-Übersicht

| Aktion | Datei | Beschreibung |
|--------|-------|--------------|
| **CREATE** | `src/hooks/useDailyMetrics.ts` | React Query Hook + Optimistic Utils |
| **CREATE** | `src/hooks/useAresEvents.ts` | Event Controller für alle Tracking-Actions |
| **MODIFY** | `src/components/home/ActionCardStack.tsx` | Nutzt `useAresEvents` statt `logWater` |
| **MODIFY** | `src/components/home/widgets/HydrationWidget.tsx` | Nutzt `useDailyMetrics` statt `usePlusData` |

---

## Technische Details

### React Query Config (bereits vorhanden in App.tsx)

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 min
      gcTime: 1000 * 60 * 30,    // 30 min cache
      retry: 1,
    },
  },
});
```

### Query Key Design

```typescript
// Zentral für alle Daily Metrics
export const DAILY_METRICS_KEY = ['daily-metrics'];

// Für granulare Invalidation (optional)
// ['daily-metrics', 'water']
// ['daily-metrics', 'supplements']
```

### Fehlerbehandlung & Rollback

```typescript
// Bei Fehler: Invalidate Query = Refetch echte Daten
queryClient.invalidateQueries({ queryKey: DAILY_METRICS_KEY });
```

---

## Vorteile

1. **Zero Latency**: UI reagiert in <10ms
2. **Automatische Sync**: Alle Widgets, die `useDailyMetrics` nutzen, aktualisieren sich sofort
3. **Sauberer Code**: Components feuern nur `trackEvent()` - keine DB-Logik mehr
4. **Robust**: Bei Fehler automatischer Rollback
5. **Offline-Ready**: React Query kann Offline-Support später einfach hinzufügen
