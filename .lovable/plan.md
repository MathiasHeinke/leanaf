

# Smart Start - Carousel springt zum nächsten offenen Item

## Das Konzept

Beim Öffnen des Carousels wird geprüft, welche Actions heute schon erledigt wurden. Das Carousel startet dann automatisch beim ersten noch offenen Item.

```text
BEISPIEL (Morgens um 8:30):

Tageszeit-Reihenfolge: [Schlaf, Gewicht, Supps, Training, Wasser, Essen, Journal]
                         ✓       ✓        ✓       -        -       -      -
                                          ↑
                                    Schon erledigt

Carousel startet bei: Training (Index 3)
```

---

## Datenquellen für Completion-Status

Jede Action hat eine eigene Datenquelle in Supabase:

| Action | Tabelle | Prüfung |
|--------|---------|---------|
| `sleep` | `sleep_logs` | `date = today` |
| `weight` | `weight_entries` | `date = today` |
| `supplements` | `supplement_intake_log` | `date = today` (mind. 1 Eintrag) |
| `workout` | `training_sessions` | `session_date = today` |
| `hydration` | `user_fluids` | `date = today` (mind. 1 Eintrag) |
| `nutrition` | `meals` | `created_at = today` (mind. 1 Eintrag) |
| `journal` | `journal_entries` | `entry_date = today` |

---

## Technische Implementierung

### 1. Neuer Hook: `useTodayCompletedActions`

Dieser Hook lädt einmalig beim Mount welche Actions heute schon erledigt wurden:

```typescript
// src/hooks/useTodayCompletedActions.ts

export const useTodayCompletedActions = () => {
  const { user } = useAuth();
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    
    const checkCompletions = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const completed = new Set<string>();
      
      // Parallel queries for performance
      const [sleep, weight, supps, workout, fluids, meals, journal] = await Promise.all([
        supabase.from('sleep_logs').select('id').eq('user_id', user.id).eq('date', today).limit(1),
        supabase.from('weight_entries').select('id').eq('user_id', user.id).eq('date', today).limit(1),
        supabase.from('supplement_intake_log').select('id').eq('user_id', user.id).eq('date', today).limit(1),
        supabase.from('training_sessions').select('id').eq('user_id', user.id).eq('session_date', today).limit(1),
        supabase.from('user_fluids').select('id').eq('user_id', user.id).eq('date', today).limit(1),
        supabase.from('meals').select('id').eq('user_id', user.id).gte('created_at', today).limit(1),
        supabase.from('journal_entries').select('id').eq('user_id', user.id).eq('entry_date', today).limit(1),
      ]);
      
      if (sleep.data?.length) completed.add('sleep');
      if (weight.data?.length) completed.add('weight');
      if (supps.data?.length) completed.add('supplements');
      if (workout.data?.length) completed.add('workout');
      if (fluids.data?.length) completed.add('hydration');
      if (meals.data?.length) completed.add('nutrition');
      if (journal.data?.length) completed.add('journal');
      
      setCompletedActions(completed);
      setLoading(false);
    };
    
    checkCompletions();
  }, [user?.id]);
  
  return { completedActions, loading };
};
```

### 2. Carousel Props erweitern

```typescript
interface LiquidCarouselMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (actionId: string) => void;
  completedActions?: Set<string>; // NEU: Von parent übergeben
}
```

### 3. Smart Start Index berechnen

Im Carousel wird beim Öffnen der erste unerledigte Index ermittelt:

```typescript
// In LiquidCarouselMenu.tsx

const getSmartStartIndex = useCallback((completed: Set<string>): number => {
  // Finde erstes Item das NICHT completed ist
  const firstIncompleteIndex = orderedItems.findIndex(item => !completed.has(item.id));
  
  // Wenn alles erledigt → starte bei 0
  return firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0;
}, [orderedItems]);

// Reset virtual index when menu opens - mit Smart Start
useEffect(() => {
  if (isOpen) {
    const startIndex = completedActions 
      ? getSmartStartIndex(completedActions)
      : 0;
    setVirtualIndex(startIndex);
  }
}, [isOpen, completedActions, getSmartStartIndex]);
```

### 4. Visuelles Feedback für erledigte Items

Erledigte Items bekommen einen dezenten Checkmark:

```typescript
const CarouselItem: React.FC<CarouselItemProps> = ({ 
  item, 
  isActive, 
  isCompleted, // NEU
  onClick 
}) => {
  const Icon = item.icon;
  
  return (
    <motion.button ...>
      <Icon className={...} />
      
      {/* Completion Badge */}
      {isCompleted && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </motion.button>
  );
};
```

---

## Integration in AresHome

```typescript
// In AresHome.tsx

import { useTodayCompletedActions } from '@/hooks/useTodayCompletedActions';

const AresHome = () => {
  const { completedActions } = useTodayCompletedActions();
  
  return (
    <>
      {/* ... */}
      <LiquidCarouselMenu
        isOpen={carouselOpen}
        onClose={() => setCarouselOpen(false)}
        onAction={handleCarouselAction}
        completedActions={completedActions}
      />
    </>
  );
};
```

---

## UX Flow

```text
1. User öffnet Carousel um 9:30 (Morning Mode)
   Reihenfolge: [Schlaf, Gewicht, Supps, Training, ...]
   
2. Hook prüft: Schlaf ✓, Gewicht ✓, Supps ✗
   
3. Carousel startet bei "Supps" (Index 2)
   ┌────────────────────────────────────┐
   │   [✓]   [✓]   [●]   [ ]   [ ]    │
   │  Schlaf Gew.  Supps Train Wasser  │
   │         ↑checked     ↑START       │
   └────────────────────────────────────┘

4. User logged Supps → Next open = Training

5. Beim erneuten Öffnen → Startet bei Training
```

---

## Performance-Optimierung

- Alle 7 Queries laufen parallel (`Promise.all`)
- Nur `limit(1)` - wir brauchen nur "existiert oder nicht"
- Ergebnis wird gecached bis zum nächsten Mount
- Kein Realtime-Update nötig (beim nächsten Öffnen wird neu geprüft)

---

## Dateien

| Datei | Änderung |
|-------|----------|
| `src/hooks/useTodayCompletedActions.ts` | NEU: Hook für Completion-Status |
| `src/components/home/LiquidCarouselMenu.tsx` | Props erweitern, Smart Start Index, Completion Badge |
| `src/pages/AresHome.tsx` | Hook einbinden und an Carousel übergeben |

