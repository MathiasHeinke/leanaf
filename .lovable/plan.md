
# Plan: Fix für Layer 3 Training Session Data

## Ursache

Der Edge Function `training-ai-parser` schlägt beim Einfügen von `exercise_sets` still fehl. Die Datenbank hat einen Check-Constraint:

```sql
exercise_sets_origin_check: 
  CHECK (origin IS NULL OR origin = ANY (ARRAY['manual', 'image', 'auto']))
```

Der Code versucht `origin: 'layer2_notes'` einzufügen - dies verletzt den Constraint und verhindert alle Set-Inserts.

**Beweislage:**
- `training_sessions` hat korrekt `total_volume_kg: 3012` gespeichert
- `exercise_sessions` wurde erstellt (ID: `66a5bfd4-00c0-457b-8107-9351e9bbbe81`)
- `exercise_sets` für diese Session: **0 Zeilen** (alle Inserts fehlgeschlagen)

---

## Lösung

### Option A (Empfohlen): `origin` auf gültigen Wert ändern

**Datei:** `supabase/functions/training-ai-parser/index.ts`

**Zeile 586 ändern:**

```typescript
// VORHER:
origin: 'layer2_notes'

// NACHHER:
origin: 'manual'  // oder 'auto' - beides gültig
```

### Option B: Check-Constraint erweitern

Alternative wäre, den Check-Constraint um `'layer2_notes'` zu erweitern. Das erfordert eine Migration:

```sql
ALTER TABLE exercise_sets DROP CONSTRAINT exercise_sets_origin_check;
ALTER TABLE exercise_sets ADD CONSTRAINT exercise_sets_origin_check 
  CHECK (origin IS NULL OR origin = ANY (ARRAY['manual', 'image', 'auto', 'layer2_notes']));
```

**Empfehlung:** Option A ist schneller und erfordert keine Schema-Migration.

---

## Implementierung

| Datei | Aktion | Änderung |
|-------|--------|----------|
| `supabase/functions/training-ai-parser/index.ts` | EDIT | Zeile 586: `origin: 'layer2_notes'` → `origin: 'auto'` |

---

## Erwartetes Ergebnis nach Fix

```
┌──────────────────────────────────────────────────────────┐
│  ✓ Heute trainiert!                                      │
│                                                          │
│  ⊙ 21           ⚡ 3.012          💪 7.3                 │
│  Sätze          kg Volumen       Ø RPE                   │
│                                                          │
│  Heutige Sessions:                                       │
│  Training 29.1.2026 [Abgeschlossen] •••                  │
│  21 Sätze • Goblet Squat +6 weitere                      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Technische Details

### Warum passierte der Fehler still?

Der Code (Zeile 589-591) loggt den Fehler nur:

```typescript
if (setError) {
  console.error(`[TRAINING-AI-PARSER] Error inserting set ${i + 1}:`, setError);
}
```

Es gibt kein `throw` oder Response-Änderung - die Funktion meldet "Erfolg", obwohl 0 Sets eingefügt wurden.

### Bonus: Besseres Error Handling

Optional kann man nach der For-Schleife prüfen, ob Sets tatsächlich eingefügt wurden:

```typescript
// Nach der Set-Insert-Schleife
const { count } = await supabase
  .from('exercise_sets')
  .select('id', { count: 'exact', head: true })
  .eq('session_id', exerciseSession.id);

if (count === 0) {
  console.error('[TRAINING-AI-PARSER] WARNING: No sets were inserted!');
}
```

---

## Aufwand

**5 Minuten** - Einzeilige Code-Änderung + Edge Function Deploy
