-- Add sleep_score column to sleep_tracking table
ALTER TABLE sleep_tracking ADD COLUMN IF NOT EXISTS sleep_score integer;

-- Create function to automatically calculate sleep score
CREATE OR REPLACE FUNCTION calculate_sleep_score(sleep_hours numeric, sleep_quality integer)
RETURNS integer AS $$
DECLARE
  hours_score numeric := 0;
  quality_score numeric := 0;
BEGIN
  -- Hours component (0-5 points, optimal at 7-8 hours)
  IF sleep_hours IS NULL THEN
    hours_score := 0;
  ELSIF sleep_hours >= 8 THEN
    hours_score := 5;
  ELSIF sleep_hours >= 7 THEN
    hours_score := 5;
  ELSIF sleep_hours >= 6 THEN
    hours_score := 4;
  ELSIF sleep_hours >= 5 THEN
    hours_score := 3;
  ELSIF sleep_hours >= 4 THEN
    hours_score := 2;
  ELSIF sleep_hours >= 3 THEN
    hours_score := 1;
  ELSE
    hours_score := 0;
  END IF;
  
  -- Quality component (0-5 points based on 1-10 rating)
  IF sleep_quality IS NULL THEN
    quality_score := 0;
  ELSE
    quality_score := ROUND(sleep_quality::numeric / 2);
  END IF;
  
  -- Return total score (0-10)
  RETURN ROUND(hours_score + quality_score);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update sleep_score
CREATE OR REPLACE FUNCTION update_sleep_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sleep_score := calculate_sleep_score(NEW.sleep_hours, NEW.sleep_quality);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_update_sleep_score ON sleep_tracking;
CREATE TRIGGER trigger_update_sleep_score
  BEFORE INSERT OR UPDATE ON sleep_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_sleep_score();

-- Update existing records to have sleep_score
UPDATE sleep_tracking 
SET sleep_score = calculate_sleep_score(sleep_hours, sleep_quality)
WHERE sleep_score IS NULL;