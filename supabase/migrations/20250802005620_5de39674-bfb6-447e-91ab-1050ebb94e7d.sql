-- Create quick_workouts table if it doesn't exist
CREATE TABLE IF NOT EXISTS quick_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  steps INTEGER,
  distance_km NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE quick_workouts ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own quick workouts
CREATE POLICY "Users can read own quick_workouts"
  ON quick_workouts FOR SELECT
  USING (user_id = auth.uid());

-- Create policy for users to insert their own quick workouts
CREATE POLICY "Users can insert own quick_workouts"
  ON quick_workouts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create policy for users to update their own quick workouts
CREATE POLICY "Users can update own quick_workouts"
  ON quick_workouts FOR UPDATE
  USING (user_id = auth.uid());

-- Create policy for users to delete their own quick workouts
CREATE POLICY "Users can delete own quick_workouts"
  ON quick_workouts FOR DELETE
  USING (user_id = auth.uid());

-- Add trigger for auto-date
CREATE TRIGGER _autofill_date_quick_workouts
  BEFORE INSERT ON quick_workouts
  FOR EACH ROW
  EXECUTE FUNCTION _autofill_date();