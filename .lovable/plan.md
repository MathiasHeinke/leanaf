
# Pull-to-Refresh & Sync-Fix für Homescreen

## Problem-Analyse

Der Homescreen aktualisiert sich nicht automatisch nach Änderungen im Profil (Makrostrategie, Kalorien etc.) weil:

1. **Kein Pull-to-Refresh**: Es gibt keine Möglichkeit für User, manuell Daten zu aktualisieren
2. **Zwei parallele Daten-Systeme**: 
   - `useDailyMetrics` (React Query, für Widgets)
   - `usePlusData` (Legacy useState/useEffect, für ActionCards)
3. **Keine Cross-Invalidierung**: Profil-Änderungen invalidieren `daily-metrics`, aber `usePlusData` nutzt das alte Event-System

---

## Lösung

### Phase 1: Pull-to-Refresh Komponente erstellen

**Neue Datei: `src/components/ui/pull-to-refresh.tsx`**

Erstelle eine mobile-native Pull-to-Refresh Geste:

```text
+---------------------------+
|  ↓ Ziehe zum Aktualisieren |
|           ⟳               |
|  (Spinner während Refresh) |
+---------------------------+
```

**Features:**
- Touch-basiert mit `touchstart`, `touchmove`, `touchend`
- Threshold: 80px ziehen für Trigger
- Haptic Feedback (vibration) wenn verfügbar
- Smooth Animation beim Release
- Loading-Spinner während Refresh

### Phase 2: AresHome.tsx mit Pull-to-Refresh wrappen

**Datei: `src/pages/AresHome.tsx`**

Wrapper um den Hauptinhalt:

```typescript
// Neuer Import
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';

// In der Komponente
const queryClient = useQueryClient();

const handleRefresh = useCallback(async () => {
  // Alle relevanten Queries invalidieren
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_METRICS }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLEMENTS_TODAY }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRAINING_WEEKLY }),
  ]);
  
  // Plus-Data Legacy-System auch triggern
  triggerDataRefresh();
  
  toast.success('Daten aktualisiert', { duration: 1500 });
}, [queryClient]);

// Im Return
<PullToRefresh onRefresh={handleRefresh}>
  {/* Bestehender Inhalt */}
</PullToRefresh>
```

### Phase 3: usePlusData auf React Query migrieren (optional aber empfohlen)

**Datei: `src/hooks/usePlusData.tsx`**

Alternative: Statt komplett zu migrieren, füge Query-Invalidierung hinzu:

```typescript
// Am Ende von fetchData() 
// Synchronisiere mit React Query Cache
queryClient.setQueryData(QUERY_KEYS.DAILY_METRICS, (old) => ({
  ...old,
  goals: { ...goals }
}));
```

Oder: Nach Profile Save auch `usePlusData` manuell triggern:

**Datei: `src/pages/Profile.tsx` (Zeile ~650)**

```typescript
// Nach DAILY_METRICS invalidation
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_METRICS });
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE });

// Legacy-System triggern für usePlusData
triggerDataRefresh();
```

---

## Technische Details

### Pull-to-Refresh Komponente Architektur

```text
┌─────────────────────────────────────────┐
│ PullToRefresh                           │
│  ├── Pull Indicator (↓ / Spinner)       │
│  └── children (scrollable content)      │
│       └── touch events tracked          │
└─────────────────────────────────────────┘

State Machine:
  IDLE → PULLING → REFRESHING → IDLE
          ↑                      │
          └──────────────────────┘
```

### Datei-Übersicht

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/components/ui/pull-to-refresh.tsx` | NEU | Pull-to-Refresh UI Komponente |
| `src/pages/AresHome.tsx` | EDIT | Wrapper + handleRefresh Callback |
| `src/pages/Profile.tsx` | EDIT | `triggerDataRefresh()` nach Save hinzufügen |
| `src/constants/queryKeys.ts` | EDIT | (optional) Neue Keys für vollständiges Refresh |

---

## Erwartetes Ergebnis

### Vorher
- User ändert Makrostrategie auf WARRIOR (2.0g/kg)
- User geht zurück zum Homescreen
- Widgets zeigen noch alte Werte (2500 kcal statt 2200 kcal)
- Einzige Lösung: App schließen und neu öffnen

### Nachher
- User ändert Makrostrategie auf WARRIOR
- User geht zurück zum Homescreen
- Widgets aktualisieren sich automatisch (Profile.tsx invalidiert alle Keys)
- ODER: User zieht von oben nach unten (Pull-to-Refresh)
- Kurzer Spinner, dann alle Widgets zeigen neue Werte
- Toast: "Daten aktualisiert"

### UX Details
- Pull-Geste zeigt sanften Bounce-Effekt
- Loading-Spinner während Daten geladen werden
- Haptic Feedback auf unterstützten Geräten
- Funktioniert nur wenn bereits ganz oben gescrollt
