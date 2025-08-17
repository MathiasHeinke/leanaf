-- Add calculated goal tracking columns to daily_goals table
ALTER TABLE public.daily_goals ADD COLUMN IF NOT EXISTS weight_difference_kg DECIMAL(5,2);
ALTER TABLE public.daily_goals ADD COLUMN IF NOT EXISTS weeks_to_goal INTEGER;
ALTER TABLE public.daily_goals ADD COLUMN IF NOT EXISTS days_to_goal INTEGER;
ALTER TABLE public.daily_goals ADD COLUMN IF NOT EXISTS weekly_calorie_deficit INTEGER;
ALTER TABLE public.daily_goals ADD COLUMN IF NOT EXISTS total_calories_needed INTEGER;
ALTER TABLE public.daily_goals ADD COLUMN IF NOT EXISTS weekly_fat_loss_g INTEGER;
ALTER TABLE public.daily_goals ADD COLUMN IF NOT EXISTS target_date DATE;
ALTER TABLE public.daily_goals ADD COLUMN IF NOT EXISTS is_gaining_weight BOOLEAN DEFAULT FALSE;
ALTER TABLE public.daily_goals ADD COLUMN IF NOT EXISTS goal_type TEXT;
ALTER TABLE public.daily_goals ADD COLUMN IF NOT EXISTS is_realistic_goal BOOLEAN DEFAULT TRUE;
ALTER TABLE public.daily_goals ADD COLUMN IF NOT EXISTS warning_message TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.daily_goals.weight_difference_kg IS 'Gewichtsunterschied zum Ziel in kg';
COMMENT ON COLUMN public.daily_goals.weeks_to_goal IS 'Wochen bis zum Ziel';
COMMENT ON COLUMN public.daily_goals.days_to_goal IS 'Tage bis zum Ziel';
COMMENT ON COLUMN public.daily_goals.weekly_calorie_deficit IS 'Wöchentliches Kaloriendefizit';
COMMENT ON COLUMN public.daily_goals.total_calories_needed IS 'Gesamt-kcal für Ziel';
COMMENT ON COLUMN public.daily_goals.weekly_fat_loss_g IS 'Fett-Verlust pro Woche in Gramm';
COMMENT ON COLUMN public.daily_goals.target_date IS 'Zieldatum';
COMMENT ON COLUMN public.daily_goals.is_gaining_weight IS 'Ob Gewichtszunahme das Ziel ist';
COMMENT ON COLUMN public.daily_goals.goal_type IS 'Zielart: lose, maintain, gain';
COMMENT ON COLUMN public.daily_goals.is_realistic_goal IS 'Ob das Ziel realistisch ist';
COMMENT ON COLUMN public.daily_goals.warning_message IS 'Warnmeldung falls unrealistisch';