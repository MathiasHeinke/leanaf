
# Erweitere Import-Funktion auf 55 Felder

## Aktuelle Situation

Die Edge-Function `import-enriched-products` importiert nur 25 von 55 moeglichen Feldern. Es fehlen kritische Daten:

### Fehlende Quality-Score Felder (Hyper-Scoring Layer A)
- quality_bioavailability
- quality_dosage
- quality_form  
- quality_purity
- quality_research
- quality_synergy
- quality_transparency
- quality_value

### Fehlende Produkt-Details
- category
- country_of_origin
- ingredients (JSON)
- product_url
- short_description
- timing
- serving_size
- servings_per_container
- dosage_per_serving

### Fehlende Flags/Meta
- is_deprecated
- is_gluten_free
- match_score
- popularity_score
- product_sku
- allergens (Array)

---

## Loesung

Erweiterung der Edge-Function um ALLE 55 Spalten der `supplement_products` Tabelle.

### Aenderungen an `import-enriched-products/index.ts`

```typescript
const productData = {
  // === BEREITS VORHANDEN (25 Felder) ===
  brand_id, product_name, supplement_id,
  pack_size, pack_unit, servings_per_pack, dose_per_serving, dose_unit,
  price_eur, price_per_serving, form,
  is_vegan, is_organic, is_verified, is_recommended, quality_tags,
  bioavailability, potency, reviews, origin, lab_tests, purity, value,
  impact_score_big8,
  amazon_asin, amazon_url, amazon_image, amazon_name,
  
  // === NEU: Hyper-Scoring Quality (8 Felder) ===
  quality_bioavailability: parseNumber(product.quality_bioavailability),
  quality_dosage: parseNumber(product.quality_dosage),
  quality_form: parseNumber(product.quality_form),
  quality_purity: parseNumber(product.quality_purity),
  quality_research: parseNumber(product.quality_research),
  quality_synergy: parseNumber(product.quality_synergy),
  quality_transparency: parseNumber(product.quality_transparency),
  quality_value: parseNumber(product.quality_value),
  
  // === NEU: Produkt-Details (9 Felder) ===
  category: sanitizeValue(product.category),
  country_of_origin: sanitizeValue(product.country_of_origin),
  ingredients: parseJson(product.ingredients),
  product_url: sanitizeValue(product.product_url),
  short_description: sanitizeValue(product.short_description),
  timing: sanitizeValue(product.timing),
  serving_size: sanitizeValue(product.serving_size),
  servings_per_container: parseNumber(product.servings_per_container),
  dosage_per_serving: sanitizeValue(product.dosage_per_serving),
  
  // === NEU: Flags und Meta (6 Felder) ===
  is_deprecated: parseBoolean(product.is_deprecated),
  is_gluten_free: parseBoolean(product.is_gluten_free),
  match_score: parseNumber(product.match_score),
  popularity_score: parseNumber(product.popularity_score),
  product_sku: sanitizeValue(product.product_sku),
  allergens: parseStringArray(product.allergens),
};
```

---

## Technische Details

### Neue Helper-Funktionen

```typescript
// Parse JSON field (ingredients)
function parseJson(val: unknown): Json | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return val as Json;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return null;
}

// Parse string array (allergens, quality_tags)
function parseStringArray(val: unknown): string[] | null {
  if (val === null || val === undefined) return null;
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') {
    // Handle "item1; item2; item3" format
    return val.split(/[;,]/).map(s => s.trim()).filter(Boolean);
  }
  return null;
}
```

### quality_tags Anpassung

Aktuell wird `quality_tags` als String importiert, aber die DB erwartet `string[]`. Anpassung noetig:

```typescript
quality_tags: parseStringArray(product.quality_tags),
```

---

## Ergebnis nach Implementierung

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Importierte Felder | 25 | 55 (100%) |
| Hyper-Scoring Data | Unvollstaendig | Komplett |
| Produkt-URLs | Nicht importiert | Importiert |
| Timing-Daten | Nicht importiert | Importiert |

Nach dem Re-Import der JSON-Dateien werden alle 70 Felder deines Datensatzes korrekt in die Datenbank geschrieben (55 direkt, 15 via JOINs aus Brand/Supplement-Tabellen).
