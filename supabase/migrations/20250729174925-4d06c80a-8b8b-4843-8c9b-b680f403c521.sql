-- Delete user account mathias@mathiasheinke.de completely
-- Including department_progress and any other missing tables

-- Delete from department_progress
DELETE FROM department_progress WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';

-- Delete from all other related tables
DELETE FROM user_points WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM profiles WHERE id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM meals WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM workouts WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM weight_history WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM coach_conversations WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM subscribers WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM point_activities WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM badges WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM ai_usage_limits WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM exercise_sessions WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM exercise_sets WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM coach_memory WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM daily_goals WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM body_measurements WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM user_streaks WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM coach_recommendations WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM coach_ratings WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM feature_requests WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM feature_votes WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM bug_reports WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM user_tracking_preferences WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM user_trials WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';
DELETE FROM exercise_templates WHERE user_id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';

-- Finally delete the user from auth.users
DELETE FROM auth.users WHERE id = 'bf0d2593-e6e3-422a-8ffe-ca419f488e3a';