-- Add RLS policies for dashboard tables to fix empty data issues

-- Enable RLS and create policies for user_fluids table
ALTER TABLE public.user_fluids ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Drop existing policies if they exist to avoid conflicts
  DROP POLICY IF EXISTS "Users can view their own fluids" ON public.user_fluids;
  DROP POLICY IF EXISTS "Users can create their own fluids" ON public.user_fluids;
  DROP POLICY IF EXISTS "Users can update their own fluids" ON public.user_fluids;
  
  -- Create new policies
  CREATE POLICY "Users can view their own fluids" ON public.user_fluids
    FOR SELECT USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can create their own fluids" ON public.user_fluids
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  
  CREATE POLICY "Users can update their own fluids" ON public.user_fluids
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
END$$;

-- Enable RLS and create policies for monthly_challenges table (daily goals)
ALTER TABLE public.monthly_challenges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own challenges" ON public.monthly_challenges;
  DROP POLICY IF EXISTS "Users can create their own challenges" ON public.monthly_challenges;
  DROP POLICY IF EXISTS "Users can update their own challenges" ON public.monthly_challenges;
  
  -- Create new policies
  CREATE POLICY "Users can view their own challenges" ON public.monthly_challenges
    FOR SELECT USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can create their own challenges" ON public.monthly_challenges
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  
  CREATE POLICY "Users can update their own challenges" ON public.monthly_challenges
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
END$$;

-- Verify and update RLS policies for existing tables that should have them
-- workouts table already has RLS enabled, just verify policies exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workouts' AND policyname = 'Authenticated users can manage their own workouts'
  ) THEN
    CREATE POLICY "Authenticated users can manage their own workouts" ON public.workouts
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- meals table already has RLS enabled, just verify policies exist  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meals' AND policyname = 'Authenticated users can manage their own meals'
  ) THEN
    CREATE POLICY "Authenticated users can manage their own meals" ON public.meals
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- daily_summaries table already has RLS enabled, just verify policies exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_summaries' AND policyname = 'Authenticated users can manage their own daily summaries'
  ) THEN
    CREATE POLICY "Authenticated users can manage their own daily summaries" ON public.daily_summaries
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;