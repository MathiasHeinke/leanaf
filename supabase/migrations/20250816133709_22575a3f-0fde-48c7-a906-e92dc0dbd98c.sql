-- RLS & Indexes for dashboard tables (fixed syntax)

-- USER_FLUIDS
ALTER TABLE public.user_fluids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uf_select_own" ON public.user_fluids;
CREATE POLICY "uf_select_own" ON public.user_fluids
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "uf_insert_own" ON public.user_fluids;  
CREATE POLICY "uf_insert_own" ON public.user_fluids
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "uf_update_own" ON public.user_fluids;
CREATE POLICY "uf_update_own" ON public.user_fluids
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_fluids_user_day ON public.user_fluids(user_id, date);

-- WORKOUTS (add missing delete policy)
DROP POLICY IF EXISTS "w_delete_own" ON public.workouts;
CREATE POLICY "w_delete_own" ON public.workouts
  FOR DELETE USING (auth.uid() = user_id);

-- DAILY_GOALS (create table and policies)
CREATE TABLE IF NOT EXISTS public.daily_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  goal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  fluid_goal_ml INTEGER DEFAULT 2500,
  steps_goal INTEGER DEFAULT 10000,
  calories_goal INTEGER DEFAULT 2000,
  protein_goal INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, goal_date)
);

ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dg_select_own" ON public.daily_goals;
CREATE POLICY "dg_select_own" ON public.daily_goals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "dg_upsert_own" ON public.daily_goals;
CREATE POLICY "dg_upsert_own" ON public.daily_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "dg_update_own" ON public.daily_goals;
CREATE POLICY "dg_update_own" ON public.daily_goals
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_goals_user_day ON public.daily_goals(user_id, goal_date);

-- MEALS (add missing delete policy)
DROP POLICY IF EXISTS "m_delete_own" ON public.meals;
CREATE POLICY "m_delete_own" ON public.meals
  FOR DELETE USING (auth.uid() = user_id);

-- Admin flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
UPDATE public.profiles SET is_admin = true WHERE user_id = '84b0664f-0934-49ce-9c35-c99546b792bf';