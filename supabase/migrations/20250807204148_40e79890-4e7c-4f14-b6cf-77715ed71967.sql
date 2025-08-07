-- Patch existing user_credits schema to support monthly quotas for testers vs others
-- Ensure table exists
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining integer NOT NULL DEFAULT 0
);

-- Add required columns if missing
ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS monthly_quota integer NOT NULL DEFAULT 1000;
ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS last_reset_month date NOT NULL DEFAULT date_trunc('month', now());
ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS tester boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Ensure uniqueness on user_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_user_credits_user') THEN
    CREATE UNIQUE INDEX idx_user_credits_user ON public.user_credits(user_id);
  END IF;
END $$;

-- RLS policies (idempotent)
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_credits' AND policyname = 'Users can view own credits'
  ) THEN
    CREATE POLICY "Users can view own credits"
    ON public.user_credits
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_credits' AND policyname = 'Users can upsert their credits row'
  ) THEN
    CREATE POLICY "Users can upsert their credits row"
    ON public.user_credits
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_credits' AND policyname = 'Users can update own credits'
  ) THEN
    CREATE POLICY "Users can update own credits"
    ON public.user_credits
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create costs table (if not exists) and policies
CREATE TABLE IF NOT EXISTS public.ai_feature_costs (
  feature_type text PRIMARY KEY,
  cost integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_feature_costs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_feature_costs' AND policyname = 'Public can read ai_feature_costs'
  ) THEN
    CREATE POLICY "Public can read ai_feature_costs"
    ON public.ai_feature_costs
    FOR SELECT
    USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_feature_costs' AND policyname = 'Super admins manage ai_feature_costs'
  ) THEN
    CREATE POLICY "Super admins manage ai_feature_costs"
    ON public.ai_feature_costs
    FOR ALL
    USING (is_super_admin());
  END IF;
END $$;

-- Usage log table
CREATE TABLE IF NOT EXISTS public.ai_credits_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_type text NOT NULL,
  cost integer NOT NULL,
  credits_before integer NOT NULL,
  credits_after integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_credits_usage ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_credits_usage' AND policyname = 'Users can insert their own credits usage'
  ) THEN
    CREATE POLICY "Users can insert their own credits usage"
    ON public.ai_credits_usage
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_credits_usage' AND policyname = 'Users can view their own credits usage'
  ) THEN
    CREATE POLICY "Users can view their own credits usage"
    ON public.ai_credits_usage
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Seed costs
INSERT INTO public.ai_feature_costs (feature_type, cost)
VALUES
  ('meal_analysis', 10),
  ('meal_correction', 3),
  ('meal_leftovers', 5),
  ('coach_chat_msg', 5),
  ('coach_recipes', 20),
  ('daily_analysis', 10),
  ('supplement_recognition', 10),
  ('body_transform_image', 50),
  ('voice_transcription', 5)
ON CONFLICT (feature_type) DO UPDATE SET cost = EXCLUDED.cost, updated_at = now();

-- Ensure helper/status/consume functions
CREATE OR REPLACE FUNCTION public._ensure_user_credits()
RETURNS public.user_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_rec public.user_credits;
  v_is_tester boolean := false;
  v_current_month date := date_trunc('month', now());
BEGIN
  SELECT * INTO v_rec FROM public.user_credits WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    v_is_tester := EXISTS (
      SELECT 1 FROM (
        SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 50
      ) t WHERE t.id = auth.uid()
    );
    INSERT INTO public.user_credits (user_id, credits_remaining, monthly_quota, last_reset_month, tester)
    VALUES (auth.uid(), CASE WHEN v_is_tester THEN 5000 ELSE 1000 END, CASE WHEN v_is_tester THEN 5000 ELSE 1000 END, v_current_month, v_is_tester)
    RETURNING * INTO v_rec;
  END IF;

  IF v_rec.last_reset_month < v_current_month THEN
    UPDATE public.user_credits
    SET credits_remaining = monthly_quota,
        last_reset_month = v_current_month,
        updated_at = now()
    WHERE user_id = v_rec.user_id
    RETURNING * INTO v_rec;
  END IF;

  RETURN v_rec;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_credits_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_rec public.user_credits;
  v_current_month date := date_trunc('month', now());
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  v_rec := public._ensure_user_credits();
  RETURN jsonb_build_object(
    'user_id', v_rec.user_id,
    'credits_remaining', v_rec.credits_remaining,
    'monthly_quota', v_rec.monthly_quota,
    'tester', v_rec.tester,
    'last_reset_month', v_rec.last_reset_month,
    'current_month', v_current_month
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_credits_for_feature(p_feature_type text, p_deduct boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_rec public.user_credits;
  v_cost integer;
  v_before integer;
  v_after integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  v_rec := public._ensure_user_credits();
  v_before := v_rec.credits_remaining;
  SELECT cost INTO v_cost FROM public.ai_feature_costs WHERE feature_type = p_feature_type;
  IF v_cost IS NULL THEN
    RAISE EXCEPTION 'Unknown feature_type: %', p_feature_type;
  END IF;
  IF v_rec.credits_remaining < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'insufficient_credits',
      'feature_type', p_feature_type,
      'cost', v_cost,
      'credits_remaining', v_rec.credits_remaining
    );
  END IF;
  IF p_deduct THEN
    UPDATE public.user_credits
    SET credits_remaining = credits_remaining - v_cost,
        updated_at = now()
    WHERE user_id = v_rec.user_id
    RETURNING credits_remaining INTO v_after;
    INSERT INTO public.ai_credits_usage (user_id, feature_type, cost, credits_before, credits_after)
    VALUES (v_rec.user_id, p_feature_type, v_cost, v_before, v_after);
  ELSE
    v_after := v_before;
  END IF;
  RETURN jsonb_build_object(
    'success', true,
    'feature_type', p_feature_type,
    'cost', v_cost,
    'deducted', p_deduct,
    'credits_before', v_before,
    'credits_remaining', v_after
  );
END;
$$;

-- Trigger for future users
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_is_tester boolean := false;
  v_current_month date := date_trunc('month', now());
BEGIN
  v_is_tester := EXISTS (
    SELECT 1 FROM (
      SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 50
    ) t WHERE t.id = NEW.id
  );
  INSERT INTO public.user_credits (user_id, credits_remaining, monthly_quota, last_reset_month, tester)
  VALUES (NEW.id, CASE WHEN v_is_tester THEN 5000 ELSE 1000 END, CASE WHEN v_is_tester THEN 5000 ELSE 1000 END, v_current_month, v_is_tester)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_credits'
  ) THEN
    CREATE TRIGGER on_auth_user_created_credits
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_credits();
  END IF;
END $$;

-- Backfill values now that columns exist
-- First 50 users as testers (idempotent)
WITH first50 AS (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 50
)
UPDATE public.user_credits uc
SET tester = true,
    monthly_quota = 5000,
    credits_remaining = CASE WHEN uc.credits_remaining > 5000 THEN uc.credits_remaining ELSE 5000 END,
    updated_at = now()
FROM first50 f
WHERE uc.user_id = f.id;

-- Ensure others have at least baseline quota if row exists
UPDATE public.user_credits
SET monthly_quota = 1000,
    updated_at = now()
WHERE tester = false AND monthly_quota < 1000;

-- Create rows for users without a credits row yet
INSERT INTO public.user_credits (user_id, credits_remaining, monthly_quota, last_reset_month, tester)
SELECT id, 1000, 1000, date_trunc('month', now())::date, false
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_credits uc WHERE uc.user_id = u.id
);
