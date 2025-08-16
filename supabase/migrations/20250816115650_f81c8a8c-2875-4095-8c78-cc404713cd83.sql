-- 1. Eindeutigkeit sicherstellen
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- 2. updated_at automatisch pflegen
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- 3. Auto-Anlage des Profils bei Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Typ-Sauberkeit - Fix enum conversion by removing default first
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'training_goal') THEN
    CREATE TYPE public.training_goal AS ENUM ('hypertrophy','strength','endurance','general');
  END IF;
END$$;

-- Remove default, convert type, then add default back
ALTER TABLE public.profiles ALTER COLUMN goal DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN goal TYPE public.training_goal USING goal::public.training_goal;
ALTER TABLE public.profiles ALTER COLUMN goal SET DEFAULT 'general'::public.training_goal;

-- 5. user_tracking_preferences RLS hardening
ALTER TABLE public.user_tracking_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tracking preferences" ON public.user_tracking_preferences;
DROP POLICY IF EXISTS "Users can create their own tracking preferences" ON public.user_tracking_preferences;
DROP POLICY IF EXISTS "Users can update their own tracking preferences" ON public.user_tracking_preferences;

CREATE POLICY "select own tracking preferences" ON public.user_tracking_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert own tracking preferences" ON public.user_tracking_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own tracking preferences" ON public.user_tracking_preferences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);