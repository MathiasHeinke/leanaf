-- Add PSA and Lipase columns to user_bloodwork table
ALTER TABLE user_bloodwork 
ADD COLUMN IF NOT EXISTS psa numeric,
ADD COLUMN IF NOT EXISTS lipase numeric;

-- Add reference ranges for new markers
INSERT INTO bloodwork_reference_ranges (marker_name, unit, normal_min, normal_max, optimal_min, optimal_max, male_normal_min, male_normal_max, male_optimal_min, male_optimal_max, coaching_tips, description) VALUES
('psa', 'ng/mL', 0, 4.0, 0, 2.5, 0, 4.0, 0, 2.5, 'PSA muss vor TRT-Start bekannt sein. Werte >4 erfordern urologische Abklärung. Bei TRT regelmäßig kontrollieren.', 'Prostata-spezifisches Antigen - Sicherheitsmarker vor und während TRT'),
('lipase', 'U/L', 0, 60, 0, 40, 0, 60, 0, 40, 'Bauchspeicheldrüsen-Marker. Wichtig bei GLP-1 Agonisten wie Retatrutid. Bei Oberbauchschmerzen sofort checken.', 'Pankreas-Enzym zur Überwachung der Bauchspeicheldrüsenfunktion')
ON CONFLICT (marker_name) DO NOTHING;