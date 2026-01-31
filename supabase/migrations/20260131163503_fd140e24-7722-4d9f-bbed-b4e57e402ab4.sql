-- ==============================================
-- PHASE 2: Produkte auf echte Wirkstoffe umhängen (mit korrekten IDs)
-- ==============================================

-- Schlaf-Produkte → Magnesium
UPDATE supplement_products 
SET supplement_id = '20f1f509-0019-46b9-98c3-6a9a621c6959'
WHERE supplement_id = '0b57f44c-3b75-4731-bf34-8d26ab27acb5';

-- Augen-Produkte → Lutein & Zeaxanthin
UPDATE supplement_products 
SET supplement_id = 'ac1fb0a4-16de-480f-852a-ec9856d589ca'
WHERE supplement_id = '8a823bd5-5d01-4d0c-9885-0bb549c1853d';

-- Frauen-Produkte → Multivitamin
UPDATE supplement_products 
SET supplement_id = '74212492-a332-47e2-8cbf-3841e19d1479'
WHERE supplement_id = 'c1649f3a-bfa1-489a-b242-e1e9805a4888';

-- Gelenke-Produkte → Glucosamin & Chondroitin
UPDATE supplement_products 
SET supplement_id = 'aad42649-acd3-41cb-ae0e-8aa5b25bdb57'
WHERE supplement_id = 'cc3df745-3e0a-4cb9-a264-992b7650bf7e';

-- Haare-Produkt → Biotin
UPDATE supplement_products 
SET supplement_id = '7a68d3d1-936f-48ea-9566-f08f1e255666'
WHERE supplement_id = 'b3cbbd79-69dc-4404-9382-e15a6c749474';

-- ==============================================
-- PHASE 3: Generische Marketing-Kategorien löschen
-- ==============================================

DELETE FROM supplement_database WHERE id IN (
  '0b57f44c-3b75-4731-bf34-8d26ab27acb5',  -- Schlaf
  '8a823bd5-5d01-4d0c-9885-0bb549c1853d',  -- Augen
  'c1649f3a-bfa1-489a-b242-e1e9805a4888',  -- Frauen
  'cc3df745-3e0a-4cb9-a264-992b7650bf7e',  -- Gelenke
  'b3cbbd79-69dc-4404-9382-e15a6c749474',  -- Haare
  'f8135b33-f0ee-4eec-9415-52364b73a196'   -- Beauty
);