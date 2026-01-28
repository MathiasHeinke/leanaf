
# Seed Edge Function Erweitern: Kompletter Daten-Import

## Uebersicht

Wir erweitern die bestehende `seed-supplement-catalog` Edge Function zu einer **Master-Seed-Function**, die alle neuen Daten in die Datenbank importiert:

- 16 Supplement-Marken (supplement_brands)
- 80+ Produkte mit Preisen (supplement_products)
- 53+ Supplement-Katalog-Eintraege (supplement_database)
- 20+ Peptide (peptide_compounds)
- 16 Peptid-Anbieter (peptide_suppliers)
- 8 Peptid-Stacks (peptide_stacks)

---

## Teil 1: Edge Function Architektur

Die erweiterte Function akzeptiert einen `action` Parameter um verschiedene Seed-Operationen auszufuehren:

```text
POST /seed-supplement-catalog
{
  "action": "all" | "brands" | "products" | "supplements" | "peptides" | "suppliers" | "stacks"
}
```

### Response-Format:
```json
{
  "success": true,
  "results": {
    "brands": { "added": 16, "updated": 0, "errors": [] },
    "products": { "added": 80, "updated": 0, "errors": [] },
    "supplements": { "added": 53, "updated": 0, "errors": [] },
    "peptides": { "added": 20, "updated": 0, "errors": [] },
    "suppliers": { "added": 16, "updated": 0, "errors": [] },
    "stacks": { "added": 8, "updated": 0, "errors": [] }
  }
}
```

---

## Teil 2: Daten-Einbettung

Da Edge Functions keinen Zugriff auf `src/data/*.ts` haben, muessen wir die Daten **direkt in die Function einbetten**:

### 2.1 Marken-Daten (16 Eintraege)
Aus `src/data/supplementBrands.ts`:
- Sunday Natural, MoleQlar, Naturtreu, Lebenskraft-pur
- ESN, More Nutrition, ProFuel, Bulk
- Doppelherz, Orthomol, Nature Love
- Now Foods, Life Extension, Thorne, Nordic Naturals, Doctor's Best

### 2.2 Produkt-Daten (80+ Eintraege)
Aus `src/data/supplementProducts.ts`:
- Creatine: ESN, Bulk, More Nutrition (4 Produkte)
- Magnesium: Sunday Natural, Naturtreu, MoleQlar, Now Foods (4 Produkte)
- Omega-3, D3+K2, Ashwagandha, Zink, CoQ10, NMN, etc.

### 2.3 Supplement-Katalog (53+ Eintraege)
Aus `src/data/aresSupplementCatalog.ts` mit erweiterten Feldern:
- protocol_phase, impact_score, necessity_tier
- evidence_level, hallmarks_addressed
- synergies, blockers, form_quality (NEU)

### 2.4 Peptide (20+ Eintraege)
Aus `src/data/peptideCompounds.ts`:
- BPC-157, TB-500, GHK-Cu (Healing)
- Epitalon, MOTS-c, SS-31 (Longevity)
- Semax, Selank, Pinealon (Nootropic)
- Ipamorelin, CJC-1295 no DAC (GH)
- Retatrutide, KPV, Thymosin, etc.

### 2.5 Anbieter (16 Eintraege)
Aus `src/data/peptideSuppliers.ts`:
- EU: BPS Pharma, Peptide Power EU, Verified Peptides, Core Peptides, Cell Peptides
- DE: BPS Pharma
- US: Peptide Sciences, Biotech Peptides
- RU: Cosmic Nootropic

### 2.6 Stacks (8 Eintraege)
Aus `src/data/peptideStacks.ts`:
- Clean Gains, Natural Testo-Boost, Fettleber-Reset
- Autoimmun-Reset, Perfekter Schlaf, Nootropics
- Wolverine, Looksmaxxing

---

## Teil 3: Import-Logik

### 3.1 Upsert-Strategie
Alle Imports nutzen Upsert-Logik:
- **Marken**: Match auf `slug`
- **Produkte**: Match auf `brand_slug + product_name`
- **Supplements**: Match auf `name`
- **Peptide**: Match auf `id`
- **Anbieter**: Match auf `name`
- **Stacks**: Match auf `id`

### 3.2 Referenz-Aufloesung
Produkte referenzieren `brand_id` und `supplement_id`:
1. Zuerst Marken importieren
2. Dann Supplements importieren
3. Dann Produkte mit aufgeloesten IDs

```typescript
// Pseudo-Code fuer Referenz-Aufloesung
for (const product of products) {
  const brand = await supabase
    .from('supplement_brands')
    .select('id')
    .eq('slug', product.brand_slug)
    .single();
  
  const supplement = await supabase
    .from('supplement_database')
    .select('id')
    .eq('name', product.supplement_name)
    .single();
  
  await supabase.from('supplement_products').upsert({
    brand_id: brand.data?.id,
    supplement_id: supplement.data?.id,
    ...product
  });
}
```

---

## Teil 4: Erweiterte Supplement-Felder

Neben den bestehenden Feldern fuegen wir hinzu:

```typescript
// Neue Felder fuer supplement_database
{
  form_quality: 'gut' | 'optimal' | 'schlecht',
  synergies: ['D3', 'K2', 'Magnesium'],
  blockers: ['Kaffee', 'Kalzium'],
  cycling_required: true,
  cycling_protocol: '5 on / 2 off',
  warnung: 'Nicht mit SSRIs kombinieren'
}
```

---

## Teil 5: Implementation - Dateiaenderungen

### 5.1 Edge Function erweitern
**Datei:** `supabase/functions/seed-supplement-catalog/index.ts`

```typescript
// Struktur der erweiterten Function
serve(async (req) => {
  const { action = 'all' } = await req.json();
  
  const results = {
    brands: { added: 0, updated: 0, errors: [] },
    products: { added: 0, updated: 0, errors: [] },
    supplements: { added: 0, updated: 0, errors: [] },
    peptides: { added: 0, updated: 0, errors: [] },
    suppliers: { added: 0, updated: 0, errors: [] },
    stacks: { added: 0, updated: 0, errors: [] }
  };

  // Reihenfolge wichtig wegen Referenzen!
  if (action === 'all' || action === 'brands') {
    results.brands = await seedBrands(supabase);
  }
  if (action === 'all' || action === 'supplements') {
    results.supplements = await seedSupplements(supabase);
  }
  if (action === 'all' || action === 'products') {
    results.products = await seedProducts(supabase);
  }
  if (action === 'all' || action === 'peptides') {
    results.peptides = await seedPeptides(supabase);
  }
  if (action === 'all' || action === 'suppliers') {
    results.suppliers = await seedSuppliers(supabase);
  }
  if (action === 'all' || action === 'stacks') {
    results.stacks = await seedStacks(supabase);
  }

  return new Response(JSON.stringify({ success: true, results }));
});
```

---

## Teil 6: Implementierungsschritte

| Schritt | Beschreibung |
|---------|--------------|
| 1 | Edge Function mit embedded Data komplett neu schreiben |
| 2 | Seed-Funktionen fuer jede Tabelle implementieren |
| 3 | Referenz-Aufloesung fuer Products implementieren |
| 4 | Edge Function deployen |
| 5 | Test-Aufruf mit `action: "all"` |
| 6 | Ergebnisse verifizieren |

---

## Technische Details

### Groesse der Function
- ~2500 Zeilen (inkl. aller eingebetteten Daten)
- 16 Marken + 80 Produkte + 53 Supplements + 20 Peptide + 16 Supplier + 8 Stacks
- Alle Daten als TypeScript-Konstanten direkt in der Function

### Performance
- Bulk-Inserts wo moeglich (`upsert` mit `on_conflict`)
- Transaktions-sicher durch atomare Operationen
- Fehlerbehandlung pro Eintrag (einzelne Fehler stoppen nicht den gesamten Import)

### Aufruf
```bash
curl -X POST \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "all"}' \
  https://[PROJECT_ID].supabase.co/functions/v1/seed-supplement-catalog
```

---

## Erwartetes Ergebnis

Nach Ausfuehrung:
- **16 Marken** in `supplement_brands`
- **80+ Produkte** in `supplement_products` mit Brand/Supplement-Referenzen
- **53+ Supplements** in `supplement_database` mit erweiterten Feldern
- **20+ Peptide** in `peptide_compounds`
- **16 Anbieter** in `peptide_suppliers`
- **8 Stacks** in `peptide_stacks`

Total: **~200 Datensaetze** in 6 Tabellen
