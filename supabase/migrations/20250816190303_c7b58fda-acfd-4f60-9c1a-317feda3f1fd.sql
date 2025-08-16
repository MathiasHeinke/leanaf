-- Fix daily_goals table structure - add missing columns and ensure proper defaults
ALTER TABLE public.daily_goals 
ADD COLUMN IF NOT EXISTS goal_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS fluids INTEGER DEFAULT 2000;

-- Create index for better performance on goal_date
CREATE INDEX IF NOT EXISTS idx_daily_goals_user_date ON public.daily_goals(user_id, goal_date);

-- Ensure meal-images storage bucket is public for analyze-meal function access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'meal-images';

-- Create a function to ensure user has daily goals for today
CREATE OR REPLACE FUNCTION public.ensure_daily_goals(user_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_goals RECORD;
  user_profile RECORD;
BEGIN
  -- Get today's date
  SELECT CURRENT_DATE as today_date INTO today_goals;
  
  -- Check if user already has goals for today
  SELECT * INTO today_goals
  FROM public.daily_goals 
  WHERE user_id = user_id_param 
    AND goal_date = CURRENT_DATE;
  
  -- If no goals exist for today, create default ones from profile or system defaults
  IF today_goals IS NULL THEN
    -- Get user profile for personalized defaults
    SELECT target_calories, target_protein, target_carbs, target_fats
    INTO user_profile
    FROM public.profiles 
    WHERE user_id = user_id_param;
    
    -- Insert new daily goals with profile defaults or fallback defaults
    INSERT INTO public.daily_goals (
      user_id, 
      goal_date, 
      calories, 
      protein, 
      carbs, 
      fats, 
      fluids
    ) VALUES (
      user_id_param,
      CURRENT_DATE,
      COALESCE(user_profile.target_calories, 2000),
      COALESCE(user_profile.target_protein, 150),
      COALESCE(user_profile.target_carbs, 250),
      COALESCE(user_profile.target_fats, 65),
      2000
    )
    RETURNING * INTO today_goals;
  END IF;
  
  -- Return the goals as JSON
  RETURN jsonb_build_object(
    'id', today_goals.id,
    'user_id', today_goals.user_id,
    'goal_date', today_goals.goal_date,
    'calories', today_goals.calories,
    'protein', today_goals.protein,
    'carbs', today_goals.carbs,
    'fats', today_goals.fats,
    'fluids', today_goals.fluids
  );
END;
$$;