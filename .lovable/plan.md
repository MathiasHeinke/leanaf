
# Plan: Timezone-Bug Fix für Training Parser

## Problem-Analyse

Das Training wurde auf **Donnerstag (2026-01-29)** gespeichert, obwohl der User es am **Mittwoch** eingetragen hat.

**Ursache:** `new Date().toISOString().slice(0, 10)` verwendet UTC, nicht die lokale Zeitzone des Users.

**Beispiel des Bugs:**
```
User in Europe/Berlin:
- Lokale Zeit: Mittwoch 28. Januar 2026, 23:30 Uhr
- UTC Zeit:    Donnerstag 29. Januar 2026, 00:30 Uhr
- toISOString(): "2026-01-29T00:30:00.000Z"
- Gespeichertes Datum: 2026-01-29 (Donnerstag) ❌
```

**Betroffene Stellen:**
1. `src/components/home/sheets/TrainingDaySheet.tsx` (Zeile 40)
2. `supabase/functions/training-ai-parser/index.ts` (Zeile 498)

---

## Lösung

Das Projekt hat bereits die korrekten Helper-Funktionen:
- `src/utils/dateHelpers.ts` → `getCurrentDateString()`
- `src/utils/timezone-backend-helper.ts` → `createTimezoneHeaders()`
- `supabase/functions/_shared/timezone-helper.ts` → Edge Function Helper

Diese werden nur nicht an den richtigen Stellen verwendet.

---

## Datei-Änderungen

### 1. Frontend: `TrainingDaySheet.tsx`

**Vorher (Zeile 40):**
```typescript
const todayStr = new Date().toISOString().slice(0, 10);
```

**Nachher:**
```typescript
import { getCurrentDateString } from '@/utils/dateHelpers';
// ...
const todayStr = getCurrentDateString();
```

### 2. Frontend: Timezone-Header bei API-Calls

**Im `handleQuickLogSubmit` (Zeile 77-83):**
```typescript
import { createTimezoneHeaders } from '@/utils/timezone-backend-helper';
// ...
const response = await supabase.functions.invoke('training-ai-parser', {
  body: {
    raw_text: result.rawText,
    training_type: result.trainingType,
    persist: true
  },
  headers: createTimezoneHeaders()  // NEU: Sendet x-user-timezone Header
});
```

### 3. Backend: `training-ai-parser/index.ts`

**Import am Anfang:**
```typescript
import { 
  extractTimezone, 
  getCurrentDateInTimezone 
} from '../_shared/timezone-helper.ts';
```

**Vorher (Zeile 498):**
```typescript
const todayStr = new Date().toISOString().slice(0, 10);
```

**Nachher:**
```typescript
// Timezone aus Request-Header lesen (vom Frontend gesendet)
const timezone = extractTimezone(req);
const todayStr = getCurrentDateInTimezone(timezone);
console.log(`[TRAINING-AI-PARSER] Using timezone: ${timezone}, date: ${todayStr}`);
```

**Auch Zeile 530 für session_name:**
```typescript
// Vorher:
const sessionName = `Training ${new Date().toLocaleDateString('de-DE')}`;

// Nachher:
const sessionName = `Training ${todayStr}`;
```

---

## Zusammenfassung der Änderungen

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/components/home/sheets/TrainingDaySheet.tsx` | **EDIT** | `getCurrentDateString()` + `createTimezoneHeaders()` |
| `supabase/functions/training-ai-parser/index.ts` | **EDIT** | `extractTimezone()` + `getCurrentDateInTimezone()` |

---

## Erwartetes Verhalten nach Fix

```
User in Europe/Berlin:
- Lokale Zeit: Mittwoch 28. Januar 2026, 23:30 Uhr
- x-user-timezone Header: "Europe/Berlin"
- getCurrentDateInTimezone("Europe/Berlin"): "2026-01-28"
- Gespeichertes Datum: 2026-01-28 (Mittwoch) ✅
```

---

## Aufwand

~30 Minuten (einfache Änderungen, Helper existieren bereits)
