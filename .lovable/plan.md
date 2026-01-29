
# Fix: Supplement Layer 3 - TypeError "result[tier].push"

## Problem
Die `/supplements` Seite crasht mit dem Fehler `undefined is not an object (evaluating 'result[tier].push')` weil:

1. Die Datenbank enthält **9 verschiedene `necessity_tier` Werte**
2. Der Code erwartet nur **3 Werte**: `essential`, `optimizer`, `specialist`
3. 18 Supplements haben nicht-unterstützte Tiers (`advanced`, `maintenance`, `aesthetic`, `foundation`, `performance`, `therapeutic`)

## Lösung

### Option A: Code-Fix (Defensive Programmierung)
Die `groupByTier()` Funktion defensiv machen, sodass unbekannte Tiers auf `'specialist'` fallen:

```typescript
// src/lib/supplementDeduplication.ts
export function groupByTier(
  items: SupplementLibraryItem[]
): Record<NecessityTier, SupplementLibraryItem[]> {
  const result: Record<NecessityTier, SupplementLibraryItem[]> = {
    essential: [],
    optimizer: [],
    specialist: [],
  };
  
  for (const item of items) {
    // Defensive: Map unknown tiers to 'specialist'
    let tier = item.necessity_tier || 'optimizer';
    if (!result[tier]) {
      tier = 'specialist';
    }
    result[tier].push(item);
  }
  
  // Sort each tier by impact_score
  for (const tier of Object.keys(result) as NecessityTier[]) {
    result[tier].sort((a, b) => (b.impact_score || 0) - (a.impact_score || 0));
  }
  
  return result;
}
```

### Option B: Daten-Fix (Datenbank-Migration)
Die 18 Supplements mit ungültigen Tiers auf valide Werte migrieren:

| Alter Tier | Neuer Tier | Anzahl |
|------------|-----------|--------|
| `advanced` | `specialist` | 8 |
| `maintenance` | `optimizer` | 3 |
| `aesthetic` | `optimizer` | 2 |
| `foundation` | `essential` | 2 |
| `performance` | `optimizer` | 2 |
| `therapeutic` | `specialist` | 1 |

SQL-Migration:
```sql
UPDATE supplement_database SET necessity_tier = 'specialist' WHERE necessity_tier IN ('advanced', 'therapeutic');
UPDATE supplement_database SET necessity_tier = 'optimizer' WHERE necessity_tier IN ('maintenance', 'aesthetic', 'performance');
UPDATE supplement_database SET necessity_tier = 'essential' WHERE necessity_tier = 'foundation';
```

## Empfehlung

**Beides implementieren:**
1. **Code-Fix zuerst** - Sofortige Lösung, verhindert Crashes bei zukünftigen Dateninkonsistenzen
2. **Daten-Fix danach** - Bereinigt die Datenbank für Konsistenz

## Technische Details

### Betroffene Dateien
- `src/lib/supplementDeduplication.ts` - `groupByTier()` Funktion (Zeile 139-159)

### Betroffene Komponenten
- `SupplementTrackingModal.tsx` - Ruft `groupByTier()` auf Zeile ~113

### Testplan
1. Fix deployen
2. `/supplements` Seite laden
3. Alle Tabs durchklicken (Tagesablauf, Protokoll)
4. Neues Supplement hinzufügen testen
