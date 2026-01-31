
# ARES Matrix v2.0 Update: Import und Info-Overlay Integration

## Uebersicht der Aenderungen in der neuen Matrix

### Was wurde entfernt (14 Eintraege)
| Entfernt | Grund |
|----------|-------|
| EAA Komplex | Duplikat zu EAA |
| Taurin (doppelt) | Konsolidiert zu "Taurin (kardioprotektiv)" |
| Curcumin (doppelt) | Konsolidiert zu "Curcumin Longvida" |
| Kollagen (doppelt) | Konsolidiert zu "Kollagen Peptide" |
| Probiotika (doppelt) | Konsolidiert zu "Probiotika Multi-Strain" |
| Zink (doppelt) | Konsolidiert zu "Zink Bisglycinat" |
| Stack-Kategorien (8) | Nootropic Stack, Sport Stack, Schlaf Stack, Gelenke Stack, Augen Stack, Beauty Stack, Frauen Stack, Haare Stack |

### Was wurde kalibriert

**Phase-Boosts erhoet:**
| Phase | Supplement | Vorher | Nachher |
|-------|------------|--------|---------|
| Phase 0 | Creatine | 1.5 | 2.0 |
| Phase 0 | Magnesium Glycinat | 2.0 | 2.5 |
| Phase 0 | Vitamin D3 | 2.0 | 2.5 |
| Phase 0 | Omega-3 | 1.5 | 2.0 |
| Phase 0 | B12 | 1.5 | 2.0 |
| Phase 0 | Zink | 1.5 | 2.0 |
| Phase 0 | NAC | 1.5 | 2.0 |
| Phase 1 | HMB | 2.5 | 3.5 |
| Phase 1 | Elektrolyte | 2.0 | 3.0 |
| Phase 1 | Citrus Bergamot | 2.0 | 2.5 |
| Phase 1 | TUDCA | 1.5 | 2.0 |
| Phase 1 | Berberin | 1.5 | 2.0 |
| Phase 2 | CoQ10 | 1.5 | 2.0 |
| Phase 2 | Lions Mane | 1.5 | 2.0 |
| Phase 2 | PQQ | 1.0 | 1.5 |
| Phase 3 | NMN | 3.0 | 3.5 |
| Phase 3 | Spermidin | 2.5 | 3.0 |
| Phase 3 | Fisetin | 2.5 | 3.0 |

**Neue bw_ Modifier hinzugefuegt:**
| Supplement | bw_insulin_resistant | bw_homocysteine_high | bw_apob_high |
|------------|---------------------|---------------------|--------------|
| Berberin | 4.0 | - | - |
| Alpha-Liponsaeure | 3.0 | - | - |
| B12 | - | 4.0 | - |
| Folat | - | 4.0 | - |
| TMG | - | 3.5 | - |
| B-Komplex | - | 3.0 | - |
| Citrus Bergamot | - | - | 3.5 |
| Omega-3 | - | - | 3.0 |

### Finale Matrix Stats
- **Wirkstoffe:** 84 (vorher 98)
- **Essential:** 11 | **Optimizer:** 54 | **Specialist:** 19
- **Evidence:** strong (~40%) | moderate (~60%)

---

## Technische Umsetzung

### 1. Neuen CSV-Parser erstellen

**Neue Datei:** `src/lib/matrixCSVParser.ts`

Der aktuelle Parser verarbeitet Markdown mit JSON-Bloecken. Die neue CSV hat ein flaches Spalten-Format. Ein neuer Parser wird benoetigt:

```text
Funktionen:
- parseMatrixCSV(csvContent: string): ParsedMatrixEntry[]
- csvRowToRelevanceMatrix(row): RelevanceMatrix
- Mapping der CSV-Spalten auf das RelevanceMatrix-Interface
```

**Spalten-Mapping:**
| CSV-Spalte | RelevanceMatrix-Feld |
|------------|---------------------|
| phase_0, phase_1, phase_2, phase_3 | phase_modifiers |
| ctx_true_natural, ctx_enhanced_no_trt, ctx_on_trt, ctx_on_glp1 | context_modifiers |
| goal_fat_loss, goal_muscle_gain, ... | goal_modifiers |
| cal_in_deficit, cal_in_surplus | calorie_modifiers |
| demo_age_over_40, demo_age_over_50, ... | demographic_modifiers |
| pep_gh_secretagogue, pep_healing, ... | peptide_class_modifiers |
| bw_cortisol_high, bw_testosterone_low, ... | bloodwork_triggers |
| syn_retatrutide, syn_tirzepatide, ... | compound_synergies |

### 2. Matrix-Datei in Projekt kopieren

**Aktion:** Kopiere `ares_matrix_v2.0_QUICK_WINS.csv` nach `src/data/ares-matrix-v2.0.csv`

### 3. Import-Funktion erweitern

**Datei:** `src/lib/executeMatrixImport.ts`

Neue Funktion hinzufuegen:
```text
executeMatrixImportFromCSV(): Promise<BatchImportResult>
- Laedt die CSV-Datei
- Parst mit neuem CSV-Parser
- Nutzt bestehenden Ingredient-Matcher
- Updated die Datenbank
```

### 4. Auch Basis-Felder updaten

Der aktuelle Import aktualisiert nur `relevance_matrix`. Die neue CSV enthaelt auch:
- `impact_score` (aktualisiert)
- `necessity_tier` (aktualisiert)
- `evidence_level` (aktualisiert)
- `category` (aktualisiert)

**Erweiterung der updateSupplementMatrix-Funktion:**
```text
UPDATE supplement_database SET
  relevance_matrix = ...,
  impact_score = ...,
  necessity_tier = ...,
  evidence_level = ...,
  category = ...
WHERE id = ...
```

### 5. Info-Overlay Erweiterung

**Bestehendes System:**
- `SupplementDetailSheet` zeigt bereits Evidenz-Level und personalisierten Score
- `RelevanceScorePopover` zeigt Scoring-Breakdown mit Kategorien

**Erweiterung benoetigt:**
Das System zeigt bereits die wichtigsten Informationen. Um die wissenschaftlichen Grundlagen und Modifier-Details besser sichtbar zu machen, wird ein neuer Abschnitt im `SupplementDetailSheet` hinzugefuegt:

**Datei:** `src/components/supplements/SupplementDetailSheet.tsx`

Neuer Abschnitt nach "Empfohlene Einnahme":
```text
{/* Wissenschaftliche Grundlage */}
<div>
  <h4>Wissenschaftliche Evidenz</h4>
  <div>
    <Badge>{evidence_level}</Badge>
    <p>{getEvidenceDescription(evidence_level)}</p>
  </div>
</div>

{/* Kontext-Relevanz */}
{hasContextModifiers && (
  <div>
    <h4>Wann besonders relevant</h4>
    <ul>
      {context_modifiers.on_trt && <li>Bei TRT: +{on_trt}</li>}
      {context_modifiers.on_glp1 && <li>Bei GLP-1: +{on_glp1}</li>}
      ...
    </ul>
  </div>
)}

{/* Blutwert-Trigger */}
{hasBloodworkTriggers && (
  <div>
    <h4>Blutwert-basierte Empfehlung</h4>
    <ul>
      {bloodwork_triggers.bw_insulin_resistant && <li>Bei Insulinresistenz: +{value}</li>}
      ...
    </ul>
  </div>
)}
```

### 6. Evidenz-Beschreibungen hinzufuegen

**Datei:** `src/types/supplementLibrary.ts`

Erweitern der `EVIDENCE_LEVEL_CONFIG` um Beschreibungen:
```text
EVIDENCE_LEVEL_CONFIG = {
  stark: {
    ...existing,
    description: "Mehrere randomisierte kontrollierte Studien (RCTs) und Meta-Analysen bestaetigen die Wirksamkeit."
  },
  moderat: {
    ...existing,
    description: "Begrenzte RCTs, aber konsistente Ergebnisse aus Beobachtungsstudien und mechanistischen Daten."
  }
}
```

---

## Dateien-Uebersicht

| Datei | Aenderung |
|-------|-----------|
| `src/data/ares-matrix-v2.0.csv` | NEU - Kopie der CSV-Datei |
| `src/lib/matrixCSVParser.ts` | NEU - CSV-Parser fuer Matrix-Format |
| `src/lib/executeMatrixImport.ts` | ERWEITERN - CSV-Import-Funktion |
| `src/components/supplements/SupplementDetailSheet.tsx` | ERWEITERN - Evidenz & Modifier-Sektion |
| `src/types/supplementLibrary.ts` | ERWEITERN - Evidenz-Beschreibungen |
| `src/pages/Admin.tsx` | ERWEITERN - CSV-Import-Button im System-Tab |

---

## Erwartetes Ergebnis

1. **Matrix-Daten:** 84 bereinigte Wirkstoffe mit kalibrierten Phase-Boosts und neuen bw_ Modifiern
2. **Basis-Felder:** impact_score, necessity_tier, evidence_level werden synchronisiert
3. **Info-Overlay:** Zeigt wissenschaftliche Grundlage, Kontext-Relevanz und Blutwert-Trigger
4. **Admin-UI:** Neuer Button "CSV Matrix Import v2.0" im System-Tab
