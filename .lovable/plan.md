
# ARES Supplement-Datenbank v3.0: Massive Erweiterung

## Uebersicht

Das PDF enthaelt eine **revolutionaere Erweiterung** der bestehenden Supplement- und Peptid-Datenbank mit:
- 200+ konkreten Produkten mit deutschen Marken und Preisen
- 30+ Peptide mit Anbietern, Dosierungen und Protokollen
- 8 fertige Peptid-Stacks
- Neue Datenbank-Tabellen fuer Marken und Produkte
- Erweiterte Felder fuer Synergien, Blocker, Bioformen

---

## Teil 1: Neue Datenbank-Tabellen

### 1.1 Tabelle: `supplement_brands` (NEU)

Speichert Hersteller-Informationen fuer "empfohlene Marken".

```text
+---------------------------+--------------+----------------------------------------+
| Spalte                    | Typ          | Beschreibung                           |
+---------------------------+--------------+----------------------------------------+
| id                        | UUID (PK)    | Eindeutige ID                          |
| name                      | TEXT         | "Sunday Natural", "MoleQlar", etc.     |
| slug                      | TEXT UNIQUE  | URL-freundlicher Name                  |
| country                   | TEXT         | 'DE', 'US', 'EU'                       |
| website                   | TEXT         | sunday.de, moleqlar.com                |
| price_tier                | TEXT         | 'budget' / 'mid' / 'premium' / 'luxury'|
| specialization            | TEXT[]       | ['longevity', 'sport', 'vegan']        |
| quality_certifications    | TEXT[]       | ['GMP', 'ISO', 'organic']              |
| description               | TEXT         | Kurzbeschreibung                       |
| logo_url                  | TEXT         | Logo-Bild URL                          |
+---------------------------+--------------+----------------------------------------+
```

**Seed-Daten: 16 deutsche/EU Marken**
- Tier 1 Premium: Sunday Natural, MoleQlar, Naturtreu, Lebenskraft-pur
- Tier 2 Sport: ESN, More Nutrition, ProFuel, Bulk
- Tier 3 Apotheke: Doppelherz, Orthomol, Nature Love
- Tier 4 International: Now Foods, Life Extension, Thorne, Nordic Naturals, Doctor's Best

### 1.2 Tabelle: `supplement_products` (NEU)

Speichert **konkrete Produkte** mit Preisen und Specs.

```text
+---------------------------+--------------+----------------------------------------+
| Spalte                    | Typ          | Beschreibung                           |
+---------------------------+--------------+----------------------------------------+
| id                        | UUID (PK)    | Eindeutige ID                          |
| brand_id                  | UUID (FK)    | Referenz auf supplement_brands         |
| supplement_id             | UUID (FK)    | Referenz auf supplement_database       |
| product_name              | TEXT         | "Omega-3 Algae Oil EPA+DHA"            |
| product_sku               | TEXT         | Artikelnummer                          |
| pack_size                 | INTEGER      | 60, 90, 120, etc.                      |
| pack_unit                 | TEXT         | 'capsules', 'tablets', 'ml', 'g'       |
| servings_per_pack         | INTEGER      | Anzahl Portionen                       |
| dose_per_serving          | DECIMAL      | z.B. 1000                              |
| dose_unit                 | TEXT         | 'mg', 'mcg', 'IU', 'g'                 |
| ingredients               | JSONB        | Fuer Kombis: [{name, amount, unit}]    |
| price_eur                 | DECIMAL      | Preis in EUR                           |
| price_per_serving         | DECIMAL      | Berechnet: price / servings            |
| form                      | TEXT         | 'softgel', 'capsule', 'powder', etc.   |
| is_vegan                  | BOOLEAN      | Vegan-Kennzeichnung                    |
| is_organic                | BOOLEAN      | Bio-Zertifiziert                       |
| allergens                 | TEXT[]       | Allergene                              |
| product_url               | TEXT         | Link zur Produktseite                  |
| amazon_asin               | TEXT         | Amazon DE ASIN                         |
| is_verified               | BOOLEAN      | Von ARES verifiziert                   |
| is_recommended            | BOOLEAN      | ARES-Empfehlung                        |
| popularity_score          | INTEGER      | Basierend auf User-Auswahl             |
+---------------------------+--------------+----------------------------------------+
```

---

## Teil 2: Erweiterung supplement_database

### 2.1 Neue Spalten

```text
+----------------------+--------------+----------------------------------------+
| Spalte               | Typ          | Beschreibung                           |
+----------------------+--------------+----------------------------------------+
| form_quality         | TEXT         | 'schlecht' / 'gut' / 'optimal'         |
| synergies            | TEXT[]       | Wirkstoffe die zusammen besser wirken  |
| blockers             | TEXT[]       | Substanzen die Aufnahme blockieren     |
| cycling_required     | BOOLEAN      | Muss zyklisch genommen werden?         |
| cycling_protocol     | TEXT         | '5 on/2 off', '2 weeks on/1 off'       |
| underrated_score     | INTEGER      | 1-10 (wie unterschaetzt)               |
| warnung              | TEXT         | Wichtige Warnhinweise                  |
+----------------------+--------------+----------------------------------------+
```

### 2.2 Massive Daten-Erweiterung

**Aktuelle Datenbank**: 80 Supplements (53 im Katalog, weitere durch User)
**Nach Update**: 120+ Wirkstoffe mit vollstaendigen Daten

**Neue Kategorien aus PDF:**
- Nootropics: Lion's Mane, Alpha-GPC, Phosphatidylserin, Huperzine A
- Metabolismus: Berberin, R-ALA, Chrom Picolinat
- Gut: L-Glutamin, Bovine Colostrum, Butyrat
- Joints: Kollagen, Glucosamin, Chondroitin, MSM, Boswellia
- Performance: Citrullin, Betain/TMG, Glycerol
- Longevity: Urolithin A/Mitopure, Fisetin, Spermidin, NMN (erweitert)

---

## Teil 3: Peptid-Datenbank (Neu)

### 3.1 Tabelle: `peptide_compounds` (NEU)

Speichert alle Peptide und Research Compounds.

```text
+---------------------------+--------------+----------------------------------------+
| Spalte                    | Typ          | Beschreibung                           |
+---------------------------+--------------+----------------------------------------+
| id                        | UUID (PK)    | Eindeutige ID                          |
| name                      | TEXT         | "BPC-157", "Epitalon", "Retatrutide"   |
| category                  | TEXT         | 'healing', 'gh_secretagogue', etc.     |
| description               | TEXT         | Wirkungsbeschreibung                   |
| mechanism                 | TEXT         | Wirkungsmechanismus                    |
| impact_score              | DECIMAL      | ARES Impact Score 0-10                 |
| protocol_phase            | INTEGER      | 2 oder 3                               |
| dosage_research           | TEXT         | "250-500mcg/Tag"                       |
| frequency                 | TEXT         | "2x taeglich", "2x/Woche"              |
| administration_route      | TEXT         | 'subcutaneous', 'nasal', 'oral'        |
| cycle_protocol            | TEXT         | "4 Wochen on, 4 off"                   |
| timing_notes              | TEXT         | "Nuechtern", "Vor Schlaf"              |
| synergies                 | TEXT[]       | ["TB-500", "GH-Stack"]                 |
| warnings                  | TEXT[]       | Warnhinweise                           |
| legal_status              | TEXT         | 'research_only', 'rx_required', etc.   |
+---------------------------+--------------+----------------------------------------+
```

**30+ Peptide aus PDF:**

| Kategorie | Peptide |
|-----------|---------|
| Regeneration | BPC-157, TB-500, GHK-Cu |
| Longevity | Epitalon, MOTS-c, SS-31 |
| Nootropics | Semax, Selank, Pinealon |
| GH-Secretagogues | Ipamorelin, CJC-1295 no DAC |
| Metabolisch | Retatrutide, ARA-290 |
| Immunsystem | KPV, Thymosin Alpha 1, Thymalin, FOXO4-DRI |
| Testo-Stack | IGF-1 LR3, Kisspeptin-10, Testagen |

### 3.2 Tabelle: `peptide_suppliers` (NEU)

Speichert Bezugsquellen fuer Peptide.

```text
+---------------------------+--------------+----------------------------------------+
| Spalte                    | Typ          | Beschreibung                           |
+---------------------------+--------------+----------------------------------------+
| id                        | UUID (PK)    | Eindeutige ID                          |
| name                      | TEXT         | "BPS Pharma", "Verified Peptides"      |
| country                   | TEXT         | 'DE', 'EU', 'US'                       |
| website                   | TEXT         | URL                                    |
| shipping_to_de            | BOOLEAN      | Lieferung nach DE                      |
| quality_tier              | TEXT         | 'verified' / 'standard'                |
| notes                     | TEXT         | Besonderheiten                         |
+---------------------------+--------------+----------------------------------------+
```

### 3.3 Tabelle: `peptide_stacks` (NEU)

Speichert die 8 Peptid-Stack-Protokolle.

```text
+---------------------------+--------------+----------------------------------------+
| Spalte                    | Typ          | Beschreibung                           |
+---------------------------+--------------+----------------------------------------+
| id                        | UUID (PK)    | Eindeutige ID                          |
| name                      | TEXT         | "Clean Gains", "Wolverine", etc.       |
| goal                      | TEXT         | Ziel des Stacks                        |
| category                  | TEXT         | 'muscle', 'healing', 'nootropic', etc. |
| protocol_phase            | INTEGER      | 2 oder 3                               |
| peptides                  | JSONB        | [{id, dosage, frequency, timing}]      |
| duration_weeks            | INTEGER      | Dauer des Protokolls                   |
| critical_rules            | TEXT[]       | Wichtige Regeln (z.B. "Nuechtern!")    |
| expected_effects          | TEXT[]       | Erwartete Wirkungen                    |
| warning                   | TEXT         | Allgemeine Warnung                     |
+---------------------------+--------------+----------------------------------------+
```

**8 Stacks aus PDF:**
1. **Clean Gains** (Muskelaufbau): Ipamorelin + CJC-1295
2. **Natural Testo-Boost**: IGF-1 LR3 + Kisspeptin-10
3. **Fettleber-Reset**: Retatrutide + ARA-290
4. **Autoimmun-Reset**: KPV + Thymosin Alpha 1 + FOXO4-DRI
5. **Perfekter Schlaf**: Epitalon + Pinealon
6. **Nootropics**: Semax + Selank
7. **Wolverine (Healing)**: BPC-157 + TB-500
8. **Looksmaxxing**: GHK-Cu + Epitalon + MOTS-c + SS-31

---

## Teil 4: Produkt-Daten (200+ Eintraege)

### 4.1 Supplement-Produkte pro Kategorie

Aus dem PDF extrahiert mit **konkreten Marken und Preisen**:

| Wirkstoff | Anzahl Produkte | Beispiel-Marken |
|-----------|-----------------|-----------------|
| Creatine | 4 | ESN, Bulk, More Nutrition |
| Magnesium | 4 | Sunday Natural, Naturtreu, MoleQlar, Now Foods |
| Omega-3 | 4 | Sunday Natural, Nordic Naturals, Naturtreu, MoleQlar |
| D3+K2 | 4 | Sunday Natural, Naturtreu, MoleQlar, ProFuel |
| Ashwagandha | 4 | Sunday Natural, Naturtreu, MoleQlar, Now Foods |
| Zink | 3 | Sunday Natural, Naturtreu, Nature Love |
| CoQ10 | 3 | MoleQlar, Sunday Natural, Life Extension |
| NMN | 3 | MoleQlar (3 Varianten), Sunday, ProHealth |
| ... | ... | ... |

**Total: 80+ Supplement-Produkte mit Preis/Tag**

### 4.2 Peptid-Produkte

| Peptid | Anbieter | Preis-Range |
|--------|----------|-------------|
| BPC-157 + TB-500 | BPS Pharma, Verified Peptides, Core Peptides | 49-89 EUR |
| GHK-Cu | Peptide Power EU, Biowell Labs, Synthagen Labs | 29-89 EUR |
| Epitalon | PharmaLabGlobal, BPS Pharma, UK-Peptides | 23-149 EUR |
| MOTS-c | Cell Peptides, Peptide Sciences, Core Peptides | 79-99 EUR |
| SS-31 | Cell Peptides, Peptide Regenesis | 79-189 EUR |
| Semax/Selank | Cosmic Nootropic | 25-45 EUR |
| Ipamorelin+CJC | Peptide Power EU, Core Peptides, Verified Peptides | 49-89 EUR |
| Retatrutide | 24Peptides, DN Research, Biowell Labs | 79-299 EUR |

---

## Teil 5: Intelligenz-Features (Datenfelder)

### 5.1 Synergien-Matrix

**Neue synergies[] Feld-Daten:**

| Kombination | Warum? |
|-------------|--------|
| D3 + K2 + Magnesium | K2 leitet Kalzium in Knochen, Mg aktiviert D3 |
| NMN + TMG | NMN verbraucht Methylgruppen, TMG liefert nach |
| Curcumin + Piperin/Fett | Sonst 0% Aufnahme |
| PQQ + CoQ10 | Regenerieren sich gegenseitig |
| Zink + Kupfer | 8:1 Ratio bei Langzeiteinnahme |
| Kollagen + Vitamin C | C ist Kofaktor fuer Kollagen-Synthese |
| Lion's Mane + Alpha-GPC | Beide erhoehen Acetylcholin |

### 5.2 Blocker-Matrix

**Neue blockers[] Feld-Daten:**

| Nicht kombinieren | Grund |
|-------------------|-------|
| Eisen + Kaffee/Tee/Milch | Blockiert Eisenaufnahme komplett |
| Zink + Phytate (Vollkorn) | Phytate binden Zink |
| Kalzium + Eisen | Konkurrieren um Aufnahme |
| 5-HTP + SSRIs | Serotonin-Syndrom Gefahr! |
| Berberin + Metformin | Beide AMPK-Aktivatoren |

### 5.3 Form-Qualitaet

**Neue form_quality Feld-Daten:**

| Wirkstoff | Schlechte Form | Optimale Form |
|-----------|----------------|---------------|
| Magnesium | Oxid (geringe Aufnahme) | Glycinat, L-Threonat |
| B12 | Cyanocobalamin | Methylcobalamin, Adenosylcobalamin |
| CoQ10 | Ubiquinon (oxidiert) | Ubiquinol (reduziert/aktiv) |
| Curcumin | Standard (0% Aufnahme) | Mizellen, Longvida, + Piperin |
| Alpha-Liponsaeure | S-ALA | R-ALA (natuerlich, stabil) |

---

## Teil 6: Implementierungs-Reihenfolge

| Schritt | Aktion | Prioritaet | Beschreibung |
|---------|--------|------------|--------------|
| 1 | **DB Migration: Neue Tabellen** | HOCH | supplement_brands, supplement_products erstellen |
| 2 | **DB Migration: Neue Spalten** | HOCH | form_quality, synergies, blockers, cycling_* |
| 3 | **DB Migration: Peptid-Tabellen** | HOCH | peptide_compounds, peptide_suppliers, peptide_stacks |
| 4 | **Seed: 16 Marken** | HOCH | supplement_brands befuellen |
| 5 | **Seed: 80+ Produkte** | HOCH | supplement_products befuellen |
| 6 | **Update: 120+ Wirkstoffe** | HOCH | supplement_database erweitern |
| 7 | **Seed: 30+ Peptide** | MITTEL | peptide_compounds befuellen |
| 8 | **Seed: 8 Stacks** | MITTEL | peptide_stacks befuellen |
| 9 | **Update: Synergien/Blocker** | MITTEL | Alle Supplements mit Interaktionsdaten |
| 10 | **UI: Produkt-Auswahl** | NIEDRIG | Modal fuer konkrete Produktwahl |
| 11 | **UI: Peptid-Stack-Browser** | NIEDRIG | Stack-Protokolle anzeigen |

---

## Teil 7: Daten-Dateien erstellen

### Neue Dateien:

1. **`src/data/supplementBrands.ts`** - 16 deutsche/EU Marken
2. **`src/data/supplementProducts.ts`** - 80+ konkrete Produkte mit Preisen
3. **`src/data/peptideCompounds.ts`** - 30+ Peptide mit Dosierungen
4. **`src/data/peptideSuppliers.ts`** - Bezugsquellen
5. **`src/data/peptideStacks.ts`** - 8 fertige Stack-Protokolle
6. **`src/data/supplementInteractions.ts`** - Synergien & Blocker Matrix

### Erweiterung bestehender Datei:

**`src/data/aresSupplementCatalog.ts`** erweitern um:
- 40+ neue Wirkstoffe (Nootropics, Metabolismus, Gut, Joints, etc.)
- form_quality, synergies, blockers fuer alle Eintraege
- Aktualisierte Impact-Scores basierend auf PDF

---

## Erwartetes Ergebnis

Nach Umsetzung:

1. **200+ konkrete Produkte** mit deutschen Marken und Tagespreisen
2. **30+ Peptide** mit vollstaendigen Protokollen und Bezugsquellen
3. **8 fertige Peptid-Stacks** fuer verschiedene Ziele
4. **Synergien-Engine** weiss welche Supplements zusammen gehoeren
5. **Blocker-Warnungen** bei problematischen Kombinationen
6. **Form-Qualitaet** zeigt optimale Bioverfuegbarkeit
7. **Verbrauchsprognose** berechnet Nachbestelldatum
8. **Preis-Optimierung** schlaegt guenstigere Alternativen vor

**Differenzierung:**
- Nicht nur "Was soll ich nehmen?" sondern "Welches Produkt genau?"
- Deutsche Marken mit deutschen Preisen
- Peptid-Stacks mit vollstaendigen Protokollen
- Intelligente Interaktions-Warnungen
