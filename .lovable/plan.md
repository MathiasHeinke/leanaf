
# Fix: GlyNAC & NMN Duplikate konsolidieren

## Problem

Die Datenbank enthält noch 2 weitere Duplikate, die in Runde 2 nicht erwischt wurden:

| Substanz | Behalten | Löschen | Aktion |
|----------|----------|---------|--------|
| **GlyNAC** | `GlyNAC` (8.5, 2 Produkte) | `GLY-NAC` (5.0, 1 Produkt) | Produkt umhängen, Orphan löschen |
| **NMN** | `NMN` (9.0, 7 Produkte) | `NMN (Nicotinamid Mononukleotid)` (5.0, 0 Produkte) | Nur Orphan löschen |

## Lösung

Eine einfache DB-Migration:

```sql
-- PHASE 1: GLY-NAC Produkt auf GlyNAC umhängen
UPDATE supplement_products
SET supplement_id = 'dd015e55-c58d-4019-8472-e06130d384ce'  -- GlyNAC (8.5)
WHERE supplement_id = '31ed7e65-fb3f-45ef-849a-32cac0a66460'; -- GLY-NAC (5.0)

-- PHASE 2: User-Supplements von Orphans löschen
DELETE FROM user_supplements
WHERE supplement_id IN (
  '31ed7e65-fb3f-45ef-849a-32cac0a66460',  -- GLY-NAC
  '94850dcd-fc46-4d0d-9c1b-5a50331a6d03'   -- NMN (Nicotinamid...)
);

-- PHASE 3: Orphan-Einträge löschen
DELETE FROM supplement_database
WHERE id IN (
  '31ed7e65-fb3f-45ef-849a-32cac0a66460',  -- GLY-NAC
  '94850dcd-fc46-4d0d-9c1b-5a50331a6d03'   -- NMN (Nicotinamid...)
);
```

## Erwartetes Ergebnis

Nach der Migration:
- **GlyNAC**: 1 Eintrag mit Score 8.5 und 3 Produkten
- **NMN**: 1 Eintrag mit Score 9.0 und 7 Produkten
- Keine "2 Varianten" mehr im UI für diese Substanzen

## Technische Details

| Datei | Änderung |
|-------|----------|
| Neue Migration | 3-Phasen SQL: Produkte umhängen → User-Links löschen → Orphans löschen |
