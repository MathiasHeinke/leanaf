
# ARES Matrix-Scoring: Korrigierte Logik fuer Natural/Enhanced/Clinical

## Analyse-Befund

### Aktuelle Datenstruktur

| Datenquelle | Tabelle | Relevante Felder |
|-------------|---------|------------------|
| Protocol Mode | `profiles.protocol_mode` | Komma-separiert: "natural", "enhanced", "clinical", "enhanced,clinical" |
| Aktive Peptide | `peptide_protocols` | `is_active`, `peptides` (JSON mit name/dose/unit) |
| Blutwerte | `user_bloodwork` | 50+ Marker inkl. `cortisol`, `hdl`, `total_testosterone`, `vitamin_d` |
| Protokoll-Phase | `user_protocol_status.current_phase` | 0-3 |
| User-Ziel | `profiles.goal_type` | fat_loss, muscle_gain, etc. |

### Das Problem in der bisherigen Logik

Die bisherige Planung hat einen kritischen Fehler:

```text
FALSCH:
- protocol_mode == 'natural' → Natural Modifikatoren anwenden

KORREKT:
- Natural = protocol_mode == 'natural' UND keine aktiven Peptide UND kein TRT
- Enhanced = Peptide aktiv (Reta, BPC-157, etc.) - kann MIT oder OHNE TRT sein
- Clinical = TRT/HRT aktiv - kann MIT oder OHNE Peptide sein
```

### Wichtige Unterscheidungen

| Szenario | Beschreibung | HMB Score | Citrus Bergamot Score |
|----------|--------------|-----------|----------------------|
| TRUE Natural | Keine Peptide, kein TRT | HIGH (+3) | Normal (0) |
| Enhanced Only (Reta ohne TRT) | GLP-1/Peptide aktiv, kein TRT | CRITICAL (+5) | Normal (0) |
| Clinical Only (TRT ohne Peptide) | TRT aktiv, keine Peptide | LOW (-4) | HIGH (+4) |
| Enhanced + Clinical (Reta + TRT) | Beide aktiv | LOW (-4, TRT trumpft) | HIGH (+4) |

**Kernlogik**: TRT "trumpft" Natural-Booster wie HMB/Tongkat, selbst wenn Peptide aktiv sind.

---

## Datenbank-Schema: `relevance_matrix`

Neue JSONB-Spalte in `supplement_database`:

```json
{
  "phase_modifiers": {
    "0": 2.0,
    "1": -1.0,
    "2": 0.0,
    "3": 1.0
  },
  "context_modifiers": {
    "true_natural": 3.0,
    "enhanced_no_trt": 5.0,
    "on_trt": -4.0,
    "on_glp1": 2.0
  },
  "goal_modifiers": {
    "fat_loss": 1.5,
    "muscle_gain": 0.5,
    "longevity": 0.0
  },
  "bloodwork_triggers": {
    "cortisol_high": 4.0,
    "hdl_low": 3.0,
    "testosterone_low": 2.0,
    "vitamin_d_low": 3.0
  },
  "compound_synergies": {
    "retatrutide": 3.0,
    "tirzepatide": 2.0,
    "bpc_157": 1.0,
    "cjc_1295": 0.0
  }
}
```

---

## Frontend-Logik: User-Kontext-Bestimmung

### Hook: `useUserRelevanceContext.ts`

```typescript
interface UserRelevanceContext {
  // Core Flags (berechnet)
  isTrueNatural: boolean;     // Natural UND keine Peptide UND kein TRT
  isEnhancedNoTRT: boolean;   // Peptide aktiv OHNE TRT
  isOnTRT: boolean;           // TRT aktiv (egal ob mit/ohne Peptide)
  isOnGLP1: boolean;          // GLP-1 Agonist aktiv (Reta/Tirze/Sema)
  
  // Rohdaten
  phase: 0 | 1 | 2 | 3;
  protocolModes: string[];    // ['natural'] oder ['enhanced'] oder ['enhanced', 'clinical']
  activePeptides: string[];   // ['retatrutide', 'bpc_157', etc.]
  goal: string;               // 'fat_loss', 'muscle_gain', etc.
  bloodworkFlags: string[];   // ['cortisol_high', 'hdl_low', etc.]
}
```

### Bestimmungs-Logik

```typescript
function determineUserContext(
  protocolModes: string[],
  activePeptides: Protocol[],
  latestBloodwork: BloodworkEntry | null
): UserRelevanceContext {
  
  // 1. Extrahiere Peptid-Namen aus aktiven Protokollen
  const peptideNames = activePeptides.flatMap(p => 
    p.peptides.map(pep => pep.name.toLowerCase())
  );
  
  // 2. Bestimme TRT-Status
  const isOnTRT = protocolModes.includes('clinical') || 
    peptideNames.some(p => ['testosterone', 'trt', 'hrt'].includes(p));
  
  // 3. Bestimme GLP-1 Status
  const glp1Agents = ['retatrutide', 'tirzepatide', 'semaglutide', 'liraglutide'];
  const isOnGLP1 = peptideNames.some(p => glp1Agents.some(g => p.includes(g)));
  
  // 4. Hat aktive Peptide (nicht TRT)
  const hasActivePeptides = peptideNames.length > 0;
  
  // 5. Berechne Core Flags
  const isTrueNatural = protocolModes.includes('natural') && 
                         !hasActivePeptides && 
                         !isOnTRT;
  
  const isEnhancedNoTRT = hasActivePeptides && !isOnTRT;
  
  // 6. Generiere Bloodwork Flags
  const bloodworkFlags = generateBloodworkFlags(latestBloodwork);
  
  return {
    isTrueNatural,
    isEnhancedNoTRT,
    isOnTRT,
    isOnGLP1,
    phase: ...,
    protocolModes,
    activePeptides: peptideNames,
    goal: ...,
    bloodworkFlags
  };
}
```

### Bloodwork-Flag-Generierung

```typescript
function generateBloodworkFlags(bw: BloodworkEntry | null): string[] {
  if (!bw) return [];
  const flags: string[] = [];
  
  // Hormone
  if (bw.cortisol && bw.cortisol > 25) flags.push('cortisol_high');
  if (bw.total_testosterone && bw.total_testosterone < 300) flags.push('testosterone_low');
  if (bw.dhea_s && bw.dhea_s < 100) flags.push('dhea_low');
  
  // Lipide
  if (bw.hdl && bw.hdl < 40) flags.push('hdl_low');
  if (bw.ldl && bw.ldl > 130) flags.push('ldl_high');
  if (bw.triglycerides && bw.triglycerides > 150) flags.push('triglycerides_high');
  if (bw.apob && bw.apob > 100) flags.push('apob_high');
  
  // Vitamine/Minerale
  if (bw.vitamin_d && bw.vitamin_d < 30) flags.push('vitamin_d_low');
  if (bw.vitamin_b12 && bw.vitamin_b12 < 400) flags.push('b12_low');
  if (bw.magnesium && bw.magnesium < 0.85) flags.push('magnesium_low');
  if (bw.ferritin && bw.ferritin > 300) flags.push('ferritin_high');
  if (bw.iron && bw.iron < 60) flags.push('iron_low');
  
  // Metabolisch
  if (bw.fasting_glucose && bw.fasting_glucose > 100) flags.push('glucose_high');
  if (bw.hba1c && bw.hba1c > 5.7) flags.push('hba1c_elevated');
  if (bw.insulin && bw.insulin > 10) flags.push('insulin_high');
  if (bw.homa_ir && bw.homa_ir > 2.5) flags.push('insulin_resistant');
  
  // Inflammation
  if (bw.hs_crp && bw.hs_crp > 1) flags.push('inflammation_high');
  if (bw.homocysteine && bw.homocysteine > 10) flags.push('homocysteine_high');
  
  // Schilddruese
  if (bw.tsh && bw.tsh > 4) flags.push('thyroid_slow');
  if (bw.tsh && bw.tsh < 0.5) flags.push('thyroid_overactive');
  
  return flags;
}
```

---

## Score-Berechnung

```typescript
// src/lib/calculateRelevanceScore.ts

export function calculateRelevanceScore(
  baseImpactScore: number,
  matrix: RelevanceMatrix | null,
  context: UserRelevanceContext
): { score: number; reasons: string[]; warnings: string[] } {
  
  if (!matrix) {
    return { score: baseImpactScore, reasons: [], warnings: [] };
  }
  
  let score = baseImpactScore;
  const reasons: string[] = [];
  const warnings: string[] = [];
  
  // 1. Phase Modifier
  const phaseKey = context.phase.toString();
  const phaseMod = matrix.phase_modifiers?.[phaseKey] || 0;
  if (phaseMod !== 0) {
    score += phaseMod;
    reasons.push(`Phase ${context.phase}: ${phaseMod > 0 ? '+' : ''}${phaseMod}`);
  }
  
  // 2. Context Modifiers (WICHTIG: Reihenfolge!)
  // TRT trumpft alles - checke zuerst
  if (context.isOnTRT && matrix.context_modifiers?.on_trt) {
    const mod = matrix.context_modifiers.on_trt;
    score += mod;
    if (mod < 0) {
      warnings.push('TRT deckt diesen Bereich hormonell ab');
    }
    reasons.push(`TRT aktiv: ${mod > 0 ? '+' : ''}${mod}`);
  }
  // Enhanced ohne TRT (Reta/Peptide ohne Hormonschutz)
  else if (context.isEnhancedNoTRT && matrix.context_modifiers?.enhanced_no_trt) {
    const mod = matrix.context_modifiers.enhanced_no_trt;
    score += mod;
    if (mod > 2) {
      warnings.push('Kritisch bei Peptiden ohne TRT-Schutz!');
    }
    reasons.push(`Peptide ohne TRT: +${mod}`);
  }
  // True Natural
  else if (context.isTrueNatural && matrix.context_modifiers?.true_natural) {
    const mod = matrix.context_modifiers.true_natural;
    score += mod;
    reasons.push(`100% Natural: +${mod}`);
  }
  
  // 3. GLP-1 Spezifisch (additiv, nicht exklusiv)
  if (context.isOnGLP1 && matrix.context_modifiers?.on_glp1) {
    const mod = matrix.context_modifiers.on_glp1;
    score += mod;
    reasons.push(`GLP-1 aktiv: +${mod}`);
  }
  
  // 4. Goal Modifiers
  if (context.goal && matrix.goal_modifiers?.[context.goal]) {
    const mod = matrix.goal_modifiers[context.goal];
    score += mod;
    reasons.push(`Ziel ${context.goal}: ${mod > 0 ? '+' : ''}${mod}`);
  }
  
  // 5. Bloodwork Triggers
  for (const flag of context.bloodworkFlags) {
    const mod = matrix.bloodwork_triggers?.[flag];
    if (mod) {
      score += mod;
      reasons.push(`Blutwert ${flag}: +${mod}`);
    }
  }
  
  // 6. Compound Synergies
  for (const peptide of context.activePeptides) {
    const normalizedName = peptide.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const mod = matrix.compound_synergies?.[normalizedName];
    if (mod) {
      score += mod;
      reasons.push(`${peptide} Synergie: +${mod}`);
    }
  }
  
  // Clamp 0-10
  return { 
    score: Math.max(0, Math.min(10, score)),
    reasons,
    warnings
  };
}
```

---

## Beispiel-Matrizen

### HMB (Muskelschutz)
```json
{
  "phase_modifiers": { "0": 2, "1": 0, "2": -1, "3": 0 },
  "context_modifiers": {
    "true_natural": 3,
    "enhanced_no_trt": 5,
    "on_trt": -4,
    "on_glp1": 0
  },
  "goal_modifiers": { "fat_loss": 2, "muscle_gain": 1 },
  "compound_synergies": { "retatrutide": 3, "tirzepatide": 2 }
}
```

**Szenarien:**
- Natural im Defizit: 8.0 + 2 + 3 + 2 = **15 -> 10** (Essential!)
- Reta ohne TRT: 8.0 + 0 + 5 + 2 + 3 = **18 -> 10** (CRITICAL!)
- TRT User: 8.0 + 0 + (-4) = **4.0** (Nicht kaufen)
- Reta + TRT: 8.0 + 0 + (-4) + 0 + 3 = **7.0** (Optional, TRT trumpft)

### Citrus Bergamot (Lipid-Support)
```json
{
  "phase_modifiers": { "0": 0, "1": 3, "2": 2, "3": 1 },
  "context_modifiers": {
    "true_natural": 0,
    "enhanced_no_trt": 0,
    "on_trt": 4,
    "on_glp1": 0
  },
  "bloodwork_triggers": { "hdl_low": 3, "ldl_high": 2, "apob_high": 2 }
}
```

**Szenarien:**
- Natural: 7.5 + 0 + 0 = **7.5** (Gut)
- TRT mit niedrigem HDL: 7.5 + 3 + 4 + 3 = **17.5 -> 10** (Essential!)

### Elektrolyte (LMNT)
```json
{
  "phase_modifiers": { "0": 0, "1": 3, "2": 2, "3": 1 },
  "context_modifiers": {
    "on_glp1": 4
  },
  "compound_synergies": { "retatrutide": 3, "tirzepatide": 2, "semaglutide": 2 }
}
```

**Szenarien:**
- Reta User: 9.0 + 3 + 4 + 3 = **19 -> 10** (Non-negotiable!)

---

## Dateien zu erstellen/aendern

### Neue Dateien
| Datei | Zweck |
|-------|-------|
| `src/lib/calculateRelevanceScore.ts` | Score-Berechnungs-Engine |
| `src/hooks/useUserRelevanceContext.ts` | User-Kontext aggregieren |
| `src/components/supplements/RelevanceScorePopover.tsx` | Erklaerung-UI |
| `src/types/relevanceMatrix.ts` | TypeScript-Typen |

### Zu aendernde Dateien
| Datei | Aenderung |
|-------|-----------|
| `src/types/supplementLibrary.ts` | `relevance_matrix` Typ hinzufuegen |
| `src/hooks/useSupplementLibrary.ts` | Matrix aus DB laden |
| `src/components/supplements/SelectedProductCard.tsx` | Score anzeigen |
| `src/components/supplements/ExpandableSupplementChip.tsx` | Score anzeigen |
| `src/components/supplements/SupplementDetailSheet.tsx` | Score-Bereich |

### Datenbank-Migration
```sql
ALTER TABLE supplement_database 
ADD COLUMN IF NOT EXISTS relevance_matrix JSONB 
DEFAULT '{}';
```

---

## Aufwand-Schaetzung

| Task | Zeit |
|------|------|
| DB-Migration (Schema) | 15 min |
| TypeScript-Typen | 20 min |
| `useUserRelevanceContext` Hook | 45 min |
| `calculateRelevanceScore` Logik | 30 min |
| `RelevanceScorePopover` UI | 40 min |
| Integration in Cards/Sheets | 60 min |
| Matrix-Daten fuer ~111 Wirkstoffe | User-Input |

**Gesamt: ~3.5 Stunden (ohne Matrix-Daten)**

---

## Naechste Schritte

1. **Schema-Migration**: `relevance_matrix` Spalte hinzufuegen
2. **Frontend-Logik**: Score-Berechnung + Hook implementieren
3. **UI-Integration**: Popovers und Score-Anzeige
4. **Matrix-Daten**: Du lieferst CSV/JSON mit Modifikatoren pro Wirkstoff:

| Wirkstoff | true_natural | enhanced_no_trt | on_trt | on_glp1 | cortisol_high | hdl_low | retatrutide |
|-----------|--------------|-----------------|--------|---------|---------------|---------|-------------|
| HMB | +3 | +5 | -4 | 0 | 0 | 0 | +3 |
| Citrus Bergamot | 0 | 0 | +4 | 0 | 0 | +3 | 0 |
| Elektrolyte | 0 | 0 | 0 | +4 | 0 | 0 | +3 |
| Ashwagandha | +2 | +1 | -1 | 0 | +4 | 0 | 0 |
| Tongkat Ali | +3 | +2 | -5 | 0 | 0 | 0 | 0 |
| ... | ... | ... | ... | ... | ... | ... | ... |
