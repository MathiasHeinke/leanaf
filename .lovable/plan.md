

# Multi-Hersteller Import: Centrum + Doppelherz

## Ausgangssituation

| Hersteller | Brand existiert | Produkte in DB | Produkte in JSON |
|------------|-----------------|----------------|------------------|
| **Doppelherz** | Ja (slug: `doppelherz`) | 22 | 19 |
| **Centrum** | Nein | 0 | 15 |

### JSON-Format Unterschiede zu Biogena

| Feld | Biogena | Centrum/Doppelherz |
|------|---------|-------------------|
| `form` | Fehlt (wird aus dosage geparsed) | Explizit als String (`tablets`, `softgels`, `capsules`) |
| `made_in_germany` | Fehlt | Boolean vorhanden |
| `lab_tested` | Fehlt | Boolean vorhanden |
| `pack_size` | Fehlt (nur `servings`) | Explizit vorhanden |
| `big8_scores.lab_tests` | `lab_tested` | `lab_tests` (anderer Feldname!) |

---

## Implementierungsschritte

### Schritt 1: Centrum als Brand anlegen

```sql
INSERT INTO supplement_brands (name, slug, country, website, price_tier, specialization, quality_certifications, description)
VALUES ('Centrum', 'centrum', 'US', 'centrum.de', 'mid', ARRAY['multivitamin', 'classic', 'pharmacy'], ARRAY['GMP', 'pharma-grade'], 'Weltweit fuehrender Multivitamin-Hersteller. Apotheken-Qualitaet.');
```

### Schritt 2: Generische Edge Function erstellen

**Datei:** `supabase/functions/seed-manufacturer-products/index.ts`

Unterschiede zur Biogena-Version:
- **Dynamischer Brand-Slug**: Liest `manufacturer_id` aus JSON
- **Form-Mapping**: Uebersetzt englische Form-Namen (`tablets` -> `Tabletten`, `softgels` -> `Softgels`)
- **Erweiterte Tags**: Nutzt `made_in_germany` und `lab_tested` fuer Quality-Tags
- **Flexible Scores**: Unterstuetzt sowohl `lab_tested` als auch `lab_tests` Feldnamen
- **Erweitertes Ingredient-Mapping**: Neue Kategorien fuer Multivitamin-Produkte

### Schritt 3: Ingredient-Mapping erweitern

Neue Mappings fuer Centrum/Doppelherz Kategorien:

```text
'multivitamin' -> 'Multivitamin'
'omega3' -> 'Omega-3'
'q10' -> 'CoQ10 Ubiquinol'
'vitamin_d' -> 'Vitamin D3'
'vitamin_b12' -> 'Vitamin B12'
'fish_oil' -> 'Omega-3'
'epa' -> 'Omega-3'
'dha' -> 'Omega-3'
'coenzyme_q10' -> 'CoQ10 Ubiquinol'
'lutein' -> 'Lutein'
```

### Schritt 4: Form-Mapping hinzufuegen

```text
'tablets' -> 'Tabletten'
'softgels' -> 'Softgels'
'capsules' -> 'Kapseln'
'drops' -> 'Tropfen'
'powder' -> 'Pulver'
'liquid' -> 'Fluessig'
```

### Schritt 5: Quality-Tags aus JSON-Feldern

```text
made_in_germany: true -> 'made-in-de'
lab_tested: true -> 'lab-tested'
big8_scores.value >= 8.5 -> 'good-value'
big8_scores.bioavailability >= 8.5 -> 'high-bioavailability'
```

---

## Dateiaenderungen

### Neue Datei: `supabase/functions/seed-manufacturer-products/index.ts`

- Generischer Handler fuer alle Hersteller-JSONs
- Liest `manufacturer_id` aus JSON und sucht passenden Brand
- Falls Brand nicht existiert: Fehler mit Hinweis zur Erstellung
- Verarbeitet unterschiedliche Form- und Score-Feldnamen
- Upsert-Logik wie bei Biogena

### Aenderung: `src/data/supplementBrands.ts`

- Centrum als neuen Brand hinzufuegen (fuer Frontend-Anzeige)

---

## Ablauf

```text
1. Edge Function deployen
2. Centrum Brand via SQL anlegen
3. POST /seed-manufacturer-products mit centrum.json
4. POST /seed-manufacturer-products mit doppelherz.json
5. Ergebnis pruefen
```

---

## Erwartetes Ergebnis

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| **Centrum Produkte** | 0 | 15 |
| **Doppelherz Produkte** | 22 | ~30 (Upsert) |
| **Gesamt Produkte** | ~450 | ~480+ |
| **Hersteller mit Daten** | 17 | 18 (Centrum neu) |

