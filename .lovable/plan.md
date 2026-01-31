
# Import-Erweiterung auf alle 76 Felder (3 Tabellen)

## Analyse der 76 Felder

Die Dokumentation zeigt folgende Verteilung:

| Kategorie | Felder | Ziel-Tabelle |
|-----------|--------|--------------|
| Identifikation | 3 | products, database |
| Marke | 9 | **brands** |
| Preise | 5 | products, database |
| Dosierung | 10 | products, database |
| Quality Big8 | 8 | products |
| Quality Detail | 8 | products, database |
| Scores | 5 | products, database |
| Klassifikation | 7 | database |
| Timing | 4 | products, database |
| Interaktionen | 3 | database |
| Flags | 6 | products |
| URLs | 6 | products |
| Meta | 3 | products |

---

## Fehlende Felder - Detaillierte Auflistung

### 1. supplement_products - Noch fehlend (6 Felder)

| JSON-Feld | DB-Spalte | Typ | Status |
|-----------|-----------|-----|--------|
| shop_url | product_url | text | Bereits gemappt (product_url) |
| price | price_eur | numeric | Bereits gemappt |
| origin | origin | text | Typ-Korrektur noetig (ist TEXT, nicht numeric) |

Die `supplement_products` Tabelle ist fast vollstaendig abgedeckt.

### 2. supplement_database - Updates hinzufuegen (14 Felder)

| JSON-Feld | DB-Spalte | Typ |
|-----------|-----------|-----|
| synergies | synergies | text[] |
| blockers | blockers | text[] |
| cycling_protocol | cycling_protocol | text |
| cycling_required | cycling_required | boolean |
| impact_score | impact_score | numeric |
| priority_score | priority_score | integer |
| protocol_phase | protocol_phase | integer |
| evidence_level | evidence_level | text |
| necessity_tier | necessity_tier | text |
| hallmarks_addressed | hallmarks_addressed | text[] |
| cost_per_day_eur | cost_per_day_eur | numeric |
| default_dosage | default_dosage | text |
| default_unit | default_unit | text |
| timing_constraint | timing_constraint | text |
| form_quality | form_quality | text |

### 3. supplement_brands - Updates hinzufuegen (7 Felder)

| JSON-Feld | DB-Spalte | Typ |
|-----------|-----------|-----|
| brand_country | country | text |
| brand_website | website | text |
| brand_price_tier | price_tier | text |
| brand_specialization | specialization | text[] |
| brand_certifications | quality_certifications | text[] |
| brand_quality_certifications | quality_certifications | text[] |

---

## Implementierung

### Schritt 1: Interface um alle 76 Felder erweitern

```typescript
interface EnrichedProduct {
  // ... bestehende Felder ...
  
  // === NEU: supplement_database Felder ===
  synergies?: string | string[];
  blockers?: string | string[];
  cycling_protocol?: string;
  cycling_required?: boolean | string;
  impact_score?: number;
  priority_score?: number;
  protocol_phase?: number;
  evidence_level?: string;
  necessity_tier?: string;
  hallmarks_addressed?: string | string[];
  cost_per_day_eur?: number;
  default_dosage?: string;
  default_unit?: string;
  timing_constraint?: string;
  form_quality?: string;
  supplement_category?: string;
  
  // === NEU: supplement_brands Felder ===
  brand_country?: string;
  brand_website?: string;
  brand_price_tier?: string;
  brand_specialization?: string | string[];
  brand_certifications?: string | string[];
  brand_quality_certifications?: string | string[];
  
  // === NEU: Fehlende Produkt-Felder ===
  shop_url?: string;
  price?: number;
  currency?: string;
}
```

### Schritt 2: supplement_database Updates

Nach dem Product-Upsert wird `supplement_database` aktualisiert:

```typescript
// Check ob relevante supplement_database Daten vorhanden sind
function hasSupplementData(product: EnrichedProduct): boolean {
  return !!(
    product.synergies ||
    product.blockers ||
    product.cycling_protocol ||
    product.impact_score ||
    product.priority_score ||
    product.cost_per_day_eur ||
    product.evidence_level ||
    product.hallmarks_addressed
  );
}

// Update supplement_database
if (supplementId && hasSupplementData(product)) {
  await supabase
    .from('supplement_database')
    .update({
      synergies: parseStringArray(product.synergies),
      blockers: parseStringArray(product.blockers),
      cycling_protocol: sanitizeValue(product.cycling_protocol),
      cycling_required: parseBoolean(product.cycling_required),
      impact_score: parseNumber(product.impact_score),
      priority_score: parseNumber(product.priority_score),
      protocol_phase: parseNumber(product.protocol_phase),
      evidence_level: sanitizeValue(product.evidence_level),
      necessity_tier: sanitizeValue(product.necessity_tier),
      hallmarks_addressed: parseStringArray(product.hallmarks_addressed),
      cost_per_day_eur: parseNumber(product.cost_per_day_eur),
      default_dosage: sanitizeValue(product.default_dosage),
      default_unit: sanitizeValue(product.default_unit),
      timing_constraint: sanitizeValue(product.timing_constraint),
      form_quality: sanitizeValue(product.form_quality),
    })
    .eq('id', supplementId);
  
  supplementsUpdated++;
}
```

### Schritt 3: supplement_brands Updates

Marken-Daten werden bei Bedarf aktualisiert:

```typescript
function hasBrandData(product: EnrichedProduct): boolean {
  return !!(
    product.brand_country ||
    product.brand_website ||
    product.brand_price_tier ||
    product.brand_specialization ||
    product.brand_certifications
  );
}

if (brandId && hasBrandData(product)) {
  await supabase
    .from('supplement_brands')
    .update({
      country: sanitizeValue(product.brand_country),
      website: sanitizeValue(product.brand_website),
      price_tier: sanitizeValue(product.brand_price_tier),
      specialization: parseStringArray(product.brand_specialization),
      quality_certifications: parseStringArray(product.brand_certifications) 
        || parseStringArray(product.brand_quality_certifications),
    })
    .eq('id', brandId);
  
  brandsUpdated++;
}
```

### Schritt 4: Response erweitern

```typescript
return new Response(
  JSON.stringify({
    success: true,
    batch_name,
    results: {
      products_imported: imported,
      products_updated: updated,
      supplements_updated: supplementsUpdated,  // NEU
      brands_updated: brandsUpdated,            // NEU
      skipped,
      errors: errors.slice(0, 10),
    },
    database_totals: { ... },
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

---

## Zusammenfassung

| Aenderung | Beschreibung |
|-----------|--------------|
| Interface erweitern | +23 neue Felder im EnrichedProduct Interface |
| supplement_database Updates | 15 Felder werden nach supplement_database geschrieben |
| supplement_brands Updates | 5 Felder werden nach supplement_brands geschrieben |
| Response erweitern | Neue Counter fuer supplements_updated, brands_updated |
| Typ-Korrektur origin | Von parseNumber zu sanitizeValue (ist TEXT in DB) |

### Datei-Aenderungen

1. `supabase/functions/import-enriched-products/index.ts`
   - Interface um 23 neue Felder erweitern
   - Helper-Funktionen `hasSupplementData()` und `hasBrandData()`
   - Update-Logik fuer supplement_database
   - Update-Logik fuer supplement_brands
   - Erweiterte Response mit neuen Countern

### Ergebnis

| Tabelle | Vorher | Nachher |
|---------|--------|---------|
| supplement_products | ~48 Felder | 54 Felder (100%) |
| supplement_database | 0 Updates | 15 Felder |
| supplement_brands | 0 Updates | 5 Felder |
| **Gesamt** | ~48 | **76 Felder (100%)** |
