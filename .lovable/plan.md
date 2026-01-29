
# Plan: Fix für Wochentag-Labels in Training Widgets

## Problem-Analyse

Die Wochen-Bubbles zeigen falsche Tagesbezeichnungen, weil:

1. `getLast7Days()` gibt die **letzten 7 Tage** zurück (heute + 6 Tage zurück)
2. Die Labels sind **statisch** `['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']`
3. Die Labels müssen **dynamisch** zu den tatsächlichen Wochentagen passen

**Beispiel (heute ist Donnerstag 29.01.2026):**

```text
getLast7Days() = ['2026-01-23', '2026-01-24', '2026-01-25', '2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29']
                   Freitag      Samstag      Sonntag      Montag       Dienstag     Mittwoch     Donnerstag

Statische Labels:    [Mo]        [Di]         [Mi]        [Do]         [Fr]         [Sa]         [So]
                     ↑ FALSCH!   

Korrekte Labels:     [Fr]        [Sa]         [So]        [Mo]         [Di]         [Mi]         [Do]
```

---

## Lösung

### Neuen Helper in `dateHelpers.ts` hinzufügen

```typescript
/**
 * Get the last N days with their weekday labels (timezone-aware)
 * Returns both date strings AND corresponding German weekday abbreviations
 */
export const getLast7DaysWithLabels = (): { dates: string[], labels: string[] } => {
  const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']; // getDay() returns 0=Sunday
  const dates: string[] = [];
  const labels: string[] = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(toDateString(d));
    labels.push(WEEKDAY_LABELS[d.getDay()]);
  }
  
  return { dates, labels };
};
```

### Komponenten aktualisieren

**TrainingWidget.tsx:**

```typescript
// VORHER:
const dates = getLast7Days();
const dayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// NACHHER:
import { getLast7DaysWithLabels } from '@/utils/dateHelpers';
// In queryFn:
const { dates, labels } = getLast7DaysWithLabels();
// Return labels mit in weeklyData
return {
  count: sessionDates.size,
  days: dates.map(d => sessionDates.has(d)),
  labels
};
// Im Render:
const dayLabels = weeklyData?.labels || ['Fr', 'Sa', 'So', 'Mo', 'Di', 'Mi', 'Do'];
```

**TrainingDaySheet.tsx:** Identische Änderung

---

## Datei-Änderungen

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/utils/dateHelpers.ts` | EDIT | `getLast7DaysWithLabels()` Helper hinzufügen |
| `src/components/home/widgets/TrainingWidget.tsx` | EDIT | Dynamische Labels aus Query verwenden |
| `src/components/home/sheets/TrainingDaySheet.tsx` | EDIT | Dynamische Labels aus Query verwenden |

---

## Erwartetes Ergebnis

```text
VORHER (Bug):
┌──────────────────────────────────────────────────────────┐
│  Diese Woche                              4/4 Sessions   │
│                                                          │
│  [  ]  [  ]  [  ]  [✓]  [✓]  [✓]  [✓]                    │
│   Mo    Di    Mi    Do   Fr   Sa   So  ← Statisch FALSCH │
│                                                          │
│  Training war am 29.01 (Do) aber zeigt am "Do" Position  │
│  obwohl letzte 7 Tage bei Fr-Do enden!                   │
└──────────────────────────────────────────────────────────┘

NACHHER (Fix):
┌──────────────────────────────────────────────────────────┐
│  Diese Woche                              4/4 Sessions   │
│                                                          │
│  [  ]  [  ]  [  ]  [✓]  [✓]  [✓]  [✓]                    │
│   Fr    Sa    So    Mo   Di   Mi   Do  ← Dynamisch       │
│                                                          │
│  Training am 29.01 zeigt korrekt auf "Do" (letzter Tag)  │
└──────────────────────────────────────────────────────────┘
```

---

## Technische Details

Die Query gibt jetzt auch die Labels zurück:

```typescript
// queryFn returns:
{
  count: 4,
  days: [false, false, false, true, true, true, true],
  labels: ['Fr', 'Sa', 'So', 'Mo', 'Di', 'Mi', 'Do']
}
```

So bleiben Daten und Labels immer synchron.

---

## Aufwand

| Task | Zeit |
|------|------|
| Helper in dateHelpers.ts | 5 min |
| TrainingWidget.tsx | 10 min |
| TrainingDaySheet.tsx | 10 min |
| Testen | 5 min |

**Gesamt: ~30 Minuten**
