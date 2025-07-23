-- Clean up duplicate badges and add unique constraint to prevent future duplicates

-- First, create a temporary backup of current badges
CREATE TABLE IF NOT EXISTS badges_backup AS SELECT * FROM badges;

-- Remove duplicate badges, keeping only the latest one for each user+type+metadata combination
WITH badge_dedup AS (
  SELECT id, 
    ROW_NUMBER() OVER (
      PARTITION BY user_id, badge_type, 
      COALESCE(metadata->>'level', ''), 
      COALESCE(metadata->>'milestone', ''),
      COALESCE(metadata->>'streak_type', '')
      ORDER BY earned_at DESC
    ) as rn
  FROM badges
)
DELETE FROM badges 
WHERE id IN (
  SELECT id FROM badge_dedup WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
-- For level achievements: user_id + badge_type + level
CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_unique_level 
ON badges (user_id, badge_type, (metadata->>'level'))
WHERE badge_type = 'level_achievement';

-- For streak badges: user_id + badge_type + streak_type + milestone
CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_unique_streak 
ON badges (user_id, badge_type, (metadata->>'streak_type'), (metadata->>'milestone'))
WHERE badge_type = 'streak_badge';

-- For commitment badges: user_id + badge_type + milestone
CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_unique_commitment 
ON badges (user_id, badge_type, (metadata->>'milestone'))
WHERE badge_type = 'commitment_badge';

-- For special achievements: user_id + badge_name (since names are unique for special badges)
CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_unique_special 
ON badges (user_id, badge_name)
WHERE badge_type = 'special_achievement';

-- Add a comment to track this migration
COMMENT ON TABLE badges IS 'Cleaned up duplicates and added unique constraints on 2025-01-23';