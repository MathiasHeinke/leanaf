

# ARES Dynamic Deficit System: Prozent + Hard Cap

## Wissenschaftliche Grundlage

Die fixen kcal-Werte werden ersetzt durch ein **Dual-Cap-System**, das individueller und wissenschaftlich präziser ist:

| Modus | Max % vom TDEE | Hard Cap (kcal) | Protein |
|-------|----------------|-----------------|---------|
| Natural | 20% | 600 kcal | 2.0 g/kg |
| Enhanced | 30% | 900 kcal | 2.2 g/kg |
| Clinical | 40% | 1200 kcal | 2.5 g/kg |
| Enhanced+Clinical | 45% | 1400 kcal | 2.5 g/kg |

**Formel:**
```text
effektivesMaxDefizit = min(TDEE × maxProzent, hardCapKcal)
```

---

## Technische Änderungen

### Datei 1: `src/utils/protocolAdjustments.ts`

**Neue Interface-Felder:**
```typescript
export interface ProtocolAdjustments {
  // NEU: Prozent-basiertes Limit
  maxDeficitPercent: number;   // z.B. 0.20 für 20%
  maxDeficitKcal: number;      // Hard Cap
  
  // Bestehend
  realismMultiplier: number;
  proteinBoost: number;
  proteinPerKg: number;        // NEU: Absolute Empfehlung
  hint: string;
  hasPharmSupport: boolean;
}
```

**Neue Werte pro Modus:**
```typescript
// Natural (default)
{
  maxDeficitPercent: 0.20,     // Max 20% vom TDEE
  maxDeficitKcal: 600,         // Hard Cap
  realismMultiplier: 1.0,
  proteinBoost: 0,
  proteinPerKg: 2.0,
  hint: 'Natural: Max 20% Defizit empfohlen',
  hasPharmSupport: false,
}

// Enhanced (GLP-1/Reta)
{
  maxDeficitPercent: 0.30,     // Max 30%
  maxDeficitKcal: 900,
  realismMultiplier: 1.25,
  proteinBoost: 0.2,
  proteinPerKg: 2.2,
  hint: 'GLP-1: Bis 30% Defizit sicher möglich',
  hasPharmSupport: true,
}

// Clinical (TRT)
{
  maxDeficitPercent: 0.40,     // Max 40%
  maxDeficitKcal: 1200,
  realismMultiplier: 1.3,
  proteinBoost: 0.3,
  proteinPerKg: 2.5,
  hint: 'TRT: Muskelschutz erlaubt aggressives Defizit',
  hasPharmSupport: true,
}

// Enhanced + Clinical (Kombination)
{
  maxDeficitPercent: 0.45,     // Max 45%
  maxDeficitKcal: 1400,
  realismMultiplier: 1.5,
  proteinBoost: 0.5,
  proteinPerKg: 2.5,
  hint: 'Reta + TRT: Maximale Rekomposition möglich',
  hasPharmSupport: true,
}
```

**Neue Helper-Funktion:**
```typescript
/**
 * Calculate the effective max deficit using the dual-cap system
 * Takes the minimum of percentage-based and hard cap limits
 */
export function calculateEffectiveMaxDeficit(
  tdee: number,
  adjustments: ProtocolAdjustments
): number {
  const percentBasedLimit = Math.round(tdee * adjustments.maxDeficitPercent);
  return Math.min(percentBasedLimit, adjustments.maxDeficitKcal);
}
```

---

### Datei 2: `src/components/profile/GoalConfigurator.tsx`

**Props erweitern:**
```typescript
interface GoalConfiguratorProps {
  // ... bestehend ...
  tdee?: number;  // Bereits vorhanden!
  protocolModes?: ProtocolMode[];
}
```

**Effektives Max-Defizit berechnen:**
```typescript
// Protocol-aware adjustments
const protocolAdjustments = useMemo(() => {
  return getProtocolAdjustments(protocolModes);
}, [protocolModes]);

// NEU: Dynamisches Max-Defizit basierend auf TDEE
const effectiveMaxDeficit = useMemo(() => {
  return calculateEffectiveMaxDeficit(tdee, protocolAdjustments);
}, [tdee, protocolAdjustments]);
```

**UI: Welches Limit greift anzeigen:**
```typescript
{computedGoal === 'lose' && isDeficitExceeded(weeklyStats.dailyCalorieChange, effectiveMaxDeficit) && (
  <div className="flex items-center justify-center gap-1 text-[10px] text-red-500 mt-1">
    <AlertTriangle className="h-3 w-3" />
    <span>
      Max: {effectiveMaxDeficit} kcal 
      ({Math.round(protocolAdjustments.maxDeficitPercent * 100)}% von TDEE)
    </span>
  </div>
)}
```

**Zusätzliche Info für User:**
```typescript
{/* Dynamische Protein-Empfehlung basierend auf Modus */}
{protocolAdjustments.hasPharmSupport && (
  <div className="text-xs text-center mt-2 flex items-center justify-center gap-2">
    <Flame className="h-3 w-3 text-purple-500" />
    <span className="text-purple-500">{protocolAdjustments.hint}</span>
    <span className="text-muted-foreground">
      • Protein: {protocolAdjustments.proteinPerKg}g/kg
    </span>
  </div>
)}
```

---

### Datei 3: `src/pages/Profile.tsx`

**TDEE an GoalConfigurator übergeben (bereits vorhanden, prüfen):**
```typescript
<GoalConfigurator
  currentWeight={parseFloat(weight) || 80}
  weightDelta={weightDelta}
  setWeightDelta={setWeightDelta}
  muscleGoal={muscleGoal}
  setMuscleGoal={setMuscleGoal}
  protocolTempo={protocolTempo}
  setProtocolTempo={setProtocolTempo}
  tdee={calculateMaintenanceCalories()}  // TDEE übergeben
  protocolModes={protocolModes}           // Protocol Modes übergeben
/>
```

**Protein Boost mit absolutem Wert anpassen:**
```typescript
// Zeige absolute Protein-Empfehlung
const recommendedProtein = useMemo(() => {
  const weightNum = parseFloat(weight) || 80;
  return Math.round(weightNum * protocolAdjustments.proteinPerKg);
}, [weight, protocolAdjustments]);
```

---

## Beispielrechnungen

### Mann, 100kg, TDEE 3000 kcal

| Modus | % Limit | Hard Cap | Effektiv | Protein |
|-------|---------|----------|----------|---------|
| Natural | 3000×20%=600 | 600 | **600** kcal | 200g |
| Enhanced | 3000×30%=900 | 900 | **900** kcal | 220g |
| Clinical | 3000×40%=1200 | 1200 | **1200** kcal | 250g |
| Kombi | 3000×45%=1350 | 1400 | **1350** kcal | 250g |

### Frau, 60kg, TDEE 1800 kcal

| Modus | % Limit | Hard Cap | Effektiv | Protein |
|-------|---------|----------|----------|---------|
| Natural | 1800×20%=360 | 600 | **360** kcal | 120g |
| Enhanced | 1800×30%=540 | 900 | **540** kcal | 132g |
| Clinical | 1800×40%=720 | 1200 | **720** kcal | 150g |

Die **Prozent-Limits schützen kleinere Menschen** vor zu aggressiven Defiziten!

---

## Betroffene Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/utils/protocolAdjustments.ts` | EDIT | Neue Felder + `calculateEffectiveMaxDeficit()` |
| `src/components/profile/GoalConfigurator.tsx` | EDIT | Dynamisches Limit + erweiterte Anzeige |
| `src/pages/Profile.tsx` | EDIT | TDEE-Übergabe prüfen, Protein-Display |

---

## Ergebnis

Das System erkennt jetzt:
1. **Körpergröße/TDEE** des Users (Prozent-basiert)
2. **Protocol Mode** (Natural/Enhanced/Clinical)
3. **Beides kombiniert** für das optimale sichere Defizit

Ein 60kg Natural-User bekommt nie mehr als 360 kcal Defizit empfohlen (20% von 1800), während ein 100kg Clinical-User bis zu 1200 kcal gehen kann.

