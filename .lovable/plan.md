

# TrainingDaySheet - Implementierungsplan

## Uebersicht

Wir erstellen ein **Layer 2 Training Sheet** das beim Klick auf das Training-Widget erscheint. Es zeigt den heutigen Training-Status, die Wochenuebersicht und ermoeglicht schnelles Logging - alles ohne Kontextwechsel.

---

## Architektur-Entscheidungen

### Daten-Strategie
Da keine `daily_training_plans` oder `training_plan_exercises` Tabellen existieren, fokussiert sich das Sheet auf:

1. **Heutiger Status** - Query `training_sessions` fuer `session_date = today`
2. **Wochenuebersicht** - 7-Tage-Dots (Mo-So) mit Checkmarks
3. **Letzte Sessions** - Die letzten 7 Training-Sessions chronologisch

### Layer 2 Pattern
Gleiche Struktur wie `NutritionDaySheet`:
- Backdrop + Swipe-to-dismiss
- Handle Bar + Header
- Scrollable Content Area (`flex-1 overflow-y-auto`)
- Sticky Footer mit Primary/Secondary Actions

---

## Dateien-Uebersicht

| Datei | Aktion | Zeilen (ca.) |
|-------|--------|--------------|
| `src/components/home/sheets/TrainingDaySheet.tsx` | **NEU** | ~280 |
| `src/components/home/widgets/TrainingWidget.tsx` | **EDIT** | +5 |
| `src/components/home/widgets/WidgetRenderer.tsx` | **EDIT** | +3 |
| `src/components/home/MetricWidgetGrid.tsx` | **EDIT** | +3 |
| `src/pages/AresHome.tsx` | **EDIT** | +15 |

---

## Phase 1: TrainingDaySheet.tsx (NEU)

### Datei: `src/components/home/sheets/TrainingDaySheet.tsx`

### Props Interface
```typescript
interface TrainingDaySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogger: () => void;  // Opens QuickLogSheet with training tab
}
```

### Layout-Struktur

```text
+--------------------------------------------------+
| [Handle Bar]                                      |
+--------------------------------------------------+
| Training heute               [X] Close            |
| Montag, 27. Januar 2026                           |
+--------------------------------------------------+
|                                                   |
| [HERO SECTION]                                    |
| +----------------------------------------------+  |
| |  [Check/Dumbbell Icon]                        |  |
| |  "Push Day - Krafttraining"                   |  |
| |  45 min • 8.500 kg Volume                     |  |
| +----------------------------------------------+  |
|   ODER wenn kein Training heute:                 |
| +----------------------------------------------+  |
| |  [Dumbbell Icon - muted]                      |  |
| |  "Noch kein Training heute"                   |  |
| |  [Button: Jetzt loggen]                       |  |
| +----------------------------------------------+  |
|                                                   |
| [WOCHEN-UEBERSICHT]                              |
| +----------------------------------------------+  |
| | Mo  Di  Mi  Do  Fr  Sa  So                   |  |
| | [x] [x] [ ] [ ] [ ] [ ] [ ]                  |  |
| |                          2/4 diese Woche     |  |
| +----------------------------------------------+  |
|                                                   |
| [LETZTE SESSIONS - scrollable]                   |
| +----------------------------------------------+  |
| | 26.01  Push  RPT       45min  8.500 kg  [x] |  |
| | 25.01  Zone 2 Walking  30min  -          [x] |  |
| | 24.01  Pull  RPT       50min  7.200 kg  [x] |  |
| | 23.01  VO2max HIIT     20min  -          [x] |  |
| +----------------------------------------------+  |
+--------------------------------------------------+
| [Primary: Workout loggen]  [Icon: Trainingsplan] |
+--------------------------------------------------+
```

### Queries (useQuery)

**Query 1: Heutige Session**
```typescript
const { data: todaySession } = useQuery({
  queryKey: ['training-session-today', todayStr],
  queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_date', todayStr)
      .maybeSingle();
    
    return data;
  }
});
```

**Query 2: Wochenuebersicht (7 Tage)**
```typescript
const { data: weekData } = useQuery({
  queryKey: ['training-week-overview'],
  queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { count: 0, days: [] as boolean[] };
    
    const dates: string[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    
    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('session_date')
      .eq('user_id', user.id)
      .in('session_date', dates);
    
    const sessionDates = new Set(sessions?.map(s => s.session_date) || []);
    
    return {
      count: sessionDates.size,
      days: dates.map(d => sessionDates.has(d))
    };
  }
});
```

**Query 3: Letzte 7 Sessions**
```typescript
const { data: recentSessions } = useQuery({
  queryKey: ['training-recent-sessions'],
  queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false })
      .limit(7);
    
    return data || [];
  }
});
```

### Display-Logik

**Training Type Labels & Icons:**
Importiere aus `@/types/training`:
- `TRAINING_TYPE_LABELS` - z.B. `rpt` → "Krafttraining (RPT)"
- `TRAINING_TYPE_ICONS` - z.B. `rpt` → "🏋️"
- `SPLIT_TYPE_LABELS` - z.B. `push` → "Push"

**Hero Section Logik:**
```typescript
if (todaySession) {
  // Show completed state with green checkmark
  const typeLabel = TRAINING_TYPE_LABELS[todaySession.training_type];
  const splitLabel = todaySession.split_type 
    ? SPLIT_TYPE_LABELS[todaySession.split_type] 
    : null;
  const duration = todaySession.total_duration_minutes;
  const volume = todaySession.total_volume_kg;
} else {
  // Show empty state with "Jetzt loggen" button
}
```

**Session List Item:**
```typescript
const SessionItem: React.FC<{ session: TrainingSession }> = ({ session }) => {
  const date = format(new Date(session.session_date), 'dd.MM', { locale: de });
  const typeIcon = TRAINING_TYPE_ICONS[session.training_type || 'rpt'];
  const typeLabel = session.split_type 
    ? SPLIT_TYPE_LABELS[session.split_type]
    : TRAINING_TYPE_LABELS[session.training_type || 'rpt'];
  
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/30">
      <span className="text-xs text-muted-foreground w-12">{date}</span>
      <span className="text-lg">{typeIcon}</span>
      <div className="flex-1">
        <span className="font-medium">{typeLabel}</span>
      </div>
      {session.total_duration_minutes && (
        <span className="text-sm text-muted-foreground">
          {session.total_duration_minutes}min
        </span>
      )}
      {session.total_volume_kg && (
        <span className="text-sm font-semibold">
          {session.total_volume_kg.toLocaleString('de-DE')}kg
        </span>
      )}
      <Check className="w-4 h-4 text-emerald-500" />
    </div>
  );
};
```

### Footer Buttons

```typescript
<div className="sticky bottom-0 px-5 py-4 bg-gradient-to-t from-background via-background to-transparent border-t border-border/30">
  <div className="flex gap-3">
    <Button
      onClick={onOpenLogger}
      className="flex-1 h-12 rounded-xl font-semibold"
    >
      <Dumbbell className="w-4 h-4 mr-2" />
      Workout loggen
    </Button>
    <Button
      variant="ghost"
      size="icon"
      className="h-12 w-12 rounded-xl"
      onClick={() => {
        onClose();
        navigate('/training');
      }}
      aria-label="Trainingsplaene verwalten"
    >
      <Settings className="w-5 h-5" />
    </Button>
  </div>
</div>
```

---

## Phase 2: TrainingWidget.tsx Update

### Aenderungen

**Zeile 11-13: Props Interface erweitern**
```typescript
interface TrainingWidgetProps {
  size: WidgetSize;
  onOpenSheet?: () => void;  // NEU
}
```

**Zeile 15: Props destrukturieren**
```typescript
export const TrainingWidget: React.FC<TrainingWidgetProps> = ({ size, onOpenSheet }) => {
```

**Zeile 86, 149, 210, 238: onClick Handler ersetzen**
```typescript
// Vorher:
onClick={() => navigate('/training')}

// Nachher:
onClick={() => onOpenSheet?.()}
```

Falls `onOpenSheet` undefined ist (z.B. in Tests), kein Crash.

---

## Phase 3: WidgetRenderer.tsx Update

### Aenderungen

**Zeile 14-20: Props erweitern**
```typescript
interface WidgetRendererProps {
  config: WidgetConfig;
  onOpenNutritionSheet?: () => void;
  onOpenHydrationSheet?: () => void;
  onOpenBodySheet?: () => void;
  onOpenPeptidesSheet?: () => void;
  onOpenTrainingSheet?: () => void;  // NEU
}
```

**Zeile 22-28: Props destrukturieren**
```typescript
export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ 
  config, 
  onOpenNutritionSheet,
  onOpenHydrationSheet,
  onOpenBodySheet,
  onOpenPeptidesSheet,
  onOpenTrainingSheet  // NEU
}) => {
```

**Zeile 40-41: Training Case anpassen**
```typescript
case 'training':
  return <TrainingWidget size={size} onOpenSheet={onOpenTrainingSheet} />;
```

---

## Phase 4: MetricWidgetGrid.tsx Update

### Aenderungen

**Zeile 15-20: Props erweitern**
```typescript
interface MetricWidgetGridProps {
  onOpenNutritionSheet?: () => void;
  onOpenHydrationSheet?: () => void;
  onOpenBodySheet?: () => void;
  onOpenPeptidesSheet?: () => void;
  onOpenTrainingSheet?: () => void;  // NEU
}
```

**Zeile 22-27: Props destrukturieren**
```typescript
export const MetricWidgetGrid: React.FC<MetricWidgetGridProps> = ({ 
  onOpenNutritionSheet,
  onOpenHydrationSheet,
  onOpenBodySheet,
  onOpenPeptidesSheet,
  onOpenTrainingSheet  // NEU
}) => {
```

**Zeile 77-83: WidgetRenderer Props erweitern**
```typescript
<WidgetRenderer 
  config={widget} 
  onOpenNutritionSheet={onOpenNutritionSheet}
  onOpenHydrationSheet={onOpenHydrationSheet}
  onOpenBodySheet={onOpenBodySheet}
  onOpenPeptidesSheet={onOpenPeptidesSheet}
  onOpenTrainingSheet={onOpenTrainingSheet}  // NEU
/>
```

---

## Phase 5: AresHome.tsx Integration

### Aenderungen

**Zeile 33: Import hinzufuegen**
```typescript
import { TrainingDaySheet } from '@/components/home/sheets/TrainingDaySheet';
```

**Zeile 57: State hinzufuegen**
```typescript
const [trainingSheetOpen, setTrainingSheetOpen] = useState(false);
```

**Zeile 471-476: MetricWidgetGrid Handler erweitern**
```typescript
<MetricWidgetGrid 
  onOpenNutritionSheet={() => setNutritionSheetOpen(true)}
  onOpenHydrationSheet={() => setHydrationSheetOpen(true)}
  onOpenBodySheet={() => setBodySheetOpen(true)}
  onOpenPeptidesSheet={() => setPeptidesSheetOpen(true)}
  onOpenTrainingSheet={() => setTrainingSheetOpen(true)}  // NEU
/>
```

**Nach Zeile 727: Sheet Komponente hinzufuegen**
```typescript
{/* Training Day Sheet - Layer 2 */}
<TrainingDaySheet 
  isOpen={trainingSheetOpen}
  onClose={() => setTrainingSheetOpen(false)}
  onOpenLogger={() => {
    setTrainingSheetOpen(false);
    setQuickLogConfig({ open: true, tab: 'training' });
  }}
/>
```

---

## Implementierungsreihenfolge

```text
1. [SHEET]    TrainingDaySheet.tsx erstellen (~280 Zeilen)
2. [WIDGET]   TrainingWidget.tsx - Props + onClick Handler
3. [RENDERER] WidgetRenderer.tsx - Prop hinzufuegen + durchreichen
4. [GRID]     MetricWidgetGrid.tsx - Prop hinzufuegen + durchreichen
5. [HOME]     AresHome.tsx - Import, State, Handler, Sheet
```

---

## Ergebnis

Nach der Implementierung:

| Aktion | Vorher | Nachher |
|--------|--------|---------|
| Klick auf Training Widget | Navigation zu `/training` | Oeffnet TrainingDaySheet (Layer 2) |
| Quick Logging | Nur ueber QuickLogSheet | Button im Sheet → QuickLogSheet |
| Deep Management | Sofort auf Seite | Button im Sheet → `/training` |

Das Training-Widget ist damit vollstaendig in die "headless Dashboard" Architektur integriert - konsistent mit Nutrition, Hydration, Weight und Peptides.

