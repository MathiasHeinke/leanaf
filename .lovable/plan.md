

# Quality-Scores Anreicherung: 7-Item zu 8-Item Mapping

## Ausgangslage

Die MoleQlar/Naturtreu-Produkte haben bereits 7 Item-Scores befuellt:
- `bioavailability`, `potency`, `purity`, `value`, `reviews`, `origin`, `lab_tests`

Die 8 Quality-Scores sind jedoch alle NULL:
- `quality_bioavailability`, `quality_purity`, `quality_value`, `quality_dosage`, `quality_form`, `quality_synergy`, `quality_research`, `quality_transparency`

## Loesung: Automatisches Mapping

Eine SQL-Migration, die die vorhandenen 7-Item Scores auf die 8-Item Quality Scores mappt:

| Quelle (7-Item) | Ziel (8-Item) | Logik |
|-----------------|---------------|-------|
| `bioavailability` | `quality_bioavailability` | Direkt |
| `purity` | `quality_purity` | Direkt |
| `value` | `quality_value` | Direkt |
| `potency` | `quality_dosage` | Direkt (Potency = Dosierungsstaerke) |
| `lab_tests` | `quality_research` | Direkt (Lab = Forschung/Nachweis) |
| `origin` | `quality_transparency` | Direkt (Herkunft = Transparenz) |
| `form` | `quality_form` | Basierend auf Produktform-Mapping |
| (Durchschnitt) | `quality_synergy` | Berechnet aus Synergy-Feld oder Default 8.0 |

## Technische Umsetzung

### Migration SQL

```sql
UPDATE supplement_products
SET 
  quality_bioavailability = bioavailability,
  quality_purity = purity,
  quality_value = value,
  quality_dosage = potency,
  quality_research = lab_tests,
  quality_transparency = origin,
  quality_form = CASE 
    WHEN form = 'liposomal' THEN 10.0
    WHEN form = 'liquid' THEN 9.5
    WHEN form = 'powder' THEN 9.0
    WHEN form = 'softgel' THEN 8.5
    WHEN form = 'capsule' THEN 8.0
    WHEN form = 'tablet' THEN 7.0
    WHEN form = 'gummy' THEN 6.0
    ELSE 8.0
  END,
  quality_synergy = 8.0
WHERE 
  bioavailability IS NOT NULL 
  AND quality_bioavailability IS NULL;
```

## Dateien die geaendert werden

| Datei | Aenderung |
|-------|-----------|
| Migration (neu) | SQL-Update fuer Quality-Score Mapping |

## Erwartetes Ergebnis

| Vorher | Nachher |
|--------|---------|
| quality_* = NULL fuer ~170 Produkte | quality_* befuellt basierend auf 7-Item Scores |

## Ablauf

1. Migration ausfuehren
2. Verifizieren: Alle Produkte mit 7-Item Scores haben jetzt auch 8-Item Quality Scores
3. Pruefen ob `impact_score_big8` Berechnung angepasst werden muss

