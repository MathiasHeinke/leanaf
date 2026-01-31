
# Bulk JSON Import: CSV Runner erweitern

## Ausgangslage

Der CSV Runner kann aktuell nur einzelne JSON-Dateien pro Marke importieren. Es kommen 17 Marken-JSONs (790 Produkte gesamt, MoleQlar bereits erledigt).

### Hauptprobleme

1. **Fehlende Marke**: `amazon_generic` existiert nicht in der DB
2. **Slug-Mismatch**: JSON verwendet Unterstriche (`doctors_best`), DB verwendet Bindestriche (`doctors-best`)
3. **Keine Bulk-Funktion**: Aktuell muss jede JSON einzeln hochgeladen werden

## Loesung

### 1. Neue Marke hinzufuegen (Migration)

```sql
INSERT INTO supplement_brands (name, slug, country, website, price_tier, description)
VALUES ('Amazon Generic', 'amazon-generic', 'DE', 'amazon.de', 'budget', 
        'Amazon Eigenmarken und generische Produkte');
```

### 2. Slug-Mapping im Frontend

Automatische Konvertierung: `doctors_best` wird zu `doctors-best`

```typescript
const normalizeSlug = (slug: string) => slug.replace(/_/g, '-');
```

### 3. Bulk Upload Mode

Neuer Modus: Mehrere JSON-Dateien gleichzeitig hochladen und sequentiell verarbeiten.

```
+------------------------------------------+
|  Bulk Brand Sync                         |
+------------------------------------------+
|  [Dateien waehlen] 0 von 17 ausgewaehlt  |
|                                          |
|  Erkannte Marken:                        |
|  - biogena.json (37 Produkte)            |
|  - bulk.json (20 Produkte)               |
|  - doctors_best.json (22 Produkte)       |
|  ...                                     |
|                                          |
|  [==========----------] 5/17             |
|  Aktuell: esn.json (64 Produkte)         |
|                                          |
|  [Bulk Import starten]                   |
+------------------------------------------+
```

### 4. BRAND_OPTIONS erweitern

Alle 18 Marken (exkl. MoleQlar da bereits erledigt, aber trotzdem in Liste):

```typescript
const BRAND_OPTIONS = [
  { slug: "amazon-generic", name: "Amazon Generic" },
  { slug: "biogena", name: "Biogena" },
  { slug: "bulk", name: "Bulk" },
  { slug: "doctors-best", name: "Doctor's Best" },
  { slug: "doppelherz", name: "Doppelherz" },
  { slug: "esn", name: "ESN" },
  { slug: "gloryfeel", name: "Gloryfeel" },
  { slug: "gymbeam", name: "GymBeam" },
  { slug: "lebenskraft-pur", name: "Lebenskraft Pur" },
  { slug: "life-extension", name: "Life Extension" },
  { slug: "moleqlar", name: "MoleQlar" },
  { slug: "more-nutrition", name: "More Nutrition" },
  { slug: "natural-elements", name: "Natural Elements" },
  { slug: "nature-love", name: "Nature Love" },
  { slug: "naturtreu", name: "Naturtreu" },
  { slug: "nordic-naturals", name: "Nordic Naturals" },
  { slug: "now-foods", name: "Now Foods" },
  { slug: "orthomol", name: "Orthomol" },
  { slug: "profuel", name: "ProFuel" },
  { slug: "sunday-natural", name: "Sunday Natural" },
];
```

## Dateien die geaendert werden

| Datei | Aenderung |
|-------|-----------|
| `supabase/migrations/xxx.sql` | INSERT amazon-generic Brand |
| `src/pages/admin/ImportCSVRunner.tsx` | Bulk Upload Mode + Slug-Mapping + alle Marken |

## Technische Details

### Bulk Upload Flow

1. User waehlt mehrere JSON-Dateien (z.B. alle 17 auf einmal)
2. System erkennt Marke aus Dateiname (`biogena.json` oder `biogena-2.json`)
3. Slug wird normalisiert (Unterstriche zu Bindestriche)
4. Sequentielle Verarbeitung mit Progress-Anzeige
5. Zusammenfassung am Ende mit Gesamt-Stats

### Dateiname-zu-Marke Mapping

```typescript
// biogena-2.json -> biogena
// doctors_best.json -> doctors-best
const extractBrandFromFilename = (filename: string) => {
  const base = filename.replace(/\.json$/, '').replace(/-\d+$/, '');
  return base.replace(/_/g, '-');
};
```

## Erwartetes Ergebnis

| Vorher | Nachher |
|--------|---------|
| 5 Marken im Dropdown | 20 Marken im Dropdown |
| Einzelner JSON-Upload | Bulk-Upload (mehrere Dateien) |
| Manuelles Marken-Matching | Automatisches Filename-zu-Slug Mapping |
| amazon_generic nicht vorhanden | amazon-generic Brand in DB |

## Ablauf

1. Migration: amazon-generic Brand hinzufuegen
2. ImportCSVRunner.tsx: Bulk Mode implementieren
3. Testen mit 2-3 JSONs
4. Alle 17 verbleibenden Marken importieren
