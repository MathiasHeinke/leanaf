-- Add date columns where missing and backfill data
DO $$
DECLARE
  _tbl text;
  _src text;
  _pairs text[][] := ARRAY[
    ARRAY['meals', 'created_at'],
    ARRAY['exercise_sets', 'created_at'],
    ARRAY['supplement_intake_log', 'created_at']
  ];
  _pair text[];
BEGIN
  FOREACH _pair SLICE 1 IN ARRAY _pairs
  LOOP
    _tbl := _pair[1];
    _src := _pair[2];
    
    -- Add column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = _tbl AND column_name = 'date'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN date date;', _tbl);
      RAISE NOTICE '➕ added date column on %', _tbl;
    END IF;

    -- Backfill existing data
    EXECUTE format(
      'UPDATE %I SET date = (%I AT TIME ZONE ''UTC'')::date WHERE date IS NULL AND %I IS NOT NULL;',
      _tbl, _src, _src
    );
    RAISE NOTICE '🔄 backfilled date column on %', _tbl;
  END LOOP;
END $$;

-- Create the auto-fill trigger function
CREATE OR REPLACE FUNCTION _autofill_date() RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
BEGIN
  IF NEW.date IS NULL THEN
    CASE TG_TABLE_NAME
      WHEN 'meals'                THEN NEW.date := (NEW.created_at   AT TIME ZONE 'UTC')::date;
      WHEN 'user_fluids'          THEN NEW.date := (NEW.consumed_at  AT TIME ZONE 'UTC')::date;
      WHEN 'exercise_sets'        THEN NEW.date := (NEW.created_at   AT TIME ZONE 'UTC')::date;
      WHEN 'exercise_sessions'    THEN NEW.date := (COALESCE(NEW.start_time, NEW.created_at) AT TIME ZONE 'UTC')::date;
      WHEN 'sleep_tracking'       THEN NEW.date := (NEW.created_at   AT TIME ZONE 'UTC')::date;
      WHEN 'supplement_intake_log'THEN NEW.date := (NEW.created_at   AT TIME ZONE 'UTC')::date;
      WHEN 'weight_history'       THEN NEW.date := (NEW.created_at   AT TIME ZONE 'UTC')::date;
      WHEN 'body_measurements'    THEN NEW.date := (NEW.created_at   AT TIME ZONE 'UTC')::date;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers to all relevant tables
DO $$
DECLARE
  _tables text[] := ARRAY[
    'meals', 'user_fluids', 'exercise_sets', 'exercise_sessions',
    'sleep_tracking', 'supplement_intake_log', 'weight_history', 'body_measurements'
  ];
  _tbl text;
BEGIN
  FOREACH _tbl IN ARRAY _tables
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS autofill_date_trigger ON %I;
      CREATE TRIGGER autofill_date_trigger
      BEFORE INSERT OR UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION _autofill_date();',
      _tbl, _tbl
    );
    RAISE NOTICE '🔧 attached trigger to %', _tbl;
  END LOOP;
END $$;