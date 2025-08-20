-- Phase 4: Feature Flags & Event Telemetry

-- Mail-based feature flags
CREATE TABLE IF NOT EXISTS ares_feature_flags (
  id BIGSERIAL PRIMARY KEY,
  flag TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  email TEXT,
  email_domain TEXT,
  role TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS ares_feature_flags_flag_idx ON ares_feature_flags(flag);
CREATE INDEX IF NOT EXISTS ares_feature_flags_email_idx ON ares_feature_flags(email);
CREATE INDEX IF NOT EXISTS ares_feature_flags_domain_idx ON ares_feature_flags(email_domain);

-- Enable RLS
ALTER TABLE ares_feature_flags ENABLE ROW LEVEL SECURITY;

-- Only service role can access directly
CREATE POLICY deny_all_flags ON ares_feature_flags FOR ALL USING (false);

-- Event telemetry table
CREATE TABLE IF NOT EXISTS ares_events (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ DEFAULT now(),
  user_id UUID,
  trace_id TEXT,
  component TEXT NOT NULL,
  event TEXT NOT NULL,
  meta JSONB
);

-- Indexes for telemetry queries
CREATE INDEX IF NOT EXISTS ares_events_trace_idx ON ares_events(trace_id, ts DESC);
CREATE INDEX IF NOT EXISTS ares_events_user_idx ON ares_events(user_id, ts DESC);

-- Enable RLS
ALTER TABLE ares_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access directly  
CREATE POLICY deny_all_events ON ares_events FOR ALL USING (false);

-- Insert some initial feature flags
INSERT INTO ares_feature_flags (flag, enabled, note) VALUES 
  ('ares.debug', true, 'Debug panel access'),
  ('ares.chat.beta', true, 'Beta chat features'),
  ('ares.telemetry', true, 'Event tracking enabled')
ON CONFLICT DO NOTHING;