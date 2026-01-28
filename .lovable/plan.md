

# Plan: Datenbank-Seeding aus ARES v3.4 Markdown

## Zusammenfassung

Die Markdown-Datei enthält ca. **520+ Produkte** und **8 Hersteller-Kataloge** in Tabellen-Format. Die bestehende DB hat bereits 16 Brands und 51 Produkte. Wir werden die Daten in ein TypeScript-Seed-File konvertieren, das via Edge Function oder direkt ueber Supabase SQL eingespielt werden kann.

---

## Aktueller Stand

| Element | In DB | In Markdown | Delta |
|---------|-------|-------------|-------|
| Brands | 16 | 16 | 0 (vollstaendig) |
| Produkte | 51 | 520+ | ~470 neue |
| Wirkstoffe | ~50 | 180+ | ~130 neue |

---

## Loesung: Strukturiertes Seed-File

### Option A: TypeScript Seed-Array (EMPFOHLEN)

Ich erstelle eine Datei `src/data/supplementProductsSeed.ts` mit:

```typescript
export const PRODUCT_SEED_DATA: ProductSeed[] = [
  // Phase 0: Essentials
  {
    brand_slug: 'esn',
    supplement_name: 'Kreatin Monohydrat',
    product_name: 'Ultrapure Creatine Monohydrate',
    pack_size: 500,
    pack_unit: 'g',
    servings_per_pack: 100, // 500g / 5g
    dose_per_serving: 5,
    dose_unit: 'g',
    price_eur: 19.90,
    price_per_serving: 0.20,
    form: 'powder',
    is_vegan: true,
    is_recommended: true,
  },
  {
    brand_slug: 'bulk',
    supplement_name: 'Kreatin Monohydrat',
    product_name: 'Creatine Monohydrate',
    pack_size: 1000,
    pack_unit: 'g',
    servings_per_pack: 200,
    dose_per_serving: 5,
    dose_unit: 'g',
    price_eur: 24.99,
    price_per_serving: 0.12,
    form: 'powder',
    is_vegan: true,
  },
  // ... 500+ weitere Eintraege
];
```

### Option B: CSV/Excel Import

Falls du es lieber in Excel bearbeitest:

```csv
brand_slug,supplement_name,product_name,pack_size,pack_unit,servings,dose,dose_unit,price_eur,price_per_day,form,vegan,recommended
esn,Kreatin Monohydrat,Ultrapure Creatine,500,g,100,5,g,19.90,0.20,powder,true,true
bulk,Kreatin Monohydrat,Creatine Monohydrate,1000,g,200,5,g,24.99,0.12,powder,true,false
```

Diese CSV kann dann via Supabase Dashboard oder Edge Function importiert werden.

---

## Implementierungs-Schritte

### Schritt 1: Seed-Datei erstellen

Ich parse das Markdown manuell in ein strukturiertes TypeScript-Array mit allen ~520 Produkten, gruppiert nach Kategorien:

```
src/data/supplementProductsSeed.ts
├── BRANDS (bereits komplett)
├── PHASE_0_ESSENTIALS (Kreatin, Magnesium, Omega-3, D3+K2)
├── PHASE_0_OPTIMIZERS (Ashwagandha, Zink, CoQ10)
├── PHASE_1_TRT_SUPPORT (Citrus Bergamot, TUDCA, EAA)
├── PHASE_2_LONGEVITY (NMN, CaAKG, Resveratrol, Spermidin)
├── SLEEP_STACK (L-Theanin, Glycin, Apigenin)
├── SPORT_STACK (Citrullin, Beta-Alanin, EAAs)
├── COGNITIVE (Lion's Mane, Alpha-GPC)
├── HORMONAL (Tongkat Ali, Fadogia, Boron)
├── BUDGET_BRANDS (Nature Love, Naturtreu - 125+ Produkte)
└── PEPTIDES (Research-only, separate Tabelle)
```

### Schritt 2: Seed-Edge-Function erstellen

Eine Edge Function `seed-products` die:
1. Brands via `slug` matched (bereits vorhanden)
2. Supplements via `name` matched
3. Produkte inserted mit `ON CONFLICT DO UPDATE`

```typescript
// supabase/functions/seed-products/index.ts
import { PRODUCT_SEED_DATA } from './seedData.ts';

Deno.serve(async (req) => {
  // 1. Lade alle Brands und Supplements fuer ID-Mapping
  const { data: brands } = await supabase.from('supplement_brands').select('id, slug');
  const { data: supplements } = await supabase.from('supplement_database').select('id, name');
  
  // 2. Mappe slug -> id
  const brandMap = new Map(brands.map(b => [b.slug, b.id]));
  const suppMap = new Map(supplements.map(s => [s.name.toLowerCase(), s.id]));
  
  // 3. Transformiere Seed-Daten
  const products = PRODUCT_SEED_DATA.map(p => ({
    brand_id: brandMap.get(p.brand_slug),
    supplement_id: suppMap.get(p.supplement_name.toLowerCase()),
    product_name: p.product_name,
    pack_size: p.pack_size,
    pack_unit: p.pack_unit,
    // ... alle Felder
  }));
  
  // 4. Upsert (ON CONFLICT product_name + brand_id)
  const { error } = await supabase
    .from('supplement_products')
    .upsert(products, { onConflict: 'brand_id,product_name' });
    
  return new Response(JSON.stringify({ inserted: products.length, error }));
});
```

### Schritt 3: Fehlende Supplements hinzufuegen

Das Markdown enthaelt ~130 Wirkstoffe, die noch nicht in `supplement_database` sind:
- GlyNAC, TMG, NAC, Boron, DIM, Fadogia, Tongkat Ali
- Lion's Mane, Alpha-GPC, Huperzine A
- Glycin, Myo-Inositol, Apigenin
- Kollagen, MSM, Curcumin
- Berberin, R-ALA, Chrom

Diese werden als separater Seed in `supplement_database` eingefuegt.

---

## Datei-Aenderungen

| Datei | Aenderung |
|-------|-----------|
| `src/data/supplementProductsSeed.ts` | NEU: ~520 Produkte als TypeScript-Array |
| `src/data/supplementDatabaseSeed.ts` | NEU: ~130 fehlende Wirkstoffe |
| `supabase/functions/seed-products/index.ts` | NEU: Edge Function fuer DB-Seeding |

---

## Zeitaufwand

| Task | Zeit |
|------|------|
| Markdown → TypeScript parsen | ~2-3 Prompts |
| Seed-Edge-Function erstellen | 1 Prompt |
| Testing & Feintuning | 1 Prompt |

---

## Dein naechster Schritt

Sag mir: **"Erstelle das Seed-File"** und ich generiere `supplementProductsSeed.ts` mit den ersten 100 Produkten (Phase 0 + Phase 1). Dann koennen wir in Batches weitermachen.

Alternativ: Falls du die Daten lieber als **CSV** moechtest, kann ich das Format auch exportieren.

