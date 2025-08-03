-- Fix UUID generation issues and create missing database relations

-- 1. Create coach_chat_packets table if not exists (needed for memory manager)
CREATE TABLE IF NOT EXISTS public.coach_chat_packets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  convo_id UUID NOT NULL,
  from_msg INTEGER NOT NULL,
  to_msg INTEGER NOT NULL,
  message_count INTEGER NOT NULL,
  packet_summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create view v_summary_rolling_30 for summary data
CREATE OR REPLACE VIEW public.v_summary_rolling_30 AS
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

-- 3. Enable RLS on coach_chat_packets
ALTER TABLE public.coach_chat_packets ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for coach_chat_packets
CREATE POLICY "Users can view their own chat packets" 
ON public.coach_chat_packets 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.coach_chat_memory ccm 
    WHERE ccm.convo_id = coach_chat_packets.convo_id 
    AND ccm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own chat packets" 
ON public.coach_chat_packets 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.coach_chat_memory ccm 
    WHERE ccm.convo_id = coach_chat_packets.convo_id 
    AND ccm.user_id = auth.uid()
  )
);

-- 5. Fix RLS policies for coach_conversations to allow inserts
DROP POLICY IF EXISTS "Users can create conversations with coaches" ON public.coach_conversations;
CREATE POLICY "Users can create conversations with coaches" 
ON public.coach_conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 6. Add policy for service role access on coach_chat_packets
CREATE POLICY "Service role can manage chat packets" 
ON public.coach_chat_packets 
FOR ALL 
USING (
  ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
)
WITH CHECK (
  ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_coach_chat_packets_convo_id ON public.coach_chat_packets(convo_id);
CREATE INDEX IF NOT EXISTS idx_coach_chat_packets_created_at ON public.coach_chat_packets(created_at);

-- 8. Add updated_at trigger for coach_chat_packets
CREATE TRIGGER update_coach_chat_packets_updated_at
BEFORE UPDATE ON public.coach_chat_packets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();