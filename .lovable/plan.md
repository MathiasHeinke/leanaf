
# ARES Matrix v2.2 Update: Phase 2 Validierung (NAD+/GLP-1/TRT)

## Zusammenfassung der Phase 2 Recherche (aus PDF)

Die PDF dokumentiert Phase 2 der wissenschaftlichen Validierung mit 4 Hauptbereichen:

### 1. NAD+ Decline mit Alter (Alters-basierte Kalibrierung)

| Alter | NAD+ Decline | Quelle |
|-------|--------------|--------|
| 20-30 | Baseline (Peak) | Jinfiniti, PMC7442590 |
| 40 | -20-30% | Frontiers Endocrinology 2022 |
| 50 | -40-50% | PMC8747183 |
| 60+ | -80% | NAD Clinic, Healthspan |

**Matrix-Anpassungen:**
| Supplement | demo_age_over_40 | demo_age_over_50 | demo_age_over_60 |
|------------|------------------|------------------|------------------|
| NMN | 1.5 | 3.0 | 4.0 |
| NR | 1.5 | 3.0 | 4.0 |
| GlyNAC | 1.5 | 3.0 | 4.0 |
| CoQ10 Ubiquinol | 1.5 | 2.5 | 4.0 |

### 2. GLP-1 Kontext (Lean Mass Protection)

**Body Composition Studien:**
- STEP 1 (Semaglutide): 60% Fett, 40% Lean Mass Verlust
- SURMOUNT-1 (Tirzepatide): 75% Fett, 25% Lean Mass Verlust

**Matrix-Anpassungen (Tier 1 - KRITISCH ctx_on_glp1 = 4.0):**
| Supplement | ctx_on_glp1 | cal_in_deficit | syn_semaglutide | syn_tirzepatide |
|------------|-------------|----------------|-----------------|-----------------|
| Elektrolyte | 4.0 | 1.5 | 3.0 | 3.0 |
| HMB | 4.0 | 4.0 | 3.0 | 3.0 |
| EAA | 3.5 | 3.5 | 3.0 | 3.0 |
| Creatine | 2.5 | 3.5 | 3.0 | 3.0 |
| Protein | 3.0 | 2.0 | 2.5 | 2.5 |

### 3. TRT Support Kontext

**TUDCA:**
| Metrik | Wert | Quelle |
|--------|------|--------|
| Insulinsensitivitat | +30% | PMC2911053 |
| ctx_on_trt | 2.0 -> 3.0 | PCT/Cycle Support etabliert |

**DIM:**
- Erhoeht 2-OHE1/16a-OHE1 Ratio (PMC5571834)
- ctx_on_trt: 2.5 -> 3.0

**Weitere TRT-Support:**
| Supplement | ctx_on_trt | Begruendung |
|------------|------------|-------------|
| Citrus Bergamot | 3.0 | Lipid-Management |
| NAC | 2.0 | Leberschutz |
| Taurin | 2.0 | Kardioprotektiv |
| Zink | 0.5 | Nicht relevant unter exogenem T |
| Ashwagandha | -2.0 | HPG bereits supprimiert |

---

## Kritische Diff: v2.1 vs v2.2

### Neue/Geaenderte Modifier:

| Zeile | Supplement | Feld | v2.1 | v2.2 | Grund |
|-------|------------|------|------|------|-------|
| 3 | Creatine | ctx_on_glp1 | - | 2.5 | GLP-1 Muskelschutz |
| 3 | Creatine | cal_in_deficit | 3.0 | 3.5 | Defizit-kritisch |
| 3 | Creatine | syn_semaglutide/tirze/reta | - | 3.0/3.0/3.5 | Synergie-Boosts |
| 8 | Elektrolyte | syn_reta/tirze/sema | 4.0/3.0/2.5 | 3.5/3.0/3.0 | Rebalanciert |
| 9 | GlyNAC | demo_age_over_40/50/60 | -/-/- | 1.5/3.0/4.0 | NAD+ Decline |
| 10 | NR | demo_age_over_40/50/60 | -/-/- | 1.5/3.0/4.0 | NAD+ Decline |
| 14 | EAA | ctx_on_glp1 | - | 3.5 | GLP-1 Support |
| 14 | EAA | syn_reta/tirze/sema | 3.0/2.0/- | 3.5/3.0/3.0 | Synergie-Boosts |
| 20 | TUDCA | ctx_on_trt | 2.0 | 3.0 | TRT-Support validiert |
| 26 | Taurin | ctx_on_trt | 1.0 | 2.0 | Kardioprotektiv |
| 28 | DIM | ctx_on_trt | 2.5 | 3.0 | Oestrogen-Management |
| 31 | HMB | ctx_on_glp1 | - | 4.0 | KRITISCH bei GLP-1 |
| 31 | HMB | cal_in_deficit | 3.0 | 4.0 | Defizit-kritisch |
| 31 | HMB | syn_reta/tirze/sema | 4.0/3.0/- | 3.5/3.0/3.0 | Synergie-Boosts |
| 36 | CoQ10 | demo_age_over_60 | - | 4.0 | Eigensynthese sinkt |
| 53 | L-Glutamin | ctx_on_glp1 | - | 2.5 | Darmschutz bei GLP-1 |
| 79 | Protein Pulver | ctx_on_glp1 | - | 3.0 | MPS-Substrat |
| 79 | Protein Pulver | syn_reta/tirze | 2.5/2.0 | 2.5/2.0 | Bestaetigt |

---

## Implementierungs-Plan

### Schritt 1: CSV-Datei aktualisieren

**Aktion:** Ersetze `src/data/ares-matrix-v2.1.csv` mit neuer `ares-matrix-v2.2.csv`
- Header aendern auf "v2.2 | PHASE 1+2 COMPLETE | NAD+/GLP-1/TRT validiert"

### Schritt 2: Import-Funktion anpassen

**Datei:** `src/lib/executeMatrixImport.ts`
- Aendere Import-Pfad: `'@/data/ares-matrix-v2.1.csv?raw'` -> `'@/data/ares-matrix-v2.2.csv?raw'`

### Schritt 3: Parser Version-Kommentar aktualisieren

**Datei:** `src/lib/matrixCSVParser.ts`
- Kommentar-Header aktualisieren: "v2.2 VALIDATED"

### Schritt 4: evidence_notes fuer Phase 2 Wirkstoffe erweitern

In der Datenbank oder via Import fuer kritische Wirkstoffe:

| Wirkstoff | critical_insight | sources |
|-----------|------------------|---------|
| NMN | "NAD+ sinkt um 40-50% bis Alter 50, 80% bis 60+. Supplementierung erhoeht NAD+ signifikant (p<=0.001)." | ["PMC8747183", "PMC9158788", "PubMed 36482258"] |
| NR | "NAD+ 2.6-fach erhoeht nach 10 Wochen bei aelteren Erwachsenen mit MCI." | ["PMC10828186"] |
| GlyNAC | "Glutathion + NAD+ Synergie. Alter ist kritischster Faktor fuer NAD+ Decline." | ["Frontiers Endocrinology 2022"] |
| CoQ10 Ubiquinol | "Eigensynthese sinkt mit Alter drastisch. Ubiquinol-Form bei 50+ bevorzu." | ["PMC7442590"] |
| HMB | "25-40% des Gewichtsverlusts unter GLP-1 ist Lean Mass. HMB 3g/Tag anti-katabol (mTOR-unabhaengig)." | ["PMC5566641", "PubMed 23876188", "PMC12003145"] |
| Elektrolyte | "GLP-1 verursacht Dehydration und Elektrolytverlust. Kritisch bei Tirze/Reta." | ["Potere Health MD"] |
| TUDCA | "ER-Stress Reduktion, +30% Insulinsensitivitaet. Bei TRT: Leberschutz validiert." | ["PMC4030606", "PMC2911053"] |
| DIM | "Verschiebt Oestrogen-Metabolismus zu anti-tumorigenem 2-OHE1. Bei TRT zur Oestrogen-Kontrolle." | ["PMC5571834", "PMC3048776"] |

### Schritt 5: Demografische Labels in SupplementDetailSheet erweitern

**Datei:** `src/components/supplements/SupplementDetailSheet.tsx`

Neue Section fuer Alters-spezifische Modifier hinzufuegen (nach BloodworkTriggersSection):

```typescript
// Neue Labels fuer Demografie
const DEMOGRAPHIC_LABELS: Record<string, string> = {
  age_over_40: 'Alter 40+',
  age_over_50: 'Alter 50+',
  age_over_60: 'Alter 60+',
  is_male: 'Maennlich',
  is_female: 'Weiblich',
};

// Neue Komponente: DemographicRelevanceSection
```

### Schritt 6: Compound Synergies im Overlay visualisieren

**Datei:** `src/components/supplements/SupplementDetailSheet.tsx`

Neue Section fuer Peptid/GLP-1 Synergien:

```typescript
// Labels fuer Compound Synergies
const SYNERGY_LABELS: Record<string, string> = {
  retatrutide: 'Retatrutide',
  tirzepatide: 'Tirzepatide',
  semaglutide: 'Semaglutide',
  epitalon: 'Epitalon',
  mots_c: 'MOTS-c',
  bpc_157: 'BPC-157',
  tb_500: 'TB-500',
  cjc_1295: 'CJC-1295',
  ipamorelin: 'Ipamorelin',
};

// Neue Komponente: CompoundSynergiesSection
```

---

## Dateien-Uebersicht

| Datei | Aktion |
|-------|--------|
| `src/data/ares-matrix-v2.2.csv` | **NEU** - Kopie der validierten CSV |
| `src/data/ares-matrix-v2.1.csv` | **LOESCHEN** - Ersetzt durch v2.2 |
| `src/lib/executeMatrixImport.ts` | **BEARBEITEN** - Import-Pfad auf v2.2 |
| `src/lib/matrixCSVParser.ts` | **BEARBEITEN** - Kommentar-Update auf v2.2 |
| `src/components/supplements/SupplementDetailSheet.tsx` | **ERWEITERN** - Demografische und Synergie-Sektionen |

---

## Erwartetes Ergebnis

1. **Matrix-Daten:** 84 Wirkstoffe mit Phase 1+2 validierten Modifiern
2. **Alters-Kalibrierung:** NAD+-Stack (NMN/NR/GlyNAC/CoQ10) skaliert jetzt korrekt mit Alter
3. **GLP-1 Kontext:** Elektrolyte, HMB, EAA, Creatine, Protein erhalten ctx_on_glp1 Boosts
4. **TRT Support:** TUDCA, DIM, Taurin mit validierten ctx_on_trt Werten
5. **Info-Overlay:** 
   - Neue wissenschaftliche Erkenntnisse fuer Phase 2 Wirkstoffe
   - Demografische Modifier (40+/50+/60+) sichtbar im UI
   - Compound Synergies (Reta/Tirze/Sema) sichtbar im UI
6. **User-Transparenz:** Vollstaendige Erklaerung warum welches Supplement wie bewertet wird

---

## Quellen Phase 2 (aus PDF)

**NAD+ Decline:**
- PMC8747183 - "NAD+ and aging: mechanisms and therapeutic potential"
- Frontiers Endocrinology 2022 - "Whole blood NAD+ content and aging"
- PMC7442590 - "NAD+ metabolism and its roles in cellular processes"

**NMN/NR Human Trials:**
- PubMed 36482258 - "NMN increases NAD+ in middle-aged adults"
- PMC9158788 - "NMN improves muscle function in older men"
- PMC10828186 - "NR in older adults with MCI"

**GLP-1 Body Composition:**
- Potere Health MD - "GLP-1 and Muscle Loss"
- PMC12536186 - "Lean mass preservation during GLP-1 therapy"
- PubMed 39996356 - "SURMOUNT-1 body composition"

**HMB:**
- PMC5566641 - "HMB supplementation and skeletal muscle"
- PMC12003145 - "HMB meta-analysis in over 50s"
- PubMed 23876188 - "HMB attenuates muscle loss during energy deficit"

**TRT Support:**
- PMC2911053 - "TUDCA improves insulin sensitivity"
- PMC4030606 - "TUDCA liver protection mechanisms"
- PMC5571834 - "DIM and estrogen metabolism"
