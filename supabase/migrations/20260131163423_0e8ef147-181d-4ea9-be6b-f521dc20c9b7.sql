-- ==============================================
-- PHASE 1: Neue spezialisierte Wirkstoffe anlegen
-- ==============================================

-- Lutein & Zeaxanthin (Augen-Gesundheit)
INSERT INTO supplement_database (
  id, name, category, description, impact_score, evidence_level
) VALUES (
  gen_random_uuid(),
  'Lutein & Zeaxanthin',
  'Augengesundheit',
  'Carotinoide die sich in der Makula konzentrieren und vor oxidativem Stress durch blaues Licht schützen. Starke Evidenz für Erhalt der Sehkraft im Alter.',
  7.5,
  'strong'
);

-- Glucosamin & Chondroitin (Gelenk-Gesundheit)
INSERT INTO supplement_database (
  id, name, category, description, impact_score, evidence_level
) VALUES (
  gen_random_uuid(),
  'Glucosamin & Chondroitin',
  'Gelenke',
  'Strukturkomponenten des Gelenkknorpels. Unterstützen Knorpelregeneration und Gelenkschmierung bei Arthrose.',
  7.0,
  'moderate'
);

-- ==============================================
-- PHASE 2: Produkte auf echte Wirkstoffe umhängen
-- ==============================================

-- Schlaf-Produkte → Magnesium (id: 5e2f3a1b-4c8d-4e5f-a6b7-c8d9e0f1a2b3)
UPDATE supplement_products 
SET supplement_id = '5e2f3a1b-4c8d-4e5f-a6b7-c8d9e0f1a2b3'
WHERE supplement_id = 'f5e6d7c8-b9a0-1234-5678-9abcdef01234';

-- Augen-Produkte → Lutein & Zeaxanthin (neu angelegt)
UPDATE supplement_products 
SET supplement_id = (SELECT id FROM supplement_database WHERE name = 'Lutein & Zeaxanthin')
WHERE supplement_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- Frauen-Produkte → Multivitamin (id: b3c4d5e6-f7a8-9b0c-d1e2-f3a4b5c6d7e8)
UPDATE supplement_products 
SET supplement_id = 'b3c4d5e6-f7a8-9b0c-d1e2-f3a4b5c6d7e8'
WHERE supplement_id = 'b2c3d4e5-f6a7-8901-bcde-f23456789012';

-- Gelenke-Produkte → Glucosamin & Chondroitin (neu angelegt)
UPDATE supplement_products 
SET supplement_id = (SELECT id FROM supplement_database WHERE name = 'Glucosamin & Chondroitin')
WHERE supplement_id = 'c3d4e5f6-a7b8-9012-cdef-345678901234';

-- Haare-Produkt → Biotin (id: 9a0b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d)
UPDATE supplement_products 
SET supplement_id = '9a0b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d'
WHERE supplement_id = 'd4e5f6a7-b8c9-0123-def0-456789012345';

-- ==============================================
-- PHASE 3: Generische Marketing-Kategorien löschen
-- ==============================================

DELETE FROM supplement_database WHERE id IN (
  'f5e6d7c8-b9a0-1234-5678-9abcdef01234',  -- Schlaf
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- Augen
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',  -- Frauen
  'c3d4e5f6-a7b8-9012-cdef-345678901234',  -- Gelenke
  'd4e5f6a7-b8c9-0123-def0-456789012345',  -- Haare
  'e5f6a7b8-c9d0-1234-ef01-567890123456'   -- Beauty
);