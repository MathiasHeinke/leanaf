-- Drop the partial index (doesn't work with ON CONFLICT)
DROP INDEX IF EXISTS uq_user_supplements_user_supplement;

-- Create a proper UNIQUE CONSTRAINT that Supabase can use for upsert
-- First, clean up any duplicate entries (keep the most recent one)
DELETE FROM user_supplements a
USING user_supplements b
WHERE a.supplement_id IS NOT NULL 
  AND b.supplement_id IS NOT NULL
  AND a.user_id = b.user_id 
  AND a.supplement_id = b.supplement_id 
  AND a.created_at < b.created_at;

-- Now add the unique constraint
ALTER TABLE user_supplements 
ADD CONSTRAINT uq_user_supplements_user_supplement_id 
UNIQUE (user_id, supplement_id);