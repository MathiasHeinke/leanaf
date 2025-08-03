-- Enable realtime for coach_trace_events table
ALTER TABLE coach_trace_events REPLICA IDENTITY FULL;

-- Add coach_trace_events to the realtime publication
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE coach_trace_events;