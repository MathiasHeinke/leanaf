-- Fix existing user_supplements with wrong timing based on timing_constraint
UPDATE user_supplements us
SET preferred_timing = CASE 
  WHEN sd.timing_constraint = 'bedtime' THEN 'bedtime'
  WHEN sd.timing_constraint = 'fasted' THEN 'morning'
  WHEN sd.timing_constraint IN ('with_food', 'with_fats') THEN 'noon'
  WHEN sd.timing_constraint = 'pre_workout' THEN 'pre_workout'
  WHEN sd.timing_constraint = 'post_workout' THEN 'post_workout'
  ELSE us.preferred_timing
END
FROM supplement_database sd
WHERE us.supplement_id = sd.id
  AND sd.timing_constraint IS NOT NULL
  AND sd.timing_constraint != 'any'
  AND us.preferred_timing = 'morning';