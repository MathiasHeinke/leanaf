
# ARES Matrix-Scoring: Erweiterte Attribute

## Uebersicht der Erweiterungen

Die bestehende Matrix-Scoring-Engine wird um folgende Dimensionen erweitert:

| Kategorie | Neue Attribute | Datenquelle |
|-----------|---------------|-------------|
| Peptid-Klassen | 8 Klassen | `peptide_compounds.category` |
| Kalorischer Status | Defizit/Surplus | `profiles.weight` vs `target_weight` |
| Demografie | Alter, Geschlecht | `profiles.age`, `profiles.gender` |
| Erweiterte Ziele | Rekomposition | `profiles.goal_type` |

---

## 1. Peptid-Klassen-Modifikatoren

### Mapping der Peptid-Kategorien

Die aktiven Peptide des Users werden auf funktionale Klassen gemappt:

| Klasse | Peptide | Effekt auf Supplements |
|--------|---------|------------------------|
| `gh_secretagogue` | CJC-1295, Ipamorelin, Tesamorelin, MK-677 | +Schlaf, +Kollagen, +Recovery |
| `healing` | BPC-157, TB-500 | +Kollagen, +Glutamin, +Zinc |
| `longevity` | Epitalon, Thymalin, SS-31 | +NAD+, +Resveratrol, +Fisetin |
| `nootropic` | Semax, Selank, Dihexa | +Omega-3, +Cholin, +Magnesium |
| `metabolic` | Retatrutide, Tirzepatide, Semaglutide | +Elektrolyte, +Protein, +B-Vitamine |
| `immune` | Thymosin Alpha-1, LL-37 | +Vitamin D, +Zinc, +Quercetin |
| `testo` | Testosterone, Kisspeptin | -Natural Booster, +Lipid-Support |
| `skin` | GHK-Cu | +Kollagen, +Vitamin C |

### Implementierung

```typescript
// Neue Konstante in relevanceMatrix.ts
export const PEPTIDE_CATEGORIES = [
  'gh_secretagogue', 'healing', 'longevity', 'nootropic',
  'metabolic', 'immune', 'testo', 'skin'
] as const;

// Mapping von Peptid-Namen zu Kategorien
export const PEPTIDE_TO_CATEGORY: Record<string, string> = {
  // GH Secretagogues
  'cjc_1295': 'gh_secretagogue',
  'cjc-1295': 'gh_secretagogue',
  'ipamorelin': 'gh_secretagogue',
  'tesamorelin': 'gh_secretagogue',
  'mk_677': 'gh_secretagogue',
  'sermorelin': 'gh_secretagogue',
  
  // Healing
  'bpc_157': 'healing',
  'bpc-157': 'healing',
  'tb_500': 'healing',
  'tb-500': 'healing',
  
  // Metabolic (GLP-1 wird separat behandelt)
  'retatrutide': 'metabolic',
  'tirzepatide': 'metabolic',
  'semaglutide': 'metabolic',
  
  // usw...
};
```

---

## 2. Kalorischer Status (Defizit/Surplus)

### Berechnung

```typescript
// In useUserRelevanceContext.ts
function determineCalorieStatus(
  currentWeight: number | null,
  targetWeight: number | null,
  calorieDeficit: number | null
): 'deficit' | 'surplus' | 'maintenance' {
  // Primaer: Direktes Defizit-Feld
  if (calorieDeficit !== null) {
    if (calorieDeficit > 200) return 'deficit';
    if (calorieDeficit < -200) return 'surplus';
    return 'maintenance';
  }
  
  // Fallback: Gewichtsvergleich
  if (currentWeight && targetWeight) {
    const diff = currentWeight - targetWeight;
    if (diff > 2) return 'deficit';  // Will abnehmen
    if (diff < -2) return 'surplus'; // Will zunehmen
  }
  
  return 'maintenance';
}
```

### Matrix-Erweiterung

HMB bei Defizit: +3 (Muskelschutz kritisch)
HMB bei Surplus: -1 (weniger relevant)
Digestive Enzymes bei Surplus: +2 (mehr Nahrung = mehr Verdauungslast)

---

## 3. Demografische Faktoren

### Alter

| Altersgruppe | Flag | Auswirkung |
|--------------|------|------------|
| >= 40 | `age_over_40` | +Longevity, +Joint Support, +NAD+ |
| >= 50 | `age_over_50` | +Hormone Support, +Bone Health |
| >= 60 | `age_over_60` | +Cognitive, +Sarcopenia Prevention |

### Geschlecht

| Geschlecht | Flag | Auswirkung |
|------------|------|------------|
| `female` | `is_female` | +Iron (Menstruation), +Calcium, -Testosterone Boosters |
| `male` | `is_male` | +Zinc, +Prostate Support (>50) |

---

## 4. Erweiterte Matrix-Struktur

### Neue JSONB-Struktur

```json
{
  "phase_modifiers": { "0": 0, "1": 0, "2": 0, "3": 0 },
  
  "context_modifiers": {
    "true_natural": 0,
    "enhanced_no_trt": 0,
    "on_trt": 0,
    "on_glp1": 0
  },
  
  "goal_modifiers": {
    "fat_loss": 0,
    "muscle_gain": 0,
    "recomposition": 0,
    "longevity": 0,
    "maintenance": 0,
    "performance": 0
  },
  
  "calorie_modifiers": {
    "in_deficit": 0,
    "in_surplus": 0
  },
  
  "peptide_class_modifiers": {
    "gh_secretagogue": 0,
    "healing": 0,
    "longevity": 0,
    "nootropic": 0,
    "metabolic": 0,
    "immune": 0,
    "testo": 0,
    "skin": 0
  },
  
  "demographic_modifiers": {
    "age_over_40": 0,
    "age_over_50": 0,
    "age_over_60": 0,
    "is_female": 0,
    "is_male": 0
  },
  
  "bloodwork_triggers": {
    "cortisol_high": 0,
    "testosterone_low": 0,
    "dhea_low": 0,
    "hdl_low": 0,
    "ldl_high": 0,
    "triglycerides_high": 0,
    "apob_high": 0,
    "vitamin_d_low": 0,
    "b12_low": 0,
    "magnesium_low": 0,
    "ferritin_high": 0,
    "iron_low": 0,
    "glucose_high": 0,
    "hba1c_elevated": 0,
    "insulin_high": 0,
    "insulin_resistant": 0,
    "inflammation_high": 0,
    "homocysteine_high": 0,
    "thyroid_slow": 0,
    "thyroid_overactive": 0
  },
  
  "compound_synergies": {
    "retatrutide": 0,
    "tirzepatide": 0,
    "semaglutide": 0,
    "cjc_1295": 0,
    "ipamorelin": 0,
    "bpc_157": 0,
    "tb_500": 0
  }
}
```

---

## 5. Erweiterte UserRelevanceContext

```typescript
interface UserRelevanceContext {
  // Bestehende Flags
  isTrueNatural: boolean;
  isEnhancedNoTRT: boolean;
  isOnTRT: boolean;
  isOnGLP1: boolean;
  
  // NEU: Kalorischer Status
  isInDeficit: boolean;
  isInSurplus: boolean;
  
  // NEU: Demografische Flags
  ageOver40: boolean;
  ageOver50: boolean;
  ageOver60: boolean;
  isFemale: boolean;
  isMale: boolean;
  
  // NEU: Aktive Peptid-Klassen
  activePeptideClasses: string[];  // ['gh_secretagogue', 'healing', etc.]
  
  // Bestehende Felder
  phase: 0 | 1 | 2 | 3;
  protocolModes: string[];
  activePeptides: string[];
  goal: string;
  bloodworkFlags: string[];
}
```

---

## 6. Erweiterte Score-Berechnung

```typescript
// In calculateRelevanceScore.ts - Neue Schritte

// 7. Calorie Status Modifiers
if (context.isInDeficit && matrix.calorie_modifiers?.in_deficit) {
  const mod = matrix.calorie_modifiers.in_deficit;
  score += mod;
  if (mod > 0) reasons.push(`Defizit aktiv: +${mod}`);
}
if (context.isInSurplus && matrix.calorie_modifiers?.in_surplus) {
  const mod = matrix.calorie_modifiers.in_surplus;
  score += mod;
  if (mod > 0) reasons.push(`Aufbauphase: +${mod}`);
}

// 8. Peptide Class Modifiers
for (const peptideClass of context.activePeptideClasses) {
  const mod = matrix.peptide_class_modifiers?.[peptideClass];
  if (mod !== undefined && mod !== 0) {
    score += mod;
    const classLabel = getPeptideClassLabel(peptideClass);
    reasons.push(`${classLabel} Protokoll: +${mod}`);
  }
}

// 9. Demographic Modifiers
if (context.ageOver40 && matrix.demographic_modifiers?.age_over_40) {
  score += matrix.demographic_modifiers.age_over_40;
  reasons.push(`Alter 40+: +${matrix.demographic_modifiers.age_over_40}`);
}
if (context.ageOver50 && matrix.demographic_modifiers?.age_over_50) {
  score += matrix.demographic_modifiers.age_over_50;
  reasons.push(`Alter 50+: +${matrix.demographic_modifiers.age_over_50}`);
}
if (context.isFemale && matrix.demographic_modifiers?.is_female) {
  score += matrix.demographic_modifiers.is_female;
  reasons.push(`Weiblich: +${matrix.demographic_modifiers.is_female}`);
}
```

---

## 7. Beispiel-Matrizen mit allen Attributen

### HMB (Muskelschutz) - Komplett

```json
{
  "phase_modifiers": { "0": 2, "1": 0, "2": -1, "3": 0 },
  "context_modifiers": {
    "true_natural": 3,
    "enhanced_no_trt": 5,
    "on_trt": -4,
    "on_glp1": 2
  },
  "goal_modifiers": {
    "fat_loss": 2,
    "muscle_gain": 1,
    "recomposition": 2,
    "longevity": 0,
    "maintenance": 0
  },
  "calorie_modifiers": {
    "in_deficit": 3,
    "in_surplus": -1
  },
  "peptide_class_modifiers": {
    "metabolic": 3,
    "gh_secretagogue": 1,
    "testo": -3
  },
  "demographic_modifiers": {
    "age_over_40": 1,
    "age_over_50": 2
  },
  "bloodwork_triggers": {},
  "compound_synergies": {
    "retatrutide": 3,
    "tirzepatide": 2,
    "semaglutide": 2
  }
}
```

### NMN (Longevity) - Komplett

```json
{
  "phase_modifiers": { "0": 0, "1": 1, "2": 2, "3": 3 },
  "context_modifiers": {
    "true_natural": 0,
    "enhanced_no_trt": 0,
    "on_trt": 0,
    "on_glp1": 0
  },
  "goal_modifiers": {
    "longevity": 3,
    "maintenance": 1,
    "fat_loss": 0
  },
  "calorie_modifiers": {
    "in_deficit": 0,
    "in_surplus": 0
  },
  "peptide_class_modifiers": {
    "longevity": 2,
    "gh_secretagogue": 1
  },
  "demographic_modifiers": {
    "age_over_40": 2,
    "age_over_50": 3,
    "age_over_60": 4
  },
  "bloodwork_triggers": {
    "inflammation_high": 2,
    "glucose_high": 1
  },
  "compound_synergies": {}
}
```

### Eisen (Iron) - Komplett

```json
{
  "phase_modifiers": { "0": 0, "1": 0, "2": 0, "3": 0 },
  "context_modifiers": {},
  "goal_modifiers": {
    "fat_loss": 0,
    "muscle_gain": 1,
    "performance": 2
  },
  "calorie_modifiers": {
    "in_deficit": 1
  },
  "peptide_class_modifiers": {},
  "demographic_modifiers": {
    "is_female": 3,
    "is_male": -1
  },
  "bloodwork_triggers": {
    "iron_low": 4,
    "ferritin_high": -5
  },
  "compound_synergies": {}
}
```

---

## 8. CSV-Template fuer Matrix-Import

Alle 50+ Attribute als Spalten:

```
wirkstoff_name,phase_0,phase_1,phase_2,phase_3,true_natural,enhanced_no_trt,on_trt,on_glp1,fat_loss,muscle_gain,recomposition,longevity,maintenance,performance,in_deficit,in_surplus,gh_secretagogue,healing,longevity_class,nootropic,metabolic,immune,testo,skin,age_over_40,age_over_50,age_over_60,is_female,is_male,cortisol_high,testosterone_low,dhea_low,hdl_low,ldl_high,triglycerides_high,apob_high,vitamin_d_low,b12_low,magnesium_low,ferritin_high,iron_low,glucose_high,hba1c_elevated,insulin_high,insulin_resistant,inflammation_high,homocysteine_high,thyroid_slow,thyroid_overactive,retatrutide,tirzepatide,semaglutide,cjc_1295,ipamorelin,bpc_157,tb_500
```

---

## 9. Dateien zu aendern

### Typ-Erweiterungen
| Datei | Aenderung |
|-------|-----------|
| `src/types/relevanceMatrix.ts` | Erweiterte Matrix-Interfaces, neue Konstanten |

### Hook-Erweiterungen  
| Datei | Aenderung |
|-------|-----------|
| `src/hooks/useUserRelevanceContext.ts` | Demografie, Defizit, Peptid-Klassen laden |

### Score-Berechnung
| Datei | Aenderung |
|-------|-----------|
| `src/lib/calculateRelevanceScore.ts` | Neue Modifier-Kategorien verarbeiten |

### UI-Anpassungen
| Datei | Aenderung |
|-------|-----------|
| `src/components/supplements/RelevanceScorePopover.tsx` | Neue Labels fuer Demografie/Peptide |

---

## 10. Vollstaendige Attribut-Liste (50 Attribute)

### Phasen (4)
`phase_0`, `phase_1`, `phase_2`, `phase_3`

### Kontext (4)
`true_natural`, `enhanced_no_trt`, `on_trt`, `on_glp1`

### Ziele (6)
`fat_loss`, `muscle_gain`, `recomposition`, `longevity`, `maintenance`, `performance`

### Kalorien (2)
`in_deficit`, `in_surplus`

### Peptid-Klassen (8)
`gh_secretagogue`, `healing`, `longevity_class`, `nootropic`, `metabolic`, `immune`, `testo`, `skin`

### Demografie (5)
`age_over_40`, `age_over_50`, `age_over_60`, `is_female`, `is_male`

### Blutwerte (20)
`cortisol_high`, `testosterone_low`, `dhea_low`, `hdl_low`, `ldl_high`, `triglycerides_high`, `apob_high`, `vitamin_d_low`, `b12_low`, `magnesium_low`, `ferritin_high`, `iron_low`, `glucose_high`, `hba1c_elevated`, `insulin_high`, `insulin_resistant`, `inflammation_high`, `homocysteine_high`, `thyroid_slow`, `thyroid_overactive`

### Compound-Synergien (7)
`retatrutide`, `tirzepatide`, `semaglutide`, `cjc_1295`, `ipamorelin`, `bpc_157`, `tb_500`

**Gesamt: 56 Attribute pro Wirkstoff**

---

## 11. Aufwand

| Task | Zeit |
|------|------|
| Typ-Erweiterung (relevanceMatrix.ts) | 20 min |
| Hook-Erweiterung (useUserRelevanceContext.ts) | 45 min |
| Score-Berechnung erweitern | 30 min |
| UI Labels aktualisieren | 15 min |
| Testing | 30 min |

**Gesamt: ~2.5 Stunden**
