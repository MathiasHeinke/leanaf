-- Create missing database relations for UUID fix

-- 1. Create view v_summary_rolling_30 if not exists
DROP VIEW IF EXISTS public.v_summary_rolling_30;
CREATE VIEW public.v_summary_rolling_30 AS
SELECT 
  ds.user_id,
  ds.date,
  COALESCE(ds.total_calories, 0) as kcal,
  COALESCE(fast_sets_volume(ds.user_id, ds.date), 0) as volume_kg,
  COALESCE(st.sleep_hours, 0) as sleep_hours,
  COALESCE(st.sleep_score, 0) as sleep_score,
  COALESCE(fast_fluid_totals(ds.user_id, ds.date), 0) as hydration_ml,
  CASE 
    WHEN fast_fluid_totals(ds.user_id, ds.date) >= 2000 THEN 10
    WHEN fast_fluid_totals(ds.user_id, ds.date) >= 1500 THEN 7
    WHEN fast_fluid_totals(ds.user_id, ds.date) >= 1000 THEN 5
    ELSE 2
  END as hydration_score,
  COALESCE(sf.compliance_pct, 0) as supplement_compliance,
  COALESCE(st.notes, 'neutral') as mood,
  -- Calculate completeness score based on data availability
  CASE 
    WHEN ds.total_calories > 0 AND st.sleep_hours IS NOT NULL THEN 10
    WHEN ds.total_calories > 0 OR st.sleep_hours IS NOT NULL THEN 6
    ELSE 3
  END as completeness_score
FROM public.daily_summaries ds
LEFT JOIN public.sleep_tracking st ON st.user_id = ds.user_id AND st.date = ds.date
LEFT JOIN public.v_supplement_flags sf ON sf.user_id = ds.user_id AND sf.date = ds.date
WHERE ds.date >= CURRENT_DATE - INTERVAL '30 days';

-- 2. Fix RLS policy for coach_conversations to allow inserts
DROP POLICY IF EXISTS "Users can create conversations with coaches" ON public.coach_conversations;
CREATE POLICY "Users can create conversations with coaches" 
ON public.coach_conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);