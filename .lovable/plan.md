
# Fix: Supplements können nicht zum Tagesablauf hinzugefügt werden

## Ursachen

### Bug 1: Fehlender Unique Index für upsert
- Der Code nutzt `upsert(..., { onConflict: 'user_id,supplement_id' })`
- Es existiert aber **kein** UNIQUE INDEX auf `(user_id, supplement_id)`
- PostgreSQL findet keinen passenden Constraint und der upsert schlägt still fehl

### Bug 2: CHECK Constraint Verletzung
- Constraint: `timing IS NOT NULL AND array_length(timing, 1) > 0`
- Code: `timing: item.common_timing || []`
- Bei Supplements ohne `common_timing` wird `[]` übergeben -> Constraint verletzt!

## Lösung

### 1. Datenbank: Unique Index erstellen

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_supplements_user_supplement 
ON user_supplements (user_id, supplement_id) 
WHERE supplement_id IS NOT NULL;
```

### 2. Code-Fix: Timing nie leer

```typescript
// In useSupplementLibrary.ts - toggleSupplement()
const timing = (item.common_timing?.length) 
  ? item.common_timing 
  : ['morning']; // Fallback auf 'morning' wenn leer

const { error } = await supabase.from('user_supplements').upsert(
  {
    user_id: user.id,
    supplement_id: item.id,
    name: item.name,
    dosage: item.default_dosage || '',
    unit: item.default_unit || 'mg',
    preferred_timing: mapCommonTimingToPreferred(item.common_timing || []),
    timing: timing, // Nie leer!
    schedule: schedule as any,
    is_active: true,
  },
  { onConflict: 'user_id,supplement_id' }
);
```

### 3. Gleicher Fix für activateEssentials()

```typescript
// In useSupplementLibrary.ts - activateEssentials()
const inserts = phaseSupplements.essentials.map((item) => ({
  user_id: user.id,
  supplement_id: item.id,
  name: item.name,
  dosage: item.default_dosage || '',
  unit: item.default_unit || 'mg',
  preferred_timing: mapCommonTimingToPreferred(item.common_timing || []),
  timing: (item.common_timing?.length) ? item.common_timing : ['morning'], // Fallback
  schedule: { type: 'daily' as const } as any,
  is_active: true,
}));
```

## Dateien

| Datei | Änderung |
|-------|----------|
| SQL Migration | Unique Index auf `(user_id, supplement_id)` |
| `src/hooks/useSupplementLibrary.ts` | Timing-Fallback in `toggleSupplement()` und `activateEssentials()` |

## Erwartetes Ergebnis

1. Toggles im Protokoll-Tab funktionieren
2. "Essentials aktivieren" Button funktioniert
3. Supplements erscheinen im Tagesablauf
4. Keine Constraint-Verletzungen mehr
