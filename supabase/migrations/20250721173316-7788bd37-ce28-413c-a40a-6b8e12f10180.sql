
-- Erweitere weight_history Tabelle für Body Composition und Foto-Tracking
ALTER TABLE public.weight_history 
ADD COLUMN body_fat_percentage DECIMAL(4,2) CHECK (body_fat_percentage IS NULL OR (body_fat_percentage >= 0 AND body_fat_percentage <= 100)),
ADD COLUMN muscle_percentage DECIMAL(4,2) CHECK (muscle_percentage IS NULL OR (muscle_percentage >= 0 AND muscle_percentage <= 100)),
ADD COLUMN photo_urls JSONB DEFAULT '[]'::jsonb,
ADD COLUMN notes TEXT;

-- Kommentar für die neuen Spalten
COMMENT ON COLUMN public.weight_history.body_fat_percentage IS 'Körperfettanteil in Prozent (0-100%)';
COMMENT ON COLUMN public.weight_history.muscle_percentage IS 'Muskelanteil in Prozent (0-100%)';
COMMENT ON COLUMN public.weight_history.photo_urls IS 'Array von Foto-URLs (max. 3 Bilder)';
COMMENT ON COLUMN public.weight_history.notes IS 'Optionale Notizen zum Gewichtseintrag';
