
# ARES Matrix-Daten Import: Analyse & Implementierungsplan

## I. ANALYSE-ERGEBNIS

### Dokument-Zusammenfassung
| Metrik | Wert |
|--------|------|
| **Wirkstoffe im Import** | 150 |
| **Wirkstoffe in DB** | 111 |
| **Kategorien im Import** | 14 (vitamine, mineralien, aminosaeuren, fettsaeuren, adaptogene, vitalpilze, antioxidantien, longevity, darm, gelenke, nootropics, enzyme, proteine, sonstiges) |
| **relevance_matrix bereits befuellt** | 0 (alle leer) |

### Schema-Kompatibilitaet

#### MATCH: Diese Felder sind 1:1 kompatibel
| Import-Feld | DB-Typ | Status |
|-------------|--------|--------|
| `phase_modifiers` | `Record<string, number>` | ✅ Perfekt |
| `context_modifiers` | `{true_natural, enhanced_no_trt, on_trt, on_glp1}` | ✅ Perfekt |
| `goal_modifiers` | `Record<string, number>` | ✅ Perfekt |
| `calorie_modifiers` | `{in_deficit, in_surplus}` | ✅ Perfekt |
| `peptide_class_modifiers` | `Record<string, number>` | ✅ Perfekt |
| `demographic_modifiers` | `{age_over_40, age_over_50, age_over_60, is_female, is_male}` | ✅ Perfekt |
| `bloodwork_triggers` | `Record<string, number>` | ✅ Perfekt |
| `compound_synergies` | `Record<string, number>` | ✅ Perfekt |

#### DISKREPANZ: Felder im Import, die NICHT im DB-Schema sind
| Import-Feld | Beschreibung | Aktion |
|-------------|--------------|--------|
| `ingredient_id` | z.B. "vit_d3", "hmb" | Mapping zu DB-Namen noetig |
| `ingredient_name` | z.B. "Vitamin D3", "HMB" | Fuer Matching verwenden |
| `category` | z.B. "vitamine", "aminosaeuren" | Ignorieren (DB hat eigene) |
| `base_score` | z.B. 9.0, 7.5 | **WICHTIG:** Vergleich mit `impact_score` noetig |
| `warnings` | z.B. `{"on_trt": "TRT macht redundant"}` | **NEU:** Zu `explanation_templates` mappen |

#### NEUE GOALS im Import (nicht in DB-Logik)
| Goal | In Import | In unserer Logik |
|------|-----------|------------------|
| `fat_loss` | ✅ | ✅ |
| `muscle_gain` | ✅ | ✅ |
| `recomposition` | ✅ | ✅ |
| `longevity` | ✅ | ✅ |
| `maintenance` | ✅ | ✅ |
| `performance` | ✅ | ✅ |
| `cognitive` | ✅ | ❌ **NEU** - hinzufuegen |
| `sleep` | ✅ | ❌ **NEU** - hinzufuegen |
| `gut_health` | ✅ | ❌ **NEU** - hinzufuegen |

### Wirkstoffe: Import vs. Datenbank

#### MATCHING-PROBLEME zu loesen
Das Import-Dokument nutzt normalisierte IDs wie `vit_d3`, `hmb`, `ashwagandha`, waehrend die DB deutsche Namen wie "Vitamin D3", "HMB", "Ashwagandha KSM-66" hat.

**Beispiel-Mappings:**
| Import-ID | Import-Name | DB-Name (approx.) |
|-----------|-------------|-------------------|
| `vit_d3` | Vitamin D3 | Vitamin D3 |
| `vit_k2` | Vitamin K2 MK-7 | Vitamin K2 |
| `magnesium` | Magnesium | Magnesium |
| `hmb` | HMB | HMB, HMB 3000 |
| `ashwagandha` | Ashwagandha | Ashwagandha, Ashwagandha KSM-66 |
| `creatine` | Kreatin | Creatine Monohydrat, Creatin |
| `bergamot` | Citrus Bergamot | Citrus Bergamot |

#### WIRKSTOFFE IM IMPORT, NICHT IN DB (~39 potentiell)
Da Import 150 hat, DB 111, fehlen ca. 39 Wirkstoffe. Diese koennten spaeter als neue Eintraege hinzugefuegt werden.

---

## II. TECHNISCHE ANFORDERUNGEN

### 1. Typ-Erweiterungen (src/types/relevanceMatrix.ts)

**Neue Goals hinzufuegen:**
```typescript
// goal_modifiers unterstuetzt jetzt auch:
// - cognitive
// - sleep  
// - gut_health
```

**Warnings/Explanation Templates:**
Das Import-Dokument enthaelt `warnings` Objekte mit kontextbezogenen Warnungen. Diese sollen zu `explanation_templates` gemappt werden.

### 2. Matching-Strategie fuer Import

**Option A: Fuzzy Name Matching**
- Vergleiche `ingredient_name` mit `supplement_database.name`
- Normalisiere: lowercase, Umlaute, Bindestrich/Leerzeichen

**Option B: Manuelles Mapping-Dictionary**
- Erstelle ein statisches Mapping von `ingredient_id` -> DB-UUID
- Praeziser, erfordert aber manuelle Pflege

**Empfehlung: Option A + B kombiniert**
1. Versuche Fuzzy-Match auf Namen
2. Fallback auf manuelles Mapping fuer Problemfaelle

### 3. Import-Script Architektur

```text
┌─────────────────────────────────────────────────────────────────────┐
│ IMPORT PIPELINE                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Parse MD-Datei -> Extrahiere JSON-Bloecke                        │
│ 2. Validiere gegen RelevanceMatrix-Schema                           │
│ 3. Fuer jeden Wirkstoff:                                            │
│    a. Finde passenden DB-Eintrag (Name-Matching)                    │
│    b. Mappe Import-Felder zu DB-Schema                              │
│    c. Merge `warnings` -> `explanation_templates`                   │
│    d. UPDATE supplement_database SET relevance_matrix = {...}       │
│ 4. Report: Matched, Unmatched, Errors                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## III. IMPLEMENTIERUNGSPLAN

### Phase 1: Schema-Erweiterungen (15 Min)

**1.1 Typ-Erweiterungen**
- `src/types/relevanceMatrix.ts`: Goals um `cognitive`, `sleep`, `gut_health` erweitern
- `explanation_templates` Typ hinzufuegen (bereits vorhanden, aber validieren)

**1.2 Score-Berechnung erweitern**
- `src/lib/calculateRelevanceScore.ts`: Neue Goals verarbeiten

### Phase 2: Import-Utility erstellen (45 Min)

**2.1 Markdown-Parser**
- Extrahiere alle JSON-Bloecke aus der MD-Datei
- Validiere gegen TypeScript-Interface

**2.2 Name-Matcher**
- Fuzzy-Matching-Funktion fuer Wirkstoff-Namen
- Manuelles Override-Dictionary fuer Problemfaelle

**2.3 Matrix-Transformer**
- Mappe Import-Format zu DB-Format
- Konvertiere `warnings` zu `explanation_templates`

### Phase 3: Admin-Import-Tool (30 Min)

**3.1 UI-Seite**
- `/admin/import-matrix` Route
- Datei-Upload oder Paste-Bereich fuer MD-Content
- Preview der zu importierenden Daten
- Matching-Report anzeigen
- "Import starten" Button

**3.2 Import-Logik**
- Batch-UPDATE fuer alle gematchten Wirkstoffe
- Fehlerbehandlung und Logging

### Phase 4: Validierung (20 Min)

**4.1 Test-Cases**
- HMB: Natural vs TRT Score-Differenz pruefen
- Elektrolyte: GLP-1 Synergie pruefen
- Tongkat Ali: TRT-Malus pruefen

**4.2 UI-Check**
- ExpandableSupplementChip zeigt personalisierten Score
- RelevanceScorePopover zeigt Gruende korrekt

---

## IV. DATEIEN ZU ERSTELLEN/AENDERN

### Neue Dateien
| Datei | Zweck |
|-------|-------|
| `src/lib/matrixImportParser.ts` | MD-Parser + JSON-Extraktion |
| `src/lib/matrixIngredientMatcher.ts` | Fuzzy Name Matching + Override Map |
| `src/pages/admin/ImportMatrixPage.tsx` | Admin UI fuer Import |

### Zu aendernde Dateien
| Datei | Aenderung |
|-------|-----------|
| `src/types/relevanceMatrix.ts` | Goals erweitern (cognitive, sleep, gut_health) |
| `src/lib/calculateRelevanceScore.ts` | Neue Goals verarbeiten |
| `src/components/supplements/RelevanceScorePopover.tsx` | Neue Goal-Labels |
| `src/App.tsx` | Route fuer /admin/import-matrix |

---

## V. IMPORT-DATEN VALIDIERUNG

### Stichproben-Analyse

**Vitamin D3:**
- Import base_score: 9.0
- DB impact_score: 9.0 (falls vorhanden) 
- phase_modifiers: {"0": 2.0, "1": 1.0, "2": 0.0, "3": 0.0} ✅
- bloodwork_triggers: {"vitamin_d_low": 4.0} ✅

**HMB:**
- Import base_score: 7.0
- context_modifiers: {"true_natural": 3.0, "enhanced_no_trt": 5.0, "on_trt": -4.0} ✅
- compound_synergies: {"retatrutide": 4.0} ✅
- calorie_modifiers: {"in_deficit": 3.0} ✅

**Tongkat Ali:**
- context_modifiers: {"true_natural": 3.0, "on_trt": -5.0} ✅
- demographic_modifiers: {"is_female": -3.0, "is_male": 1.5} ✅
- warnings: {"on_trt": "KOMPLETT REDUNDANT..."} -> explanation_templates

### Qualitaets-Check: BESTANDEN
Die Daten sind konsistent und folgen dem definierten Schema. Die Modifikator-Werte sind plausibel und spiegeln die pharmakologische Logik korrekt wider.

---

## VI. GESCHAETZTER AUFWAND

| Phase | Task | Zeit |
|-------|------|------|
| 1 | Typ-Erweiterungen | 15 Min |
| 2 | Import-Utilities | 45 Min |
| 3 | Admin-Import-Tool | 30 Min |
| 4 | Validierung & Test | 20 Min |
| **Total** | | **~2 Stunden** |

---

## VII. OFFENE PUNKTE

### Vor Import zu klaeren:

1. **base_score vs impact_score**: Soll der Import-`base_score` den bestehenden `impact_score` ueberschreiben oder nur die Matrix befuellen?
   - Empfehlung: Matrix befuellen, impact_score beibehalten

2. **Nicht-gematchte Wirkstoffe**: 39 Wirkstoffe im Import haben keine DB-Entsprechung
   - Option A: Ignorieren
   - Option B: Als neue Eintraege anlegen (erfordert mehr Felder)
   - Empfehlung: Option A (erstmal nur Matrix fuer bestehende)

3. **Duplikate**: Manche DB-Eintraege sind Varianten (z.B. "Ashwagandha" vs "Ashwagandha KSM-66")
   - Empfehlung: Beide mit derselben Matrix befuellen

