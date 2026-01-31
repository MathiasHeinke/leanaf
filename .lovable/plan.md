
# Fix: Multivitamin-Gruppierung & Detail-Sheet Score

## Identifizierte Probleme

### Problem 1: A-Z und Multivitamin werden nicht gruppiert
Die `extractBaseName()` Funktion erkennt "A-Z" nicht als Multivitamin-Variante.

**Datenbank:**
| Name | impact_score | ingredient_ids |
|------|--------------|----------------|
| Multivitamin | 5.0 | [Vitamin A, B, C, D, E, Zink, Magnesium] |
| A-Z Komplex | 7.0 | [Vitamin A, B, C, D, E, K, Zink, Magnesium, Selen] |

Diese beiden sollten unter "Multivitamin" gruppiert werden.

### Problem 2: Detail-Sheet zeigt falschen Score
- **Liste**: Zeigt korrekt 9.5 (via `calculateComboScore` im Hook)
- **Detail-Sheet**: Zeigt statischen `impact_score` (5.0 / 7.0) weil es die Combo-Logik nicht nutzt

Das Detail-Sheet ruft nur `calculateRelevanceScore()` auf, aber nicht die spezielle `calculateComboScore()` Funktion für Multi-Ingredient-Produkte.

---

## Lösung

### Phase 1: Gruppierungs-Pattern erweitern

**Datei:** `src/lib/supplementDeduplication.ts`

Neues Pattern hinzufügen:
```typescript
// Multi-Vitamins
{ pattern: /^(multi-?vitamin|a-z\s*(komplex)?|multivit)/i, baseName: 'Multivitamin' },
```

Dies gruppiert automatisch:
- Multivitamin
- A-Z Komplex
- A-Z (falls vorhanden)
- Multivit...

### Phase 2: Detail-Sheet Combo-Score Integration

**Datei:** `src/components/supplements/SupplementDetailSheet.tsx`

Das `scoreResult` muss prüfen, ob das Item `ingredient_ids` hat und entsprechend `calculateComboScore()` nutzen:

```typescript
const scoreResult = useMemo(() => {
  if (!item) return null;
  
  // Prüfe auf Kombinations-Produkt
  if (item.ingredient_ids?.length) {
    // Hole Ingredient-Daten aus Context oder Props
    const comboResult = calculateComboScore(ingredientData, userContext);
    return {
      score: comboResult.score,
      baseScore: item.impact_score ?? 5.0,
      dynamicTier: getDynamicTier(comboResult.score),
      reasons: comboResult.breakdown,
      warnings: [],
      isPersonalized: true,
      isLimitedByMissingData: false,
      dataConfidenceCap: 10.0,
    };
  }
  
  // Standard für Einzel-Wirkstoffe
  return calculateRelevanceScore(
    item.impact_score ?? 5.0,
    item.relevance_matrix,
    userContext
  );
}, [item, userContext]);
```

**Problem:** Das Detail-Sheet hat keinen Zugriff auf die Library-Daten für die Ingredient-Lookups.

**Lösung:** Den `ScoredSupplementItem` Type (der bereits den `scoreResult` enthält) an das Sheet übergeben, anstatt nur `SupplementLibraryItem`.

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/lib/supplementDeduplication.ts` | Pattern für A-Z/Multivitamin hinzufügen |
| `src/components/supplements/SupplementDetailSheet.tsx` | Props erweitern um optionalen vorkalkuierten `scoreResult` |
| `src/components/supplements/SupplementInventory.tsx` | `ScoredSupplementItem` an Detail-Sheet übergeben |
| `src/components/supplements/SupplementGroupRow.tsx` | Info-Click mit vollständigem ScoredItem |

---

## Erwartetes Ergebnis

| Vorher | Nachher |
|--------|---------|
| A-Z und Multivitamin als separate Gruppen | Gruppiert unter "Multivitamin" mit 2 Varianten |
| Detail-Sheet: Score 5.0 / 7.0 | Detail-Sheet: Score 9.5 (konsistent mit Liste) |
| Verwirrende Diskrepanz zwischen Liste und Details | Volle Transparenz - gleicher Score überall |
