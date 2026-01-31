
# Bereinigung: Alte Produkte flaggen + leere Marken loeschen

## Zusammenfassung

Nach dem Bulk-Import muessen wir aufraeeumen:
- 1 altes Produkt als deprecated markieren
- 2 leere Marken komplett entfernen

## Aenderungen

### 1. Nordic Naturals Produkt als deprecated flaggen

```sql
UPDATE supplement_products
SET is_deprecated = true
WHERE id = 'e3571a11-16a0-4aa9-9fc3-499429f31a7b';
```

| Produkt | Marke | Aktion |
|---------|-------|--------|
| Ultimate Omega | Nordic Naturals | is_deprecated = true |

### 2. Leere Marken loeschen

```sql
DELETE FROM supplement_brands 
WHERE slug IN ('amazon-generic', 'lebenskraft-pur');
```

| Marke | Slug | Produkte | Aktion |
|-------|------|----------|--------|
| Amazon Generic | amazon-generic | 0 | Loeschen |
| Lebenskraft-pur | lebenskraft-pur | 0 | Loeschen |

## Code-Aenderung

Die Datei `src/data/supplementBrands.ts` muss aktualisiert werden um `Lebenskraft-pur` zu entfernen (ist dort noch gelistet).

## Ergebnis nach Bereinigung

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Marken in DB | 20 | 18 |
| Deprecated Produkte | ~74 | 75 (+1) |
| Aktive Produkte | ~695 | 694 |
