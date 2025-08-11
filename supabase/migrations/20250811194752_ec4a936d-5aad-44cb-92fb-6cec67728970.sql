-- 1) Status-Typ
DO $$ BEGIN
  CREATE TYPE client_event_status AS ENUM ('RECEIVED','FINAL','CANCELLED','STALE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Idempotenz-Tabelle
CREATE TABLE IF NOT EXISTS client_events (
  user_id uuid NOT NULL,
  client_event_id text NOT NULL,
  status client_event_status NOT NULL DEFAULT 'RECEIVED',
  last_reply jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, client_event_id)
);

CREATE INDEX IF NOT EXISTS idx_client_events_created_at ON client_events(created_at);

-- 3) Enable RLS
ALTER TABLE client_events ENABLE ROW LEVEL SECURITY;

-- 4) Policies
CREATE POLICY "Users can manage their own client events" 
ON client_events 
FOR ALL 
USING (auth.uid() = user_id);

-- 5) Cleanup function for old events (7 days)
CREATE OR REPLACE FUNCTION cleanup_old_client_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM client_events 
  WHERE created_at < now() - interval '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;