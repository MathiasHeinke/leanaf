-- Create feature requests table
CREATE TABLE public.feature_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ui_ux', 'functionality', 'performance', 'integration', 'content', 'other')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'planned', 'in_progress', 'completed', 'rejected')),
  vote_count INTEGER NOT NULL DEFAULT 0,
  implementation_notes TEXT,
  estimated_effort TEXT CHECK (estimated_effort IN ('small', 'medium', 'large', 'epic')),
  target_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feature votes table
CREATE TABLE public.feature_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature_request_id UUID NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_request_id)
);

-- Create roadmap items table
CREATE TABLE public.roadmap_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'completed', 'on_hold')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  estimated_completion DATE,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  feature_request_id UUID REFERENCES public.feature_requests(id) ON DELETE SET NULL,
  version TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feature_requests
CREATE POLICY "Anyone can view feature requests" 
ON public.feature_requests 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create feature requests" 
ON public.feature_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feature requests" 
ON public.feature_requests 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all feature requests" 
ON public.feature_requests 
FOR ALL 
USING (is_super_admin());

-- RLS Policies for feature_votes
CREATE POLICY "Anyone can view feature votes" 
ON public.feature_votes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own votes" 
ON public.feature_votes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" 
ON public.feature_votes 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for roadmap_items
CREATE POLICY "Anyone can view public roadmap items" 
ON public.roadmap_items 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Super admins can manage all roadmap items" 
ON public.roadmap_items 
FOR ALL 
USING (is_super_admin());

-- Create indexes for performance
CREATE INDEX idx_feature_requests_status ON public.feature_requests(status);
CREATE INDEX idx_feature_requests_category ON public.feature_requests(category);
CREATE INDEX idx_feature_requests_vote_count ON public.feature_requests(vote_count DESC);
CREATE INDEX idx_feature_requests_created_at ON public.feature_requests(created_at DESC);
CREATE INDEX idx_feature_votes_feature_request_id ON public.feature_votes(feature_request_id);
CREATE INDEX idx_roadmap_items_status ON public.roadmap_items(status);
CREATE INDEX idx_roadmap_items_priority ON public.roadmap_items(priority);

-- Create function to update vote count
CREATE OR REPLACE FUNCTION public.update_feature_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feature_requests 
    SET vote_count = vote_count + 1 
    WHERE id = NEW.feature_request_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feature_requests 
    SET vote_count = vote_count - 1 
    WHERE id = OLD.feature_request_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vote count updates
CREATE TRIGGER update_feature_vote_count_trigger
  AFTER INSERT OR DELETE ON public.feature_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feature_vote_count();

-- Create trigger for updated_at columns
CREATE TRIGGER update_feature_requests_updated_at
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roadmap_items_updated_at
  BEFORE UPDATE ON public.roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for bug report screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bug-screenshots', 'bug-screenshots', true)
ON CONFLICT (id) DO NOTHING;