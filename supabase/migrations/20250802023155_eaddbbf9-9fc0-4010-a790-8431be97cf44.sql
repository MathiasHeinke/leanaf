-- Add sleep_score column to sleep_tracking table
ALTER TABLE sleep_tracking ADD COLUMN IF NOT EXISTS sleep_score integer;

-- Create function to automatically calculate sleep score
CREATE OR REPLACE FUNCTION calculate_sleep_score(hours_slept numeric, quality_rating text)
RETURNS integer AS $$
BEGIN
  -- Base score from hours (0-8 hours mapped to 0-5 points)
  -- Quality rating (poor=1, okay=2, good=3, great=4) mapped to 0-5 points
  -- Total possible: 10 points
  
  DECLARE
    hours_score numeric := 0;
    quality_score numeric := 0;
  BEGIN
    -- Hours component (0-5 points, optimal at 7-8 hours)
    IF hours_slept IS NULL THEN
      hours_score := 0;
    ELSIF hours_slept >= 8 THEN
      hours_score := 5;
    ELSIF hours_slept >= 7 THEN
      hours_score := 5;
    ELSIF hours_slept >= 6 THEN
      hours_score := 4;
    ELSIF hours_slept >= 5 THEN
      hours_score := 3;
    ELSIF hours_slept >= 4 THEN
      hours_score := 2;
    ELSIF hours_slept >= 3 THEN
      hours_score := 1;
    ELSE
      hours_score := 0;
    END IF;
    
    -- Quality component (0-5 points)
    CASE quality_rating
      WHEN 'great' THEN quality_score := 5;
      WHEN 'good' THEN quality_score := 4;
      WHEN 'okay' THEN quality_score := 3;
      WHEN 'poor' THEN quality_score := 1;
      ELSE quality_score := 0;
    END CASE;
    
    -- Return total score (0-10)
    RETURN ROUND(hours_score + quality_score);
  END;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update sleep_score
CREATE OR REPLACE FUNCTION update_sleep_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sleep_score := calculate_sleep_score(NEW.hours_slept, NEW.quality_rating);
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
SET sleep_score = calculate_sleep_score(hours_slept, quality_rating)
WHERE sleep_score IS NULL;