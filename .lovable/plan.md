
# Matrix v3-3 Import: Vollständige Datenbankfüllung

## Ausgangssituation

| Metrik | Status |
|--------|--------|
| **Total Supplements** | 111 |
| **Mit Matrix** | 57 (51%) |
| **Ohne Matrix** | 54 (49%) |

### Die 54 fehlenden Supplements (nach Kategorie)

| Kategorie | Fehlend |
|-----------|---------|
| **Magnesium-Varianten** | Magnesium Glycinat, Magnesiumcitrat, Magnesium Komplex 11 Ultra |
| **Vitamin-Varianten** | Vitamin D3 + K2 MK7 Tropfen, Vitamin D Balance, Vitamin C, Vitamin C (liposomal), Methyl Folate, A-Z Komplex, Multivitamin |
| **Aminosäuren** | Creatine Monohydrat, EAA Komplex, L-Citrullin, Taurin (kardioprotektiv), NAC, GlyNAC, HMB 3000 |
| **Adaptogens** | Ashwagandha KSM-66, Curcumin Longvida, Shilajit, Turkesterone Max |
| **Longevity** | NMN (Nicotinamid Mononukleotid), NMN sublingual, Alpha-Ketoglutarat (AKG), CaAKG, Alpha-Liponsäure, Pterostilben, TUDCA, Urolithin A |
| **Kollagen** | Kollagen, Kollagen Peptide |
| **Resveratrol** | Resveratrol, Trans-Resveratrol |
| **Probiotika** | Probiona Kulturen Komplex, Probiotika Multi-Strain |
| **Zink** | Zink Bisglycinat, Zinc Complex |
| **Sonstige** | Omega-3 (EPA/DHA), Elektrolyte (LMNT), Silymarin, Pinienrinden Extrakt, Schwarzkümmelöl 1000, Protein Pulver |
| **Stack-Produkte (Skip)** | Pre-Workout Komplex, Sport Stack, Nootropic, Schlaf, Frauen, Augen, Beauty, Haare, Gelenke |
| **Pharma (Skip)** | Metformin, Methylenblau 1% |

---

## Implementierungsplan

### Schritt 1: Matrix-Datei ins Projekt kopieren

Speichere die neue `ARES_INGREDIENT_RELEVANCE_MATRIX-3-3.md` als Referenz-Datei im Projekt:

```text
src/data/matrix-import-v3-3.md
```

### Schritt 2: Vollständigen Re-Import durchführen

Da die Edge-Function `import-matrix` bereits deployed ist und die MANUAL_OVERRIDES erweitert wurden, muss der Import mit den vollständigen Matrix-Daten aus der neuen Datei durchgeführt werden:

1. Alle 150 JSON-Blöcke aus der Markdown-Datei parsen
2. Edge-Function aufrufen mit allen Ingredients
3. Matching über erweiterte MANUAL_OVERRIDES

### Schritt 3: Import in Batches

Die 150 Wirkstoffe werden in 4 Batches verarbeitet:

| Batch | Wirkstoffe | Kategorien |
|-------|------------|------------|
| 1 | 1-40 | Vitamine, Mineralien |
| 2 | 41-80 | Aminosäuren, Fettsäuren |
| 3 | 81-120 | Adaptogene, Pilze, Longevity |
| 4 | 121-150 | Gut Health, Joints, Nootropics, Sonstige |

### Schritt 4: Validierung

Nach dem Import Stichproben-Queries:

```sql
-- Prüfe kritische Varianten
SELECT name, 
       relevance_matrix::text != '{}' as has_matrix
FROM supplement_database
WHERE name IN (
  'Ashwagandha KSM-66',
  'Magnesium Glycinat', 
  'NMN sublingual',
  'Creatine Monohydrat'
);
```

---

## Erwartetes Ergebnis

| Status | Anzahl | Prozent |
|--------|--------|---------|
| **Matrix zugewiesen** | ~100 | 90% |
| **Stack-Produkte (Skip)** | 9 | 8% |
| **Pharma (Skip)** | 2 | 2% |

Nach dem Import werden alle Varianten wie "Ashwagandha KSM-66", "Magnesium Glycinat" etc. die vollständigen 56-Attribute der Relevance Matrix haben - identisch zu ihren Master-Wirkstoffen.

---

## Technische Details

### Edge Function Matching-Logik

Die `findMatch()` Funktion prüft in dieser Reihenfolge:

1. **Manual Override**: `ingredient_id` gegen MANUAL_OVERRIDES Dictionary
2. **Exact Match**: Normalisierter Name-Vergleich
3. **Fuzzy Match**: Substring-Matching

### Kritische Mappings bereits in MANUAL_OVERRIDES

```text
'magnesium': ['magnesium glycinat', 'magnesiumcitrat', ...]
'ashwagandha': ['ashwagandha ksm-66', 'ksm66', ...]
'nmn': ['nmn sublingual', 'nmn (nicotinamid mononukleotid)', ...]
'creatine': ['creatine monohydrat', ...]
```

Die Overrides sind bereits synchronisiert zwischen Frontend-Matcher und Edge-Function.
