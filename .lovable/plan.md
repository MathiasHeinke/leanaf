

# Plan: Vollständiges Seeding der Supplement-Datenbank

## Aktuelle Situation

| Metrik | Wert |
|--------|------|
| Produkte in DB | 244 |
| Marken in DB | 17 |
| Produkte in Seed-Dateien | ~450-500 (geschätzt) |
| **Fehlende Produkte** | ~200-250+ |

## Seed-Dateien Größe

| Datei | Zeilen | Geschätzte Produkte |
|-------|--------|---------------------|
| `premiumBrandsSeed.ts` | 1169 | ~85-100 |
| `budgetBrandsSeed.ts` | 1661 | ~120-140 |
| `sportBrandsSeed.ts` | 844 | ~60-80 |
| `pharmacyBrandsSeed.ts` | 1489 | ~100-120 |
| **Total** | ~5163 | **~400-450** |

## Seeding-Strategie

Da die Edge Function `seed-products` die Produkte per POST-Body empfängt und Duplikate automatisch überspringt (via `(brand_id, product_name)` Check), werde ich:

### Schritt 1: Premium-Produkte seeden
- Alle MoleQlar, Sunday Natural, Life Extension, Thorne Produkte
- Inkl. neue: TMG, GlyNAC, TUDCA, Apigenin, Carnosin, etc.

### Schritt 2: Budget-Produkte seeden
- Alle Nature Love, Naturtreu, Now Foods, Doctor's Best Produkte
- Inkl. neue: Huperzine A, Tongkat Ali, 5-HTP, etc.

### Schritt 3: Sport-Produkte seeden
- Alle ESN, More Nutrition, Bulk, ProFuel Produkte
- Inkl. neue: Glutamine, TMG Sport-Varianten

### Schritt 4: Pharmacy-Produkte seeden
- Alle Biogena, Orthomol, Doppelherz Produkte
- Inkl. neue: Colostrum, Fadogia, Myo-Inositol

## Technische Umsetzung

1. **Edge Function aufrufen** mit jedem Seed-Array als POST-Body
2. Die Funktion prüft automatisch auf Duplikate
3. Neue Produkte werden eingefügt, existierende übersprungen
4. Response zeigt: `products_added`, `products_skipped`

## Erwartetes Ergebnis

Nach vollständigem Seeding:
- **~450-500 Produkte** in der Datenbank
- Alle 16+ Marken vollständig katalogisiert
- Komplette Abdeckung aller Kategorien (Longevity, Nootropics, Hormonal, Sport)

