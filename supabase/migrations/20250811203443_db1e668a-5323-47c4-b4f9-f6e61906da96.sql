-- Create function to cleanup stale client_events entries that never reached FINAL
CREATE OR REPLACE FUNCTION public.cleanup_stale_client_events(max_age INTERVAL DEFAULT '2 hours')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted integer := 0;
BEGIN
  DELETE FROM public.client_events
  WHERE status = 'RECEIVED'
    AND created_at < (now() - max_age);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$function$;