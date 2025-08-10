-- Create unmet tool events tracking table
CREATE TABLE public.unmet_tool_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  message text NOT NULL,
  intent_guess text,
  confidence numeric,
  suggested_tool text,
  handled_manually boolean DEFAULT false,
  manual_summary text,
  status text DEFAULT 'new' CHECK (status IN ('new','triaged','in_progress','shipped','wontfix')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tool lexicon for continuous learning
CREATE TABLE public.tool_lexicon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id text NOT NULL,
  phrase text NOT NULL,
  source text DEFAULT 'user',
  hits integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tool_id, phrase)
);

-- Enable RLS
ALTER TABLE public.unmet_tool_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_lexicon ENABLE ROW LEVEL SECURITY;

-- RLS Policies for unmet_tool_events
CREATE POLICY "Users can create and view their own unmet tool events" 
ON public.unmet_tool_events 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all unmet tool events" 
ON public.unmet_tool_events 
FOR SELECT 
USING (is_super_admin());

CREATE POLICY "Admins can update unmet tool events status" 
ON public.unmet_tool_events 
FOR UPDATE 
USING (is_super_admin());

-- RLS Policies for tool_lexicon
CREATE POLICY "Anyone can view tool lexicon" 
ON public.tool_lexicon 
FOR SELECT 
USING (true);

CREATE POLICY "System can manage tool lexicon" 
ON public.tool_lexicon 
FOR ALL 
USING (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text);

-- Update trigger for unmet_tool_events
CREATE TRIGGER update_unmet_tool_events_updated_at
  BEFORE UPDATE ON public.unmet_tool_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for tool_lexicon
CREATE TRIGGER update_tool_lexicon_updated_at
  BEFORE UPDATE ON public.tool_lexicon
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();