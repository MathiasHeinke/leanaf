

# Fix: Edge Function Brand-Lookup korrigieren

## Problem

Die Edge Function `import-products-csv` sucht nach der Spalte `brand_slug` in der `supplement_brands` Tabelle, aber die Spalte heisst dort nur `slug`. Deshalb schlaegt der Lookup fehl und alle 877 Produkte bekommen den Fehler "Brand not found".

## Aktuelle fehlerhafte Zeilen

```typescript
// Zeile 135
.select("id, brand_slug");  
// Zeile 137
const brandMap = new Map(brands?.map(b => [b.brand_slug, b.id]) || []);
```

## Loesung

Aendern zu:

```typescript
// Zeile 135
.select("id, slug");  
// Zeile 137
const brandMap = new Map(brands?.map(b => [b.slug, b.id]) || []);
```

## Dateien die geaendert werden

| Datei | Aenderung |
|-------|-----------|
| `supabase/functions/import-products-csv/index.ts` | Zeile 135 + 137: `brand_slug` zu `slug` |

## Nach dem Fix

1. Edge Function re-deployen
2. Import erneut starten auf `/admin/import-csv`
3. 37 Duplikate loeschen

## Erwartetes Ergebnis

- 876 Produkte aktualisiert
- 1 Produkt neu eingefuegt (Sunday Natural Magnesium Komplex 7)
- 0 Fehler

