-- =============================================
-- RUNDE 3: GlyNAC & NMN Duplikate konsolidieren
-- =============================================

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