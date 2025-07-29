-- Add missing image_url column to exercises table
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS image_url TEXT;