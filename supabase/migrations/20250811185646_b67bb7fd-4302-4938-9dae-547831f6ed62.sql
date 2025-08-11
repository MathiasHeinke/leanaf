-- Remove the old version without client_event_id parameter
DROP FUNCTION IF EXISTS public.update_user_points_and_level(uuid, integer, text, text, numeric, numeric);