
# PDF-Daten Import: Produkt-spezifische Interaktionen

## Uebersicht

Das PDF enthaelt detaillierte Interaktionsdaten fuer 755 Produkte - deutlich granularer als die bisherigen Wirkstoff-Mappings:

| Daten im PDF | Anzahl |
|--------------|--------|
| Produkte mit Synergien | 755 |
| Produkte mit Blockern | 317 |
| Einzigartige Synergien | 15+ (magnesium, zinc, omega 3...) |
| Einzigartige Blocker | 15+ (calcium, iron, copper...) |

## Aenderungen

### 1. Datenbank-Migration

Neue Spalten auf `supplement_products`:

```text
synergies text[] - Array der Synergie-Supplements
blockers text[]  - Array der Blocker-Supplements  
```

### 2. Neue Edge Function: `import-product-interactions`

Dedizierte Function fuer den PDF-Import:

**Funktionalitaet:**
- Akzeptiert JSON-Array mit extrahierten PDF-Daten
- Matched Produkte per `product_name` (fuzzy) + `brand_name`
- Schreibt `synergies[]` und `blockers[]` auf `supplement_products`
- Normalisiert alle Namen (lowercase, trim)
- Returned detaillierte Import-Statistiken

**Datenstruktur pro Eintrag:**
```text
{
  supplement: "5-HTP"
  product: "5-HTP 200mg"
  brand: "Natural Elements"
  category: "Schlaf"
  synergies: ["b6", "magnesium"]
  blockers: ["ssri"]
}
```

### 3. PDF-Daten als JSON

Ich extrahiere alle Tabellen aus dem PDF direkt in die Edge Function als konstante Arrays:

**SYNERGIES_DATA (755 Eintraege):**
```text
{ product: "5-HTP 200mg", brand: "Natural Elements", synergies: ["b6", "magnesium"] }
{ product: "A-Z Complete Depot 40 Tabletten", brand: "Doppelherz", synergies: ["coq10", "omega 3", "probiotics"] }
{ product: "NMN Pulver", brand: "MoleQlar", synergies: ["resveratrol", "tmg", "quercetin"] }
...
```

**BLOCKERS_DATA (317 Eintraege):**
```text
{ product: "5-HTP 200mg", brand: "Natural Elements", blockers: ["ssri"] }
{ product: "Berberin HCL 500mg", brand: "Amazon Generic", blockers: ["cyclosporin", "metformin"] }
{ product: "Eisen + Vitamin C", brand: "Doppelherz", blockers: ["caffeine", "calcium", "copper high dose", "magnesium", "zinc"] }
...
```

## Technische Details

### Matching-Logik

```text
1. Exact Match: product_name === pdf.product
2. Fuzzy Match: Levenshtein-Distanz <= 3
3. Brand Match: brand_name LIKE '%pdf.brand%'
4. Kombiniert: Score aus Name + Brand Match
```

### Import-Flow

```text
1. Migration ausfuehren (synergies/blockers Spalten)
2. Edge Function deployen
3. Function aufrufen - importiert alle PDF-Daten
4. Verifizieren via Admin-UI
```

## Erwartetes Ergebnis

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Produkte mit Synergien | 0 | 755 |
| Produkte mit Blockern | 0 | 317 |
| Produkt-Abdeckung | 0% | ~100% |

## Dateiaenderungen

| Datei | Aenderung |
|-------|-----------|
| Migration | `synergies text[]`, `blockers text[]` auf supplement_products |
| `supabase/functions/import-product-interactions/index.ts` | NEU - Import-Logic mit PDF-Daten |
