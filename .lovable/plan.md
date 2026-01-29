

# Plan: Kalenderwochen-Ansicht für Training Widgets

## Problem-Analyse

Die aktuelle Implementierung zeigt die **letzten 7 Tage** (rolling window), aber du möchtest eine klassische **Kalenderwoche** (Mo-So):

```text
AKTUELL (Rolling 7 Days - wenn heute Donnerstag 29.01. ist):
┌─────────────────────────────────────────────────────────┐
│   Fr      Sa      So      Mo      Di      Mi      Do   │
│  23.01   24.01   25.01   26.01   27.01   28.01   29.01 │
│   [ ]     [ ]     [ ]     [✓]     [✓]     [✓]     [✓]  │
└─────────────────────────────────────────────────────────┘

GEWÜNSCHT (Kalenderwoche Mo-So):
┌─────────────────────────────────────────────────────────┐
│   Mo      Di      Mi      Do      Fr      Sa      So   │
│  27.01   28.01   29.01   30.01   31.01   01.02   02.02 │
│   [✓]     [✓]     [✓]     [✓]    (leer)  (leer)  (leer)│
│                           heute    ↑ Zukunft (noch nicht loggbar)
└─────────────────────────────────────────────────────────┘
```

---

## Lösung

### Neuer Helper: `getCurrentWeekDaysWithLabels()`

Statt "letzte 7 Tage" → "aktuelle Kalenderwoche Mo-So":

```typescript
/**
 * Get current calendar week (Monday to Sunday) with labels
 * Future days are included but marked as such
 */
export const getCurrentWeekDaysWithLabels = (): { 
  dates: string[], 
  labels: string[],
  isFuture: boolean[] // NEU: Markiert Zukunftstage
} => {
  const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const dates: string[] = [];
  const isFuture: boolean[] = [];
  
  const today = new Date();
  const todayStr = toDateString(today);
  
  // Get Monday of current week
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateStr = toDateString(d);
    dates.push(dateStr);
    isFuture.push(dateStr > todayStr); // Zukunftstag?
  }
  
  return { dates, labels: WEEKDAY_LABELS, isFuture };
};
```

### UI-Anpassung: Zukunftstage visuell anders darstellen

Zukunftstage werden **ausgegraut/deaktiviert** dargestellt (nicht als "nicht trainiert"):

```typescript
// In TrainingWidget & TrainingDaySheet
weekDays.map((done, i) => {
  const isFutureDay = futureFlags[i];
  
  return (
    <div className={cn(
      "w-9 h-9 rounded-full flex items-center justify-center",
      done 
        ? "bg-emerald-500 text-white"           // Trainiert
        : isFutureDay
          ? "bg-muted/20 border border-dashed border-muted-foreground/30"  // Zukunft
          : "bg-muted/50 text-muted-foreground" // Vergangenheit ohne Training
    )}>
      {done ? <Check className="w-4 h-4" /> : null}
    </div>
  );
})
```

---

## Datei-Änderungen

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/utils/dateHelpers.ts` | EDIT | Neuen Helper `getCurrentWeekDaysWithLabels()` hinzufügen |
| `src/components/home/widgets/TrainingWidget.tsx` | EDIT | Neuen Helper verwenden + Zukunftstage-Styling |
| `src/components/home/sheets/TrainingDaySheet.tsx` | EDIT | Gleiche Änderungen für das Sheet |

---

## Erwartetes Ergebnis

```text
Donnerstag, 29. Januar 2026:

┌─────────────────────────────────────────────────────────┐
│   Mo      Di      Mi      Do      Fr      Sa      So   │
│   [✓]     [✓]     [✓]     [✓]    [---]   [---]   [---] │
│   ↑ Vergangene Tage mit Training    ↑ Zukunft (gestrichelt/ausgegraut)
└─────────────────────────────────────────────────────────┘

Legende:
[✓] = Grüner Kreis mit Haken (Training geloggt)
[ ] = Grauer Kreis (Vergangenheit ohne Training)
[---] = Gestrichelter/dezenter Kreis (Zukunft - noch nicht loggbar)
```

---

## Technische Details

### Query-Änderung

```typescript
// VORHER:
const { dates, labels } = getLast7DaysWithLabels();

// NACHHER:
const { dates, labels, isFuture } = getCurrentWeekDaysWithLabels();

return {
  count: sessionDates.size,
  days: dates.map(d => sessionDates.has(d)),
  labels,
  isFuture  // NEU
};
```

### Count-Berechnung anpassen

Der Workout-Count sollte nur vergangene/heutige Tage zählen (nicht 0/4 wenn die Woche gerade erst begonnen hat):

```typescript
// Nur vergangene + heute zählen für den Progress
const completedDays = dates.filter((d, i) => !isFuture[i]);
const possibleWorkouts = completedDays.length;
const actualWorkouts = sessionDates.size;
```

---

## Aufwand

| Task | Zeit |
|------|------|
| Helper `getCurrentWeekDaysWithLabels` | 10 min |
| TrainingWidget.tsx anpassen | 15 min |
| TrainingDaySheet.tsx anpassen | 15 min |
| Styling für Zukunftstage | 5 min |
| Testen | 5 min |

**Gesamt: ~50 Minuten**

