-- Create table for tracking automated pipeline runs (ohne pg_cron)
CREATE TABLE IF NOT EXISTS public.automated_pipeline_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_type TEXT NOT NULL DEFAULT 'perplexity_knowledge',
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  entries_processed INTEGER DEFAULT 0,
  entries_successful INTEGER DEFAULT 0,
  entries_failed INTEGER DEFAULT 0,
  error_message TEXT,
  execution_time_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automated_pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Super admins can manage pipeline runs"
ON public.automated_pipeline_runs
FOR ALL
TO authenticated
USING (is_super_admin());

CREATE POLICY "System can insert pipeline runs"
ON public.automated_pipeline_runs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_automated_pipeline_runs_status ON public.automated_pipeline_runs(status);
CREATE INDEX idx_automated_pipeline_runs_started_at ON public.automated_pipeline_runs(started_at);

-- Create table for pipeline configuration
CREATE TABLE IF NOT EXISTS public.pipeline_automation_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_name TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  interval_minutes INTEGER NOT NULL DEFAULT 30,
  max_entries_per_run INTEGER NOT NULL DEFAULT 5,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER NOT NULL DEFAULT 0,
  max_failures INTEGER NOT NULL DEFAULT 3,
  config_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_automation_config ENABLE ROW LEVEL SECURITY;

-- Create policies for config
CREATE POLICY "Super admins can manage pipeline config"
ON public.pipeline_automation_config
FOR ALL
TO authenticated
USING (is_super_admin());

-- Insert default configuration
INSERT INTO public.pipeline_automation_config (pipeline_name, interval_minutes, max_entries_per_run, config_data)
VALUES (
  'perplexity_knowledge_pipeline',
  30, -- alle 30 Minuten
  5,  -- maximal 5 Einträge pro Lauf
  jsonb_build_object(
    'areas', array['Periodization', 'VO2max Training', 'Military Conditioning'],
    'batch_rotation', true,
    'models', array['sonar', 'sonar-reasoning']
  )
) ON CONFLICT (pipeline_name) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_pipeline_automation_config_updated_at
  BEFORE UPDATE ON public.pipeline_automation_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();