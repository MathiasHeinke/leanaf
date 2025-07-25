-- Step 1: Remove duplicate badges (keep only the oldest for each user/badge combination)
DELETE FROM badges 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, badge_type, badge_name) id
  FROM badges 
  ORDER BY user_id, badge_type, badge_name, earned_at ASC
);

-- Step 2: Add UNIQUE constraint to prevent future duplicates
ALTER TABLE badges 
ADD CONSTRAINT badges_user_badge_unique 
UNIQUE (user_id, badge_type, badge_name);

-- Step 3: Create function for atomic badge awarding
CREATE OR REPLACE FUNCTION award_badge_atomically(
  p_user_id UUID,
  p_badge_type TEXT,
  p_badge_name TEXT,
  p_badge_description TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO badges (user_id, badge_type, badge_name, badge_description, metadata)
  VALUES (p_user_id, p_badge_type, p_badge_name, p_badge_description, p_metadata)
  ON CONFLICT (user_id, badge_type, badge_name) DO NOTHING;
  
  -- Return true if a new badge was inserted, false if it already existed
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;