-- Fix supplement_database missing column for supplement-recognition function
ALTER TABLE supplement_database 
ADD COLUMN IF NOT EXISTS common_brands text[] DEFAULT '{}';

-- Add some test data for supplement recognition
INSERT INTO supplement_database (name, category, default_dosage, recognition_keywords, common_brands)
VALUES 
  ('Spirulina', 'Superfoods', '3-5g', ARRAY['spirulina', 'algae', 'blue-green'], ARRAY['GSE', 'Naturya', 'Organic']),
  ('Chlorella', 'Superfoods', '3-5g', ARRAY['chlorella', 'algae', 'green'], ARRAY['GSE', 'Naturya', 'Bio'])
ON CONFLICT (name) DO NOTHING;