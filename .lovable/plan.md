

# Erweiterter CSV-Export mit allen Datenfeldern

## Problem

Die aktuelle Export-Funktion in `src/utils/exportProductsCSV.ts` exportiert nur 25 von 54 verfuegbaren Produkt-Feldern. Wichtige Amazon-Daten und Qualitaetsmetriken fehlen.

## Fehlende Felder im aktuellen Export

| Kategorie | Felder |
|-----------|--------|
| **Amazon-Daten** | `amazon_url`, `amazon_image`, `amazon_name`, `match_score` |
| **Quality-Scores** | `quality_purity`, `quality_bioavailability`, `quality_dosage`, `quality_synergy`, `quality_research`, `quality_form`, `quality_value`, `quality_transparency` |
| **Produkt-Metriken** | `bioavailability`, `potency`, `reviews`, `purity`, `value`, `lab_tests`, `impact_score_big8` |
| **Sonstiges** | `short_description`, `origin`, `category`, `timing`, `is_gluten_free`, `country_of_origin`, `serving_size`, `servings_per_container`, `dosage_per_serving` |

## Loesung

Die Export-Funktion erweitern um **alle 54 Felder** zu inkludieren.

## Dateien die geaendert werden

| Datei | Aenderung |
|-------|-----------|
| `src/utils/exportProductsCSV.ts` | Alle fehlenden Felder zu CSV_HEADERS und productToCSVRow hinzufuegen |

## Neue CSV-Struktur (vollstaendig)

### Produkt-Daten (54 Felder)

```text
id, brand_id, supplement_id, product_name, product_sku, pack_size, pack_unit,
servings_per_pack, dose_per_serving, dose_unit, ingredients, price_eur,
price_per_serving, form, is_vegan, is_organic, is_gluten_free, allergens,
product_url, amazon_asin, amazon_url, amazon_image, amazon_name, match_score,
is_verified, is_recommended, popularity_score, short_description,
bioavailability, potency, reviews, origin, lab_tests, purity, value,
impact_score_big8, category, serving_size, servings_per_container,
dosage_per_serving, quality_purity, quality_bioavailability, quality_dosage,
quality_synergy, quality_research, quality_form, quality_value,
quality_transparency, timing, country_of_origin, quality_tags,
created_at, updated_at
```

### Plus verknuepfte Daten

- **Brand**: name, slug, country, website, price_tier, specialization, quality_certifications
- **Supplement**: name, category, default_dosage, etc.

## Implementierung

### Schritt 1: CSV_HEADERS erweitern

```typescript
const CSV_HEADERS = [
  // IDs
  'id',
  'brand_id',
  'supplement_id',
  
  // Produkt-Basis
  'product_name',
  'product_sku',
  'short_description',
  'category',
  
  // Packung & Dosierung
  'pack_size',
  'pack_unit',
  'servings_per_pack',
  'serving_size',
  'servings_per_container',
  'dose_per_serving',
  'dosage_per_serving',
  'dose_unit',
  'form',
  'timing',
  
  // Preis
  'price_eur',
  'price_per_serving',
  
  // Amazon-Daten (NEU)
  'amazon_asin',
  'amazon_url',
  'amazon_image',
  'amazon_name',
  'match_score',
  
  // Shop & Links
  'product_url',
  
  // Eigenschaften
  'is_vegan',
  'is_organic',
  'is_gluten_free',
  'allergens',
  'origin',
  'country_of_origin',
  
  // Quality-Scores (NEU - 8 Felder)
  'quality_purity',
  'quality_bioavailability',
  'quality_dosage',
  'quality_synergy',
  'quality_research',
  'quality_form',
  'quality_value',
  'quality_transparency',
  
  // Metriken (NEU)
  'bioavailability',
  'potency',
  'purity',
  'value',
  'reviews',
  'lab_tests',
  'impact_score_big8',
  'popularity_score',
  
  // Status
  'is_verified',
  'is_recommended',
  'quality_tags',
  'ingredients',
  
  // Timestamps
  'created_at',
  'updated_at',
  
  // Brand-Daten
  'brand_name',
  'brand_slug',
  // ...
];
```

### Schritt 2: productToCSVRow anpassen

Alle neuen Felder in der gleichen Reihenfolge hinzufuegen.

## Erwartetes Ergebnis

| Vorher | Nachher |
|--------|---------|
| 25 Produkt-Felder | 54 Produkt-Felder |
| Keine Amazon-URLs | Alle Amazon-Daten |
| Keine Quality-Scores | 8 Quality-Scores |
| ~45 Spalten total | ~70 Spalten total |

## Export-Datei

- Dateiname: `ares_products_FULL_export_YYYY-MM-DD.csv`
- Format: UTF-8 mit BOM fuer Excel
- Trennzeichen: Komma
- Arrays: Semikolon-getrennt in Anfuehrungszeichen

