
# Impact Scores nachrechnen + Supplement-Verknuepfungen

## Zusammenfassung

Zwei Aufgaben:
1. **175 Produkte** ohne `impact_score_big8` berechnen
2. **259 Produkte** ohne `supplement_id` analysieren und verknuepfen

---

## Teil 1: Impact Score Big8 Berechnung

### Formel

Der `impact_score_big8` ist der **gewichtete Durchschnitt** der 8 Qualitaetsmetriken:

```text
impact_score_big8 = AVG(
  quality_bioavailability,
  quality_purity,
  quality_value,
  quality_dosage,
  quality_research,
  quality_transparency,
  quality_form,
  quality_synergy
)
```

### Betroffene Marken

| Marke | Fehlende Scores |
|-------|-----------------|
| Profuel | 35 |
| NOW Foods | 34 |
| Gloryfeel | 23 |
| Doctor's Best | 22 |
| Bulk | 20 |
| Life Extension | 20 |
| Gymbeam | 19 |
| ESN | 1 |
| Biogena | 1 |

### SQL Migration

```sql
UPDATE supplement_products
SET impact_score_big8 = ROUND(
  (COALESCE(quality_bioavailability, 7.0) +
   COALESCE(quality_purity, 7.0) +
   COALESCE(quality_value, 7.0) +
   COALESCE(quality_dosage, 7.0) +
   COALESCE(quality_research, 7.0) +
   COALESCE(quality_transparency, 7.0) +
   COALESCE(quality_form, 7.0) +
   COALESCE(quality_synergy, 7.0)) / 8,
  2
)
WHERE is_deprecated = false
  AND impact_score_big8 IS NULL;
```

---

## Teil 2: Supplement-Verknuepfungen

### Analyse der 259 fehlenden Links

| Erkanntes Supplement | Anzahl |
|---------------------|--------|
| Creatin | 16 |
| Selen | 13 |
| Protein (Whey) | 12 |
| B-Komplex | 11 |
| MSM | 8 |
| Alpha Liponsaeure | 8 |
| Reishi | 7 |
| Glucosamin | 6 |
| Folat | 6 |
| Cordyceps | 6 |
| Rhodiola | 5 |
| Boswellia | 5 |
| L-Carnitin | 5 |
| CoQ10 | 5 |
| Hyaluron | 5 |
| TMG | 4 |
| NAC | 4 |
| 5-HTP | 4 |
| ... | ... |
| **UNMATCHED** | **87** |

### Matching-Strategie

Die 172 matchbaren Produkte werden ueber Keyword-Matching verknuepft.

Die 87 UNMATCHED Produkte sind:
- **Komplexprodukte**: A-Z Depot, Multivitamin, Gelenk-Formeln
- **Nischenprodukte**: Inositol, Lithiumorotat, Urolithin A, Maitake
- **Sport-Spezielles**: Casein, MCT Oel, Pre-Workout Stacks
- **Marken-Formeln**: Orthomol Mental, MoleQlar ONE, Biogena Arthro

### SQL Matching Migration

```sql
-- Match products to supplement_database
WITH matches AS (
  SELECT 
    sp.id as product_id,
    sd.id as supplement_id,
    sd.name as supplement_name
  FROM supplement_products sp
  CROSS JOIN supplement_database sd
  WHERE sp.is_deprecated = false 
    AND sp.supplement_id IS NULL
    AND (
      -- Direct name matches
      sp.product_name ILIKE '%' || sd.name || '%'
      -- Pattern-based matches
      OR (sd.name = 'Creatin' AND (sp.product_name ILIKE '%kreatin%' OR sp.product_name ILIKE '%creatine%'))
      OR (sd.name = 'Selen' AND sp.product_name ILIKE '%selen%')
      OR (sd.name = 'Vitamin B-Komplex' AND (sp.product_name ILIKE '%b-komplex%' OR sp.product_name ILIKE '%b-complex%'))
      -- ... weitere Regeln
    )
)
UPDATE supplement_products sp
SET supplement_id = m.supplement_id
FROM matches m
WHERE sp.id = m.product_id;
```

---

## Technische Umsetzung

### Schritt 1: Impact Scores berechnen

Eine Migration berechnet `impact_score_big8` fuer alle 175 Produkte basierend auf den vorhandenen Big8-Qualitaetsmetriken.

### Schritt 2: Einfache Matches verknuepfen

172 Produkte mit eindeutigem Keyword-Match werden automatisch verknuepft:
- Creatin -> supplement_database `Creatin`
- Selen -> supplement_database `Selen`
- etc.

### Schritt 3: Komplexprodukte kategorisieren

Die 87 nicht-matchbaren Produkte werden in Kategorien eingeteilt:
- **Multivitamin** (A-Z Depot, Multivitamin Hochdosiert)
- **Gelenke** (Arthro Formula, Gelenk 1200)
- **Longevity Stacks** (ONE Daily, NAD+ Regenerator)
- **Sport** (Pre-Workout, Casein, MCT)
- **Speziell** (Inositol, Lithium, Urolithin)

---

## Erwartete Ergebnisse

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Produkte ohne Impact Score | 175 | 0 |
| Produkte ohne Supplement-Link | 259 | ~87 |
| Verlinkte Produkte | 491 | ~663 |

Die verbleibenden 87 Produkte sind Komplex-Formeln oder Nischenprodukte, die manuell kategorisiert werden sollten.
