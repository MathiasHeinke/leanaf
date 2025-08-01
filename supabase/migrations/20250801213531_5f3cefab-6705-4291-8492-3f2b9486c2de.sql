-- Fix missing columns that are causing Load failed errors
-- First, let's check if visceral_fat and body_water_percentage columns exist

-- Add missing columns if they don't exist
ALTER TABLE weight_history 
ADD COLUMN IF NOT EXISTS visceral_fat numeric,
ADD COLUMN IF NOT EXISTS body_water_percentage numeric;

-- Update the fast_sets_volume function to ensure it returns numeric
CREATE OR REPLACE FUNCTION public.fast_sets_volume(p_user uuid, p_d date)
 RETURNS numeric
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(sum(reps * weight_kg), 0)::numeric
  from exercise_sets
  where user_id = p_user
    and (created_at >= p_d::timestamp
         and created_at < (p_d + interval '1 day')::timestamp);
$function$;