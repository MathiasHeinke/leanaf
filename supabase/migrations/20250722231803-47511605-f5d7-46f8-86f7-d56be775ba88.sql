
-- Create table to track AI usage limits for free users
CREATE TABLE public.ai_usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feature_type TEXT NOT NULL, -- 'meal_analysis', 'coach_chat', 'coach_recipes', 'daily_analysis'
  daily_count INTEGER NOT NULL DEFAULT 0,
  monthly_count INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_reset_month DATE NOT NULL DEFAULT DATE_TRUNC('month', CURRENT_DATE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_type)
);

-- Enable RLS
ALTER TABLE public.ai_usage_limits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own AI usage limits"
  ON public.ai_usage_limits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI usage limits"
  ON public.ai_usage_limits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI usage limits"
  ON public.ai_usage_limits
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to check and update AI usage limits
CREATE OR REPLACE FUNCTION public.check_ai_usage_limit(
  p_user_id UUID,
  p_feature_type TEXT,
  p_daily_limit INTEGER DEFAULT 5,
  p_monthly_limit INTEGER DEFAULT 150
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_date DATE := CURRENT_DATE;
  v_current_month DATE := DATE_TRUNC('month', CURRENT_DATE);
  v_daily_count INTEGER := 0;
  v_monthly_count INTEGER := 0;
  v_can_use BOOLEAN := FALSE;
BEGIN
  -- Get or create usage record
  INSERT INTO public.ai_usage_limits (user_id, feature_type, daily_count, monthly_count, last_reset_date, last_reset_month)
  VALUES (p_user_id, p_feature_type, 0, 0, v_current_date, v_current_month)
  ON CONFLICT (user_id, feature_type) DO NOTHING;
  
  -- Get current usage and reset if needed
  SELECT 
    CASE 
      WHEN last_reset_date < v_current_date THEN 0 
      ELSE daily_count 
    END,
    CASE 
      WHEN last_reset_month < v_current_month THEN 0 
      ELSE monthly_count 
    END
  INTO v_daily_count, v_monthly_count
  FROM public.ai_usage_limits
  WHERE user_id = p_user_id AND feature_type = p_feature_type;
  
  -- Check if user can make request
  v_can_use := (v_daily_count < p_daily_limit) AND (v_monthly_count < p_monthly_limit);
  
  -- If usage allowed, increment counters
  IF v_can_use THEN
    UPDATE public.ai_usage_limits
    SET 
      daily_count = CASE WHEN last_reset_date < v_current_date THEN 1 ELSE daily_count + 1 END,
      monthly_count = CASE WHEN last_reset_month < v_current_month THEN 1 ELSE monthly_count + 1 END,
      last_reset_date = v_current_date,
      last_reset_month = v_current_month,
      updated_at = now()
    WHERE user_id = p_user_id AND feature_type = p_feature_type;
    
    -- Get updated counts
    SELECT daily_count, monthly_count
    INTO v_daily_count, v_monthly_count
    FROM public.ai_usage_limits
    WHERE user_id = p_user_id AND feature_type = p_feature_type;
  END IF;
  
  RETURN jsonb_build_object(
    'can_use', v_can_use,
    'daily_count', v_daily_count,
    'monthly_count', v_monthly_count,
    'daily_limit', p_daily_limit,
    'monthly_limit', p_monthly_limit,
    'daily_remaining', p_daily_limit - v_daily_count,
    'monthly_remaining', p_monthly_limit - v_monthly_count
  );
END;
$$;
