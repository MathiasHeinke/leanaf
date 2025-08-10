-- Create feature flag for auto tool orchestration
INSERT INTO public.feature_flags (flag_name, description, is_enabled, rollout_percentage)
VALUES 
  ('auto_tool_orchestration', 'Automatically opens meal dialog when meal analysis is complete', true, 100.0)
ON CONFLICT (flag_name) DO UPDATE SET
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  rollout_percentage = EXCLUDED.rollout_percentage;