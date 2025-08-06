-- Add enhanced fields to journal_entries table for Kai's mindset coaching
ALTER TABLE public.journal_entries 
ADD COLUMN IF NOT EXISTS energy_level integer CHECK (energy_level >= 1 AND energy_level <= 10),
ADD COLUMN IF NOT EXISTS stress_indicators text[],
ADD COLUMN IF NOT EXISTS manifestation_items text[],
ADD COLUMN IF NOT EXISTS kai_insight text,
ADD COLUMN IF NOT EXISTS transformation_themes text[],
ADD COLUMN IF NOT EXISTS quadrant_analysis jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS prompt_used text;

-- Add index for energy_level queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_energy_level ON public.journal_entries(energy_level);

-- Add index for date-based analytics
CREATE INDEX IF NOT EXISTS idx_journal_entries_mood_date ON public.journal_entries(user_id, date, mood_score);

-- Update trigger to handle new fields
CREATE OR REPLACE FUNCTION public.validate_journal_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate energy_level range
  IF NEW.energy_level IS NOT NULL AND (NEW.energy_level < 1 OR NEW.energy_level > 10) THEN
    RAISE EXCEPTION 'Energy level must be between 1 and 10';
  END IF;

  -- Validate mood_score range
  IF NEW.mood_score IS NOT NULL AND (NEW.mood_score < -5 OR NEW.mood_score > 5) THEN
    RAISE EXCEPTION 'Mood score must be between -5 and 5';
  END IF;

  -- Ensure arrays are not null
  IF NEW.gratitude_items IS NULL THEN
    NEW.gratitude_items := ARRAY[]::text[];
  END IF;
  
  IF NEW.stress_indicators IS NULL THEN
    NEW.stress_indicators := ARRAY[]::text[];
  END IF;
  
  IF NEW.manifestation_items IS NULL THEN
    NEW.manifestation_items := ARRAY[]::text[];
  END IF;
  
  IF NEW.transformation_themes IS NULL THEN
    NEW.transformation_themes := ARRAY[]::text[];
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_journal_entry_trigger ON public.journal_entries;
CREATE TRIGGER validate_journal_entry_trigger
  BEFORE INSERT OR UPDATE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_journal_entry();