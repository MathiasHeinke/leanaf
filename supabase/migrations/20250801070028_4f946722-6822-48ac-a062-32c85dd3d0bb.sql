-- Create conversation_summaries table for episodic memory
CREATE TABLE public.conversation_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  summary_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  summary_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  summary_content TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  key_topics TEXT[] DEFAULT '{}',
  emotional_tone TEXT,
  progress_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own conversation summaries" 
ON public.conversation_summaries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversation summaries" 
ON public.conversation_summaries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation summaries" 
ON public.conversation_summaries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation summaries" 
ON public.conversation_summaries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Coaches can view summaries for coaching context
CREATE POLICY "Coaches can view conversation summaries for coaching" 
ON public.conversation_summaries 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.user_id = conversation_summaries.user_id
  ) OR 
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
);

-- Index for performance
CREATE INDEX idx_conversation_summaries_user_period 
ON public.conversation_summaries (user_id, summary_period_end DESC);

-- Update trigger
CREATE TRIGGER update_conversation_summaries_updated_at
BEFORE UPDATE ON public.conversation_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();