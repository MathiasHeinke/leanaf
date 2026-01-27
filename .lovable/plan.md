
# Protocol Mode Integration: Berechnung mit Enhanced/Clinical

## Zusammenfassung

Die ausgewählten Protocol Modes (Natural, Enhanced, Clinical) werden aktuell gespeichert, haben aber **keinen Einfluss** auf die Berechnungen. Diese Integration fügt drei präzise Anpassungen hinzu, ohne die Kern-TDEE-Physik zu verändern.

---

## Was wird geändert?

### 1. Neue Utility: `protocolAdjustments.ts`

Zentralisierte Logik für alle Protocol-Mode-abhängigen Faktoren:

```text
+---------------------+------------+------------+-------------+
| Protocol Mode       | Max Defizit| Realism    | Protein     |
|                     | (Hint)     | Multiplier | Boost       |
+---------------------+------------+------------+-------------+
| Natural             | 500 kcal   | 1.0x       | +0.0 g/kg   |
| Enhanced (Reta/GLP) | 750 kcal   | 1.25x      | +0.1 g/kg   |
| Clinical (TRT)      | 800 kcal   | 1.30x      | +0.2 g/kg   |
| Enhanced + Clinical | 1000 kcal  | 1.50x      | +0.3 g/kg   |
+---------------------+------------+------------+-------------+
```

**Wissenschaftliche Basis:**
- GLP-1/Reta erhöht Sättigung und schützt Muskelmasse bei höherem Defizit
- TRT maximiert Proteinsynthese (daher +0.2g/kg nutzbar)
- Kombination erlaubt aggressive Rekomposition ohne Muskelabbau

---

### 2. Protein Anchor Calculator Update

**Datei:** `src/utils/proteinAnchorCalculator.ts`

Neuer optionaler Parameter `proteinBoostPerKg`:

```typescript
export function calculateProteinAnchorMacros(
  intensity: ProtocolIntensity,
  weightKg: number,
  targetCalories: number,
  proteinBoostPerKg: number = 0  // NEU
): MacroResult {
  // Base: 2.0g/kg (Warrior)
  // + Boost: 0.2g/kg (TRT)
  // = Effektiv: 2.2g/kg
  let proteinGrams = Math.round(
    safeWeight * (PROTEIN_PER_KG[intensity] + proteinBoostPerKg)
  );
  // ... Rest bleibt identisch
}
```

---

### 3. Profile.tsx Integration

**Datei:** `src/pages/Profile.tsx`

#### A) Import und Berechnung der Adjustments

```typescript
import { getProtocolAdjustments } from '@/utils/protocolAdjustments';

// In der Komponente:
const protocolAdjustments = useMemo(() => {
  return getProtocolAdjustments(protocolModes);
}, [protocolModes]);
```

#### B) Protein Boost anwenden (Zeile ~523-527)

```typescript
const currentMacros = useMemo(() => {
  const weightNum = parseFloat(weight) || 80;
  const calories = calculateTargetCalories() || 2000;
  // NEU: Protein Boost aus Protocol Mode
  return calculateProteinAnchorMacros(
    currentIntensity, 
    weightNum, 
    calories, 
    protocolAdjustments.proteinBoost
  );
}, [weight, currentIntensity, protocolAdjustments]);
```

#### C) Realism Score mit Multiplier (Zeile ~497-508)

```typescript
const calculateRealismScore = () => {
  if (!weight || weightDelta === 0) return 100;
  
  const baseScore = calculateRealismScoreFromUtils({
    currentWeight: parseFloat(weight),
    targetWeight: computedTargetWeight,
    targetDate: computedTargetDate,
    protocolTempo,
  });
  
  // NEU: Protocol Mode erhöht Erfolgswahrscheinlichkeit
  return Math.min(100, Math.round(baseScore * protocolAdjustments.realismMultiplier));
};
```

#### D) UI Badge für Protein Boost

Kleine visuelle Anzeige wenn Boost aktiv:

```typescript
{protocolAdjustments.proteinBoost > 0 && (
  <Badge variant="outline" className="text-xs text-purple-500">
    +{(protocolAdjustments.proteinBoost * (parseFloat(weight) || 80)).toFixed(0)}g TRT Boost
  </Badge>
)}
```

---

### 4. GoalConfigurator Smart Feedback

**Datei:** `src/components/profile/GoalConfigurator.tsx`

#### A) Props erweitern

```typescript
interface GoalConfiguratorProps {
  // ... bestehende props ...
  protocolModes?: ProtocolMode[];  // NEU
}
```

#### B) Defizit-Ampel-Logik

```typescript
const protocolAdjustments = getProtocolAdjustments(protocolModes || ['natural']);

// Farbe basierend auf Protocol Mode
const getDeficitColor = (deficit: number) => {
  if (deficit <= protocolAdjustments.maxDeficitKcal * 0.7) return 'text-green-500';
  if (deficit <= protocolAdjustments.maxDeficitKcal) return 'text-amber-500';
  return 'text-red-500';
};

// Warnung nur anzeigen wenn Limit überschritten
const showDeficitWarning = weeklyStats.dailyCalorieChange > protocolAdjustments.maxDeficitKcal;
```

#### C) UI Update in Stats-Bereich

```typescript
<div className="bg-muted/50 rounded-lg p-2 text-center">
  <div className={cn("text-sm font-bold", getDeficitColor(weeklyStats.dailyCalorieChange))}>
    {computedGoal === 'lose' ? '-' : '+'}{weeklyStats.dailyCalorieChange} kcal/Tag
  </div>
  {showDeficitWarning && (
    <div className="text-[10px] text-red-500 mt-1">
      Max empfohlen: {protocolAdjustments.maxDeficitKcal} kcal
    </div>
  )}
</div>
```

---

## Betroffene Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/utils/protocolAdjustments.ts` | NEU | Zentralisierte Protocol-Logik |
| `src/utils/proteinAnchorCalculator.ts` | EDIT | Optionaler proteinBoostPerKg Parameter |
| `src/pages/Profile.tsx` | EDIT | Integration aller 3 Anpassungen |
| `src/components/profile/GoalConfigurator.tsx` | EDIT | Smart Deficit Feedback |

---

## Erwartetes Ergebnis

**Beispiel: User mit Reta + TRT, 100kg Körpergewicht**

| Berechnung | Natural | Enhanced+Clinical |
|------------|---------|-------------------|
| Protein (Warrior 2.0g/kg) | 200g | 230g (+30g Boost) |
| Max Defizit "grün" | 500 kcal | 1000 kcal |
| Realism Score bei 800kcal Defizit | ~50% (rot) | ~75% (grün) |
| UI Feedback | Warnung | Alles ok |

**Keine Änderungen an:**
- TDEE-Berechnung (Physik bleibt Physik)
- BMR-Formel
- Aktivitäts-Multiplikatoren
- Datenbank-Schema (keine Migration nötig)

