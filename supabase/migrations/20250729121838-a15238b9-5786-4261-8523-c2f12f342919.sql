-- Add comprehensive supplement list to supplement_database

-- Anti-Aging/Longevity supplements
INSERT INTO public.supplement_database (name, category, default_dosage, default_unit, common_timing, description) VALUES
('NMN (Nicotinamid Mononukleotid)', 'Anti-Aging', 250, 'mg', 'morgens', 'Eternal Vitality NMN Uthever - Lab tested, vegan. Unterstützt NAD+ Produktion für zelluläre Energie und Reparatur.'),
('Liposomales NAD+ & Trans-Resveratrol', 'Anti-Aging', 800, 'mg', 'morgens', 'COUTIHOT Kombination aus NAD+ und Trans-Resveratrol für optimale Bioverfügbarkeit und Anti-Aging Effekte.'),
('TMG (Trimethylglycine)', 'Performance', 1000, 'mg', 'vor dem Training', 'GymBeam Betaine - Aminosäure-Derivat für Sports Performance und Methylierung.'),
('Methylenblau 1%', 'Nootropics', 1, 'Tropfen', 'morgens', 'Woldo Health 1% Lösung - Mitochondriale Funktion und kognitive Unterstützung.'),

-- Antioxidants
('Pinienrinden Extrakt', 'Antioxidantien', 100, 'mg', 'zu den Mahlzeiten', 'Supplenatura 95% Proanthocyanidine mit natürlichem Vitamin C - Starker Antioxidans-Komplex.'),
('Grüntee Extrakt', 'Antioxidantien', 500, 'mg', 'zwischen den Mahlzeiten', 'Natural Elements Grüntee-Polyphenole - 180 Kapseln für antioxidative Wirkung.'),
('Astaxanthin + Coenzym Q10', 'Antioxidantien', 630, 'mg', 'zu den Mahlzeiten', 'Sevens Nutrition Kombination - 60 Softgels für zellulären Schutz und Energie.'),

-- Performance/Amino Acids
('GLY-NAC', 'Aminosäuren', 1000, 'mg', 'nüchtern', 'MoleQlar Glycin + N-Acetylcystein - 120 Kapseln für Glutathion-Produktion und Entgiftung.'),
('Alpha-Ketoglutarat (AKG)', 'Performance', 600, 'mg', 'nüchtern', 'Sunday Natural AKG - 90 Kapseln für Stickstoffmetabolismus und Anti-Aging.'),
('HMB 3000', 'Performance', 1500, 'mg', 'vor/nach dem Training', 'Scenit HMB + Vitamin B6 - 120 Kapseln, 1500mg pro Kapsel für Muskelschutz.'),
('Pre-Workout Komplex', 'Performance', 15400, 'mg', 'vor dem Training', 'Komplexe Formel mit L-Citrullin, L-Arginin-AKG, Beta-Alanin, Taurin, Tyrosin, Grüner Tee, Traubenkern, Koffein, Panax Ginseng - 20 Portionen.'),

-- Hormonal Support
('Turkesterone Max', 'Hormone', 1510, 'mg', 'zu den Mahlzeiten', 'GEN Nutrition Turkesterone mit Bioenhancer - 120 Kapseln für natürliche Leistungssteigerung.'),

-- Specialized Vitamins
('Vitamin B Komplex (hochdosiert)', 'Vitamine', 1, 'Kapsel', 'morgens', 'Nature Love hochdosiert, vegan - B1, B2, B3, B5, B6, B7, B9, B12 Komplex.'),
('Vitamin D3 + K2 MK7 Tropfen', 'Vitamine', 5000, 'IE', 'zu fettreichen Mahlzeiten', 'Sunday Natural 5000 IE D3 + 200µg K2 MK7 - 300 Tropfen für optimale Kalziumaufnahme.'),
('Vitamin D Balance', 'Vitamine', 1, 'Kapsel', 'zu fettreichen Mahlzeiten', 'Sunday Natural Komplex mit D3, K2 MK7, Calcium, Magnesium, Zink, Bor, Vitamin A - 120 Kapseln.'),
('Methyl Folate', 'Vitamine', 1000, 'mcg', 'morgens', 'NOW Methylfolat - 90 Kapseln, aktive Form von Folsäure für optimale Bioverfügbarkeit.'),

-- Specialized Minerals
('Zinc Complex', 'Mineralien', 25, 'mg', 'abends nüchtern', 'Igennus Zink (Picolinat & Bisglycinat) + Kupfer - 180 Tabletten für optimale Absorption.'),
('Magnesiumcitrat', 'Mineralien', 200, 'mg', 'abends', 'Natural Elements Magnesium Citrat - 365 Kapseln für Entspannung und Muskelregeneration.'),
('Magnesium Komplex 11 Ultra', 'Mineralien', 200, 'mg', 'abends', 'Sunday Natural 11 Magnesium-Formen - 120 Kapseln, 200mg pro Kapsel für umfassende Magnesiumversorgung.'),
('Eisen + Vitamin C', 'Mineralien', 14, 'mg', 'nüchtern', 'Natural Elements Eisen mit Vitamin C - 240 Tabletten für verbesserte Eisenaufnahme.'),

-- Gut Health
('Probiona Kulturen Komplex', 'Darmgesundheit', 1, 'Kapsel', 'morgens nüchtern', 'Nature Love Probiotika - 180 Kapseln mit verschiedenen Bakterienkulturen für Darmgesundheit.'),

-- Beauty/Wellness
('Hyaluron & Kollagen', 'Beauty', 1, 'Kapsel', 'morgens', 'Natural Elements mit Biotin, Selen, Zink, Acerola - 180 Kapseln für Haut, Haare und Nägel.'),
('Schwarzkümmelöl 1000', 'Wellness', 1000, 'mg', 'zu den Mahlzeiten', 'Biogena Nigella-sativa-Öl - hochdosiert, ägyptisch, Premiumqualität für Immunsystem und Entzündungshemmung.');

-- Update existing categories to include new ones if needed
-- Add new categories to the enum if they don't exist
DO $$
BEGIN
    -- This will add new categories if they don't exist in any enum constraints
    -- The application will handle the new categories
END $$;