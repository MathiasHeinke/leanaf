-- Enhanced Journal Entries Schema for Intelligent Mindset Journal
ALTER TABLE public.journal_entries 
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS entry_sequence_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS ai_analysis_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS photo_analysis JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS emotional_scores JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS wellness_score INTEGER;

-- Create Daily Summaries Table
CREATE TABLE IF NOT EXISTS public.journal_daily_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  total_entries INTEGER DEFAULT 0,
  avg_wellness_score NUMERIC,
  dominant_emotions JSONB DEFAULT '{}',
  key_themes TEXT[] DEFAULT '{}',
  ai_summary TEXT,
  photo_highlights JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create Weekly Summaries Table  
CREATE TABLE IF NOT EXISTS public.journal_weekly_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  entries_count INTEGER DEFAULT 0,
  wellness_trend NUMERIC,
  pattern_insights JSONB DEFAULT '{}',
  growth_areas TEXT[] DEFAULT '{}',
  achievements TEXT[] DEFAULT '{}',
  ai_insights TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Create Monthly Summaries Table
CREATE TABLE IF NOT EXISTS public.journal_monthly_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month DATE NOT NULL,
  entries_count INTEGER DEFAULT 0,
  wellness_index NUMERIC,
  life_areas_progress JSONB DEFAULT '{}',
  transformation_themes TEXT[] DEFAULT '{}',
  development_insights TEXT,
  photo_memory_highlights JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Create Photo Analyses Table
CREATE TABLE IF NOT EXISTS public.journal_photo_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  scene_description TEXT,
  detected_objects JSONB DEFAULT '[]',
  mood_analysis JSONB DEFAULT '{}',
  color_palette JSONB DEFAULT '{}',
  memory_tags TEXT[] DEFAULT '{}',
  ai_interpretation TEXT,
  confidence_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Progressive Prompts Table
CREATE TABLE IF NOT EXISTS public.progressive_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_level INTEGER NOT NULL, -- 1=open, 2=specific, 3=transformative
  category TEXT NOT NULL, -- morning, midday, evening, reflection
  question_text TEXT NOT NULL,
  follow_up_text TEXT,
  context_tags TEXT[] DEFAULT '{}',
  usage_frequency INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.journal_daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_photo_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progressive_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Daily Summaries
CREATE POLICY "Users can view their own daily summaries" 
ON public.journal_daily_summaries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily summaries" 
ON public.journal_daily_summaries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily summaries" 
ON public.journal_daily_summaries 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for Weekly Summaries
CREATE POLICY "Users can view their own weekly summaries" 
ON public.journal_weekly_summaries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own weekly summaries" 
ON public.journal_weekly_summaries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly summaries" 
ON public.journal_weekly_summaries 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for Monthly Summaries
CREATE POLICY "Users can view their own monthly summaries" 
ON public.journal_monthly_summaries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own monthly summaries" 
ON public.journal_monthly_summaries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly summaries" 
ON public.journal_monthly_summaries 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for Photo Analyses
CREATE POLICY "Users can view photo analyses for their entries" 
ON public.journal_photo_analyses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.journal_entries je 
  WHERE je.id = journal_photo_analyses.journal_entry_id 
  AND je.user_id = auth.uid()
));

CREATE POLICY "Users can create photo analyses for their entries" 
ON public.journal_photo_analyses 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.journal_entries je 
  WHERE je.id = journal_photo_analyses.journal_entry_id 
  AND je.user_id = auth.uid()
));

-- RLS Policies for Progressive Prompts (Public read access)
CREATE POLICY "Anyone can view progressive prompts" 
ON public.progressive_prompts 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage progressive prompts" 
ON public.progressive_prompts 
FOR ALL 
USING (is_super_admin());

-- Triggers for updated_at columns
CREATE TRIGGER update_journal_daily_summaries_updated_at
BEFORE UPDATE ON public.journal_daily_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journal_weekly_summaries_updated_at
BEFORE UPDATE ON public.journal_weekly_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journal_monthly_summaries_updated_at
BEFORE UPDATE ON public.journal_monthly_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial progressive prompts
INSERT INTO public.progressive_prompts (prompt_level, category, question_text, follow_up_text, context_tags) VALUES
-- Level 1: Open Questions
(1, 'morning', 'Wie geht es dir heute?', 'Was beschäftigt dich gerade?', ARRAY['general', 'mood', 'energy']),
(1, 'morning', 'Was steht heute an?', 'Worauf freust du dich?', ARRAY['planning', 'anticipation']),
(1, 'midday', 'Was machst du gerade?', 'Wie läuft dein Tag bisher?', ARRAY['activity', 'progress']),
(1, 'midday', 'Was gibt es zu erzählen?', 'Was ist passiert?', ARRAY['events', 'experiences']),
(1, 'evening', 'Wie war dein Tag?', 'Was nimmst du mit?', ARRAY['reflection', 'learning']),
(1, 'evening', 'Was ist heute gut gelaufen?', 'Wofür bist du dankbar?', ARRAY['gratitude', 'success']),

-- Level 2: Specific Questions  
(2, 'morning', 'Wie ist dein Energie-Level heute?', 'Was brauchst du für einen guten Tag?', ARRAY['energy', 'needs']),
(2, 'morning', 'Wie hast du geschlafen?', 'Hattest du interessante Träume?', ARRAY['sleep', 'dreams']),
(2, 'midday', 'Wie fühlst du dich körperlich?', 'Was sagt dir dein Körper?', ARRAY['body', 'wellness']),
(2, 'midday', 'Wie ist deine Stimmung gerade?', 'Was beeinflusst deine Stimmung?', ARRAY['mood', 'emotions']),
(2, 'evening', 'Was war heute herausfordernd?', 'Wie bist du damit umgegangen?', ARRAY['challenges', 'coping']),
(2, 'evening', 'Welche Gefühle waren heute dominant?', 'Was haben sie dir gesagt?', ARRAY['emotions', 'insights']),

-- Level 3: Transformative Questions
(3, 'morning', 'Was willst du heute loslassen?', 'Wie kannst du dir selbst Raum geben?', ARRAY['release', 'growth']),
(3, 'morning', 'Wofür bist du heute dankbar?', 'Wie zeigt sich Fülle in deinem Leben?', ARRAY['gratitude', 'abundance']),
(3, 'evening', 'Was hat dich heute am meisten berührt?', 'Wie kannst du diese Erfahrung integrieren?', ARRAY['meaning', 'integration']),
(3, 'evening', 'Wer warst du heute?', 'Wer willst du morgen sein?', ARRAY['identity', 'evolution']),
(3, 'reflection', 'Was willst du in deinem Leben transformieren?', 'Welcher erste Schritt wartet auf dich?', ARRAY['transformation', 'action']),
(3, 'reflection', 'Wovon träumst du?', 'Was würde passieren, wenn du dir vertraust?', ARRAY['dreams', 'trust']);

-- Function to get entry sequence number for a user on a given day
CREATE OR REPLACE FUNCTION get_next_entry_sequence(p_user_id UUID, p_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(entry_sequence_number), 0) + 1
  INTO next_seq
  FROM public.journal_entries
  WHERE user_id = p_user_id 
  AND DATE(created_at) = p_date;
  
  RETURN next_seq;
END;
$$;