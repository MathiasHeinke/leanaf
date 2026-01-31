
# Kobho Labs Astaxanthin + CoQ10 Import

## Produkt-Details (extrahiert von Amazon ASIN B0DNN2PHTZ / kobholabs.com)

| Feld | Wert |
|------|------|
| Produktname | Astaxanthin + CoQ10 |
| Marke | Kobho Labs |
| Land | Spanien (ES) |
| Preis | 25,95 EUR |
| Packungsgroesse | 60 Softgel-Kapseln |
| Portionen pro Packung | 60 (2-Monats-Vorrat) |
| Dosierung pro Portion | 1 Kapsel taeglich |
| Form | Softgel (Perle) |
| Zutaten | Astaxanthin (AstaPure), Coenzym Q10 (Ubiquinon), Extra Virgin Olivenoel |
| Amazon ASIN | B0DNN2PHTZ |
| Kategorie | Anti-Aging / Antioxidantien |
| Zertifizierungen | GMP, IFS, GMO-frei, Allergenfrei |

## Interaktionen (aus Produktbeschreibung)

**Synergien:**
- Omega-3 (Fettsaeuren verbessern Absorption)
- Vitamin E (Antioxidantien-Synergie)
- Extra Virgin Olivenoel (bereits enthalten fuer bessere Bioverfuegbarkeit)

**Blocker:**
- Andere Astaxanthin-Produkte am selben Tag
- Nicht fuer Kinder unter 14 Jahren

## Aenderungen

### 1. Neue Marke hinzufuegen: Kobho Labs

Eintrag in `supplement_brands`:

```text
name: Kobho Labs
slug: kobho-labs
country: EU
website: kobholabs.com
price_tier: mid
specialization: [longevity, antioxidants, heart]
quality_certifications: [GMP, IFS, GMO-free]
description: Spanischer Premium-Hersteller fuer Longevity-Supplements. Eigene Formulierungen mit patentierten Inhaltsstoffen.
```

### 2. Neues Produkt hinzufuegen

Eintrag in `supplement_products` (verknuepft mit bestehendem Supplement "Astaxanthin + Coenzym Q10"):

```text
product_name: Astaxanthin + CoQ10
brand_id: [kobho-labs]
supplement_id: 7d8018a3-a9aa-4231-9c5f-7cca6a6e9061
pack_size: 60
pack_unit: Softgels
servings_per_pack: 60
dose_per_serving: 1
dose_unit: Kapsel
price_eur: 25.95
price_per_serving: 0.43
form: softgel
category: Anti-Aging
country_of_origin: ES
is_vegan: false (enthaelt Rindergelatine)
is_verified: true
is_recommended: true
quality_tags: [AstaPure, GMO-free, IFS, GMP, Made in Spain]
timing: with_meals
amazon_asin: B0DNN2PHTZ
amazon_url: https://www.amazon.de/dp/B0DNN2PHTZ
product_url: https://kobholabs.com/products/astaxanthin-coq10
short_description: Natuerliches Astaxanthin aus Haematococcus pluvialis mit Coenzym Q10 und nativem Olivenoel fuer optimale Absorption.
synergies: [omega 3, vitamin e, olivenoel]
blockers: [andere astaxanthin produkte]
```

### 3. Supplement-Datenbank anreichern

Update fuer `supplement_database` (ID: 7d8018a3-a9aa-4231-9c5f-7cca6a6e9061):

```text
synergies: [Omega-3, Vitamin E, PQQ]
blockers: []
evidence_level: moderat
hallmarks_addressed: [oxidative-stress, heart, skin, eye]
```

## Technische Umsetzung

Die Aenderungen werden direkt via Supabase-Query durchgefuehrt:

1. **INSERT supplement_brands** - Kobho Labs als neue Marke
2. **INSERT supplement_products** - Das Produkt mit allen extrahierten Feldern
3. **UPDATE supplement_database** - Synergien und Details ergaenzen

## Erwartetes Ergebnis

- Neue Marke: Kobho Labs (Spanien)
- Neues Produkt: Astaxanthin + CoQ10 vollstaendig angereichert
- Verknuepfung: Produkt ↔ "Astaxanthin + Coenzym Q10" Supplement
- Amazon-Link: Funktioniert ueber ASIN B0DNN2PHTZ
