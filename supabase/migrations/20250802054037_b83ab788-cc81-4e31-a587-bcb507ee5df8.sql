-- Create trigger to automatically set meal date based on timezone
CREATE OR REPLACE FUNCTION fill_meal_date_tz()
RETURNS TRIGGER AS $$
BEGIN
  -- If date is null, set it based on created_at in Berlin timezone
  IF NEW.date IS NULL THEN
    NEW.date := (NEW.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')::date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to meals table
DROP TRIGGER IF EXISTS trg_fill_meal_date_tz ON meals;
CREATE TRIGGER trg_fill_meal_date_tz
  BEFORE INSERT OR UPDATE ON meals
  FOR EACH ROW 
  EXECUTE FUNCTION fill_meal_date_tz();

-- Apply same logic to other tables with timezone-sensitive data
CREATE OR REPLACE FUNCTION fill_user_fluids_date_tz()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date IS NULL THEN
    NEW.date := (NEW.consumed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')::date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fill_fluids_date_tz ON user_fluids;
CREATE TRIGGER trg_fill_fluids_date_tz
  BEFORE INSERT OR UPDATE ON user_fluids
  FOR EACH ROW 
  EXECUTE FUNCTION fill_user_fluids_date_tz();