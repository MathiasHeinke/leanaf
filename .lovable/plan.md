

# Fix: Layer 3 Supplement-Synchronisation mit Intake-Logs

## Problem

Layer 3 (Stack Architect → Tagesablauf) zeigt immer "0/3 erledigt" an, auch wenn in Layer 1 oder 2 bereits Supplements abgehakt wurden.

**Ursache:** Die Komponente `SupplementTimeline.tsx` verwendet nur lokalen State:

```typescript
// AKTUELL (Problem):
const [completedStacks, setCompletedStacks] = useState<Set<PreferredTiming>>(new Set());
```

Dieser State ist komplett von der `supplement_intake_log`-Datenbanktabelle entkoppelt.

---

## Loesung

### 1. Intake-Logs in useUserStackByTiming laden

Die Hook `useUserStackByTiming()` muss zusaetzlich die heutigen Intake-Logs abfragen:

```typescript
// src/hooks/useSupplementLibrary.ts

export const useUserStackByTiming = () => {
  const { user } = useAuth();
  const { data: stack, ...rest } = useUserStack();
  const today = new Date().toISOString().split('T')[0];

  // NEU: Heutige Intake-Logs laden
  const { data: todayIntakes } = useQuery({
    queryKey: ['supplement-intakes-today', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('supplement_intake_log')
        .select('user_supplement_id, timing, taken')
        .eq('user_id', user.id)
        .eq('date', today)
        .eq('taken', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 Sekunden
  });

  // Set fuer schnellen Lookup
  const takenSet = new Set(
    (todayIntakes || []).map(i => `${i.user_supplement_id}|${i.timing}`)
  );

  const activeStack = (stack || []).filter(item => item.is_active);

  const groupedByTiming = activeStack.reduce((acc, item) => {
    const timing = item.preferred_timing || 'morning';
    if (!acc[timing]) acc[timing] = [];
    acc[timing].push({
      ...item,
      isTakenToday: takenSet.has(`${item.id}|${timing}`) // NEU: Taken-Status
    });
    return acc;
  }, {} as Record<PreferredTiming, UserStackItem[]>);

  return { groupedByTiming, activeStack, todayIntakes, stack, ...rest };
};
```

### 2. ProtocolBundleCard: Log-Funktion und Status

Die Karte muss:
- Den "bereits genommen"-Status anzeigen (individuelle Items)
- Beim "Stack abschliessen" alle Items in die DB schreiben

```typescript
// src/components/supplements/ProtocolBundleCard.tsx

interface ProtocolBundleCardProps {
  // ... bestehende Props
  takenIds?: Set<string>; // NEU: IDs der bereits genommenen Supplements
  onLogStack?: (timing: PreferredTiming, supplementIds: string[]) => Promise<void>; // NEU
}

// Im Footer:
<Button onClick={() => onLogStack?.(timing, supplements.map(s => s.id))}>
  Stack abschliessen
</Button>
```

### 3. SupplementTimeline: Completion-Berechnung aus Daten

Statt lokalem State die Completion aus den Intake-Daten berechnen:

```typescript
// src/components/supplements/SupplementTimeline.tsx

export const SupplementTimeline: React.FC<SupplementTimelineProps> = ({
  groupedByTiming,
  todayIntakes,  // NEU: von Parent uebergeben
  onLogStack,    // NEU: Callback zum Loggen
  // ...
}) => {
  // Berechne completed stacks aus Datenbank-Daten
  const completedStacks = useMemo(() => {
    const completed = new Set<PreferredTiming>();
    const takenMap = new Map<string, Set<string>>(); // timing -> Set<supplementId>

    // Gruppiere Intakes nach Timing
    (todayIntakes || []).forEach(intake => {
      if (!takenMap.has(intake.timing)) {
        takenMap.set(intake.timing, new Set());
      }
      takenMap.get(intake.timing)!.add(intake.user_supplement_id);
    });

    // Pruefe ob alle Supplements eines Timings genommen wurden
    Object.entries(groupedByTiming).forEach(([timing, supplements]) => {
      if (supplements.length > 0) {
        const takenInTiming = takenMap.get(timing) || new Set();
        const allTaken = supplements.every(s => takenInTiming.has(s.id));
        if (allTaken) {
          completed.add(timing as PreferredTiming);
        }
      }
    });

    return completed;
  }, [groupedByTiming, todayIntakes]);

  // Kein useState mehr noetig!
};
```

### 4. SupplementsPage: Log-Handler und Event-Listener

```typescript
// src/pages/SupplementsPage.tsx

const handleLogStack = async (timing: PreferredTiming, supplementIds: string[]) => {
  if (!user) return;
  const today = new Date().toISOString().split('T')[0];

  const logs = supplementIds.map(id => ({
    user_id: user.id,
    user_supplement_id: id,
    timing,
    taken: true,
    date: today,
  }));

  const { error } = await supabase
    .from('supplement_intake_log')
    .upsert(logs, { onConflict: 'user_supplement_id,date,timing' });

  if (error) {
    toast.error('Fehler beim Speichern');
    return;
  }

  haptics.success();
  refetchTimeline();
  window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
};

// Event-Listener fuer Cross-Layer Sync
useEffect(() => {
  const handleStackChanged = () => {
    refetchTimeline();
    refetchInventory();
  };
  window.addEventListener('supplement-stack-changed', handleStackChanged);
  return () => window.removeEventListener('supplement-stack-changed', handleStackChanged);
}, [refetchTimeline, refetchInventory]);
```

---

## Aenderungen

| Datei | Aenderung |
|-------|-----------|
| `src/hooks/useSupplementLibrary.ts` | `useUserStackByTiming()` um Intake-Log-Query erweitern, `todayIntakes` zurueckgeben |
| `src/components/supplements/SupplementTimeline.tsx` | `completedStacks` aus Props berechnen statt lokalem State; `onLogStack` Callback aufrufen |
| `src/components/supplements/ProtocolBundleCard.tsx` | `takenIds` und `onLogStack` Props hinzufuegen; Visual State fuer bereits genommene Items |
| `src/pages/SupplementsPage.tsx` | `handleLogStack` implementieren; Event-Listener fuer Cross-Layer Sync |

---

## Erwartetes Resultat

1. Layer 3 zeigt den korrekten Status ("2/3 erledigt") basierend auf echten DB-Daten
2. Wenn in Layer 1/2 ein Supplement abgehakt wird, aktualisiert sich Layer 3 automatisch
3. "Stack abschliessen" in Layer 3 schreibt in dieselbe `supplement_intake_log`-Tabelle
4. Alle Layer sind vollstaendig synchronisiert

