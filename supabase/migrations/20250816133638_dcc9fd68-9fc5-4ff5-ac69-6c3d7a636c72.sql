-- RLS & Indexes for dashboard tables

-- USER_FLUIDS
ALTER TABLE public.user_fluids ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "uf_select_own" ON public.user_fluids
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "uf_insert_own" ON public.user_fluids
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "uf_update_own" ON public.user_fluids
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_fluids_user_day ON public.user_fluids(user_id, date);

-- WORKOUTS (already has RLS, add missing policies)
CREATE POLICY IF NOT EXISTS "w_delete_own" ON public.workouts
  FOR DELETE USING (auth.uid() = user_id);

-- DAILY_GOALS (create table if not exists)
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
CREATE POLICY IF NOT EXISTS "dg_select_own" ON public.daily_goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "dg_upsert_own" ON public.daily_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "dg_update_own" ON public.daily_goals
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_daily_goals_user_day ON public.daily_goals(user_id, goal_date);

-- MEALS (already has RLS, ensure complete policies)
CREATE POLICY IF NOT EXISTS "m_delete_own" ON public.meals
  FOR DELETE USING (auth.uid() = user_id);

-- CONVERSATIONS & MESSAGES (ensure RLS)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "c_select_own" ON public.conversations 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "c_insert_own" ON public.conversations 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "msg_select_own" ON public.messages 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "msg_insert_own" ON public.messages 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_time ON public.messages(conversation_id, created_at);

-- Admin flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
UPDATE public.profiles SET is_admin = true WHERE user_id = '84b0664f-0934-49ce-9c35-c99546b792bf';