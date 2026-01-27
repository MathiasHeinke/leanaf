

# Cleanup: Protein Anchor System Vollintegration

## Zusammenfassung

Die Protein-Anchor Logik ist implementiert, aber es gibt **Legacy-Code der parallel läuft** und potentiell die neuen Berechnungen überschreibt oder ignoriert.

## Gefundene Probleme

### Problem 1: Doppelte State-Logik in Profile.tsx

**Zeile 92-94:** Alte Percentage-States existieren noch:
```typescript
const [proteinPercentage, setProteinPercentage] = useState(30);
const [carbsPercentage, setCarbsPercentage] = useState(40);
const [fatsPercentage, setFatsPercentage] = useState(30);
```

**Zeile 121-135:** Alter `useEffect` überschreibt Werte bei `high_protein/balanced/low_carb`:
```typescript
useEffect(() => {
  if (macroStrategy === 'high_protein') {
    setProteinPercentage(40); // ← ÜBERSCHREIBT!
    // ...
  }
}, [macroStrategy]);
```

**Zeile 699-701:** Zeigt alte Percentage-Berechnung statt `currentMacros`:
```typescript
const proteinGrams = targetCalories ? (targetCalories * proteinPercentage / 100) / 4 : 0;
```

### Problem 2: Backend ignoriert neue Strategien

**`supabase/functions/evaluate-meal/index.ts` Zeile 175-185:**
```typescript
if (profile.macro_strategy === 'high_protein') { ... }
else if (profile.macro_strategy === 'low_carb') { ... }
// 'rookie', 'warrior', 'elite' → NICHT ERKANNT!
```

**`getGoalContext()` Zeile 479-482:**
```typescript
const strategyText = macroStrategy === 'high_protein' ? 'High-Protein' 
  : macroStrategy === 'low_carb' ? 'Low-Carb' : 'Standard';
// → 'warrior' wird als 'Standard' angezeigt!
```

### Problem 3: Alte applyMacroStrategy() Funktion noch vorhanden

**Zeile 484-505:** Diese Funktion nutzt feste Prozentsätze und ist veraltet.

---

## Lösungsplan

### Phase 1: Profile.tsx Cleanup

**1.1 Alte Percentage-States entfernen:**
```typescript
// LÖSCHEN (Zeile 92-94):
// const [proteinPercentage, setProteinPercentage] = useState(30);
// const [carbsPercentage, setCarbsPercentage] = useState(40);
// const [fatsPercentage, setFatsPercentage] = useState(30);
```

**1.2 Alten useEffect entfernen (Zeile 121-135):**
```typescript
// LÖSCHEN: Der alte useEffect der high_protein/balanced/low_carb mappt
```

**1.3 applyMacroStrategy() entfernen (Zeile 484-505):**
```typescript
// LÖSCHEN: Wird nicht mehr benötigt
```

**1.4 Gram-Berechnung auf currentMacros umstellen (Zeile 699-701):**
```typescript
// VORHER:
const proteinGrams = targetCalories ? (targetCalories * proteinPercentage / 100) / 4 : 0;
const carbsGrams = targetCalories ? (targetCalories * carbsPercentage / 100) / 4 : 0;
const fatsGrams = targetCalories ? (targetCalories * fatsPercentage / 100) / 9 : 0;

// NACHHER: Nutze die bereits berechneten Werte aus dem Protein Anchor System
// (currentMacros ist bereits via useMemo definiert - Zeile 456-461)
```

**1.5 Default-Strategie auf 'warrior' setzen:**
```typescript
// Zeile 73: Ändere von 'high_protein' zu 'warrior'
const [macroStrategy, setMacroStrategy] = useState('warrior');

// Zeile 258: Ändere Fallback ebenfalls
setMacroStrategy('warrior');
```

### Phase 2: Backend Update (evaluate-meal)

**2.1 Protein-Anchor Mapping hinzufügen:**

Neue Helper-Funktion am Anfang der Datei:
```typescript
function mapToProteinAnchorIntensity(strategy: string): 'rookie' | 'warrior' | 'elite' {
  if (['rookie', 'warrior', 'elite'].includes(strategy)) {
    return strategy as 'rookie' | 'warrior' | 'elite';
  }
  // Legacy mapping
  if (strategy === 'high_protein' || strategy === 'zone_balanced') return 'warrior';
  if (strategy === 'low_carb' || strategy === 'keto') return 'elite';
  return 'warrior'; // Safe default
}
```

**2.2 Macro-Evaluation Logik updaten (Zeile 174-185):**
```typescript
// NACHHER:
const intensity = mapToProteinAnchorIntensity(profile.macro_strategy);
// Protein check based on intensity level
const minProteinRatio = intensity === 'elite' ? 0.9 : intensity === 'warrior' ? 0.85 : 0.7;
if (proteinRatio < minProteinRatio) {
  score -= 3;
  feedback = `Mehr Protein für deine ${intensity.toUpperCase()}-Intensität.`;
}
```

**2.3 getGoalContext() updaten (Zeile 479-482):**
```typescript
function getGoalContext(goal: string, macroStrategy: string): string {
  const goalText = goal === 'lose' ? 'Abnehmen' : goal === 'gain' ? 'Zunehmen/Muskelaufbau' : 'Gewicht halten';
  
  // Map to Protein Anchor System
  const intensity = mapToProteinAnchorIntensity(macroStrategy);
  const intensityLabels = {
    rookie: 'ROOKIE (1.2g/kg Protein)',
    warrior: 'WARRIOR (2.0g/kg Protein)', 
    elite: 'ELITE (2.5g/kg Protein)'
  };
  
  return `User-Ziel: ${goalText}, Protokoll-Intensität: ${intensityLabels[intensity]}.`;
}
```

---

## Technische Details

### Dateien und Änderungen

| Datei | Aktion | Details |
|-------|--------|---------|
| `src/pages/Profile.tsx` | CLEANUP | Alte percentage states + useEffect + applyMacroStrategy entfernen |
| `src/pages/Profile.tsx` | UPDATE | Default 'warrior', Gramm-Berechnung via currentMacros |
| `supabase/functions/evaluate-meal/index.ts` | UPDATE | mapToProteinAnchorIntensity() + Logik-Anpassung |

### Risiko-Check

**Gering:** Alle Änderungen sind rückwärtskompatibel durch `mapLegacyStrategy()` und `mapToProteinAnchorIntensity()`. Bestehende User mit 'high_protein' werden automatisch auf 'warrior' gemappt.

### Migration bestehender User

Keine DB-Migration nötig. Das Mapping passiert zur Laufzeit:
- `high_protein` → `warrior`
- `low_carb`, `keto` → `elite`
- Alles andere → `warrior` (sicherer Default)

---

## Erwartetes Ergebnis

Nach dem Cleanup:
1. **Profile.tsx:** Nur noch EIN System (Protein Anchor) aktiv
2. **evaluate-meal:** Versteht 'rookie', 'warrior', 'elite' korrekt
3. **Keine Konflikte** zwischen altem und neuem Code
4. **Konsistente Makro-Berechnung** überall basierend auf g/kg

