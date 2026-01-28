

# Plan: Vollständiges Seeding der verbleibenden ~150 Produkte

## Aktuelle Datenbank-Statistik

| Marke | In DB | In Seed (geschätzt) | Delta |
|-------|-------|---------------------|-------|
| Biogena | 47 | ~60 | ~13 |
| MoleQlar | 45 | ~50+ | ~5 |
| Sunday Natural | 34 | ~50+ | ~16 |
| Now Foods | 21 | ~40+ | ~19 |
| Orthomol | 20 | ~25 | ~5 |
| Nature Love | 18 | ~30+ | ~12 |
| ESN | 16 | ~25 | ~9 |
| Naturtreu | 15 | ~25+ | ~10 |
| Doppelherz | 13 | ~15 | ~2 |
| Bulk | 13 | ~20 | ~7 |
| Doctor's Best | 12 | ~25+ | ~13 |
| More Nutrition | 11 | ~18 | ~7 |
| ProFuel | 10 | ~18 | ~8 |
| Thorne | 8 | ~20+ | ~12 |
| Life Extension | 7 | ~25+ | ~18 |
| **Total** | **291** | **~450** | **~160** |

## Seeding-Strategie

Die Edge Function `seed-products` empfängt Produkte per POST-Body und überspringt Duplikate automatisch (via `brand_id + product_name` Check).

### Ausführungsschritte

1. **Budget-Kategorie seeden** (Nature Love, Naturtreu, Now Foods, Doctor's Best)
   - ~60 neue Produkte erwartet
   - Batch-Größe: 30 Produkte pro Request

2. **Premium-Kategorie seeden** (MoleQlar, Sunday Natural, Life Extension, Thorne)  
   - ~50 neue Produkte erwartet
   - Batch-Größe: 30 Produkte pro Request

3. **Sport-Kategorie seeden** (ESN, More Nutrition, Bulk, ProFuel)
   - ~30 neue Produkte erwartet
   - Batch-Größe: 30 Produkte pro Request

4. **Pharmacy-Kategorie seeden** (Biogena, Orthomol, Doppelherz)
   - ~20 neue Produkte erwartet
   - Batch-Größe: 30 Produkte pro Request

## Erwartetes Endergebnis

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Produkte | 291 | ~450 |
| Marken | 17 | 17 |
| Wirkstoffe | 111 | 120+ |

## Technische Umsetzung

Ich werde die Edge Function `seed-products` mit dem vollständigen `COMPLETE_PRODUCT_SEED` Array aufrufen. Die Funktion:
- Akzeptiert alle ~450 Produkte
- Prüft jedes Produkt auf Duplikate
- Fügt nur neue Produkte ein
- Gibt detaillierte Statistiken zurück

