-- Fix user_supplements dosage constraint
-- Make dosage nullable since it's being handled separately from dose
ALTER TABLE user_supplements ALTER COLUMN dosage DROP NOT NULL;

-- Add proper default for dosage when it's missing
ALTER TABLE user_supplements ALTER COLUMN dosage SET DEFAULT NULL;