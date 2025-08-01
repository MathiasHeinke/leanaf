-- ╭───────────────────────────╮
-- │ 0.  CONFIG SECTION        │
-- ╰───────────────────────────╯
-- (table, timestamp-source) pairs that need a date column
WITH wanted(tbl, ts_col) AS (
  VALUES
    ('meals'               , 'created_at'),
    ('user_fluids'         , 'consumed_at'),
    ('exercise_sets'       , 'created_at'),
    ('exercise_sessions'   , 'start_time'),   -- already has date but we keep rule consistent
    ('sleep_tracking'      , 'created_at'),
    ('supplement_intake_log','created_at'),
    ('weight_history'      , 'created_at'),
    ('body_measurements'   , 'created_at')
)

-- ╭───────────────────────────╮
-- │ 1.  ADD COLUMN & BACKFILL │
-- ╰───────────────────────────╯
SELECT format(
  $$DO $$
  DECLARE
    _tbl text := %L;
    _src text := %L;
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = _tbl AND column_name = 'date'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN date date;', _tbl);
      RAISE NOTICE '➕ added date column on %', _tbl;
    END IF;

    -- back-fill rows that are still NULL
    EXECUTE format(
      'UPDATE %I
         SET date = (%I AT TIME ZONE ''UTC'')::date
       WHERE date IS NULL
         AND %I IS NOT NULL;',
      _tbl, _src, _src
    );

  END$$;
$$, tbl, ts_col)
FROM wanted;

-- ╭───────────────────────────╮
-- │ 2.  GENERIC TRIGGER FN    │
-- ╰───────────────────────────╯
CREATE OR REPLACE FUNCTION _autofill_date() RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
BEGIN
  IF NEW.date IS NULL THEN
    -- decide which timestamp to cast, based on table name
    CASE TG_TABLE_NAME
      WHEN 'meals'                THEN NEW.date := (NEW.created_at   AT TIME ZONE 'UTC')::date;
      WHEN 'user_fluids'          THEN NEW.date := (NEW.consumed_at  AT TIME ZONE 'UTC')::date;
      WHEN 'exercise_sets'        THEN NEW.date := (NEW.created_at   AT TIME ZONE 'UTC')::date;
      WHEN 'exercise_sessions'    THEN NEW.date := (COALESCE(NEW.start_time, NOW()) AT TIME ZONE 'UTC')::date;
      WHEN 'sleep_tracking'       THEN NEW.date := (COALESCE(NEW.created_at, NOW()) AT TIME ZONE 'UTC')::date;
      WHEN 'supplement_intake_log'THEN NEW.date := (NEW.created_at   AT TIME ZONE 'UTC')::date;
      WHEN 'weight_history'       THEN NEW.date := (NEW.created_at   AT TIME ZONE 'UTC')::date;
      WHEN 'body_measurements'    THEN NEW.date := (NEW.created_at   AT TIME ZONE 'UTC')::date;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$;

-- ╭───────────────────────────╮
-- │ 3.  ATTACH TRIGGER        │
-- ╰───────────────────────────╯
DO
$$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tbl FROM (
      VALUES
        ('meals'),
        ('user_fluids'),
        ('exercise_sets'),
        ('exercise_sessions'),
        ('sleep_tracking'),
        ('supplement_intake_log'),
        ('weight_history'),
        ('body_measurements')
    ) AS t(tbl)
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS autofill_date_trigger ON %I;
      CREATE TRIGGER autofill_date_trigger
      BEFORE INSERT OR UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION _autofill_date();',
      r.tbl, r.tbl
    );
  END LOOP;
END;
$$;