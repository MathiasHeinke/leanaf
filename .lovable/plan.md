

# Bug Fix: Fehlender Mittags-Button in SmartFocusCard

## Problem-Analyse

Die QuickAction Card auf dem Homescreen zeigt nicht dynamisch alle Timing-Buttons basierend auf dem, was in Layer 3 (Supplement Architect) konfiguriert ist. Konkret fehlt der "Mittag"-Button.

### Ursache

Beim Aktivieren eines Supplements im Layer 3 wird das `timing`-Array falsch befuellt:

```typescript
// useSupplementLibrary.ts, Zeile 493
timing: (item.common_timing?.length) ? item.common_timing : ['morning'],
```

Das Problem:
1. `common_timing` aus der DB enthaelt Werte wie `['morning', 'evening']` oder `['with_meals']`
2. `timing_constraint` (z.B. `with_food`, `with_fats`) wird nur fuer `preferred_timing` ausgewertet
3. Das `timing`-Array wird **nicht** intelligent gemappt

**Beispiel:**
- Omega-3 hat `timing_constraint: with_fats` und `common_timing: ['evening']`
- `preferred_timing` wird korrekt auf `noon` gesetzt (mit Fett = Mahlzeit = Mittag)
- Aber `timing` wird auf `['evening']` gesetzt → User sieht keinen Mittags-Button!

---

## Loesung

Das `timing`-Array muss ebenfalls aus dem `preferred_timing` abgeleitet werden, anstatt `common_timing` direkt zu verwenden.

### Aenderung in `useSupplementLibrary.ts`

**Zeile 485-498 (toggleSupplement Funktion):**

```typescript
// VORHER:
const { error } = await supabase.from('user_supplements').upsert(
  {
    user_id: user.id,
    supplement_id: item.id,
    name: item.name,
    dosage: item.default_dosage || '',
    unit: item.default_unit || 'mg',
    preferred_timing: preferredTiming,
    timing: (item.common_timing?.length) ? item.common_timing : ['morning'],  // ❌ Falsch
    schedule: schedule as any,
    is_active: true,
  },
  { onConflict: 'user_id,supplement_id' }
);

// NACHHER:
const { error } = await supabase.from('user_supplements').upsert(
  {
    user_id: user.id,
    supplement_id: item.id,
    name: item.name,
    dosage: item.default_dosage || '',
    unit: item.default_unit || 'mg',
    preferred_timing: preferredTiming,
    timing: [preferredTiming],  // ✅ Konsistent mit preferred_timing
    schedule: schedule as any,
    is_active: true,
  },
  { onConflict: 'user_id,supplement_id' }
);
```

### Gleiche Aenderung in `activateEssentials` (Zeile 550):

```typescript
// VORHER:
timing: (item.common_timing?.length) ? item.common_timing : ['morning'],

// NACHHER:
timing: [mapTimingToPreferred(item.timing_constraint, item.common_timing)],
```

---

## Technische Details

### Warum `[preferredTiming]`?

Die `preferred_timing` wird bereits intelligent berechnet:

```typescript
function mapTimingToPreferred(timingConstraint, commonTiming) {
  // 1. timing_constraint hat Prioritaet
  if (timingConstraint === 'with_food' || timingConstraint === 'with_fats') return 'noon';
  if (timingConstraint === 'bedtime') return 'bedtime';
  if (timingConstraint === 'fasted') return 'morning';
  // ...
  
  // 2. Fallback auf common_timing
  if (commonTiming?.[0]?.includes('mittag')) return 'noon';
  // ...
  
  return 'morning'; // Default
}
```

Diese Logik stellt sicher:
- `with_fats` Supplements → `noon` (Mahlzeit)
- `bedtime` Supplements → `bedtime`
- `fasted` Supplements → `morning`

### Auswirkung

Nach dem Fix wird z.B. Omega-3 mit `timing: ['noon']` gespeichert statt `['evening']`, und der Mittags-Button erscheint in der SmartFocusCard.

---

## Dateien

| Datei | Zeilen | Aenderung |
|-------|--------|-----------|
| `src/hooks/useSupplementLibrary.ts` | 493, 550 | `timing` Array von `[preferredTiming]` statt `common_timing` |

---

## Wichtig: Bestehende Daten

Fuer bereits aktivierte Supplements muss der User das Timing manuell anpassen oder das Supplement deaktivieren und wieder aktivieren. Alternativ koennte ein Migrations-Script geschrieben werden, das alle `user_supplements` mit `timing_constraint: with_food/with_fats` auf `timing: ['noon']` aktualisiert.

