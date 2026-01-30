-- Consolidate legacy bedtime timing values to evening
UPDATE user_supplements 
SET preferred_timing = 'evening' 
WHERE preferred_timing IN ('bedtime', 'before_bed', 'before_sleep');