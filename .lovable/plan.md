

# ASIN-Korrektur via CSV-Import

## Aktueller Status

| Metrik | Wert |
|--------|------|
| Total Produkte | 857 |
| Produkte mit fehlerhaften/duplizierten ASINs | 347 |
| Produkte mit korrekten unique ASINs | 368 |
| Produkte ohne ASIN | 142 |

## Neuer Ansatz

Statt die fehlerhaften ASINs zu loeschen, werden sie durch die korrekten Werte aus einer bereinigten CSV ersetzt.

## Ablauf

1. Du sendest die korrigierte CSV mit den richtigen Amazon-Daten
2. Die Edge Function liest die CSV und aktualisiert die Produkte
3. Matching erfolgt ueber `product_name` + `brand_id` (oder `brand_slug`)

## Dateien die geaendert werden

| Datei | Aenderung |
|-------|-----------|
| `supabase/functions/import-products-csv/index.ts` | Update-Logik fuer Amazon-Felder hinzufuegen |

## CSV-Format (erwartet)

Die CSV sollte mindestens diese Spalten enthalten:

| Spalte | Beschreibung | Pflicht |
|--------|--------------|---------|
| `product_name` | Produktname zum Matching | Ja |
| `brand_slug` | Marken-Slug zum Matching | Ja |
| `amazon_asin` | Korrigierte ASIN | Ja |
| `amazon_url` | Korrigierter Amazon-Link | Optional |
| `amazon_name` | Produktname auf Amazon | Optional |
| `amazon_image_url` | Amazon Produktbild | Optional |

## Technische Umsetzung

### Neue Funktion in Edge Function

```typescript
// Handle Amazon data update from CSV
if (body.update_amazon_data && Array.isArray(body.update_amazon_data)) {
  const updates = body.update_amazon_data;
  let updated = 0;
  let notFound = 0;
  
  for (const item of updates) {
    // Find product by name + brand
    const { data: product } = await supabase
      .from("supplement_products")
      .select("id")
      .eq("product_name", item.product_name)
      .eq("brand_id", item.brand_id)
      .single();
    
    if (product) {
      await supabase
        .from("supplement_products")
        .update({
          amazon_asin: item.amazon_asin,
          amazon_url: item.amazon_url,
          amazon_name: item.amazon_name,
          amazon_image_url: item.amazon_image_url
        })
        .eq("id", product.id);
      updated++;
    } else {
      notFound++;
    }
  }
  
  return { success: true, updated, not_found: notFound };
}
```

## Erwartetes Ergebnis

Nach dem Import:
- 857 Produkte (unveraendert)
- Alle ASINs sind unique und korrekt
- Amazon-Links funktionieren fuer alle zugeordneten Produkte

## Naechster Schritt

Bitte sende die korrigierte CSV-Datei, dann fuehre ich das Update durch.

