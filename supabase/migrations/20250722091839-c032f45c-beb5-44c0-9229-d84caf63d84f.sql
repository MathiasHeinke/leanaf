
-- Erweitere die meals Tabelle um Bewertungsfelder
ALTER TABLE public.meals 
ADD COLUMN quality_score integer DEFAULT NULL,
ADD COLUMN bonus_points integer DEFAULT 0,
ADD COLUMN ai_feedback text DEFAULT NULL,
ADD COLUMN evaluation_criteria jsonb DEFAULT '{}'::jsonb;

-- Kommentar zu den neuen Feldern
COMMENT ON COLUMN public.meals.quality_score IS 'Qualitätsbewertung der Mahlzeit (0-10)';
COMMENT ON COLUMN public.meals.bonus_points IS 'Zusätzliche Punkte für gute Mahlzeiten (0-10)';
COMMENT ON COLUMN public.meals.ai_feedback IS 'Coach-Feedback zur Mahlzeit';
COMMENT ON COLUMN public.meals.evaluation_criteria IS 'JSON mit Bewertungskriterien und Details';
