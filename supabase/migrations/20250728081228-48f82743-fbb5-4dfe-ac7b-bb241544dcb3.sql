-- Batch-Insert von Standard-Topics für alle Coaches
-- Sascha (Performance & Training)
INSERT INTO coach_topic_configurations (coach_id, topic_category, topic_name, is_enabled, priority_level, search_keywords, knowledge_depth, update_frequency_hours) VALUES
('sascha', 'Periodization', 'Linear Periodization', true, 5, '["linear periodization", "training phases", "strength cycles"]', 'expert', 24),
('sascha', 'Periodization', 'Block Periodization', true, 5, '["block periodization", "concentrated training", "accumulation"]', 'expert', 24),
('sascha', 'Periodization', 'Conjugate Method', true, 4, '["conjugate method", "westside barbell", "max effort"]', 'advanced', 48),
('sascha', 'VO2max Training', '4x4 Norwegian Method', true, 5, '["4x4 intervals", "norwegian method", "vo2max training"]', 'expert', 24),
('sascha', 'VO2max Training', 'High-Intensity Intervals', true, 4, '["HIIT", "high intensity intervals", "vo2max improvement"]', 'advanced', 24),
('sascha', 'VO2max Training', 'Polarized Training', true, 4, '["polarized training", "80/20 training", "endurance"]', 'advanced', 48),
('sascha', 'Military Conditioning', 'Tactical Strength', true, 5, '["tactical strength", "military fitness", "functional strength"]', 'expert', 24),
('sascha', 'Military Conditioning', 'Combat Conditioning', true, 4, '["combat conditioning", "military training", "tactical fitness"]', 'advanced', 48),
('sascha', 'Biomechanics', 'Movement Quality', true, 4, '["movement quality", "biomechanics", "movement patterns"]', 'advanced', 24),
('sascha', 'Biomechanics', 'Force Production', true, 4, '["force production", "power development", "explosive training"]', 'advanced', 48),
('sascha', 'Strength Training', 'Progressive Overload', true, 5, '["progressive overload", "strength progression", "load management"]', 'expert', 24),
('sascha', 'Strength Training', 'Compound Movements', true, 4, '["compound movements", "squat bench deadlift", "main lifts"]', 'advanced', 24),
('sascha', 'Recovery', 'Sleep Optimization', true, 3, '["sleep optimization", "recovery", "sleep quality"]', 'standard', 48),
('sascha', 'Recovery', 'Active Recovery', true, 3, '["active recovery", "recovery methods", "rest day training"]', 'standard', 48);

-- Kai (Mindset & Recovery)
INSERT INTO coach_topic_configurations (coach_id, topic_category, topic_name, is_enabled, priority_level, search_keywords, knowledge_depth, update_frequency_hours) VALUES
('kai', 'Neuroplasticity', 'Habit Formation', true, 5, '["habit formation", "neuroplasticity", "behavior change"]', 'expert', 24),
('kai', 'Neuroplasticity', 'Neural Adaptation', true, 4, '["neural adaptation", "brain plasticity", "learning"]', 'advanced', 48),
('kai', 'Sleep Science', 'Sleep Architecture', true, 5, '["sleep architecture", "sleep stages", "deep sleep"]', 'expert', 24),
('kai', 'Sleep Science', 'Circadian Rhythm', true, 5, '["circadian rhythm", "sleep wake cycle", "melatonin"]', 'expert', 24),
('kai', 'Sleep Science', 'Sleep Recovery', true, 4, '["sleep recovery", "restorative sleep", "sleep quality"]', 'advanced', 24),
('kai', 'Stress Management', 'Cortisol Regulation', true, 4, '["cortisol regulation", "stress hormones", "HPA axis"]', 'advanced', 24),
('kai', 'Stress Management', 'Mindfulness Training', true, 4, '["mindfulness", "meditation", "stress reduction"]', 'advanced', 48),
('kai', 'Psychology', 'Motivation Psychology', true, 5, '["motivation psychology", "intrinsic motivation", "self-determination"]', 'expert', 24),
('kai', 'Psychology', 'Adherence Strategies', true, 5, '["adherence strategies", "compliance", "behavior maintenance"]', 'expert', 24),
('kai', 'Recovery', 'HRV Training', true, 4, '["heart rate variability", "HRV", "autonomic recovery"]', 'advanced', 24),
('kai', 'Recovery', 'Parasympathetic Activation', true, 3, '["parasympathetic", "vagus nerve", "relaxation response"]', 'standard', 48);

-- Lucy (80/20+ Nutrition)
INSERT INTO coach_topic_configurations (coach_id, topic_category, topic_name, is_enabled, priority_level, search_keywords, knowledge_depth, update_frequency_hours) VALUES
('lucy', 'Chrono-Nutrition', 'Meal Timing', true, 5, '["meal timing", "chrono nutrition", "circadian eating"]', 'expert', 24),
('lucy', 'Chrono-Nutrition', 'Intermittent Fasting', true, 4, '["intermittent fasting", "time restricted eating", "fasting windows"]', 'advanced', 24),
('lucy', 'Anti-Inflammatory', 'Inflammatory Foods', true, 5, '["anti inflammatory foods", "inflammation", "inflammatory markers"]', 'expert', 24),
('lucy', 'Anti-Inflammatory', 'Omega-3 Fatty Acids', true, 4, '["omega 3", "fatty acids", "EPA DHA"]', 'advanced', 48),
('lucy', 'Hormonal Balance', 'Insulin Sensitivity', true, 5, '["insulin sensitivity", "glucose metabolism", "blood sugar"]', 'expert', 24),
('lucy', 'Hormonal Balance', 'Leptin Ghrelin', true, 4, '["leptin", "ghrelin", "hunger hormones"]', 'advanced', 48),
('lucy', 'Metabolic Flexibility', 'Fat Adaptation', true, 4, '["metabolic flexibility", "fat adaptation", "substrate utilization"]', 'advanced', 24),
('lucy', 'Metabolic Flexibility', 'Carb Cycling', true, 3, '["carb cycling", "carbohydrate periodization", "metabolic switching"]', 'standard', 48),
('lucy', '80/20 Principle', 'Sustainable Nutrition', true, 5, '["sustainable nutrition", "80 20 rule", "flexible dieting"]', 'expert', 24),
('lucy', '80/20 Principle', 'Lifestyle Integration', true, 4, '["lifestyle nutrition", "behavior change", "sustainable habits"]', 'advanced', 24),
('lucy', 'Micronutrients', 'Vitamin D Optimization', true, 3, '["vitamin D", "micronutrients", "deficiency"]', 'standard', 48),
('lucy', 'Micronutrients', 'Mineral Balance', true, 3, '["mineral balance", "electrolytes", "magnesium zinc"]', 'standard', 48);

-- Update Sascha's pipeline status
INSERT INTO coach_pipeline_status (coach_id, is_active, total_knowledge_entries, current_topic_focus, knowledge_completion_rate, avg_embedding_quality, pipeline_health_score)
VALUES ('sascha', true, 14, 'Linear Periodization', 85.0, 0.92, 95.0)
ON CONFLICT (coach_id) DO UPDATE SET
  total_knowledge_entries = 14,
  current_topic_focus = 'Linear Periodization',
  knowledge_completion_rate = 85.0,
  avg_embedding_quality = 0.92,
  pipeline_health_score = 95.0,
  updated_at = now();

-- Update Kai's pipeline status  
INSERT INTO coach_pipeline_status (coach_id, is_active, total_knowledge_entries, current_topic_focus, knowledge_completion_rate, avg_embedding_quality, pipeline_health_score)
VALUES ('kai', true, 11, 'Habit Formation', 78.0, 0.89, 92.0)
ON CONFLICT (coach_id) DO UPDATE SET
  total_knowledge_entries = 11,
  current_topic_focus = 'Habit Formation',
  knowledge_completion_rate = 78.0,
  avg_embedding_quality = 0.89,
  pipeline_health_score = 92.0,
  updated_at = now();

-- Update Lucy's pipeline status
INSERT INTO coach_pipeline_status (coach_id, is_active, total_knowledge_entries, current_topic_focus, knowledge_completion_rate, avg_embedding_quality, pipeline_health_score)
VALUES ('lucy', true, 12, 'Meal Timing', 82.0, 0.91, 94.0)
ON CONFLICT (coach_id) DO UPDATE SET
  total_knowledge_entries = 12,
  current_topic_focus = 'Meal Timing',
  knowledge_completion_rate = 82.0,
  avg_embedding_quality = 0.91,
  pipeline_health_score = 94.0,
  updated_at = now();