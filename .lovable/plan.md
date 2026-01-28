
# Plan: Seed-Products Edge Function testen und Seeding durchführen

## Status-Analyse

| Metrik | Aktueller Stand |
|--------|-----------------|
| Produkte in DB | 168 |
| Marken in DB | 16 |
| Wirkstoffe in DB | 101 |
| Seed-Dateien | ~270+ Produkte verfügbar |

## Problem erkannt

Die Marke **`biogena`** fehlt in der `supplement_brands` Tabelle! Die Seed-Datei `pharmacyBrandsSeed.ts` enthält ~45 Biogena-Produkte mit `brand_slug: 'biogena'`, aber diese Brand existiert nicht in der DB.

## Lösungsplan

### Schritt 1: Biogena Brand einfügen (Migration)

```sql
INSERT INTO public.supplement_brands (name, slug, country, website, price_tier, specialization, quality_certifications, description)
VALUES (
  'Biogena',
  'biogena',
  'EU',
  'biogena.com',
  'luxury',
  ARRAY['longevity', 'premium', 'reinsubstanzen'],
  ARRAY['GMP', 'ISO22000', 'HACCP'],
  'Salzburger Premium-Hersteller. Reinsubstanzen ohne Zusätze.'
);
```

### Schritt 2: Seed-Products mit Pharmacy-Produkten aufrufen

Die Edge Function mit den Pharmacy-Produkten aus `pharmacyBrandsSeed.ts` aufrufen:
- **Biogena**: ~45 Produkte
- **Orthomol**: ~22 Produkte  
- **Doppelherz**: ~14 Produkte

**Gesamt**: ~81 neue Produkte

### Schritt 3: Verifizierung

Nach dem Seeding sollte die DB enthalten:
- **~249 Produkte** (168 + ~81 neue)
- **16 Marken** (biogena war schon hinzugefügt im Code, muss in DB)
- **101+ Wirkstoffe**

---

## Technische Umsetzung

1. **Migration ausführen**: Biogena Brand in `supplement_brands` einfügen
2. **Edge Function aufrufen**: `POST /seed-products` mit Pharmacy-Produkten als Body
3. **Ergebnis prüfen**: Response validieren, DB-Stand checken

## Erwartetes Ergebnis

Nach Durchführung:
- Alle 3 Pharmacy-Marken vollständig in DB
- ~249+ Produkte gesamt
- Round 2 Seeding abgeschlossen für Pharmacy-Kategorie
