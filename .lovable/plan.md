

# Biogena JSON Import: Produktdaten in die Datenbank einpflegen

## Ausgangssituation

| Metrik | Status |
|--------|--------|
| **Biogena Brand** | Existiert (slug: `biogena`) |
| **Bestehende Produkte** | 57 in der Datenbank |
| **JSON-Produkte** | 52 Produkte mit erweitertem Format |
| **Neue Felder in JSON** | `big8_scores`, flaches `ingredients[]`, `category` |

### JSON-Format (neu)
```json
{
  "product_name": "NAD+ Aktivator Gold",
  "ingredients": ["nmn", "resveratrol", "coq10"],
  "dosage": "NMN 125mg + Resveratrol 100mg + CoQ10 50mg",
  "big8_scores": {"bioavailability": 10, "form": 10, ...},
  "cost_per_day": 1.50
}
```

### Ziel-Format (ProductSeed)
```typescript
{
  brand_slug: 'biogena',
  supplement_name: 'NMN',           // Mapping von ingredients[0]
  product_name: 'NAD+ Aktivator Gold',
  dose_per_serving: 125,            // Extrahiert aus dosage
  dose_unit: 'mg',
  price_per_serving: 1.50,          // = cost_per_day
  quality_tags: ['reinsubstanz', 'GMP', 'made-in-at']
}
```

---

## Implementierungsschritte

### Schritt 1: Konverter-Funktion erstellen

**Datei:** `src/lib/biogenaJsonConverter.ts`

Konvertiert das JSON-Format in das bestehende `ProductSeed`-Format:

- `ingredients[0]` wird zu `supplement_name` (via Ingredient-ID-Mapping)
- `dosage` String wird geparsed fuer `dose_per_serving` und `dose_unit`
- `cost_per_day` wird zu `price_per_serving`
- `big8_scores` wird in `quality_tags` uebersetzt (Score > 9 = Tag)
- `category` wird zu `protocol_phase` gemappt

### Schritt 2: Ingredient-ID zu Supplement-Name Mapping

Die JSON nutzt IDs wie `nmn`, `coq10`, `ashwagandha` - diese muessen auf die `supplement_database.name` gemappt werden:

```text
'nmn' -> 'NMN'
'coq10' -> 'CoQ10 Ubiquinol'
'ashwagandha' -> 'Ashwagandha'
'vit_d3' -> 'Vitamin D3'
'vit_k2' -> 'Vitamin K2'
'magnesium' -> 'Magnesium'
'zinc' -> 'Zink'
...
```

### Schritt 3: Dosage-Parser

Extrahiert aus Strings wie `"NMN 125mg + Resveratrol 100mg + CoQ10 50mg"` die Dosierung des Haupt-Ingredients.

### Schritt 4: Edge Function erstellen

**Datei:** `supabase/functions/seed-biogena-products/index.ts`

- Nimmt das konvertierte JSON entgegen
- Prueft auf Duplikate (product_name bei biogena)
- Fuegt neue Produkte ein oder aktualisiert bestehende
- Mapped `supplement_name` zu `supplement_id` via DB-Lookup

### Schritt 5: Import ausfuehren

Entweder:
1. JSON in Seed-Datei einbetten (`src/data/seeds/biogenaSeed.ts`)
2. Oder Edge-Function direkt mit JSON-Body aufrufen

---

## Technische Details

### Ingredient-Mapping Beispiele

| JSON ingredient | DB supplement_name |
|-----------------|-------------------|
| `nmn` | NMN |
| `coq10` | CoQ10 Ubiquinol |
| `pqq` | PQQ |
| `ala` | Alpha Liponsaeure |
| `vit_d3` | Vitamin D3 |
| `vit_k2` | Vitamin K2 |
| `magnesium` | Magnesium |
| `zinc` | Zink |
| `ashwagandha` | Ashwagandha |
| `curcumin` | Curcumin |
| `berberine` | Berberin |
| `lions_mane` | Lions Mane |

### Category zu Phase Mapping

| JSON category | protocol_phase |
|---------------|----------------|
| `longevity` | 2 |
| `vitamine` | 0 |
| `mineralien` | 0 |
| `adaptogene` | 0 |
| `antioxidantien` | 1 |
| `aminosaeuren` | 0 |
| `darm` | 0 |
| `gelenke` | 1 |
| `schlaf` | 0 |
| `pilze` | 0 |
| `stoffwechsel` | 1 |
| `nootropics` | 1 |

### Duplikat-Handling

- Falls `product_name` bereits existiert: Update mit neuen Daten
- Falls neu: Insert mit `is_verified: true`

---

## Erwartetes Ergebnis

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Biogena Produkte | 57 | ~60-70 (Upsert) |
| Neue Produkte | - | ~15-20 |
| Aktualisierte | - | ~35-40 |

Alle 52 Produkte aus der JSON werden entweder neu eingefuegt oder bestehende Eintraege mit den erweiterten Daten aktualisiert.

