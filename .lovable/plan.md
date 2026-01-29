
# Fix: Schlaf-Logging mit korrekter Tageswende-Logik

## Problem

Der SleepLogger zeigt "Bereits geloggt" an, selbst wenn für **heute** noch kein Schlaf eingetragen wurde. Das liegt an zwei Problemen:

1. **useDailyMetrics** holt den **letzten** Sleep-Eintrag ohne Datumsfilter
2. **SleepLogger** prüft nur `lastHours != null` → immer `true` wenn jemals geloggt

## Lösung: "Sleep Date" Logik mit 02:00 Uhr Grenze

```
┌─────────────────────────────────────────────────────────────┐
│                    TAGESWENDE FÜR SCHLAF                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   28.01.2026          │         29.01.2026                  │
│   ─────────────       │         ─────────────               │
│                       │                                     │
│   00:00  01:00  02:00 │ 03:00  04:00  ...  23:00           │
│   ──────────────┼─────│─────────────────────────           │
│   ↑             ↑                                          │
│   └─────────────┘                                          │
│   Gehört noch zu                                           │
│   "28.01." wenn Schlaf                                     │
│   für 28. geloggt wird                                     │
│                                                             │
│   Ab 02:00 Uhr → Neuer Tag (29.01.)                        │
│   Vor 02:00 Uhr → Noch alter Tag (28.01.)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Praxis-Beispiel:**
- 29.01. um 01:30 Uhr → Schlaf-Datum = 28.01. (gestern)
- 29.01. um 02:00 Uhr → Schlaf-Datum = 29.01. (heute)
- 29.01. um 12:00 Uhr → Schlaf-Datum = 29.01. (heute)

---

## Technische Änderungen

### 1. Neue Helper-Funktion in `dateHelpers.ts`

```typescript
/**
 * Get the "sleep date" - the date for which sleep should be logged.
 * Before 02:00 AM, sleep counts as the previous day (for night owls).
 * After 02:00 AM, sleep counts as the current day.
 */
export const getSleepDateString = (): string => {
  const timezone = getUserTimezone();
  const now = new Date();
  
  // Get current hour in user's timezone
  const hourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false
  });
  const currentHour = parseInt(hourFormatter.format(now), 10);
  
  // Before 2 AM → use yesterday's date
  if (currentHour < 2) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return toDateString(yesterday);
  }
  
  // 2 AM or later → use today's date
  return getCurrentDateString();
};
```

---

### 2. Update `useDailyMetrics.ts` - Sleep Query mit Datumsfilter

**Vorher (Zeile 112-119):**
```typescript
// Last Sleep Entry - NO DATE FILTER!
supabase
  .from('sleep_tracking')
  .select('sleep_hours, sleep_quality, date')
  .eq('user_id', userId)
  .order('date', { ascending: false })
  .limit(1)
  .maybeSingle()
```

**Nachher:**
```typescript
// Today's Sleep Entry - WITH DATE FILTER
supabase
  .from('sleep_tracking')
  .select('sleep_hours, sleep_quality, date, deep_sleep_minutes')
  .eq('user_id', userId)
  .eq('date', sleepDateStr)  // Neuer Filter!
  .maybeSingle()
```

Und am Anfang der Query-Funktion:
```typescript
const todayStr = getCurrentDateString();  // Timezone-aware
const sleepDateStr = getSleepDateString(); // Mit 02:00 Grenze
```

---

### 3. Update `useAresEvents.ts` - Sleep Speicherung

**Vorher (Zeile 69, 229):**
```typescript
const today = new Date().toISOString().slice(0, 10);
// ...
date: payload.date || today,
```

**Nachher:**
```typescript
import { getCurrentDateString, getSleepDateString } from '@/utils/dateHelpers';
// ...
const todayStr = getCurrentDateString();
// ...
// Bei Sleep-Speicherung:
date: payload.date || getSleepDateString(),  // Spezielle Sleep-Logik
```

---

### 4. Update `SleepLogger.tsx` - Korrekte Prüfung

**Vorher (Zeile 68-70):**
```typescript
const existingSleep = metrics?.sleep;
const hasExistingLog = existingSleep?.lastHours != null;
```

**Nachher:**
```typescript
import { getSleepDateString } from '@/utils/dateHelpers';
// ...
const existingSleep = metrics?.sleep;
// Prüfe ob Datum des existierenden Eintrags dem heutigen Sleep-Datum entspricht
const sleepDate = getSleepDateString();
const hasExistingLog = existingSleep?.date === sleepDate && existingSleep?.lastHours != null;
```

---

## Dateien die geändert werden

| Datei | Änderung |
|-------|----------|
| `src/utils/dateHelpers.ts` | Neue `getSleepDateString()` Funktion |
| `src/hooks/useDailyMetrics.ts` | Sleep-Query mit Datumsfilter |
| `src/hooks/useAresEvents.ts` | Sleep-Speicherung mit Sleep-Datum |
| `src/components/home/loggers/SleepLogger.tsx` | Korrekte Datum-Prüfung |

---

## Erwartetes Ergebnis

| Uhrzeit | Aktion | Ergebnis |
|---------|--------|----------|
| 29.01. 01:30 | Schlaf loggen | Speichert für 28.01. (gestern) |
| 29.01. 02:00 | Schlaf loggen | Speichert für 29.01. (heute) |
| 29.01. 12:00 | SleepLogger öffnen | Zeigt "Bereits geloggt" wenn 29.01. existiert |
| 29.01. 12:00 | Nach Bearbeiten | Update des 29.01. Eintrags |
| 29.01. 23:00 | Neuen Schlaf loggen? | Nein - zeigt Edit-Modus für 29.01. |
| 30.01. 02:00 | Schlaf loggen | Speichert für 30.01. (neuer Tag!) |

---

## Technische Details

### DailyMetrics Return-Typ erweitern

Die `sleep` Eigenschaft muss auch `date` enthalten:

```typescript
sleep: { 
  lastHours: number | null; 
  lastQuality: number | null;
  date: string | null;  // NEU
  deepSleepMinutes: number | null;  // NEU (optional)
}
```

### Edge Cases

- **Zeitzone-Wechsel:** User ändert Timezone um 01:30 → Sleep-Datum kann sich ändern
- **Reisen:** Bei Langstreckenflügen kann es zu Überlappungen kommen
- **Workaround:** 02:00 Uhr Grenze ist ein pragmatischer Kompromiss
