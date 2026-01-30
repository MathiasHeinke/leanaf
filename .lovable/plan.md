

# CSV-Import & Duplikat-Bereinigung - Vollständiger Plan

## Übersicht

877 Produkte aus der angereicherten CSV importieren, dabei 25+ neue Spalten hinzufügen und anschließend 37 identifizierte Duplikate direkt löschen.

## Phase 1: Datenbank-Migration

Neue Spalten zu `supplement_products` hinzufügen:

| Kategorie | Neue Spalten |
|-----------|--------------|
| Qualitäts-Scores (0-10) | bioavailability, potency, reviews, origin, lab_tests, purity, value, impact_score_big8 |
| Quality-Subscores | quality_purity, quality_bioavailability, quality_dosage, quality_synergy, quality_research, quality_form, quality_value, quality_transparency |
| Produkt-Infos | short_description, category, serving_size, servings_per_container, dosage_per_serving, timing, is_gluten_free, country_of_origin |
| Amazon-Daten | amazon_url, amazon_image, amazon_name, match_score |

Technische Details:
- Alle Score-Felder: `NUMERIC(3,1)` für Werte wie 9.5
- impact_score_big8: `NUMERIC(4,2)` für Werte wie 9.41
- match_score: `NUMERIC(3,2)` für Werte wie 0.48
- Booleans: `is_gluten_free` mit DEFAULT false
- Texte: `short_description`, `timing`, `category`, etc.

## Phase 2: Edge Function erstellen

Neue Edge Function `import-products-csv` mit folgender Logik:

```text
1. CSV-Daten als JSON-Array empfangen (877 Produkte)
2. Für jede Zeile:
   a. Prüfe ob ID in DB existiert → UPDATE
   b. Wenn nicht → INSERT (neues Produkt)
3. Boolean-Konvertierung: "Ja"/"True" → true
4. Leere Werte → NULL
5. brand_id via brand_slug Lookup
6. Return: Statistiken (updated, inserted, errors)
```

## Phase 3: CSV-Import ausführen

Die Edge Function wird mit den 877 Produkten aufgerufen:
- 876 Produkte: UPDATE mit neuen Feldern
- 1 Produkt: INSERT (Sunday Natural "Magnesium Komplex 7")

## Phase 4: Duplikate löschen

Direkte Löschung der 37 identifizierten Duplikate:

| Marke | Anzahl | Zu löschende Produkte |
|-------|--------|----------------------|
| Biogena | 3 | Ashwagandha KSM-66 500mg, Berberin 500mg, Colostrum Gold 60 Kapseln |
| Nature Love | 2 | Omega-3 vegan aus Algenöl, Vitamin D3 + K2 Tropfen |
| Doppelherz | 4 | Omega-3 1000mg, Omega-3 Seefischöl 1000, Vitamin D3 2000 I.E., Vitamin D3 2000 IE 60 Tabs |
| Orthomol | 11 | Alle "30 Portions/Beutel/Trinkfläschchen"-Varianten |
| Sunday Natural | 3 | Omega-3 Algenöl, Omega-3 Algae Oil EPA+DHA, Vitamin D3+K2 Tropfen |
| Naturtreu | 3 | Darmfreund Probiotika (2x), Ruhepol Magnesium |
| ProFuel | 5 | Diverse Omega-3 und Vitamin D Duplikate |
| MoleQlar | 4 | NMN Pur 250mg, NMN 500mg, Spermidin (2x) |
| ESN | 2 | Omega-3 Ultra, Ultrapure Creatine Monohydrat |
| **Gesamt** | **37** | |

## Technische Umsetzung

### Dateien die erstellt/geändert werden

| Datei | Aktion |
|-------|--------|
| `supabase/functions/import-products-csv/index.ts` | NEU: Import-Logik mit Batch-Processing |
| `supabase/config.toml` | Edge Function registrieren |

### Migration SQL (wird ausgeführt)

```sql
ALTER TABLE supplement_products 
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS bioavailability NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS potency NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS reviews NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS origin TEXT,
ADD COLUMN IF NOT EXISTS lab_tests NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS purity NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS value NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS impact_score_big8 NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS serving_size TEXT,
ADD COLUMN IF NOT EXISTS servings_per_container NUMERIC,
ADD COLUMN IF NOT EXISTS dosage_per_serving TEXT,
ADD COLUMN IF NOT EXISTS quality_purity NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS quality_bioavailability NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS quality_dosage NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS quality_synergy NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS quality_research NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS quality_form NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS quality_value NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS quality_transparency NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS timing TEXT,
ADD COLUMN IF NOT EXISTS is_gluten_free BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS country_of_origin TEXT,
ADD COLUMN IF NOT EXISTS amazon_url TEXT,
ADD COLUMN IF NOT EXISTS amazon_image TEXT,
ADD COLUMN IF NOT EXISTS amazon_name TEXT,
ADD COLUMN IF NOT EXISTS match_score NUMERIC(3,2);
```

### Lösch-SQL (nach Import)

```sql
DELETE FROM supplement_products 
WHERE product_name IN (
  -- 37 Produktnamen mit brand_id Matching
  'Ashwagandha KSM-66 500mg',
  'Berberin 500mg',
  'Colostrum Gold 60 Kapseln',
  -- ... weitere 34 Produkte
);
```

## Erwartetes Ergebnis

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Produkte in DB | 876 | 841 |
| Neue Spalten | 25 | 50+ |
| Duplikate | 37 | 0 |
| Neue Produkte | 0 | +1 (Magnesium Komplex 7) |

## Ablauf nach Genehmigung

1. Migration ausführen (25 neue Spalten)
2. Edge Function erstellen und deployen
3. CSV-Daten via Edge Function importieren
4. 37 Duplikate per SQL löschen
5. Finale Verifizierung der Produktanzahl

