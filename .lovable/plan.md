
# Cleanup: Generische Marketing-Kategorien entfernen

## Übersicht

Die Datenbank enthält 6 "Marketing-Kategorien" statt echter Wirkstoffe:

| Kategorie | Produkte | Aktion |
|-----------|----------|--------|
| **Schlaf** | 2 | Produkte umhängen auf Magnesium |
| **Augen** | 2 | Produkte umhängen auf neuen Wirkstoff "Lutein & Zeaxanthin" |
| **Frauen** | 2 | Produkte umhängen auf Multivitamin |
| **Gelenke** | 2 | Produkte umhängen auf neuen Wirkstoff "Glucosamin & Chondroitin" |
| **Haare** | 1 | Produkt umhängen auf Biotin |
| **Beauty** | 0 | Direkt löschen (Orphan) |

## Lösung

### Phase 1: Fehlende Wirkstoffe anlegen

Zwei spezialisierte Kombi-Wirkstoffe werden benötigt:

**Lutein & Zeaxanthin (Augen-Gesundheit)**
- Impact Score: 7.5
- Kategorie: Augengesundheit
- Evidence: Starke Evidenz für Makulaschutz

**Glucosamin & Chondroitin (Gelenk-Gesundheit)**
- Impact Score: 7.0
- Kategorie: Gelenke
- Evidence: Moderate Evidenz für Gelenkfunktion

### Phase 2: Produkte umhängen

| Produkt | Von | Zu |
|---------|-----|-----|
| Schlafgold Baldrian | Schlaf | Magnesium |
| Orthomol Nemuri night | Schlaf | Magnesium |
| Augen Vital 90 | Augen | Lutein & Zeaxanthin |
| Orthomol AMD extra | Augen | Lutein & Zeaxanthin |
| Orthomol Femin 60 | Frauen | Multivitamin |
| Orthomol Vital f | Frauen | Multivitamin |
| Glucosamin 1200 | Gelenke | Glucosamin & Chondroitin |
| Orthomol Chondroplus | Gelenke | Glucosamin & Chondroitin |
| Orthomol Hair Intense | Haare | Biotin |

### Phase 3: Generische Einträge löschen

Alle 6 Marketing-Kategorien aus `supplement_database` entfernen.

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| Neue Migration | Schema: INSERT für neue Wirkstoffe |
| Daten-Update | UPDATE Produkte + DELETE Orphans (via SQL-Tool) |

## Erwartetes Ergebnis

- Keine generischen "Schlaf", "Augen" etc. mehr in der Liste
- Alle Produkte auf sinnvolle Wirkstoffe gemappt
- Saubere, wirkstoff-basierte Hierarchie
