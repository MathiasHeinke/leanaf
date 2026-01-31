
# Redundanz-Erkennung für Kombi-Produkte

## Das Problem

Ein User hat bereits **Zink** und **Magnesium** einzeln im Stack. Das **Multivitamin** wird mit Score 9.5 bewertet und enthält beide. Ohne Warnung würde der User doppelt supplementieren.

## Lösung: 3-Schichten-System

```text
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: SCORING                                           │
│  calculateComboScore() bekommt aktive Stack-IDs            │
│  Penalty: -1.5 pro bereits aktivem Inhaltsstoff            │
│  Ergebnis: Score sinkt von 9.5 → ~7.0 bei 2 Overlaps       │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: DATA                                              │
│  ComboScoreResult wird um "overlappingIngredients" erweitert│
│  z.B. ["Zink", "Magnesium"] für UI-Konsumption             │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: VISUAL                                            │
│  Ingredient-Tags im DetailSheet + GroupRow mit Farb-Coding │
│  🟢 Grün = Nicht im Stack (Mehrwert)                        │
│  🔴 Rot = Bereits im Stack (Redundanz)                      │
│  Tooltip: "Bereits aktiv in deinem Stack"                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Technische Umsetzung

### Phase 1: Scoring-Engine erweitern

**Datei:** `src/lib/calculateRelevanceScore.ts`

Die `calculateComboScore()` Funktion bekommt einen neuen Parameter:

```typescript
export function calculateComboScore(
  ingredientData: IngredientScoreData[],
  context: UserRelevanceContext | null,
  activeStackNames?: Set<string>  // NEU: Names der aktiven Wirkstoffe im Stack
): ComboScoreResult
```

**Neue Logik:**
- Prüfe jeden Ingredient gegen `activeStackNames`
- Penalty: `-1.5` pro überlappenden Wirkstoff (maximal -4.5)
- Speichere Liste der Überlappungen im Result

**Erweitertes Result-Interface:**
```typescript
export interface ComboScoreResult {
  score: number;
  breakdown: string[];
  ingredientCount: number;
  highQualityCount: number;
  // NEU:
  overlappingIngredients: string[];  // ["Zink", "Magnesium"]
  overlapPenalty: number;            // -3.0
}
```

### Phase 2: Hook-Integration

**Datei:** `src/hooks/useDynamicallySortedSupplements.ts`

Der Hook holt sich zusätzlich den User-Stack:

```typescript
export function useDynamicallySortedSupplements(): DynamicSupplementGroups {
  const { data: library = [] } = useSupplementLibrary();
  const { data: userStack = [] } = useUserStack();  // NEU
  const { context } = useUserRelevanceContext();

  // Extrahiere aktive Supplement-Namen aus dem Stack
  const activeStackNames = useMemo(() => {
    return new Set(
      userStack
        .filter(s => s.is_active && s.supplement?.name)
        .map(s => s.supplement!.name)
    );
  }, [userStack]);

  // Übergebe an calculateComboScore
  const comboResult = calculateComboScore(ingredientData, context, activeStackNames);
}
```

### Phase 3: ScoreResult Type erweitern

**Datei:** `src/types/relevanceMatrix.ts`

```typescript
export interface RelevanceScoreResult {
  // ... bestehende Felder ...
  
  // NEU: Für Combo-Produkte
  overlappingIngredients?: string[];  // Ingredients bereits im Stack
  overlapPenalty?: number;            // Angewandter Abzug
}
```

### Phase 4: Visual Indicator in UI

**Datei:** `src/components/supplements/SupplementGroupRow.tsx`

Für Combo-Produkte (mit `ingredient_ids`) Overlap-Badges anzeigen:

```typescript
// Unter dem Score-Badge für Combos
{variant.ingredient_ids?.length > 0 && variant.scoreResult.overlappingIngredients?.length > 0 && (
  <div className="flex gap-1 flex-wrap mt-1">
    {variant.scoreResult.overlappingIngredients.map(name => (
      <Tooltip key={name}>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
            ⚠️ {name}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {name} ist bereits in deinem Stack aktiv
        </TooltipContent>
      </Tooltip>
    ))}
  </div>
)}
```

**Datei:** `src/components/supplements/SupplementDetailSheet.tsx`

Dedizierte Sektion für Inhaltsstoff-Breakdown bei Combos:

```typescript
{/* Ingredient Breakdown für Combo-Produkte */}
{item.ingredient_ids?.length > 0 && (
  <div className="space-y-2">
    <h4 className="text-sm font-medium">Enthaltene Wirkstoffe</h4>
    <div className="flex flex-wrap gap-1.5">
      {item.ingredient_ids.map(name => {
        const isOverlapping = scoreResult?.overlappingIngredients?.includes(name);
        return (
          <Badge 
            key={name}
            variant={isOverlapping ? "destructive" : "secondary"}
            className="text-xs"
          >
            {isOverlapping && "⚠️ "}
            {name}
            {isOverlapping && " (bereits aktiv)"}
          </Badge>
        );
      })}
    </div>
    {scoreResult?.overlapPenalty && scoreResult.overlapPenalty < 0 && (
      <p className="text-xs text-muted-foreground">
        Score-Abzug: {scoreResult.overlapPenalty.toFixed(1)} 
        (Wirkstoffe bereits in deinem Stack)
      </p>
    )}
  </div>
)}
```

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/lib/calculateRelevanceScore.ts` | `calculateComboScore()` mit Stack-Awareness + Penalty-Logik |
| `src/types/relevanceMatrix.ts` | `ComboScoreResult` + `RelevanceScoreResult` erweitern |
| `src/hooks/useDynamicallySortedSupplements.ts` | User-Stack laden + an Scoring übergeben |
| `src/components/supplements/SupplementGroupRow.tsx` | Overlap-Badges mit Tooltip |
| `src/components/supplements/SupplementDetailSheet.tsx` | Ingredient-Breakdown Sektion |

---

## Scoring-Beispiel

**User-Stack:** Zink, Magnesium, Vitamin D

**Multivitamin bewerten (ingredient_ids: [Zink, Magnesium, Vitamin A, Vitamin C, Vitamin E])**

| Ingredient | Im Stack? | Score | Gewicht |
|------------|-----------|-------|---------|
| Zink | ✅ Ja | 8.5 | 0% (ignoriert) |
| Magnesium | ✅ Ja | 9.0 | 0% (ignoriert) |
| Vitamin A | ❌ Nein | 7.0 | 50% |
| Vitamin C | ❌ Nein | 6.5 | 30% |
| Vitamin E | ❌ Nein | 6.0 | 20% |

**Berechnung:**
- Basis: (7.0×0.5) + (6.5×0.3) + (6.0×0.2) = 6.65
- Overlap Penalty: -3.0 (2 × -1.5)
- **Finaler Score: 6.65 - 3.0 = 3.65** (stark reduziert wegen Redundanz)

---

## Erwartetes Ergebnis

| Vorher | Nachher |
|--------|---------|
| Multivitamin: Score 9.5 "Essential" | Multivitamin: Score 6.5 "Optimizer" (wenn Zink+Mg aktiv) |
| Keine Warnung vor Doppeldosierung | Rote Badges: "⚠️ Zink", "⚠️ Magnesium" |
| User nimmt unbewusst zu viel | Tooltip: "Bereits in deinem Stack aktiv" |
