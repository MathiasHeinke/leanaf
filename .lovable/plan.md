
# Schritt 2: Neue Kartentypen implementieren

## Zusammenfassung

Wir fuegen 4 neue kontextbasierte ActionCards hinzu:
- **Sleep Log** (Morgens: "Wie hast du geschlafen?")
- **Training** (Mo/Di/Do/Fr: "Training anstehend")
- **Weight** (Woechentlich: "Weekly Weigh-In")
- **Nutrition** (Nach 4h ohne Mahlzeit: "Essens-Pause?")

Das Event-System aus Schritt 1 sorgt automatisch dafuer, dass die Karten verschwinden wenn die zugehoerigen Logger speichern.

---

## Datei-Aenderungen

### 1. src/hooks/useActionCards.ts

**Neue Imports (Zeile 17):**
```typescript
import { Moon, PenTool, Pill, User, Droplets, Coffee, Check, LucideIcon, Sunrise, Clock, Dumbbell, Sparkles, Syringe, Scale, Utensils } from 'lucide-react';
```

**Neuer Hook Import (nach Zeile 16):**
```typescript
import { useTodaysMeals } from './useTodaysMeals';
```

**Type erweitern (Zeile 28):**
```typescript
type: 'insight' | 'epiphany' | 'sleep_fix' | 'journal' | 'supplement' | 'profile' | 'hydration' | 'protein' | 'peptide' | 'training' | 'weight' | 'sleep_log' | 'nutrition';
```

**Neuer Hook im Funktionskoerper (nach Zeile 48):**
```typescript
const { meals } = useTodaysMeals();
```

**Neue Card-Logik (vor "Sort by priority" Zeile 228):**

#### Sleep Log Card
```typescript
// Sleep Log - Morning routine if no sleep logged today
const todayStr = new Date().toISOString().slice(0, 10);
const sleepLoggedToday = dailyMetrics?.sleep?.lastHours != null && 
  dailyMetrics?.sleep?.lastQuality != null;
const isMorning = hour >= 6 && hour < 11;

if (isMorning && !sleepLoggedToday && !plusData.sleepLoggedToday) {
  result.push({
    id: 'sleep_log',
    type: 'sleep_log',
    title: 'Wie hast du geschlafen?',
    subtitle: 'Logge deine Schlafqualität für bessere Insights.',
    gradient: 'from-indigo-500 to-blue-600',
    icon: Moon,
    actionContext: 'log_sleep',
    priority: 4,
    xp: 30,
    canSwipeComplete: false
  });
}
```

#### Training Card
```typescript
// Training Card - Training day without workout
const dayOfWeek = new Date().getDay();
const isTrainingDay = [1, 2, 4, 5].includes(dayOfWeek); // Mo, Di, Do, Fr
const workoutLogged = dailyMetrics?.training?.todayType != null || plusData.workoutLoggedToday;

if (isTrainingDay && !workoutLogged && hour >= 8 && hour < 22) {
  const dayNames: Record<number, string> = { 1: 'Montag', 2: 'Dienstag', 4: 'Donnerstag', 5: 'Freitag' };
  result.push({
    id: 'training',
    type: 'training',
    title: 'Training anstehend',
    subtitle: `${dayNames[dayOfWeek]} ist Trainingstag. Bereit?`,
    gradient: 'from-emerald-500 to-teal-600',
    icon: Dumbbell,
    actionContext: 'log_training',
    priority: 5,
    xp: 60,
    canSwipeComplete: false
  });
}
```

#### Weight Card
```typescript
// Weight Card - Weekly weigh-in reminder
const lastWeightDate = dailyMetrics?.weight?.date;
const daysSinceLastWeight = lastWeightDate 
  ? Math.floor((Date.now() - new Date(lastWeightDate).getTime()) / (1000 * 60 * 60 * 24))
  : 999;

if (daysSinceLastWeight >= 7 && hour >= 6 && hour < 12) {
  result.push({
    id: 'weight',
    type: 'weight',
    title: 'Weekly Weigh-In',
    subtitle: lastWeightDate 
      ? `Letzte Messung vor ${daysSinceLastWeight} Tagen.`
      : 'Tracke dein Gewicht für den Wochentrend.',
    gradient: 'from-violet-500 to-purple-600',
    icon: Scale,
    actionContext: 'log_weight',
    priority: 6,
    xp: 20,
    canSwipeComplete: false
  });
}
```

#### Nutrition Card
```typescript
// Nutrition Card - Meal reminder after 4+ hours
const lastMealTime = meals.length > 0 
  ? new Date(meals[meals.length - 1].ts).getTime() 
  : null;
const hoursSinceLastMeal = lastMealTime 
  ? (Date.now() - lastMealTime) / (1000 * 60 * 60) 
  : null;
const needsMealReminder = (hoursSinceLastMeal !== null && hoursSinceLastMeal > 4) || 
                          (lastMealTime === null && hour >= 12);

if (needsMealReminder && hour >= 8 && hour < 22) {
  result.push({
    id: 'nutrition',
    type: 'nutrition',
    title: 'Essens-Pause?',
    subtitle: hoursSinceLastMeal 
      ? `${Math.floor(hoursSinceLastMeal)}h seit der letzten Mahlzeit.`
      : 'Zeit für den ersten Fuel-Up.',
    gradient: 'from-orange-500 to-red-500',
    icon: Utensils,
    actionContext: 'log_nutrition',
    priority: 8,
    xp: 50,
    canSwipeComplete: false
  });
}
```

**Dependencies Update (Zeile 230):**
```typescript
}, [isInitialLoading, plusData, dailyMetrics, profileData, groupedSupplements, totalScheduled, totalTaken, protocols, isPeptideTakenToday, meals]);
```

---

### 2. src/components/home/SmartFocusCard.tsx

**Neue Imports (Zeile 10-11):**
```typescript
import { Check, X, ChevronRight, Droplets, Coffee, Pill, Camera, BrainCircuit, Moon, Sunrise, Clock, Dumbbell, LucideIcon, GlassWater, Milk, Syringe, PenTool, Scale, Utensils } from 'lucide-react';
import { openJournal, openSleep, openTraining, openWeight, openMeal } from '@/components/quick/quickAddBus';
```

**SmartTask Type erweitern (Zeile 19):**
```typescript
type: 'hydration' | 'supplement' | 'supplements' | 'peptide' | 'food' | 'workout' | 'sleep' | 'protein' | 'insight' | 'epiphany' | 'profile' | 'journal' | 'sleep_fix' | 'training' | 'weight' | 'sleep_log' | 'nutrition';
```

**Neue SmartAction Bloecke (nach journal Block, vor DEFAULT):**

```typescript
// SLEEP LOG: Open Sleep Logger
if (task.type === 'sleep_log') {
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        openSleep();
      }}
      className="w-full py-3 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
    >
      <Moon size={16} />
      <span>Schlaf tracken</span>
      <ChevronRight size={14} className="opacity-60" />
    </button>
  );
}

// TRAINING: Open Training Logger
if (task.type === 'training') {
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        openTraining();
      }}
      className="w-full py-3 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
    >
      <Dumbbell size={16} />
      <span>Workout starten</span>
      <ChevronRight size={14} className="opacity-60" />
    </button>
  );
}

// WEIGHT: Open Weight Logger
if (task.type === 'weight') {
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        openWeight();
      }}
      className="w-full py-3 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
    >
      <Scale size={16} />
      <span>Gewicht loggen</span>
      <ChevronRight size={14} className="opacity-60" />
    </button>
  );
}

// NUTRITION: Open Meal Input
if (task.type === 'nutrition') {
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        openMeal();
      }}
      className="w-full py-3 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
    >
      <Utensils size={16} />
      <span>Mahlzeit loggen</span>
      <ChevronRight size={14} className="opacity-60" />
    </button>
  );
}
```

---

### 3. src/components/home/ActionCardStack.tsx

**XP Map erweitern (Zeile 84-91):**
```typescript
const xpMap: Record<string, number> = {
  journal: 40,
  sleep: 30,
  sleep_log: 30,  // NEU
  weight: 20,
  training: 60,
  profile: 50,
  epiphany: 25,
  nutrition: 50,  // NEU
};
```

---

## Technische Details

### Prioritaeten-Reihenfolge (Final)

| Priority | Card | Trigger |
|----------|------|---------|
| 1 | sleep_fix | Schlaf < 6h geloggt |
| 2 | profile | Profil unvollstaendig |
| 3 | supplement | Supps pending |
| 3 | peptide | Peptide pending |
| 4 | sleep_log | Morgens (6-11h) ohne Sleep-Log |
| 4 | hydration | < 1L nach 12:00 |
| 5 | training | Mo/Di/Do/Fr ohne Workout |
| 5 | journal | Abends (18-23h) |
| 6 | weight | > 7 Tage ohne Messung |
| 8 | nutrition | > 4h ohne Mahlzeit |
| 10 | epiphany | Immer (letzte Karte) |

### Event-Flow nach Implementation

```text
User sieht "Training anstehend" Card
           |
           v
   Klickt "Workout starten"
           |
           v
   openTraining() -> QuickLogSheet oeffnet
           |
           v
   User loggt Workout -> Save
           |
           v
   TrainingLogger dispatcht 'ares-card-completed'
           |
           v
   ActionCardStack entfernt Card + 60 XP
```

---

## Erwartetes Verhalten

1. **Morgens 07:00:** "Wie hast du geschlafen?" erscheint -> Klick -> SleepLogger -> Speichern -> Card weg + 30 XP

2. **Montag 10:00:** "Training anstehend" erscheint -> Klick -> TrainingLogger -> Speichern -> Card weg + 60 XP

3. **Sonntag 08:00 (10 Tage ohne Wiegen):** "Weekly Weigh-In" erscheint -> Klick -> WeightLogger -> Speichern -> Card weg + 20 XP

4. **14:00 (5h seit letzter Mahlzeit):** "Essens-Pause?" erscheint -> Klick -> MealInput -> Speichern -> Card weg + 50 XP
