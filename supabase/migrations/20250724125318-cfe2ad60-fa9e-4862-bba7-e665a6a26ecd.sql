-- Fix für das Gewichtsproblem: Zuerst erstelle ich die Tabellen für die neuen Features
-- 1. Coach-Bewertungssystem Tabelle
CREATE TABLE public.coach_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coach_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, coach_id)
);

-- Enable RLS for coach_ratings
ALTER TABLE public.coach_ratings ENABLE ROW LEVEL SECURITY;

-- Policies für coach_ratings
CREATE POLICY "Users can view their own coach ratings" 
ON public.coach_ratings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coach ratings" 
ON public.coach_ratings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coach ratings" 
ON public.coach_ratings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coach ratings" 
ON public.coach_ratings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Anyone can view ratings for displaying average ratings
CREATE POLICY "Anyone can view coach ratings for statistics" 
ON public.coach_ratings 
FOR SELECT 
USING (true);

-- 2. Bug-Reports Tabelle
CREATE TABLE public.bug_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for bug_reports
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Policies für bug_reports
CREATE POLICY "Users can create their own bug reports" 
ON public.bug_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own bug reports" 
ON public.bug_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all bug reports" 
ON public.bug_reports 
FOR SELECT 
USING (is_super_admin());

CREATE POLICY "Super admins can update bug reports" 
ON public.bug_reports 
FOR UPDATE 
USING (is_super_admin());

-- Trigger für updated_at columns
CREATE TRIGGER update_coach_ratings_updated_at
  BEFORE UPDATE ON public.coach_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bug_reports_updated_at
  BEFORE UPDATE ON public.bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();