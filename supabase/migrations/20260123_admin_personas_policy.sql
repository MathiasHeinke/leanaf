-- Migration: Admin Policy for Coach Personas
-- Allows admins to update coach_personas

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Allow admins to update coach_personas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'coach_personas' 
    AND policyname = 'admin_personas_update'
  ) THEN
    CREATE POLICY admin_personas_update
      ON coach_personas
      FOR UPDATE
      TO authenticated
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Allow admins to insert coach_personas (for future use)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'coach_personas' 
    AND policyname = 'admin_personas_insert'
  ) THEN
    CREATE POLICY admin_personas_insert
      ON coach_personas
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Allow admins to delete coach_personas (for future use)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'coach_personas' 
    AND policyname = 'admin_personas_delete'
  ) THEN
    CREATE POLICY admin_personas_delete
      ON coach_personas
      FOR DELETE
      TO authenticated
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Also allow admins to select all personas (including inactive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'coach_personas' 
    AND policyname = 'admin_personas_select_all'
  ) THEN
    CREATE POLICY admin_personas_select_all
      ON coach_personas
      FOR SELECT
      TO authenticated
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;
