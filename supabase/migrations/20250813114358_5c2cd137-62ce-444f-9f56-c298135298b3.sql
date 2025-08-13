-- Phase 1: Supplement Data Standardization Migration

-- Function to normalize timing arrays (remove double nesting and duplicates)
CREATE OR REPLACE FUNCTION normalize_timing_array(timing_arr text[])
RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
  result text[] := '{}';
  item text;
  clean_item text;
BEGIN
  -- Handle null or empty arrays
  IF timing_arr IS NULL OR array_length(timing_arr, 1) IS NULL THEN
    RETURN '{}';
  END IF;
  
  -- Process each item in the array
  FOREACH item IN ARRAY timing_arr
  LOOP
    -- Remove any extra brackets, quotes, and whitespace
    clean_item := trim(both '"' from trim(item));
    clean_item := trim(both '[' from clean_item);
    clean_item := trim(both ']' from clean_item);
    clean_item := trim(clean_item);
    
    -- Skip empty items
    IF clean_item != '' AND clean_item IS NOT NULL THEN
      -- Add to result if not already present
      IF NOT (clean_item = ANY(result)) THEN
        result := array_append(result, clean_item);
      END IF;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Function to map legacy timings to standard timings
CREATE OR REPLACE FUNCTION map_legacy_timing(timing text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  CASE timing
    WHEN 'empty_stomach' THEN RETURN 'morning';
    WHEN 'between_meals' THEN RETURN 'noon';
    WHEN 'with_food' THEN RETURN 'with_meals';
    WHEN 'before_sleep' THEN RETURN 'before_bed';
    WHEN 'workout' THEN RETURN 'pre_workout';
    WHEN 'after_workout' THEN RETURN 'post_workout';
    ELSE RETURN timing;
  END CASE;
END;
$$;

-- Function to clean markdown from text
CREATE OR REPLACE FUNCTION clean_markdown(input_text text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove common markdown patterns
  input_text := regexp_replace(input_text, '\*\*(.*?)\*\*', '\1', 'g'); -- **bold**
  input_text := regexp_replace(input_text, '\*(.*?)\*', '\1', 'g');     -- *italic*
  input_text := regexp_replace(input_text, '_{2}(.*?)_{2}', '\1', 'g'); -- __underline__
  input_text := regexp_replace(input_text, '_(.*?)_', '\1', 'g');       -- _italic_
  input_text := regexp_replace(input_text, '`(.*?)`', '\1', 'g');       -- `code`
  
  -- Clean extra whitespace
  input_text := regexp_replace(input_text, '\s+', ' ', 'g');
  input_text := trim(input_text);
  
  RETURN input_text;
END;
$$;

-- Update user_supplements table with cleaned data
UPDATE user_supplements SET
  timing = (
    SELECT array_agg(map_legacy_timing(unnest_timing))
    FROM (
      SELECT unnest(normalize_timing_array(timing)) as unnest_timing
    ) normalized
  ),
  custom_name = clean_markdown(custom_name),
  name = clean_markdown(name),
  dosage = clean_markdown(dosage),
  notes = clean_markdown(notes)
WHERE timing IS NOT NULL OR custom_name IS NOT NULL OR name IS NOT NULL OR dosage IS NOT NULL OR notes IS NOT NULL;

-- Ensure supplements have valid names (fallback logic)
UPDATE user_supplements 
SET name = COALESCE(
  NULLIF(clean_markdown(custom_name), ''),
  NULLIF(clean_markdown(name), ''),
  'Supplement'
)
WHERE (name IS NULL OR name = '') AND (custom_name IS NULL OR custom_name = '');

-- Clean up empty timing arrays
UPDATE user_supplements 
SET timing = ARRAY['morning'] 
WHERE timing IS NULL OR timing = '{}' OR array_length(timing, 1) IS NULL;

-- Add constraint to ensure timing array is not empty
ALTER TABLE user_supplements 
ADD CONSTRAINT check_timing_not_empty 
CHECK (timing IS NOT NULL AND array_length(timing, 1) > 0);

-- Create index for better performance on timing queries
CREATE INDEX IF NOT EXISTS idx_user_supplements_timing_gin ON user_supplements USING GIN(timing);

-- Drop the helper functions as they're no longer needed
DROP FUNCTION IF EXISTS normalize_timing_array(text[]);
DROP FUNCTION IF EXISTS map_legacy_timing(text);
DROP FUNCTION IF EXISTS clean_markdown(text);