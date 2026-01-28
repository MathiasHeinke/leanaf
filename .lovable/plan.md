

# Plan: Seeding der verbleibenden ~10-15 Produkte

## Aktuelle Situation

| Marke | In DB | Geschätzt in Seed | Delta |
|-------|-------|-------------------|-------|
| **Biogena** | 57 | ~60 | ~3 |
| **MoleQlar** | 54 | ~55 | ~1 |
| **Sunday Natural** | 50 | ~50 | 0 ✅ |
| **Now Foods** | 37 | ~40 | ~3 |
| **Nature Love** | 28 | ~30 | ~2 |
| **Naturtreu** | 26 | ~26 | 0 ✅ |
| **Orthomol** | 27 | ~28 | ~1 |
| **Doctor's Best** | 25 | ~28 | ~3 |
| **Thorne** | 22 | ~24 | ~2 |
| **Life Extension** | 21 | ~24 | ~3 |
| **ESN** | 23 | ~24 | ~1 |
| **Bulk** | 21 | ~21 | 0 ✅ |
| **Doppelherz** | 20 | ~20 | 0 ✅ |
| **ProFuel** | 19 | ~20 | ~1 |
| **More Nutrition** | 18 | ~19 | ~1 |
| **Lebenskraft-pur** | 0 | 0 | - |
| **Total** | **449** | **~470** | **~21** |

## Vorgehensweise

Ich werde die Edge Function `seed-products` mit dem kompletten `COMPLETE_PRODUCT_SEED` Array aufrufen. Die Funktion:

1. Empfängt alle ~470 Produkte aus den Seed-Dateien
2. Prüft jedes Produkt auf Duplikate via `(brand_id, product_name)` Unique Constraint
3. Überspringt alle 449 bereits existierenden Produkte
4. Fügt nur die ~21 fehlenden Produkte ein

## Erwartete fehlende Produkte

Basierend auf der Analyse sind wahrscheinlich folgende Produkte noch nicht in der DB:

- **Nature Love**: Lions Mane Extrakt, Cordyceps Extrakt, Quercetin 500mg
- **Now Foods**: Tongkat Ali, 5-HTP, weitere Spezialprodukte
- **Doctor's Best**: Acetyl-L-Carnitin, Alpha-Liponsäure Varianten
- **Biogena**: Sulforaphan, Alpha-GPC Varianten
- **Life Extension/Thorne**: Einzelne Premium-Longevity-Produkte

## Technische Umsetzung

1. Edge Function `seed-products` aufrufen mit `COMPLETE_PRODUCT_SEED`
2. Batch-Größe: 30 Produkte pro Request (ca. 16 Batches)
3. Automatische Duplikat-Erkennung durch DB-Constraint
4. Ergebnis: `products_added`, `products_skipped` Statistiken

## Erwartetes Ergebnis

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Produkte | 449 | ~470 |
| Neue Produkte | - | ~21 |
| Übersprungen | - | ~449 |

