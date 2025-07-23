-- Add created_by column to exercises table to support user-created exercises
ALTER TABLE public.exercises 
ADD COLUMN created_by UUID,
ADD COLUMN is_public BOOLEAN DEFAULT true;

-- Add foreign key reference to auth.users (but we'll use user_id from auth)
-- Update RLS policies to allow users to create their own exercises
DROP POLICY IF EXISTS "Anyone can view exercises" ON public.exercises;
DROP POLICY IF EXISTS "Super admins can manage exercises" ON public.exercises;

-- New RLS policies for user-created exercises
CREATE POLICY "Anyone can view public exercises and own exercises" 
ON public.exercises 
FOR SELECT 
USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create their own exercises" 
ON public.exercises 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own exercises" 
ON public.exercises 
FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own exercises" 
ON public.exercises 
FOR DELETE 
USING (created_by = auth.uid());

CREATE POLICY "Super admins can manage all exercises" 
ON public.exercises 
FOR ALL 
USING (is_super_admin());

-- Set existing exercises as public and system-created
UPDATE public.exercises 
SET is_public = true, created_by = null 
WHERE created_by IS NULL;