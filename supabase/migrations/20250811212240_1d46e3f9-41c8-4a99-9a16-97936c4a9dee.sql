-- Create coach_conversation_memory table for rolling summaries
CREATE TABLE public.coach_conversation_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coach_id TEXT NOT NULL,
  rolling_summary TEXT,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, coach_id)
);

-- Enable RLS
ALTER TABLE public.coach_conversation_memory ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own conversation memory" 
ON public.coach_conversation_memory 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can view conversation memory for coaching" 
ON public.coach_conversation_memory 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.user_id = coach_conversation_memory.user_id
  ) OR 
  ((current_setting('request.jwt.claims', true))::jsonb ->> 'role') = 'service_role'
);

-- Create index for performance
CREATE INDEX idx_coach_conversation_memory_user_coach ON public.coach_conversation_memory(user_id, coach_id);