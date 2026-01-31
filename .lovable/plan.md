

# ARES Matrix v3.0 FINAL Integration

## Executive Summary

Upgrade von **84 auf 110 Compounds** (+31%) mit vollständiger Rx-Medikamenten und Peptide-Abdeckung.

| Kategorie | v2.3 | v3.0 | Delta |
|-----------|------|------|-------|
| OTC Supplements | 84 | 91 | +7 |
| Rx Medikamente | 1 | 6 | +5 |
| Peptide | 0 | 13 | +13 |
| **GESAMT** | **84** | **110** | **+26** |

---

## Neue Compounds

### Rx Medikamente (6)
- Rapamycin (Sirolimus) - ITP: +9-14% Lifespan
- Acarbose - ITP: +11-17% Lifespan (Rapa+Acarbose: +28-34%)
- Testosterone (TRT) - 100-200mg/week
- Semaglutide (Wegovy/Ozempic) - STEP: -15% Gewicht
- Tirzepatide (Mounjaro/Zepbound) - SURMOUNT: -20-22% Gewicht

### Peptide (13)
- BPC-157 (Healing) - VEGF, Angiogenese
- TB-500 (Thymosin β4) - Wundheilung +42-61%
- GHK-Cu (Skin) - Kollagen +70%
- MOTS-c (Longevity) - Exercise Mimetic
- Humanin (Neuro) - Centenarians haben höhere Level
- SS-31 (Mito) - Cardiolipin Binding
- Epitalon (Telomere) - Telomerase +33%
- MK-677 (Ibutamoren) - GH +600%
- Ipamorelin (GHRP) - Sauberste GHRP
- CJC-1295 (GHRH) - GH Puls Frequenz
- Tesamorelin (FDA) - Viszerales Fett
- Semax (Nootropic) - BDNF +3x
- Selank (Anxiolytic) - Tuftsin Analog

### Neue OTC (7)
- Sulforaphan (Nrf2 Master Activator)
- Phosphatidylserin (Cortisol -30-39%)
- ALCAR (Acetyl-L-Carnitin)
- Selen (Thyroid Essential)
- Jod (Thyroid Essential)
- Lithium low-dose (Neuroprotective)
- Kupfer (Collagen Synthesis)
- 5-HTP/Tryptophan (Serotonin)

---

## Technische Änderungen

### 1. Neue CSV-Spalten (6 neue Felder)

```
compound_class      → otc | rx | peptide
rx_dosing_protocol  → weekly_cycling, daily_with_meals, weekly_injection, weekly_escalation
rx_monitoring_required → lipids,glucose,CBC, testosterone,estradiol,hematocrit, etc.
notes               → Wissenschaftliche Notizen (ITP Daten, Trial Namen)
peptide_route       → subcutaneous, oral, intranasal, topical
peptide_half_life   → 4h, 24h, minutes, hours
```

### 2. TypeScript Types Update

**Datei:** `src/types/relevanceMatrix.ts`

Neue Interfaces für Rx/Peptide Metadata:
```typescript
export interface CompoundMetadata {
  compound_class: 'otc' | 'rx' | 'peptide';
  rx_dosing_protocol?: string;
  rx_monitoring_required?: string;
  notes?: string;
  peptide_route?: string;
  peptide_half_life?: string;
}
```

### 3. Parser Update

**Datei:** `src/lib/matrixCSVParser.ts`

- Version-Header auf v3.0 aktualisieren
- `ParsedMatrixCSVEntry` Interface erweitern
- Neue Evidence-Level: `animal_strong`, `emerging`
- Compound-Metadata parsing hinzufügen

### 4. CSV-Datei austauschen

**Datei:** `src/data/ares-matrix-v2.3.csv` → `src/data/ares-matrix-v3.0.csv`

- BOM entfernen (bereits in v2.3 gefixt)
- 110 Rows statt 86
- 6 neue Spalten

### 5. Admin UI Labels

**Datei:** `src/pages/Admin.tsx`

- "Matrix Import v2.3" → "Matrix Import v3.0"
- "86 Wirkstoffe" → "110 Compounds (OTC + Rx + Peptide)"
- Button: "CSV Matrix v3.0 importieren"

### 6. Import-Handler Update

**Datei:** Der Import-Handler muss die neuen Felder in die Datenbank schreiben

Neue `supplement_database` Spalten (optional über Migration):
- `compound_class` (text)
- `rx_dosing_protocol` (text)
- `rx_monitoring_required` (text)
- `peptide_route` (text)
- `peptide_half_life` (text)
- `notes` (text) → könnte auch in `relevance_matrix.evidence_notes.critical_insight` gehen

---

## Dateien-Übersicht

| Datei | Aktion |
|-------|--------|
| `src/data/ares-matrix-v3.0.csv` | **NEU** - CSV kopieren von Upload |
| `src/data/ares-matrix-v2.3.csv` | **LÖSCHEN** oder als Legacy behalten |
| `src/types/relevanceMatrix.ts` | **BEARBEITEN** - CompoundMetadata Interface |
| `src/lib/matrixCSVParser.ts` | **BEARBEITEN** - v3.0 Parser mit neuen Feldern |
| `src/pages/Admin.tsx` | **BEARBEITEN** - Import-Pfad + Labels |
| Migration (optional) | **NEU** - Neue DB-Spalten für Rx/Peptide Metadata |

---

## Migrations-Strategie

### Option A: Minimal (Empfohlen)
- Neue Felder nur in `relevance_matrix` JSONB speichern
- Kein Schema-Change nötig
- Sofort einsatzbereit

### Option B: Vollständig
- Eigene Spalten für `compound_class`, `rx_*`, `peptide_*`
- Bessere Filterbarkeit in SQL
- Erfordert Migration

**Empfehlung:** Option A für schnelles Deployment, Option B später bei Bedarf.

---

## Erwartetes Ergebnis

Nach dem v3.0 Import:
- **Geparst:** 110
- **Gematcht:** ~100+ (abhängig von DB-Coverage)
- **Aktualisiert:** ~100+
- **Übersprungen:** einige Multi-Ingredient Stacks

Die vollständige OTC + Rx + Peptide Matrix ist live mit wissenschaftlichen Notizen aus PEARL, STEP, SURMOUNT, ITP Trials.

