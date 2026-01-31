
# Fix: Supplement-Duplikate über alle Tiers hinweg

## Problem-Zusammenfassung

**Das System zeigt identische Substanzen mehrfach in verschiedenen Listen:**

| Substanz | Essential (Score 10) | Optimizer (Score 8.5) | Niche (Score 5.0) |
|----------|---------------------|----------------------|-------------------|
| Creatin | `Creatine Monohydrat` ✓ | — | `Creatin` ✓ |
| Omega-3 | `Omega-3 (EPA/DHA)` ✓ | — | `Omega-3` ✓ |
| Vitamin D | `Vitamin D3 + K2` ✓ | — | `Vitamin D3`, `Vitamin D Balance`, `Vitamin D3 + K2 MK7 Tropfen` ✓ |
| HMB | — | `HMB` ✓ | `HMB 3000` ✓ |
| GlyNAC | — | `GlyNAC` ✓ | `GLY-NAC` ✓ |

**Ursachen:**

1. **Datenbank-Duplikate**: Die `supplement_database` enthält mehrere Einträge für dieselbe Substanz mit unterschiedlichen Namen und Impact-Scores
2. **Gruppierung NACH Tier-Aufteilung**: Die aktuelle Logik:
   - Berechnet Scores für alle 111 Supplements
   - Teilt in 3 Tiers auf (Essential/Optimizer/Niche)
   - Gruppiert erst **danach innerhalb jedes Tiers**

Das bedeutet: `Creatin` (Score 5.0 → Niche) und `Creatine Monohydrat` (Score 10.0 → Essential) werden NIE zusammen gruppiert!

---

## Lösung: Gruppierung VOR Tier-Zuweisung

**Neuer Flow:**

```text
VORHER (falsch):
Alle Items → Score berechnen → In Tiers aufteilen → Pro Tier gruppieren
                                      ↓
                            [Duplikate in mehreren Tiers]

NACHHER (korrekt):
Alle Items → Score berechnen → Nach BaseName gruppieren → Tier basierend auf TOP-Score
                                      ↓
                            [Eine Gruppe pro Substanz, im richtigen Tier]
```

---

## Technische Änderungen

### Datei 1: `src/hooks/useDynamicallySortedSupplements.ts`

**Kernänderung: Gruppierung ZUERST, dann Tier-Zuweisung**

```typescript
// VORHER (Zeile 186-201):
// 3. Group into dynamic tiers (ITEMS)
for (const item of scoredItems) {
  const tier = item.scoreResult.dynamicTier;
  if (tier === 'essential') result.essentials.push(item);
  ...
}
// 4. Create base-name groups for each tier (TOO LATE!)
result.essentialGroups = groupByBaseNameWithScores(result.essentials, 'essential');

// NACHHER:
// 3. ZUERST alle Items nach BaseName gruppieren
const allGroups = groupByBaseNameWithScores(scoredItems);

// 4. DANN Gruppen in Tiers aufteilen basierend auf TOP-Score
for (const group of allGroups) {
  const topScore = group.topScore;
  if (topScore >= 9.0) {
    group.dynamicTier = 'essential';
    result.essentialGroups.push(group);
  } else if (topScore >= 6.0) {
    group.dynamicTier = 'optimizer';
    result.optimizerGroups.push(group);
  } else {
    group.dynamicTier = 'niche';
    result.nicheGroups.push(group);
  }
}
```

**Vorteile:**
- `Creatin` (5.0) + `Creatine Monohydrat` (10.0) → Eine "Creatin"-Gruppe mit Score 10.0 → Essential
- `Omega-3` (5.0) + `Omega-3 (EPA/DHA)` (9.2) → Eine "Omega-3"-Gruppe mit Score 9.2 → Essential
- Alle Vitamin-D-Varianten in EINER Gruppe

### Datei 2: `src/lib/supplementDeduplication.ts`

**Zusätzliche Patterns für besseres Matching:**

```typescript
// GlyNAC-Varianten zusammenfassen
{ pattern: /^gly[- ]?nac/i, baseName: 'GlyNAC' },

// Creatine/Kreatin alle Schreibweisen
{ pattern: /^creatin|^kreatin/i, baseName: 'Creatin' },
```

---

## Erwartetes Ergebnis nach Fix

### Essential Tab (Score ≥ 9.0):
| Gruppe | Varianten | Top-Score |
|--------|-----------|-----------|
| Creatin | `Creatine Monohydrat`, `Creatin` | 10.0 |
| Omega-3 | `Omega-3 (EPA/DHA)`, `Omega-3` | 10.0 |
| Vitamin D | `Vitamin D3 + K2`, `Vitamin D3`, `Vitamin D Balance`, `Vitamin D3 + K2 MK7 Tropfen` | 10.0 |
| Elektrolyte | ... | 10.0 |

### Optimizer Tab (Score 6.0-8.9):
| Gruppe | Varianten | Top-Score |
|--------|-----------|-----------|
| HMB | `HMB`, `HMB 3000` | 8.5 |
| GlyNAC | `GlyNAC`, `GLY-NAC` | 8.5 |
| Kollagen | ... | 8.5 |

### Niche Tab (Score < 6.0):
- Nur Substanzen die WIRKLICH niedrige Scores haben
- Keine "Phantom-Duplikate" mehr

---

## Dateien-Übersicht

| Datei | Änderung |
|-------|----------|
| `src/hooks/useDynamicallySortedSupplements.ts` | Gruppierung VOR Tier-Zuweisung; Tier basiert auf Group-Top-Score |
| `src/lib/supplementDeduplication.ts` | Pattern für GlyNAC hinzufügen |

---

## Optional: DB-Cleanup (Empfohlen)

Nach dem Frontend-Fix sollten auch die echten Duplikate in der Datenbank konsolidiert werden:

```sql
-- Beispiel: Creatin-Duplikat zusammenführen
-- 1. Produkte auf den aktiven Eintrag umhängen
UPDATE supplement_products
SET supplement_id = 'b8f4c710-8562-44ee-9bb4-45e624fcc3d6'  -- Creatin (mit 21 Produkten)
WHERE supplement_id = '9fe98fee-961b-4e71-bbcd-a09c95e6f3f8'; -- Creatine Monohydrat (Orphan)

-- 2. Impact-Score auf den höheren Wert setzen
UPDATE supplement_database
SET impact_score = 9.8
WHERE id = 'b8f4c710-8562-44ee-9bb4-45e624fcc3d6';

-- 3. Orphan löschen (optional)
DELETE FROM supplement_database
WHERE id = '9fe98fee-961b-4e71-bbcd-a09c95e6f3f8';
```

Dies ist aber nicht zwingend - der Frontend-Fix löst das visuelle Problem sofort.
