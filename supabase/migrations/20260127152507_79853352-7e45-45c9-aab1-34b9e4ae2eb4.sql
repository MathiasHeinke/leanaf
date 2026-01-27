-- Create meal_favorites table for user's favorite meals (max 3)
CREATE TABLE public.meal_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meal_text text NOT NULL,
  position smallint DEFAULT 1,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, meal_text)
);

-- Enable Row Level Security
ALTER TABLE public.meal_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.meal_favorites
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own favorites
CREATE POLICY "Users can create their own favorites"
ON public.meal_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own favorites
CREATE POLICY "Users can update their own favorites"
ON public.meal_favorites
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites"
ON public.meal_favorites
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_meal_favorites_user_id ON public.meal_favorites(user_id);