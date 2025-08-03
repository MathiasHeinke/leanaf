-- Add super_admin to enum (separate transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';