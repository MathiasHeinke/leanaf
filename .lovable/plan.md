
# Makronaehrstoff-Strategie: Protein-Anchor Refactor

## Problem-Zusammenfassung

Die aktuelle Makro-Strategie-Auswahl verwendet **Prozentsaetze** (P:45/C:30/F:25), die bei niedrigen Kalorienzahlen (z.B. unter GLP-1/Retatrutide) zu gefaehrlich niedrigem Protein fuehren koennen:

- 30% Protein bei 3000 kcal = 225g (gut)
- 30% Protein bei 1200 kcal = 90g (zu wenig fuer 80kg Athlet)

Zusaetzlich: Bei zu wenig Kohlenhydraten ("Keto" bei Reta) kommt es zu Kopfschmerzen durch Unterzuckerung/Elektrolyt-Imbalance.

---

## Loesung: Protein-Anchor System

Wir ersetzen die 9 verwirrenden Prozent-Presets durch **3 klare Stufen** basierend auf **g/kg Koerpergewicht**:

| Stufe | Name | Protein g/kg | Zielgruppe |
|-------|------|--------------|------------|
| 1 | **ROOKIE** | 1.2 - 1.5 g/kg | Startphase, Magen-Gewoehnung |
| 2 | **WARRIOR** | 2.0 g/kg | Aktives Protokoll (Reta/Sema), Rekomposition |
| 3 | **ELITE** | 2.5 g/kg | Fortgeschrittene, aggressive Trockenlegung |

### Der "Kopfschmerz-Fix": Carb Floor

Fuer WARRIOR und ELITE bauen wir eine Sicherheitslogik ein:

```text
Schritt 1: Protein berechnen (z.B. 90kg x 2.0g = 180g = 720 kcal)
Schritt 2: Vom Kalorienziel abziehen (2000 - 720 = 1280 kcal Rest)
Schritt 3: CARB FLOOR garantieren (min. 120g = 480 kcal fuer Gehirn)
Schritt 4: Rest = Fett (1280 - 480 = 800 kcal = ~89g Fett)
```

---

## Technische Umsetzung

### Datei 1: Neue Helper-Funktion `src/utils/proteinAnchorCalculator.ts`

Neue Datei mit der Berechnungslogik:

```typescript
export type ProtocolIntensity = 'rookie' | 'warrior' | 'elite';

interface MacroResult {
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  proteinPercent: number;
  carbPercent: number;
  fatPercent: number;
  warnings: string[];
}

const PROTEIN_PER_KG: Record<ProtocolIntensity, number> = {
  rookie: 1.2,
  warrior: 2.0,
  elite: 2.5,
};

const CARB_FLOOR_GRAMS = 120; // Minimum fuer Gehirnfunktion
const MIN_FAT_PER_KG = 0.6;   // Minimum fuer Hormone

export function calculateProteinAnchorMacros(
  intensity: ProtocolIntensity,
  weightKg: number,
  targetCalories: number
): MacroResult {
  const warnings: string[] = [];
  
  // 1. Protein-Anchor (fix basierend auf Gewicht)
  let proteinGrams = Math.round(weightKg * PROTEIN_PER_KG[intensity]);
  const proteinCalories = proteinGrams * 4;
  
  // 2. Sicherheitscheck: Protein darf nicht > 50% der Kalorien sein
  if (proteinCalories > targetCalories * 0.5) {
    proteinGrams = Math.round((targetCalories * 0.5) / 4);
    warnings.push('Protein wurde begrenzt - Kalorienziel zu niedrig');
  }
  
  let remainingCalories = targetCalories - (proteinGrams * 4);
  
  // 3. Carb Floor (Kopfschmerz-Prevention)
  let carbGrams: number;
  if (intensity === 'warrior' || intensity === 'elite') {
    carbGrams = Math.max(CARB_FLOOR_GRAMS, Math.round(remainingCalories * 0.4 / 4));
  } else {
    // Rookie: 50/50 Split
    carbGrams = Math.round(remainingCalories * 0.5 / 4);
  }
  
  const carbCalories = carbGrams * 4;
  remainingCalories -= carbCalories;
  
  // 4. Rest = Fett
  let fatGrams = Math.round(remainingCalories / 9);
  
  // 5. Minimum Fett fuer Hormone
  const minFat = Math.round(weightKg * MIN_FAT_PER_KG);
  if (fatGrams < minFat) {
    fatGrams = minFat;
    // Carbs reduzieren um Platz zu machen
    carbGrams = Math.round((targetCalories - proteinGrams * 4 - fatGrams * 9) / 4);
    warnings.push('Fett wurde erhoeht fuer Hormonbalance');
  }
  
  // Prozentsaetze berechnen (fuer DB-Kompatibilitaet)
  const total = proteinGrams * 4 + carbGrams * 4 + fatGrams * 9;
  
  return {
    proteinGrams,
    carbGrams,
    fatGrams,
    proteinPercent: Math.round((proteinGrams * 4 / total) * 100),
    carbPercent: Math.round((carbGrams * 4 / total) * 100),
    fatPercent: Math.round((fatGrams * 9 / total) * 100),
    warnings
  };
}
```

### Datei 2: Refactor UI `src/pages/Profile.tsx`

**Zeile 1000-1155:** Komplett ersetzen mit 3 Kacheln:

```tsx
{/* Makronaehrstoff-Strategie: Protein Anchor System */}
<div className="space-y-4">
  <div className="flex items-center gap-3 mb-4">
    <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center">
      <PieChart className="h-5 w-5 text-white" />
    </div>
    <h2 className="text-lg md:text-xl font-bold">Protokoll-Intensitaet</h2>
  </div>

  <Card>
    <CardContent className="pt-5">
      <div className="grid grid-cols-1 gap-3">
        {/* ROOKIE */}
        <div 
          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
            macroStrategy === 'rookie' 
              ? 'border-emerald-500 bg-emerald-500/10' 
              : 'border-border hover:border-emerald-500/50'
          }`}
          onClick={() => handleIntensityChange('rookie')}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌱</span>
            <div className="flex-1">
              <div className="font-bold text-base">ROOKIE</div>
              <div className="text-sm text-muted-foreground">1.2g/kg Protein</div>
              <div className="text-xs text-muted-foreground mt-1">
                Startphase. Magen an Protein gewoehnen.
              </div>
            </div>
            {macroStrategy === 'rookie' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
          </div>
        </div>

        {/* WARRIOR (Recommended) */}
        <div 
          className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative ${
            macroStrategy === 'warrior' 
              ? 'border-amber-500 bg-amber-500/10' 
              : 'border-border hover:border-amber-500/50'
          }`}
          onClick={() => handleIntensityChange('warrior')}
        >
          <Badge className="absolute -top-2 right-3 bg-amber-500">Empfohlen bei Reta</Badge>
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <div className="flex-1">
              <div className="font-bold text-base">WARRIOR</div>
              <div className="text-sm text-muted-foreground">2.0g/kg Protein</div>
              <div className="text-xs text-muted-foreground mt-1">
                Rekomposition. Maximaler Muskelschutz + stabiler Blutzucker.
              </div>
            </div>
            {macroStrategy === 'warrior' && <CheckCircle className="h-5 w-5 text-amber-500" />}
          </div>
        </div>

        {/* ELITE */}
        <div 
          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
            macroStrategy === 'elite' 
              ? 'border-purple-500 bg-purple-500/10' 
              : 'border-border hover:border-purple-500/50'
          }`}
          onClick={() => handleIntensityChange('elite')}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div className="flex-1">
              <div className="font-bold text-base">ELITE</div>
              <div className="text-sm text-muted-foreground">2.5g/kg Protein</div>
              <div className="text-xs text-muted-foreground mt-1">
                Profi-Defizit. Aggressive Trockenlegung.
              </div>
            </div>
            {macroStrategy === 'elite' && <CheckCircle className="h-5 w-5 text-purple-500" />}
          </div>
        </div>
      </div>

      {/* Live-Berechnung anzeigen */}
      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <div className="text-sm font-medium mb-2">Deine Makros ({weight}kg):</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-emerald-500">{currentMacros.proteinGrams}g</div>
            <div className="text-xs text-muted-foreground">Protein</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-500">{currentMacros.carbGrams}g</div>
            <div className="text-xs text-muted-foreground">Carbs</div>
          </div>
          <div>
            <div className="text-lg font-bold text-amber-500">{currentMacros.fatGrams}g</div>
            <div className="text-xs text-muted-foreground">Fett</div>
          </div>
        </div>
        {currentMacros.warnings.length > 0 && (
          <div className="mt-2 text-xs text-orange-500 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {currentMacros.warnings[0]}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
</div>
```

### Datei 3: Handler-Funktion hinzufuegen

In `Profile.tsx` vor dem return:

```typescript
// Import hinzufuegen am Anfang:
import { calculateProteinAnchorMacros, ProtocolIntensity } from '@/utils/proteinAnchorCalculator';

// Neuer State fuer berechnete Makros
const currentMacros = useMemo(() => {
  const weightNum = parseFloat(weight) || 80;
  const calories = calculateTargetCalories() || 2000;
  const intensity = (macroStrategy as ProtocolIntensity) || 'warrior';
  
  // Fallback fuer alte Strategien
  if (!['rookie', 'warrior', 'elite'].includes(macroStrategy)) {
    return calculateProteinAnchorMacros('warrior', weightNum, calories);
  }
  
  return calculateProteinAnchorMacros(intensity, weightNum, calories);
}, [weight, macroStrategy, calculateTargetCalories]);

// Handler fuer Strategie-Wechsel
const handleIntensityChange = useCallback((intensity: ProtocolIntensity) => {
  setMacroStrategy(intensity);
  
  const weightNum = parseFloat(weight) || 80;
  const calories = calculateTargetCalories() || 2000;
  const result = calculateProteinAnchorMacros(intensity, weightNum, calories);
  
  // Update dailyGoals mit berechneten Prozentsaetzen (DB-Kompatibilitaet)
  setDailyGoals(prev => ({
    ...prev,
    protein: result.proteinPercent,
    carbs: result.carbPercent,
    fats: result.fatPercent
  }));
  
  setHasUserModifiedMacros(false);
}, [weight, calculateTargetCalories]);
```

### Datei 4: DB/Profile Migration (optional)

Die existierenden `macro_strategy` Werte in `profiles` werden automatisch auf 'warrior' gemappt wenn sie nicht 'rookie' oder 'elite' sind. Keine DB-Migration noetig.

---

## Dateien-Uebersicht

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/utils/proteinAnchorCalculator.ts` | NEU | Berechnungslogik mit Carb Floor |
| `src/pages/Profile.tsx` | EDIT | 3-Kacheln UI + Handler |

---

## Erwartetes Ergebnis

### Vorher
- 9 verwirrende Presets (Keto, Zone, High Carb, etc.)
- Prozentbasierte Berechnung die bei niedrigen Kalorien versagt
- Kopfschmerzen bei zu wenig Carbs unter GLP-1

### Nachher
- 3 klare Stufen: ROOKIE / WARRIOR / ELITE
- Protein wird in **Gramm pro kg** berechnet (biologisch korrekt)
- **Carb Floor** verhindert Unterzuckerung/Kopfschmerzen
- Live-Vorschau zeigt sofort die berechneten Makros
- "Empfohlen bei Reta" Badge fuer WARRIOR
- Warnings wenn Kalorienziel zu niedrig fuer Protein-Ziel

### Beispielrechnung (90kg, 1800 kcal, WARRIOR)
```text
Protein: 90kg x 2.0g = 180g (720 kcal)
Rest: 1800 - 720 = 1080 kcal
Carbs: min 120g Floor = 480 kcal
Fett: 1080 - 480 = 600 kcal = 67g

Ergebnis: P:180g / C:120g / F:67g
```

Dies ist biologisch korrekt und verhindert die Kopfschmerz-Problematik.
