-- Add full_prompt column to coach_trace_events table
ALTER TABLE coach_trace_events 
ADD COLUMN full_prompt TEXT;