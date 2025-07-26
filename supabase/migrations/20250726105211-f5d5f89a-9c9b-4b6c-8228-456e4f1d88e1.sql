-- Add conversation_date field to coach_conversations for daily chat separation
ALTER TABLE public.coach_conversations 
ADD COLUMN conversation_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Create index for efficient querying by date and user
CREATE INDEX idx_coach_conversations_date_user 
ON public.coach_conversations (user_id, conversation_date, created_at);

-- Create index for coach-specific daily conversations
CREATE INDEX idx_coach_conversations_coach_date 
ON public.coach_conversations (user_id, coach_personality, conversation_date, created_at);