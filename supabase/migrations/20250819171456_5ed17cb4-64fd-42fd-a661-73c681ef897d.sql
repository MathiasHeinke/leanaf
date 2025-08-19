-- Create exercise_sessions table required by ActiveWorkoutPlan
CREATE TABLE IF NOT EXISTS public.exercise_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_name text NOT NULL,
  workout_plan_id uuid,
  date date NOT NULL DEFAULT CURRENT_DATE,
  start_time timestamptz,
  end_time timestamptz,
  duration_minutes integer,
  workout_type text DEFAULT 'strength',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.exercise_sessions ENABLE ROW LEVEL SECURITY;

-- Policies: Users can manage their own sessions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exercise_sessions' AND policyname = 'Users can view their own exercise sessions'
  ) THEN
    CREATE POLICY "Users can view their own exercise sessions"
    ON public.exercise_sessions FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exercise_sessions' AND policyname = 'Users can insert their own exercise sessions'
  ) THEN
    CREATE POLICY "Users can insert their own exercise sessions"
    ON public.exercise_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exercise_sessions' AND policyname = 'Users can update their own exercise sessions'
  ) THEN
    CREATE POLICY "Users can update their own exercise sessions"
    ON public.exercise_sessions FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exercise_sessions' AND policyname = 'Users can delete their own exercise sessions'
  ) THEN
    CREATE POLICY "Users can delete their own exercise sessions"
    ON public.exercise_sessions FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger for updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_exercise_sessions_updated_at'
  ) THEN
    CREATE TRIGGER trg_exercise_sessions_updated_at
    BEFORE UPDATE ON public.exercise_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_user_date ON public.exercise_sessions (user_id, date);
