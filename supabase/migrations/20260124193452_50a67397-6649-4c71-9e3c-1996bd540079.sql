-- Füge training_type Feld zu training_sessions hinzu für ARES 3-Säulen
ALTER TABLE training_sessions 
ADD COLUMN IF NOT EXISTS training_type TEXT;

-- Kommentar für Klarheit
COMMENT ON COLUMN training_sessions.training_type IS 
  'ARES 3-Säulen: rpt (Krafttraining), zone2 (Ausdauer), vo2max (HIIT)';

-- Index für Abfragen nach Typ
CREATE INDEX IF NOT EXISTS idx_training_sessions_type 
ON training_sessions(user_id, training_type);

-- Migriere bestehende Daten basierend auf split_type
UPDATE training_sessions 
SET training_type = 'rpt'
WHERE training_type IS NULL;