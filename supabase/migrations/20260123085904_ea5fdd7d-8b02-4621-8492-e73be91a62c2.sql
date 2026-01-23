-- User Insights Tabelle
-- Speichert automatisch extrahierte Erkenntnisse über den User
CREATE TABLE IF NOT EXISTS user_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Kategorisierung
  category text NOT NULL, -- z.B. 'körper', 'gesundheit', 'ernährung', 'schlaf', 'stress', 'emotionen', 'gewohnheiten', 'wissen', 'ziele', 'muster'
  subcategory text, -- Optional: Feinere Kategorisierung
  
  -- Der Insight selbst
  insight text NOT NULL, -- z.B. "Trinkt 5-6 Tassen Kaffee pro Tag"
  raw_quote text, -- Original-Zitat vom User
  
  -- Metadaten
  source text NOT NULL, -- 'chat', 'journal', 'tracking', 'onboarding'
  source_id text, -- ID der Quelle (z.B. conversation_id)
  confidence numeric DEFAULT 0.8, -- 0-1, wie sicher sind wir
  
  -- Relevanz
  importance text DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  is_active boolean DEFAULT true, -- Kann deaktiviert werden wenn veraltet
  
  -- Verknüpfungen
  related_insights uuid[], -- IDs von verwandten Insights
  
  -- Timestamps
  extracted_at timestamptz DEFAULT now(),
  last_relevant_at timestamptz DEFAULT now(), -- Wann war es zuletzt relevant
  expires_at timestamptz, -- Optional: Wann ist es veraltet
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_user_insights_user_id ON user_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_user_insights_category ON user_insights(category);
CREATE INDEX IF NOT EXISTS idx_user_insights_importance ON user_insights(importance);
CREATE INDEX IF NOT EXISTS idx_user_insights_is_active ON user_insights(is_active);

-- RLS aktivieren
ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"
  ON user_insights FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage insights"
  ON user_insights FOR ALL USING (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
  );

-- Erkannte Muster Tabelle
CREATE TABLE IF NOT EXISTS user_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  pattern_type text NOT NULL, -- 'correlation', 'contradiction', 'trend'
  description text NOT NULL,
  
  -- Verknüpfte Insights
  insight_ids uuid[] NOT NULL,
  
  -- Metadaten
  confidence numeric DEFAULT 0.7,
  suggestion text, -- Was der Coach damit machen soll
  
  is_addressed boolean DEFAULT false, -- Wurde es schon angesprochen?
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_user_patterns_user_id ON user_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_user_patterns_type ON user_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_user_patterns_addressed ON user_patterns(is_addressed);

-- RLS
ALTER TABLE user_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patterns"
  ON user_patterns FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage patterns"
  ON user_patterns FOR ALL USING (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
  );

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_user_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_insights_updated_at
  BEFORE UPDATE ON user_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_user_insights_updated_at();

CREATE TRIGGER user_patterns_updated_at
  BEFORE UPDATE ON user_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_user_insights_updated_at();