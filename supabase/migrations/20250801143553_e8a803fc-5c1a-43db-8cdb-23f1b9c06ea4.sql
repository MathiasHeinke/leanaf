-- Create debug_logs table for direct GPT-4.1 debugging
CREATE TABLE public.debug_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coach_id TEXT NOT NULL,
  user_msg TEXT NOT NULL,
  assistant_msg TEXT NOT NULL,
  tokens INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for debug_logs
CREATE POLICY "Users can view their own debug logs" 
ON public.debug_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own debug logs" 
ON public.debug_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Index for better performance
CREATE INDEX idx_debug_logs_user_id ON public.debug_logs(user_id);
CREATE INDEX idx_debug_logs_created_at ON public.debug_logs(created_at);