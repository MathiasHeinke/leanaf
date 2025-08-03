-- Create table for detailed trace events
CREATE TABLE public.coach_trace_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trace_id TEXT NOT NULL,
  conversation_id TEXT,
  message_id TEXT,
  step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  data JSONB DEFAULT '{}',
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coach_trace_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all trace events" 
ON public.coach_trace_events 
FOR SELECT 
USING (has_admin_access(auth.uid()));

CREATE POLICY "System can insert trace events" 
ON public.coach_trace_events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update trace events" 
ON public.coach_trace_events 
FOR UPDATE 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_trace_events_trace_id ON public.coach_trace_events(trace_id);
CREATE INDEX idx_trace_events_conversation_id ON public.coach_trace_events(conversation_id);
CREATE INDEX idx_trace_events_message_id ON public.coach_trace_events(message_id);
CREATE INDEX idx_trace_events_created_at ON public.coach_trace_events(created_at DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_trace_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_trace_events_updated_at
BEFORE UPDATE ON public.coach_trace_events
FOR EACH ROW
EXECUTE FUNCTION public.update_trace_events_updated_at();