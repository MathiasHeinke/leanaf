-- Create training plan analytics table
CREATE TABLE IF NOT EXISTS public.training_plan_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('plan_requested', 'plan_created', 'plan_error', 'plan_confirmed', 'plan_rejected')),
  coach_id TEXT,
  response_time_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feature flags table for A/B testing
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_name TEXT NOT NULL UNIQUE,
  flag_description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  target_audience JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user feature flags junction table
CREATE TABLE IF NOT EXISTS public.user_feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_flag_id UUID REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, feature_flag_id)
);

-- Enable RLS
ALTER TABLE public.training_plan_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_plan_analytics
CREATE POLICY "Users can view their own training plan analytics" 
ON public.training_plan_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training plan analytics" 
ON public.training_plan_analytics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admin users can view all analytics
CREATE POLICY "Admins can view all training plan analytics" 
ON public.training_plan_analytics 
FOR ALL
USING (public.is_admin_by_email());

-- RLS Policies for feature_flags
CREATE POLICY "Everyone can view enabled feature flags" 
ON public.feature_flags 
FOR SELECT 
USING (is_enabled = true);

CREATE POLICY "Admins can manage feature flags" 
ON public.feature_flags 
FOR ALL
USING (public.is_admin_by_email());

-- RLS Policies for user_feature_flags
CREATE POLICY "Users can view their own feature flags" 
ON public.user_feature_flags 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can assign feature flags" 
ON public.user_feature_flags 
FOR INSERT 
WITH CHECK (true); -- Allow system to assign flags

CREATE POLICY "Admins can manage user feature flags" 
ON public.user_feature_flags 
FOR ALL
USING (public.is_admin_by_email());

-- Create indexes for performance
CREATE INDEX idx_training_plan_analytics_user_id ON public.training_plan_analytics(user_id);
CREATE INDEX idx_training_plan_analytics_event_type ON public.training_plan_analytics(event_type);
CREATE INDEX idx_training_plan_analytics_created_at ON public.training_plan_analytics(created_at);
CREATE INDEX idx_feature_flags_flag_name ON public.feature_flags(flag_name);
CREATE INDEX idx_user_feature_flags_user_id ON public.user_feature_flags(user_id);

-- Insert initial feature flags
INSERT INTO public.feature_flags (flag_name, flag_description, is_enabled, rollout_percentage, metadata) VALUES
('training_plan_v2', 'Enhanced training plan generation with caching and retry logic', true, 100, '{"version": "2.0"}'),
('training_plan_analytics', 'Training plan performance analytics and monitoring', true, 100, '{"version": "1.0"}'),
('coach_plan_feedback', 'User feedback collection for training plans', true, 50, '{"beta": true}'),
('advanced_plan_customization', 'Advanced customization options for training plans', false, 0, '{"experimental": true}')
ON CONFLICT (flag_name) DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();