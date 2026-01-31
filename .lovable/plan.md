

# Feature: Kombinations-Scoring für Multi-Ingredient Produkte

## Übersicht

Multi-Ingredient-Produkte (Pre-Workout, Greens Powder, Multivitamin etc.) werden aktuell unfair niedrig bewertet, weil ihr `impact_score` statisch ist und nicht die Summe ihrer hochwertigen Inhaltsstoffe berücksichtigt.

**Ziel:** Ein einfaches, wartungsfreundliches System, das den Score von Kombinations-Produkten automatisch anhebt - basierend auf den bereits vorhandenen Einzel-Scores der Inhaltsstoffe.

---

## Lösung: ingredients_ids Spalte + Aggregations-Logik

### Konzept

```
Pre-Workout Komplex
  └── ingredient_ids: ["L-Citrullin", "Beta-Alanin", "Taurin", "Koffein"]
      └── Scores:       8.5         +    8.0      +   7.8   +   5.0
      
Aggregierter Score = gewichteter Durchschnitt + Synergy-Bonus
                   = 7.3 (avg) + 0.5 (Synergy) = 7.8
```

### Warum dieser Ansatz?

| Ansatz | Vorteile | Nachteile |
|--------|----------|-----------|
| ❌ Manuelle Score-Zuweisung | Einfach | Nicht skalierbar, veraltet schnell |
| ❌ Vollständige Ingredient-Gewichtung | Präzise | Komplex, viel Datenpflege |
| ✅ **ID-Referenz + Aggregation** | Automatisch, nutzt existierende Matrix-Daten | Minimaler Aufwand |

---

## Technische Umsetzung

### Phase 1: Datenbank-Erweiterung

**Neue Spalte in `supplement_database`:**
```sql
ALTER TABLE supplement_database
ADD COLUMN ingredient_ids text[] DEFAULT NULL;

COMMENT ON COLUMN supplement_database.ingredient_ids IS 
'Array of supplement names that compose this product (e.g., Pre-Workout contains L-Citrullin, Beta-Alanin)';
```

**Initiale Daten für bekannte Kombis:**
```sql
UPDATE supplement_database
SET ingredient_ids = ARRAY['L-Citrullin', 'Beta-Alanin', 'Taurin', 'Koffein', 'L-Arginin']
WHERE name = 'Pre-Workout Komplex';

UPDATE supplement_database
SET ingredient_ids = ARRAY['Vitamin A', 'Vitamin B Komplex', 'Vitamin C', 'Vitamin D', 'Vitamin E', 'Zink', 'Magnesium']
WHERE name = 'Multivitamin';

UPDATE supplement_database
SET ingredient_ids = ARRAY['Spirulina', 'Chlorella', 'Weizengras']
WHERE name ILIKE '%greens%';
```

### Phase 2: Scoring-Logik erweitern

**Neue Funktion in `calculateRelevanceScore.ts`:**

```typescript
interface IngredientScoreData {
  name: string;
  impactScore: number;
  relevanceMatrix: RelevanceMatrix | null;
}

/**
 * Calculate aggregated score for multi-ingredient products
 * 
 * Formula:
 * 1. Get personalized score for each ingredient
 * 2. Use TOP 3 scores (avoid dilution by low-value fillers)
 * 3. Weighted average: 50% top + 30% second + 20% third
 * 4. Add synergy bonus: +0.5 for 3+ high-quality ingredients (≥7.0)
 */
export function calculateComboScore(
  ingredientData: IngredientScoreData[],
  context: UserRelevanceContext | null
): { score: number; breakdown: string[] } {
  if (!ingredientData.length) {
    return { score: 5.0, breakdown: ['Keine Inhaltsstoffe hinterlegt'] };
  }

  // Calculate personalized score for each ingredient
  const scoredIngredients = ingredientData.map(ing => ({
    name: ing.name,
    score: calculateRelevanceScore(
      ing.impactScore,
      ing.relevanceMatrix,
      context
    ).score,
  }));

  // Sort by score descending
  scoredIngredients.sort((a, b) => b.score - a.score);

  // Take top 3 for weighted average
  const top3 = scoredIngredients.slice(0, 3);
  const weights = [0.5, 0.3, 0.2];
  
  let weightedSum = 0;
  let totalWeight = 0;
  const breakdown: string[] = [];

  top3.forEach((ing, i) => {
    const weight = weights[i] || 0.1;
    weightedSum += ing.score * weight;
    totalWeight += weight;
    breakdown.push(`${ing.name}: ${ing.score.toFixed(1)} (×${(weight * 100).toFixed(0)}%)`);
  });

  let baseScore = weightedSum / totalWeight;

  // Synergy bonus: 3+ ingredients with score ≥7.0
  const highQualityCount = scoredIngredients.filter(i => i.score >= 7.0).length;
  if (highQualityCount >= 3) {
    baseScore += 0.5;
    breakdown.push(`+0.5 Synergie-Bonus (${highQualityCount} hochwertige Inhaltsstoffe)`);
  }

  return {
    score: Math.min(10, Math.max(0, baseScore)),
    breakdown,
  };
}
```

### Phase 3: Hook-Integration

**Anpassung in `useDynamicallySortedSupplements.ts`:**

```typescript
// Nach dem Laden der Library:
// 1. Identifiziere Kombinations-Produkte (ingredient_ids nicht leer)
// 2. Lade die Ingredient-Daten für diese Produkte
// 3. Berechne aggregierten Score statt statischem impact_score

const scoredItems: ScoredSupplementItem[] = library.map((item) => {
  // Prüfe ob Kombinations-Produkt
  if (item.ingredient_ids?.length) {
    const ingredientData = item.ingredient_ids
      .map(name => library.find(l => l.name === name))
      .filter(Boolean);
    
    if (ingredientData.length > 0) {
      const comboResult = calculateComboScore(ingredientData, context);
      return {
        ...item,
        scoreResult: {
          score: comboResult.score,
          baseScore: item.impact_score ?? 5.0,
          dynamicTier: getDynamicTier(comboResult.score),
          reasons: comboResult.breakdown,
          warnings: [],
          isPersonalized: true,
          isLimitedByMissingData: false,
          dataConfidenceCap: 10.0,
        },
      };
    }
  }
  
  // Standard-Berechnung für Einzel-Wirkstoffe
  // ... existing code
});
```

---

## UI-Erweiterung (Optional)

Im Edit-Modal oder Score-Overlay anzeigen:

```
Pre-Workout Komplex
Score: 7.8 (Optimizer)
━━━━━━━━━━━━━━━━━━━━━
Enthält 5 Wirkstoffe:
  • L-Citrullin: 8.5 (50%)
  • Beta-Alanin: 8.0 (30%)
  • Taurin: 7.8 (20%)
  + Synergie-Bonus: +0.5
```

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `supabase/migrations/xxx_add_ingredient_ids.sql` | Neue Spalte + initiale Kombi-Daten |
| `src/lib/calculateRelevanceScore.ts` | Neue `calculateComboScore()` Funktion |
| `src/hooks/useDynamicallySortedSupplements.ts` | Integration der Combo-Logik |
| `src/types/supplementLibrary.ts` | Type-Erweiterung für `ingredient_ids` |
| `src/integrations/supabase/types.ts` | Auto-generierte Types aktualisieren |

---

## Erwartetes Ergebnis

| Produkt | Vorher | Nachher | Inhaltsstoffe |
|---------|--------|---------|---------------|
| **Pre-Workout Komplex** | 5.0 (Nische) | ~7.8 (Optimizer) | Citrullin, Beta-Alanin, Taurin, Koffein |
| **Multivitamin** | 5.0 (Nische) | ~7.2 (Optimizer) | A-Z Vitamine + Mineralien |
| **A-Z Komplex** | 7.0 | ~7.5 (mit Matrix) | Multi-Vitamine |

---

## Vorteile dieses Ansatzes

1. **Nutzt existierende Daten**: Die `relevance_matrix` der Einzel-Wirkstoffe wird wiederverwendet
2. **Automatisch personalisiert**: Sportler sieht höheren Pre-Workout-Score (Performance-Goal)
3. **Einfach erweiterbar**: Neue Kombis = nur `ingredient_ids` Array pflegen
4. **Top-3-Gewichtung**: Verhindert Score-Verwässerung durch Filler-Inhaltsstoffe (z.B. Koffein 5.0)
5. **Synergy-Bonus**: Belohnt hochwertige Kombis mit vielen guten Inhaltsstoffen

