
# Bug Fix: Layer 2 zeigt falsche Timing-Gruppen

## Problem-Analyse

### Symptom
- "Abends" (evening) fehlt komplett in Layer 2
- Alle Supplements landen faelschlicherweise in "Morgens"

### Ursache: Inkompatible Timing-Systeme

Es existieren **zwei verschiedene Timing-Konstanten** im Projekt:

**Layer 3 verwendet `PreferredTiming`** (aus `supplementLibrary.ts`):
```
morning, noon, afternoon, evening, bedtime, pre_workout, post_workout
```

**Layer 2 verwendet `TIMING_OPTIONS`** (aus `useSupplementData.tsx`):
```
morning, noon, evening, pre_workout, post_workout, before_bed
```

**Kritischer Unterschied:**
- Layer 3: `bedtime`
- Layer 2: `before_bed` (NICHT bedtime!)

### Ablauf des Bugs

1. User aktiviert z.B. "Magnesium" in Layer 3
2. Layer 3 speichert `preferred_timing: 'bedtime'` in die DB
3. Layer 2 liest die Daten und ruft `normalizeTimingArray(['bedtime'])` auf
4. `normalizeTimingArray` prueft: "Ist 'bedtime' in TIMING_OPTIONS?" → **NEIN**
5. 'bedtime' wird als ungueltig verworfen (return null)
6. Array ist leer → Fallback auf `['morning']`
7. **Resultat:** Magnesium erscheint unter "Morgens" statt "Abends/Vor dem Schlafen"

---

## Loesung

### Option A: TIMING_OPTIONS erweitern (empfohlen)

`bedtime` zu den gueltigen Optionen hinzufuegen und `LEGACY_TIMING_MAP` erweitern:

```typescript
// src/hooks/useSupplementData.tsx

export const TIMING_OPTIONS = [
  { value: 'morning', label: 'Morgens', icon: '☀️', tip: 'Auf leeren Magen' },
  { value: 'noon', label: 'Mittags', icon: '🌅', tip: 'Zwischen den Mahlzeiten' },
  { value: 'evening', label: 'Abends', icon: '🌙', tip: 'Mit dem Abendessen' },
  { value: 'bedtime', label: 'Vor dem Schlafen', icon: '🛏️', tip: 'Vor dem Einschlafen' },  // NEU
  { value: 'pre_workout', label: 'Vor dem Training', icon: '💪', tip: '30-60 Min vor Training' },
  { value: 'post_workout', label: 'Nach dem Training', icon: '🏃', tip: 'Innerhalb 30 Min' },
];

export const LEGACY_TIMING_MAP: Record<string, string> = {
  'empty_stomach': 'morning',
  'between_meals': 'noon', 
  'with_food': 'evening',
  'before_bed': 'bedtime',     // ← Mapping hinzufuegen
  'before_sleep': 'bedtime',   // ← Mapping hinzufuegen
  'workout': 'pre_workout',
  'after_workout': 'post_workout'
};
```

### Aenderungen in SupplementsLogger.tsx

Die Icons/Labels sind bereits korrekt (aus dem letzten Fix), aber zur Sicherheit nochmal pruefen:

```typescript
const TIMING_ICONS: Record<string, React.ElementType> = {
  morning: Sunrise,
  noon: Sun,
  evening: Moon,
  bedtime: Moon,  // ✓ Bereits vorhanden
  pre_workout: Dumbbell,
  post_workout: Dumbbell,
};

const TIMING_LABELS: Record<string, string> = {
  morning: 'Morgens',
  noon: 'Mittags',
  evening: 'Abends',
  bedtime: 'Vor dem Schlafen',  // ✓ Bereits vorhanden
  pre_workout: 'Pre-Workout',
  post_workout: 'Post-Workout',
};
```

---

## Technischer Ablauf nach Fix

1. User aktiviert "Magnesium" in Layer 3
2. Layer 3 speichert `preferred_timing: 'bedtime'`
3. Layer 2 liest → `normalizeTimingArray(['bedtime'])`
4. `normalizeTimingArray` prueft: "Ist 'bedtime' in TIMING_OPTIONS?" → **JA** (neu!)
5. Rueckgabe: `['bedtime']`
6. **Resultat:** Magnesium erscheint korrekt unter "Vor dem Schlafen"

---

## Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/hooks/useSupplementData.tsx` | `bedtime` zu TIMING_OPTIONS hinzufuegen, LEGACY_TIMING_MAP erweitern |

---

## Hinweis: Bestehende Daten

Fuer bereits aktivierte Supplements sind keine Datenbankmigrationen noetig. Die DB speichert bereits `preferred_timing: 'bedtime'` korrekt - nur die Validierung in Layer 2 hat diese Werte faelschlicherweise verworfen. Nach dem Fix werden sie sofort korrekt angezeigt.
