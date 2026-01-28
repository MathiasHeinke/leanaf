-- ARES Response Intelligence System
-- Tabelle für User Topic History mit Expertise-Tracking

CREATE TABLE public.user_topic_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  mention_count INTEGER DEFAULT 1,
  total_chars_exchanged INTEGER DEFAULT 0,
  last_deep_dive_at TIMESTAMPTZ,
  expert_level TEXT DEFAULT 'novice' 
    CHECK (expert_level IN ('novice', 'intermediate', 'expert')),
  first_mentioned_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, topic)
);

-- Schneller Lookup Index
CREATE INDEX idx_user_topic_lookup ON user_topic_history(user_id, topic);
CREATE INDEX idx_user_topic_user ON user_topic_history(user_id);

-- Enable RLS
ALTER TABLE user_topic_history ENABLE ROW LEVEL SECURITY;

-- Users können ihre eigene History lesen
CREATE POLICY "Users can view own topic history" ON user_topic_history
  FOR SELECT USING (auth.uid() = user_id);

-- Service role hat vollen Zugriff (für Edge Functions)
CREATE POLICY "Service role full access" ON user_topic_history
  FOR ALL USING (auth.role() = 'service_role');

-- RPC Funktion zum Inkrementieren der Topic Stats
CREATE OR REPLACE FUNCTION public.increment_topic_stats(
  p_user_id UUID,
  p_topic TEXT,
  p_chars INTEGER,
  p_is_deep_dive BOOLEAN DEFAULT FALSE
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count INTEGER;
  v_new_level TEXT;
BEGIN
  -- Upsert: Einfügen oder Aktualisieren
  INSERT INTO user_topic_history (user_id, topic, mention_count, total_chars_exchanged, last_deep_dive_at)
  VALUES (
    p_user_id, 
    p_topic, 
    1, 
    p_chars, 
    CASE WHEN p_is_deep_dive THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id, topic) DO UPDATE SET
    mention_count = user_topic_history.mention_count + 1,
    total_chars_exchanged = user_topic_history.total_chars_exchanged + p_chars,
    last_deep_dive_at = CASE 
      WHEN p_is_deep_dive THEN now() 
      ELSE user_topic_history.last_deep_dive_at 
    END,
    updated_at = now();
  
  -- Hole aktuellen Count für Level-Berechnung
  SELECT mention_count INTO v_current_count 
  FROM user_topic_history 
  WHERE user_id = p_user_id AND topic = p_topic;
  
  -- Level Upgrade Logic: 8+ = intermediate, 20+ = expert
  v_new_level := CASE
    WHEN v_current_count >= 20 THEN 'expert'
    WHEN v_current_count >= 8 THEN 'intermediate'
    ELSE 'novice'
  END;
  
  -- Update Level
  UPDATE user_topic_history 
  SET expert_level = v_new_level 
  WHERE user_id = p_user_id AND topic = p_topic;
END;
$$;

-- Berechtigungen für RPC
GRANT EXECUTE ON FUNCTION public.increment_topic_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_topic_stats TO service_role;