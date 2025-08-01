-- Add text_generated flag to daily_summaries if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_summaries' AND column_name = 'text_generated'
  ) THEN
    ALTER TABLE daily_summaries ADD COLUMN text_generated boolean DEFAULT false;
  END IF;
END $$;