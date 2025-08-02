-- Create journal_entries table for diary tool
CREATE TABLE public.journal_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  raw_text text,
  audio_url text,
  mood_score integer,
  sentiment_tag text,
  ai_summary_md text,
  gratitude_items text[],
  highlight text,
  challenge text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for efficient queries
CREATE INDEX idx_journal_entries_user_date ON public.journal_entries(user_id, date);

-- Enable RLS
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for journal entries
CREATE POLICY "Users can view their own journal entries" 
ON public.journal_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own journal entries" 
ON public.journal_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries" 
ON public.journal_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries" 
ON public.journal_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Coaches can view journal entries for coaching
CREATE POLICY "Coaches can view journal entries for coaching" 
ON public.journal_entries 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.user_id = journal_entries.user_id
  ) OR 
  ((current_setting('request.jwt.claims', true))::jsonb ->> 'role') = 'service_role'
);

-- Add image_meta column to meals table for enhanced meal capture
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS image_meta jsonb DEFAULT '{}'::jsonb;

-- Create trigger for updated_at
CREATE TRIGGER update_journal_entries_updated_at
BEFORE UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();