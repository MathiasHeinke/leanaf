-- Lutein & Zeaxanthin: Augengesundheit Matrix
UPDATE supplement_database 
SET relevance_matrix = '{
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.0,
    "2": 1.5,
    "3": 0.5
  },
  "goal_modifiers": {
    "longevity": 2.0,
    "cognitive": 1.5,
    "maintenance": 1.0,
    "fat_loss": 0,
    "muscle_gain": 0
  },
  "context_modifiers": {
    "true_natural": 0.5,
    "on_trt": 0.5
  },
  "demographic_modifiers": {
    "age_over_40": 1.5,
    "age_over_50": 2.5
  },
  "bloodwork_triggers": {},
  "lifestyle_modifiers": {
    "high_screen_time": 2.5,
    "outdoor_worker": 1.0
  }
}'::jsonb
WHERE name = 'Lutein & Zeaxanthin';

-- Glucosamin & Chondroitin: Gelenkgesundheit Matrix
UPDATE supplement_database 
SET relevance_matrix = '{
  "phase_modifiers": {
    "0": 0.5,
    "1": 1.5,
    "2": 1.0,
    "3": 2.0
  },
  "goal_modifiers": {
    "muscle_gain": 1.5,
    "maintenance": 1.0,
    "fat_loss": 0.5,
    "longevity": 1.5,
    "cognitive": 0
  },
  "context_modifiers": {
    "true_natural": 1.0,
    "on_trt": 1.5
  },
  "demographic_modifiers": {
    "age_over_40": 1.5,
    "age_over_50": 2.5
  },
  "bloodwork_triggers": {
    "inflammation_high": 2.0
  },
  "lifestyle_modifiers": {
    "heavy_training": 2.0,
    "joint_issues": 3.0
  }
}'::jsonb
WHERE name = 'Glucosamin & Chondroitin';