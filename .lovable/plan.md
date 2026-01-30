

# Vollständiger CSV-Import: Amazon-Daten + Shop-URLs

## Analyse-Ergebnis

Die hochgeladene CSV `lovable_FINAL_v4_COMPLETE.csv` enthält 877 Produkte mit folgenden enriched Daten:

| Feld | CSV-Spalte | Eintraege gefuellt | Aktuell in DB |
|------|------------|---------------------|---------------|
| Amazon ASIN | `amazon_asin` | ~600 | 715 (teilweise falsch) |
| Amazon Link | `amazon_url` | ~600 | 714 |
| Amazon Bild | `amazon_image` | ~580 | ~580 |
| Amazon Name | `amazon_name` | ~150 | ~150 |
| Match Score | `match_score` | ~550 | ~550 |
| **Shop URL** | `shop_url` | **~400** | **0** |

### Das Problem

1. **Shop-URLs fehlen komplett** - Die CSV hat sie, die DB nicht
2. **Manche ASINs sind Duplikate** - Muessen durch korrekte ersetzt werden
3. **Die CSV hat IDs** - Damit koennen wir gezielt updaten

## Import-Strategie

### Phase 1: Datenbank-Spalte anpassen

Die CSV nutzt `shop_url`, aber die DB hat `product_url`. Wir mappen `shop_url` auf `product_url`.

### Phase 2: Edge Function erweitern

Die `update_amazon_data`-Funktion muss erweitert werden um:
- `shop_url` → `product_url` zu mappen
- Update per **ID** statt Name+Brand (zuverlaessiger)

### Phase 3: Voll-Update ausfuehren

Alle 877 Produkte werden aktualisiert mit:
- Korrigierte `amazon_asin`
- Korrigierte `amazon_url`
- `amazon_image`
- `amazon_name`
- `match_score`
- **NEU: `product_url`** (Shop-Links)

## Technische Umsetzung

### Dateien die geaendert werden

| Datei | Aenderung |
|-------|-----------|
| `supabase/functions/import-products-csv/index.ts` | `full_update`-Modus mit ID-basiertem Update + shop_url Support |

### Neue Update-Logik

```typescript
// Handle full product update from enriched CSV
if (full_update && Array.isArray(full_update) && full_update.length > 0) {
  for (const item of full_update) {
    // Update by ID (most reliable)
    if (item.id) {
      await supabase
        .from("supplement_products")
        .update({
          amazon_asin: cleanString(item.amazon_asin),
          amazon_url: cleanString(item.amazon_url),
          amazon_image: cleanString(item.amazon_image),
          amazon_name: cleanString(item.amazon_name),
          match_score: parseNumber(item.match_score),
          product_url: cleanString(item.shop_url), // Map shop_url -> product_url
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
    }
  }
}
```

## CSV-Felder die importiert werden

| CSV-Spalte | DB-Spalte | Beschreibung |
|------------|-----------|--------------|
| `id` | (Matching) | UUID fuer praezises Update |
| `amazon_asin` | `amazon_asin` | Korrigierte/unique ASIN |
| `amazon_url` | `amazon_url` | Amazon Produkt-Link |
| `amazon_image` | `amazon_image` | Amazon Produktbild-URL |
| `amazon_name` | `amazon_name` | Produktname auf Amazon |
| `match_score` | `match_score` | ASIN-Match-Konfidenz |
| `shop_url` | `product_url` | Direktlink zum Hersteller-Shop |

## Erwartetes Ergebnis

Nach dem Import:

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Produkte | 857 | 857 |
| Mit Shop-URL | 0 | ~400 |
| Mit Amazon-ASIN (korrigiert) | 715 (Duplikate) | ~600 (unique) |
| Mit Amazon-URL | 714 | ~600 |

## Ablauf

1. Edge Function deployen mit neuem `full_update`-Handler
2. CSV parsen und alle 877 Zeilen als Update-Payload senden
3. Per ID matchen und alle Felder aktualisieren
4. Ergebnis pruefen

