

# Chip zeigt keine Brand-Daten - Diagnose und Loesung

## Diagnose

Nach der Analyse habe ich das Problem identifiziert:

### Aktuelle Architektur

```text
user_supplements --> supplement_database --> (keine Verknuepfung zu) --> supplement_products/supplement_brands
       |                    |
       |                    +-- name: "Vitamin B Komplex (hochdosiert)"
       |
       +-- name: kommt von supplement_database
```

### Das Problem

1. **Fehlende Verknuepfung**: Die Tabelle `user_supplements` hat keine Spalte `product_id` - sie weiss nicht, welches spezifische Produkt der User nutzt
2. **Brand-Daten sind isoliert**: Die Brands sind in `supplement_products.brand_id` gespeichert, aber nicht mit dem User-Stack verbunden
3. **Collapsed-Chip zeigt nur Basis-Daten**: Name, Dosierung, Einheit und Timing-Constraint - keine Brand-Info
4. **BrandSelector-Auswahl wird nicht persistiert**: Beim Oeffnen des Chips ist der lokale State `selectedProduct` immer leer

### Warum "Ca-AKG (Rejuvant)" funktioniert

Bei diesem Eintrag ist die Brand **direkt im Namen** in der `supplement_database` eingetragen. Das ist ein manueller Workaround, nicht die Standard-Architektur.

## Loesungsvorschlag

### Option A: Product-Verknuepfung in user_supplements (Empfohlen)

1. **Schema-Erweiterung**: Neue Spalte `selected_product_id` in `user_supplements`
2. **Beim Speichern**: BrandSelector-Auswahl in `selected_product_id` persistieren
3. **Beim Laden**: Product + Brand-Daten joinen
4. **Im Chip anzeigen**: Brand-Name neben dem Supplement-Namen

### Option B: Brand im Namen einbetten (Quick-Fix)

Wenn ein User ein Produkt waehlt, den Namen in `user_supplements.name` auf "Vitamin B Komplex (Nature Love)" aendern. 

**Nachteil**: Verliert die strukturierte Verknuepfung fuer Reporting/Analytics.

## Empfohlene Umsetzung (Option A)

### 1. Datenbank-Migration

Neue Spalte hinzufuegen:

```text
ALTER TABLE user_supplements
ADD COLUMN selected_product_id UUID REFERENCES supplement_products(id);
```

### 2. Hook erweitern (useUserStack)

Join erweitern um Product + Brand:

```text
user_supplements
  -> supplement_database (bestehend)
  -> supplement_products (neu)
     -> supplement_brands (neu)
```

### 3. ExpandableSupplementChip anpassen

- **onSave**: `selected_product_id` mitschicken wenn ein Produkt gewaehlt wurde
- **Collapsed-State**: Brand-Name aus dem gejointen Product anzeigen
- **Initial-State**: `selectedProduct` aus den gejointen Daten initialisieren

### 4. Collapsed-Chip UI

Neues Layout:

```text
[Pill-Icon] Vitamin B Komplex (hochdosiert) | 1 Kapsel | Nature Love | Nuechtern
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   ^^^^^^^^   ^^^^^^^^^^^   ^^^^^^^^^
            Name                                 Dosierung  Brand (NEU)   Constraint
```

## Dateiaenderungen

| Datei | Aenderung |
|-------|-----------|
| `Migration` | ALTER TABLE user_supplements ADD COLUMN selected_product_id |
| `src/hooks/useSupplementLibrary.ts` | Join um supplement_products + supplement_brands erweitern |
| `src/components/supplements/ExpandableSupplementChip.tsx` | Brand im Collapsed-State anzeigen, onSave erweitern |
| `src/types/supplementLibrary.ts` | UserStackItem Interface um product/brand erweitern |

## Erwartetes Ergebnis

Nach der Implementierung:

| Vorher | Nachher |
|--------|---------|
| `Vitamin B Komplex (hochdosiert) 1Kapsel` | `Vitamin B Komplex (hochdosiert) 1Kapsel · Nature Love` |
| BrandSelector-Auswahl geht verloren | Auswahl wird persistent gespeichert |
| Kein Produkt-Tracking | Analytics-faehige Produkt-Verknuepfung |

