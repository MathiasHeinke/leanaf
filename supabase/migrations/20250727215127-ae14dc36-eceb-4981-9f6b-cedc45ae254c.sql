-- Erweitere Pipeline-Konfiguration für Coach-spezifische Steuerung
ALTER TABLE public.pipeline_automation_config 
ADD COLUMN IF NOT EXISTS coach_id TEXT DEFAULT 'sascha',
ADD COLUMN IF NOT EXISTS knowledge_areas JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS active_topics JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS topic_rotation_strategy TEXT DEFAULT 'round_robin',
ADD COLUMN IF NOT EXISTS priority_weights JSONB DEFAULT '{}'::jsonb;

-- Erstelle Coach-Themen-Mapping Tabelle
CREATE TABLE IF NOT EXISTS public.coach_topic_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id TEXT NOT NULL,
  topic_category TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  priority_level INTEGER NOT NULL DEFAULT 1,
  search_keywords JSONB DEFAULT '[]'::jsonb,
  knowledge_depth TEXT DEFAULT 'standard',
  update_frequency_hours INTEGER DEFAULT 24,
  last_updated_at TIMESTAMP WITH TIME ZONE,
  success_rate NUMERIC DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(coach_id, topic_category, topic_name)
);

-- Enable RLS
ALTER TABLE public.coach_topic_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Super admins can manage coach topics"
ON public.coach_topic_configurations
FOR ALL
TO authenticated
USING (is_super_admin());

-- Erstelle Coach-Pipeline-Status Tabelle
CREATE TABLE IF NOT EXISTS public.coach_pipeline_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  total_knowledge_entries INTEGER DEFAULT 0,
  last_pipeline_run TIMESTAMP WITH TIME ZONE,
  next_scheduled_run TIMESTAMP WITH TIME ZONE,
  current_topic_focus TEXT,
  knowledge_completion_rate NUMERIC DEFAULT 0.0,
  avg_embedding_quality NUMERIC DEFAULT 0.0,
  pipeline_health_score NUMERIC DEFAULT 100.0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coach_pipeline_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Super admins can manage coach pipeline status"
ON public.coach_pipeline_status
FOR ALL
TO authenticated
USING (is_super_admin());

-- Insert default topic configurations for Sascha
INSERT INTO public.coach_topic_configurations (coach_id, topic_category, topic_name, priority_level, search_keywords, knowledge_depth) VALUES
('sascha', 'Periodization', 'Linear Periodization', 3, '["linear periodization", "training phases", "strength progression"]', 'advanced'),
('sascha', 'Periodization', 'Undulating Periodization', 3, '["undulating periodization", "DUP", "daily variation"]', 'advanced'),
('sascha', 'Periodization', 'Block Periodization', 3, '["block periodization", "conjugated sequence", "training blocks"]', 'advanced'),
('sascha', 'Periodization', 'Conjugate Method', 2, '["conjugate method", "westside barbell", "max effort"]', 'expert'),

('sascha', 'VO2max Training', '4x4 Norwegian Method', 3, '["4x4 intervals", "VO2max", "norwegian method"]', 'advanced'),
('sascha', 'VO2max Training', 'Polarized Training', 3, '["polarized training", "80/20 rule", "aerobic threshold"]', 'advanced'), 
('sascha', 'VO2max Training', 'Threshold Training', 2, '["lactate threshold", "anaerobic threshold", "tempo training"]', 'standard'),
('sascha', 'VO2max Training', 'HIIT Protocols', 3, '["high intensity intervals", "HIIT", "VO2max intervals"]', 'advanced'),

('sascha', 'Military Conditioning', 'Tactical Strength', 2, '["tactical strength", "military fitness", "combat conditioning"]', 'standard'),
('sascha', 'Military Conditioning', 'Combat Conditioning', 2, '["combat conditioning", "warrior training", "tactical fitness"]', 'standard'),
('sascha', 'Military Conditioning', 'HIFT Training', 3, '["HIFT", "high intensity functional training", "military preparation"]', 'advanced'),
('sascha', 'Military Conditioning', 'Functional Fitness', 2, '["functional fitness", "movement patterns", "tactical movements"]', 'standard'),

('sascha', 'Strength Science', 'Hypertrophy Mechanisms', 3, '["muscle hypertrophy", "protein synthesis", "mTOR pathway"]', 'expert'),
('sascha', 'Strength Science', 'Neural Adaptations', 3, '["neural adaptations", "motor unit recruitment", "force production"]', 'expert'),
('sascha', 'Strength Science', 'Recovery Science', 2, '["recovery protocols", "supercompensation", "adaptation"]', 'advanced'),

('sascha', 'Biomechanics', 'Movement Analysis', 2, '["biomechanics", "movement analysis", "technique optimization"]', 'advanced'),
('sascha', 'Biomechanics', 'Force Production', 2, '["force production", "power development", "rate of force development"]', 'advanced')

ON CONFLICT (coach_id, topic_category, topic_name) DO NOTHING;

-- Insert Coach Pipeline Status for Sascha
INSERT INTO public.coach_pipeline_status (coach_id, is_active, current_topic_focus)
VALUES ('sascha', true, 'Periodization')
ON CONFLICT (coach_id) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  current_topic_focus = EXCLUDED.current_topic_focus;

-- Update existing pipeline config for Sascha
UPDATE public.pipeline_automation_config 
SET 
  coach_id = 'sascha',
  knowledge_areas = '["Periodization", "VO2max Training", "Military Conditioning", "Strength Science", "Biomechanics"]'::jsonb,
  active_topics = '["Linear Periodization", "4x4 Norwegian Method", "Tactical Strength", "Hypertrophy Mechanisms"]'::jsonb,
  topic_rotation_strategy = 'priority_weighted',
  priority_weights = '{"high": 3, "medium": 2, "low": 1}'::jsonb
WHERE pipeline_name = 'perplexity_knowledge_pipeline';

-- Create indexes for better performance
CREATE INDEX idx_coach_topic_configurations_coach_id ON public.coach_topic_configurations(coach_id);
CREATE INDEX idx_coach_topic_configurations_enabled ON public.coach_topic_configurations(is_enabled);
CREATE INDEX idx_coach_topic_configurations_priority ON public.coach_topic_configurations(priority_level DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_coach_topic_configurations_updated_at
  BEFORE UPDATE ON public.coach_topic_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coach_pipeline_status_updated_at
  BEFORE UPDATE ON public.coach_pipeline_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();