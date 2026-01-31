
# Dynamische Supplement-Sortierung + Matrix-Tuning (mit Gemini Updates)

## Zusammenfassung

Integration von Geminis Hook-Vorschlaegen mit der bestehenden ARES-Architektur. Das System wechselt von statischer DB-Tier-Gruppierung (`necessity_tier`) zu dynamischer Score-basierter Kategorisierung.

## Architektur-Ueberblick

```text
AKTUELLE ARCHITEKTUR:
┌────────────────────────────────────────────────────────────────────┐
│  useSupplementLibrary() -> library items                           │
│       ↓                                                            │
│  groupedByTier[item.necessity_tier]  (statisch aus DB)            │
│       ↓                                                            │
│  SupplementInventory rendert nach DB-Tier                          │
└────────────────────────────────────────────────────────────────────┘

NEUE ARCHITEKTUR:
┌────────────────────────────────────────────────────────────────────┐
│  useSupplementLibrary() -> library items                           │
│       ↓                                                            │
│  useDynamicallySortedSupplements() <- useUserRelevanceContext()   │
│       ↓                                                            │
│  calculateRelevanceScore() mit erweiterten Modifikatoren          │
│       ↓                                                            │
│  getDynamicTier(score) -> 'essential' | 'optimizer' | 'niche'     │
│       ↓                                                            │
│  SupplementInventory rendert nach BERECHNETEM Tier                 │
└────────────────────────────────────────────────────────────────────┘
```

## Implementierungsschritte

### Phase 1: Score-Engine Erweiterungen

**Datei: `src/lib/calculateRelevanceScore.ts`**

Aenderungen:
- Neue `getDynamicTier(score)` Funktion hinzufuegen
- Neue Modifikatoren fuer spezielle Supplement-Kategorien:
  - GH-Secretagogue/Peptid-Penalty fuer Natural T-Booster (-2.0)
  - High Protein Penalty fuer BCAAs (-1.5)
- Erweiterte Signatur von `calculateRelevanceScore()` mit optionalem `markers` Parameter
- Rueckgabe-Objekt um `dynamicTier` und `finalScore` erweitern

Neue Funktionen:
```typescript
// Dynamische Tier-Bestimmung nach Score
export function getDynamicTier(score: number): 'essential' | 'optimizer' | 'niche' {
  if (score >= 9.0) return 'essential';
  if (score >= 6.0) return 'optimizer';
  return 'niche';
}

// Erweiterte Score-Berechnung mit Marker-Support
export function calculateRelevanceScore(
  baseImpactScore: number,
  matrix: RelevanceMatrix | null | undefined,
  context: UserRelevanceContext | null,
  markers?: SupplementMarkers
): RelevanceScoreResult
```

### Phase 2: Type-Erweiterungen

**Datei: `src/types/relevanceMatrix.ts`**

Neue Interfaces:
```typescript
// Marker fuer spezielle Supplement-Kategorien
export interface SupplementMarkers {
  isNaturalTestoBooster?: boolean;
  isBCAA?: boolean;
  isEAA?: boolean;
}

// Erweitertes Result-Interface
export interface RelevanceScoreResult {
  score: number;
  finalScore: number;        // NEU: Alias fuer Konsistenz
  baseScore: number;
  dynamicTier: 'essential' | 'optimizer' | 'niche';  // NEU
  reasons: string[];
  warnings: string[];
  isPersonalized: boolean;
}

// Erweiterter Context
export interface UserRelevanceContext {
  // ... bestehende Felder
  dailyProteinPerKg?: number;  // NEU: Protein-Intake fuer BCAA-Logik
}
```

### Phase 3: Context-Hook Erweiterung

**Datei: `src/hooks/useUserRelevanceContext.ts`**

Aenderungen:
- `dailyProteinPerKg` zum Context hinzufuegen
- Basiert auf Profil-Daten (Goal, Phase) als Estimation
- Placeholder fuer spaetere Nutrition-Log Integration

Neue Logik:
```typescript
// Estimated Protein Intake basierend auf verfuegbaren Daten
let estimatedProtein = 1.5; // Baseline
if (protocolStatus?.current_phase === 3) estimatedProtein = 1.8;
if (profile?.goal_type === 'muscle_gain') estimatedProtein = 2.0;
if (protocolModes.includes('enhanced') || protocolModes.includes('clinical')) {
  estimatedProtein = 2.2;
}

// Zum Context hinzufuegen
return {
  ...existingContext,
  dailyProteinPerKg: estimatedProtein,
};
```

### Phase 4: Neuer Dynamic Sorting Hook

**Neue Datei: `src/hooks/useDynamicallySortedSupplements.ts`**

Kernlogik (basierend auf Geminis Vorschlag, angepasst):
```typescript
import { useMemo } from 'react';
import { useSupplementLibrary } from './useSupplementLibrary';
import { useUserRelevanceContext } from './useUserRelevanceContext';
import { calculateRelevanceScore, getDynamicTier } from '@/lib/calculateRelevanceScore';
import type { RelevanceScoreResult, SupplementMarkers } from '@/types/relevanceMatrix';
import type { SupplementLibraryItem } from '@/types/supplementLibrary';

interface ScoredSupplementItem extends SupplementLibraryItem {
  scoreResult: RelevanceScoreResult;
}

interface DynamicSupplementGroups {
  essentials: ScoredSupplementItem[];
  optimizers: ScoredSupplementItem[];
  niche: ScoredSupplementItem[];
  all: ScoredSupplementItem[];
  isLoading: boolean;
}

export function useDynamicallySortedSupplements(): DynamicSupplementGroups {
  const { data: library = [], isLoading } = useSupplementLibrary();
  const { context } = useUserRelevanceContext();

  return useMemo(() => {
    const result: DynamicSupplementGroups = {
      essentials: [],
      optimizers: [],
      niche: [],
      all: [],
      isLoading,
    };

    if (!library.length || !context) return result;

    // 1. Score fuer jedes Item berechnen
    const scoredItems = library.map((item) => {
      // Marker-Erkennung via Name-Pattern
      const markers: SupplementMarkers = {
        isNaturalTestoBooster: isNaturalTestoBooster(item.name),
        isBCAA: isBCAA(item.name),
        isEAA: isEAA(item.name),
      };

      const scoreResult = calculateRelevanceScore(
        item.impact_score ?? 5.0,
        item.relevance_matrix,
        context,
        markers
      );

      return { ...item, scoreResult };
    });

    // 2. Sortieren nach finalScore (absteigend)
    scoredItems.sort((a, b) => b.scoreResult.score - a.scoreResult.score);

    // 3. Dynamisch in Tiers gruppieren
    for (const item of scoredItems) {
      const tier = item.scoreResult.dynamicTier;
      if (tier === 'essential') {
        result.essentials.push(item);
      } else if (tier === 'optimizer') {
        result.optimizers.push(item);
      } else {
        result.niche.push(item);
      }
    }

    result.all = scoredItems;
    return result;
  }, [library, context, isLoading]);
}

// Helper: Erkennt Natural T-Booster
function isNaturalTestoBooster(name: string): boolean {
  const patterns = ['tongkat', 'fadogia', 'tribulus', 'fenugreek', 'ashwagandha', 'testofen'];
  const normalized = name.toLowerCase();
  return patterns.some(p => normalized.includes(p));
}

// Helper: Erkennt BCAAs
function isBCAA(name: string): boolean {
  const normalized = name.toLowerCase();
  return normalized.includes('bcaa') && !normalized.includes('eaa');
}

// Helper: Erkennt EAAs
function isEAA(name: string): boolean {
  const normalized = name.toLowerCase();
  return normalized.includes('eaa') || normalized.includes('essential amino');
}
```

### Phase 5: UI-Integration (SupplementInventory)

**Datei: `src/components/supplements/SupplementInventory.tsx`**

Aenderungen:
- Import von `useDynamicallySortedSupplements` statt direktem `useSupplementLibrary`
- Tier-State aendern zu dynamischem Typ ('essential' | 'optimizer' | 'niche')
- Tier-Auswahl rendert dynamisch gruppierte Items
- Tier-Counts basieren auf berechneten Scores
- Labels anpassen: "Essential (Must-Have)" | "Optimizer" | "Nische / Optional"

Neue Struktur:
```typescript
// Dynamische Tiers statt statischer
type DynamicTier = 'essential' | 'optimizer' | 'niche';

const DYNAMIC_TIER_CONFIG: Record<DynamicTier, TierConfig> = {
  essential: {
    label: 'Essential (Must-Have)',
    shortLabel: 'Essential',
    icon: '🚨',
    bgClass: 'bg-green-500/10',
    borderClass: 'border-green-500/30',
    textClass: 'text-green-600 dark:text-green-400',
    description: 'Basierend auf deinem Profil unverzichtbar',
  },
  optimizer: {
    label: 'Optimizer',
    shortLabel: 'Optimizer',
    icon: '🎯',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30',
    textClass: 'text-blue-600 dark:text-blue-400',
    description: 'Starke Empfehlungen fuer dein Ziel',
  },
  niche: {
    label: 'Optional / Nische',
    shortLabel: 'Nische',
    icon: '💭',
    bgClass: 'bg-muted/50',
    borderClass: 'border-border',
    textClass: 'text-muted-foreground',
    description: 'Situativ oder fuer Spezialisten',
  },
};
```

### Phase 6: SupplementToggleRow Score-Badge

**Datei: `src/components/supplements/SupplementToggleRow.tsx`**

Aenderungen:
- Wenn `scoreResult` vorhanden, Score-Badge mit dynamischem Tier anzeigen
- Visuelles Feedback wenn dynamisches Tier vom DB-Tier abweicht
- Tooltip mit Score-Reasons

## Datei-Uebersicht

| Datei | Aenderungstyp | Beschreibung |
|-------|---------------|--------------|
| `src/lib/calculateRelevanceScore.ts` | MODIFY | getDynamicTier(), erweiterte Signatur, neue Modifikatoren |
| `src/types/relevanceMatrix.ts` | MODIFY | SupplementMarkers, erweitertes Result, dailyProteinPerKg |
| `src/hooks/useUserRelevanceContext.ts` | MODIFY | dailyProteinPerKg hinzufuegen |
| `src/hooks/useDynamicallySortedSupplements.ts` | CREATE | Neuer Hook fuer dynamische Gruppierung |
| `src/components/supplements/SupplementInventory.tsx` | MODIFY | Dynamische Tier-Logik, neuer Hook |
| `src/components/supplements/SupplementToggleRow.tsx` | MODIFY | Score-Badge mit dynamischem Tier |

## Erwartetes Verhalten nach Implementation

### Tongkat Ali Beispiel:

| Profil | Base | Modifikatoren | Final Score | Dynamisches Tier |
|--------|------|---------------|-------------|------------------|
| True Natural, 40+ | 6.5 | +3.5 Natural, +1.0 Age | 10.0 | Essential |
| Enhanced (CJC/Ipa) | 6.5 | -2.0 GH-Peptid | 4.5 | Niche |
| TRT (Clinical) | 6.5 | -4.0 TRT | 2.5 | Niche |

### BCAAs vs EAAs Beispiel:

| Supplement | Base | High Protein Penalty | Final bei >2g/kg |
|------------|------|---------------------|------------------|
| BCAAs | 6.0 | -1.5 | 4.5 (Niche) |
| EAAs | 7.5 | 0.0 | 7.5+ (Optimizer) |

### UI-Erlebnis:

1. User oeffnet Supplement-Inventar
2. System berechnet Scores fuer alle ~120 Items (gecached via useMemo)
3. Items werden dynamisch in Essential/Optimizer/Nische gruppiert
4. User aendert Profil von "Natural" zu "Enhanced"
5. Tongkat Ali "faellt" von Essential nach Nische
6. EAAs bleiben stabil im Optimizer-Tier

## Performance-Optimierungen

- Score-Berechnung: O(n) fuer ~120 Items, gecached via useMemo
- Re-Calculation nur bei Context-Aenderung (Phase, Mode, Peptide)
- Kein zusaetzlicher Netzwerk-Traffic (Client-seitige Berechnung)
- React Query cacht UserRelevanceContext fuer 5 Minuten
