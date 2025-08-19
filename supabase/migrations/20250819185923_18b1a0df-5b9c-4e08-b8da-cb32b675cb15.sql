-- Fix critical security issues identified by linter
-- Remove Security Definer Views that bypass RLS

-- 1. First, let's fix the most critical security issues by removing problematic views
DROP VIEW IF EXISTS v_supplement_flags CASCADE;
DROP VIEW IF EXISTS v_unmet_tool_stats CASCADE;
DROP VIEW IF EXISTS v_orchestrator_metrics_60m CASCADE;
DROP VIEW IF EXISTS v_workout_totals CASCADE;
DROP VIEW IF EXISTS v_today_meals CASCADE;

-- 2. Create a safer weight upsert function with proper error handling
CREATE OR REPLACE FUNCTION public.upsert_weight_entry(
  p_user_id uuid,
  p_weight numeric,
  p_date date,
  p_body_fat_percentage numeric DEFAULT NULL,
  p_muscle_percentage numeric DEFAULT NULL,
  p_photo_urls jsonb DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_existing_id uuid;
  v_operation text;
BEGIN
  -- Check if entry exists for this user and date
  SELECT id INTO v_existing_id 
  FROM public.weight_history 
  WHERE user_id = p_user_id AND date = p_date;
  
  IF v_existing_id IS NOT NULL THEN
    -- Update existing entry
    UPDATE public.weight_history 
    SET 
      weight = p_weight,
      body_fat_percentage = p_body_fat_percentage,
      muscle_percentage = p_muscle_percentage,
      photo_urls = COALESCE(p_photo_urls, photo_urls),
      notes = COALESCE(p_notes, notes),
      updated_at = now()
    WHERE id = v_existing_id;
    
    v_operation := 'updated';
  ELSE
    -- Insert new entry
    INSERT INTO public.weight_history (
      user_id, weight, date, body_fat_percentage, 
      muscle_percentage, photo_urls, notes
    ) VALUES (
      p_user_id, p_weight, p_date, p_body_fat_percentage,
      p_muscle_percentage, p_photo_urls, p_notes
    );
    
    v_operation := 'created';
  END IF;
  
  v_result := jsonb_build_object(
    'success', true,
    'operation', v_operation,
    'weight', p_weight,
    'date', p_date
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLSTATE,
      'message', SQLERRM
    );
    RETURN v_result;
END;
$$;