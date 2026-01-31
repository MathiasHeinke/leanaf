-- Phase 0 Profile Completion: Add lifestyle screening and disclaimer fields

-- Add lifestyle fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS smoking_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS smoking_amount integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS smoking_quit_date date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vaping_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS alcohol_frequency text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS alcohol_drinks_per_week integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS substance_use text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS substance_details text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS disclaimer_accepted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lifestyle_screening_completed boolean DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN public.profiles.smoking_status IS 'never, occasional, regular, quit';
COMMENT ON COLUMN public.profiles.smoking_amount IS 'Cigarettes per day if smoking';
COMMENT ON COLUMN public.profiles.vaping_status IS 'never, occasional, regular';
COMMENT ON COLUMN public.profiles.alcohol_frequency IS 'never, rare, monthly, weekly, daily';
COMMENT ON COLUMN public.profiles.alcohol_drinks_per_week IS 'Average drinks per week';
COMMENT ON COLUMN public.profiles.substance_use IS 'none, occasional, regular';
COMMENT ON COLUMN public.profiles.substance_details IS 'Free text for substance details';
COMMENT ON COLUMN public.profiles.disclaimer_accepted_at IS 'Timestamp when health disclaimer was accepted';
COMMENT ON COLUMN public.profiles.lifestyle_screening_completed IS 'Whether lifestyle screening section is completed';