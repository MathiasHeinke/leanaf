

# Sleep Day Sheet: Layer 2 Analyse-Overlay

## Zusammenfassung

Das SleepDaySheet komplettiert die Layer 2 Architektur und verwandelt die erfassten Schlaf-Daten (Qualität, Zeiten, Faktoren) in **actionable Insights** direkt auf dem Dashboard.

---

## Aktueller Stand

| Komponente | Status | Problem |
|------------|--------|---------|
| `SleepWidget` | ❌ | Navigiert zu `/sleep` statt Sheet zu öffnen |
| `WidgetRenderer` | ❌ | Kein `onOpenSleepSheet` Prop |
| `MetricWidgetGrid` | ❌ | Kein `onOpenSleepSheet` Prop |
| `AresHome` | ❌ | Kein `sleepSheetOpen` State |
| `SleepDaySheet` | ❌ | Existiert nicht |

---

## Datenbank-Felder (sleep_tracking)

Der SleepLogger erfasst diese Daten, die das Sheet visualisieren soll:

| Feld | Typ | UI-Darstellung |
|------|-----|----------------|
| `sleep_hours` | numeric | Hero: "7.5h" |
| `sleep_quality` | int (1-5) | Score Badge mit Emoji |
| `bedtime` | time | Timing-Grid: "23:30" |
| `wake_time` | time | Timing-Grid: "06:45" |
| `sleep_interruptions` | int | Factor Pill: "2x Aufgewacht" |
| `screen_time_evening` | int | Factor Pill: "45min Screen" |
| `morning_libido` | int (1-5) | Morning Check Badge |
| `motivation_level` | int (1-5) | Morning Check Badge |

---

## Lösung

### Teil 1: SleepDaySheet erstellen

**Neue Datei:** `src/components/home/sheets/SleepDaySheet.tsx`

**Struktur:**
```text
+------------------------------------+
| [Handle Bar]                       |
+------------------------------------+
| Schlaf-Analyse             [X]     |
| Montag, 27. Januar 2026            |
+------------------------------------+
|                                    |
|  ╔═══════════════════════════════╗ |
|  ║       😊 GUT                  ║ |
|  ║        7.5h                   ║ |
|  ║    "Recovery Mode"            ║ |
|  ╚═══════════════════════════════╝ |
|                                    |
| ┌──────────┬──────────┬──────────┐ |
| │ Bett     │ Dauer    │ Aufwach  │ |
| │ 23:30    │ 7h 15m   │ 06:45    │ |
| └──────────┴──────────┴──────────┘ |
|                                    |
| ── Einflussfaktoren ──             |
| [🚫 2x Unterbrechung]              |
| [📱 45min Bildschirm]              |
| [💪 Motivation: 4/5]               |
|                                    |
| ── Woche (Ø 6.8h) ──               |
| [▁▃▅▇▅▃▇] Mo-So Sparkline          |
|                                    |
+------------------------------------+
| [Schlaf erfassen/bearbeiten] [⚙️] |
+------------------------------------+
```

**Features:**
- **Hero Score Section**: Großer Qualitäts-Badge (1-5 → Emoji + Label + Color)
- **Timing Grid**: 3-Spalten mit Bedtime | Duration | Wake Time
- **Context Factors**: Pills für alle geloggten Faktoren (Unterbrechungen, Screentime, etc.)
- **Weekly Sparkline**: Letzte 7 Tage als Mini-Balkendiagramm
- **Conditional Footer**: "Schlaf erfassen" wenn noch nicht geloggt, sonst "Log bearbeiten"

**Score-Mapping (1-5 Skala):**
| Score | Emoji | Label | Color |
|-------|-------|-------|-------|
| 1 | 😫 | Miserabel | Red |
| 2 | 😕 | Schlecht | Orange |
| 3 | 😐 | Okay | Yellow |
| 4 | 💪 | Gut | Green |
| 5 | 🚀 | Elite | Purple/Indigo |

**Daten-Query:**
```typescript
// Fetch today's sleep + last 7 days
const { data: sleepData } = useQuery({
  queryKey: ['sleep-day-sheet', todayStr],
  queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    // Today's detailed entry
    const { data: today } = await supabase
      .from('sleep_tracking')
      .select('*')  // All fields including factors
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .maybeSingle();
    
    // Weekly sparkline
    const dates = getLast7Days();
    const { data: week } = await supabase
      .from('sleep_tracking')
      .select('date, sleep_hours')
      .eq('user_id', user.id)
      .in('date', dates);
    
    return { today, week };
  }
});
```

### Teil 2: SleepWidget anpassen

**Datei:** `src/components/home/widgets/SleepWidget.tsx`

**Änderungen:**
```typescript
interface SleepWidgetProps {
  size: WidgetSize;
  onOpenSheet?: () => void;  // NEU
}

// onClick ändern in allen Varianten (flat, large, medium, small):
onClick={() => onOpenSheet ? onOpenSheet() : navigate('/sleep')}
```

### Teil 3: WidgetRenderer erweitern

**Datei:** `src/components/home/widgets/WidgetRenderer.tsx`

**Änderungen:**
```typescript
interface WidgetRendererProps {
  config: WidgetConfig;
  // ... bestehende props ...
  onOpenSleepSheet?: () => void;  // NEU
}

// Im switch case:
case 'sleep':
  return <SleepWidget size={size} onOpenSheet={onOpenSleepSheet} />;
```

### Teil 4: MetricWidgetGrid erweitern

**Datei:** `src/components/home/MetricWidgetGrid.tsx`

**Änderungen:**
```typescript
interface MetricWidgetGridProps {
  // ... bestehende props ...
  onOpenSleepSheet?: () => void;  // NEU
}

// In WidgetRenderer weitergeben:
<WidgetRenderer 
  config={widget} 
  // ... bestehende props ...
  onOpenSleepSheet={onOpenSleepSheet}
/>
```

### Teil 5: AresHome Integration

**Datei:** `src/pages/AresHome.tsx`

**Änderungen:**

1. **Import hinzufügen:**
```typescript
import { SleepDaySheet } from '@/components/home/sheets/SleepDaySheet';
```

2. **State hinzufügen:**
```typescript
const [sleepSheetOpen, setSleepSheetOpen] = useState(false);
```

3. **quickAddBus Handler aktualisieren:**
```typescript
// VORHER:
} else if (action.type === 'sleep') {
  setQuickLogConfig({ open: true, tab: 'sleep' });

// NACHHER:
} else if (action.type === 'sleep') {
  setSleepSheetOpen(true);  // Öffnet Layer 2 Sheet statt Logger
```

4. **MetricWidgetGrid Props erweitern:**
```typescript
<MetricWidgetGrid
  // ... bestehende props ...
  onOpenSleepSheet={() => setSleepSheetOpen(true)}
/>
```

5. **Sheet rendern:**
```typescript
<SleepDaySheet
  isOpen={sleepSheetOpen}
  onClose={() => setSleepSheetOpen(false)}
  onOpenLogger={() => {
    setSleepSheetOpen(false);
    setQuickLogConfig({ open: true, tab: 'sleep' });
  }}
/>
```

---

## Betroffene Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/components/home/sheets/SleepDaySheet.tsx` | **NEU** | Layer 2 Sheet mit Score, Timing, Faktoren |
| `src/components/home/widgets/SleepWidget.tsx` | EDIT | `onOpenSheet` prop hinzufügen |
| `src/components/home/widgets/WidgetRenderer.tsx` | EDIT | `onOpenSleepSheet` prop durchreichen |
| `src/components/home/MetricWidgetGrid.tsx` | EDIT | `onOpenSleepSheet` prop hinzufügen |
| `src/pages/AresHome.tsx` | EDIT | State, Handler, Sheet-Integration |

---

## Erwartetes Ergebnis

1. **Klick auf Sleep Widget** → Öffnet SleepDaySheet (statt Navigation zu /sleep)

2. **SleepDaySheet zeigt:**
   - Hero mit Score-Emoji und Stunden
   - Timing-Grid (Einschlaf-/Aufwachzeit)
   - Erfasste Faktoren als Pills
   - Wochenverlauf als Sparkline

3. **Footer-Aktionen:**
   - "Schlaf erfassen" → Öffnet QuickLogSheet mit Tab 'sleep'
   - Settings-Icon → Navigiert zu /sleep für Deep-Dive

4. **Quick-Input Buttons:**
   - "Sleep" Button öffnet jetzt Layer 2 Sheet (konsistent mit anderen Widgets)

---

## Technische Details

**Score-Label-Mapping:**
```typescript
const QUALITY_LABELS = {
  1: { emoji: '😫', label: 'Miserabel', color: 'text-red-500 bg-red-500/10' },
  2: { emoji: '😕', label: 'Schlecht', color: 'text-orange-500 bg-orange-500/10' },
  3: { emoji: '😐', label: 'Okay', color: 'text-yellow-500 bg-yellow-500/10' },
  4: { emoji: '💪', label: 'Gut', color: 'text-green-500 bg-green-500/10' },
  5: { emoji: '🚀', label: 'Elite Recovery', color: 'text-indigo-500 bg-indigo-500/10' },
};
```

**Duration Calculation:**
```typescript
const calculateDuration = (bedtime: string, wakeTime: string) => {
  if (!bedtime || !wakeTime) return null;
  
  const bed = parse(bedtime, 'HH:mm', new Date());
  let wake = parse(wakeTime, 'HH:mm', new Date());
  
  // Handle overnight (bedtime > wakeTime)
  if (wake < bed) {
    wake = addDays(wake, 1);
  }
  
  const diffMinutes = differenceInMinutes(wake, bed);
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
};
```

