

# Marken-Update mit JSON-Import: Naturtreu + MoleQlar

## Uebersicht der JSON-Dateien

| Datei | Marke | Produkte im JSON | Produkte in DB |
|-------|-------|------------------|----------------|
| `naturtreu-2.json` | Naturtreu | ~89 (7389 Zeilen / 83 Zeilen pro Eintrag) | 92 |
| `moleqlar-2.json` | MoleQlar | ~85 (7057 Zeilen / 83 Zeilen pro Eintrag) | 86 |

**Differenz:** Es gibt in der DB mehr Produkte als in den JSON-Dateien. Diese sollen zum Loeschen markiert werden.

## Anforderungen

1. **Produkte updaten:** Alle Produkte in den JSON-Dateien per ID-Matching aktualisieren
2. **Orphans flaggen:** Produkte in der DB, die NICHT in den JSONs vorkommen, zum Loeschen markieren

## Technische Umsetzung

### Phase 1: Datenbank-Spalte hinzufuegen

Eine neue Spalte `is_deprecated` (boolean, default false) zur `supplement_products` Tabelle hinzufuegen.

```sql
ALTER TABLE supplement_products 
ADD COLUMN is_deprecated BOOLEAN DEFAULT false;
```

### Phase 2: Edge Function erweitern

Neuer Modus `brand_sync` in der `import-products-csv` Edge Function:

```text
Ablauf:
1. Empfange: brand_slug + Array von Produkten (mit IDs)
2. Update alle Produkte per ID mit allen Feldern
3. Hole alle Produkt-IDs dieser Marke aus DB
4. Vergleiche: DB-IDs minus JSON-IDs = Orphans
5. Setze is_deprecated = true fuer alle Orphans
6. Return: updated, deprecated, errors
```

### Phase 3: Admin-UI erweitern

`ImportCSVRunner.tsx` um JSON-Upload erweitern:

- Datei-Upload fuer JSON
- Brand-Auswahl (Naturtreu/MoleQlar)
- Button "Brand Sync starten"
- Anzeige: Aktualisiert / Deprecated

## Datenmapping (JSON zu DB)

Die JSON-Dateien haben identische Felder wie die DB, mit folgenden Besonderheiten:

| JSON-Feld | DB-Feld | Transformation |
|-----------|---------|----------------|
| `shop_url` | `product_url` | Direktes Mapping |
| `is_vegan` = "Ja" | `is_vegan` = true | String zu Boolean |
| `NaN` | NULL | NaN-Werte zu NULL |
| `quality_tags` = "a; b; c" | `quality_tags` = ["a","b","c"] | String zu Array (;-getrennt) |

## Dateien die geaendert werden

| Datei | Aenderung |
|-------|-----------|
| Migration (neu) | `is_deprecated` Spalte hinzufuegen |
| `supabase/functions/import-products-csv/index.ts` | `brand_sync` Modus hinzufuegen |
| `src/pages/admin/ImportCSVRunner.tsx` | JSON-Upload + Brand-Sync UI |

## Implementierungsdetails

### Edge Function: brand_sync Modus

```typescript
if (brand_sync && brand_sync.brand_slug && brand_sync.products) {
  const { brand_slug, products } = brand_sync;
  
  // 1. Get brand_id
  const { data: brand } = await supabase
    .from("supplement_brands")
    .select("id")
    .eq("slug", brand_slug)
    .single();
  
  // 2. Get all current product IDs for this brand
  const { data: existingProducts } = await supabase
    .from("supplement_products")
    .select("id")
    .eq("brand_id", brand.id);
  
  const existingIds = new Set(existingProducts.map(p => p.id));
  const jsonIds = new Set(products.map(p => p.id));
  
  // 3. Update all products from JSON
  for (const product of products) {
    await supabase
      .from("supplement_products")
      .update({
        product_name: product.product_name,
        price_eur: product.price_eur,
        product_url: product.shop_url, // shop_url -> product_url
        bioavailability: product.bioavailability,
        // ... alle weiteren Felder
        is_deprecated: false, // Explizit auf false setzen
      })
      .eq("id", product.id);
  }
  
  // 4. Mark orphans as deprecated
  const orphanIds = [...existingIds].filter(id => !jsonIds.has(id));
  
  for (const orphanId of orphanIds) {
    await supabase
      .from("supplement_products")
      .update({ is_deprecated: true })
      .eq("id", orphanId);
  }
  
  return { updated: jsonIds.size, deprecated: orphanIds.length };
}
```

### Admin UI Erweiterung

```text
+--------------------------------------------------+
| Brand Product Sync                               |
+--------------------------------------------------+
| [Upload JSON]     [v Naturtreu ]  [Sync starten] |
|                                                  |
| Status: Bereit                                   |
|                                                  |
| +------------+  +------------+  +------------+   |
| | Aktualisiert | | Deprecated | | Fehler     |   |
| |     85       | |     4      | |    0       |   |
| +------------+  +------------+  +------------+   |
+--------------------------------------------------+
```

## Erwartetes Ergebnis

Nach dem Sync fuer beide Marken:

| Marke | Vorher | Aktualisiert | Deprecated |
|-------|--------|--------------|------------|
| Naturtreu | 92 | ~89 | ~3 |
| MoleQlar | 86 | ~85 | ~1 |

Die deprecateten Produkte koennen dann manuell geprueft und geloescht werden.

## Ablauf

1. Migration ausfuehren: `is_deprecated` Spalte
2. Edge Function deployen mit `brand_sync` Modus  
3. Admin-UI aktualisieren mit JSON-Upload
4. `naturtreu-2.json` hochladen und syncen
5. `moleqlar-2.json` hochladen und syncen
6. Deprecated-Produkte pruefen

