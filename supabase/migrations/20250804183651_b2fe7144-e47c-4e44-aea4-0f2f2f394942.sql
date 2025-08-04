-- Create table for tracking onboarding stats and coupon system
CREATE TABLE public.onboarding_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_users integer NOT NULL DEFAULT 0,
  current_coupons_used integer NOT NULL DEFAULT 0,
  max_coupons integer NOT NULL DEFAULT 50,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_stats ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read stats
CREATE POLICY "Anyone can view onboarding stats" 
ON public.onboarding_stats 
FOR SELECT 
USING (true);

-- Only system can update stats
CREATE POLICY "System can manage onboarding stats" 
ON public.onboarding_stats 
FOR ALL 
USING (true);

-- Insert initial record
INSERT INTO public.onboarding_stats (total_users, current_coupons_used, max_coupons)
VALUES (0, 0, 50);

-- Function to increment user count and track coupons
CREATE OR REPLACE FUNCTION public.increment_onboarding_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_stats record;
  v_coupon_code text := NULL;
  v_user_number integer;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT * INTO v_stats 
  FROM public.onboarding_stats 
  WHERE id = (SELECT id FROM public.onboarding_stats LIMIT 1)
  FOR UPDATE;
  
  -- Increment user count
  v_user_number := v_stats.total_users + 1;
  
  -- Generate coupon if within limit
  IF v_stats.current_coupons_used < v_stats.max_coupons THEN
    v_coupon_code := 'GETLEAN2025-' || LPAD(v_user_number::text, 3, '0');
    
    -- Update stats with coupon used
    UPDATE public.onboarding_stats 
    SET total_users = v_user_number,
        current_coupons_used = current_coupons_used + 1,
        updated_at = now()
    WHERE id = v_stats.id;
  ELSE
    -- Update stats without coupon
    UPDATE public.onboarding_stats 
    SET total_users = v_user_number,
        updated_at = now()
    WHERE id = v_stats.id;
  END IF;
  
  RETURN jsonb_build_object(
    'user_number', v_user_number,
    'coupon_code', v_coupon_code,
    'coupons_remaining', GREATEST(0, v_stats.max_coupons - v_stats.current_coupons_used - CASE WHEN v_coupon_code IS NOT NULL THEN 1 ELSE 0 END)
  );
END;
$$;