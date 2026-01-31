
-- =====================================================
-- Supplement Database Consolidation (handle duplicate user entries)
-- =====================================================

-- Step 0: DELETE duplicate user_supplements entries (keep main, delete orphan variants)
-- For users who have BOTH the orphan AND the main entry, just delete the orphan

DELETE FROM user_supplements 
WHERE supplement_id = '9fe98fee-961b-4e71-bbcd-a09c95e6f3f8'; -- Creatine Monohydrat

DELETE FROM user_supplements 
WHERE supplement_id = '093c156c-a959-4bc4-9390-a26b16c335f0'; -- Omega-3 (orphan)

DELETE FROM user_supplements 
WHERE supplement_id = 'd28e6be0-5198-45f4-bcb4-bb5063baf07a'; -- Vitamin D3 + K2 MK7 Tropfen

DELETE FROM user_supplements 
WHERE supplement_id = '4a7c4495-e68f-4478-8e94-ad7c6f42485a'; -- HMB 3000

DELETE FROM user_supplements 
WHERE supplement_id = '62078be5-0160-43f7-8030-cf2d610cda14'; -- Magnesium Glycinat

DELETE FROM user_supplements 
WHERE supplement_id = 'daa661cd-44ec-45b5-9178-56144fcbb558'; -- Magnesium Komplex 11 Ultra

DELETE FROM user_supplements 
WHERE supplement_id = '67284f55-1fe9-478e-831e-4ec13c74b6bf'; -- Zink Bisglycinat

DELETE FROM user_supplements 
WHERE supplement_id = 'c50abdbc-aa89-477a-b439-6db3f8d3dfd3'; -- Zinc Complex

DELETE FROM user_supplements 
WHERE supplement_id = '4cc5c3cc-e199-4134-a104-637454a79379'; -- Vitamin D Balance

DELETE FROM user_supplements 
WHERE supplement_id = '211377ca-5888-4450-91a7-eb45b0ea791c'; -- Magnesiumcitrat

DELETE FROM user_supplements 
WHERE supplement_id = '213d4105-a875-4ad9-8f8f-c49c111eeb0c'; -- Vitamin D3

-- Step 1: Move Vitamin D3 products to Vitamin D3 + K2
UPDATE supplement_products
SET supplement_id = '2f35d6f5-30fb-4778-a84b-6ea2a08de142'
WHERE supplement_id = '213d4105-a875-4ad9-8f8f-c49c111eeb0c';

-- Step 2: Move Zinc Complex product to Zink
UPDATE supplement_products
SET supplement_id = '37564ae1-0a2e-418c-b17b-647b5987d411'
WHERE supplement_id = 'c50abdbc-aa89-477a-b439-6db3f8d3dfd3';

-- Step 3: Update impact scores for main entries
UPDATE supplement_database 
SET impact_score = 9.8, necessity_tier = 'essential' 
WHERE id = 'b8f4c710-8562-44ee-9bb4-45e624fcc3d6'; -- Creatin

UPDATE supplement_database 
SET impact_score = 9.5, necessity_tier = 'essential' 
WHERE id = '20f1f509-0019-46b9-98c3-6a9a621c6959'; -- Magnesium

UPDATE supplement_database 
SET impact_score = 9.0, necessity_tier = 'essential' 
WHERE id = '37564ae1-0a2e-418c-b17b-647b5987d411'; -- Zink

-- Step 4: Delete orphan entries from supplement_database
DELETE FROM supplement_database WHERE id IN (
  '9fe98fee-961b-4e71-bbcd-a09c95e6f3f8',
  '093c156c-a959-4bc4-9390-a26b16c335f0',
  'd28e6be0-5198-45f4-bcb4-bb5063baf07a',
  '4cc5c3cc-e199-4134-a104-637454a79379',
  '213d4105-a875-4ad9-8f8f-c49c111eeb0c',
  '4a7c4495-e68f-4478-8e94-ad7c6f42485a',
  '62078be5-0160-43f7-8030-cf2d610cda14',
  '211377ca-5888-4450-91a7-eb45b0ea791c',
  'daa661cd-44ec-45b5-9178-56144fcbb558',
  '67284f55-1fe9-478e-831e-4ec13c74b6bf',
  'c50abdbc-aa89-477a-b439-6db3f8d3dfd3'
);
