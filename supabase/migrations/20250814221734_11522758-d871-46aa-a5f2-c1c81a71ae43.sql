-- Add nutrition calculation fields to profiles table for precise ARES coaching
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_calorie_target integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS calorie_deficit integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bmr numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tdee numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS protein_target_g numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS carbs_target_g numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fats_target_g numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS protein_percentage numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS carbs_percentage numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fats_percentage numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weekly_weight_loss_target numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nutrition_calculation_date timestamp with time zone;

-- Add comments for clarity
COMMENT ON COLUMN public.profiles.daily_calorie_target IS 'Target daily calories based on TDEE and deficit';
COMMENT ON COLUMN public.profiles.calorie_deficit IS 'Daily calorie deficit for weight loss goals';
COMMENT ON COLUMN public.profiles.bmr IS 'Basal Metabolic Rate calculation';
COMMENT ON COLUMN public.profiles.tdee IS 'Total Daily Energy Expenditure';
COMMENT ON COLUMN public.profiles.protein_target_g IS 'Daily protein target in grams';
COMMENT ON COLUMN public.profiles.carbs_target_g IS 'Daily carbohydrate target in grams';
COMMENT ON COLUMN public.profiles.fats_target_g IS 'Daily fat target in grams';
COMMENT ON COLUMN public.profiles.protein_percentage IS 'Protein as percentage of total calories';
COMMENT ON COLUMN public.profiles.carbs_percentage IS 'Carbs as percentage of total calories';
COMMENT ON COLUMN public.profiles.fats_percentage IS 'Fats as percentage of total calories';
COMMENT ON COLUMN public.profiles.weekly_weight_loss_target IS 'Target weight loss per week in kg';
COMMENT ON COLUMN public.profiles.nutrition_calculation_date IS 'When nutrition targets were last calculated';