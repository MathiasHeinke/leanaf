
# Fix: Seed-Products Edge Function Reparatur

## Problem identifiziert

Beim Seeding traten zwei Fehler auf:

1. **Schema-Mismatch**: `default_dose` existiert nicht - heißt `default_dosage` (Text statt Number)
2. **Kein UNIQUE Constraint**: `upsert` mit `ON CONFLICT` scheitert, da kein `(brand_id, product_name)` Constraint existiert

## Lösung

### Änderung 1: Supplement-Insert korrigieren (Zeilen 229-242)

```typescript
// ALT: default_dose (number) → Fehler
// NEU: default_dosage (string) → Funktioniert
const { error } = await supabase
  .from('supplement_database')
  .insert({
    name: supp.name,
    category: supp.category,
    description: supp.description,
    impact_score: supp.impact_score,
    necessity_tier: supp.necessity_tier,
    evidence_level: supp.evidence_level,
    default_dosage: supp.default_dose ? `${supp.default_dose}` : null, // String!
    default_unit: supp.default_unit,
    synergies: supp.synergies || [],
  });
```

### Änderung 2: Product-Insert ohne UPSERT (Zeilen 282-300)

```typescript
// Erst prüfen ob Produkt existiert, dann INSERT statt UPSERT
const { data: existingProduct } = await supabase
  .from('supplement_products')
  .select('id')
  .eq('brand_id', brandId)
  .eq('product_name', product.product_name)
  .maybeSingle();

if (existingProduct) {
  console.log(`Product exists: ${product.product_name}`);
  results.products_skipped++;
  continue;
}

const { error } = await supabase
  .from('supplement_products')
  .insert({
    brand_id: brandId,
    supplement_id: suppId || null,
    product_name: product.product_name,
    pack_size: product.pack_size,
    pack_unit: product.pack_unit,
    servings_per_pack: product.servings_per_pack,
    dose_per_serving: product.dose_per_serving,
    dose_unit: product.dose_unit,
    price_eur: product.price_eur,
    price_per_serving: product.price_per_serving,
    form: product.form,
    is_vegan: product.is_vegan ?? false,
    is_verified: true,
  });
```

## Dateien

| Datei | Änderung |
|-------|----------|
| `supabase/functions/seed-products/index.ts` | Fix `default_dosage` Mapping + INSERT statt UPSERT mit Duplikat-Check |

## Resultat

Nach dem Fix wird die Edge Function erneut deployed und aufgerufen. Die 3 Supplements (NMN, GlyNAC, Lions Mane) und 3 Produkte werden erfolgreich eingefügt.
