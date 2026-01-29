# 🧬 ARES Ingredient Relevance Matrix v2.1
## Personalisierte Wirkstoff-Scores basierend auf User-Kontext

**Datum:** 29. Januar 2026  
**Version:** 2.0 EXTENDED MATRIX  
**Wirkstoffe:** 150 mit vollständigen Relevanz-Modifikatoren
**Erweiterungen v2.0:** Peptid-Klassen, Demografische Faktoren, Erweiterte Goals  
**Schema:** Lovable/Supabase-ready

---

## I. KONZEPT-ÜBERSICHT

### Das Problem mit statischen Scores
Ein Produkt mit Impact Score 9.2 ist objektiv hochwertig – aber **passt es zum User?**

| Szenario | HMB Impact Score | Tatsächlicher Nutzen |
|----------|------------------|---------------------|
| Natural im Defizit | 8.0 | **10/10** – Essentiell! |
| TRT User | 8.0 | **3/10** – Redundant |
| Reta ohne TRT | 8.0 | **10/10** – Kritisch! |

### Die Lösung: Kontext-basierte Modifikatoren
```
Personalisierter Score = Base Impact + Σ(Relevante Modifikatoren)
```

---

## II. USER-KONTEXT-FLAGS

### Primäre Kontext-Flags
| Flag | Bedingung | Beschreibung |
|------|-----------|--------------|
| `true_natural` | mode='natural' AND keine Peptide AND kein TRT | 100% natural, keine Compounds |
| `enhanced_no_trt` | Peptide aktiv AND kein TRT | GLP-1/Peptide ohne Hormonschutz |
| `on_trt` | mode='clinical' OR TRT aktiv | Hormonersatztherapie aktiv |
| `on_glp1` | Reta/Tirze/Sema aktiv | GLP-1 Agonist aktiv |

### Bloodwork-Trigger-Flags
| Flag | Schwellwert | Betroffene Wirkstoffe |
|------|-------------|----------------------|
| `cortisol_high` | >25 µg/dL | Ashwagandha, Phosphatidylserin |
| `testosterone_low` | <300 ng/dL | Tongkat Ali, D-Asparaginsäure |
| `hdl_low` | <40 mg/dL | Citrus Bergamot, Niacin, Omega-3 |
| `ldl_high` | >130 mg/dL | Bergamot, Plant Sterols |
| `vitamin_d_low` | <30 ng/mL | Vitamin D3 |
| `b12_low` | <400 pg/mL | Vitamin B12 |
| `iron_low` | <60 µg/dL | Eisen |
| `magnesium_low` | <0.85 mmol/L | Magnesium |
| `inflammation_high` | hs-CRP >1 mg/L | Curcumin, Omega-3, Boswellia |
| `homocysteine_high` | >10 µmol/L | B-Vitamine, Folat |
| `glucose_high` | >100 mg/dL | Berberin, Chrom |
| `insulin_resistant` | HOMA-IR >2.5 | Berberin, ALA, Inositol |

### Goal-Modifikatoren
| Ziel | Beschreibung |
|------|--------------|
| `fat_loss` | Kaloriendefizit, Muskelerhalt kritisch |
| `muscle_gain` | Aufbauphase, anabole Unterstützung |
| `recomposition` | Gleichzeitig Fettabbau & Muskelaufbau |
| `longevity` | Anti-Aging, NAD+, Senolytika |
| `maintenance` | Erhaltungsphase, Basis-Supplemente |
| `cognitive` | Nootropics, Gehirngesundheit |
| `sleep` | Schlafoptimierung |
| `gut_health` | Darmgesundheit |

### Peptid-Klassen-Modifikatoren (LOVABLE - 8 Klassen)
| Klasse | Peptide | Synergien |
|--------|---------|-----------|
| `gh_secretagogue` | CJC-1295, Ipamorelin, MK-677 | Aminosäuren, Schlafoptimierung, Kollagen |
| `healing` | BPC-157, TB-500 | Kollagen, Glutamin, Zink, Curcumin |
| `longevity` | Epitalon, MOTS-c, SS-31 | NMN, Resveratrol, Spermidin |
| `nootropic` | Selank, Semax, Pinealon | Omega-3, Lion's Mane, Ashwagandha |
| `metabolic` | Retatrutide, Tirzepatide, Semaglutide | Elektrolyte, Protein, B-Vitamine |
| `immune` | Thymalin, TA1, LL-37 | NAC, Quercetin, Vitamin C, Zink |
| `testo` | IGF-1 LR3, Kisspeptin-10, Testosterone | Zink, D3, Magnesium, Bor |
| `skin` | GHK-Cu | Kollagen, Vitamin C, Hyaluron |

### Kalorien-Modifikatoren (LOVABLE)
| Flag | Bedingung | Beschreibung |
|------|-----------|--------------|
| `in_deficit` | Kaloriendefizit aktiv | Muskelschutz kritisch: HMB, EAA, Kreatin |
| `in_surplus` | Kalorienüberschuss | Anabole Unterstützung: Kreatin, Protein |

### Demografische Modifikatoren (LOVABLE)
| Flag | Bedingung | Beschreibung |
|------|-----------|--------------|
| `age_over_40` | Alter > 40 Jahre | NAD+, Gelenke, Kardio, Kognition wichtiger |
| `age_over_50` | Alter > 50 Jahre | Longevity-Fokus, Kollagen, B12, Kreatin |
| `age_over_60` | Alter > 60 Jahre | Sarkopenie-Prävention, kognitive Unterstützung |
| `is_female` | Weiblich | Eisen, Folat, Calcium; Testo-Booster reduziert |
| `is_male` | Männlich | Zink, Prostata-Support (>50) |

### Compound-Synergien
| Compound | Beschreibung | Betroffene Kategorien |
|----------|--------------|----------------------|
| `retatrutide` | Triple-Agonist, massiver Grundumsatz | Elektrolyte, Muskelschutz, B-Vitamine |
| `tirzepatide` | Dual-Agonist | Elektrolyte, Muskelschutz |
| `semaglutide` | GLP-1 only | Elektrolyte |
| `bpc_157` | Healing-Peptid | Kollagen, Glutamin |
| `cjc_ipamorelin` | GH-Sekretagog | Arginin (redundant), Glutamin |

---

## III. RELEVANCE MATRIX SCHEMA

```typescript
interface RelevanceMatrix {
  ingredient_id: string;
  ingredient_name: string;
  category: string;
  base_score: number; // 1-10, Grundrelevanz
  
  phase_modifiers: {
    "0": number;  // Onboarding
    "1": number;  // Etablierung
    "2": number;  // Optimierung
    "3": number;  // Mastery
  };
  
  context_modifiers: {
    true_natural?: number;
    enhanced_no_trt?: number;
    on_trt?: number;
    on_glp1?: number;
  };
  
  goal_modifiers: {
    fat_loss?: number;
    muscle_gain?: number;
    recomposition?: number;
    longevity?: number;
    maintenance?: number;
    performance?: number;       // NEU: Sport/Leistung
    cognitive?: number;
    sleep?: number;
    gut_health?: number;
  };
  
  calorie_modifiers: {         // NEU: Separiert von demographic
    in_deficit?: number;
    in_surplus?: number;
  };
  
  peptide_class_modifiers: {   // Lovable-kompatibel: 8 Klassen
    gh_secretagogue?: number;   // CJC-1295, Ipamorelin
    healing?: number;           // BPC-157, TB-500
    longevity?: number;         // Epitalon, MOTS-c (umbenannt von longevity_peptide)
    nootropic?: number;         // Selank, Semax
    metabolic?: number;         // NEU: Retatrutide, Tirzepatide, Semaglutide
    immune?: number;            // Thymalin, TA1
    testo?: number;             // IGF-1 LR3, Kisspeptin
    skin?: number;              // NEU: GHK-Cu
  };
  
  demographic_modifiers: {     // Lovable-kompatibel: 5 Flags
    age_over_40?: number;
    age_over_50?: number;
    age_over_60?: number;       // NEU
    is_female?: number;         // Umbenannt von female
    is_male?: number;           // NEU
  };
  
  bloodwork_triggers: {
    [flag: string]: number;
  };
  
  compound_synergies: {
    retatrutide?: number;
    tirzepatide?: number;
    semaglutide?: number;
    cjc_1295?: number;          // Separiert von cjc_ipamorelin
    ipamorelin?: number;        // Separiert von cjc_ipamorelin
    bpc_157?: number;
    tb_500?: number;            // NEU: Healing-Peptid
    epitalon?: number;
    mots_c?: number;
  };
  
  warnings: {
    [context: string]: string;
  };
}
```

---

## IV. WIRKSTOFF-KATALOG MIT RELEVANCE MATRIX

---

### KATEGORIE: VITAMINE (14 Wirkstoffe)

---

#### 1. Vitamin D3 (Cholecalciferol)
```json
{
  "ingredient_id": "vit_d3",
  "ingredient_name": "Vitamin D3",
  "category": "vitamine",
  "base_score": 9.0,
  "phase_modifiers": {
    "0": 2.0,
    "1": 1.0,
    "2": 0.0,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 1.0,
    "enhanced_no_trt": 1.0,
    "on_trt": 1.0,
    "on_glp1": 1.0
  },
  "goal_modifiers": {
    "fat_loss": 0.5,
    "muscle_gain": 0.5,
    "longevity": 1.0,
    "cognitive": 0.5,
    "sleep": 0.5,
    "recomposition": 1.0,
    "maintenance": 1.5
  },
  "calorie_modifiers": {
    "in_surplus": 1.0
  },
  "peptide_class_modifiers": {
    "immune": 2.0,
    "testo": 2.5
  },
  "demographic_modifiers": {
    "age_over_40": 1.5,
    "age_over_50": 2.5,
    "is_female": 1.5,
    "age_over_60": 3.2,
    "is_male": 1.0
  },
  "bloodwork_triggers": {
    "vitamin_d_low": 4.0,
    "inflammation_high": 1.0,
    "testosterone_low": 1.5
  },
  "warnings": {
    "vitamin_d_low": "Kritischer Mangel – Supplementierung essentiell!"
  }
}
```

---

#### 2. Vitamin K2 (MK-7)
```json
{
  "ingredient_id": "vit_k2",
  "ingredient_name": "Vitamin K2 MK-7",
  "category": "vitamine",
  "base_score": 8.5,
  "phase_modifiers": {
    "0": 1.0,
    "1": 0.5,
    "2": 0.0,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 0.5,
    "on_trt": 1.0
  },
  "goal_modifiers": {
    "longevity": 1.5,
    "maintenance": 1.0
  },
  "bloodwork_triggers": {
    "vitamin_d_low": 2.0
  },
  "warnings": {
    "on_blood_thinners": "Vorsicht bei Antikoagulantien – Arzt konsultieren!"
  }
}
```

---

#### 3. Vitamin B12 (Methylcobalamin)
```json
{
  "ingredient_id": "vit_b12",
  "ingredient_name": "Vitamin B12",
  "category": "vitamine",
  "base_score": 8.0,
  "phase_modifiers": {
    "0": 1.5,
    "1": 0.5,
    "2": 0.0,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 0.5,
    "on_glp1": 2.0
  },
  "goal_modifiers": {
    "cognitive": 1.0,
    "fat_loss": 0.5,
    "recomposition": 0.2,
    "maintenance": 1.0
  },
  "peptide_class_modifiers": {
    "metabolic": 2.5
  },
  "demographic_modifiers": {
    "age_over_40": 1.5,
    "age_over_50": 2.5,
    "is_female": 1.5,
    "age_over_60": 3.2
  },
  "bloodwork_triggers": {
    "b12_low": 4.0,
    "homocysteine_high": 2.0
  },
  "compound_synergies": {
    "retatrutide": 2.0,
    "tirzepatide": 1.5,
    "semaglutide": 1.5
  },
  "warnings": {
    "on_glp1": "GLP-1 Agonisten reduzieren B12-Absorption – Supplementierung wichtig!"
  }
}
```

---

#### 4. Vitamin B-Komplex (aktiv)
```json
{
  "ingredient_id": "vit_b_complex",
  "ingredient_name": "Vitamin B-Komplex",
  "category": "vitamine",
  "base_score": 8.0,
  "phase_modifiers": {
    "0": 1.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 1.0,
    "on_glp1": 2.5
  },
  "goal_modifiers": {
    "cognitive": 1.0,
    "fat_loss": 1.0,
    "recomposition": 0.5,
    "maintenance": 1.0
  },
  "bloodwork_triggers": {
    "homocysteine_high": 3.0,
    "b12_low": 2.0
  },
  "compound_synergies": {
    "retatrutide": 3.0,
    "tirzepatide": 2.0,
    "semaglutide": 2.0
  },
  "warnings": {
    "retatrutide": "Essentiell bei Retatrutide wegen erhöhtem Umsatz!"
  }
}
```

---

#### 5. Vitamin C (Ascorbinsäure)
```json
{
  "ingredient_id": "vit_c",
  "ingredient_name": "Vitamin C",
  "category": "vitamine",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 1.0,
    "1": 0.5,
    "2": 0.0,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 0.5
  },
  "goal_modifiers": {
    "longevity": 0.5,
    "maintenance": 1.0
  },
  "peptide_class_modifiers": {
    "healing": 2.0,
    "immune": 3.0,
    "skin": 2.0
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.5,
    "iron_low": 1.0
  }
}
```

---

#### 6. Vitamin E (Tocopherole)
```json
{
  "ingredient_id": "vit_e",
  "ingredient_name": "Vitamin E",
  "category": "vitamine",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.0,
    "2": 0.0,
    "3": 0.5
  },
  "context_modifiers": {
    "on_trt": 1.0
  },
  "goal_modifiers": {
    "longevity": 1.0,
    "maintenance": 1.0
  },
  "bloodwork_triggers": {
    "ldl_high": 1.0
  },
  "warnings": {
    "high_dose": "Nicht überdosieren – max. 400 IE/Tag"
  }
}
```

---

#### 7. Vitamin A (Retinol)
```json
{
  "ingredient_id": "vit_a",
  "ingredient_name": "Vitamin A",
  "category": "vitamine",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  },
  "goal_modifiers": {
    "maintenance": 1.0
  },
  "warnings": {
    "overdose": "Fettlöslich – Überdosierung möglich"
  }
}
```

---

#### 8. Folat (5-MTHF)
```json
{
  "ingredient_id": "folate",
  "ingredient_name": "Folat (5-MTHF)",
  "category": "vitamine",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 1.0,
    "1": 0.5,
    "2": 0.0,
    "3": 0.0
  },
  "goal_modifiers": {
    "cognitive": 1.0,
    "longevity": 0.5
  },
  "demographic_modifiers": {
    "is_female": 3.0
  },
  "bloodwork_triggers": {
    "homocysteine_high": 3.5,
    "b12_low": 1.0
  }
}
```

---

#### 9. Biotin (B7)
```json
{
  "ingredient_id": "biotin",
  "ingredient_name": "Biotin",
  "category": "vitamine",
  "base_score": 5.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  },
  "peptide_class_modifiers": {
    "skin": 2.0
  },
  "warnings": {
    "lab_interference": "Kann Laborwerte verfälschen – 48h vor Bluttest absetzen"
  }
}
```

---

#### 10. Niacin (B3)
```json
{
  "ingredient_id": "niacin",
  "ingredient_name": "Niacin",
  "category": "vitamine",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 1.0,
    "3": 0.5
  },
  "context_modifiers": {
    "on_trt": 2.0
  },
  "goal_modifiers": {
    "longevity": 1.0
  },
  "bloodwork_triggers": {
    "hdl_low": 3.0,
    "ldl_high": 2.0
  },
  "warnings": {
    "flush": "Flush-Form kann Hautrötung verursachen"
  }
}
```

---

#### 11. Thiamin (B1)
```json
{
  "ingredient_id": "thiamin",
  "ingredient_name": "Thiamin (B1)",
  "category": "vitamine",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  },
  "goal_modifiers": {
    "cognitive": 0.5
  },
  "bloodwork_triggers": {
    "glucose_high": 1.0
  }
}
```

---

#### 12. Riboflavin (B2)
```json
{
  "ingredient_id": "riboflavin",
  "ingredient_name": "Riboflavin (B2)",
  "category": "vitamine",
  "base_score": 5.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  },
  "bloodwork_triggers": {
    "homocysteine_high": 1.0
  }
}
```

---

#### 13. Pantothensäure (B5)
```json
{
  "ingredient_id": "pantothenic",
  "ingredient_name": "Pantothensäure (B5)",
  "category": "vitamine",
  "base_score": 5.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  },
  "goal_modifiers": {
    "fat_loss": 0.5,
    "recomposition": 0.2
  },
  "bloodwork_triggers": {
    "cortisol_high": 1.0
  }
}
```

---

#### 14. Pyridoxin (B6)
```json
{
  "ingredient_id": "pyridoxine",
  "ingredient_name": "Pyridoxin (B6)",
  "category": "vitamine",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.0,
    "3": 0.0
  },
  "goal_modifiers": {
    "cognitive": 0.5,
    "sleep": 0.5
  },
  "bloodwork_triggers": {
    "homocysteine_high": 2.0
  },
  "warnings": {
    "overdose": "Nicht >100mg/Tag – Neuropathie-Risiko"
  }
}
```

---

### KATEGORIE: MINERALIEN (15 Wirkstoffe)

---

#### 15. Magnesium
```json
{
  "ingredient_id": "magnesium",
  "ingredient_name": "Magnesium",
  "category": "mineralien",
  "base_score": 9.0,
  "phase_modifiers": {
    "0": 2.0,
    "1": 1.0,
    "2": 0.5,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 1.0,
    "enhanced_no_trt": 1.5,
    "on_trt": 1.0,
    "on_glp1": 2.0
  },
  "goal_modifiers": {
    "sleep": 2.0,
    "muscle_gain": 1.0,
    "cognitive": 1.0,
    "recomposition": 0.5,
    "maintenance": 1.5,
    "performance": 1.0
  },
  "calorie_modifiers": {
    "in_deficit": 1.5,
    "in_surplus": 1.0
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 2.0,
    "testo": 2.5,
    "metabolic": 2.5
  },
  "demographic_modifiers": {
    "age_over_40": 1.5,
    "is_female": 1.5,
    "is_male": 1.0
  },
  "bloodwork_triggers": {
    "magnesium_low": 4.0,
    "cortisol_high": 1.5,
    "glucose_high": 1.0
  },
  "compound_synergies": {
    "retatrutide": 2.0,
    "tirzepatide": 1.5
  },
  "warnings": {
    "retatrutide": "GLP-1 erhöht Magnesiumverlust – Supplementierung kritisch!"
  }
}
```

---

#### 16. Zink
```json
{
  "ingredient_id": "zinc",
  "ingredient_name": "Zink",
  "category": "mineralien",
  "base_score": 8.5,
  "phase_modifiers": {
    "0": 1.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 2.0,
    "enhanced_no_trt": 1.0,
    "on_trt": 0.5
  },
  "goal_modifiers": {
    "muscle_gain": 1.0,
    "recomposition": 0.5,
    "maintenance": 1.5
  },
  "calorie_modifiers": {
    "in_surplus": 1.0
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 2.0,
    "healing": 3.0,
    "immune": 3.0,
    "testo": 2.5
  },
  "demographic_modifiers": {
    "is_male": 1.0
  },
  "bloodwork_triggers": {
    "testosterone_low": 2.5
  },
  "compound_synergies": {
    "tb_500": 2.0
  },
  "warnings": {
    "copper_depletion": "Bei Langzeit-Einnahme Kupfer supplementieren"
  }
}
```

---

#### 17. Eisen
```json
{
  "ingredient_id": "iron",
  "ingredient_name": "Eisen",
  "category": "mineralien",
  "base_score": 5.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  },
  "context_modifiers": {
    "on_trt": -2.0
  },
  "goal_modifiers": {
    "performance": 1.0
  },
  "demographic_modifiers": {
    "is_female": 3.0
  },
  "bloodwork_triggers": {
    "iron_low": 5.0,
    "ferritin_high": -5.0
  },
  "warnings": {
    "ferritin_high": "NICHT supplementieren bei hohem Ferritin!",
    "on_trt": "TRT erhöht Erythropoese – Eisenspeicher überwachen"
  }
}
```

---

#### 18. Calcium
```json
{
  "ingredient_id": "calcium",
  "ingredient_name": "Calcium",
  "category": "mineralien",
  "base_score": 5.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  },
  "goal_modifiers": {
    "longevity": -0.5
  },
  "demographic_modifiers": {
    "age_over_50": 2.5,
    "is_female": 1.5,
    "age_over_60": 3.2
  },
  "bloodwork_triggers": {
    "vitamin_d_low": 1.0
  },
  "warnings": {
    "cardiovascular": "Hohe Dosen ohne K2 können Gefäßverkalkung fördern"
  }
}
```

---

#### 19. Kalium
```json
{
  "ingredient_id": "potassium",
  "ingredient_name": "Kalium",
  "category": "mineralien",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 1.0,
    "1": 1.5,
    "2": 1.0,
    "3": 0.5
  },
  "context_modifiers": {
    "on_glp1": 3.0
  },
  "goal_modifiers": {
    "fat_loss": 1.5,
    "recomposition": 0.8
  },
  "calorie_modifiers": {
    "in_deficit": 1.5
  },
  "peptide_class_modifiers": {
    "metabolic": 2.5
  },
  "compound_synergies": {
    "retatrutide": 3.0,
    "tirzepatide": 2.5,
    "semaglutide": 2.0
  },
  "warnings": {
    "retatrutide": "Elektrolytverlust bei GLP-1 – Supplementierung essentiell!"
  }
}
```

---

#### 20. Selen
```json
{
  "ingredient_id": "selenium",
  "ingredient_name": "Selen",
  "category": "mineralien",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 1.0,
    "1": 0.5,
    "2": 0.0,
    "3": 0.5
  },
  "context_modifiers": {
    "true_natural": 0.5
  },
  "goal_modifiers": {
    "longevity": 1.0,
    "maintenance": 1.0
  },
  "peptide_class_modifiers": {
    "immune": 2.0
  },
  "bloodwork_triggers": {
    "thyroid_slow": 2.5
  },
  "warnings": {
    "overdose": "Max. 200 µg/Tag – Toxizität bei Überdosierung"
  }
}
```

---

#### 21. Jod
```json
{
  "ingredient_id": "iodine",
  "ingredient_name": "Jod",
  "category": "mineralien",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  },
  "goal_modifiers": {
    "fat_loss": 0.5,
    "recomposition": 0.2
  },
  "bloodwork_triggers": {
    "thyroid_slow": 2.0
  },
  "warnings": {
    "hashimoto": "Vorsicht bei Hashimoto – kann Schub auslösen"
  }
}
```

---

#### 22. Kupfer
```json
{
  "ingredient_id": "copper",
  "ingredient_name": "Kupfer",
  "category": "mineralien",
  "base_score": 5.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  },
  "warnings": {
    "zinc_supplementation": "Nur bei Langzeit-Zink-Einnahme supplementieren"
  }
}
```

---

#### 23. Mangan
```json
{
  "ingredient_id": "manganese",
  "ingredient_name": "Mangan",
  "category": "mineralien",
  "base_score": 4.5,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  }
}
```

---

#### 24. Chrom
```json
{
  "ingredient_id": "chromium",
  "ingredient_name": "Chrom",
  "category": "mineralien",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.0
  },
  "context_modifiers": {
    "on_glp1": -1.0
  },
  "goal_modifiers": {
    "fat_loss": 1.5,
    "recomposition": 0.8
  },
  "bloodwork_triggers": {
    "glucose_high": 2.5,
    "insulin_resistant": 2.0
  },
  "compound_synergies": {
    "retatrutide": -2.0,
    "tirzepatide": -1.5
  },
  "warnings": {
    "on_glp1": "Redundant bei GLP-1 – beide verbessern Insulinsensitivität"
  }
}
```

---

#### 25. Bor
```json
{
  "ingredient_id": "boron",
  "ingredient_name": "Bor",
  "category": "mineralien",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  },
  "context_modifiers": {
    "true_natural": 2.0,
    "on_trt": -1.0
  },
  "goal_modifiers": {
    "muscle_gain": 1.0,
    "recomposition": 0.5
  },
  "peptide_class_modifiers": {
    "testo": 2.5
  },
  "bloodwork_triggers": {
    "testosterone_low": 2.0
  },
  "warnings": {
    "on_trt": "Limitierter Nutzen bei exogenem Testosteron"
  }
}
```

---

#### 26. Silizium
```json
{
  "ingredient_id": "silicon",
  "ingredient_name": "Silizium",
  "category": "mineralien",
  "base_score": 5.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.0,
    "3": 0.5
  },
  "goal_modifiers": {
    "longevity": 0.5
  },
  "peptide_class_modifiers": {
    "skin": 2.0
  },
  "compound_synergies": {
    "bpc_157": 1.0,
    "tb_500": 1.0
  }
}
```

---

#### 27. Natrium (Elektrolyte)
```json
{
  "ingredient_id": "sodium",
  "ingredient_name": "Natrium",
  "category": "mineralien",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 2.0,
    "2": 1.5,
    "3": 1.0
  },
  "context_modifiers": {
    "on_glp1": 4.0
  },
  "goal_modifiers": {
    "fat_loss": 2.0,
    "recomposition": 1.0
  },
  "calorie_modifiers": {
    "in_deficit": 1.5
  },
  "peptide_class_modifiers": {
    "metabolic": 2.5
  },
  "compound_synergies": {
    "retatrutide": 4.0,
    "tirzepatide": 3.0,
    "semaglutide": 2.5
  },
  "warnings": {
    "retatrutide": "KRITISCH bei Retatrutide – Elektrolyte sind Non-Negotiable!"
  }
}
```

---

#### 28. Phosphor
```json
{
  "ingredient_id": "phosphorus",
  "ingredient_name": "Phosphor",
  "category": "mineralien",
  "base_score": 4.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  },
  "warnings": {
    "general": "Meist ausreichend über Ernährung"
  }
}
```

---

#### 29. Molybdän
```json
{
  "ingredient_id": "molybdenum",
  "ingredient_name": "Molybdän",
  "category": "mineralien",
  "base_score": 4.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  }
}
```


---

### KATEGORIE: AMINOSÄUREN (25 Wirkstoffe)

---

#### 30. Kreatin (Monohydrat)
```json
{
  "ingredient_id": "creatine",
  "ingredient_name": "Kreatin",
  "category": "aminosaeuren",
  "base_score": 9.5,
  "phase_modifiers": {
    "0": 1.0,
    "1": 1.0,
    "2": 0.5,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 1.0,
    "enhanced_no_trt": 1.0,
    "on_trt": 0.5
  },
  "goal_modifiers": {
    "muscle_gain": 2.0,
    "cognitive": 1.5,
    "fat_loss": 0.5,
    "recomposition": 1.8,
    "maintenance": 0.5,
    "performance": 2.0
  },
  "calorie_modifiers": {
    "in_deficit": 3.0,
    "in_surplus": 2.0
  },
  "demographic_modifiers": {
    "age_over_40": 1.5,
    "age_over_50": 2.0,
    "age_over_60": 2.6,
    "is_male": 1.0
  }
}
```

---

#### 31. L-Carnitin (Acetyl-L-Carnitin)
```json
{
  "ingredient_id": "carnitine",
  "ingredient_name": "L-Carnitin",
  "category": "aminosaeuren",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.5,
    "2": 1.0,
    "3": 0.5
  },
  "context_modifiers": {
    "true_natural": 1.0,
    "on_trt": 1.5
  },
  "goal_modifiers": {
    "fat_loss": 2.0,
    "cognitive": 1.5,
    "longevity": 1.0,
    "recomposition": 1.0,
    "performance": 2.0
  },
  "calorie_modifiers": {
    "in_deficit": 2.0
  },
  "warnings": {
    "on_trt": "TRT erhöht Androgen-Rezeptor-Dichte – L-Carnitin synergistisch!"
  }
}
```

---

#### 32. L-Glutamin
```json
{
  "ingredient_id": "glutamine",
  "ingredient_name": "L-Glutamin",
  "category": "aminosaeuren",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.0
  },
  "context_modifiers": {
    "enhanced_no_trt": 2.0,
    "on_glp1": 2.5
  },
  "goal_modifiers": {
    "gut_health": 3.0,
    "muscle_gain": 0.5,
    "recomposition": 0.2
  },
  "calorie_modifiers": {
    "in_surplus": 2.0
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 2.0,
    "healing": 3.0
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.5
  },
  "compound_synergies": {
    "retatrutide": 2.5,
    "tirzepatide": 2.0,
    "bpc_157": 2.0,
    "tb_500": 2.0
  },
  "warnings": {
    "on_glp1": "GLP-1 kann Darm stressen – Glutamin unterstützt Schleimhaut"
  }
}
```

---

#### 33. L-Arginin
```json
{
  "ingredient_id": "arginine",
  "ingredient_name": "L-Arginin",
  "category": "aminosaeuren",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.0,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 1.5,
    "on_trt": -1.0
  },
  "goal_modifiers": {
    "muscle_gain": 0.5,
    "recomposition": 0.2,
    "performance": 2.0
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 2.0
  },
  "compound_synergies": {
    "cjc_1295": -3.0,
    "ipamorelin": -3.0
  },
  "warnings": {
    "cjc_ipamorelin": "Redundant bei GH-Sekretagogen – diese nutzen denselben Pathway",
    "on_trt": "Citrullin ist effektiver für NO-Produktion"
  }
}
```

---

#### 34. L-Citrullin
```json
{
  "ingredient_id": "citrulline",
  "ingredient_name": "L-Citrullin",
  "category": "aminosaeuren",
  "base_score": 8.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 1.0,
    "on_trt": 1.0
  },
  "goal_modifiers": {
    "muscle_gain": 1.5,
    "recomposition": 0.8,
    "performance": 2.0
  }
}
```

---

#### 35. Taurin
```json
{
  "ingredient_id": "taurine",
  "ingredient_name": "Taurin",
  "category": "aminosaeuren",
  "base_score": 8.0,
  "phase_modifiers": {
    "0": 1.0,
    "1": 1.0,
    "2": 0.5,
    "3": 0.5
  },
  "context_modifiers": {
    "true_natural": 0.5,
    "on_trt": 1.0,
    "on_glp1": 1.5
  },
  "goal_modifiers": {
    "longevity": 2.0,
    "cognitive": 1.0,
    "sleep": 1.0
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.0
  }
}
```

---

#### 36. Glycin
```json
{
  "ingredient_id": "glycine",
  "ingredient_name": "Glycin",
  "category": "aminosaeuren",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 1.0,
    "3": 1.0
  },
  "goal_modifiers": {
    "sleep": 2.5,
    "longevity": 1.5
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 2.0
  },
  "bloodwork_triggers": {
    "homocysteine_high": 1.0
  }
}
```

---

#### 37. L-Theanin
```json
{
  "ingredient_id": "theanine",
  "ingredient_name": "L-Theanin",
  "category": "aminosaeuren",
  "base_score": 8.0,
  "phase_modifiers": {
    "0": 1.0,
    "1": 1.0,
    "2": 0.5,
    "3": 0.0
  },
  "goal_modifiers": {
    "cognitive": 2.0,
    "sleep": 1.5
  },
  "peptide_class_modifiers": {
    "nootropic": 2.0
  },
  "bloodwork_triggers": {
    "cortisol_high": 2.0
  }
}
```

---

#### 38. L-Tyrosin
```json
{
  "ingredient_id": "tyrosine",
  "ingredient_name": "L-Tyrosin",
  "category": "aminosaeuren",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.0
  },
  "context_modifiers": {
    "on_glp1": 1.5
  },
  "goal_modifiers": {
    "cognitive": 2.0,
    "fat_loss": 1.0,
    "recomposition": 0.5
  },
  "bloodwork_triggers": {
    "thyroid_slow": 1.5
  },
  "compound_synergies": {
    "retatrutide": 1.5
  },
  "warnings": {
    "thyroid_overactive": "Nicht bei Hyperthyreose"
  }
}
```

---

#### 39. L-Tryptophan
```json
{
  "ingredient_id": "tryptophan",
  "ingredient_name": "L-Tryptophan",
  "category": "aminosaeuren",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  },
  "goal_modifiers": {
    "sleep": 2.0,
    "cognitive": 0.5
  },
  "warnings": {
    "ssri": "Vorsicht bei SSRI-Einnahme – Serotonin-Syndrom möglich"
  }
}
```

---

#### 40. 5-HTP
```json
{
  "ingredient_id": "5htp",
  "ingredient_name": "5-HTP",
  "category": "aminosaeuren",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 0.0
  },
  "goal_modifiers": {
    "sleep": 2.0
  },
  "warnings": {
    "ssri": "KONTRAINDIZIERT bei SSRI – Serotonin-Syndrom!",
    "long_term": "Nicht für Langzeit-Einnahme – kann Dopamin depleten"
  }
}
```

---

#### 41. GABA
```json
{
  "ingredient_id": "gaba",
  "ingredient_name": "GABA",
  "category": "aminosaeuren",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.0,
    "3": 0.0
  },
  "goal_modifiers": {
    "sleep": 1.5
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 2.0
  },
  "bloodwork_triggers": {
    "cortisol_high": 1.5
  },
  "warnings": {
    "bioavailability": "Orale Bioverfügbarkeit fraglich – PharmaGABA besser"
  }
}
```

---

#### 42. Beta-Alanin
```json
{
  "ingredient_id": "beta_alanine",
  "ingredient_name": "Beta-Alanin",
  "category": "aminosaeuren",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.0,
    "1": 1.0,
    "2": 1.0,
    "3": 0.5
  },
  "context_modifiers": {
    "true_natural": 1.0,
    "on_trt": 0.5
  },
  "goal_modifiers": {
    "muscle_gain": 1.5,
    "recomposition": 0.8,
    "performance": 2.0
  },
  "peptide_class_modifiers": {
    "longevity": 2.5
  },
  "warnings": {
    "paresthesia": "Kribbeln normal – harmlos, verschwindet mit Zeit"
  }
}
```

---

#### 43. HMB (β-Hydroxy-β-Methylbutyrat)
```json
{
  "ingredient_id": "hmb",
  "ingredient_name": "HMB",
  "category": "aminosaeuren",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 2.0,
    "2": 1.0,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 3.0,
    "enhanced_no_trt": 5.0,
    "on_trt": -4.0
  },
  "goal_modifiers": {
    "fat_loss": 3.0,
    "muscle_gain": 1.0,
    "recomposition": 2.5
  },
  "calorie_modifiers": {
    "in_deficit": 3.0
  },
  "peptide_class_modifiers": {
    "metabolic": 2.5
  },
  "compound_synergies": {
    "retatrutide": 4.0,
    "tirzepatide": 3.0
  },
  "warnings": {
    "on_trt": "TRT schützt Muskeln hormonell – HMB wird redundant",
    "enhanced_no_trt": "KRITISCH bei Peptiden ohne TRT – Muskelabbau-Schutz essentiell!"
  }
}
```

---

#### 44. EAA (Essential Amino Acids)
```json
{
  "ingredient_id": "eaa",
  "ingredient_name": "EAA",
  "category": "aminosaeuren",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.5,
    "2": 1.0,
    "3": 0.5
  },
  "context_modifiers": {
    "true_natural": 1.5,
    "enhanced_no_trt": 3.0,
    "on_trt": 0.0
  },
  "goal_modifiers": {
    "muscle_gain": 1.5,
    "fat_loss": 1.5,
    "recomposition": 2.0,
    "performance": 2.0
  },
  "calorie_modifiers": {
    "in_deficit": 3.0,
    "in_surplus": 2.0
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 1.5,
    "metabolic": 2.5
  },
  "compound_synergies": {
    "retatrutide": 3.0,
    "tirzepatide": 2.0
  },
  "warnings": {
    "enhanced_no_trt": "Muskelschutz bei GLP-1 ohne Hormontherapie!"
  }
}
```

---

#### 45. BCAA
```json
{
  "ingredient_id": "bcaa",
  "ingredient_name": "BCAA",
  "category": "aminosaeuren",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 0.5,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 0.5,
    "on_trt": -1.0
  },
  "goal_modifiers": {
    "muscle_gain": 0.5,
    "recomposition": 0.2,
    "performance": 2.0
  },
  "calorie_modifiers": {
    "in_deficit": 3.0
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 1.5
  },
  "warnings": {
    "general": "EAA sind BCAAs überlegen – enthalten alle essentiellen Aminosäuren"
  }
}
```

---

#### 46. L-Lysin
```json
{
  "ingredient_id": "lysine",
  "ingredient_name": "L-Lysin",
  "category": "aminosaeuren",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.0,
    "3": 0.0
  },
  "compound_synergies": {
    "bpc_157": 1.5,
    "tb_500": 1.5
  }
}
```

---

#### 47. NAC (N-Acetyl-Cystein)
```json
{
  "ingredient_id": "nac",
  "ingredient_name": "NAC",
  "category": "aminosaeuren",
  "base_score": 8.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 1.0,
    "3": 1.0
  },
  "context_modifiers": {
    "on_trt": 1.0
  },
  "goal_modifiers": {
    "longevity": 1.5
  },
  "peptide_class_modifiers": {
    "immune": 3.0
  },
  "bloodwork_triggers": {
    "inflammation_high": 2.0,
    "homocysteine_high": 1.5
  }
}
```

---

#### 48. Betain (TMG)
```json
{
  "ingredient_id": "betaine",
  "ingredient_name": "Betain (TMG)",
  "category": "aminosaeuren",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  },
  "context_modifiers": {
    "true_natural": 0.5
  },
  "goal_modifiers": {
    "muscle_gain": 1.0,
    "longevity": 1.0,
    "recomposition": 0.5
  },
  "bloodwork_triggers": {
    "homocysteine_high": 3.0
  }
}
```

---

#### 49. L-Methionin
```json
{
  "ingredient_id": "methionine",
  "ingredient_name": "L-Methionin",
  "category": "aminosaeuren",
  "base_score": 5.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  },
  "goal_modifiers": {
    "longevity": -1.0
  },
  "bloodwork_triggers": {
    "homocysteine_high": -2.0
  },
  "warnings": {
    "homocysteine": "Erhöht Homocystein – bei hohen Werten meiden"
  }
}
```

---

#### 50. L-Histidin
```json
{
  "ingredient_id": "histidine",
  "ingredient_name": "L-Histidin",
  "category": "aminosaeuren",
  "base_score": 5.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  }
}
```

---

#### 51. L-Phenylalanin
```json
{
  "ingredient_id": "phenylalanine",
  "ingredient_name": "L-Phenylalanin",
  "category": "aminosaeuren",
  "base_score": 5.5,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 0.0,
    "3": 0.0
  },
  "goal_modifiers": {
    "cognitive": 1.0
  },
  "peptide_class_modifiers": {
    "longevity": 2.5
  },
  "warnings": {
    "pku": "Kontraindiziert bei PKU (Phenylketonurie)"
  }
}
```

---

#### 52. L-Ornithin
```json
{
  "ingredient_id": "ornithine",
  "ingredient_name": "L-Ornithin",
  "category": "aminosaeuren",
  "base_score": 5.5,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 0.0,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 1.0
  },
  "goal_modifiers": {
    "sleep": 1.0
  },
  "compound_synergies": {
    "cjc_1295": -2.0,
    "ipamorelin": -2.0
  },
  "warnings": {
    "cjc_ipamorelin": "Redundant bei GH-Sekretagogen"
  }
}
```

---

#### 53. L-Threonin
```json
{
  "ingredient_id": "threonine",
  "ingredient_name": "L-Threonin",
  "category": "aminosaeuren",
  "base_score": 5.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  },
  "goal_modifiers": {
    "gut_health": 0.5
  }
}
```

---

#### 54. L-Leucin
```json
{
  "ingredient_id": "leucine",
  "ingredient_name": "L-Leucin",
  "category": "aminosaeuren",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 1.0,
    "2": 0.5,
    "3": 0.0
  },
  "context_modifiers": {
    "enhanced_no_trt": 2.0,
    "on_trt": -0.5
  },
  "goal_modifiers": {
    "muscle_gain": 2.0,
    "fat_loss": 1.0,
    "recomposition": 2.0
  },
  "compound_synergies": {
    "retatrutide": 2.0
  }
}
```


---

### KATEGORIE: FETTSÄUREN (8 Wirkstoffe)

---

#### 55. Omega-3 EPA
```json
{
  "ingredient_id": "omega3_epa",
  "ingredient_name": "Omega-3 EPA",
  "category": "fettsaeuren",
  "base_score": 9.0,
  "phase_modifiers": {
    "0": 1.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.5
  },
  "context_modifiers": {
    "true_natural": 0.5,
    "on_trt": 1.5
  },
  "goal_modifiers": {
    "longevity": 1.5,
    "cognitive": 1.0,
    "maintenance": 1.5
  },
  "peptide_class_modifiers": {
    "nootropic": 3.0
  },
  "demographic_modifiers": {
    "age_over_40": 2.5,
    "age_over_50": 2.0,
    "age_over_60": 2.6
  },
  "bloodwork_triggers": {
    "inflammation_high": 3.0,
    "hdl_low": 2.0,
    "triglycerides_high": 3.0
  },
  "warnings": {
    "on_trt": "TRT kann Entzündungen erhöhen – EPA ist kardioprotektiv"
  }
}
```

---

#### 56. Omega-3 DHA
```json
{
  "ingredient_id": "omega3_dha",
  "ingredient_name": "Omega-3 DHA",
  "category": "fettsaeuren",
  "base_score": 9.0,
  "phase_modifiers": {
    "0": 1.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.5
  },
  "context_modifiers": {
    "true_natural": 0.5,
    "on_trt": 1.0
  },
  "goal_modifiers": {
    "cognitive": 2.0,
    "longevity": 1.5,
    "maintenance": 1.5
  },
  "peptide_class_modifiers": {
    "nootropic": 3.0
  },
  "demographic_modifiers": {
    "age_over_40": 2.5,
    "age_over_50": 2.0,
    "age_over_60": 2.6
  },
  "bloodwork_triggers": {
    "inflammation_high": 2.0
  }
}
```

---

#### 57. MCT-Öl
```json
{
  "ingredient_id": "mct_oil",
  "ingredient_name": "MCT-Öl",
  "category": "fettsaeuren",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.0
  },
  "context_modifiers": {
    "on_glp1": -1.0
  },
  "goal_modifiers": {
    "fat_loss": 1.0,
    "cognitive": 1.5,
    "recomposition": 0.5
  },
  "compound_synergies": {
    "retatrutide": -2.0,
    "tirzepatide": -1.5
  },
  "warnings": {
    "on_glp1": "Kann GI-Beschwerden bei GLP-1 verstärken"
  }
}
```

---

#### 58. CLA
```json
{
  "ingredient_id": "cla",
  "ingredient_name": "CLA",
  "category": "fettsaeuren",
  "base_score": 5.5,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 0.5,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 1.0
  },
  "goal_modifiers": {
    "fat_loss": 1.0,
    "recomposition": 0.5
  },
  "compound_synergies": {
    "retatrutide": -2.0
  },
  "warnings": {
    "retatrutide": "Redundant bei GLP-1 – diese sind deutlich potenter für Fettabbau"
  }
}
```

---

#### 59. Schwarzkümmelöl
```json
{
  "ingredient_id": "black_seed_oil",
  "ingredient_name": "Schwarzkümmelöl",
  "category": "fettsaeuren",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  },
  "goal_modifiers": {
    "longevity": 1.0
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.5,
    "glucose_high": 1.0
  }
}
```

---

#### 60. GLA (Gamma-Linolensäure)
```json
{
  "ingredient_id": "gla",
  "ingredient_name": "GLA",
  "category": "fettsaeuren",
  "base_score": 5.5,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.0,
    "3": 0.5
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.0
  }
}
```

---

#### 61. Phosphatidylcholin
```json
{
  "ingredient_id": "phosphatidylcholine",
  "ingredient_name": "Phosphatidylcholin",
  "category": "fettsaeuren",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 1.0
  },
  "goal_modifiers": {
    "cognitive": 2.0,
    "longevity": 1.0
  },
  "peptide_class_modifiers": {
    "nootropic": 3.0
  }
}
```

---

#### 62. Krill-Öl
```json
{
  "ingredient_id": "krill_oil",
  "ingredient_name": "Krill-Öl",
  "category": "fettsaeuren",
  "base_score": 8.0,
  "phase_modifiers": {
    "0": 1.0,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  },
  "context_modifiers": {
    "on_trt": 1.0
  },
  "goal_modifiers": {
    "longevity": 1.5,
    "cognitive": 1.0
  },
  "bloodwork_triggers": {
    "inflammation_high": 2.0,
    "triglycerides_high": 2.5
  },
  "warnings": {
    "shellfish_allergy": "Nicht bei Schalentier-Allergie"
  }
}
```

---

### KATEGORIE: ADAPTOGENE & PFLANZENEXTRAKTE (28 Wirkstoffe)

---

#### 63. Ashwagandha
```json
{
  "ingredient_id": "ashwagandha",
  "ingredient_name": "Ashwagandha",
  "category": "adaptogene",
  "base_score": 8.5,
  "phase_modifiers": {
    "0": 2.0,
    "1": 1.0,
    "2": 0.5,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 2.5,
    "enhanced_no_trt": 1.0,
    "on_trt": -1.0
  },
  "goal_modifiers": {
    "muscle_gain": 1.0,
    "sleep": 1.0,
    "recomposition": 0.5
  },
  "peptide_class_modifiers": {
    "nootropic": 3.0,
    "testo": 2.5
  },
  "demographic_modifiers": {
    "is_male": 1.0
  },
  "bloodwork_triggers": {
    "cortisol_high": 4.0,
    "testosterone_low": 2.0,
    "thyroid_slow": -2.0
  },
  "warnings": {
    "on_trt": "Testosteron-Boost redundant bei exogenem Testosteron",
    "thyroid": "Kann Schilddrüsenfunktion stimulieren – bei Hyperthyreose meiden"
  }
}
```

---

#### 64. Rhodiola rosea
```json
{
  "ingredient_id": "rhodiola",
  "ingredient_name": "Rhodiola rosea",
  "category": "adaptogene",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 1.0,
    "1": 1.0,
    "2": 0.5,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 1.0
  },
  "goal_modifiers": {
    "cognitive": 1.5,
    "fat_loss": 0.5,
    "recomposition": 0.2
  },
  "peptide_class_modifiers": {
    "nootropic": 2.0
  },
  "bloodwork_triggers": {
    "cortisol_high": 2.0
  }
}
```

---

#### 65. Panax Ginseng
```json
{
  "ingredient_id": "ginseng",
  "ingredient_name": "Panax Ginseng",
  "category": "adaptogene",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  },
  "context_modifiers": {
    "true_natural": 1.5
  },
  "goal_modifiers": {
    "cognitive": 1.0
  },
  "bloodwork_triggers": {
    "glucose_high": 1.0
  }
}
```

---

#### 66. Maca
```json
{
  "ingredient_id": "maca",
  "ingredient_name": "Maca",
  "category": "adaptogene",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.0,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 1.5,
    "on_trt": -1.0
  },
  "peptide_class_modifiers": {
    "testo": 2.0
  },
  "bloodwork_triggers": {
    "testosterone_low": 1.0
  },
  "warnings": {
    "on_trt": "Limitierter Nutzen bei exogenem Testosteron"
  }
}
```

---

#### 67. Curcumin/Kurkuma
```json
{
  "ingredient_id": "curcumin",
  "ingredient_name": "Curcumin",
  "category": "adaptogene",
  "base_score": 8.0,
  "phase_modifiers": {
    "0": 1.0,
    "1": 1.0,
    "2": 0.5,
    "3": 0.5
  },
  "context_modifiers": {
    "on_trt": 1.0
  },
  "goal_modifiers": {
    "longevity": 1.5
  },
  "peptide_class_modifiers": {
    "healing": 3.0
  },
  "demographic_modifiers": {
    "age_over_40": 2.0,
    "age_over_50": 2.0,
    "age_over_60": 2.6
  },
  "bloodwork_triggers": {
    "inflammation_high": 3.5,
    "ldl_high": 1.0
  },
  "compound_synergies": {
    "tb_500": 2.0
  },
  "warnings": {
    "bioavailability": "Benötigt Piperin oder liposomale Form für Absorption"
  }
}
```

---

#### 68. Ingwer
```json
{
  "ingredient_id": "ginger",
  "ingredient_name": "Ingwer",
  "category": "adaptogene",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  },
  "context_modifiers": {
    "on_glp1": 2.0
  },
  "goal_modifiers": {
    "gut_health": 1.5
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.5
  },
  "compound_synergies": {
    "retatrutide": 2.0,
    "tirzepatide": 1.5,
    "semaglutide": 1.5
  },
  "warnings": {
    "on_glp1": "Hilft bei GLP-1-bedingter Übelkeit"
  }
}
```

---

#### 69. Grüntee-Extrakt (EGCG)
```json
{
  "ingredient_id": "egcg",
  "ingredient_name": "EGCG",
  "category": "adaptogene",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.5
  },
  "context_modifiers": {
    "true_natural": 1.0
  },
  "goal_modifiers": {
    "fat_loss": 1.5,
    "longevity": 1.0,
    "recomposition": 0.8
  },
  "calorie_modifiers": {
    "in_deficit": 2.0
  },
  "warnings": {
    "liver": "Hohe Dosen können lebertoxisch sein – max. 400mg/Tag"
  }
}
```

---

#### 70. OPC (Traubenkernextrakt)
```json
{
  "ingredient_id": "opc",
  "ingredient_name": "OPC",
  "category": "adaptogene",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 1.0
  },
  "context_modifiers": {
    "on_trt": 1.0
  },
  "goal_modifiers": {
    "longevity": 1.5
  },
  "bloodwork_triggers": {
    "ldl_high": 1.5,
    "inflammation_high": 1.0
  }
}
```

---

#### 71. Resveratrol
```json
{
  "ingredient_id": "resveratrol",
  "ingredient_name": "Resveratrol",
  "category": "adaptogene",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 0.5,
    "3": 1.5
  },
  "goal_modifiers": {
    "longevity": 2.5
  },
  "peptide_class_modifiers": {
    "longevity": 4.0
  },
  "demographic_modifiers": {
    "age_over_40": 2.5,
    "age_over_50": 3.0,
    "age_over_60": 3.9
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.0
  },
  "warnings": {
    "bioavailability": "Niedrige Bioverfügbarkeit – Pterostilben oft effektiver"
  }
}
```

---

#### 72. Quercetin
```json
{
  "ingredient_id": "quercetin",
  "ingredient_name": "Quercetin",
  "category": "adaptogene",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 1.5
  },
  "goal_modifiers": {
    "longevity": 2.0
  },
  "peptide_class_modifiers": {
    "immune": 3.0,
    "longevity": 4.0
  },
  "demographic_modifiers": {
    "age_over_50": 3.5,
    "age_over_60": 4.5
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.5
  }
}
```

---

#### 73. Fisetin
```json
{
  "ingredient_id": "fisetin",
  "ingredient_name": "Fisetin",
  "category": "adaptogene",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.5,
    "3": 2.0
  },
  "goal_modifiers": {
    "longevity": 3.0
  },
  "peptide_class_modifiers": {
    "longevity": 4.0
  },
  "demographic_modifiers": {
    "age_over_50": 3.5,
    "age_over_60": 4.5
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.0
  },
  "warnings": {
    "phase_dependent": "Senolytikum – primär für Phase 3 Longevity-Fokus"
  }
}
```

---

#### 74. Berberin
```json
{
  "ingredient_id": "berberine",
  "ingredient_name": "Berberin",
  "category": "adaptogene",
  "base_score": 8.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 2.0,
    "2": 1.5,
    "3": 1.0
  },
  "context_modifiers": {
    "on_glp1": -2.0
  },
  "goal_modifiers": {
    "fat_loss": 2.0,
    "longevity": 1.5,
    "recomposition": 1.0
  },
  "bloodwork_triggers": {
    "glucose_high": 4.0,
    "insulin_resistant": 3.5,
    "hba1c_elevated": 3.0,
    "ldl_high": 2.0
  },
  "compound_synergies": {
    "retatrutide": -3.0,
    "tirzepatide": -2.5,
    "semaglutide": -2.0
  },
  "warnings": {
    "on_glp1": "Potenziell redundant – beide wirken auf Glukosestoffwechsel",
    "hypoglycemia": "Vorsicht bei gleichzeitiger Diabetes-Medikation"
  }
}
```

---

#### 75. Mariendistel (Silymarin)
```json
{
  "ingredient_id": "milk_thistle",
  "ingredient_name": "Mariendistel",
  "category": "adaptogene",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.5
  },
  "context_modifiers": {
    "on_trt": 2.0
  },
  "bloodwork_triggers": {
    "alt_high": 3.0,
    "ast_high": 3.0
  },
  "warnings": {
    "on_trt": "Leberschutz wichtig bei oralen Steroiden/TRT"
  }
}
```

---

#### 76. Ginkgo biloba
```json
{
  "ingredient_id": "ginkgo",
  "ingredient_name": "Ginkgo biloba",
  "category": "adaptogene",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 1.0
  },
  "goal_modifiers": {
    "cognitive": 2.0,
    "longevity": 1.0
  },
  "peptide_class_modifiers": {
    "nootropic": 2.0
  },
  "warnings": {
    "blood_thinners": "Blutverdünnende Wirkung – Vorsicht bei Antikoagulantien"
  }
}
```

---

#### 77. Bacopa Monnieri
```json
{
  "ingredient_id": "bacopa",
  "ingredient_name": "Bacopa Monnieri",
  "category": "adaptogene",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 1.0,
    "3": 1.0
  },
  "goal_modifiers": {
    "cognitive": 2.5
  },
  "peptide_class_modifiers": {
    "nootropic": 3.0
  },
  "warnings": {
    "fatigue": "Kann initial Müdigkeit verursachen – 4-6 Wochen für volle Wirkung"
  }
}
```

---

#### 78. Baldrian
```json
{
  "ingredient_id": "valerian",
  "ingredient_name": "Baldrian",
  "category": "adaptogene",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.0,
    "3": 0.0
  },
  "goal_modifiers": {
    "sleep": 2.0
  }
}
```

---

#### 79. Passionsblume
```json
{
  "ingredient_id": "passionflower",
  "ingredient_name": "Passionsblume",
  "category": "adaptogene",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.0,
    "3": 0.0
  },
  "goal_modifiers": {
    "sleep": 1.5
  },
  "bloodwork_triggers": {
    "cortisol_high": 1.0
  }
}
```

---

#### 80. Boswellia (Weihrauch)
```json
{
  "ingredient_id": "boswellia",
  "ingredient_name": "Boswellia",
  "category": "adaptogene",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  },
  "peptide_class_modifiers": {
    "healing": 3.0
  },
  "demographic_modifiers": {
    "age_over_40": 2.0
  },
  "bloodwork_triggers": {
    "inflammation_high": 2.5
  }
}
```

---

#### 81. Tongkat Ali
```json
{
  "ingredient_id": "tongkat_ali",
  "ingredient_name": "Tongkat Ali",
  "category": "adaptogene",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 1.0,
    "1": 1.0,
    "2": 0.5,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 3.0,
    "enhanced_no_trt": 1.5,
    "on_trt": -5.0
  },
  "goal_modifiers": {
    "muscle_gain": 1.0,
    "recomposition": 0.5
  },
  "peptide_class_modifiers": {
    "testo": 2.5
  },
  "demographic_modifiers": {
    "is_female": -3.0,
    "is_male": 1.5
  },
  "bloodwork_triggers": {
    "testosterone_low": 3.0,
    "cortisol_high": 1.5
  },
  "warnings": {
    "on_trt": "KOMPLETT REDUNDANT bei exogenem Testosteron – Geldverschwendung!"
  }
}
```

---

#### 82. Pterostilben
```json
{
  "ingredient_id": "pterostilbene",
  "ingredient_name": "Pterostilben",
  "category": "adaptogene",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 0.5,
    "3": 1.5
  },
  "goal_modifiers": {
    "longevity": 2.5,
    "cognitive": 1.0
  },
  "peptide_class_modifiers": {
    "longevity": 4.0
  },
  "demographic_modifiers": {
    "age_over_50": 3.0,
    "age_over_60": 3.9
  },
  "bloodwork_triggers": {
    "ldl_high": 1.5
  }
}
```

---

#### 83. Apigenin
```json
{
  "ingredient_id": "apigenin",
  "ingredient_name": "Apigenin",
  "category": "adaptogene",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 1.0
  },
  "goal_modifiers": {
    "sleep": 2.0,
    "longevity": 1.0
  }
}
```

---

#### 84. Schisandra
```json
{
  "ingredient_id": "schisandra",
  "ingredient_name": "Schisandra",
  "category": "adaptogene",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  },
  "goal_modifiers": {
    "cognitive": 1.0
  },
  "bloodwork_triggers": {
    "cortisol_high": 1.5
  }
}
```

---

#### 85. Holunder
```json
{
  "ingredient_id": "elderberry",
  "ingredient_name": "Holunder",
  "category": "adaptogene",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.0,
    "3": 0.0
  },
  "peptide_class_modifiers": {
    "immune": 3.0
  }
}
```

---

#### 86. Hagebutte
```json
{
  "ingredient_id": "rosehip",
  "ingredient_name": "Hagebutte",
  "category": "adaptogene",
  "base_score": 5.5,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.0,
    "3": 0.5
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.0
  }
}
```

---

#### 87. Artischocke
```json
{
  "ingredient_id": "artichoke",
  "ingredient_name": "Artischocke",
  "category": "adaptogene",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  },
  "goal_modifiers": {
    "gut_health": 1.0
  },
  "bloodwork_triggers": {
    "ldl_high": 1.5
  }
}
```

---

#### 88. Pinienrinden-Extrakt (Pycnogenol)
```json
{
  "ingredient_id": "pine_bark",
  "ingredient_name": "Pinienrinden-Extrakt",
  "category": "adaptogene",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 1.0
  },
  "context_modifiers": {
    "on_trt": 1.0
  },
  "goal_modifiers": {
    "longevity": 1.0
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.5,
    "glucose_high": 1.0
  }
}
```

---

#### 89. Citrus Bergamot
```json
{
  "ingredient_id": "bergamot",
  "ingredient_name": "Citrus Bergamot",
  "category": "adaptogene",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 2.0,
    "2": 1.5,
    "3": 1.0
  },
  "context_modifiers": {
    "on_trt": 4.0
  },
  "bloodwork_triggers": {
    "hdl_low": 4.0,
    "ldl_high": 3.0,
    "apob_high": 3.0,
    "triglycerides_high": 2.5
  },
  "warnings": {
    "on_trt": "ESSENTIELL bei TRT – schützt Lipidprofil vor negativen Effekten!"
  }
}
```

---

#### 90. D-Asparaginsäure
```json
{
  "ingredient_id": "daa",
  "ingredient_name": "D-Asparaginsäure",
  "category": "adaptogene",
  "base_score": 5.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.0,
    "3": 0.0
  },
  "context_modifiers": {
    "true_natural": 2.0,
    "on_trt": -5.0
  },
  "peptide_class_modifiers": {
    "testo": 2.0
  },
  "demographic_modifiers": {
    "is_female": -3.0,
    "is_male": 1.5
  },
  "bloodwork_triggers": {
    "testosterone_low": 2.0
  },
  "warnings": {
    "on_trt": "KOMPLETT REDUNDANT bei exogenem Testosteron"
  }
}
```


---

### KATEGORIE: VITALPILZE (7 Wirkstoffe)

---

#### 91. Lion's Mane
```json
{
  "ingredient_id": "lions_mane",
  "ingredient_name": "Lion's Mane",
  "category": "vitalpilze",
  "base_score": 8.5,
  "phase_modifiers": {
    "0": 1.0,
    "1": 1.0,
    "2": 1.0,
    "3": 1.5
  },
  "goal_modifiers": {
    "cognitive": 3.0,
    "longevity": 1.5
  },
  "peptide_class_modifiers": {
    "nootropic": 3.0
  }
}
```

---

#### 92. Reishi
```json
{
  "ingredient_id": "reishi",
  "ingredient_name": "Reishi",
  "category": "vitalpilze",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 1.5
  },
  "goal_modifiers": {
    "sleep": 1.5,
    "longevity": 2.0
  },
  "bloodwork_triggers": {
    "cortisol_high": 1.5
  }
}
```

---

#### 93. Cordyceps
```json
{
  "ingredient_id": "cordyceps",
  "ingredient_name": "Cordyceps",
  "category": "vitalpilze",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 1.0,
    "3": 1.0
  },
  "context_modifiers": {
    "true_natural": 1.0,
    "on_trt": 0.5
  },
  "goal_modifiers": {
    "muscle_gain": 1.0,
    "longevity": 1.0,
    "recomposition": 0.5
  }
}
```

---

#### 94. Chaga
```json
{
  "ingredient_id": "chaga",
  "ingredient_name": "Chaga",
  "category": "vitalpilze",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 1.0
  },
  "goal_modifiers": {
    "longevity": 1.5
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.5,
    "glucose_high": 1.0
  }
}
```

---

#### 95. Shiitake
```json
{
  "ingredient_id": "shiitake",
  "ingredient_name": "Shiitake",
  "category": "vitalpilze",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  },
  "goal_modifiers": {
    "longevity": 0.5
  },
  "bloodwork_triggers": {
    "ldl_high": 1.0
  }
}
```

---

#### 96. Maitake
```json
{
  "ingredient_id": "maitake",
  "ingredient_name": "Maitake",
  "category": "vitalpilze",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  },
  "bloodwork_triggers": {
    "glucose_high": 1.0
  }
}
```

---

#### 97. Agaricus blazei
```json
{
  "ingredient_id": "agaricus",
  "ingredient_name": "Agaricus blazei",
  "category": "vitalpilze",
  "base_score": 5.5,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.5,
    "3": 0.5
  },
  "goal_modifiers": {
    "longevity": 0.5
  }
}
```

---

### KATEGORIE: ANTIOXIDANTIEN & COFAKTOREN (9 Wirkstoffe)

---

#### 98. Coenzym Q10 (Ubiquinol)
```json
{
  "ingredient_id": "coq10",
  "ingredient_name": "CoQ10",
  "category": "antioxidantien",
  "base_score": 8.5,
  "phase_modifiers": {
    "0": 1.0,
    "1": 1.0,
    "2": 1.0,
    "3": 1.5
  },
  "context_modifiers": {
    "on_trt": 1.5
  },
  "goal_modifiers": {
    "longevity": 2.0,
    "cognitive": 1.0,
    "performance": 1.0
  },
  "peptide_class_modifiers": {
    "longevity": 2.5
  },
  "demographic_modifiers": {
    "age_over_40": 2.5,
    "age_over_50": 3.0,
    "age_over_60": 3.9
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.0
  },
  "warnings": {
    "on_statins": "ESSENTIELL bei Statin-Einnahme – diese depleten CoQ10!"
  }
}
```

---

#### 99. Alpha-Liponsäure (R-ALA)
```json
{
  "ingredient_id": "ala",
  "ingredient_name": "Alpha-Liponsäure",
  "category": "antioxidantien",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 1.0,
    "3": 1.0
  },
  "goal_modifiers": {
    "longevity": 1.5,
    "fat_loss": 1.0,
    "recomposition": 0.5
  },
  "peptide_class_modifiers": {
    "longevity": 2.5
  },
  "demographic_modifiers": {
    "age_over_50": 3.0,
    "age_over_60": 3.9
  },
  "bloodwork_triggers": {
    "glucose_high": 2.5,
    "insulin_resistant": 2.0
  }
}
```

---

#### 100. PQQ (Pyrrolochinolinchinon)
```json
{
  "ingredient_id": "pqq",
  "ingredient_name": "PQQ",
  "category": "antioxidantien",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 1.0,
    "3": 2.0
  },
  "goal_modifiers": {
    "longevity": 2.5,
    "cognitive": 1.5
  },
  "peptide_class_modifiers": {
    "longevity": 2.5
  },
  "demographic_modifiers": {
    "age_over_40": 2.5,
    "age_over_50": 3.0,
    "age_over_60": 3.9
  }
}
```

---

#### 101. Astaxanthin
```json
{
  "ingredient_id": "astaxanthin",
  "ingredient_name": "Astaxanthin",
  "category": "antioxidantien",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 1.0
  },
  "context_modifiers": {
    "on_trt": 0.5
  },
  "goal_modifiers": {
    "longevity": 1.5
  },
  "peptide_class_modifiers": {
    "longevity": 2.5
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.5
  }
}
```

---

#### 102. Lutein
```json
{
  "ingredient_id": "lutein",
  "ingredient_name": "Lutein",
  "category": "antioxidantien",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.5,
    "3": 1.0
  },
  "goal_modifiers": {
    "longevity": 1.0
  }
}
```

---

#### 103. Zeaxanthin
```json
{
  "ingredient_id": "zeaxanthin",
  "ingredient_name": "Zeaxanthin",
  "category": "antioxidantien",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.5,
    "3": 1.0
  },
  "goal_modifiers": {
    "longevity": 1.0
  }
}
```

---

#### 104. Glutathion
```json
{
  "ingredient_id": "glutathione",
  "ingredient_name": "Glutathion",
  "category": "antioxidantien",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 1.0,
    "3": 1.5
  },
  "context_modifiers": {
    "on_trt": 1.0
  },
  "goal_modifiers": {
    "longevity": 2.0
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.5
  },
  "warnings": {
    "bioavailability": "Liposomale Form notwendig für orale Absorption"
  }
}
```

---

#### 105. SOD (Superoxid-Dismutase)
```json
{
  "ingredient_id": "sod",
  "ingredient_name": "SOD",
  "category": "antioxidantien",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.5,
    "3": 1.0
  },
  "goal_modifiers": {
    "longevity": 1.5
  },
  "warnings": {
    "bioavailability": "Orale Bioverfügbarkeit fraglich"
  }
}
```

---

#### 106. Lycopin
```json
{
  "ingredient_id": "lycopene",
  "ingredient_name": "Lycopin",
  "category": "antioxidantien",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.5,
    "3": 1.0
  },
  "goal_modifiers": {
    "longevity": 1.0
  }
}
```

---

### KATEGORIE: LONGEVITY & NAD+ (7 Wirkstoffe)

---

#### 107. NMN (Nicotinamid Mononukleotid)
```json
{
  "ingredient_id": "nmn",
  "ingredient_name": "NMN",
  "category": "longevity",
  "base_score": 8.5,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 1.0,
    "3": 3.0
  },
  "goal_modifiers": {
    "longevity": 4.0,
    "cognitive": 1.0
  },
  "peptide_class_modifiers": {
    "longevity": 4.0
  },
  "demographic_modifiers": {
    "age_over_40": 2.5,
    "age_over_50": 3.5,
    "age_over_60": 4.5
  },
  "warnings": {
    "phase_dependent": "Primär für Phase 3 Longevity-Fokus – teuer in frühen Phasen"
  }
}
```

---

#### 108. NR (Nicotinamid Ribosid)
```json
{
  "ingredient_id": "nr",
  "ingredient_name": "NR",
  "category": "longevity",
  "base_score": 8.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 1.0,
    "3": 2.5
  },
  "goal_modifiers": {
    "longevity": 3.5,
    "cognitive": 0.5
  }
}
```

---

#### 109. Spermidin
```json
{
  "ingredient_id": "spermidine",
  "ingredient_name": "Spermidin",
  "category": "longevity",
  "base_score": 8.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 1.0,
    "3": 2.5
  },
  "goal_modifiers": {
    "longevity": 3.5
  },
  "peptide_class_modifiers": {
    "longevity": 4.0
  },
  "demographic_modifiers": {
    "age_over_50": 3.5,
    "age_over_60": 4.5
  }
}
```

---

#### 110. Urolithin A
```json
{
  "ingredient_id": "urolithin_a",
  "ingredient_name": "Urolithin A",
  "category": "longevity",
  "base_score": 8.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 1.0,
    "3": 2.5
  },
  "goal_modifiers": {
    "longevity": 3.5,
    "muscle_gain": 1.0,
    "recomposition": 0.5
  }
}
```

---

#### 111. TUDCA
```json
{
  "ingredient_id": "tudca",
  "ingredient_name": "TUDCA",
  "category": "longevity",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 1.0,
    "3": 1.5
  },
  "context_modifiers": {
    "on_trt": 3.0
  },
  "goal_modifiers": {
    "longevity": 1.5,
    "gut_health": 1.0
  },
  "bloodwork_triggers": {
    "alt_high": 4.0,
    "ast_high": 3.5
  },
  "warnings": {
    "on_trt": "Leberschutz – ESSENTIELL bei oralen Steroiden!"
  }
}
```

---

#### 112. Calcium Alpha-Ketoglutarat
```json
{
  "ingredient_id": "ca_akg",
  "ingredient_name": "Ca-AKG",
  "category": "longevity",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 0.5,
    "3": 2.0
  },
  "goal_modifiers": {
    "longevity": 3.0
  }
}
```

---

#### 113. Rapamycin (Sirolimus) - VERSCHREIBUNGSPFLICHTIG
```json
{
  "ingredient_id": "rapamycin",
  "ingredient_name": "Rapamycin",
  "category": "longevity",
  "base_score": 0.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  },
  "warnings": {
    "prescription": "VERSCHREIBUNGSPFLICHTIG – nicht als Supplement erhältlich",
    "medical_supervision": "Nur unter ärztlicher Aufsicht"
  }
}
```

---

### KATEGORIE: DARMGESUNDHEIT (5 Wirkstoffe)

---

#### 114. Probiotika (Lactobacillus)
```json
{
  "ingredient_id": "probiotics_lacto",
  "ingredient_name": "Probiotika (Lactobacillus)",
  "category": "darm",
  "base_score": 8.0,
  "phase_modifiers": {
    "0": 1.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.5
  },
  "context_modifiers": {
    "on_glp1": 2.0
  },
  "goal_modifiers": {
    "gut_health": 3.0
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.0
  },
  "compound_synergies": {
    "retatrutide": 2.0,
    "tirzepatide": 1.5
  },
  "warnings": {
    "on_glp1": "GLP-1 kann Darmflora stören – Probiotika unterstützen"
  }
}
```

---

#### 115. Probiotika (Bifidobacterium)
```json
{
  "ingredient_id": "probiotics_bifido",
  "ingredient_name": "Probiotika (Bifidobacterium)",
  "category": "darm",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 1.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.5
  },
  "context_modifiers": {
    "on_glp1": 1.5
  },
  "goal_modifiers": {
    "gut_health": 2.5
  },
  "compound_synergies": {
    "retatrutide": 1.5
  }
}
```

---

#### 116. Präbiotika (Inulin/FOS)
```json
{
  "ingredient_id": "prebiotics",
  "ingredient_name": "Präbiotika",
  "category": "darm",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 1.0,
    "1": 1.0,
    "2": 0.5,
    "3": 0.5
  },
  "goal_modifiers": {
    "gut_health": 2.0
  },
  "warnings": {
    "bloating": "Langsam einschleichen – kann Blähungen verursachen"
  }
}
```

---

#### 117. Flohsamenschalen (Psyllium)
```json
{
  "ingredient_id": "psyllium",
  "ingredient_name": "Flohsamenschalen",
  "category": "darm",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 1.0,
    "1": 1.5,
    "2": 1.0,
    "3": 0.5
  },
  "context_modifiers": {
    "on_glp1": 1.5
  },
  "goal_modifiers": {
    "gut_health": 2.0,
    "fat_loss": 1.0,
    "recomposition": 0.5
  },
  "bloodwork_triggers": {
    "ldl_high": 1.0,
    "glucose_high": 0.5
  },
  "compound_synergies": {
    "retatrutide": 1.5
  },
  "warnings": {
    "hydration": "Mit viel Wasser einnehmen!"
  }
}
```

---

#### 118. L-Glutamin (Darm)
```json
{
  "ingredient_id": "glutamine_gut",
  "ingredient_name": "L-Glutamin (Darmschleimhaut)",
  "category": "darm",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.5
  },
  "context_modifiers": {
    "on_glp1": 2.5
  },
  "goal_modifiers": {
    "gut_health": 3.0
  },
  "calorie_modifiers": {
    "in_surplus": 2.0
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 2.0,
    "healing": 3.0
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.5
  },
  "compound_synergies": {
    "retatrutide": 2.5,
    "tirzepatide": 2.0,
    "bpc_157": 2.0,
    "tb_500": 2.0
  }
}
```

---

### KATEGORIE: GELENKE & BINDEGEWEBE (5 Wirkstoffe)

---

#### 119. Glucosamin
```json
{
  "ingredient_id": "glucosamine",
  "ingredient_name": "Glucosamin",
  "category": "gelenke",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 1.0,
    "3": 1.0
  },
  "goal_modifiers": {
    "longevity": 1.0
  },
  "peptide_class_modifiers": {
    "healing": 3.0
  },
  "demographic_modifiers": {
    "age_over_40": 2.0,
    "age_over_50": 2.5,
    "age_over_60": 3.2
  },
  "compound_synergies": {
    "bpc_157": 2.0,
    "tb_500": 2.0
  }
}
```

---

#### 120. Chondroitin
```json
{
  "ingredient_id": "chondroitin",
  "ingredient_name": "Chondroitin",
  "category": "gelenke",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 1.0,
    "3": 1.0
  },
  "goal_modifiers": {
    "longevity": 0.5
  },
  "peptide_class_modifiers": {
    "healing": 3.0
  },
  "demographic_modifiers": {
    "age_over_40": 2.0
  },
  "compound_synergies": {
    "bpc_157": 1.5,
    "tb_500": 1.5
  }
}
```

---

#### 121. MSM (Methylsulfonylmethan)
```json
{
  "ingredient_id": "msm",
  "ingredient_name": "MSM",
  "category": "gelenke",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 1.0,
    "3": 1.0
  },
  "peptide_class_modifiers": {
    "healing": 3.0
  },
  "demographic_modifiers": {
    "age_over_40": 2.0
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.5
  },
  "compound_synergies": {
    "bpc_157": 1.5,
    "tb_500": 1.5
  }
}
```

---

#### 122. Kollagen (Typ I, II, III)
```json
{
  "ingredient_id": "collagen",
  "ingredient_name": "Kollagen",
  "category": "gelenke",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 1.0,
    "3": 1.5
  },
  "context_modifiers": {
    "on_glp1": 1.5
  },
  "goal_modifiers": {
    "longevity": 1.5
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 2.0,
    "healing": 3.0,
    "skin": 2.0
  },
  "demographic_modifiers": {
    "age_over_40": 2.5,
    "age_over_50": 2.5,
    "age_over_60": 3.2
  },
  "compound_synergies": {
    "bpc_157": 2.5,
    "retatrutide": 1.5,
    "tb_500": 2.5
  },
  "warnings": {
    "on_glp1": "Unterstützt Bindegewebe bei schnellem Gewichtsverlust"
  }
}
```

---

#### 123. Hyaluronsäure
```json
{
  "ingredient_id": "hyaluronic_acid",
  "ingredient_name": "Hyaluronsäure",
  "category": "gelenke",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 0.5,
    "3": 1.5
  },
  "goal_modifiers": {
    "longevity": 1.0
  },
  "peptide_class_modifiers": {
    "healing": 2.0,
    "skin": 2.0
  },
  "compound_synergies": {
    "bpc_157": 1.0,
    "tb_500": 1.0
  }
}
```

---

### KATEGORIE: NOOTROPICS & GEHIRN (6 Wirkstoffe)

---

#### 124. CDP-Cholin (Citicolin)
```json
{
  "ingredient_id": "citicoline",
  "ingredient_name": "CDP-Cholin",
  "category": "nootropics",
  "base_score": 8.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 1.0,
    "3": 1.5
  },
  "goal_modifiers": {
    "cognitive": 3.0
  },
  "peptide_class_modifiers": {
    "nootropic": 3.0
  }
}
```

---

#### 125. Alpha-GPC
```json
{
  "ingredient_id": "alpha_gpc",
  "ingredient_name": "Alpha-GPC",
  "category": "nootropics",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 1.0,
    "3": 1.0
  },
  "goal_modifiers": {
    "cognitive": 2.5,
    "muscle_gain": 0.5,
    "recomposition": 0.2
  },
  "peptide_class_modifiers": {
    "nootropic": 3.0
  },
  "compound_synergies": {
    "cjc_1295": 1.5,
    "ipamorelin": 1.5
  }
}
```

---

#### 126. Phosphatidylserin
```json
{
  "ingredient_id": "ps",
  "ingredient_name": "Phosphatidylserin",
  "category": "nootropics",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 1.0,
    "3": 1.5
  },
  "goal_modifiers": {
    "cognitive": 2.0,
    "sleep": 0.5
  },
  "peptide_class_modifiers": {
    "nootropic": 3.0
  },
  "bloodwork_triggers": {
    "cortisol_high": 3.0
  },
  "warnings": {
    "cortisol_high": "Senkt Cortisol – ideal bei chronischem Stress"
  }
}
```

---

#### 127. Magnesium-L-Threonat
```json
{
  "ingredient_id": "mg_threonate",
  "ingredient_name": "Magnesium-L-Threonat",
  "category": "nootropics",
  "base_score": 8.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 1.0,
    "3": 1.5
  },
  "goal_modifiers": {
    "cognitive": 3.0,
    "sleep": 1.5,
    "maintenance": 1.5,
    "performance": 1.0
  },
  "calorie_modifiers": {
    "in_deficit": 1.5,
    "in_surplus": 1.0
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 2.0,
    "testo": 2.5,
    "metabolic": 2.5
  },
  "demographic_modifiers": {
    "age_over_40": 1.5,
    "is_female": 1.5,
    "is_male": 1.0
  },
  "bloodwork_triggers": {
    "magnesium_low": 2.0
  }
}
```

---

#### 128. Huperzin A
```json
{
  "ingredient_id": "huperzine",
  "ingredient_name": "Huperzin A",
  "category": "nootropics",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 0.5,
    "3": 1.0
  },
  "goal_modifiers": {
    "cognitive": 2.0
  },
  "warnings": {
    "cycling": "Sollte zykliert werden (5 on, 2 off)"
  }
}
```

---

#### 129. Modafinil - VERSCHREIBUNGSPFLICHTIG
```json
{
  "ingredient_id": "modafinil",
  "ingredient_name": "Modafinil",
  "category": "nootropics",
  "base_score": 0.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  },
  "warnings": {
    "prescription": "VERSCHREIBUNGSPFLICHTIG – nicht als Supplement erhältlich"
  }
}
```

---

### KATEGORIE: ENZYME (6 Wirkstoffe)

---

#### 130. Bromelain
```json
{
  "ingredient_id": "bromelain",
  "ingredient_name": "Bromelain",
  "category": "enzyme",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  },
  "goal_modifiers": {
    "gut_health": 1.0
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.5
  },
  "compound_synergies": {
    "bpc_157": 1.0,
    "tb_500": 1.0
  }
}
```

---

#### 131. Papain
```json
{
  "ingredient_id": "papain",
  "ingredient_name": "Papain",
  "category": "enzyme",
  "base_score": 5.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.0,
    "3": 0.0
  },
  "goal_modifiers": {
    "gut_health": 1.0
  }
}
```

---

#### 132. Nattokinase
```json
{
  "ingredient_id": "nattokinase",
  "ingredient_name": "Nattokinase",
  "category": "enzyme",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 1.0,
    "3": 1.5
  },
  "context_modifiers": {
    "on_trt": 1.5
  },
  "goal_modifiers": {
    "longevity": 2.0
  },
  "warnings": {
    "blood_thinners": "Starke blutverdünnende Wirkung – nicht mit Antikoagulantien!",
    "on_trt": "TRT erhöht Hämatokrit – Nattokinase kann Blutfluss unterstützen"
  }
}
```

---

#### 133. Serrapeptase
```json
{
  "ingredient_id": "serrapeptase",
  "ingredient_name": "Serrapeptase",
  "category": "enzyme",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.5,
    "2": 0.5,
    "3": 1.0
  },
  "bloodwork_triggers": {
    "inflammation_high": 1.0
  }
}
```

---

#### 134. Verdauungsenzyme (Komplex)
```json
{
  "ingredient_id": "digestive_enzymes",
  "ingredient_name": "Verdauungsenzyme",
  "category": "enzyme",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 1.0,
    "1": 1.0,
    "2": 0.5,
    "3": 0.5
  },
  "context_modifiers": {
    "on_glp1": 1.5
  },
  "goal_modifiers": {
    "gut_health": 1.5
  },
  "compound_synergies": {
    "retatrutide": 1.5
  },
  "warnings": {
    "on_glp1": "Unterstützen Verdauung bei reduzierter Magenentleerung"
  }
}
```

---

#### 135. Laktase
```json
{
  "ingredient_id": "lactase",
  "ingredient_name": "Laktase",
  "category": "enzyme",
  "base_score": 5.0,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  },
  "warnings": {
    "conditional": "Nur bei Laktoseintoleranz relevant"
  }
}
```

---

### KATEGORIE: PROTEINE (7 Wirkstoffe)

---

#### 136. Whey Protein
```json
{
  "ingredient_id": "whey",
  "ingredient_name": "Whey Protein",
  "category": "proteine",
  "base_score": 8.0,
  "phase_modifiers": {
    "0": 1.0,
    "1": 1.5,
    "2": 1.0,
    "3": 0.5
  },
  "context_modifiers": {
    "true_natural": 1.0,
    "enhanced_no_trt": 2.0,
    "on_trt": 0.5
  },
  "goal_modifiers": {
    "muscle_gain": 2.0,
    "fat_loss": 1.5,
    "recomposition": 2.2,
    "maintenance": 0.5
  },
  "calorie_modifiers": {
    "in_deficit": 3.0,
    "in_surplus": 2.0
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 1.5,
    "metabolic": 2.5
  },
  "demographic_modifiers": {
    "age_over_50": 2.0,
    "age_over_60": 2.6
  },
  "compound_synergies": {
    "retatrutide": 2.5,
    "tirzepatide": 2.0
  },
  "warnings": {
    "enhanced_no_trt": "Protein kritisch für Muskelerhalt bei GLP-1 ohne TRT!"
  }
}
```

---

#### 137. Casein
```json
{
  "ingredient_id": "casein",
  "ingredient_name": "Casein",
  "category": "proteine",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.5
  },
  "context_modifiers": {
    "enhanced_no_trt": 1.5
  },
  "goal_modifiers": {
    "muscle_gain": 1.5,
    "fat_loss": 1.0,
    "recomposition": 1.8
  },
  "calorie_modifiers": {
    "in_deficit": 3.0,
    "in_surplus": 2.0
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 1.5
  },
  "compound_synergies": {
    "retatrutide": 1.5
  }
}
```

---

#### 138. Erbsenprotein
```json
{
  "ingredient_id": "pea_protein",
  "ingredient_name": "Erbsenprotein",
  "category": "proteine",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.5
  },
  "goal_modifiers": {
    "muscle_gain": 1.0,
    "recomposition": 0.5,
    "maintenance": 0.5
  },
  "calorie_modifiers": {
    "in_deficit": 3.0,
    "in_surplus": 2.0
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 1.5,
    "metabolic": 2.5
  },
  "demographic_modifiers": {
    "age_over_50": 2.0,
    "age_over_60": 2.6
  },
  "warnings": {
    "leucine": "Niedrigerer Leucin-Gehalt als Whey – ggf. kombinieren"
  }
}
```

---

#### 139. Reisprotein
```json
{
  "ingredient_id": "rice_protein",
  "ingredient_name": "Reisprotein",
  "category": "proteine",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  },
  "goal_modifiers": {
    "muscle_gain": 0.5,
    "recomposition": 0.2,
    "maintenance": 0.5
  },
  "calorie_modifiers": {
    "in_deficit": 3.0,
    "in_surplus": 2.0
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 1.5,
    "metabolic": 2.5
  },
  "demographic_modifiers": {
    "age_over_50": 2.0,
    "age_over_60": 2.6
  }
}
```

---

#### 140. Hanfprotein
```json
{
  "ingredient_id": "hemp_protein",
  "ingredient_name": "Hanfprotein",
  "category": "proteine",
  "base_score": 5.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  },
  "goal_modifiers": {
    "maintenance": 0.5
  },
  "calorie_modifiers": {
    "in_deficit": 3.0,
    "in_surplus": 2.0
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 1.5,
    "metabolic": 2.5
  },
  "demographic_modifiers": {
    "age_over_50": 2.0,
    "age_over_60": 2.6
  }
}
```

---

#### 141. Eiprotein
```json
{
  "ingredient_id": "egg_protein",
  "ingredient_name": "Eiprotein",
  "category": "proteine",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.5
  },
  "context_modifiers": {
    "enhanced_no_trt": 1.0
  },
  "goal_modifiers": {
    "muscle_gain": 1.5,
    "recomposition": 0.8,
    "maintenance": 0.5
  },
  "calorie_modifiers": {
    "in_deficit": 3.0,
    "in_surplus": 2.0
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 1.5,
    "metabolic": 2.5
  },
  "demographic_modifiers": {
    "age_over_50": 2.0,
    "age_over_60": 2.6
  }
}
```

---

#### 142. Kollagen-Peptide
```json
{
  "ingredient_id": "collagen_peptides",
  "ingredient_name": "Kollagen-Peptide",
  "category": "proteine",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 1.0,
    "3": 1.5
  },
  "context_modifiers": {
    "on_glp1": 2.0
  },
  "goal_modifiers": {
    "longevity": 1.5
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 2.0,
    "healing": 3.0,
    "skin": 2.0
  },
  "demographic_modifiers": {
    "age_over_40": 2.5,
    "age_over_50": 2.5,
    "age_over_60": 3.2
  },
  "compound_synergies": {
    "bpc_157": 2.5,
    "retatrutide": 2.0,
    "tb_500": 2.5
  },
  "warnings": {
    "on_glp1": "Unterstützt Haut/Bindegewebe bei schnellem Gewichtsverlust"
  }
}
```

---

### KATEGORIE: SONSTIGES (8 Wirkstoffe)

---

#### 143. Koffein
```json
{
  "ingredient_id": "caffeine",
  "ingredient_name": "Koffein",
  "category": "sonstiges",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.0
  },
  "goal_modifiers": {
    "fat_loss": 1.5,
    "cognitive": 1.0,
    "recomposition": 0.8,
    "performance": 2.0
  },
  "calorie_modifiers": {
    "in_deficit": 2.0
  },
  "peptide_class_modifiers": {
    "nootropic": 2.0
  },
  "bloodwork_triggers": {
    "cortisol_high": -1.5
  },
  "warnings": {
    "cortisol_high": "Erhöht Cortisol – bei Stress reduzieren",
    "sleep": "Keine Einnahme nach 14 Uhr"
  }
}
```

---

#### 144. Melatonin
```json
{
  "ingredient_id": "melatonin",
  "ingredient_name": "Melatonin",
  "category": "sonstiges",
  "base_score": 7.5,
  "phase_modifiers": {
    "0": 1.0,
    "1": 1.0,
    "2": 0.5,
    "3": 0.5
  },
  "goal_modifiers": {
    "sleep": 3.0,
    "longevity": 1.0
  },
  "peptide_class_modifiers": {
    "gh_secretagogue": 2.0
  },
  "warnings": {
    "dosage": "0.3-1mg reicht – mehr ist nicht besser!",
    "dependency": "Nicht täglich – fördert Abhängigkeit"
  }
}
```

---

#### 145. D-Mannose
```json
{
  "ingredient_id": "d_mannose",
  "ingredient_name": "D-Mannose",
  "category": "sonstiges",
  "base_score": 5.5,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.0,
    "3": 0.0
  },
  "warnings": {
    "conditional": "Primär für UTI-Prävention"
  }
}
```

---

#### 146. Myo-Inositol
```json
{
  "ingredient_id": "myo_inositol",
  "ingredient_name": "Myo-Inositol",
  "category": "sonstiges",
  "base_score": 7.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 0.5,
    "3": 0.5
  },
  "goal_modifiers": {
    "sleep": 1.0
  },
  "bloodwork_triggers": {
    "insulin_resistant": 2.5,
    "glucose_high": 1.5
  }
}
```

---

#### 147. Piperin (BioPerine)
```json
{
  "ingredient_id": "piperine",
  "ingredient_name": "Piperin",
  "category": "sonstiges",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  },
  "warnings": {
    "drug_interactions": "Erhöht Bioverfügbarkeit vieler Substanzen – Vorsicht bei Medikamenten"
  }
}
```

---

#### 148. Spirulina
```json
{
  "ingredient_id": "spirulina",
  "ingredient_name": "Spirulina",
  "category": "sonstiges",
  "base_score": 6.5,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  },
  "goal_modifiers": {
    "longevity": 0.5
  }
}
```

---

#### 149. Chlorella
```json
{
  "ingredient_id": "chlorella",
  "ingredient_name": "Chlorella",
  "category": "sonstiges",
  "base_score": 6.0,
  "phase_modifiers": {
    "0": 0.5,
    "1": 0.5,
    "2": 0.5,
    "3": 0.5
  }
}
```

---

#### 150. Bioflavonoide (Citrus)
```json
{
  "ingredient_id": "bioflavonoids",
  "ingredient_name": "Bioflavonoide",
  "category": "sonstiges",
  "base_score": 5.5,
  "phase_modifiers": {
    "0": 0.0,
    "1": 0.0,
    "2": 0.5,
    "3": 0.5
  },
  "goal_modifiers": {
    "longevity": 0.5
  }
}
```

---

## V. IMPLEMENTIERUNGS-LEITFADEN FÜR LOVABLE

### Datenbank-Migration
```sql
-- Neue Tabelle für Wirkstoff-Matrizen
CREATE TABLE ingredient_relevance_matrix (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id TEXT UNIQUE NOT NULL,
  ingredient_name TEXT NOT NULL,
  category TEXT NOT NULL,
  base_score DECIMAL(3,1) NOT NULL,
  phase_modifiers JSONB DEFAULT '{}',
  context_modifiers JSONB DEFAULT '{}',
  goal_modifiers JSONB DEFAULT '{}',
  bloodwork_triggers JSONB DEFAULT '{}',
  compound_synergies JSONB DEFAULT '{}',
  warnings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Abfragen
CREATE INDEX idx_ingredient_category ON ingredient_relevance_matrix(category);
CREATE INDEX idx_ingredient_base_score ON ingredient_relevance_matrix(base_score DESC);
```

### TypeScript Interface
```typescript
// src/types/relevanceMatrix.ts

export interface RelevanceMatrix {
  ingredient_id: string;
  ingredient_name: string;
  category: IngredientCategory;
  base_score: number;
  phase_modifiers: Record<string, number>;
  context_modifiers: ContextModifiers;
  goal_modifiers: Record<UserGoal, number>;
  bloodwork_triggers: Record<string, number>;
  compound_synergies: Record<string, number>;
  warnings: Record<string, string>;
}

export interface ContextModifiers {
  true_natural?: number;
  enhanced_no_trt?: number;
  on_trt?: number;
  on_glp1?: number;
}

export type IngredientCategory = 
  | 'vitamine' | 'mineralien' | 'aminosaeuren' 
  | 'fettsaeuren' | 'adaptogene' | 'vitalpilze' 
  | 'antioxidantien' | 'longevity' | 'darm' 
  | 'gelenke' | 'nootropics' | 'enzyme' 
  | 'proteine' | 'sonstiges';

export type UserGoal = 
  | 'fat_loss' | 'muscle_gain' | 'longevity' 
  | 'cognitive' | 'sleep' | 'gut_health';

export interface UserRelevanceContext {
  isTrueNatural: boolean;
  isEnhancedNoTRT: boolean;
  isOnTRT: boolean;
  isOnGLP1: boolean;
  phase: 0 | 1 | 2 | 3;
  goal: UserGoal;
  bloodworkFlags: string[];
  activePeptides: string[];
}

export interface ScoringResult {
  finalScore: number;
  reasons: string[];
  warnings: string[];
}
```

### Score-Berechnung
```typescript
// src/lib/calculateIngredientScore.ts

export function calculateIngredientScore(
  matrix: RelevanceMatrix,
  context: UserRelevanceContext
): ScoringResult {
  let score = matrix.base_score;
  const reasons: string[] = [];
  const warnings: string[] = [];

  // 1. Phase Modifier
  const phaseMod = matrix.phase_modifiers[context.phase.toString()] || 0;
  if (phaseMod !== 0) {
    score += phaseMod;
    reasons.push(`Phase ${context.phase}: ${phaseMod > 0 ? '+' : ''}${phaseMod}`);
  }

  // 2. Context Modifiers (TRT trumpft alles)
  if (context.isOnTRT && matrix.context_modifiers.on_trt) {
    score += matrix.context_modifiers.on_trt;
    reasons.push(`TRT aktiv: ${matrix.context_modifiers.on_trt}`);
    if (matrix.warnings.on_trt) warnings.push(matrix.warnings.on_trt);
  } else if (context.isEnhancedNoTRT && matrix.context_modifiers.enhanced_no_trt) {
    score += matrix.context_modifiers.enhanced_no_trt;
    reasons.push(`Peptide ohne TRT: +${matrix.context_modifiers.enhanced_no_trt}`);
    if (matrix.warnings.enhanced_no_trt) warnings.push(matrix.warnings.enhanced_no_trt);
  } else if (context.isTrueNatural && matrix.context_modifiers.true_natural) {
    score += matrix.context_modifiers.true_natural;
    reasons.push(`100% Natural: +${matrix.context_modifiers.true_natural}`);
  }

  // 3. GLP-1 (additiv)
  if (context.isOnGLP1 && matrix.context_modifiers.on_glp1) {
    score += matrix.context_modifiers.on_glp1;
    reasons.push(`GLP-1 aktiv: +${matrix.context_modifiers.on_glp1}`);
    if (matrix.warnings.on_glp1) warnings.push(matrix.warnings.on_glp1);
  }

  // 4. Goal Modifier
  const goalMod = matrix.goal_modifiers[context.goal];
  if (goalMod) {
    score += goalMod;
    reasons.push(`Ziel ${context.goal}: +${goalMod}`);
  }

  // 5. Bloodwork Triggers
  for (const flag of context.bloodworkFlags) {
    const mod = matrix.bloodwork_triggers[flag];
    if (mod) {
      score += mod;
      reasons.push(`${flag}: ${mod > 0 ? '+' : ''}${mod}`);
      if (matrix.warnings[flag]) warnings.push(matrix.warnings[flag]);
    }
  }

  // 6. Compound Synergies
  for (const peptide of context.activePeptides) {
    const mod = matrix.compound_synergies[peptide];
    if (mod) {
      score += mod;
      reasons.push(`${peptide}: ${mod > 0 ? '+' : ''}${mod}`);
    }
  }

  // Clamp 0-10
  return {
    finalScore: Math.max(0, Math.min(10, Math.round(score * 10) / 10)),
    reasons,
    warnings
  };
}
```

---

## VI. STATISTIK

| Kategorie | Anzahl | Ø Base Score |
|-----------|--------|--------------|
| Vitamine | 14 | 6.7 |
| Mineralien | 15 | 6.0 |
| Aminosäuren | 25 | 6.5 |
| Fettsäuren | 8 | 7.1 |
| Adaptogene | 28 | 6.9 |
| Vitalpilze | 7 | 6.9 |
| Antioxidantien | 9 | 7.1 |
| Longevity | 7 | 6.6 |
| Darm | 5 | 7.4 |
| Gelenke | 5 | 6.9 |
| Nootropics | 6 | 6.6 |
| Enzyme | 6 | 6.1 |
| Proteine | 7 | 6.8 |
| Sonstiges | 8 | 6.4 |
| **TOTAL** | **150** | **6.7** |

---

**Version:** 1.0  
**Erstellt:** 29. Januar 2026  
**Autor:** ARES System  
**Lizenz:** Proprietär – nur für leanAF/ARES Nutzung

