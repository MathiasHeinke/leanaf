
# Plan: Blueprint & Flow - Premium Redesign mit Smart Features

## Zusammenfassung der Updates

Wir integrieren die drei neuen Features ins bestehende Konzept und fuegen das Smart Scheduling hinzu:

1. **Onboarding-Nudge** - "Auto-Activate Essentials" Button im leeren Flow-Tab
2. **Stack Score** - Gamification mit prozentualem Fortschritt (Donut-Chart)
3. **Smart Info Cards** - "26 aktiv (11 heute)" statt nur "26"
4. **Smart Scheduling** - Zyklen, Wochentage, Training-Days automatisch berechnet

---

## Teil 1: Neue Dateien

### A) Schedule-Utils (`src/lib/schedule-utils.ts`)

```typescript
// Die "Brain"-Funktion fuer Smart Scheduling
import { differenceInDays, getDay } from 'date-fns';

export type ScheduleType = 'daily' | 'weekly' | 'cycle' | 'training_days';

export interface SupplementSchedule {
  type: ScheduleType;
  cycle_on_days?: number;    // z.B. 5 (Ashwagandha: 5 On)
  cycle_off_days?: number;   // z.B. 2 (Ashwagandha: 2 Off)
  weekdays?: number[];       // 0=Sonntag, 1=Montag... (Vitamin D Hochdosis: nur Mo)
  start_date?: string;       // Startdatum fuer Zyklus-Berechnung
}

export function shouldShowSupplement(
  schedule: SupplementSchedule | null, 
  targetDate: Date = new Date()
): boolean {
  if (!schedule || schedule.type === 'daily') return true;

  // Wochentage (z.B. "Nur Montags")
  if (schedule.type === 'weekly' && schedule.weekdays) {
    return schedule.weekdays.includes(getDay(targetDate));
  }

  // Zyklen (z.B. Ashwagandha 5 On / 2 Off)
  if (schedule.type === 'cycle' && schedule.cycle_on_days && schedule.cycle_off_days && schedule.start_date) {
    const daysSinceStart = differenceInDays(targetDate, new Date(schedule.start_date));
    const cycleLength = schedule.cycle_on_days + schedule.cycle_off_days;
    const dayInCycle = ((daysSinceStart % cycleLength) + cycleLength) % cycleLength;
    return dayInCycle < schedule.cycle_on_days;
  }

  // Training-Days (Platzhalter - braucht Trainingsplan-Integration)
  if (schedule.type === 'training_days') {
    // TODO: Pruefen ob heute Training geplant ist
    return true;
  }

  return true;
}

export function getScheduleLabel(cyclingProtocol: string | null): string | null {
  if (!cyclingProtocol) return null;
  
  const labels: Record<string, string> = {
    '5_on_2_off': 'Zyklus: 5 Tage an, 2 Pause',
    '4_weeks_on_1_off': 'Zyklus: 4 Wochen an, 1 Pause',
    'weekly': 'Einmal woechentlich',
    'training_days': 'Nur Trainingstage',
  };
  
  return labels[cyclingProtocol] || cyclingProtocol;
}
```

### B) Stack Score Component (`src/components/supplements/StackScoreCard.tsx`)

```typescript
// Gamification: Prozentuale Stack-Qualitaet als Donut-Chart
import { cn } from '@/lib/utils';

interface StackScoreCardProps {
  score: number;        // 0-100
  essentialsActive: number;
  essentialsTotal: number;
}

export const StackScoreCard: React.FC<StackScoreCardProps> = ({
  score,
  essentialsActive,
  essentialsTotal,
}) => {
  // SVG Donut Chart
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <Card className="bg-card/50 snap-start min-w-[160px] shrink-0">
      <CardContent className="p-4 flex items-center gap-3">
        {/* Donut Chart */}
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" 
              stroke="currentColor" strokeWidth="8" 
              className="text-muted/30" />
            <circle cx="50" cy="50" r="40" fill="none" 
              stroke="currentColor" strokeWidth="8" 
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={cn(
                score >= 80 ? "text-green-500" :
                score >= 50 ? "text-amber-500" : "text-red-500"
              )} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
            {score}%
          </span>
        </div>
        <div>
          <p className="text-2xl font-bold">{essentialsActive}/{essentialsTotal}</p>
          <p className="text-xs text-muted-foreground">Stack Score</p>
        </div>
      </CardContent>
    </Card>
  );
};
```

### C) Toggle Row Component (`src/components/supplements/SupplementToggleRow.tsx`)

```typescript
// Der "Magic Toggle" mit Scheduling-Label
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Check, Info } from 'lucide-react';
import { getScheduleLabel } from '@/lib/schedule-utils';

interface SupplementToggleRowProps {
  item: SupplementLibraryItem;
  isActive: boolean;
  onToggle: (id: string, active: boolean) => void;
  isLoading?: boolean;
}

export const SupplementToggleRow: React.FC<SupplementToggleRowProps> = ({
  item, isActive, onToggle, isLoading
}) => {
  const scheduleLabel = getScheduleLabel(item.cycling_protocol);
  
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl border transition-all",
      isActive 
        ? "bg-primary/5 border-primary/20" 
        : "bg-card/50 border-border/30 hover:bg-card"
    )}>
      {/* Icon */}
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center text-lg",
        isActive ? "bg-primary/10" : "bg-muted/50"
      )}>
        {item.icon || "💊"}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{item.name}</span>
        </div>
        
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          {isActive ? (
            <>
              <Check className="h-3 w-3 text-green-500" />
              <span>{item.common_timing?.[0] || 'Morgens'}</span>
              <span>•</span>
              <span>{item.default_dosage || 'Standard'}</span>
            </>
          ) : (
            <>
              <Info className="h-3 w-3" />
              <span>Empfohlen: {item.default_dosage}</span>
            </>
          )}
        </div>
        
        {/* Schedule Badge (Zyklen) */}
        {scheduleLabel && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded w-fit">
            <RefreshCw className="h-3 w-3" />
            <span>{scheduleLabel}</span>
          </div>
        )}
      </div>
      
      {/* Status + Toggle */}
      <div className="flex items-center gap-2">
        {isActive && (
          <span className="text-[10px] font-medium text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded">
            Im Stack
          </span>
        )}
        <Switch
          checked={isActive}
          onCheckedChange={(checked) => onToggle(item.id, checked)}
          disabled={isLoading}
          className="data-[state=checked]:bg-primary"
        />
      </div>
    </div>
  );
};
```

---

## Teil 2: Aktualisierte Komponenten

### A) SupplementsPage.tsx - Komplett-Redesign

**Struktur:**
```text
+--------------------------------------------------+
| [Stack Architect] [Layer 3]              [+]     |
+--------------------------------------------------+
| Horizontal Scroll Stats (snap-x):                |
| [26 aktiv] [11 heute] [Stack: 75%] [2 fehlen]   |
+--------------------------------------------------+
| [Segmented Control: Tagesablauf | Protokoll]    |
+--------------------------------------------------+
| Content Area mit AnimatePresence                 |
+--------------------------------------------------+
```

**Key Changes:**
- 2 Tabs statt 3 (Timeline + Inventory, keine "Empfehlungen" mehr - die sind jetzt im Protokoll)
- Stats horizontal scrollbar mit `snap-x snap-mandatory`
- Segmented Control (iOS-Style) statt klassische Tabs
- Smart Info: "26 aktiv (11 heute)" - zeigt Total vs. Heute

**Stats Berechnung:**
```typescript
const { groupedByTiming, activeStack } = useUserStackByTiming();
const { missingCount, totalEssentials } = useMissingEssentials(userPhase);

// Smart Scheduling: Wie viele sind HEUTE faellig?
const todayCount = useMemo(() => {
  return activeStack.filter(s => shouldShowSupplement(s.schedule)).length;
}, [activeStack]);

// Stack Score: % der Essentials aktiviert
const stackScore = useMemo(() => {
  if (totalEssentials === 0) return 100;
  const activeEssentials = totalEssentials - missingCount;
  return Math.round((activeEssentials / totalEssentials) * 100);
}, [totalEssentials, missingCount]);
```

### B) SupplementTimeline.tsx - Flow Tab Update

**Neue Features:**

1. **Onboarding-Nudge (Empty State):**
```tsx
if (totalCount === 0) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-semibold mb-1">Dein Stack ist leer</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">
        Starte mit den Essentials - wissenschaftlich fundiert.
      </p>
      <Button onClick={onAutoActivateEssentials} className="gap-2">
        <Zap className="h-4 w-4" />
        Essentials aktivieren
      </Button>
      <p className="text-xs text-muted-foreground mt-3">
        Oder wechsle zum Protokoll-Tab
      </p>
    </div>
  );
}
```

2. **Smart Scheduling Filter:**
```typescript
// Filtere nur Supplements die HEUTE faellig sind
const todaysSupplements = useMemo(() => {
  return Object.entries(groupedByTiming).reduce((acc, [timing, items]) => {
    acc[timing] = items.filter(s => shouldShowSupplement(s.schedule));
    return acc;
  }, {} as Record<PreferredTiming, UserStackItem[]>);
}, [groupedByTiming]);
```

3. **"All Done" Celebration:**
```tsx
{allStacksCompleted && (
  <motion.div 
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center py-8"
  >
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
      <Check className="h-8 w-8 text-green-500" />
    </div>
    <h3 className="font-semibold text-green-600">Day Complete!</h3>
    <p className="text-sm text-muted-foreground">Maximale Absorption erreicht.</p>
  </motion.div>
)}
```

### C) SupplementInventory.tsx - Blueprint Tab Update

**Neue Features:**

1. **Zeigt ALLE Supplements aus Library** (nicht nur User-Stack)
2. **Gruppiert nach Tier** mit horizontalen Pills
3. **Toggle direkt = INSERT/DELETE** in user_supplements

**Struktur:**
```text
+--------------------------------------------------+
| 🔍 Suche...                                       |
+--------------------------------------------------+
| [●Essential] [Optimizer] [Specialist]            |
+--------------------------------------------------+
| 🚨 Non-Negotiables - Jeder sollte diese nehmen   |
+--------------------------------------------------+
| 💊 Vitamin D3        Morgens | 5000IU      [●]  |
|    🔄 Empfohlen: mit K2 kombinieren              |
| 💊 Magnesium Gly     Abends | 400mg        [●]  |
|    🔄 Zyklus: 5 Tage an, 2 Pause                 |
| 💊 Omega-3           Mittags | 2g EPA      [○]  |
| 💊 Creatine          Morgens | 5g          [○]  |
+--------------------------------------------------+
```

**Toggle Handler:**
```typescript
const handleToggle = async (item: SupplementLibraryItem, activate: boolean) => {
  if (!user?.id) return;
  
  if (activate) {
    // Magic: Auto-fill mit Defaults aus Library
    const timing = mapCommonTimingToPreferred(item.common_timing);
    const schedule = item.cycling_required 
      ? parseScheduleFromProtocol(item.cycling_protocol)
      : { type: 'daily' };
    
    await supabase.from('user_supplements').insert({
      user_id: user.id,
      supplement_id: item.id,
      name: item.name,
      dosage: item.default_dosage || '',
      unit: item.default_unit || 'mg',
      preferred_timing: timing,
      timing: item.common_timing || [],
      schedule: schedule,
      is_active: true,
    });
    
    toast.success(`${item.name} zu ${PREFERRED_TIMING_LABELS[timing]} hinzugefuegt`);
  } else {
    await supabase
      .from('user_supplements')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('supplement_id', item.id);
      
    toast.success(`${item.name} pausiert`);
  }
  
  queryClient.invalidateQueries({ queryKey: ['user-stack'] });
  window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
};
```

---

## Teil 3: Hook-Erweiterungen

### useSupplementLibrary.ts - Neue Funktionen

```typescript
// 1. Auto-Activate Essentials (fuer Onboarding-Nudge)
export const useAutoActivateEssentials = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: phaseSupplements } = useSupplementsByPhase(0); // Phase 0 = Foundation
  
  const activateEssentials = async () => {
    if (!user?.id || !phaseSupplements?.essentials) return;
    
    const inserts = phaseSupplements.essentials.map(item => ({
      user_id: user.id,
      supplement_id: item.id,
      name: item.name,
      dosage: item.default_dosage || '',
      unit: item.default_unit || 'mg',
      preferred_timing: mapCommonTimingToPreferred(item.common_timing),
      timing: item.common_timing || [],
      is_active: true,
    }));
    
    await supabase.from('user_supplements').upsert(inserts, {
      onConflict: 'user_id,supplement_id',
    });
    
    queryClient.invalidateQueries({ queryKey: ['user-stack'] });
    toast.success(`${inserts.length} Essentials aktiviert!`);
  };
  
  return { activateEssentials, essentialsCount: phaseSupplements?.essentials?.length || 0 };
};

// 2. Mapping-Funktion: common_timing -> preferred_timing
function mapCommonTimingToPreferred(commonTiming: string[]): PreferredTiming {
  if (!commonTiming?.length) return 'morning';
  
  const first = commonTiming[0]?.toLowerCase();
  
  if (first?.includes('morgen') || first?.includes('nuechtern')) return 'morning';
  if (first?.includes('mittag')) return 'noon';
  if (first?.includes('abend') || first?.includes('nacht')) return 'evening';
  if (first?.includes('schlaf')) return 'bedtime';
  if (first?.includes('vor training')) return 'pre_workout';
  if (first?.includes('nach training')) return 'post_workout';
  
  return 'morning';
}

// 3. Schedule Parser: cycling_protocol -> SupplementSchedule
function parseScheduleFromProtocol(protocol: string | null): SupplementSchedule {
  if (!protocol) return { type: 'daily' };
  
  if (protocol === '5_on_2_off') {
    return { 
      type: 'cycle', 
      cycle_on_days: 5, 
      cycle_off_days: 2,
      start_date: new Date().toISOString(),
    };
  }
  if (protocol === '4_weeks_on_1_off') {
    return { 
      type: 'cycle', 
      cycle_on_days: 28, 
      cycle_off_days: 7,
      start_date: new Date().toISOString(),
    };
  }
  if (protocol === 'weekly') {
    return { type: 'weekly', weekdays: [1] }; // Default: Montag
  }
  if (protocol === 'training_days') {
    return { type: 'training_days' };
  }
  
  return { type: 'daily' };
}
```

---

## Teil 4: Datenbank-Erweiterung (Optional)

Falls die `schedule` Spalte in `user_supplements` noch nicht existiert:

```sql
-- Migration: Add schedule JSONB column
ALTER TABLE user_supplements 
ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '{"type": "daily"}';

-- Index fuer Performance
CREATE INDEX IF NOT EXISTS idx_user_supplements_schedule 
ON user_supplements USING GIN (schedule);
```

---

## Dateien-Uebersicht

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/lib/schedule-utils.ts` | **NEU** | Smart Scheduling Logik |
| `src/components/supplements/StackScoreCard.tsx` | **NEU** | Donut-Chart Gamification |
| `src/components/supplements/SupplementToggleRow.tsx` | **NEU** | Toggle-Zeile mit Zyklen-Badge |
| `src/pages/SupplementsPage.tsx` | **REWRITE** | 2-Tab Layout, Horizontal Stats, Segmented Control |
| `src/components/supplements/SupplementTimeline.tsx` | **UPDATE** | Onboarding-Nudge, Smart Filter, Celebration |
| `src/components/supplements/SupplementInventory.tsx` | **REWRITE** | Blueprint-Tab mit Toggles |
| `src/hooks/useSupplementLibrary.ts` | **EXTEND** | Auto-Activate, Mapping, Schedule Parser |
| `src/types/supplementLibrary.ts` | **EXTEND** | ScheduleType, SupplementSchedule Interfaces |

---

## User Journey (Final)

```text
1. User oeffnet /supplements (zum ersten Mal)
   -> Sieht "Tagesablauf" Tab (leer)
   -> Sieht Onboarding-Nudge: "Essentials aktivieren" Button

2. Klickt "Essentials aktivieren"
   -> 4-5 Essentials werden automatisch aktiviert
   -> Toast: "5 Essentials aktiviert!"
   -> Timeline zeigt jetzt Morning + Evening Bundles

3. Alternativ: Wechselt zu "Protokoll" Tab
   -> Sieht Gold Standard mit Tier-Pills
   -> Essential-Tab ist vorausgewaehlt
   -> Sieht D3, Magnesium, Omega-3, Creatine...
   -> Toggles einzeln an

4. Bei Ashwagandha sieht er:
   -> Badge: "Zyklus: 5 Tage an, 2 Pause"
   -> Aktiviert es trotzdem

5. Am Samstag (Tag 6):
   -> Ashwagandha erscheint NICHT in der Timeline
   -> System weiss: Heute ist Pause

6. Stats zeigen:
   -> "26 aktiv (11 heute)" - User versteht den Unterschied
   -> Stack Score: 85% (Donut gruen)
   -> "2 Essentials fehlen" - Motivation zum Vervollstaendigen

7. Flow-Tab: Klickt "Stack abschliessen" bei Morning
   -> Haptic Feedback
   -> Card wird gruen
   -> Progress: "2/3 erledigt"

8. Alle Bundles erledigt:
   -> "Day Complete!" Celebration
   -> XP-Award (Gamification Layer)
```

---

## Mobile UX Fixes (Zusammenfassung)

1. **Stats**: Horizontal Scroll mit `snap-x` statt 3-Spalten-Grid
2. **Tabs**: Segmented Control mit animated Background-Slider
3. **Tier Pills**: Horizontal scrollbar, nicht 3 Spalten
4. **Content**: `AnimatePresence` fuer smooth Tab-Wechsel
5. **Touch**: Grosse Hit-Areas auf Toggles (min 44px)
6. **Feedback**: Toast + Haptic bei jeder Aktion
