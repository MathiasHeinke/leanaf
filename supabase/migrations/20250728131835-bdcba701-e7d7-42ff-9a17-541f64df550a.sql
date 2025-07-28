-- Add coach memory table for enhanced relationship building
CREATE TABLE IF NOT EXISTS public.coach_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add proactive messages table for smart engagement
CREATE TABLE IF NOT EXISTS public.proactive_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('check_in', 'motivation', 'celebration', 'support', 'surprise')),
  message_content TEXT NOT NULL,
  trigger_reason TEXT NOT NULL,
  coach_personality TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on both tables
ALTER TABLE public.coach_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proactive_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for coach_memory
CREATE POLICY "Users can view their own coach memory" 
ON public.coach_memory 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coach memory" 
ON public.coach_memory 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coach memory" 
ON public.coach_memory 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coach memory" 
ON public.coach_memory 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for proactive_messages
CREATE POLICY "Users can view their own proactive messages" 
ON public.proactive_messages 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own proactive messages" 
ON public.proactive_messages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own proactive messages" 
ON public.proactive_messages 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_coach_memory_user_id ON public.coach_memory(user_id);
CREATE INDEX idx_coach_memory_updated_at ON public.coach_memory(updated_at);
CREATE INDEX idx_proactive_messages_user_id ON public.proactive_messages(user_id);
CREATE INDEX idx_proactive_messages_sent_at ON public.proactive_messages(sent_at);
CREATE INDEX idx_proactive_messages_type ON public.proactive_messages(message_type);

-- Update timestamp trigger for coach_memory
CREATE TRIGGER update_coach_memory_updated_at
BEFORE UPDATE ON public.coach_memory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();