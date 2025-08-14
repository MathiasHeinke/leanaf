-- Create missing log_trace_event function for telemetry
CREATE OR REPLACE FUNCTION public.log_trace_event(
  p_trace_id text,
  p_stage text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow authenticated users to log trace events
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required for trace logging';
  END IF;

  INSERT INTO public.coach_traces (
    trace_id,
    ts,
    stage,
    data
  ) VALUES (
    p_trace_id,
    now(),
    p_stage,
    p_data || jsonb_build_object(
      'user_id', auth.uid(),
      'timestamp', now()
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Swallow errors to prevent blocking main operations
    NULL;
END;
$$;