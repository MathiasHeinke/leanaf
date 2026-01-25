-- Phase 6: ARES 3.0 Gamification Enhancement

-- 1. Extend badges table with new columns
ALTER TABLE badges ADD COLUMN IF NOT EXISTS xp_bonus INTEGER DEFAULT 0;
ALTER TABLE badges ADD COLUMN IF NOT EXISTS rarity TEXT DEFAULT 'common';
ALTER TABLE badges ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- 2. Create daily_quests table
CREATE TABLE IF NOT EXISTS daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quest_type TEXT NOT NULL,
  quest_title TEXT NOT NULL,
  quest_description TEXT,
  target INTEGER NOT NULL DEFAULT 1,
  progress INTEGER DEFAULT 0,
  xp_reward INTEGER NOT NULL DEFAULT 10,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, quest_date, quest_type)
);

-- 3. Create ares_interaction_stats table
CREATE TABLE IF NOT EXISTS ares_interaction_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  interaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  questions_asked INTEGER DEFAULT 0,
  tools_used JSONB DEFAULT '{}',
  topics_discussed TEXT[] DEFAULT '{}',
  xp_earned INTEGER DEFAULT 0,
  streak_multiplier NUMERIC(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, interaction_date)
);

-- 4. Enable RLS on new tables
ALTER TABLE daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ares_interaction_stats ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for daily_quests
CREATE POLICY "Users can view own quests" ON daily_quests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quests" ON daily_quests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quests" ON daily_quests
  FOR UPDATE USING (auth.uid() = user_id);

-- 6. RLS Policies for ares_interaction_stats
CREATE POLICY "Users can view own stats" ON ares_interaction_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON ares_interaction_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON ares_interaction_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- 7. Index for performance
CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date ON daily_quests(user_id, quest_date);
CREATE INDEX IF NOT EXISTS idx_ares_stats_user_date ON ares_interaction_stats(user_id, interaction_date);
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_rarity ON badges(rarity);