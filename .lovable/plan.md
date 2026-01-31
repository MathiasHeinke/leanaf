

# Deep Enrichment System: Vollstandige Produktanreicherung

## Problem

Das aktuelle "Anreichern" fullt nur 17 von 54+ Feldern aus und die Big8 Scores werden ohne echte Datengrundlage geschatzt.

### Aktuell erfasste Felder (17)
```text
product_name, brand_name, price_eur, pack_size, pack_unit,
dose_per_serving, dose_unit, servings_per_pack, price_per_serving,
amazon_asin, amazon_image, is_vegan, is_organic, quality_tags,
ingredients, description + 8 Big8 Scores (geschatzt)
```

### Fehlende Felder (37+)
```text
PRODUKT: form, category, product_sku, serving_size, dosage_per_serving,
         is_gluten_free, is_verified, is_recommended, allergens,
         country_of_origin, short_description, timing, popularity_score

QUALITY: bioavailability, potency, reviews, origin, lab_tests, purity, value

AMAZON: amazon_url, amazon_name, match_score

INTERAKTIONEN: synergies, blockers (von supplement_database)

BRAND: country, website, price_tier, certifications (von supplement_brands)
```

---

## Losung: 3-Stufen Deep Enrichment

### Stufe 1: Smart Product Analysis

Detaillierte LLM-Analyse mit produktspezifischen Daten:
- Form-Erkennung (Kapsel/Tablette/Pulver/Liposomal/Softgel)
- Ingredientien-Parsing (aktive vs. Fullstoffe)
- Qualitats-Flag-Erkennung (GMP, Made in Germany, Lab-tested)
- Allergen-Erkennung

### Stufe 2: Database Context Enrichment

Daten aus der `supplement_database` ubernehmen:
- Synergies und Blockers vom gematchten Wirkstoff
- Evidence Level, Impact Score, Necessity Tier
- Timing Constraints, Cycling Protocol
- Hallmarks Addressed

### Stufe 3: Brand Intelligence

Daten aus der `supplement_brands` Tabelle:
- Country of Origin, Price Tier
- Quality Certifications
- Automatische Brand-Zuordnung oder Neu-Erstellung

### Stufe 4: Smart Big8 Scoring

Regelbasierte + KI-gestutzte Berechnung basierend auf:

| Score | Regel-Faktoren |
|-------|----------------|
| Bioavailability | Form (Liposomal=10, Chelat=9, Citrat=8.5, Oxid=5) |
| Dosage | Dosis vs. klinischer Standard aus supplement_database |
| Form | Produkt-Form Mapping |
| Purity | Zusatzstoffe-Count, Quality Tags |
| Research | Evidence Level von supplement_database |
| Synergy | Vorhandene Synergies Count |
| Transparency | Lab-Tests, Zertifikate, COA |
| Value | Preis pro klinischer Dosis im Marktvergleich |

---

## Technische Umsetzung

### Edge Function: `enrich-product-submission/index.ts`

Komplett-Neuschreibung mit 4 Stufen:

```text
STEP 1: Re-analyze scraped content
        - Besseres LLM-Prompt fur alle Felder
        - Form/Category/Allergen-Erkennung

STEP 2: Database lookup
        - supplement_database fur Wirkstoff-Daten
        - supplement_brands fur Marken-Daten (oder create new)

STEP 3: Calculate Big8 with real data
        - Regelbasiert wo moglich
        - KI nur fur Lucken

STEP 4: Merge all data into enriched_data
```

### UI Update: `ProductSubmissionsReview.tsx`

Erweiterte Anzeige mit Tabs:

```text
+-------------------------------------------+
| [Basis] [Qualitat] [Wirkstoff] [Marke]   |
+-------------------------------------------+
| Produkt: Clear Whey Protein Isolat        |
| Marke: Ruhls Bestes                       |
| Preis: €39.99 | Portionen: 30             |
| Form: Pulver | Dosis: 30g                 |
| Timing: Post-Workout                      |
| Category: Protein                         |
+-------------------------------------------+
| QUALITAT:                                 |
| - GMP Zertifiziert: Ja                    |
| - Lab-Tested: Unknown                     |
| - Allergens: Milch                        |
| - Quality Tags: Isolat, Clear             |
+-------------------------------------------+
| WIRKSTOFF (Whey Protein):                 |
| - Synergies: Creatin, BCAA                |
| - Evidence: High                          |
| - Timing: Post-Workout                    |
+-------------------------------------------+
| MARKE (Ruhls Bestes):                     |
| - Land: Deutschland                       |
| - Tier: Mid                               |
| - Status: NEU (wird erstellt)             |
+-------------------------------------------+
| BIG8 SCORES:                              |
| Bio: 8.5 (Isolat-Form)                    |
| Dos: 9.0 (30g = optimal)                  |
| ...                                       |
+-------------------------------------------+
```

### Neue Funktionen im Hook

```typescript
// useProductSubmissionsAdmin.ts
enrichSubmission(id: string): Promise<EnrichedData>
  // Ruft enrich-product-submission auf

// EnrichedData interface erweitert auf 54+ Felder
interface ExtendedEnrichedData {
  // === PRODUKT (20 Felder) ===
  product_name, brand_name, form, category,
  pack_size, pack_unit, servings_per_pack,
  dose_per_serving, dose_unit, dosage_per_serving,
  serving_size, price_eur, price_per_serving,
  is_vegan, is_organic, is_gluten_free,
  allergens, quality_tags, timing,
  short_description,

  // === AMAZON (5 Felder) ===
  amazon_asin, amazon_url, amazon_image,
  amazon_name, match_score,

  // === BIG8 (8 Felder) ===
  quality_bioavailability, quality_dosage,
  quality_form, quality_purity,
  quality_research, quality_synergy,
  quality_transparency, quality_value,

  // === LEGACY QUALITY (7 Felder) ===
  bioavailability, potency, reviews,
  origin, lab_tests, purity, value,

  // === SCORES (3 Felder) ===
  impact_score_big8, popularity_score, match_score,

  // === WIRKSTOFF (aus supplement_database) ===
  synergies, blockers, timing_constraint,
  cycling_protocol, evidence_level,
  necessity_tier, hallmarks_addressed,

  // === MARKE (aus supplement_brands) ===
  brand_country, brand_price_tier,
  brand_certifications, brand_id (UUID oder 'new')
}
```

---

## Dateistruktur

| Datei | Anderung |
|-------|----------|
| `supabase/functions/enrich-product-submission/index.ts` | Komplett-Neuschreibung mit 4-Stufen-System |
| `src/hooks/useProductSubmissionsAdmin.ts` | Erweiterte Interface und Approval-Logic |
| `src/components/admin/ProductSubmissionsReview.tsx` | Erweiterte Detail-Ansicht mit Tabs |

---

## Geschatzter Aufwand

45-60 Minuten fur das vollstandige Deep Enrichment System.

