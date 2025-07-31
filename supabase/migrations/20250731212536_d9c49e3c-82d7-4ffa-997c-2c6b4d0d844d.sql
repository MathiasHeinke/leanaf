-- Add separate fields for first name, last name, and preferred name (nickname)
ALTER TABLE public.profiles 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN preferred_name TEXT;

-- Add comment to clarify the difference
COMMENT ON COLUMN public.profiles.display_name IS 'Deprecated: use first_name + last_name for official name';
COMMENT ON COLUMN public.profiles.first_name IS 'Official first name (for account/legal purposes)';
COMMENT ON COLUMN public.profiles.last_name IS 'Official last name (for account/legal purposes)';
COMMENT ON COLUMN public.profiles.preferred_name IS 'Nickname/preferred name (how coaches should address the user)';