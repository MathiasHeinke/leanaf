

## CSV-Export für alle Supplement-Produkte

### Zusammenfassung
Erstelle eine Funktion zum Export aller 940 Supplement-Produkte als vollständige CSV-Datei mit allen verknüpften Daten aus drei Tabellen.

### Daten-Umfang

**Produkt-Daten (supplement_products)**
- ID, Produktname, SKU
- Pack-Größe, Einheit, Portionen
- Dosis pro Portion, Einheit
- Preis EUR, Preis pro Portion
- Form (Kapsel/Pulver/etc.)
- Vegan, Bio, Allergene
- URL, Amazon ASIN
- Verifiziert, Empfohlen
- Popularität, Quality-Tags

**Marken-Daten (supplement_brands)**
- Markenname, Slug
- Land, Website
- Preisstufe (budget/mid/premium)
- Spezialisierung
- Qualitätszertifizierungen

**Supplement-Master-Daten (supplement_database)**
- Supplement-Name, Kategorie
- Standard-Dosierung
- Timing-Constraint
- Protokoll-Phase (0/1/2/3)
- Impact Score, Priority Score
- Necessity Tier (essential/optimizer/specialist)
- Evidenz-Level
- Hallmarks, Synergien, Blocker
- Cycling-Anforderungen

### Umsetzung

1. **Neue Utility-Funktion**: `src/utils/exportProductsCSV.ts`
   - Lädt alle Produkte mit JOIN auf brands und supplement_database
   - Konvertiert Arrays zu Semikolon-getrennten Strings
   - Generiert UTF-8 CSV mit BOM für Excel-Kompatibilität
   - Triggert automatischen Download

2. **Export-Button hinzufügen** auf `/supplements` Seite
   - Button im Header-Bereich der Produktliste
   - Loading-State während Export
   - Success/Error Toast-Benachrichtigung

### Technische Details

```text
CSV-Spalten (ca. 45 Felder):
┌──────────────────────────────────────────────────────────┐
│ PRODUKT                                                  │
├──────────────────────────────────────────────────────────┤
│ id, product_name, product_sku, pack_size, pack_unit,     │
│ servings_per_pack, dose_per_serving, dose_unit,          │
│ price_eur, price_per_serving, form, is_vegan, is_organic,│
│ allergens, product_url, amazon_asin, is_verified,        │
│ is_recommended, popularity_score, quality_tags           │
├──────────────────────────────────────────────────────────┤
│ MARKE                                                    │
├──────────────────────────────────────────────────────────┤
│ brand_name, brand_slug, brand_country, brand_website,    │
│ brand_price_tier, brand_specialization, brand_certs      │
├──────────────────────────────────────────────────────────┤
│ SUPPLEMENT                                               │
├──────────────────────────────────────────────────────────┤
│ supplement_name, supplement_category, default_dosage,    │
│ timing_constraint, protocol_phase, impact_score,         │
│ necessity_tier, priority_score, evidence_level,          │
│ hallmarks_addressed, synergies, blockers,                │
│ cycling_required, cycling_protocol                       │
└──────────────────────────────────────────────────────────┘
```

**Dateiname-Format**: `ares_products_export_YYYY-MM-DD.csv`

**Besonderheiten**:
- UTF-8 BOM für Excel-Kompatibilität
- Arrays als Semikolon-separierte Werte
- Anführungszeichen-Escaping für Textfelder mit Kommas

