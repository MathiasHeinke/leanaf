-- Insert the missing multiImageIntake feature flag
INSERT INTO feature_flags (flag_name, is_enabled, rollout_percentage, flag_description)
VALUES ('multiImageIntake', true, 100, 'Enable multi-image intake and analysis for meal logging')
ON CONFLICT (flag_name) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  rollout_percentage = EXCLUDED.rollout_percentage,
  flag_description = EXCLUDED.flag_description;