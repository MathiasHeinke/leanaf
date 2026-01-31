
# Fix: Vollstaendiger JSON-Import mit allen Daten

## Das Problem

Die hochgeladenen JSON-Dateien (`moleqlar-2.json`, `naturtreu-2.json`) enthalten **reichhaltige, bereits aufbereitete Daten** im Format eines Datenbank-Exports:

```json
{
  "id": "uuid-hier",
  "product_name": "Alpha-Ketoglutarat (Ca-AKG)",
  "supplement_id": "uuid-aus-supplement_database",  // BEREITS VERLINKT!
  "bioavailability": 8.0,
  "potency": 10.0,
  "reviews": 8.0,
  "origin": 10.0,
  "lab_tests": 10.0,
  "purity": 10.0,
  "value": 8.0,
  "impact_score_big8": 9.0,
  "amazon_asin": "B0B4K6SPYB",
  "amazon_url": "https://www.amazon.de/dp/B0B4K6SPYB",
  ...
}
```

Die aktuelle Edge-Function `seed-manufacturer-products` erwartet aber ein **anderes Format** (manufacturer-style) und ignoriert:
- Big8 Scores (bioavailability, potency, reviews, etc.)
- Amazon-Daten (asin, url, image)
- Bereits vorhandene supplement_id Verlinkungen
- impact_score_big8

## Die Loesung

Neue Edge-Function `import-enriched-products` erstellen, die das Export-Format direkt importiert/upserted.

---

## Schritt 1: Neue Edge-Function erstellen

**Datei:** `supabase/functions/import-enriched-products/index.ts`

Funktionalitaet:
- Akzeptiert Array von Produkten im enriched-Format (wie die JSON-Dateien)
- Matched Produkte ueber `brand_slug` + `product_name` (Upsert)
- Importiert ALLE Felder direkt:
  - Big8 Scores: `bioavailability`, `potency`, `reviews`, `origin`, `lab_tests`, `purity`, `value`
  - `impact_score_big8`
  - Amazon-Daten: `amazon_asin`, `amazon_url`, `amazon_image`, `amazon_name`
  - `supplement_id` direkt aus JSON (keine Neuberechnung)
  - `is_recommended`, `is_organic`, `quality_tags`, etc.

---

## Schritt 2: Utility-Funktion im Frontend

**Datei:** `src/utils/importEnrichedProducts.ts`

```typescript
export async function importEnrichedProductsFromFile(jsonData: any[]) {
  const batchSize = 50;
  // Gruppiere nach brand_slug
  // Sende an Edge-Function in Batches
  // Returniere Statistiken
}
```

---

## Schritt 3: Re-Import der JSON-Daten

Nach Deployment der neuen Edge-Function:
1. `moleqlar-2.json` importieren (~84 Produkte)
2. `naturtreu-2.json` importieren (~88 Produkte)

---

## Erwartetes Ergebnis

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Produkte mit Big8 Scores | 575 | 750 (100%) |
| Produkte mit Amazon-Daten | 352 | ~450+ |
| Produkte mit supplement_id | 572 | ~700+ |
| Produkte mit impact_score_big8 | 750 | 750 (100%) |

---

## Technische Details

### Interface fuer enriched Produkt:
```typescript
interface EnrichedProduct {
  product_name: string;
  brand_slug: string;
  pack_size?: number;
  pack_unit?: string;
  servings_per_pack?: number;
  dose_per_serving?: number;
  dose_unit?: string;
  price_eur?: number;
  price_per_serving?: number;
  form?: string;
  is_vegan?: boolean | string;
  is_organic?: boolean | string;
  is_verified?: boolean | string;
  is_recommended?: boolean | string;
  quality_tags?: string;
  supplement_name?: string;
  
  // Big8 Scores
  bioavailability?: number;
  potency?: number;
  reviews?: number;
  origin?: number | string;
  lab_tests?: number;
  purity?: number;
  value?: number;
  impact_score_big8?: number;
  
  // Amazon
  amazon_asin?: string;
  amazon_url?: string;
  amazon_image?: string;
  amazon_name?: string;
}
```

### NaN-Handling:
Die JSON-Dateien enthalten `NaN` als Werte (Python-Export). Diese werden beim Import zu `null` konvertiert.

### Matching-Logik:
1. Brand-ID ueber `brand_slug` holen
2. supplement_id ueber `supplement_name` matchen (falls vorhanden)
3. Produkt ueber `brand_id` + `product_name` finden (Upsert)
