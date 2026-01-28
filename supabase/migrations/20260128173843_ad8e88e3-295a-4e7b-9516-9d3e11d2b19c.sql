-- Create unique index for upsert to work correctly
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_supplements_user_supplement 
ON user_supplements (user_id, supplement_id) 
WHERE supplement_id IS NOT NULL;