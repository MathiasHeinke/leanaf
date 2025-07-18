-- Add new columns to profiles table for coach personality and macro strategies
ALTER TABLE public.profiles 
ADD COLUMN coach_personality TEXT DEFAULT 'motivierend'::text,
ADD COLUMN muscle_maintenance_priority BOOLEAN DEFAULT false,
ADD COLUMN macro_strategy TEXT DEFAULT 'standard'::text;

-- Add check constraints for valid values
ALTER TABLE public.profiles 
ADD CONSTRAINT coach_personality_check 
CHECK (coach_personality IN ('hart', 'soft', 'lustig', 'ironisch', 'motivierend'));

ALTER TABLE public.profiles 
ADD CONSTRAINT macro_strategy_check 
CHECK (macro_strategy IN ('standard', 'high_protein', 'balanced', 'low_carb', 'athletic', 'custom'));